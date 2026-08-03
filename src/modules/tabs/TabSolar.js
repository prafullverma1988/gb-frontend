import React, { useState, useEffect } from "react";
import api, { API_BASE } from "../../config/api";
import { T } from "../shared/tokens";
import { Panel } from "../shared/ui";

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

export { TabSuryaGhar, TabSolarBOQ, TabSolarDocs, TabSolarInstall, TabSolarSubsidy };
