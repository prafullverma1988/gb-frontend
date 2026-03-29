import { useState, useEffect, useCallback } from "react";
import api from "../config/api";

// ── ICONS ────────────────────────────────────────────────────────────
const Ic = ({d,d2,size=18,color="currentColor",sw=1.8,fill="none"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>{d2&&<path d={d2}/>}
  </svg>
);
const IcDraw   = p=><Ic {...p} d="M2 20h20M5 20V8l7-6 7 6v12M9 20v-5h6v5"/>;
const IcReq    = p=><Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcRevise = p=><Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcCal    = p=><Ic {...p} d="M8 7V3M16 7V3M3 11h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>;
const IcUpload = p=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>;
const IcSearch = p=><Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const IcFilter = p=><Ic {...p} d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>;
const IcCheck  = p=><Ic {...p} d="M20 6L9 17l-5-5"/>;
const IcX      = p=><Ic {...p} d="M18 6L6 18M6 6l12 12"/>;
const IcEye    = p=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z"/>;
const IcDown   = p=><Ic {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>;
const IcHist   = p=><Ic {...p} d="M12 8v4l3 3M3.05 11A9 9 0 102 12M3 4v4l2.5 2.5"/>;
const IcPin    = p=><Ic {...p} d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0zM12 10m-1 0a1 1 0 102 0 1 1 0 10-2 0"/>;
const IcRefresh= p=><Ic {...p} d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.36-3.36L23 10M1 14l5.09 4.36A9 9 0 0020.49 15"/>;
const IcAlert  = p=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>;

// ── THEME ────────────────────────────────────────────────────────────
const T = {
  bg:"#F1F4F8", surface:"#FFFFFF", surfaceB:"#F8FAFC",
  blu:"#2563EB", bluL:"#EFF6FF", bluM:"#BFDBFE",
  grn:"#059669", grnL:"#ECFDF5", grnM:"#A7F3D0",
  red:"#DC2626", redL:"#FEF2F2", redM:"#FECACA",
  amb:"#D97706", ambL:"#FFFBEB", ambM:"#FDE68A",
  pur:"#7C3AED", purL:"#F5F3FF", purM:"#DDD6FE",
  t1:"#111827", t2:"#374151", t3:"#6B7280", t4:"#9CA3AF",
  b1:"#E5E7EB", b2:"#D1D5DB",
  sb:"#0D1B2A",
};

const fmt = n => n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(1)}L`:n>=1000?`₹${(n/1000).toFixed(0)}K`:`₹${n||0}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—";

const Pill = ({label,c,bg,size=10.5}) => (
  <span style={{fontSize:size,fontWeight:700,color:c,background:bg,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{label}</span>
);

const STATUS_META = {
  "Pending":     {c:T.t3,  bg:"#F3F4F6"},
  "Approved":    {c:T.grn, bg:T.grnL},
  "Revision":    {c:T.amb, bg:T.ambL},
  "Rejected":    {c:T.red, bg:T.redL},
  "In Progress": {c:T.blu, bg:T.bluL},
  "Uploaded":    {c:T.grn, bg:T.grnL},
};
const PRIO_META = {
  "Urgent":{c:T.red,bg:T.redL},
  "High":  {c:T.amb,bg:T.ambL},
  "Normal":{c:T.blu,bg:T.bluL},
  "Low":   {c:T.t4, bg:"#F3F4F6"},
};

const CATS  = ["Architectural","Structural","Electrical","Plumbing","Interior","Landscape","MEP"];
const TYPES = ["Plan","Elevation","Section","Detail","3D","Diagram","Schedule","Site Plan"];

// ── UPLOAD MODAL (standalone) ─────────────────────────────────────────
function UploadModal({ show, onClose, projects, dbTitles, dbCats, dbTypes, prefill, onUploaded }) {
  const CLOUD_NAME = "dd632nqfm";
  const PRESET     = "gb_buildcon_drawings";
  const [form,     setForm]     = useState({ project_id:"", title:"", category:"Architectural", drawing_type:"2D", note:"" });
  const [file,     setFile]     = useState(null);
  const [uploading,setUploading]= useState(false);
  const [pct,      setPct]      = useState(0);
  const [err,      setErr]      = useState("");
  const [titleSearch, setTitleSearch] = useState("");

  useEffect(()=>{
    if(prefill) setForm(p=>({...p,...prefill}));
  },[prefill]);

  const filteredTitles = dbTitles.filter(t =>
    (!form.category || t.category===form.category) &&
    (t.title.toLowerCase().includes(titleSearch.toLowerCase()))
  );

  if (!show) return null;

  const upload = async () => {
    if (!form.project_id) { setErr("Project select karo"); return; }
    if (!form.title.trim()) { setErr("Title required"); return; }
    if (!file) { setErr("File select karo"); return; }
    setUploading(true); setErr(""); setPct(5);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", PRESET);
      fd.append("folder", "gb_buildcon/drawings");
      const xhr = new XMLHttpRequest();
      const cld = await new Promise((res,rej)=>{
        xhr.upload.onprogress = e => { if(e.lengthComputable) setPct(Math.round(e.loaded/e.total*80)); };
        xhr.onload = () => { const d=JSON.parse(xhr.responseText); xhr.status===200?res(d):rej(new Error(d.error?.message||"Upload failed")); };
        xhr.onerror = ()=>rej(new Error("Network error"));
        const isPDF = file.name.match(/\.(pdf|dwg|dxf)$/i);
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${isPDF?"raw":"image"}/upload`);
        xhr.send(fd);
      });
      setPct(85);
      const proj = projects.find(p=>p.id===parseInt(form.project_id));
      const res = await api.post("/design/drawings", {
        project_id:   form.project_id,
        project_name: proj?.name||"",
        title:        form.title,
        category:     form.category,
        drawing_type: form.drawing_type,
        note:         form.note||null,
        file_url:     cld.secure_url,
        file_size:    Math.round(file.size/1024)+" KB",
      });
      setPct(100);
      if (res.success) {
        onUploaded(res.data);
        onClose();
        setFile(null); setForm({project_id:"",title:"",category:"Architectural",drawing_type:"2D",note:""}); setPct(0);
      } else setErr(res.message||"Save failed");
    } catch(e) { setErr(e.message); }
    setUploading(false);
  };

  return (
    <>
      <div onClick={()=>!uploading&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,backdropFilter:"blur(2px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        background:T.surface,borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.22)",
        zIndex:501,width:560,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif"}}>
        <div style={{background:T.sb,padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:700,color:"white"}}>Upload Drawing</div>
          {!uploading&&<button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:20,lineHeight:1}}>×</button>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
          {/* Project */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Project *</label>
            <select value={form.project_id} onChange={e=>setForm(p=>({...p,project_id:e.target.value}))}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
              <option value="">Select project...</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Category + Type */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Category</label>
              <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value,title:""}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                {(dbCats.length>0?dbCats.map(c=>c.name):CATS).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Type</label>
              <select value={form.drawing_type} onChange={e=>setForm(p=>({...p,drawing_type:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                {(dbTypes.length>0?dbTypes.map(t=>t.name):TYPES).map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {/* Title — searchable from library */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Drawing Title *</label>
            <input value={form.title} onChange={e=>{setForm(p=>({...p,title:e.target.value}));setTitleSearch(e.target.value);}}
              placeholder="Search or type title..."
              list="drawing_titles_list"
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <datalist id="drawing_titles_list">
              {filteredTitles.map(t=><option key={t.id} value={t.title}>{t.title} ({t.type})</option>)}
            </datalist>
            {filteredTitles.length>0&&form.title===""&&(
              <div style={{background:T.surfaceB,border:"1px solid "+T.b1,borderRadius:7,marginTop:4,maxHeight:140,overflowY:"auto"}}>
                {filteredTitles.slice(0,8).map(t=>(
                  <div key={t.id} onClick={()=>{setForm(p=>({...p,title:t.title,drawing_type:t.type||p.drawing_type}));setTitleSearch("");}}
                    style={{padding:"7px 10px",cursor:"pointer",fontSize:12,borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bluL}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <span style={{fontWeight:500,color:T.t1}}>{t.title}</span>
                    <span style={{fontSize:10,color:T.t4}}>{t.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* File */}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>File *</label>
            <label style={{display:"block",border:"2px dashed "+(file?T.grn:T.b2),borderRadius:9,padding:"18px",textAlign:"center",background:file?T.grnL:T.surfaceB,cursor:"pointer"}}>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){setFile(e.target.files[0]);setErr("");}}}/>
              {file?<div><div style={{fontSize:13,fontWeight:700,color:T.grn}}>✓ {file.name}</div><div style={{fontSize:11,color:T.t4,marginTop:2}}>{(file.size/1024).toFixed(0)} KB</div></div>
                :<div><div style={{fontSize:13,fontWeight:600,color:T.t2}}>📁 Choose file or drop</div><div style={{fontSize:11,color:T.t4,marginTop:2}}>PDF, PNG, JPG, DWG · Max 50MB</div></div>}
            </label>
          </div>
          {/* Note */}
          <div>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Notes</label>
            <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Reviewer ke liye..." rows={2}
              style={{width:"100%",padding:"8px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none"}}/>
          </div>
          {uploading&&<div style={{marginTop:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:T.t3}}>Uploading...</span><span style={{fontSize:11,fontWeight:700,color:T.blu}}>{pct}%</span></div><div style={{height:5,background:T.b1,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",background:T.blu,borderRadius:4,transition:"width 0.3s"}}/></div></div>}
          {err&&<div style={{marginTop:8,padding:"7px 10px",background:T.redL,border:"1px solid "+T.redM,borderRadius:6,fontSize:12,color:T.red}}>{err}</div>}
        </div>
        <div style={{padding:"11px 16px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} disabled={uploading} style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
          <button onClick={upload} disabled={uploading||!file||!form.title||!form.project_id}
            style={{flex:2,padding:"9px",borderRadius:7,background:uploading||!file||!form.title||!form.project_id?T.b1:T.blu,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:uploading?"not-allowed":"pointer"}}>
            {uploading?"Uploading...":"⬆ Upload Drawing"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── MAIN DESIGN MODULE ────────────────────────────────────────────────
export default function DesignModule() {
  const [activeTab, setActiveTab] = useState("drawings");
  const [drawings,  setDrawings]  = useState([]);
  const [requests,  setRequests]  = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [dbTitles,  setDbTitles]  = useState([]);
  const [dbCats,    setDbCats]    = useState([]);
  const [dbTypes,   setDbTypes]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showUpload,setShowUpload]= useState(false);
  const [uploadPrefill, setUploadPrefill] = useState(null);
  const [acting,    setActing]    = useState({});
  const [actionErr, setActionErr] = useState("");

  // Drawing filters
  const [dSearch,   setDSearch]   = useState("");
  const [dProject,  setDProject]  = useState("All");
  const [dCat,      setDCat]      = useState("All");
  const [dStatus,   setDStatus]   = useState("All");
  const [dType,     setDType]     = useState("All");
  const [selDraw,   setSelDraw]   = useState(null);
  const [showVer,   setShowVer]   = useState(null);

  // Request filters
  const [rSearch,   setRSearch]   = useState("");
  const [rProject,  setRProject]  = useState("All");
  const [rStatus,   setRStatus]   = useState("All");
  const [rCat,      setRCat]      = useState("All");
  const [rPrio,     setRPrio]     = useState("All");
  const [hideUploadedR, setHideUploadedR] = useState(true);

  // Revision queue filters
  const [revSearch,  setRevSearch]  = useState("");
  const [revProject, setRevProject] = useState("All");
  const [revFile,    setRevFile]    = useState({});   // {drawingId: File}
  const [revUploading,setRevUploading]=useState({});

  // Due date filters
  const [ddView,    setDdView]    = useState("all"); // all|overdue|today|week
  const [ddProject, setDdProject] = useState("All");

  // Load all data
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [drRes, rqRes, prRes, titRes, catRes, typRes] = await Promise.all([
        api.get("/design/drawings"),
        api.get("/design/requests"),
        api.get("/projects"),
        api.get("/design/titles"),
        api.get("/design/categories?type=category"),
        api.get("/design/categories?type=drawing_type"),
      ]);
      if (drRes.success) setDrawings(drRes.data||[]);
      if (rqRes.success) setRequests(rqRes.data||[]);
      if (prRes.success && prRes.data) setProjects(prRes.data);
      if (titRes.success) setDbTitles(titRes.data||[]);
      if (catRes.success && catRes.data.length) setDbCats(catRes.data);
      if (typRes.success && typRes.data.length) setDbTypes(typRes.data);
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(()=>{ loadAll(); }, [loadAll]);

  const CATS_LIST  = dbCats.length  > 0 ? dbCats.map(c=>c.name)  : CATS;
  const TYPES_LIST = dbTypes.length > 0 ? dbTypes.map(t=>t.name) : TYPES;
  const projectNames = ["All", ...projects.map(p=>p.name)];

  // Status action
  const handleStatus = async (id, status, note) => {
    setActing(p=>({...p,[id]:status})); setActionErr("");
    try {
      const res = await api.patch("/design/drawings/"+id+"/status", {status, note:note||null});
      if (res.success) { setDrawings(p=>p.map(d=>d.id===id?{...d,status}:d)); setSelDraw(null); }
      else setActionErr(res.message||"Failed");
    } catch(e) { setActionErr(e.message); }
    setActing(p=>({...p,[id]:null}));
  };

  // Upload new version from revision queue
  const handleNewVersion = async (drawingId, file) => {
    setRevUploading(p=>({...p,[drawingId]:true}));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", "gb_buildcon_drawings");
      const isPDF = file.name.match(/\.(pdf|dwg|dxf)$/i);
      const xhr = new XMLHttpRequest();
      const cld = await new Promise((res,rej)=>{
        xhr.onload = ()=>{ const d=JSON.parse(xhr.responseText); xhr.status===200?res(d):rej(new Error(d.error?.message)); };
        xhr.onerror = ()=>rej(new Error("Network error"));
        xhr.open("POST", `https://api.cloudinary.com/v1_1/dd632nqfm/${isPDF?"raw":"image"}/upload`);
        xhr.send(fd);
      });
      const res = await api.post("/design/drawings/"+drawingId+"/versions", {
        file_url: cld.secure_url, file_size: Math.round(file.size/1024)+" KB",
      });
      if (res.success) { await loadAll(); }
    } catch(e) { alert(e.message); }
    setRevUploading(p=>({...p,[drawingId]:false}));
  };

  // Update request status
  const updateReqStatus = async (id, status, assigned_to) => {
    try {
      const res = await api.patch("/design/requests/"+id, { status, assigned_to:assigned_to||undefined });
      if (res.success) setRequests(p=>p.map(r=>r.id===id?res.data:r));
    } catch(e) {}
  };

  // Filtered lists
  const filteredDrawings = drawings.filter(d=>{
    if (dProject!=="All" && (d.project_name||"")!==dProject) return false;
    if (dCat!=="All" && d.category!==dCat) return false;
    if (dStatus!=="All" && d.status!==dStatus) return false;
    if (dType!=="All" && (d.drawing_type||"")!==dType) return false;
    if (dSearch && !d.title.toLowerCase().includes(dSearch.toLowerCase())) return false;
    return true;
  });

  const filteredRequests = requests.filter(r=>{
    if (hideUploadedR && (r.status==="Uploaded"||r.status==="Rejected")) return false;
    if (rProject!=="All" && (r.project_name||"")!==rProject) return false;
    if (rStatus!=="All" && r.status!==rStatus) return false;
    if (rCat!=="All" && r.category!==rCat) return false;
    if (rPrio!=="All" && r.priority!==rPrio) return false;
    if (rSearch && !r.title.toLowerCase().includes(rSearch.toLowerCase())) return false;
    return true;
  });

  const revQueue = drawings.filter(d=>d.status==="Revision").filter(d=>{
    if (revProject!=="All" && (d.project_name||"")!==revProject) return false;
    if (revSearch && !d.title.toLowerCase().includes(revSearch.toLowerCase())) return false;
    return true;
  });

  // Due date data — requests with due_date
  const today = new Date(); today.setHours(0,0,0,0);
  const dueDateItems = requests.filter(r=>r.due_date&&r.status!=="Uploaded"&&r.status!=="Rejected").filter(r=>{
    if (ddProject!=="All" && (r.project_name||"")!==ddProject) return false;
    const d = new Date(r.due_date); d.setHours(0,0,0,0);
    const diff = Math.floor((d-today)/(1000*60*60*24));
    if (ddView==="overdue" && diff>=0) return false;
    if (ddView==="today"   && diff!==0) return false;
    if (ddView==="week"    && (diff<0||diff>7)) return false;
    return true;
  }).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date));

  const overdueCt = requests.filter(r=>{if(!r.due_date||r.status==="Uploaded"||r.status==="Rejected")return false;const d=new Date(r.due_date);d.setHours(0,0,0,0);return d<today;}).length;

  // ── TAB: DRAWINGS ─────────────────────────────────────────────────
  const DrawingsTab = () => (
    <div>
      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:160}}>
          <input value={dSearch} onChange={e=>setDSearch(e.target.value)} placeholder="Search drawings..."
            style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
        </div>
        {[
          {val:dProject,set:setDProject,opts:projectNames,label:"Project"},
          {val:dCat,    set:setDCat,    opts:["All",...CATS_LIST],label:"Category"},
          {val:dStatus, set:setDStatus, opts:["All","Pending","Approved","Revision","Rejected"],label:"Status"},
          {val:dType,   set:setDType,   opts:["All",...TYPES_LIST],label:"Type"},
        ].map(f=>(
          <select key={f.label} value={f.val} onChange={e=>f.set(e.target.value)}
            style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(f.val!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:f.val!=="All"?T.bluL:T.surface,color:f.val!=="All"?T.blu:T.t2}}>
            {f.opts.map(o=><option key={o} value={o}>{o==="All"?`All ${f.label}s`:o}</option>)}
          </select>
        ))}
        <button onClick={()=>setShowUpload(true)}
          style={{padding:"7px 14px",borderRadius:7,background:T.blu,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
          <IcUpload size={13} color="white"/> Upload Drawing
        </button>
      </div>

      <div style={{fontSize:11,color:T.t4,marginBottom:8}}>{filteredDrawings.length} drawings</div>

      {/* Table */}
      <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 120px 120px 60px 100px 100px 70px",padding:"8px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,gap:8}}>
          {["Title","Project","Category","Ver.","Type","Status","Size"].map((h,i)=>(
            <span key={i} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.3px",textAlign:i===3?"center":"left"}}>{h}</span>
          ))}
        </div>
        {loading&&<div style={{textAlign:"center",padding:"40px",color:T.t4}}>Loading...</div>}
        {!loading&&filteredDrawings.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4}}>No drawings found</div>}
        {filteredDrawings.map(d=>{
          const sm=STATUS_META[d.status]||STATUS_META["Pending"];
          const isSel=selDraw?.id===d.id;
          return(
            <div key={d.id}>
              <div onClick={()=>setSelDraw(isSel?null:d)}
                style={{display:"grid",gridTemplateColumns:"2fr 120px 120px 60px 100px 100px 70px",padding:"9px 14px",
                  borderBottom:"1px solid "+T.b1,alignItems:"center",cursor:"pointer",gap:8,
                  background:isSel?T.bluL:"none",borderLeft:isSel?"3px solid "+T.blu:"3px solid transparent",transition:"all .1s"}}
                onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=T.surfaceB;}}
                onMouseLeave={e=>{e.currentTarget.style.background=isSel?T.bluL:"none";}}>
                <div>
                  <div style={{fontSize:12.5,fontWeight:isSel?700:500,color:isSel?T.blu:T.t1}}>{d.title}</div>
                  {d.note&&<div style={{fontSize:10.5,color:T.t4,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.note}</div>}
                </div>
                <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.project_name||"—"}</span>
                <span style={{fontSize:11,color:T.t2}}>{d.category||"—"}</span>
                <span style={{fontSize:11,color:T.t4,fontFamily:"monospace",textAlign:"center"}}>{d.current_version||"v1"}</span>
                <Pill label={d.drawing_type||"2D"} c={T.pur} bg={T.purL}/>
                <Pill label={d.status} c={sm.c} bg={sm.bg}/>
                <span style={{fontSize:11,color:T.t4}}>{d.file_size||"—"}</span>
              </div>
              {/* Action panel */}
              {isSel&&(
                <div style={{padding:"10px 14px",background:T.bluL,borderBottom:"1px solid "+T.bluM}}>
                  {actionErr&&<div style={{padding:"5px 9px",background:T.redL,border:"1px solid "+T.redM,borderRadius:6,fontSize:11.5,color:T.red,marginBottom:8}}>{actionErr}</div>}
                  <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                    {d.file_url&&<a href={d.file_url} target="_blank" rel="noreferrer" style={{padding:"5px 10px",borderRadius:6,background:T.bluL,border:"1px solid "+T.bluM,color:T.blu,fontSize:11,fontWeight:600,textDecoration:"none"}}>👁 View</a>}
                    {d.file_url&&<a href={d.file_url} download target="_blank" rel="noreferrer" style={{padding:"5px 10px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t3,fontSize:11,fontWeight:600,textDecoration:"none"}}>⬇ Download</a>}
                    <button onClick={()=>setShowVer(d)} style={{padding:"5px 10px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t3,fontSize:11,cursor:"pointer"}}><IcHist size={12}/> History</button>
                    {d.status!=="Approved"&&<button onClick={()=>handleStatus(d.id,"Approved")} disabled={!!acting[d.id]} style={{padding:"5px 11px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Approve</button>}
                    {d.status!=="Revision"&&<button onClick={()=>{ const r=prompt("Revision reason:"); if(r) handleStatus(d.id,"Revision",r); }} style={{padding:"5px 11px",borderRadius:6,background:T.ambL,border:"1px solid "+T.ambM,color:T.amb,fontSize:11,fontWeight:600,cursor:"pointer"}}>🔄 Revision</button>}
                    {d.status!=="Rejected"&&<button onClick={()=>{ const r=prompt("Rejection reason:"); if(r) handleStatus(d.id,"Rejected",r); }} style={{padding:"5px 11px",borderRadius:6,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>✕ Reject</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── TAB: DESIGN REQUESTS ─────────────────────────────────────────
  const RequestsTab = () => {
    const [assignId,  setAssignId]  = useState(null);
    const [assignVal, setAssignVal] = useState("");
    return(
      <div>
        {/* Filters */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:160}}>
            <input value={rSearch} onChange={e=>setRSearch(e.target.value)} placeholder="Search requests..."
              style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
          </div>
          {[
            {val:rProject,set:setRProject,opts:projectNames,label:"Project"},
            {val:rCat,    set:setRCat,    opts:["All",...CATS_LIST],label:"Category"},
            {val:rStatus, set:setRStatus, opts:["All","Pending","In Progress","Uploaded","Rejected"],label:"Status"},
            {val:rPrio,   set:setRPrio,   opts:["All","Urgent","High","Normal","Low"],label:"Priority"},
          ].map(f=>(
            <select key={f.label} value={f.val} onChange={e=>f.set(e.target.value)}
              style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(f.val!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:f.val!=="All"?T.bluL:T.surface,color:f.val!=="All"?T.blu:T.t2}}>
              {f.opts.map(o=><option key={o} value={o}>{o==="All"?`All ${f.label}s`:o}</option>)}
            </select>
          ))}
          <button onClick={()=>setHideUploadedR(!hideUploadedR)}
            style={{padding:"6px 11px",borderRadius:7,border:"1.5px solid "+(hideUploadedR?T.b1:T.grn),background:hideUploadedR?"none":T.grnL,color:hideUploadedR?T.t4:T.grn,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
            {hideUploadedR?"Show Completed":"Hide Completed"}
          </button>
        </div>
        <div style={{fontSize:11,color:T.t4,marginBottom:8}}>{filteredRequests.length} requests · {requests.filter(r=>r.status==="Pending").length} pending</div>

        {filteredRequests.length===0&&<div style={{textAlign:"center",padding:"50px",color:T.t4}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:13,color:T.t2}}>No requests</div></div>}

        {filteredRequests.map(req=>{
          const pm=PRIO_META[req.priority]||PRIO_META["Normal"];
          const sm=STATUS_META[req.status]||STATUS_META["Pending"];
          return(
            <div key={req.id} style={{background:T.surface,borderRadius:9,border:"1px solid "+T.b1,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+pm.c}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{req.title}</div>
                  <div style={{fontSize:11,color:T.t4,marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span>{req.project_name||"—"}</span>
                    <span>{req.category}</span>
                    {req.due_date&&<span style={{color:new Date(req.due_date)<today?T.red:T.t4}}>Due: {fmtDate(req.due_date)}</span>}
                    {req.requested_by&&<span>By: {req.requested_by}</span>}
                  </div>
                  {req.description&&<div style={{fontSize:11.5,color:T.t2,marginTop:5}}>{req.description}</div>}
                  {req.assigned_to&&<div style={{fontSize:11,color:T.blu,marginTop:4}}>👤 {req.assigned_to}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <Pill label={req.priority} c={pm.c} bg={pm.bg}/>
                  <Pill label={req.status} c={sm.c} bg={sm.bg}/>
                </div>
              </div>
              <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                {req.status==="Pending"&&<>
                  {assignId===req.id?(
                    <div style={{display:"flex",gap:5}}>
                      <input value={assignVal} onChange={e=>setAssignVal(e.target.value)} placeholder="Designer naam..."
                        style={{padding:"4px 8px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                      <button onClick={()=>{updateReqStatus(req.id,"In Progress",assignVal);setAssignId(null);setAssignVal("");}}
                        style={{padding:"4px 10px",borderRadius:6,background:T.blu,border:"none",color:"white",fontSize:11,fontWeight:600,cursor:"pointer"}}>Assign</button>
                      <button onClick={()=>setAssignId(null)} style={{padding:"4px 8px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,fontSize:11,cursor:"pointer",color:T.t3}}>×</button>
                    </div>
                  ):(
                    <button onClick={()=>{setAssignId(req.id);setAssignVal(req.assigned_to||"");}}
                      style={{padding:"4px 10px",borderRadius:6,background:T.bluL,border:"1px solid "+T.bluM,color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      👤 Assign
                    </button>
                  )}
                  <button onClick={()=>{setUploadPrefill({project_id:projects.find(p=>p.name===req.project_name)?.id||"",title:req.title,category:req.category,drawing_type:"2D",note:req.description||""});setShowUpload(true);updateReqStatus(req.id,"In Progress");}}
                    style={{padding:"4px 10px",borderRadius:6,background:T.grnL,border:"1px solid "+T.grnM,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    ⬆ Upload Direct
                  </button>
                </>}
                {req.status==="In Progress"&&(
                  <button onClick={()=>{setUploadPrefill({project_id:projects.find(p=>p.name===req.project_name)?.id||"",title:req.title,category:req.category,drawing_type:"2D",note:req.description||""});setShowUpload(true);}}
                    style={{padding:"4px 10px",borderRadius:6,background:T.grnL,border:"1px solid "+T.grnM,color:T.grn,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                    ⬆ Upload Drawing
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── TAB: REVISION QUEUE ──────────────────────────────────────────
  const RevisionTab = () => (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:160}}>
          <input value={revSearch} onChange={e=>setRevSearch(e.target.value)} placeholder="Search..."
            style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
        </div>
        <select value={revProject} onChange={e=>setRevProject(e.target.value)}
          style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(revProject!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:revProject!=="All"?T.bluL:T.surface}}>
          {projectNames.map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <div style={{fontSize:11,color:T.t4,marginBottom:8}}>{revQueue.length} drawings in revision</div>
      {revQueue.length===0&&<div style={{textAlign:"center",padding:"50px",color:T.t4}}><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontSize:13,color:T.t2}}>Koi revision pending nahi</div></div>}
      {revQueue.map(d=>(
        <div key={d.id} style={{background:T.surface,borderRadius:9,border:"1px solid "+T.ambM,padding:"13px 14px",marginBottom:10,borderLeft:"3px solid "+T.amb}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{d.title}</div>
              <div style={{fontSize:11,color:T.t4,marginTop:2}}>{d.project_name||"—"} · {d.category} · {d.current_version}</div>
              {d.note&&<div style={{fontSize:11.5,color:T.amb,marginTop:5,padding:"5px 8px",background:T.ambL,borderRadius:5}}>📝 {d.note}</div>}
              {d.pin_count>0&&<div style={{fontSize:11,color:T.t3,marginTop:4}}>📍 {d.pin_count} revision pin(s)</div>}
            </div>
            <div style={{display:"flex",gap:6}}>
              {d.file_url&&<a href={d.file_url} target="_blank" rel="noreferrer" style={{padding:"4px 9px",borderRadius:6,background:T.bluL,border:"1px solid "+T.bluM,color:T.blu,fontSize:11,fontWeight:600,textDecoration:"none"}}>👁 View Current</a>}
            </div>
          </div>
          <div style={{paddingTop:8,borderTop:"1px solid "+T.b1}}>
            <label style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:5}}>Upload Revised Version</label>
            <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 11px",border:"1.5px dashed "+(revUploading[d.id]?T.blu:T.b2),borderRadius:7,cursor:revUploading[d.id]?"not-allowed":"pointer",background:revUploading[d.id]?T.bluL:T.surfaceB}}>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.dwg" style={{display:"none"}} disabled={revUploading[d.id]}
                onChange={e=>{if(e.target.files[0])handleNewVersion(d.id,e.target.files[0]);}}/>
              <span style={{fontSize:11.5,color:T.blu,fontWeight:600}}>{revUploading[d.id]?"⏳ Uploading...":"⬆ Upload New Version"}</span>
            </label>
          </div>
        </div>
      ))}
    </div>
  );

  // ── TAB: APPROVAL ───────────────────────────────────────────────
  const ApprovalTab = () => {
    const [aprvSearch, setAprvSearch] = useState("");
    const [aprvProject, setAprvProject] = useState("All");
    const [aprvCat, setAprvCat] = useState("All");
    const [aprvActing, setAprvActing] = useState({});

    const pendingDrawings = drawings.filter(d => {
      if (d.status !== "Pending") return false;
      if (aprvProject !== "All" && (d.project_name||"") !== aprvProject) return false;
      if (aprvCat !== "All" && d.category !== aprvCat) return false;
      if (aprvSearch && !d.title.toLowerCase().includes(aprvSearch.toLowerCase())) return false;
      return true;
    });

    const approveDrawing = async (id) => {
      setAprvActing(p=>({...p,[id]:"approving"}));
      try {
        const res = await api.patch("/design/drawings/"+id+"/status", {status:"Approved"});
        if (res.success) setDrawings(p=>p.map(d=>d.id===id?{...d,status:"Approved"}:d));
      } catch(e) {}
      setAprvActing(p=>({...p,[id]:null}));
    };

    const revisionDrawing = async (id) => {
      const reason = prompt("Revision reason likhiye:");
      if (!reason) return;
      setAprvActing(p=>({...p,[id]:"revision"}));
      try {
        const res = await api.patch("/design/drawings/"+id+"/status", {status:"Revision", note:reason});
        if (res.success) setDrawings(p=>p.map(d=>d.id===id?{...d,status:"Revision",note:reason}:d));
      } catch(e) {}
      setAprvActing(p=>({...p,[id]:null}));
    };

    const rejectDrawing = async (id) => {
      const reason = prompt("Rejection reason likhiye:");
      if (!reason) return;
      setAprvActing(p=>({...p,[id]:"rejecting"}));
      try {
        const res = await api.patch("/design/drawings/"+id+"/status", {status:"Rejected", note:reason});
        if (res.success) setDrawings(p=>p.map(d=>d.id===id?{...d,status:"Rejected"}:d));
      } catch(e) {}
      setAprvActing(p=>({...p,[id]:null}));
    };

    return (
      <div>
        {/* Filters */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:160}}>
            <input value={aprvSearch} onChange={e=>setAprvSearch(e.target.value)} placeholder="Search drawings..."
              style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
          </div>
          <select value={aprvProject} onChange={e=>setAprvProject(e.target.value)}
            style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(aprvProject!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:aprvProject!=="All"?T.bluL:T.surface}}>
            {projectNames.map(p=><option key={p}>{p}</option>)}
          </select>
          <select value={aprvCat} onChange={e=>setAprvCat(e.target.value)}
            style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(aprvCat!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:aprvCat!=="All"?T.bluL:T.surface}}>
            {["All",...CATS_LIST].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div style={{fontSize:11,color:T.t4,marginBottom:8}}>{pendingDrawings.length} drawings awaiting approval</div>

        {pendingDrawings.length===0&&(
          <div style={{textAlign:"center",padding:"60px",color:T.t4}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            <div style={{fontSize:14,fontWeight:600,color:T.t2}}>Sab clear!</div>
            <div style={{fontSize:12,marginTop:4}}>Koi drawing pending approval mein nahi</div>
          </div>
        )}

        {pendingDrawings.map(d=>(
          <div key={d.id} style={{background:T.surface,borderRadius:9,border:"1px solid "+T.b1,padding:"13px 14px",marginBottom:8,borderLeft:"3px solid #E5E7EB"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{d.title}</div>
                <div style={{fontSize:11,color:T.t4,marginTop:2,display:"flex",gap:10,flexWrap:"wrap"}}>
                  <span>{d.project_name||"—"}</span>
                  <span>{d.category}</span>
                  <span style={{fontFamily:"monospace"}}>{d.current_version||"v1"}</span>
                  <span>{d.drawing_type}</span>
                  {d.uploaded_by_name&&<span>By: {d.uploaded_by_name}</span>}
                </div>
                {d.note&&<div style={{fontSize:11.5,color:T.t3,marginTop:4,padding:"4px 8px",background:T.surfaceB,borderRadius:5}}>{d.note}</div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                {d.file_url&&<a href={d.file_url} target="_blank" rel="noreferrer"
                  style={{padding:"5px 10px",borderRadius:6,background:T.bluL,border:"1px solid "+T.bluM,color:T.blu,fontSize:11,fontWeight:600,textDecoration:"none"}}>👁 View</a>}
                {d.file_url&&<a href={d.file_url} download target="_blank" rel="noreferrer"
                  style={{padding:"5px 10px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t3,fontSize:11,fontWeight:600,textDecoration:"none"}}>⬇</a>}
              </div>
            </div>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>approveDrawing(d.id)} disabled={!!aprvActing[d.id]}
                style={{padding:"6px 18px",borderRadius:7,background:aprvActing[d.id]?T.b1:T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:aprvActing[d.id]?"not-allowed":"pointer"}}>
                {aprvActing[d.id]==="approving"?"...":"✓ Approve"}
              </button>
              <button onClick={()=>revisionDrawing(d.id)} disabled={!!aprvActing[d.id]}
                style={{padding:"6px 16px",borderRadius:7,background:T.ambL,border:"1px solid "+T.ambM,color:T.amb,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                🔄 Revision
              </button>
              <button onClick={()=>rejectDrawing(d.id)} disabled={!!aprvActing[d.id]}
                style={{padding:"6px 16px",borderRadius:7,background:T.redL,border:"1px solid "+T.redM,color:T.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                ✕ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── TAB: HISTORY ─────────────────────────────────────────────────
  const HistoryTab = () => {
    const [histSearch,  setHistSearch]  = useState("");
    const [histProject, setHistProject] = useState("All");
    const [histStatus,  setHistStatus]  = useState("All");

    const histDrawings = [...drawings]
      .filter(d => {
        if (histProject !== "All" && (d.project_name||"") !== histProject) return false;
        if (histStatus  !== "All" && d.status !== histStatus) return false;
        if (histSearch && !d.title.toLowerCase().includes(histSearch.toLowerCase())) return false;
        return true;
      })
      .sort((a,b)=>new Date(b.updated_at||b.created_at)-new Date(a.updated_at||a.created_at));

    return(
      <div>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:160}}>
            <input value={histSearch} onChange={e=>setHistSearch(e.target.value)} placeholder="Search drawings..."
              style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><IcSearch size={13} color={T.t4}/></span>
          </div>
          <select value={histProject} onChange={e=>setHistProject(e.target.value)}
            style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(histProject!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:histProject!=="All"?T.bluL:T.surface}}>
            {projectNames.map(p=><option key={p}>{p}</option>)}
          </select>
          <select value={histStatus} onChange={e=>setHistStatus(e.target.value)}
            style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(histStatus!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer",background:histStatus!=="All"?T.bluL:T.surface}}>
            {["All","Pending","Approved","Revision","Rejected"].map(s=><option key={s} value={s}>{s==="All"?"All Status":s}</option>)}
          </select>
        </div>

        <div style={{fontSize:11,color:T.t4,marginBottom:8}}>{histDrawings.length} drawings · latest changes first</div>

        <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 130px 110px 60px 100px 100px 70px 90px",padding:"8px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,gap:8}}>
            {["Title","Project","Category","Ver.","Type","Status","Size","Last Updated"].map((h,i)=>(
              <span key={i} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.3px"}}>{h}</span>
            ))}
          </div>
          {histDrawings.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4}}>No drawings found</div>}
          {histDrawings.map(d=>{
            const sm=STATUS_META[d.status]||STATUS_META["Pending"];
            return(
              <div key={d.id} style={{display:"grid",gridTemplateColumns:"2fr 130px 110px 60px 100px 100px 70px 90px",padding:"9px 14px",borderBottom:"1px solid "+T.b1,alignItems:"center",gap:8,transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                onMouseLeave={e=>e.currentTarget.style.background="none"}>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{d.title}</div>
                  {d.note&&<div style={{fontSize:10.5,color:T.t4,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.note}</div>}
                </div>
                <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.project_name||"—"}</span>
                <span style={{fontSize:11,color:T.t2}}>{d.category}</span>
                <span style={{fontSize:11,color:T.t4,fontFamily:"monospace"}}>{d.current_version||"v1"}</span>
                <Pill label={d.drawing_type||"2D"} c={T.pur} bg={T.purL}/>
                <Pill label={d.status} c={sm.c} bg={sm.bg}/>
                <span style={{fontSize:11,color:T.t4}}>{d.file_size||"—"}</span>
                <div>
                  <div style={{fontSize:11,color:T.t3}}>{fmtDate(d.updated_at||d.created_at)}</div>
                  {d.uploaded_by_name&&<div style={{fontSize:10,color:T.t4}}>{d.uploaded_by_name}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats summary */}
        <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}>
          {Object.entries({Approved:T.grn,Pending:T.t4,Revision:T.amb,Rejected:T.red}).map(([s,c])=>{
            const cnt = drawings.filter(d=>d.status===s).length;
            return cnt>0?(
              <div key={s} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"8px 14px",display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:18,fontWeight:800,color:c}}>{cnt}</span>
                <span style={{fontSize:11,color:T.t3}}>{s}</span>
              </div>
            ):null;
          })}
        </div>
      </div>
    );
  };

    // ── TAB: DUE DATES ───────────────────────────────────────────────
  const DueDatesTab = () => (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        {[
          {id:"all",label:"All"},
          {id:"overdue",label:`Overdue ${overdueCt>0?"("+overdueCt+")":""}`,color:overdueCt>0?T.red:null},
          {id:"today",label:"Today"},
          {id:"week",label:"This Week"},
        ].map(v=>(
          <button key={v.id} onClick={()=>setDdView(v.id)}
            style={{padding:"5px 12px",borderRadius:20,border:"1.5px solid "+(ddView===v.id?(v.color||T.blu):T.b1),
              background:ddView===v.id?(v.color?v.color+"15":T.bluL):"none",
              color:ddView===v.id?(v.color||T.blu):T.t3,fontSize:11.5,fontWeight:ddView===v.id?700:400,cursor:"pointer"}}>
            {v.label}
          </button>
        ))}
        <select value={ddProject} onChange={e=>setDdProject(e.target.value)}
          style={{marginLeft:"auto",padding:"7px 10px",borderRadius:7,border:"1.5px solid "+(ddProject!=="All"?T.blu:T.b1),fontSize:11.5,outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
          {projectNames.map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <div style={{fontSize:11,color:T.t4,marginBottom:8}}>{dueDateItems.length} items</div>
      {dueDateItems.length===0&&<div style={{textAlign:"center",padding:"50px",color:T.t4}}><div style={{fontSize:32,marginBottom:8}}>📅</div><div style={{fontSize:13,color:T.t2}}>Koi due date nahi</div></div>}

      {/* Table */}
      <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 130px 110px 100px 100px 90px",padding:"7px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,gap:8}}>
          {["Drawing Request","Project","Category","Due Date","Priority","Status"].map((h,i)=>(
            <span key={i} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:"0.3px"}}>{h}</span>
          ))}
        </div>
        {dueDateItems.map(r=>{
          const due = new Date(r.due_date); due.setHours(0,0,0,0);
          const diff = Math.floor((due-today)/(1000*60*60*24));
          const isOverdue = diff < 0;
          const isToday   = diff === 0;
          const pm=PRIO_META[r.priority]||PRIO_META["Normal"];
          const sm=STATUS_META[r.status]||STATUS_META["Pending"];
          return(
            <div key={r.id} style={{display:"grid",gridTemplateColumns:"2fr 130px 110px 100px 100px 90px",padding:"9px 14px",borderBottom:"1px solid "+T.b1,alignItems:"center",gap:8,
              background:isOverdue?"#FFF5F5":isToday?"#FFFBEB":"none"}}>
              <div>
                <div style={{fontSize:12.5,fontWeight:600,color:isOverdue?T.red:T.t1}}>{r.title}</div>
                {r.assigned_to&&<div style={{fontSize:10.5,color:T.blu,marginTop:1}}>👤 {r.assigned_to}</div>}
              </div>
              <span style={{fontSize:11,color:T.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.project_name||"—"}</span>
              <span style={{fontSize:11,color:T.t2}}>{r.category}</span>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:isOverdue?T.red:isToday?T.amb:T.t1}}>{fmtDate(r.due_date)}</div>
                <div style={{fontSize:10,color:isOverdue?T.red:isToday?T.amb:T.t4}}>{isOverdue?`${Math.abs(diff)}d overdue`:isToday?"Today":`${diff}d left`}</div>
              </div>
              <Pill label={r.priority} c={pm.c} bg={pm.bg}/>
              <Pill label={r.status} c={sm.c} bg={sm.bg}/>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── VERSION HISTORY MODAL ────────────────────────────────────────
  const VersionModal = () => {
    const [versions, setVersions] = useState([]);
    const [vLoad, setVLoad] = useState(true);
    useEffect(()=>{
      api.get("/design/drawings/"+showVer.id).then(res=>{
        if(res.success) setVersions(res.data.versions||[]);
        setVLoad(false);
      });
    },[]);
    return(
      <>
        <div onClick={()=>setShowVer(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:T.surface,borderRadius:12,zIndex:501,width:460,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
          <div style={{background:T.sb,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{fontSize:13,fontWeight:700,color:"white"}}>Version History — {showVer.title}</div>
            <button onClick={()=>setShowVer(null)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",fontSize:18}}>×</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
            {vLoad&&<div style={{textAlign:"center",padding:"30px",color:T.t4}}>Loading...</div>}
            {versions.map((v,i)=>(
              <div key={v.id} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:i===0?T.blu:T.b1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:i===0?"white":T.t3}}>{v.version_number}</span>
                </div>
                <div style={{flex:1,background:T.surfaceB,borderRadius:7,padding:"8px 10px",border:"1px solid "+T.b1}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:11.5,fontWeight:600,color:T.t1}}>{v.uploaded_by_name||"—"}</span>
                    <span style={{fontSize:10,color:T.t4}}>{fmtDate(v.created_at)}</span>
                  </div>
                  {v.note&&<div style={{fontSize:11,color:T.t3,marginTop:3}}>{v.note}</div>}
                  {v.file_url&&<a href={v.file_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.blu,textDecoration:"none",marginTop:4,display:"inline-block"}}>📄 View File</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  const pendingApprovalCt = drawings.filter(d=>d.status==="Pending").length;

  const TABS = [
    {id:"drawings",  label:"All Drawings",    Icon:IcDraw,   count:drawings.length,                              badge:null},
    {id:"requests",  label:"Design Requests", Icon:IcReq,    count:requests.filter(r=>r.status==="Pending").length, badge:"amber"},
    {id:"revision",  label:"Revision Queue",  Icon:IcRevise, count:drawings.filter(d=>d.status==="Revision").length, badge:"amber"},
    {id:"approval",  label:"Approval",        Icon:IcCheck,  count:pendingApprovalCt,                            badge:pendingApprovalCt>0?"amber":null},
    {id:"history",   label:"History",         Icon:IcHist,   count:null,                                         badge:null},
    {id:"duedate",   label:"Due Dates",       Icon:IcCal,    count:overdueCt,                                    badge:overdueCt>0?"red":null},
  ];

  return (
    <div style={{padding:"20px 24px",fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100%",background:T.bg}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:T.t1,letterSpacing:"-0.3px"}}>Design</div>
          <div style={{fontSize:12,color:T.t4,marginTop:2}}>Drawings · Requests · Revisions · Deadlines</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={loadAll} style={{padding:"7px 12px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,color:T.t3,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <IcRefresh size={13}/> Refresh
          </button>
          <button onClick={()=>{setUploadPrefill(null);setShowUpload(true);}}
            style={{padding:"7px 16px",borderRadius:7,background:T.blu,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            <IcUpload size={14} color="white"/> Upload Drawing
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"2px solid "+T.b1}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",border:"none",background:"none",
              color:activeTab===tab.id?T.blu:T.t3,fontSize:13,fontWeight:activeTab===tab.id?700:400,
              cursor:"pointer",borderBottom:activeTab===tab.id?"2px solid "+T.blu:"2px solid transparent",
              marginBottom:"-2px",whiteSpace:"nowrap"}}>
            <tab.Icon size={15} color="currentColor"/>
            {tab.label}
            {tab.count>0&&<span style={{
              background:activeTab===tab.id?T.blu:tab.badge==="red"?T.red:tab.badge==="amber"?T.amb:T.b1,
              color:activeTab===tab.id||tab.badge?"white":T.t4,
              fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10}}>
              {tab.count}
            </span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab==="drawings" && <DrawingsTab/>}
        {activeTab==="requests" && <RequestsTab/>}
        {activeTab==="revision" && <RevisionTab/>}
        {activeTab==="approval" && <ApprovalTab/>}
        {activeTab==="history"  && <HistoryTab/>}
        {activeTab==="duedate"  && <DueDatesTab/>}
      </div>

      {/* Modals */}
      {showUpload&&<UploadModal show={showUpload} onClose={()=>{setShowUpload(false);setUploadPrefill(null);}} projects={projects} dbTitles={dbTitles} dbCats={dbCats} dbTypes={dbTypes} prefill={uploadPrefill}
        onUploaded={(d)=>setDrawings(p=>[d,...p])}/>}
      {showVer&&<VersionModal/>}
    </div>
  );
}
