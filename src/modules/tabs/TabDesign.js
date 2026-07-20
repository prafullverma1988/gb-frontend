import React, { useState, useEffect } from "react";
import api from "../../config/api";
import apiCache from "../../utils/apiCache";
import { Avatar, Credit } from "../../components/Credit";
import SearchSelect from "../../components/SearchSelect";
import { T } from "../shared/tokens";
import { Pill, Panel, THead } from "../shared/ui";

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
      <div 
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
      <div 
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
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:400}}/>
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

export default TabDesign;
