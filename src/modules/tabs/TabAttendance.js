import React, { useState, useEffect } from "react";
import api from "../../config/api";
import apiCache from "../../utils/apiCache";
import SearchSelect from "../../components/SearchSelect";
import { T, fmtN, localYMD } from "../shared/tokens";
import { Pill, THead } from "../shared/ui";

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
  const [addVendorMode, setAddVendorMode] = useState("pick"); // 'pick' (from company) | 'new'
  const [vendorPickSel, setVendorPickSel] = useState(new Set()); // company vendor ids to add to project
  const [pickSaving, setPickSaving] = useState(false);
  const [vForm, setVForm] = useState({ name:"", owner:"", phone:"", email:"", city:"", gstin:"", trade:"", notes:"" });
  const [vSkills, setVSkills] = useState([]);  // [{skill, rate, card_rate}]
  const [vSaving, setVSaving] = useState(false);
  // Add-skill-to-existing-vendor inline form (daily section)
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [skillForm, setSkillForm] = useState({ skill:"", rate:"" });
  const [addSkillSaving, setAddSkillSaving] = useState(false);

  // ── Libraries ───────────────────────────────────────────────────
  const [workerLib, setWorkerLib] = useState([]);
  const [subconLib, setSubconLib] = useState([]);
  const [vendorLib, setVendorLib] = useState([]);          // vendors ON THIS PROJECT (selector + daily)
  const [companyVendorLib, setCompanyVendorLib] = useState([]); // full company master (the picker)
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

  // Load vendors: project-scoped list (selector/daily) + company master (picker)
  const loadVendors = async () => {
    try {
      const [pr, co] = await Promise.all([
        api.get(`/labour-vendors/project/${projectId}`),
        api.get("/labour-vendors"),
      ]);
      if (pr?.success) setVendorLib(pr.data || []);
      if (co?.success) setCompanyVendorLib(co.data || []);
    } catch(_) {}
  };

  // ── Load libraries + rate card on mount ─────────────────────────
  useEffect(() => {
    api.get("/library/workers").then(r=>{ if(r.success) setWorkerLib(r.data||[]); }).catch(()=>{});
    api.get("/finance/parties?type=Subcontractor").then(r=>{ if(r.success) setSubconLib(r.data||[]); }).catch(()=>{});
    loadVendors();
    api.get("/library/labour-rates").then(r=>{ if(r.success) setRateCard(r.data||[]); }).catch(()=>{});
    /* eslint-disable-next-line */
  }, [projectId]);

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
              // default to picking from company master; if none exist, register new
              setVendorPickSel(new Set());
              setAddVendorMode(companyVendorLib.length ? "pick" : "new");
              setShowAddVendor(true);
            }}
            title="Add a vendor to this project"
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200}}/>
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
                {/* Skill count + Add Skill (add a skill this vendor newly supplies) */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,gap:10}}>
                  <button onClick={()=>{ const rc=rateCard.find(r=>{const n=r.role||r.name||r.skill; return n && !(vd?.skills||[]).some(s=>s.skill===n);}); const sk=rc?(rc.role||rc.name||rc.skill):""; setSkillForm({skill:sk,rate:getRateForRole(sk)||""}); setShowAddSkill(v=>!v); }}
                    style={{padding:"4px 11px",borderRadius:6,border:`1px solid ${T.amb}`,background:showAddSkill?T.amb:T.ambL,color:showAddSkill?"white":T.amb,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    {showAddSkill?"× Cancel":"+ Add Skill"}
                  </button>
                  <span style={{fontSize:11,color:T.t4,fontWeight:500}}>{vSkillsCount} skill{vSkillsCount!==1?"s":""} · rates locked at onboarding</span>
                </div>
                {showAddSkill&&(()=>{
                  const cr = getRateForRole(skillForm.skill);
                  const differs = cr>0 && Number(skillForm.rate)!==cr;
                  return(
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,padding:"10px 12px",background:T.ambL,border:`1px solid ${T.ambM}`,borderRadius:8}}>
                    <select value={skillForm.skill} onChange={e=>{const sk=e.target.value; setSkillForm({skill:sk,rate:getRateForRole(sk)||""});}}
                      style={{flex:1,padding:"7px 9px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,fontFamily:"inherit",background:"white"}}>
                      <option value="">— Select skill —</option>
                      {rateCard.map(rc=>{const n=rc.role||rc.name||rc.skill; if(!n) return null; const has=(vd?.skills||[]).some(s=>s.skill===n); return <option key={rc.id} value={n} disabled={has}>{n}{has?" (added)":""}</option>;})}
                    </select>
                    <input type="number" value={cr||""} disabled placeholder="Card" title="Card rate" style={{width:78,padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,textAlign:"right",background:cr>0?T.grnL:T.surfaceB,color:cr>0?T.grn:T.t4,fontWeight:600,boxSizing:"border-box"}}/>
                    <input type="number" value={skillForm.rate} onChange={e=>setSkillForm(f=>({...f,rate:e.target.value}))} placeholder="Rate" min={0}
                      style={{width:78,padding:"7px 8px",borderRadius:6,border:`1.5px solid ${differs?T.ambM:T.b1}`,fontSize:13,fontWeight:700,color:differs?T.amb:T.t1,textAlign:"right",fontFamily:"inherit",background:differs?"white":"white",boxSizing:"border-box"}}/>
                    <button disabled={addSkillSaving||!skillForm.skill||!(Number(skillForm.rate)>0)} onClick={async()=>{
                      setAddSkillSaving(true);
                      try {
                        const r = await api.post(`/labour-vendors/${vd.id}/skills`, { skill:skillForm.skill, rate:Number(skillForm.rate), card_rate:getRateForRole(skillForm.skill)||0, project_id:projectId });
                        if(r?.success){ await loadVendors(); setShowAddSkill(false); setSkillForm({skill:"",rate:""}); }
                        else alert(r?.message||"Add skill failed");
                      } catch(e){ alert("Error: "+e.message); }
                      setAddSkillSaving(false);
                    }} style={{padding:"7px 13px",borderRadius:6,background:(!skillForm.skill||!(Number(skillForm.rate)>0))?"#ccc":T.amb,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",opacity:addSkillSaving?.7:1,whiteSpace:"nowrap"}}>{addSkillSaving?"...":"Add"}</button>
                  </div>);
                })()}

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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,animation:"fadeIn .15s ease-out"}}/>
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300}}/>
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300}}/>
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
        <div 
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
            <button onClick={async ()=>{
                const s = await window.promptAsync("New skill name:");
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
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300}}/>
        <div style={{position:"fixed",top:0,right:0,height:"100vh",width:620,maxWidth:"95vw",background:T.surface,boxShadow:"-8px 0 30px rgba(0,0,0,0.18)",zIndex:301,fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column",animation:"gbSlideInRight .25s ease-out"}}>
          <div style={{background:"#0D1B2A",padding:"13px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>Add Vendor to Project</div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.5)",marginTop:2}}>Pick from company vendors, or register a new one</div>
            </div>
            <button onClick={()=>setShowAddVendor(false)} title="Close"
              style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",padding:6,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .12s"}}
              onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.1)"}
              onMouseLeave={el=>el.currentTarget.style.background="none"}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {/* Mode tabs */}
          <div style={{display:"flex",gap:6,padding:"10px 18px 0",flexShrink:0}}>
            {[["pick","Add existing"],["new","Register new"]].map(([id,l])=>(
              <button key={id} onClick={()=>setAddVendorMode(id)}
                style={{flex:1,padding:"8px",borderRadius:7,border:`1.5px solid ${addVendorMode===id?T.amb:T.b1}`,background:addVendorMode===id?T.ambL:T.surface,color:addVendorMode===id?T.amb:T.t3,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <div style={{padding:"14px 18px",overflowY:"auto",flex:1}}>
          {addVendorMode==="pick"?(()=>{
            // Company vendors NOT already on this project
            const onProject = new Set(vendorLib.map(v=>String(v.id)));
            const available = companyVendorLib.filter(v=>!onProject.has(String(v.id)));
            const toggle = id => setVendorPickSel(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
            return(<>
              <div style={{fontSize:11.5,color:T.t3,marginBottom:10}}>Is project pe kaun se vendor kaam karte hain — company master se select karo.</div>
              {available.length===0?(
                <div style={{padding:"24px 16px",textAlign:"center",border:`1.5px dashed ${T.b1}`,borderRadius:10,background:T.surfaceB,fontSize:12.5,color:T.t3}}>
                  {companyVendorLib.length===0?"Company me koi labour vendor register nahi — \"Register new\" se naya banao.":"Saare company vendors is project me already add hain."}
                </div>
              ):available.map(v=>{
                const sel = vendorPickSel.has(v.id);
                const skc = (v.skills||[]).length;
                return(
                  <div key={v.id} onClick={()=>toggle(v.id)}
                    style={{display:"flex",alignItems:"center",gap:11,padding:"10px 12px",borderRadius:9,border:`1.5px solid ${sel?T.amb:T.b1}`,background:sel?T.ambL:T.surface,marginBottom:7,cursor:"pointer"}}>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${sel?T.amb:T.b2}`,background:sel?T.amb:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {sel&&<svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{v.name}</div>
                      <div style={{fontSize:10.5,color:T.t4}}>{[v.city,v.phone].filter(Boolean).join(" · ")||"—"} · {skc} skill{skc!==1?"s":""}</div>
                    </div>
                  </div>
                );
              })}
            </>);
          })():(<>
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
          </>)}
          </div>
          {/* Footer — mode-dependent */}
          <div style={{padding:"11px 18px",borderTop:`1px solid ${T.b1}`,display:"flex",gap:8,flexShrink:0,background:T.surface}}>
            <button onClick={()=>setShowAddVendor(false)} style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>Cancel</button>
            {addVendorMode==="pick"?(
              <button onClick={async()=>{
                if(!vendorPickSel.size) return;
                setPickSaving(true);
                try {
                  const ids = Array.from(vendorPickSel);
                  for (const vid of ids) { await api.post(`/labour-vendors/project/${projectId}`, { vendor_id: vid }); }
                  await loadVendors();
                  setSelVendorId(String(ids[0]));
                  setVendorPickSel(new Set());
                  setShowAddVendor(false);
                } catch(e){ alert("Error: "+e.message); }
                setPickSaving(false);
              }} disabled={pickSaving||!vendorPickSel.size}
                style={{flex:2,padding:"9px",borderRadius:7,background:vendorPickSel.size?T.amb:"#ccc",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:vendorPickSel.size?"pointer":"not-allowed",opacity:pickSaving?.7:1}}>
                {pickSaving?"Adding...":`Add ${vendorPickSel.size||""} to project`}
              </button>
            ):(
              <button onClick={async()=>{
                if(!vForm.name.trim()) return alert("Vendor name required");
                const validSkills = vSkills.filter(s=>s.skill && Number(s.rate)>0);
                if(!validSkills.length) return alert("Add at least one skill with rate");
                setVSaving(true);
                try {
                  const res = await api.post("/labour-vendors", {
                    ...vForm, name: vForm.name.trim(), project_id: projectId,
                    skills: validSkills.map(s=>({ skill:s.skill, rate:Number(s.rate), card_rate:getRateForRole(s.skill)||0 })),
                  });
                  if(res.success) {
                    // link the new company vendor to THIS project
                    try { await api.post(`/labour-vendors/project/${projectId}`, { vendor_id: res.data.id }); } catch(_){}
                    await loadVendors();
                    setSelVendorId(String(res.data.id));
                    setShowAddVendor(false);
                  } else { alert(res.message || "Save failed"); }
                } catch(e) { alert("Error: " + e.message); }
                setVSaving(false);
              }} disabled={vSaving||!vForm.name.trim()}
                style={{flex:2,padding:"9px",borderRadius:7,background:vForm.name.trim()?T.amb:"#ccc",color:"white",fontSize:12.5,fontWeight:700,border:"none",cursor:vForm.name.trim()?"pointer":"not-allowed",opacity:vSaving?.7:1}}>
                {vSaving?"Saving...":"Save Vendor + Skills"}
              </button>
            )}
          </div>
        </div>
      </>)}

      {/* ── RATE CHANGE APPROVAL MODAL ────────────────────────────────── */}
      {showRateModal&&rateReqWorker&&(<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:300}}/>
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

export default TabAttendance;
