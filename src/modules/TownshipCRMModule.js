import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../config/api";

// ── THEME TOKENS (matches existing app convention) ────────────
const T = {
  bg:"#F8FAFC", surface:"#FFFFFF",
  t1:"#0F172A", t2:"#475569", t3:"#94A3B8",
  b1:"#E2E8F0", b2:"#CBD5E1",
  pri:"#2563EB", priL:"#EFF6FF", priD:"#1D4ED8",
  amb:"#F59E0B", ambL:"#FEF3C7",
  grn:"#16A34A", grnL:"#DCFCE7",
  red:"#DC2626", redL:"#FEE2E2",
  blu:"#0C447C", bluL:"#B5D4F4",
  cor:"#D85A30", corL:"#FAECE7",
  pur:"#534AB7", purL:"#EEEDFE",
  gry:"#64748B", gryL:"#F1F5F9",
};

// ── STATUS COLORS for units (Master Grid future use + chips) ─
const STATUS_COLORS = {
  AVAILABLE: { bg:"#FFFFFF", brd:T.b2,   txt:T.t1,   label:"Available" },
  FOLLOWUP : { bg:T.ambL,    brd:T.amb,  txt:"#633806", label:"Followup" },
  HOLD     : { bg:T.corL,    brd:T.cor,  txt:"#712B13", label:"Hold" },
  BOOKED   : { bg:T.bluL,    brd:"#378ADD", txt:T.blu, label:"Booked" },
  SOLD     : { bg:T.blu,     brd:T.blu,  txt:"#FFFFFF", label:"Sold" },
  BLOCKED  : { bg:"#E2E8F0", brd:T.gry,  txt:"#334155", label:"Blocked" },
};

// ── UTILITY ────────────────────────────────────────────────────
const fmtINR = (n) => {
  if (n == null || isNaN(n)) return "₹0";
  const num = Number(n);
  if (num >= 10000000) return `₹${(num/10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹${(num/100000).toFixed(2)}L`;
  if (num >= 1000)     return `₹${(num/1000).toFixed(1)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
};
const fmtNum = (n) => (n == null ? "0" : Number(n).toLocaleString("en-IN"));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"}) : "—";

// ── SHARED MINI COMPONENTS ────────────────────────────────────
const Pill = ({label, c, bg, brd}) => (
  <span style={{display:"inline-block",background:bg,color:c,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,border:`1px solid ${brd||c+"33"}`,whiteSpace:"nowrap"}}>{label}</span>
);

const StatusPill = ({status}) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.AVAILABLE;
  return <Pill label={s.label} c={s.txt} bg={s.bg} brd={s.brd}/>;
};

const Btn = ({onClick, label, primary, danger, small, icon, disabled}) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: small ? "5px 10px" : "8px 14px",
    fontSize: small ? 12 : 13,
    fontWeight: 500,
    background: primary ? T.pri : danger ? T.red : T.surface,
    color: (primary || danger) ? "#FFFFFF" : T.t1,
    border: `1px solid ${primary ? T.pri : danger ? T.red : T.b2}`,
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex", alignItems: "center", gap: 5,
    whiteSpace: "nowrap",
  }}>{icon}{label}</button>
);

const KpiCard = ({label, value, sub, color}) => (
  <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"12px 14px",minWidth:0}}>
    <div style={{fontSize:11,color:T.t2,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4,fontWeight:500}}>{label}</div>
    <div style={{fontSize:22,fontWeight:600,color:color||T.t1,lineHeight:1.2}}>{value}</div>
    {sub && <div style={{fontSize:11,color:T.t3,marginTop:2}}>{sub}</div>}
  </div>
);

const EmptyState = ({title, sub, action}) => (
  <div style={{padding:"40px 20px",textAlign:"center",background:T.surface,border:`1px dashed ${T.b2}`,borderRadius:10}}>
    <div style={{fontSize:14,fontWeight:600,color:T.t1,marginBottom:4}}>{title}</div>
    {sub && <div style={{fontSize:12,color:T.t2,marginBottom:14}}>{sub}</div>}
    {action}
  </div>
);

// ── MODAL WRAPPER ─────────────────────────────────────────────
function Modal({open, onClose, title, children, width=520}){
  if(!open) return null;
  return createPortal(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:9000,display:"flex",alignItems:"flex-start",justifyContent:"center",overflowY:"auto",padding:"40px 16px"}}>
      <div onClick={(e)=>e.stopPropagation()} style={{background:T.surface,borderRadius:10,width:"100%",maxWidth:width,boxShadow:"0 20px 50px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:600,color:T.t1}}>{title}</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:22,color:T.t2,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"18px"}}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

const FormRow = ({label, children, required, hint}) => (
  <div style={{marginBottom:14}}>
    <label style={{display:"block",fontSize:12,fontWeight:500,color:T.t2,marginBottom:5}}>
      {label}{required && <span style={{color:T.red}}> *</span>}
    </label>
    {children}
    {hint && <div style={{fontSize:11,color:T.t3,marginTop:3}}>{hint}</div>}
  </div>
);

const inputStyle = {
  width:"100%",padding:"8px 10px",fontSize:13,
  border:`1px solid ${T.b2}`,borderRadius:6,
  outline:"none",background:T.surface,color:T.t1,
};

// ════════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════════
export default function TownshipCRMModule(){
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectDetail, setProjectDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Load projects on mount
  const loadProjects = useCallback(async () => {
    setLoading(true);
    try{
      const res = await api.get("/township-crm/projects");
      if(res.data?.success){
        setProjects(res.data.data || []);
        // auto-select first project
        if(res.data.data?.length > 0 && !selectedProjectId){
          setSelectedProjectId(res.data.data[0].id);
        }
      }
    }catch(e){ console.error("loadProjects:", e); }
    setLoading(false);
  }, [selectedProjectId]);

  useEffect(()=>{ loadProjects(); }, []); // eslint-disable-line

  // Load project detail when selection changes
  const loadProjectDetail = useCallback(async () => {
    if(!selectedProjectId) return;
    try{
      const res = await api.get(`/township-crm/projects/${selectedProjectId}`);
      if(res.data?.success) setProjectDetail(res.data.data);
    }catch(e){ console.error("loadProjectDetail:", e); }
  }, [selectedProjectId]);

  useEffect(()=>{ loadProjectDetail(); }, [loadProjectDetail]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // ── EMPTY STATE: no projects yet ─────────────────────────────
  if(loading){
    return <div style={{padding:40,textAlign:"center",color:T.t2}}>Loading…</div>;
  }
  if(projects.length === 0){
    return (
      <div style={{padding:24,background:T.bg,minHeight:"100%"}}>
        <EmptyState
          title="Koi Township Project nahi hai"
          sub="Pehla project create karke shuru karo — Anadi Ananta jaisa housing project, units aur batches ke saath"
          action={<Btn label="+ Naya Project" primary onClick={()=>setShowAddProject(true)}/>}
        />
        <AddEditProjectModal
          open={showAddProject}
          onClose={()=>setShowAddProject(false)}
          onSaved={()=>{ setShowAddProject(false); loadProjects(); }}
        />
      </div>
    );
  }

  // ── MAIN LAYOUT ──────────────────────────────────────────────
  return (
    <div style={{background:T.bg,minHeight:"100%",padding:"16px 20px"}}>
      {/* Top bar: project selector + add */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <select
            value={selectedProjectId || ""}
            onChange={(e)=>setSelectedProjectId(Number(e.target.value))}
            style={{...inputStyle,width:"auto",minWidth:240,fontWeight:600,fontSize:14,color:T.t1}}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.project_code ? `(${p.project_code})` : ""}
              </option>
            ))}
          </select>
          {selectedProject && (
            <div style={{fontSize:12,color:T.t3}}>
              {selectedProject.city}, {selectedProject.state} · {selectedProject.unit_count} units · {selectedProject.batch_count} batches
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:8}}>
          {selectedProject && <Btn label="Edit Project" onClick={()=>setEditingProject(selectedProject)} icon={<span>✎</span>}/>}
          <Btn label="+ Naya Project" primary onClick={()=>setShowAddProject(true)}/>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,borderBottom:`2px solid ${T.b1}`,marginBottom:16,flexWrap:"wrap"}}>
        {[
          {id:"dashboard", label:"Dashboard"},
          {id:"inventory", label:"Inventory"},
          {id:"batches",   label:"Batches"},
          {id:"settings",  label:"Settings"},
        ].map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            padding:"9px 16px",fontSize:13,fontWeight:500,
            background:"transparent",border:"none",cursor:"pointer",
            color: activeTab===t.id ? T.pri : T.t2,
            borderBottom: activeTab===t.id ? `2px solid ${T.pri}` : "2px solid transparent",
            marginBottom:-2,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "dashboard" && <DashboardTab project={selectedProject} detail={projectDetail}/>}
      {activeTab === "inventory" && <InventoryTab projectId={selectedProjectId} detail={projectDetail} onRefresh={loadProjectDetail}/>}
      {activeTab === "batches"   && <BatchesTab   projectId={selectedProjectId} detail={projectDetail} onRefresh={()=>{loadProjects();loadProjectDetail();}}/>}
      {activeTab === "settings"  && <SettingsTab  projectId={selectedProjectId} detail={projectDetail} onRefresh={loadProjectDetail}/>}

      {/* Modals */}
      <AddEditProjectModal
        open={showAddProject || !!editingProject}
        editing={editingProject}
        onClose={()=>{ setShowAddProject(false); setEditingProject(null); }}
        onSaved={()=>{ setShowAddProject(false); setEditingProject(null); loadProjects(); loadProjectDetail(); }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — DASHBOARD
// ════════════════════════════════════════════════════════════════
function DashboardTab({project, detail}){
  if(!project) return <div style={{color:T.t2,padding:20}}>No project selected</div>;

  const summary = detail?.unit_summary || {};
  const totalValue = (detail?.unit_types || []).reduce((sum, t) => {
    return sum + (Number(t.base_price || 0) * Number(t.unit_count || 0));
  }, 0);

  return (
    <div>
      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",gap:10,marginBottom:18}}>
        <KpiCard label="Total Units" value={fmtNum(summary.total || 0)} sub={`${detail?.unit_types?.length || 0} types`}/>
        <KpiCard label="Available" value={fmtNum(summary.available || 0)} color={T.grn}/>
        <KpiCard label="Followup" value={fmtNum(summary.followup || 0)} color={T.amb}/>
        <KpiCard label="Hold" value={fmtNum(summary.hold || 0)} color={T.cor}/>
        <KpiCard label="Booked" value={fmtNum(summary.booked || 0)} color={T.blu}/>
        <KpiCard label="Sold" value={fmtNum(summary.sold || 0)} color={T.blu}/>
        <KpiCard label="Blocked" value={fmtNum(summary.blocked || 0)} color={T.gry}/>
        <KpiCard label="Project Value" value={fmtINR(totalValue)} sub="Potential" color={T.pri}/>
      </div>

      {/* Project info card */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:16,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:600,color:T.t1,marginBottom:10}}>Project Info</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:10,fontSize:12.5}}>
          <InfoRow label="Project Code" value={project.project_code}/>
          <InfoRow label="Type" value={project.project_type?.replace("_"," ")}/>
          <InfoRow label="Location" value={`${project.city || "—"}, ${project.state || "—"}`}/>
          <InfoRow label="RERA No" value={project.rera_no}/>
          <InfoRow label="Launch Date" value={fmtDate(project.launch_date)}/>
          <InfoRow label="Possession Date" value={fmtDate(project.expected_possession_date)}/>
        </div>
      </div>

      {/* Top performing batches */}
      <TopBatches projectId={project.id}/>

      {/* Coming in Phase 2 banner */}
      <div style={{background:T.purL,border:`1px solid ${T.pur}`,borderRadius:8,padding:"10px 14px",fontSize:12,color:"#3C3489",marginTop:14}}>
        <strong>Phase 2 me aane wala hai:</strong> Master Grid visual · Prospects pipeline · Bookings · Customizations (modifications + mergers) · Construction snapshot · Reports charts
      </div>
    </div>
  );
}

const InfoRow = ({label, value}) => (
  <div>
    <div style={{fontSize:11,color:T.t3,textTransform:"uppercase",letterSpacing:0.3,marginBottom:2}}>{label}</div>
    <div style={{fontSize:13,color:T.t1,fontWeight:500}}>{value || "—"}</div>
  </div>
);

function TopBatches({projectId}){
  const [batches, setBatches] = useState([]);
  useEffect(()=>{
    if(!projectId) return;
    api.get(`/township-crm/projects/${projectId}/batches`)
      .then(r => { if(r.data?.success) setBatches(r.data.data || []); })
      .catch(()=>{});
  }, [projectId]);

  if(batches.length === 0) return null;

  const top = [...batches].sort((a,b)=>(b.actual_unit_count||0)-(a.actual_unit_count||0)).slice(0,5);

  return (
    <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:16}}>
      <div style={{fontSize:13,fontWeight:600,color:T.t1,marginBottom:10}}>Top Batches by Unit Count</div>
      {top.map(b => (
        <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.b1}`,fontSize:12.5}}>
          <div>
            <div style={{fontWeight:500,color:T.t1}}>{b.batch_no} · {b.batch_name}</div>
            <div style={{fontSize:11,color:T.t2,marginTop:2}}>{b.subcon_name || "—"} · {fmtINR(b.contract_value)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:600,color:T.t1}}>{b.actual_unit_count || 0} units</div>
            {b.linked_project_progress != null && <div style={{fontSize:11,color:T.t3}}>{b.linked_project_progress}% complete</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — INVENTORY (units table with filters)
// ════════════════════════════════════════════════════════════════
function InventoryTab({projectId, detail, onRefresh}){
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({status:"",type_id:"",batch_id:"",facing:"",is_corner:"",search:""});

  const loadUnits = useCallback(async () => {
    if(!projectId) return;
    setLoading(true);
    try{
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k,v]) => { if(v) qs.append(k, v); });
      const res = await api.get(`/township-crm/projects/${projectId}/units?${qs}`);
      if(res.data?.success) setUnits(res.data.data || []);
    }catch(e){ console.error("loadUnits:", e); }
    setLoading(false);
  }, [projectId, filters]);

  useEffect(()=>{ loadUnits(); }, [loadUnits]);

  const setFilter = (k, v) => setFilters(prev => ({...prev, [k]: v}));

  return (
    <div>
      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:10,marginBottom:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <input
          placeholder="Search unit no…"
          value={filters.search}
          onChange={(e)=>setFilter("search", e.target.value)}
          style={{...inputStyle,width:160}}
        />
        <select value={filters.status} onChange={(e)=>setFilter("status", e.target.value)} style={{...inputStyle,width:140}}>
          <option value="">All status</option>
          <option>AVAILABLE</option><option>FOLLOWUP</option><option>HOLD</option>
          <option>BOOKED</option><option>SOLD</option><option>BLOCKED</option>
        </select>
        <select value={filters.type_id} onChange={(e)=>setFilter("type_id", e.target.value)} style={{...inputStyle,width:140}}>
          <option value="">All types</option>
          {(detail?.unit_types || []).map(t => <option key={t.id} value={t.id}>{t.type_code} · {t.type_name}</option>)}
        </select>
        <select value={filters.facing} onChange={(e)=>setFilter("facing", e.target.value)} style={{...inputStyle,width:120}}>
          <option value="">All facing</option>
          {["N","S","E","W","NE","NW","SE","SW"].map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={filters.is_corner} onChange={(e)=>setFilter("is_corner", e.target.value)} style={{...inputStyle,width:120}}>
          <option value="">Corner: any</option>
          <option value="1">Corner only</option>
          <option value="0">Non-corner</option>
        </select>
        <div style={{flex:1,textAlign:"right",fontSize:12,color:T.t2,fontWeight:500}}>
          {units.length} units shown
        </div>
      </div>

      {/* Table */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,overflow:"hidden"}}>
        {loading ? (
          <div style={{padding:30,textAlign:"center",color:T.t2}}>Loading units…</div>
        ) : units.length === 0 ? (
          <EmptyState
            title="Koi unit nahi mila"
            sub="Pehle Batches tab me jao, koi batch select karo aur 'Generate Units' button daba ke units create karo"
          />
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:12.5,borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:T.gryL}}>
                  {["Unit","Type","Batch","Facing","Corner","Garden","Area","Base","PLC","Final","Status"].map(h => (
                    <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,color:T.t2,textTransform:"uppercase",letterSpacing:0.3,borderBottom:`1px solid ${T.b1}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map(u => (
                  <tr key={u.id} style={{borderBottom:`1px solid ${T.b1}`}}>
                    <td style={{padding:"8px 10px",fontWeight:600,color:T.t1}}>{u.unit_no}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{u.type_code} <span style={{color:T.t3}}>({u.bhk}BHK)</span></td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{u.batch_no || "—"}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{u.facing || "—"}</td>
                    <td style={{padding:"8px 10px"}}>{u.is_corner ? "✓" : ""}</td>
                    <td style={{padding:"8px 10px"}}>{u.is_garden_facing ? "✓" : ""}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{u.built_up_area_sqft ? `${u.built_up_area_sqft} sqft` : "—"}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{fmtINR(u.base_price)}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{fmtINR(u.plc_charges)}</td>
                    <td style={{padding:"8px 10px",color:T.t1,fontWeight:500}}>{fmtINR(u.final_offered_price)}</td>
                    <td style={{padding:"8px 10px"}}><StatusPill status={u.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — BATCHES (list + add/edit + generate units)
// ════════════════════════════════════════════════════════════════
function BatchesTab({projectId, detail, onRefresh}){
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [generatingForBatch, setGeneratingForBatch] = useState(null);

  const loadBatches = useCallback(async () => {
    if(!projectId) return;
    setLoading(true);
    try{
      const res = await api.get(`/township-crm/projects/${projectId}/batches`);
      if(res.data?.success) setBatches(res.data.data || []);
    }catch(e){ console.error("loadBatches:", e); }
    setLoading(false);
  }, [projectId]);

  useEffect(()=>{ loadBatches(); }, [loadBatches]);

  const handleDelete = async (b) => {
    if(!window.confirm(`"${b.batch_no} - ${b.batch_name}" delete karna chahte ho?`)) return;
    try{
      const res = await api.delete(`/township-crm/batches/${b.id}`);
      if(res.data?.success){ loadBatches(); onRefresh && onRefresh(); }
      else alert(res.data?.message || "Delete failed");
    }catch(e){ alert(e.response?.data?.message || e.message); }
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:13,color:T.t2}}>{batches.length} batches</div>
        <Btn label="+ Naya Batch" primary onClick={()=>setShowAddBatch(true)}/>
      </div>

      {loading ? (
        <div style={{padding:30,textAlign:"center",color:T.t2}}>Loading…</div>
      ) : batches.length === 0 ? (
        <EmptyState title="Koi batch nahi hai" sub="Pehle batch banao, fir us batch ke andar units generate karo" action={<Btn label="+ Naya Batch" primary onClick={()=>setShowAddBatch(true)}/>}/>
      ) : (
        <div style={{display:"grid",gap:10}}>
          {batches.map(b => (
            <div key={b.id} style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:240}}>
                  <div style={{fontSize:14,fontWeight:600,color:T.t1,marginBottom:3}}>
                    {b.batch_no} · {b.batch_name}
                  </div>
                  <div style={{fontSize:12,color:T.t2,marginBottom:6}}>
                    {b.unit_range_label} · {b.batch_type?.replace(/_/g," ")}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))",gap:8,fontSize:11.5,color:T.t2}}>
                    <div><strong style={{color:T.t1}}>Subcon:</strong> {b.subcon_name || "—"}</div>
                    <div><strong style={{color:T.t1}}>Phone:</strong> {b.subcon_phone || "—"}</div>
                    <div><strong style={{color:T.t1}}>Contract:</strong> {fmtINR(b.contract_value)}</div>
                    <div><strong style={{color:T.t1}}>Target:</strong> {fmtDate(b.target_completion_date)}</div>
                  </div>
                  <div style={{marginTop:8,fontSize:12}}>
                    <Pill label={`${b.actual_unit_count || 0} units generated`} c={b.actual_unit_count > 0 ? T.grn : T.amb} bg={b.actual_unit_count > 0 ? T.grnL : T.ambL} brd={b.actual_unit_count > 0 ? T.grn : T.amb}/>
                    {b.linked_project_progress != null && (
                      <span style={{marginLeft:6}}>
                        <Pill label={`Construction ${b.linked_project_progress}%`} c={T.blu} bg={T.bluL} brd={T.blu}/>
                      </span>
                    )}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Btn label="Generate Units" small primary onClick={()=>setGeneratingForBatch(b)} disabled={b.actual_unit_count > 0}/>
                  <Btn label="Edit" small onClick={()=>setEditingBatch(b)}/>
                  <Btn label="Delete" small danger onClick={()=>handleDelete(b)}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddEditBatchModal
        open={showAddBatch || !!editingBatch}
        editing={editingBatch}
        projectId={projectId}
        onClose={()=>{ setShowAddBatch(false); setEditingBatch(null); }}
        onSaved={()=>{ setShowAddBatch(false); setEditingBatch(null); loadBatches(); onRefresh && onRefresh(); }}
      />
      <GenerateUnitsModal
        batch={generatingForBatch}
        unitTypes={detail?.unit_types || []}
        onClose={()=>setGeneratingForBatch(null)}
        onGenerated={()=>{ setGeneratingForBatch(null); loadBatches(); onRefresh && onRefresh(); }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 4 — SETTINGS (project info + unit types CRUD)
// ════════════════════════════════════════════════════════════════
function SettingsTab({projectId, detail, onRefresh}){
  const [showAddType, setShowAddType] = useState(false);
  const [editingType, setEditingType] = useState(null);

  const handleDeleteType = async (t) => {
    if(!window.confirm(`"${t.type_code} - ${t.type_name}" delete karna chahte ho?`)) return;
    try{
      const res = await api.delete(`/township-crm/unit-types/${t.id}`);
      if(res.data?.success){ onRefresh && onRefresh(); }
      else alert(res.data?.message || "Delete failed");
    }catch(e){ alert(e.response?.data?.message || e.message); }
  };

  if(!detail) return <div style={{color:T.t2,padding:20}}>Loading…</div>;

  return (
    <div style={{display:"grid",gap:14}}>
      {/* Unit Types section */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:600,color:T.t1}}>Unit Types ({(detail.unit_types||[]).length})</div>
          <Btn label="+ Naya Type" small primary onClick={()=>setShowAddType(true)}/>
        </div>
        {(detail.unit_types || []).length === 0 ? (
          <div style={{padding:20,textAlign:"center",fontSize:12.5,color:T.t2}}>
            Koi unit type nahi hai. Pehle types add karo (jaise "2BHK Type A"), fir batch me units generate ho sakenge.
          </div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:12.5,borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:T.gryL}}>
                  {["Code","Name","BHK","Plot","Built-up","Rate","Base Price","Units","Actions"].map(h => (
                    <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:600,color:T.t2,textTransform:"uppercase",letterSpacing:0.3,borderBottom:`1px solid ${T.b1}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.unit_types.map(t => (
                  <tr key={t.id} style={{borderBottom:`1px solid ${T.b1}`}}>
                    <td style={{padding:"8px 10px",fontWeight:600,color:T.t1}}>{t.type_code}</td>
                    <td style={{padding:"8px 10px",color:T.t1}}>{t.type_name}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{t.bhk}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{t.plot_area_sqft || "—"} sqft</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{t.built_up_area_sqft || "—"} sqft</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>₹{Number(t.base_rate_per_sqft || 0).toLocaleString("en-IN")}/sqft</td>
                    <td style={{padding:"8px 10px",color:T.t1,fontWeight:500}}>{fmtINR(t.base_price)}</td>
                    <td style={{padding:"8px 10px",color:T.t2}}>{t.unit_count || 0}</td>
                    <td style={{padding:"8px 10px"}}>
                      <div style={{display:"flex",gap:5}}>
                        <Btn label="Edit" small onClick={()=>setEditingType(t)}/>
                        <Btn label="Delete" small danger onClick={()=>handleDeleteType(t)}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PLC Info (informational, configurable in future) */}
      <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:10,padding:14}}>
        <div style={{fontSize:14,fontWeight:600,color:T.t1,marginBottom:8}}>PLC (Preferred Location) Charges</div>
        <div style={{fontSize:12,color:T.t2,marginBottom:10}}>
          Generate Units modal me PLC rates configure karte hain (per sqft × built-up area). Manual override per-unit allowed hai.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))",gap:8}}>
          <PLCInfoCard label="Corner premium" defaultRate={50}/>
          <PLCInfoCard label="Garden facing" defaultRate={100}/>
          <PLCInfoCard label="East facing" defaultRate={30}/>
          <PLCInfoCard label="Park facing" defaultRate={40}/>
        </div>
      </div>

      <AddEditUnitTypeModal
        open={showAddType || !!editingType}
        editing={editingType}
        projectId={projectId}
        onClose={()=>{ setShowAddType(false); setEditingType(null); }}
        onSaved={()=>{ setShowAddType(false); setEditingType(null); onRefresh && onRefresh(); }}
      />
    </div>
  );
}

const PLCInfoCard = ({label, defaultRate}) => (
  <div style={{background:T.gryL,padding:"8px 10px",borderRadius:6,fontSize:12}}>
    <div style={{color:T.t2,fontSize:11,marginBottom:2}}>{label}</div>
    <div style={{color:T.t1,fontWeight:600}}>+ ₹{defaultRate}/sqft</div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// MODAL: Add/Edit Project
// ════════════════════════════════════════════════════════════════
function AddEditProjectModal({open, editing, onClose, onSaved}){
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    if(editing){
      setForm({
        name: editing.name || "",
        project_code: editing.project_code || "",
        project_type: editing.project_type || "row_house",
        city: editing.city || "",
        state: editing.state || "",
        location_address: editing.location_address || "",
        rera_no: editing.rera_no || "",
        launch_date: editing.launch_date || "",
        expected_possession_date: editing.expected_possession_date || "",
      });
    } else {
      setForm({project_type:"row_house"});
    }
  }, [editing, open]);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  const handleSave = async () => {
    if(!form.name?.trim()){ alert("Name required"); return; }
    setSaving(true);
    try{
      const res = editing
        ? await api.put(`/township-crm/projects/${editing.id}`, form)
        : await api.post(`/township-crm/projects`, form);
      if(res.data?.success) onSaved();
      else alert(res.data?.message || "Save failed");
    }catch(e){ alert(e.response?.data?.message || e.message); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Project" : "Naya Project"} width={560}>
      <FormRow label="Project Name" required>
        <input style={inputStyle} value={form.name || ""} onChange={(e)=>set("name", e.target.value)} placeholder="Anadi Ananta"/>
      </FormRow>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FormRow label="Project Code">
          <input style={inputStyle} value={form.project_code || ""} onChange={(e)=>set("project_code", e.target.value)} placeholder="AAT-P1"/>
        </FormRow>
        <FormRow label="Type">
          <select style={inputStyle} value={form.project_type || "row_house"} onChange={(e)=>set("project_type", e.target.value)}>
            <option value="row_house">Row House</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="plot">Plot</option>
            <option value="mixed">Mixed</option>
          </select>
        </FormRow>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FormRow label="City"><input style={inputStyle} value={form.city || ""} onChange={(e)=>set("city", e.target.value)}/></FormRow>
        <FormRow label="State"><input style={inputStyle} value={form.state || ""} onChange={(e)=>set("state", e.target.value)}/></FormRow>
      </div>
      <FormRow label="Address"><textarea style={{...inputStyle,minHeight:50,resize:"vertical"}} value={form.location_address || ""} onChange={(e)=>set("location_address", e.target.value)}/></FormRow>
      <FormRow label="RERA No"><input style={inputStyle} value={form.rera_no || ""} onChange={(e)=>set("rera_no", e.target.value)}/></FormRow>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FormRow label="Launch Date"><input type="date" style={inputStyle} value={form.launch_date || ""} onChange={(e)=>set("launch_date", e.target.value)}/></FormRow>
        <FormRow label="Possession Date"><input type="date" style={inputStyle} value={form.expected_possession_date || ""} onChange={(e)=>set("expected_possession_date", e.target.value)}/></FormRow>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8,paddingTop:10,borderTop:`1px solid ${T.b1}`}}>
        <Btn label="Cancel" onClick={onClose}/>
        <Btn label={saving ? "Saving…" : "Save"} primary onClick={handleSave} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// MODAL: Add/Edit Unit Type
// ════════════════════════════════════════════════════════════════
function AddEditUnitTypeModal({open, editing, projectId, onClose, onSaved}){
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    if(editing){
      setForm({
        type_name: editing.type_name || "",
        type_code: editing.type_code || "",
        bhk: editing.bhk || "",
        plot_area_sqft: editing.plot_area_sqft || "",
        built_up_area_sqft: editing.built_up_area_sqft || "",
        base_rate_per_sqft: editing.base_rate_per_sqft || "",
        base_price: editing.base_price || "",
        description: editing.description || "",
      });
    } else {
      setForm({});
    }
  }, [editing, open]);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  // Auto-calculate base_price when rate × built-up area changes
  useEffect(()=>{
    if(form.base_rate_per_sqft && form.built_up_area_sqft && !editing){
      const calc = Number(form.base_rate_per_sqft) * Number(form.built_up_area_sqft);
      if(!form._manual_price) set("base_price", Math.round(calc));
    }
  }, [form.base_rate_per_sqft, form.built_up_area_sqft]); // eslint-disable-line

  const handleSave = async () => {
    if(!form.type_name?.trim()){ alert("Type name required"); return; }
    if(!form.type_code?.trim()){ alert("Type code required"); return; }
    setSaving(true);
    try{
      const payload = {...form};
      delete payload._manual_price;
      const res = editing
        ? await api.put(`/township-crm/unit-types/${editing.id}`, payload)
        : await api.post(`/township-crm/projects/${projectId}/unit-types`, payload);
      if(res.data?.success) onSaved();
      else alert(res.data?.message || "Save failed");
    }catch(e){ alert(e.response?.data?.message || e.message); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Unit Type" : "Naya Unit Type"} width={560}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
        <FormRow label="Type Name" required hint='e.g. "2BHK Row House"'>
          <input style={inputStyle} value={form.type_name || ""} onChange={(e)=>set("type_name", e.target.value)}/>
        </FormRow>
        <FormRow label="Type Code" required hint='e.g. "A", "B"'>
          <input style={inputStyle} value={form.type_code || ""} onChange={(e)=>set("type_code", e.target.value)}/>
        </FormRow>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
        <FormRow label="BHK">
          <input type="number" step="0.5" style={inputStyle} value={form.bhk || ""} onChange={(e)=>set("bhk", e.target.value)}/>
        </FormRow>
        <FormRow label="Plot Area (sqft)">
          <input type="number" style={inputStyle} value={form.plot_area_sqft || ""} onChange={(e)=>set("plot_area_sqft", e.target.value)}/>
        </FormRow>
        <FormRow label="Built-up (sqft)">
          <input type="number" style={inputStyle} value={form.built_up_area_sqft || ""} onChange={(e)=>set("built_up_area_sqft", e.target.value)}/>
        </FormRow>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FormRow label="Rate per sqft (₹)">
          <input type="number" style={inputStyle} value={form.base_rate_per_sqft || ""} onChange={(e)=>set("base_rate_per_sqft", e.target.value)}/>
        </FormRow>
        <FormRow label="Base Price (₹)" hint="Auto-calculated, edit if needed">
          <input type="number" style={inputStyle} value={form.base_price || ""}
            onChange={(e)=>{ set("base_price", e.target.value); set("_manual_price", true); }}/>
        </FormRow>
      </div>
      <FormRow label="Description">
        <textarea style={{...inputStyle,minHeight:50,resize:"vertical"}} value={form.description || ""} onChange={(e)=>set("description", e.target.value)}/>
      </FormRow>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8,paddingTop:10,borderTop:`1px solid ${T.b1}`}}>
        <Btn label="Cancel" onClick={onClose}/>
        <Btn label={saving ? "Saving…" : "Save"} primary onClick={handleSave} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// MODAL: Add/Edit Batch
// ════════════════════════════════════════════════════════════════
function AddEditBatchModal({open, editing, projectId, onClose, onSaved}){
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    if(editing){
      setForm({
        batch_no: editing.batch_no || "",
        batch_name: editing.batch_name || "",
        batch_type: editing.batch_type || "row_house_cluster",
        unit_range_label: editing.unit_range_label || "",
        subcon_name: editing.subcon_name || "",
        subcon_phone: editing.subcon_phone || "",
        contract_value: editing.contract_value || "",
        contract_start_date: editing.contract_start_date || "",
        target_completion_date: editing.target_completion_date || "",
        notes: editing.notes || "",
      });
    } else {
      setForm({batch_type:"row_house_cluster"});
    }
  }, [editing, open]);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  const handleSave = async () => {
    if(!form.batch_no?.trim()){ alert("Batch number required"); return; }
    setSaving(true);
    try{
      const res = editing
        ? await api.put(`/township-crm/batches/${editing.id}`, form)
        : await api.post(`/township-crm/projects/${projectId}/batches`, form);
      if(res.data?.success) onSaved();
      else alert(res.data?.message || "Save failed");
    }catch(e){ alert(e.response?.data?.message || e.message); }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Batch" : "Naya Batch"} width={580}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10}}>
        <FormRow label="Batch No" required hint='e.g. "B-01"'>
          <input style={inputStyle} value={form.batch_no || ""} onChange={(e)=>set("batch_no", e.target.value)}/>
        </FormRow>
        <FormRow label="Batch Name" hint='e.g. "Phase-1 RH 1-10"'>
          <input style={inputStyle} value={form.batch_name || ""} onChange={(e)=>set("batch_name", e.target.value)}/>
        </FormRow>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FormRow label="Batch Type">
          <select style={inputStyle} value={form.batch_type || "row_house_cluster"} onChange={(e)=>set("batch_type", e.target.value)}>
            <option value="row_house_cluster">Row House Cluster</option>
            <option value="tower">Tower</option>
            <option value="floor_group">Floor Group</option>
            <option value="phase">Phase</option>
          </select>
        </FormRow>
        <FormRow label="Unit Range Label" hint='e.g. "A-1 to A-10"'>
          <input style={inputStyle} value={form.unit_range_label || ""} onChange={(e)=>set("unit_range_label", e.target.value)}/>
        </FormRow>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10}}>
        <FormRow label="Subcon Name">
          <input style={inputStyle} value={form.subcon_name || ""} onChange={(e)=>set("subcon_name", e.target.value)} placeholder="Ramesh Construction"/>
        </FormRow>
        <FormRow label="Subcon Phone">
          <input style={inputStyle} value={form.subcon_phone || ""} onChange={(e)=>set("subcon_phone", e.target.value)}/>
        </FormRow>
      </div>
      <FormRow label="Contract Value (₹)">
        <input type="number" style={inputStyle} value={form.contract_value || ""} onChange={(e)=>set("contract_value", e.target.value)}/>
      </FormRow>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <FormRow label="Start Date"><input type="date" style={inputStyle} value={form.contract_start_date || ""} onChange={(e)=>set("contract_start_date", e.target.value)}/></FormRow>
        <FormRow label="Target Completion"><input type="date" style={inputStyle} value={form.target_completion_date || ""} onChange={(e)=>set("target_completion_date", e.target.value)}/></FormRow>
      </div>
      <FormRow label="Notes">
        <textarea style={{...inputStyle,minHeight:50,resize:"vertical"}} value={form.notes || ""} onChange={(e)=>set("notes", e.target.value)}/>
      </FormRow>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:8,paddingTop:10,borderTop:`1px solid ${T.b1}`}}>
        <Btn label="Cancel" onClick={onClose}/>
        <Btn label={saving ? "Saving…" : "Save"} primary onClick={handleSave} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// MODAL: Generate Units (THE KILLER FEATURE)
// ════════════════════════════════════════════════════════════════
function GenerateUnitsModal({batch, unitTypes, onClose, onGenerated}){
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState([]);

  useEffect(()=>{
    if(batch){
      setForm({
        prefix: "",
        start_no: 1,
        count: 10,
        unit_type_id: unitTypes[0]?.id || "",
        facing: "",
        is_corner_pattern: "first_last",
        is_garden_facing_pattern: "none",
        plc_corner: 50,
        plc_garden: 100,
        phase: "",
      });
    }
  }, [batch, unitTypes]);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  // Build preview
  useEffect(()=>{
    if(!form.prefix || !form.count || !form.unit_type_id) { setPreview([]); return; }
    const ut = unitTypes.find(t => t.id === Number(form.unit_type_id));
    if(!ut) { setPreview([]); return; }
    const builtUp = Number(ut.built_up_area_sqft || 0);
    const basePrice = Number(ut.base_price || 0);
    const plcCornerRate = Number(form.plc_corner || 0);
    const plcGardenRate = Number(form.plc_garden || 0);
    const arr = [];
    const c = Math.min(Number(form.count || 0), 20); // limit preview to 20
    for(let i = 0; i < c; i++){
      const isCorner = form.is_corner_pattern === "all" ? 1 : form.is_corner_pattern === "first_last" ? (i === 0 || i === c - 1 ? 1 : 0) : 0;
      const isGarden = form.is_garden_facing_pattern === "all" ? 1 : form.is_garden_facing_pattern === "first_last" ? (i === 0 || i === c - 1 ? 1 : 0) : 0;
      const plc = builtUp * (isCorner * plcCornerRate + isGarden * plcGardenRate);
      arr.push({
        unit_no: `${form.prefix}-${Number(form.start_no) + i}`,
        is_corner: isCorner,
        is_garden: isGarden,
        plc,
        final: basePrice + plc,
      });
    }
    setPreview(arr);
  }, [form, unitTypes]);

  const handleGenerate = async () => {
    if(!form.prefix?.trim()){ alert("Prefix required"); return; }
    if(!form.unit_type_id){ alert("Unit type required"); return; }
    if(!form.count || form.count < 1){ alert("Count must be at least 1"); return; }
    if(form.count > 200){ alert("Cannot generate more than 200 units"); return; }
    setSaving(true);
    try{
      const res = await api.post(`/township-crm/batches/${batch.id}/generate-units`, {
        ...form,
        count: Number(form.count),
        start_no: Number(form.start_no),
        unit_type_id: Number(form.unit_type_id),
        plc_corner: Number(form.plc_corner || 0),
        plc_garden: Number(form.plc_garden || 0),
      });
      if(res.data?.success){
        alert(`✅ ${res.data.data.generated_count} units created!\nBatch total: ${res.data.data.batch_total}\nProject total: ${res.data.data.project_total}`);
        onGenerated();
      } else {
        alert(res.data?.message || "Generation failed");
      }
    }catch(e){ alert(e.response?.data?.message || e.message); }
    setSaving(false);
  };

  if(!batch) return null;

  return (
    <Modal open={!!batch} onClose={onClose} title={`Generate Units — ${batch.batch_no}`} width={680}>
      <div style={{background:T.priL,padding:"8px 12px",borderRadius:6,fontSize:12,color:T.priD,marginBottom:14}}>
        <strong>Batch:</strong> {batch.batch_name} · {batch.unit_range_label}
      </div>

      {unitTypes.length === 0 ? (
        <div style={{padding:20,background:T.redL,color:T.red,borderRadius:6,fontSize:13,marginBottom:14}}>
          ⚠️ Pehle Settings tab me jaake kam se kam 1 Unit Type banao, fir units generate ho sakenge.
        </div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <FormRow label="Prefix" required hint='e.g. "A", "RH"'>
              <input style={inputStyle} value={form.prefix || ""} onChange={(e)=>set("prefix", e.target.value)} placeholder="A"/>
            </FormRow>
            <FormRow label="Start Number" required>
              <input type="number" min={1} style={inputStyle} value={form.start_no || 1} onChange={(e)=>set("start_no", e.target.value)}/>
            </FormRow>
            <FormRow label="Count" required hint="Max 200">
              <input type="number" min={1} max={200} style={inputStyle} value={form.count || 10} onChange={(e)=>set("count", e.target.value)}/>
            </FormRow>
          </div>

          <FormRow label="Unit Type" required>
            <select style={inputStyle} value={form.unit_type_id || ""} onChange={(e)=>set("unit_type_id", e.target.value)}>
              {unitTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.type_code} · {t.type_name} ({fmtINR(t.base_price)})
                </option>
              ))}
            </select>
          </FormRow>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <FormRow label="Facing (default)">
              <select style={inputStyle} value={form.facing || ""} onChange={(e)=>set("facing", e.target.value)}>
                <option value="">— None —</option>
                {["N","S","E","W","NE","NW","SE","SW"].map(f => <option key={f}>{f}</option>)}
              </select>
            </FormRow>
            <FormRow label="Corner Pattern">
              <select style={inputStyle} value={form.is_corner_pattern || "none"} onChange={(e)=>set("is_corner_pattern", e.target.value)}>
                <option value="none">None</option>
                <option value="first_last">First & Last</option>
                <option value="all">All Corner</option>
              </select>
            </FormRow>
            <FormRow label="Garden Pattern">
              <select style={inputStyle} value={form.is_garden_facing_pattern || "none"} onChange={(e)=>set("is_garden_facing_pattern", e.target.value)}>
                <option value="none">None</option>
                <option value="first_last">First & Last</option>
                <option value="all">All Garden</option>
              </select>
            </FormRow>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <FormRow label="PLC Corner (₹/sqft)">
              <input type="number" style={inputStyle} value={form.plc_corner || 0} onChange={(e)=>set("plc_corner", e.target.value)}/>
            </FormRow>
            <FormRow label="PLC Garden (₹/sqft)">
              <input type="number" style={inputStyle} value={form.plc_garden || 0} onChange={(e)=>set("plc_garden", e.target.value)}/>
            </FormRow>
            <FormRow label="Phase Label (optional)">
              <input style={inputStyle} value={form.phase || ""} onChange={(e)=>set("phase", e.target.value)} placeholder="Phase-1"/>
            </FormRow>
          </div>

          {/* PREVIEW TABLE */}
          {preview.length > 0 && (
            <div style={{marginTop:10,background:T.gryL,borderRadius:6,padding:10,maxHeight:200,overflowY:"auto"}}>
              <div style={{fontSize:11,fontWeight:600,color:T.t2,marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>
                Preview (showing first {Math.min(preview.length, 20)} of {form.count})
              </div>
              <table style={{width:"100%",fontSize:11.5,borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{color:T.t2}}>
                    <th style={{textAlign:"left",padding:"3px 6px"}}>Unit</th>
                    <th style={{textAlign:"left",padding:"3px 6px"}}>Corner</th>
                    <th style={{textAlign:"left",padding:"3px 6px"}}>Garden</th>
                    <th style={{textAlign:"right",padding:"3px 6px"}}>PLC</th>
                    <th style={{textAlign:"right",padding:"3px 6px"}}>Final Price</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p,i) => (
                    <tr key={i}>
                      <td style={{padding:"3px 6px",fontWeight:500,color:T.t1}}>{p.unit_no}</td>
                      <td style={{padding:"3px 6px"}}>{p.is_corner ? "✓" : ""}</td>
                      <td style={{padding:"3px 6px"}}>{p.is_garden ? "✓" : ""}</td>
                      <td style={{padding:"3px 6px",textAlign:"right",color:T.t2}}>{fmtINR(p.plc)}</td>
                      <td style={{padding:"3px 6px",textAlign:"right",fontWeight:500,color:T.t1}}>{fmtINR(p.final)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14,paddingTop:10,borderTop:`1px solid ${T.b1}`}}>
        <Btn label="Cancel" onClick={onClose}/>
        <Btn label={saving ? "Generating…" : `Generate ${form.count || 0} Units`} primary onClick={handleGenerate} disabled={saving || unitTypes.length===0}/>
      </div>
    </Modal>
  );
}
