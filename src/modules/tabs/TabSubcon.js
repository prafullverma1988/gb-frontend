import React, { useState, useEffect, useRef } from "react";
import api from "../../config/api";
import apiCache from "../../utils/apiCache";
import SearchSelect from "../../components/SearchSelect";
import { T, localYMD } from "../shared/tokens";

function TabSubcon({ projectId, project }) {
  const [wos, setWos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selWo, setSelWo] = useState(null);
  const [subTab, setSubTab] = useState("wo");
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [subcons, setSubcons] = useState([]);
  const [showNewWO, setShowNewWO] = useState(false);
  const [showNewBill, setShowNewBill] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const billSubmitRef = useRef(false);
  const [showEditWO, setShowEditWO] = useState(false);
  const [amendments, setAmendments] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editBill, setEditBill] = useState(null);
  const [editBillSaving, setEditBillSaving] = useState(false);
  const [billItems, setBillItems] = useState({});
  const [billForm, setBillForm] = useState({ bill_date: new Date().toISOString().split("T")[0], remark:"", items:[] });
  const [payForm, setPayForm] = useState({ amount_paid:"", payment_date: new Date().toISOString().split("T")[0], payment_mode:"Bank Transfer", reference_no:"", remark:"" });
  const [showManualRaBill, setShowManualRaBill] = useState(false);
  const [manualBillForm, setManualBillForm] = useState({ bill_date: localYMD(), remark:"", items:[{description:"",qty:"",rate:""}] });
  const [manualBillSaving, setManualBillSaving] = useState(false);

  // ── Milestone billing (Phase 1 backend already shipped; this is the UI side) ──
  // Subcon WOs default to billing_method='manual'. Switch via the chip in the WO
  // header. milestone_rate uses per-item milestones with cum_rate; milestone_percent
  // uses WO-value stages with pct. Shares the milestone_templates store with library.
  const [woMilestones, setWoMilestones] = useState({ rate_by_item: {}, percent: [] });
  const [showSetMs, setShowSetMs]       = useState(false);
  const [msForm, setMsForm] = useState({
    kind: "rate",            // 'rate' | 'percent'
    wo_item_id: null,        // legacy single-item (kept for backward compat)
    rateMs: [{ seq: 0, name: "", cum_rate: "" }],
    pctMs:  [{ seq: 0, name: "", pct: "" }],
    pickedItemIds: [],       // multi-item picker (new Estimate-style flow)
    itemStages: {},          // { [wo_item_id]: [{seq,name,cum_rate}] }
    expandedItemId: null,
  });
  const [templates, setTemplates] = useState([]);
  const [woItemPickerOpen,   setWoItemPickerOpen]   = useState(false);
  const [woItemPickerSearch, setWoItemPickerSearch] = useState("");

  // ── Payment Schedule tab state ──────────────────────────────────────────
  const [billingLedger,      setBillingLedger]      = useState(null);
  const [ledgerLoading,      setLedgerLoading]      = useState(false);
  const [linkedTasks,        setLinkedTasks]        = useState({});   // {[ms_id]: {task_id,task_name,progress,trigger_pct,eligible}}
  const [linkedTasksLoading, setLinkedTasksLoading] = useState(false);
  const [msChooserOpen,      setMsChooserOpen]      = useState(false);
  // Task picker for linking milestones
  const [taskPickerFor,      setTaskPickerFor]      = useState(null); // ms_id being linked
  const [projectTasksSub,    setProjectTasksSub]    = useState([]);   // project task list
  const [taskPickerSearch,   setTaskPickerSearch]   = useState("");
  const [taskPickerExpSub,   setTaskPickerExpSub]   = useState({});
  const [linkTrigPct,        setLinkTrigPct]        = useState(100);
  const [linkSelTaskId,      setLinkSelTaskId]      = useState(null);
  const [linkingTask,        setLinkingTask]        = useState(false);

  const loadBillingLedger = async (woId) => {
    if (!woId) return;
    setLedgerLoading(true);
    const r = await api.get("/subcon/wo/"+woId+"/billing-ledger").catch(()=>({success:false}));
    setLedgerLoading(false);
    if (r?.success) setBillingLedger(r.data);
  };

  const loadLinkedTasksSub = async (woId) => {
    if (!woId) return;
    setLinkedTasksLoading(true);
    const r = await api.get("/subcon/wo/"+woId+"/linked-tasks").catch(()=>({success:false}));
    setLinkedTasksLoading(false);
    if (r?.success) setLinkedTasks(r.data || {});
    if (projectId) {
      api.get("/tasks?project_id="+projectId).then(r2=>{ if(r2?.success) setProjectTasksSub(r2.data||[]); }).catch(()=>{});
    }
  };

  const openTaskPickerSub = async (msId) => {
    const existing = linkedTasks[msId];
    setLinkSelTaskId(existing?.task_id || null);
    setLinkTrigPct(existing?.trigger_pct ?? 100);
    setTaskPickerSearch(""); setTaskPickerExpSub({});
    setTaskPickerFor(msId);
    const r = await api.get("/tasks?project_id="+projectId).catch(()=>({success:false}));
    if (r?.success) setProjectTasksSub(r.data || []);
  };

  const confirmLinkTaskSub = async () => {
    if (!taskPickerFor || !linkSelTaskId) return;
    setLinkingTask(true);
    const r = await api.put("/subcon/wo/"+selWo.id+"/milestones/rate/"+taskPickerFor+"/link",
      { task_id: linkSelTaskId, trigger_pct: linkTrigPct }
    ).catch(e=>({ success:false, message:e.message }));
    setLinkingTask(false);
    if (!r?.success) { alert(r?.message || "Link failed"); return; }
    setTaskPickerFor(null);
    await loadLinkedTasksSub(selWo.id);
    await loadBillingLedger(selWo.id);
  };

  const unlinkTaskSub = async (msId) => {
    if (!window.confirm("Unlink this milestone from its task?")) return;
    await api.del("/subcon/wo/"+selWo.id+"/milestones/rate/"+msId+"/link").catch(()=>{});
    await loadLinkedTasksSub(selWo.id);
    await loadBillingLedger(selWo.id);
  };

  const deleteRateScheduleSub = async (woItemId, desc) => {
    if (!window.confirm("Delete all milestones for \"" + desc + "\"?")) return;
    await api.del("/subcon/wo/"+selWo.id+"/milestones/rate/"+woItemId).catch(()=>{});
    await reloadWo();
  };

  const deletePercentScheduleSub = async () => {
    if (!window.confirm("Delete all % milestones?")) return;
    await api.del("/subcon/wo/"+selWo.id+"/milestones/percent").catch(()=>{});
    await reloadWo();
  };

  useEffect(()=>{
    loadWOs();
    api.get("/library/subcontractors").then(r=>{ if(r.success) setSubcons(r.data||[]); }).catch(()=>{});
    api.get("/subcon/milestone-templates").then(r=>{ if(r.success) setTemplates(r.data||[]); }).catch(()=>{});
  },[projectId]);

  // Auto-load billing ledger + linked tasks when Payment Schedule tab is active
  const selWoId = selWo?.id;
  useEffect(()=>{
    if (subTab === "schedule" && selWoId) {
      loadBillingLedger(selWoId);
      loadLinkedTasksSub(selWoId);
    }
  },[subTab, selWoId]); // loadBillingLedger/loadLinkedTasksSub are stable (no deps from render)

  const loadWOs = async () => {
    setLoading(true);
    const r = await api.get("/subcon/work-orders?project_id="+projectId).catch(()=>({success:false}));
    if(r.success) setWos(r.data||[]);
    setLoading(false);
  };

  const selectWo = async (wo) => {
    setSelWo(wo); setSubTab("wo");
    setBillingLedger(null); setLinkedTasks({});
    const [bRes, sRes, aRes, mRes, dRes] = await Promise.all([
      api.get("/subcon/ra-bills?wo_id="+wo.id).catch(()=>({success:false})),
      api.get("/subcon/work-orders/"+wo.id+"/summary").catch(()=>({success:false})),
      api.get("/subcon/amendments?wo_id="+wo.id).catch(()=>({success:false})),
      api.get("/subcon/wo/"+wo.id+"/milestones").catch(()=>({success:false})),
      // Fresh WO detail so billing_method stays in sync after PUT /billing-method.
      api.get("/subcon/work-orders/"+wo.id).catch(()=>({success:false})),
    ]);
    if(bRes.success) setBills(bRes.data||[]);
    if(sRes.success) setSummary(sRes.data);
    if(aRes.success) setAmendments(aRes.data||[]);
    if(mRes.success) setWoMilestones(mRes.data || { rate_by_item:{}, percent:[] });
    if(dRes.success) setSelWo(prev => prev ? { ...prev, ...dRes.data } : prev);
  };

  const reloadWo = async () => { if (selWo) await selectWo(selWo); };

  // ── BILLING-METHOD SWITCH ──
  const switchBillingMethod = async (method) => {
    if (!selWo) return;
    if (selWo.billing_method === method) return;
    const r = await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: method }).catch(()=>({success:false}));
    if (r.success) await reloadWo();
    else alert(r.message || "Switch failed (incompatible bills?)");
  };

  // ── SET MILESTONES / PAYMENT SCHEDULE (rate or percent) ──
  const resetMsForm = () => setMsForm({ kind:"rate", wo_item_id:null, rateMs:[{seq:0,name:"",cum_rate:""}], pctMs:[{seq:0,name:"",pct:""}], pickedItemIds:[], itemStages:{}, expandedItemId:null });

  const submitMilestones = async () => {
    if (!selWo) return;
    setSaving(true);
    let r;
    if (msForm.kind === "rate") {
      // New multi-item flow
      const items = (msForm.pickedItemIds || []).map(itemId => ({
        wo_item_id: itemId,
        milestones: (msForm.itemStages[itemId] || [])
          .filter(m => m.name && m.cum_rate)
          .map((m, i) => ({ seq: i, name: m.name, cum_rate: parseFloat(m.cum_rate) })),
      })).filter(x => x.milestones.length > 0);

      if (!items.length) { setSaving(false); return alert("Pick at least one WO item and add stages"); }
      if (selWo.billing_method !== "milestone_rate") {
        await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: "milestone_rate" }, { timeoutMs: 30000 });
      }
      // Large WOs (10+ items) can take 20-30s on Railway DB — give 90s
      r = await api.post("/subcon/wo/"+selWo.id+"/milestones/rate", { items }, { timeoutMs: 90000 }).catch(()=>({success:false}));
    } else {
      const ms = msForm.pctMs.filter(m => m.name && m.pct)
        .map((m,i) => ({ seq:i, name:m.name, pct: parseFloat(m.pct) }));
      if (!ms.length) { setSaving(false); return alert("Add at least one milestone"); }
      if (selWo.billing_method !== "milestone_percent") {
        await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: "milestone_percent" }, { timeoutMs: 30000 });
      }
      r = await api.post("/subcon/wo/"+selWo.id+"/milestones/percent", { milestones: ms }, { timeoutMs: 30000 }).catch(()=>({success:false}));
    }
    setSaving(false);
    if (r.success) {
      setShowSetMs(false);
      resetMsForm();
      if (r.data?.warnings?.length) alert("Saved with warnings:\n" + r.data.warnings.join("\n"));
      await reloadWo();
      await loadBillingLedger(selWo.id);
    } else alert(r.message || "Failed");
  };

  // ── APPLY TEMPLATE to a WO item (template uses cum_pct × item.rate) ──
  const applyTemplateToItem = async (woItemId, templateId) => {
    const r = await api.post("/subcon/wo/"+selWo.id+"/items/"+woItemId+"/apply-template",
      { template_id: templateId }).catch(()=>({success:false}));
    if (r.success) {
      if (selWo.billing_method !== "milestone_rate") {
        await api.put("/subcon/wo/"+selWo.id+"/billing-method", { billing_method: "milestone_rate" });
      }
      await reloadWo();
    } else alert(r.message || "Apply template failed");
  };

  const fmtC = (v) => "₹"+(parseFloat(v)||0).toLocaleString("en-IN",{maximumFractionDigits:0});

  // ── NEW WO SUBMIT ──
  const submitWO = async () => {
    const validItems = woForm.items.filter(i=>i.description&&i.qty&&i.rate);
    if(!woForm.subcon_name || validItems.length===0) return alert("Subcontractor and at least 1 item required");
    setSaving(true);
    const res = await api.post("/subcon/work-orders",{
      project_id: projectId,
      subcon_name: woForm.subcon_name,
      description: woForm.description,
      retention_pct: parseFloat(woForm.retention_pct||5),
      tds_pct: parseFloat(woForm.tds_pct||2),
      start_date: woForm.start_date||null,
      end_date: woForm.end_date||null,
      items: validItems.map(i=>({ description:i.description, unit:i.unit, qty:parseFloat(i.qty), rate:parseFloat(i.rate) })),
    }).catch(()=>({success:false}));
    setSaving(false);
    if(res.success){ setShowNewWO(false); loadWOs(); setWoForm({subcon_id:"",subcon_name:"",description:"",retention_pct:5,tds_pct:2,start_date:"",end_date:"",items:[{description:"",unit:"",qty:"",rate:""}]}); }
    else alert(res.message||"Failed");
  };

  // ── NEW RA BILL SUBMIT ──
  // Branches on selWo.billing_method:
  //   manual           → existing behaviour, items map all WO items with cumulative_qty
  //   milestone_rate   → billForm.items already in {milestone_id, cumulative_qty} shape
  //   milestone_percent→ billForm.items already in {milestone_id} shape (just tick)
  // submitBill now receives full payload from NewRaBillModal
  const submitBill = async (payload) => {
    if(billSubmitRef.current) return;
    if(!selWo) return;
    billSubmitRef.current = true;
    setSaving(true);

    const postOne = (body) =>
      api.post("/subcon/ra-bills", { wo_id: selWo.id, ...body }, { timeoutMs: 60000 })
        .catch(() => ({ success: false }));

    const onSuccess = (billData) => {
      api.post("/approvals/submit", {
        module: "RA Bill",
        ref_id: billData.id,
        ref_no: billData.bill_no || "",
        title: (selWo.subcon_name||selWo.name||"") + " - RA Bill",
        amount: billData.total_amount || billData.gross_amount || 0,
        project_id: projectId,
        project_name: project?.name || "",
      }).catch(e => console.error("Approval submit:", e));
      apiCache.refreshApprovals();
    };

    let res;
    // ── Split logic — mirrors Estimate exactly ──────────────────────────
    if (payload._isSplit) {
      const { normalItems, overItems, over_bill_mode, over_bill_reason, bill_date, remark } = payload;
      const base = { bill_date, remark };

      // CASE A: nothing
      if (!normalItems.length && !overItems.length) {
        setSaving(false); billSubmitRef.current = false;
        return alert("Nothing to bill.");
      }
      // CASE B: only normal (no over-billing)
      if (overItems.length === 0) {
        res = await postOne({ ...base, items: normalItems });
      }
      // CASE C: only over (entire qty is beyond remaining — fully over-billed)
      else if (normalItems.length === 0) {
        if (!over_bill_mode) {
          setSaving(false); billSubmitRef.current = false;
          return alert("⚠ One or more milestones are fully billed but you've entered extra qty.\n\nTurn on Over-Billing Mode + add a reason to proceed.");
        }
        res = await postOne({ ...base, items: overItems, over_bill_mode: 1, over_bill_reason });
      }
      // CASE D: split — normal portion first, over-bill linked second
      else {
        if (!over_bill_mode) {
          setSaving(false); billSubmitRef.current = false;
          return alert("⚠ Some quantities exceed WO remaining.\n\nTurn on Over-Billing Mode + add a reason to proceed.\n\nSystem will auto-split into 2 linked RA bills (WO portion + over-bill portion).");
        }
        const r1 = await postOne({ ...base, items: normalItems });
        if (!r1.success || !r1.data?.id) {
          setSaving(false); billSubmitRef.current = false;
          return alert("Normal portion save failed: " + (r1.message || "Server error"));
        }
        onSuccess(r1.data);
        res = await postOne({ ...base, items: overItems, over_bill_mode: 1, over_bill_reason, linked_bill_id: r1.data.id });
      }
    } else {
      // Simple path: manual or milestone_percent (no split needed)
      res = await postOne(payload);
    }

    setSaving(false);
    billSubmitRef.current = false;

    if(res.success){
      onSuccess(res.data);
      if (res.data?.warnings?.length) alert("Saved with warnings:\n" + res.data.warnings.join("\n"));
      setShowNewBill(false);
      setBillForm({ bill_date: new Date().toISOString().split("T")[0], remark:"", items:[] });
      selectWo(selWo);
    }
    else alert(res.message||"Failed");
  };

  // ── SUBMIT MANUAL (FREE FORM) RA BILL ──────────────────────────────────
  const submitManualRaBill = async () => {
    if (!selWo) return;
    const validItems = manualBillForm.items.filter(it =>
      it.description.trim() && parseFloat(it.qty) > 0 && parseFloat(it.rate) >= 0
    );
    if (!validItems.length) return alert("Add at least one item with Description, Qty and Rate.");
    setManualBillSaving(true);
    const res = await api.post("/subcon/ra-bills", {
      wo_id: selWo.id,
      source: "free_form",
      bill_date: manualBillForm.bill_date,
      remark: manualBillForm.remark,
      items: validItems.map(it => ({
        description: it.description.trim(),
        qty:  parseFloat(it.qty),
        rate: parseFloat(it.rate),
      })),
    }).catch(() => ({ success:false }));
    setManualBillSaving(false);
    if (res.success) {
      setShowManualRaBill(false);
      setManualBillForm({ bill_date: localYMD(), remark:"", items:[{description:"",qty:"",rate:""}] });
      selectWo(selWo);
    } else {
      alert(res.message || "Failed to save manual RA bill.");
    }
  };

  // ── RECORD PAYMENT ──
  const submitPayment = async (billId) => {
    if(!payForm.amount_paid) return alert("Amount required");
    setSaving(true);
    const res = await api.post("/subcon/payments",{
      bill_id: billId, wo_id: selWo.id,
      amount_paid: parseFloat(payForm.amount_paid),
      payment_date: payForm.payment_date,
      payment_mode: payForm.payment_mode,
      reference_no: payForm.reference_no,
      remark: payForm.remark,
    }).catch(()=>({success:false}));
    setSaving(false);
    if(res.success){ setShowPayModal(false); selectWo(selWo); setPayForm({amount_paid:"",payment_date:new Date().toISOString().split("T")[0],payment_mode:"Bank Transfer",reference_no:"",remark:""}); }
    else alert(res.message||"Failed");
  };

  const inpStyle = {padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};
  const lblStyle = {fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3};

  return (
    <div style={{display:"flex",gap:0,height:"100%",minHeight:500}}>
      {/* LEFT — WO List */}
      <div style={{width:220,borderRight:"1px solid "+T.b1,background:T.surfaceB,flexShrink:0}}>
        <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Work Orders ({wos.length})</span>
          <button onClick={()=>setShowNewWO(true)} style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer"}}>+ New</button>
        </div>
        {loading&&<div style={{textAlign:"center",padding:"60px 0",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>}
        {!loading&&wos.length===0&&<div style={{padding:"24px 12px",textAlign:"center",color:T.t4,fontSize:12}}>No work orders yet</div>}
        {wos.map(wo=>{
          const isSel=selWo?.id===wo.id;
          const stC=wo.status==="Active"?T.grn:wo.status==="Completed"?T.blu:T.t4;
          return(
            <div key={wo.id} onClick={()=>selectWo(wo)}
              style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1,background:isSel?"#EFF6FF":T.surfaceB,borderLeft:isSel?"3px solid "+T.blu:"3px solid transparent"}}>
              <div style={{fontSize:12,fontWeight:700,color:isSel?T.blu:T.t1,marginBottom:2}}>{wo.subcon_name}</div>
              <div style={{fontSize:10,color:T.t4,marginBottom:4}}>{wo.subcon_category||"Civil"}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:T.grn}}>{fmtC(wo.total_value)}</span>
                <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:stC+"22",color:stC}}>{wo.status}</span>
              </div>
              {wo.bill_count>0&&<div style={{fontSize:9.5,color:T.t4,marginTop:3}}>{wo.bill_count} bill{wo.bill_count>1?"s":""}</div>}
            </div>
          );
        })}
      </div>

      {/* RIGHT — WO Detail */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {!selWo&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:T.t4,flexDirection:"column",gap:8}}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <div style={{fontSize:13,color:T.t3}}>Select a work order</div>
          </div>
        )}

        {selWo&&(<>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+T.b1,background:"#0F172A",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"white"}}>{selWo.subcon_name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2,display:"flex",alignItems:"center",gap:8}}>
                  <span>{selWo.description||selWo.subcon_category}</span>
                  {/* Billing-method chip — drives which UI the New RA Bill modal renders. */}
                  <span style={{
                    background: selWo.billing_method==="manual" ? "rgba(148,163,184,0.2)"
                              : selWo.billing_method==="milestone_rate" ? "rgba(96,165,250,0.2)"
                              : "rgba(167,139,250,0.2)",
                    color: selWo.billing_method==="manual" ? "#CBD5E1"
                         : selWo.billing_method==="milestone_rate" ? "#60A5FA"
                         : "#A78BFA",
                    padding:"1px 8px", borderRadius:4, fontWeight:700, fontSize:10,
                  }}>
                    {selWo.billing_method==="milestone_rate" ? "MILESTONE (rate)"
                      : selWo.billing_method==="milestone_percent" ? "MILESTONE (%)"
                      : "MANUAL BILLING"}
                  </span>
                </div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                {summary&&[
                  {l:"WO Value",v:fmtC(summary.wo_value),c:"#94A3B8"},
                  {l:"Billed",v:fmtC(summary.total_billed),c:"#60A5FA"},
                  {l:"Paid",v:fmtC(summary.total_paid),c:"#4ADE80"},
                  {l:"Retention",v:fmtC(summary.retention_held),c:"#FCD34D"},
                  {l:"Balance",v:fmtC(summary.balance),c:"#F87171"},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:"right"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>{s.l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                  </div>
                ))}
                <button onClick={()=>setShowEditWO(true)}
                  style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                  ✏ Edit
                </button>
              </div>
            </div>
          </div>

          {/* Sub Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid "+T.b1,background:T.surfaceB,flexShrink:0,alignItems:"center"}}>
            {[
              {id:"wo",label:"Work Order"},
              {id:"schedule",label:"Payment Schedule"},
              {id:"bills",label:`RA Bills (${bills.length})`},
              {id:"pay",label:"Payments"},
              {id:"amend",label:"Amendments"+(amendments.filter(a=>a.status==="Pending").length>0 ? ` 🔴${amendments.filter(a=>a.status==="Pending").length}` : ` (${amendments.length})`)},
            ].map(t=>(
              <button key={t.id} onClick={()=>setSubTab(t.id)}
                style={{padding:"8px 16px",border:"none",background:"transparent",color:subTab===t.id?T.blu:T.t3,fontSize:12,fontWeight:subTab===t.id?700:400,cursor:"pointer",borderBottom:subTab===t.id?"2px solid "+T.blu:"2px solid transparent"}}>
                {t.label}
              </button>
            ))}
            <div style={{flex:1}}/>
            {/* Payment Schedule tab toolbar — mirrors Estimate */}
            {subTab==="schedule" && (<>
              {selWo?.billing_method === "milestone_rate" && (
                <button onClick={async()=>{
                    await loadLinkedTasksSub(selWo.id);
                    if (selWo.auto_bill_on_complete) {
                      const sw = await api.post("/subcon/wo/"+selWo.id+"/auto-bill-sweep").catch(()=>({success:false}));
                      if (sw?.success && sw.data?.created?.length > 0) {
                        alert(sw.data.created.length + " draft RA bill(s) created for eligible milestones. Review in RA Bills tab.");
                        await reloadWo();
                      }
                    }
                  }}
                  disabled={linkedTasksLoading}
                  style={{background:"white",color:T.t3,border:"1px solid "+T.b1,borderRadius:14,padding:"4px 10px",fontSize:10.5,fontWeight:600,cursor:linkedTasksLoading?"default":"pointer",display:"flex",alignItems:"center",gap:4,marginRight:4}}>
                  {linkedTasksLoading ? "Refreshing…" : "↻ Refresh progress"}
                </button>
              )}
              <button onClick={async()=>{
                  const next = !selWo.auto_bill_on_complete;
                  if (next && !window.confirm(
                    "Turn ON auto-billing?\n\nWhen a task linked to a milestone is marked Complete, the system will auto-create a DRAFT RA bill.\n\nDrafts need your review before paying. You can turn this off anytime."
                  )) return;
                  const r = await api.patch("/subcon/wo/"+selWo.id+"/auto-bill", { enabled: next }).catch(()=>({success:false}));
                  if (!r?.success) { alert(r?.message || "Failed"); return; }
                  setSelWo(p => p ? { ...p, auto_bill_on_complete: next ? 1 : 0 } : p);
                  if (next) {
                    const sw = await api.post("/subcon/wo/"+selWo.id+"/auto-bill-sweep").catch(()=>({success:false}));
                    if (sw?.success && sw.data?.created?.length > 0) {
                      alert("Auto-billing ON.\n\n" + sw.data.created.length + " draft RA bill(s) created for already-eligible milestones.");
                      await reloadWo();
                    }
                  }
                }}
                style={{
                  background: selWo?.auto_bill_on_complete ? "#DCFCE7" : T.surfaceB,
                  color:      selWo?.auto_bill_on_complete ? "#15803D" : T.t3,
                  border:"1px solid " + (selWo?.auto_bill_on_complete ? "#86EFAC" : T.b1),
                  borderRadius:14,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,marginRight:4,
                }}>
                🤖 Auto-bill {selWo?.auto_bill_on_complete ? "ON" : "OFF"}
              </button>
              <div style={{position:"relative",marginRight:8}}>
                <button onClick={()=>setMsChooserOpen(o=>!o)}
                  style={{background:T.bluL,color:T.blu,border:"1px solid "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  + Set Schedule ▾
                </button>
                {msChooserOpen && (<>
                  <div onClick={()=>setMsChooserOpen(false)} style={{position:"fixed",inset:0,zIndex:200}}/>
                  <div style={{position:"absolute",top:30,right:0,width:270,background:"white",border:"1px solid "+T.b1,borderRadius:8,boxShadow:"0 12px 32px rgba(0,0,0,0.18)",zIndex:201,overflow:"hidden"}}>
                    <div style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",borderBottom:"1px solid "+T.b1,background:T.surfaceB}}>
                      Choose billing mode
                    </div>
                    <div onClick={()=>{ setMsForm(p=>({...p,kind:"rate",wo_item_id:null})); setShowSetMs(true); setMsChooserOpen(false); }}
                      style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                      onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:T.t1}}>📋 Item-wise</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>Define billing stages per WO item (₹/unit)</div>
                    </div>
                    <div onClick={()=>{ setMsForm(p=>({...p,kind:"percent"})); setShowSetMs(true); setMsChooserOpen(false); }}
                      style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                      onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:T.t1}}>📊 % of WO Value</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>Define milestones as % of total WO value</div>
                    </div>
                    <div onClick={async()=>{ setMsChooserOpen(false); if(selWo.billing_method==="manual") return; if(!window.confirm("Switch to Manual mode?")) return; await switchBillingMethod("manual"); }}
                      style={{padding:"10px 12px",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#FAF5FF"} onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:T.t1}}>✍️ Manual (Cumulative)</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>No preset stages — bill cumulative qty per item</div>
                    </div>
                  </div>
                </>)}
              </div>
            </>)}
          </div>

          {/* Tab Content */}
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>
            {/* WORK ORDER TAB */}
            {subTab==="wo"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.t2}}>Retention: {selWo.retention_pct}% · TDS: {selWo.tds_pct}%</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:T.grnL,color:T.grn}}>Total: {fmtC(selWo.total_value)}</span>
                </div>
                {/* WO items table - load from API */}
                <WoItemsTable woId={selWo.id} fmtC={fmtC}/>
              </div>
            )}

            {/* PAYMENT SCHEDULE TAB */}
            {subTab==="schedule"&&(
              <div>
                {/* Manual billing message */}
                {(!selWo.billing_method || selWo.billing_method==="manual") && (
                  <div style={{padding:"24px",textAlign:"center",color:T.t3,background:T.surface,border:"1px dashed "+T.b1,borderRadius:8}}>
                    <div style={{fontSize:13,marginBottom:6}}>This WO uses <b>manual</b> billing (per-item cumulative qty).</div>
                    <div style={{fontSize:11.5,color:T.t4}}>Click <b>+ Set Schedule</b> to switch to milestone-based (item-wise rate or % of WO value).</div>
                  </div>
                )}

                {/* RATE-BASED milestones: Section → Item → Milestones */}
                {selWo.billing_method==="milestone_rate" && (() => {
                  // Build set of items that have milestones
                  const itemsWithMs = new Set(
                    Object.entries(woMilestones.rate_by_item || {})
                      .filter(([,ms]) => ms && ms.length)
                      .map(([id]) => parseInt(id))
                  );
                  if (!itemsWithMs.size) return (
                    <div style={{padding:"24px",textAlign:"center",color:T.t3,background:T.surface,border:"1px dashed "+T.b1,borderRadius:8}}>
                      <div style={{fontSize:12}}>No milestones set yet. Click <b>+ Set Schedule → Item-wise</b> to add stages.</div>
                    </div>
                  );

                  // Build itemId → item lookup from billing ledger
                  const ledgerItems = {};
                  if (billingLedger?.mode === "milestone_rate") {
                    for (const it of (billingLedger.items || [])) ledgerItems[it.item_id] = it;
                  }
                  const ledgerByMsId = {};
                  if (billingLedger?.mode === "milestone_rate") {
                    for (const it of (billingLedger.items || [])) {
                      for (const m of (it.milestones || [])) ledgerByMsId[m.milestone_id] = m;
                    }
                  }

                  // ── ITEM CARD (shared renderer) ──────────────────────────────
                  const renderItemCard = (item_id, ms) => {
                    const ledItem   = ledgerItems[item_id] || null;
                    const boqQty    = ledItem ? Number(ledItem.item_qty)       : 0;
                    const boqRate   = ledItem ? Number(ledItem.item_rate)      : (ms[0] ? Number(ms[0].cum_rate) : 0);
                    const boqValue  = boqQty * boqRate;
                    const billedQty = ledItem ? Number(ledItem.total_billed)   : 0;
                    const remainQty = ledItem ? Number(ledItem.total_remaining): boqQty;
                    const billedVal = billedQty * boqRate;
                    const remainVal = remainQty * boqRate;
                    const pctBilled = boqQty > 0 ? Math.min(100, billedQty / boqQty * 100) : 0;
                    const isFull    = pctBilled >= 99.99;
                    const itemDesc  = ledItem?.description || ("Item #" + item_id);
                    return (
                      <div key={item_id} style={{marginBottom:10,background:T.surface,border:"1px solid "+T.b1,borderRadius:8,overflow:"hidden"}}>
                        {/* Item header */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                          <div>
                            <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{itemDesc}</span>
                            {boqQty > 0 && <span style={{fontSize:10.5,color:T.t4,marginLeft:8}}>· {boqQty} {ledItem?.unit||""} @ {fmtC(boqRate)}/unit = {fmtC(boqValue)}</span>}
                          </div>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>{ setMsForm(p=>({...p,kind:"rate",wo_item_id:item_id})); setShowSetMs(true); }} title="Edit schedule"
                              style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:5,width:24,height:24,fontSize:11,cursor:"pointer",lineHeight:1}}>✎</button>
                            <button onClick={()=>deleteRateScheduleSub(item_id, itemDesc)} title="Delete"
                              style={{background:T.redL,border:"1px solid "+T.redM,color:T.red,borderRadius:5,width:24,height:24,fontSize:11,cursor:"pointer",lineHeight:1}}>🗑</button>
                          </div>
                        </div>
                        {/* Billed / Remaining progress */}
                        {ledItem && (
                          <div style={{padding:"8px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6}}>
                              {[
                                {l:"Total (WO)",v:`${boqQty} ${ledItem.unit||""}`,v2:fmtC(boqValue),  c:T.t1},
                                {l:"Billed",    v:`${billedQty} ${ledItem.unit||""}`,v2:fmtC(billedVal),c:billedQty>0?T.amb:T.t4},
                                {l:"Remaining", v:`${remainQty} ${ledItem.unit||""}`,v2:fmtC(remainVal),c:remainQty>0?T.grn:T.t4},
                              ].map(s=>(
                                <div key={s.l}>
                                  <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>{s.l}</div>
                                  <div style={{fontSize:12,fontWeight:700,color:s.c}}>{s.v}</div>
                                  <div style={{fontSize:10.5,color:s.c}}>{s.v2}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{flex:1,height:5,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                                <div style={{width:pctBilled+"%",height:"100%",background:isFull?T.amb:(pctBilled>=50?T.blu:T.grn),transition:"width .3s"}}/>
                              </div>
                              <span style={{fontSize:10.5,fontWeight:700,color:isFull?T.amb:T.t3,minWidth:42,textAlign:"right"}}>
                                {isFull ? "✓ FULL" : pctBilled.toFixed(0)+"%"}
                              </span>
                            </div>
                          </div>
                        )}
                        {/* Milestone rows */}
                        <div style={{padding:"0 14px 8px"}}>
                          <div style={{display:"grid",gridTemplateColumns:"26px 1fr 70px 80px 100px",gap:6,padding:"6px 0 4px",borderBottom:"1px solid "+T.b1}}>
                            {["#","Stage","Qty","Rate","Bill Value"].map((h,i)=>(
                              <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left"}}>{h}</span>
                            ))}
                          </div>
                          {ms.map(m=>{
                            const mLed    = ledgerByMsId[m.id] || null;
                            const mBill   = mLed ? Number(mLed.billed_qty)    : 0;
                            const mRem    = mLed ? Number(mLed.remaining_qty) : 0;
                            const mSt     = mLed?.status || "pending";
                            const linked  = linkedTasks[m.id];
                            const mQty    = boqQty;
                            const mRate   = Number(m.inc_rate) || 0;
                            const billVal = mQty * mRate;
                            return (
                              <div key={m.id} style={{padding:"5px 0",borderBottom:"1px solid "+T.b1}}>
                                <div style={{display:"grid",gridTemplateColumns:"26px 1fr 70px 80px 100px",gap:6,alignItems:"center"}}>
                                  <span style={{color:T.t4,fontSize:12}}>{(m.seq||0)+1}</span>
                                  <span style={{color:T.t1,fontWeight:600,fontSize:12}}>{m.name}</span>
                                  <span style={{color:T.t2,textAlign:"right",fontSize:11}}>{mQty}</span>
                                  <span style={{color:T.t2,textAlign:"right",fontSize:11}}>{fmtC(mRate)}</span>
                                  <span style={{color:T.grn,textAlign:"right",fontWeight:700,fontSize:11}}>{fmtC(billVal)}</span>
                                </div>
                                {mLed && mBill > 0 && (
                                  <div style={{paddingLeft:26,paddingTop:2,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                                    <span style={{padding:"1px 7px",fontSize:10,fontWeight:700,borderRadius:10,
                                      background:mSt==="fully_billed"?"#FEF3C7":T.grnL,
                                      color:mSt==="fully_billed"?"#92400E":T.grn,
                                      border:"1px solid "+(mSt==="fully_billed"?"#FCD34D":T.grnM)}}>
                                      {mSt==="fully_billed"?"✓ FULLY BILLED":"PARTIAL"}
                                    </span>
                                    <span style={{fontSize:10.5,color:T.t3}}>Billed <b style={{color:T.amb}}>{mBill}</b> = <b style={{color:T.amb}}>{fmtC(mBill*mRate)}</b></span>
                                    {mRem>0&&<span style={{fontSize:10.5,color:T.t3}}>· Remaining <b style={{color:T.grn}}>{mRem}</b> = <b style={{color:T.grn}}>{fmtC(mRem*mRate)}</b></span>}
                                  </div>
                                )}
                                <div style={{paddingLeft:26,paddingTop:4,paddingBottom:2,display:"flex",alignItems:"center",gap:8}}>
                                  {linked ? (<>
                                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:14,
                                      background:linked.eligible?"#DCFCE7":T.bluL,
                                      border:"1px solid "+(linked.eligible?"#86EFAC":T.bluM),
                                      fontSize:10.5,fontWeight:600,color:linked.eligible?"#15803D":T.blu}}>
                                      🔗 {linked.task_name}
                                      <span style={{color:linked.eligible?"#15803D":T.t3,fontWeight:500}}>· {linked.progress}% / trigger @ {linked.trigger_pct}%</span>
                                      {linked.eligible&&<span style={{fontSize:10}}>✓ ready to bill</span>}
                                    </span>
                                    <button onClick={()=>openTaskPickerSub(m.id)} style={{background:"none",border:"none",color:T.t3,fontSize:11,cursor:"pointer",padding:"0 4px"}}>✎</button>
                                    <button onClick={()=>unlinkTaskSub(m.id)} style={{background:"none",border:"none",color:T.red,fontSize:12,cursor:"pointer",padding:"0 4px"}}>×</button>
                                  </>) : (
                                    <button onClick={()=>openTaskPickerSub(m.id)}
                                      style={{background:"transparent",border:"1px dashed "+T.b1,color:T.t3,borderRadius:14,padding:"3px 10px",fontSize:10.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
                                      🔗 Link to task
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  // ── SECTION-GROUPED RENDER (mirrors Estimate hierarchy) ───────
                  // Build sections from selWo.sections (same structure WO detail returns)
                  const woSections = selWo.sections || [];
                  const woUnsectioned = (selWo.unsectioned || []).filter(it => itemsWithMs.has(it.id));

                  // Any section that has at least one item with milestones
                  const sectionsToRender = woSections
                    .map(sec => ({
                      ...sec,
                      _msItems: (sec.items || []).filter(it => itemsWithMs.has(it.id)),
                    }))
                    .filter(sec => sec._msItems.length > 0);

                  // If no sections structure (all unsectioned), fall back to flat render
                  if (!sectionsToRender.length && !woUnsectioned.length) {
                    // Fallback: render from rate_by_item map directly
                    return Object.entries(woMilestones.rate_by_item || {})
                      .filter(([,ms]) => ms && ms.length)
                      .map(([itemId, ms]) => renderItemCard(parseInt(itemId), ms));
                  }

                  return (<>
                    {sectionsToRender.map(sec => {
                      // Section-level totals from ledger
                      const secTotal = sec._msItems.reduce((s, it) => {
                        const l = ledgerItems[it.id];
                        return s + (l ? Number(l.item_qty) * Number(l.item_rate) : 0);
                      }, 0);
                      return (
                        <div key={sec.id || sec.title} style={{marginBottom:16}}>
                          {/* Section header — blue, same as Estimate */}
                          <div style={{
                            padding:"8px 14px",
                            background:"#1E3A5F",
                            borderRadius:"6px 6px 0 0",
                            display:"flex",justifyContent:"space-between",alignItems:"center",
                            marginBottom:0,
                          }}>
                            <span style={{fontSize:12,fontWeight:700,color:"white",textTransform:"uppercase",letterSpacing:".5px"}}>
                              {sec.title}
                            </span>
                            {secTotal > 0 && (
                              <span style={{fontSize:12,fontWeight:700,color:"#93C5FD"}}>{fmtC(secTotal)}</span>
                            )}
                          </div>
                          {/* Items in this section */}
                          <div style={{border:"1px solid #BFDBFE",borderTop:"none",borderRadius:"0 0 6px 6px",overflow:"hidden",padding:"10px 10px 4px"}}>
                            {sec._msItems.map(it => {
                              const ms = woMilestones.rate_by_item[it.id] || [];
                              return renderItemCard(it.id, ms);
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {/* Unsectioned items */}
                    {woUnsectioned.length > 0 && (
                      <div style={{marginBottom:16}}>
                        <div style={{padding:"8px 14px",background:T.slt,borderRadius:"6px 6px 0 0",display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:12,fontWeight:700,color:"white",textTransform:"uppercase",letterSpacing:".5px"}}>Other Items</span>
                        </div>
                        <div style={{border:"1px solid "+T.b1,borderTop:"none",borderRadius:"0 0 6px 6px",padding:"10px 10px 4px"}}>
                          {woUnsectioned.map(it => renderItemCard(it.id, woMilestones.rate_by_item[it.id]||[]))}
                        </div>
                      </div>
                    )}
                  </>);
                })()}

                {/* PERCENT milestones */}
                {selWo.billing_method==="milestone_percent" && (
                  <div style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>Payment Milestones (% of WO value)</div>
                      {woMilestones.percent.length > 0 && (
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={()=>{ setMsForm(p=>({...p,kind:"percent"})); setShowSetMs(true); }} title="Edit"
                            style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:5,width:26,height:26,fontSize:12,cursor:"pointer",lineHeight:1}}>✎</button>
                          <button onClick={deletePercentScheduleSub} title="Delete"
                            style={{background:T.redL,border:"1px solid "+T.redM,color:T.red,borderRadius:5,width:26,height:26,fontSize:12,cursor:"pointer",lineHeight:1}}>🗑</button>
                        </div>
                      )}
                    </div>
                    {woMilestones.percent.length === 0 && <div style={{fontSize:11.5,color:T.t4,fontStyle:"italic"}}>No milestones set. Use + Set Schedule.</div>}
                    {woMilestones.percent.length > 0 && (
                      <div style={{display:"grid",gridTemplateColumns:"30px 1fr 80px 130px",gap:6,padding:"4px 0",borderBottom:"1px solid "+T.b1,marginBottom:4}}>
                        {["#","Milestone","%","Amount"].map(h=><span key={h} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                      </div>
                    )}
                    {woMilestones.percent.map(m=>{
                      const mLed = billingLedger?.mode==="milestone_percent"
                        ? (billingLedger.stages||[]).find(s=>s.milestone_id===m.id) : null;
                      const billAmt = mLed ? Number(mLed.billed_amount) : 0;
                      const remAmt  = mLed ? Number(mLed.remaining_amount) : Number(m.amount)||0;
                      const mSt     = mLed?.status || "pending";
                      return (
                        <div key={m.id} style={{padding:"6px 0",borderBottom:"1px solid "+T.b1}}>
                          <div style={{display:"grid",gridTemplateColumns:"30px 1fr 80px 130px",gap:6,fontSize:12,alignItems:"center"}}>
                            <span style={{color:T.t4}}>{(m.seq||0)+1}</span>
                            <span style={{color:T.t1}}>{m.name}</span>
                            <span style={{color:T.t2,textAlign:"right",paddingRight:8}}>{parseFloat(m.pct)}%</span>
                            <span style={{color:T.grn,textAlign:"right",fontWeight:600}}>{fmtC(m.amount)}</span>
                          </div>
                          {mLed && billAmt > 0 && (
                            <div style={{paddingLeft:30,paddingTop:2,display:"flex",gap:8,alignItems:"center"}}>
                              <span style={{padding:"1px 7px",fontSize:10,fontWeight:700,borderRadius:10,
                                background:mSt==="fully_billed"?"#FEF3C7":T.grnL,
                                color:mSt==="fully_billed"?"#92400E":T.grn,
                                border:"1px solid "+(mSt==="fully_billed"?"#FCD34D":T.grnM)}}>
                                {mSt==="fully_billed"?"✓ FULLY BILLED":"PARTIAL"}
                              </span>
                              <span style={{fontSize:10.5,color:T.t3}}>Billed <b style={{color:T.amb}}>{fmtC(billAmt)}</b>{remAmt>0 && <> · Remaining <b style={{color:T.grn}}>{fmtC(remAmt)}</b></>}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* RA BILLS TAB */}
            {subTab==="bills"&&(
              <div>
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginBottom:12}}>
                  <button onClick={()=>{setManualBillForm({bill_date:localYMD(),remark:"",items:[{description:"",qty:"",rate:""}]});setShowManualRaBill(true);}}
                    style={{background:"white",color:"#7C3AED",border:"2px dashed #7C3AED",borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    📝 Manual Bill
                  </button>
                  <button onClick={()=>setShowNewBill(true)}
                    style={{background:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    + New RA Bill
                  </button>
                </div>
                {bills.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No bills raised yet</div>}
                {bills.map(b=>{
                  const stC=b.status==="Paid"?T.grn:b.status==="Approved"?T.blu:b.status==="Submitted"?T.amb:b.status==="Draft"?"#7C3AED":T.t4;
                  const isAutoDraft = b.source==="auto" && b.status==="Draft";
                  return(
                    <div key={b.id} style={{background:T.surface,border:isAutoDraft?"1.5px solid #C4B5FD":"1px solid "+T.b1,borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+stC}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{b.bill_no}</span>
                          {b.source==="auto" && <span style={{fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#EDE9FE",color:"#6D28D9",border:"1px solid #C4B5FD"}}>🤖 AUTO</span>}
                          {b.source==="free_form" && <span style={{fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#F3E8FF",color:"#7C3AED",border:"1px solid #C4B5FD"}}>📝 MANUAL</span>}
                          {b.over_bill_mode==1 && <span title={b.over_bill_reason||"Over-bill RA bill"} style={{fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#FEE2E2",color:"#991B1B",border:"1px solid #FCA5A5"}}>🔴 OVER-BILL</span>}
                          <span style={{fontSize:10.5,color:T.t4}}>{b.bill_date?new Date(b.bill_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</span>
                        </div>
                        <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stC+"22",color:stC}}>{b.status}</span>
                      </div>
                      {isAutoDraft && (
                        <div style={{padding:"7px 10px",background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:6,marginBottom:8,fontSize:11,color:"#5B21B6",lineHeight:1.45}}>
                          ⏳ Auto-generated from task progress. Review and confirm before submitting.
                        </div>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
                        {[{l:"Gross",v:fmtC(b.gross_amount),c:T.t1},{l:"Retention",v:fmtC(b.retention_amt),c:T.amb},{l:"TDS",v:fmtC(b.tds_amt),c:T.red},{l:"Net Payable",v:fmtC(b.net_payable),c:T.grn}].map(s=>(
                          <div key={s.l} style={{textAlign:"center",background:T.surfaceB,borderRadius:6,padding:"6px 8px"}}>
                            <div style={{fontSize:9,color:T.t4,textTransform:"uppercase"}}>{s.l}</div>
                            <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                        {b.status==="Draft"&&<button onClick={async()=>{await api.patch("/subcon/ra-bills/"+b.id+"/status",{status:"Submitted"});selectWo(selWo);}} style={{flex:1,minWidth:100,padding:"6px",borderRadius:5,background:T.blu,color:"white",border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Confirm & Submit</button>}
                        {b.status==="Submitted"&&<button onClick={async()=>{await api.patch("/subcon/ra-bills/"+b.id+"/status",{status:"Approved"});selectWo(selWo);}} style={{flex:1,minWidth:100,padding:"6px",borderRadius:5,background:T.blu,color:"white",border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Approve</button>}
                        {(b.status==="Approved"||b.status==="Submitted")&&<button onClick={()=>{setShowPayModal(b.id);}} style={{flex:1,minWidth:100,padding:"6px",borderRadius:5,background:T.grn,color:"white",border:"none",fontSize:11,fontWeight:700,cursor:"pointer"}}>₹ Record Payment</button>}
                        {/* Edit + Delete (not for Paid) */}
                        {b.status!=="Paid"&&(
                          <button onClick={async()=>{
                              // Load bill items for editing
                              const r = await api.get("/subcon/ra-bills/"+b.id);
                              if(r.success){
                                setEditBill({...r.data, _itemsLoaded:true});
                                setShowEditBillModal(true);
                              }
                            }}
                            style={{padding:"6px 12px",borderRadius:5,background:T.bluL,color:T.blu,border:`1px solid ${T.bluM}`,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            ✏️ Edit
                          </button>
                        )}
                        {b.status!=="Paid"&&(
                          <button onClick={async()=>{
                              if(!await window.confirmAsync(`Delete ${b.bill_no}? This will permanently remove the bill.`)) return;
                              const res = await api.del("/subcon/ra-bills/"+b.id);
                              if(res.success){
                                selectWo(selWo); // reload bills
                              } else {
                                alert(res.message || "Delete failed");
                              }
                            }}
                            style={{padding:"6px 12px",borderRadius:5,background:T.redL,color:T.red,border:`1px solid ${T.redM}`,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            🗑 Delete
                          </button>
                        )}
                      </div>

                      {/* View Item Detail — opens a side slide drawer */}
                      <button
                        onClick={async()=>{
                          setExpandedBill(b.id);
                          if(!billItems[b.id]){
                            const r = await api.get("/subcon/ra-bills/"+b.id);
                            if(r.success) setBillItems(p=>({...p,[b.id]:r.data.items||[]}));
                          }
                        }}
                        style={{background:"none",border:"none",color:T.blu,fontSize:11,fontWeight:600,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:4}}
                      >
                        <span style={{fontSize:11}}>›</span>
                        View Item Detail
                      </button>
                    </div>
                  );
                })}

                {/* ── Item Detail SIDE SLIDE drawer ────────────────── */}
                {expandedBill && (() => {
                  const b = bills.find(x=>x.id===expandedBill);
                  if (!b) return null;
                  const items = billItems[expandedBill];
                  const stC = b.status==="Paid"?T.grn:b.status==="Approved"?T.blu:b.status==="Submitted"?T.amb:T.t4;
                  return (<>
                    <div onClick={()=>setExpandedBill(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:310,backdropFilter:"blur(2px)"}}/>
                    <div style={{position:"fixed",right:0,top:0,bottom:0,width:580,maxWidth:"95vw",background:T.bg,zIndex:311,boxShadow:"-6px 0 36px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"slideInRight .18s ease-out"}}>
                      {/* Header */}
                      <div style={{background:"#0891B2",padding:"14px 18px",flexShrink:0,color:"white"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,opacity:0.7,textTransform:"uppercase",letterSpacing:"0.5px"}}>RA Bill · Item Detail</div>
                            <div style={{fontSize:17,fontWeight:700,marginTop:2}}>{b.bill_no}</div>
                          </div>
                          <button onClick={()=>setExpandedBill(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",color:"white",padding:"6px 9px",borderRadius:6,fontSize:13,fontWeight:700}}>✕</button>
                        </div>
                        <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11.5,opacity:0.9}}>
                          {b.bill_date && <span>{new Date(b.bill_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>}
                          <span style={{marginLeft:"auto",background:stC+"33",border:`1px solid ${stC}55`,padding:"2px 9px",borderRadius:12,fontSize:10,fontWeight:700,color:"white"}}>{b.status}</span>
                        </div>
                      </div>
                      {/* Body */}
                      <div style={{flex:1,overflowY:"auto",padding:14}}>
                        {/* KPI tiles */}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
                          {[
                            {l:"Gross",       v:fmtC(b.gross_amount),  c:T.t1},
                            {l:"Retention",   v:fmtC(b.retention_amt), c:T.amb},
                            {l:"TDS",         v:fmtC(b.tds_amt),       c:T.red},
                            {l:"Net Payable", v:fmtC(b.net_payable),   c:T.grn},
                          ].map(s=>(
                            <div key={s.l} style={{textAlign:"center",background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,padding:"10px 8px"}}>
                              <div style={{fontSize:9,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>{s.l}</div>
                              <div style={{fontSize:13.5,fontWeight:800,color:s.c}}>{s.v}</div>
                            </div>
                          ))}
                        </div>
                        {/* Over-bill banner — shown when this RA bill has over_bill_mode=1 */}
                        {b.over_bill_mode==1 && (
                          <div style={{margin:"0 0 12px",padding:"12px 14px",borderRadius:8,background:"#FEF2F2",border:"1px solid #FCA5A5"}}>
                            <div style={{fontSize:12,fontWeight:800,color:"#991B1B",letterSpacing:".3px",textTransform:"uppercase",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                              🔴 OVER-BILL RA BILL
                            </div>
                            <div style={{fontSize:11.5,color:"#7F1D1D",lineHeight:1.5}}>
                              <b>Reason:</b> {b.over_bill_reason || "(no reason recorded)"}
                            </div>
                            <div style={{fontSize:10,color:"#991B1B",marginTop:6,fontStyle:"italic"}}>
                              Quantities in this bill exceed the Work Order scope. Approved by project admin.
                            </div>
                          </div>
                        )}
                        {/* Items table */}
                        <div style={{background:T.surface,border:`1px solid ${T.b1}`,borderRadius:8,overflow:"hidden"}}>
                          <div style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",background:"#1E293B",padding:"7px 10px",gap:6}}>
                            {["Description","Unit","WO Qty","Prev Cum","This Bill","Rate","Amount"].map((h,i)=>(
                              <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.55)",textAlign:i>1?"right":"left",textTransform:"uppercase"}}>{h}</div>
                            ))}
                          </div>
                          {!items && (
                            <div style={{textAlign:"center",padding:"30px 0",color:T.t4,fontSize:12}}>
                              <div style={{width:22,height:22,border:"2px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 8px"}}/>
                              Loading…
                            </div>
                          )}
                          {items && items.length===0 && (
                            <div style={{textAlign:"center",padding:"22px 0",color:T.t4,fontSize:12}}>No item breakdown</div>
                          )}
                          {(items||[]).map(it=>{
                            const isFree = !it.wo_item_id;
                            return (
                            <div key={it.id} style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",padding:"8px 10px",gap:6,borderTop:`1px solid ${T.b1}`,alignItems:"center"}}>
                              <div style={{fontSize:11.5,color:T.t1}}>{it.description}</div>
                              <div style={{fontSize:11,color:T.t3}}>{it.unit||""}</div>
                              <div style={{fontSize:11,color:T.t2,textAlign:"right"}}>{isFree?"—":parseFloat(it.wo_qty||0)}</div>
                              <div style={{fontSize:11,color:T.t3,textAlign:"right"}}>{isFree?"—":parseFloat(it.prev_cumulative||0)>0?parseFloat(it.prev_cumulative||0):"—"}</div>
                              <div style={{fontSize:11,fontWeight:700,color:T.t1,textAlign:"right"}}>{parseFloat(it.this_bill_qty||0)}</div>
                              <div style={{fontSize:11,color:T.blu,textAlign:"right",fontWeight:600}}>₹{parseFloat(it.rate||0).toLocaleString("en-IN")}</div>
                              <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtC(it.this_bill_amount)}</div>
                            </div>
                            );
                          })}
                          {items && items.length>0 && (
                            <div style={{display:"grid",gridTemplateColumns:"2fr 50px 64px 64px 64px 70px 80px",padding:"9px 10px",gap:6,background:T.surfaceB,borderTop:`1.5px solid ${T.b2}`}}>
                              <div style={{fontSize:11.5,fontWeight:700,color:T.t1,gridColumn:"1/7"}}>Total</div>
                              <div style={{fontSize:12.5,fontWeight:800,color:T.grn,textAlign:"right"}}>{fmtC(b.gross_amount)}</div>
                            </div>
                          )}
                        </div>
                        {b.remark && (
                          <div style={{marginTop:14,padding:"10px 12px",background:T.bluL,border:`1px solid ${T.bluM}`,borderRadius:7,fontSize:12,color:T.t2}}>
                            <div style={{fontSize:9.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>Remarks</div>
                            {b.remark}
                          </div>
                        )}
                      </div>
                    </div>
                    <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
                  </>);
                })()}
              </div>
            )}

            {/* PAYMENTS TAB */}
            {subTab==="pay"&&(
              <PaymentsTab woId={selWo.id} fmtC={fmtC}/>
            )}

            {/* AMENDMENTS TAB */}
            {subTab==="amend"&&(
              <AmendmentsTab amendments={amendments} fmtC={fmtC} onRefresh={()=>selectWo(selWo)}/>
            )}
          </div>
        </>)}
      </div>

      {/* EDIT WO MODAL */}
      {showEditWO&&selWo&&(
        <EditWOModal
          wo={selWo} subcons={subcons} fmtC={fmtC}
          inpStyle={inpStyle} lblStyle={lblStyle}
          onClose={()=>setShowEditWO(false)}
          onSaved={()=>{ setShowEditWO(false); loadWOs(); selectWo(selWo); }}
        />
      )}

      {/* ── PAYMENT SCHEDULE SETUP MODAL ─────────────────────────────────
          Mirrors Estimate's "Payment Schedule Setup" exactly.
          Item-wise: multi-item picker from WO items + per-item cum_rate stages.
          % of WO Value: quick presets + distribute-remaining, identical to Estimate.
      */}
      {showSetMs && selWo && (() => {
        // Flatten all WO items for the picker
        const allWoItems = [
          ...(selWo.sections||[]).flatMap(sec => (sec.items||[]).map(it => ({ ...it, _sectionTitle: sec.title }))),
          ...(selWo.unsectioned||[]).map(it => ({ ...it, _sectionTitle: "" })),
        ];

        // ── Item-wise helpers ──
        const patchItemStages = (itemId, updater) => {
          setMsForm(p => {
            const cur = p.itemStages[itemId] || [{ seq:0, name:"", cum_rate:"" }];
            return { ...p, itemStages: { ...p.itemStages, [itemId]: updater(cur) } };
          });
        };
        const removePicked = (itemId) => {
          setMsForm(p => ({
            ...p,
            pickedItemIds: p.pickedItemIds.filter(id => id !== itemId),
            itemStages: Object.fromEntries(Object.entries(p.itemStages).filter(([k]) => parseInt(k) !== itemId)),
            expandedItemId: p.expandedItemId === itemId ? null : p.expandedItemId,
          }));
        };

        // ── % helpers ──
        const woValue = parseFloat(selWo.total_value) || 0;
        const pctSum = msForm.pctMs.reduce((s, m) => s + (parseFloat(m.pct) || 0), 0);
        const remaining = +(100 - pctSum).toFixed(2);
        const sumOk = Math.abs(pctSum - 100) < 0.01;
        const applyPreset = (splits, names) => setMsForm(p => ({
          ...p, pctMs: splits.map((pct, i) => ({ seq:i, name: names[i]||("Milestone "+(i+1)), pct: String(pct) }))
        }));
        const distributeRemaining = () => {
          if (Math.abs(remaining) < 0.01) return;
          const blanks = msForm.pctMs.filter(m => !parseFloat(m.pct)).length;
          setMsForm(p => {
            const arr = [...p.pctMs];
            if (blanks > 0) {
              const each = +(remaining / blanks).toFixed(2);
              return { ...p, pctMs: arr.map(m => parseFloat(m.pct) ? m : { ...m, pct: String(each) }) };
            }
            if (!arr.length) return p;
            const last = arr[arr.length-1];
            arr[arr.length-1] = { ...last, pct: String(+(parseFloat(last.pct||0) + remaining).toFixed(2)) };
            return { ...p, pctMs: arr };
          });
        };

        return (<>
          <div onClick={()=>setShowSetMs(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:640,maxWidth:"95vw",maxHeight:"90vh",background:T.surface,borderRadius:12,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:15,fontWeight:700,color:T.t1}}>Payment Schedule Setup</div>
              <button onClick={()=>setShowSetMs(false)} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
            </div>
            {/* Body */}
            <div style={{padding:"16px 18px",overflowY:"auto",flex:1}}>
              {/* Mode tabs */}
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <button onClick={()=>setMsForm(p=>({...p,kind:"rate"}))}
                  style={{padding:"7px 14px",borderRadius:6,background:msForm.kind==="rate"?T.blu:T.surfaceB,color:msForm.kind==="rate"?"white":T.t2,border:"1px solid "+(msForm.kind==="rate"?T.blu:T.b1),fontSize:12,fontWeight:700,cursor:"pointer"}}>📋 Item-wise</button>
                <button onClick={()=>setMsForm(p=>({...p,kind:"percent"}))}
                  style={{padding:"7px 14px",borderRadius:6,background:msForm.kind==="percent"?T.blu:T.surfaceB,color:msForm.kind==="percent"?"white":T.t2,border:"1px solid "+(msForm.kind==="percent"?T.blu:T.b1),fontSize:12,fontWeight:700,cursor:"pointer"}}>📊 % of WO Value</button>
              </div>

              {/* ── ITEM-WISE MODE ── */}
              {msForm.kind === "rate" && (() => {
                const pickedItems = (msForm.pickedItemIds||[]).map(id => allWoItems.find(x => x.id === id)).filter(Boolean);
                return (<>
                  {pickedItems.length === 0 ? (
                    <div style={{padding:"22px 16px",background:T.surfaceB,border:"1.5px dashed "+T.b1,borderRadius:8,textAlign:"center",marginBottom:12}}>
                      <div style={{fontSize:12.5,color:T.t3,marginBottom:8}}>No items picked yet</div>
                      <button onClick={()=>{ setWoItemPickerSearch(""); setWoItemPickerOpen(true); }}
                        style={{background:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                        📋 Pick Items from WO
                      </button>
                    </div>
                  ) : (
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8}}>
                        <span style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px"}}>
                          Picked Items ({pickedItems.length})
                        </span>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{
                              setMsForm(p => {
                                const next = { ...p.itemStages };
                                for (const itm of pickedItems) {
                                  next[itm.id] = [{ seq:0, name:"Complete", cum_rate: String(parseFloat(itm.rate)||0) }];
                                }
                                return { ...p, itemStages: next };
                              });
                            }}
                            title="Each item → 1 milestone at full rate"
                            style={{background:"#FEF3C7",color:"#92400E",border:"1px dashed #FCD34D",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            ✓ All = 1 milestone each
                          </button>
                          <button onClick={()=>{ setWoItemPickerSearch(""); setWoItemPickerOpen(true); }}
                            style={{background:T.bluL,color:T.blu,border:"1px solid "+T.bluM,borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                            + Pick More
                          </button>
                        </div>
                      </div>

                      {pickedItems.map((it, idx) => {
                        const stages   = msForm.itemStages[it.id] || [{ seq:0, name:"", cum_rate:"" }];
                        const expanded = msForm.expandedItemId === it.id;
                        const filledCount = stages.filter(s => s.name && s.cum_rate).length;
                        const itemRate  = parseFloat(it.rate) || 0;
                        const itemQty   = parseFloat(it.qty)  || 0;
                        const itemTotal = itemRate * itemQty;
                        const lastCum   = parseFloat(stages[stages.length-1]?.cum_rate) || 0;
                        const balanced  = stages.length > 0 && Math.abs(lastCum - itemRate) <= 0.01;

                        return (
                          <div key={it.id} style={{border:"1px solid "+T.b1,borderRadius:7,marginBottom:6,overflow:"hidden",background:"white"}}>
                            {/* Accordion header */}
                            <div onClick={()=>setMsForm(p=>({...p,expandedItemId: expanded ? null : it.id}))}
                              style={{padding:"8px 12px",background: expanded ? T.bluL : T.surfaceB,borderBottom: expanded ? "1px solid "+T.bluM : "none",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                              <span style={{width:20,height:20,borderRadius:"50%",background:T.blu,color:"white",fontSize:10.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{idx+1}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description}</div>
                                <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                                  Item rate <b style={{color:T.t2}}>₹{itemRate}/unit</b> × {itemQty} {it.unit||""} = <b style={{color:T.t2}}>{fmtC(itemTotal)}</b>
                                  {filledCount > 0 && <span style={{color:T.grn,marginLeft:6,fontWeight:600}}>· {filledCount} stage{filledCount>1?"s":""}</span>}
                                  {filledCount > 0 && balanced && <span style={{color:T.grn,marginLeft:6,fontWeight:600}}>✓ balanced</span>}
                                </div>
                              </div>
                              <button onClick={(e)=>{ e.stopPropagation(); removePicked(it.id); }}
                                style={{background:T.redL,color:T.red,border:"none",borderRadius:4,width:22,height:22,fontSize:13,cursor:"pointer"}}>×</button>
                              <span style={{fontSize:10,color:T.t4}}>{expanded ? "▴" : "▾"}</span>
                            </div>

                            {expanded && (
                              <div style={{padding:"10px 12px"}}>
                                <div style={{display:"grid",gridTemplateColumns:"30px 1fr 130px 100px 30px",gap:6,marginBottom:4}}>
                                  {["#","Stage Name","Cum Rate ₹/unit","Stage Value",""].map((h,i)=>(
                                    <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left"}}>{h}</span>
                                  ))}
                                </div>
                                {stages.map((m, mi) => {
                                  const prevCum = mi > 0 ? (parseFloat(stages[mi-1]?.cum_rate)||0) : 0;
                                  const incRate = (parseFloat(m.cum_rate)||0) - prevCum;
                                  const stageVal = incRate * itemQty;
                                  return (
                                    <div key={mi} style={{display:"grid",gridTemplateColumns:"30px 1fr 130px 100px 30px",gap:6,marginBottom:4,alignItems:"center"}}>
                                      <span style={{fontSize:11,color:T.t4}}>{mi+1}</span>
                                      <input value={m.name}
                                        onChange={e=>patchItemStages(it.id, arr=>{ const n=[...arr]; n[mi]={...n[mi],name:e.target.value}; return n; })}
                                        placeholder="e.g. Footing" style={{...inpStyle,padding:"5px 8px",fontSize:11.5}}/>
                                      <input type="number" value={m.cum_rate||""}
                                        onChange={e=>patchItemStages(it.id, arr=>{ const n=[...arr]; n[mi]={...n[mi],cum_rate:e.target.value}; return n; })}
                                        placeholder={"₹/unit (cum)"} style={{...inpStyle,padding:"5px 8px",fontSize:11.5,textAlign:"right"}}/>
                                      <span style={{fontSize:11.5,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{stageVal>0?fmtC(stageVal):"—"}</span>
                                      <button onClick={()=>patchItemStages(it.id, arr=>{ const n=arr.filter((_,i)=>i!==mi); return n.length?n:[{seq:0,name:"",cum_rate:""}]; })}
                                        style={{background:T.redL,color:T.red,border:"none",borderRadius:4,fontSize:13,cursor:"pointer"}}>×</button>
                                    </div>
                                  );
                                })}
                                {/* Live allocation bar */}
                                <div style={{marginTop:6,padding:"7px 10px",borderRadius:6,
                                  background:balanced?"#ECFDF5":T.surfaceB,
                                  border:"1px solid "+(balanced?T.grnM:T.b1),
                                  display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                                  <span style={{color:balanced?"#065F46":T.t3,fontWeight:600}}>
                                    Last cum_rate: {fmtC(lastCum)} / {fmtC(itemRate)}
                                  </span>
                                  <span style={{fontWeight:700,color:balanced?T.grn:T.amb}}>
                                    {balanced ? "✓ Matches item rate" : `Diff: ${fmtC(Math.abs(lastCum - itemRate))}`}
                                  </span>
                                </div>
                                <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                                  <button onClick={()=>patchItemStages(it.id, arr=>[...arr, {seq:arr.length, name:"", cum_rate:""}])}
                                    style={{background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:4,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                                    + Add Stage
                                  </button>
                                  <button onClick={()=>patchItemStages(it.id, ()=>[{seq:0,name:"Complete",cum_rate:String(itemRate)}])}
                                    style={{background:"#FEF3C7",color:"#92400E",border:"1px dashed #FCD34D",borderRadius:4,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                                    ✓ Use whole item as 1 milestone
                                  </button>
                                  {templates.length > 0 && (
                                    <select onChange={async e=>{
                                        const tid = parseInt(e.target.value); if (!tid) return;
                                        e.target.value = "";
                                        await applyTemplateToItem(it.id, tid);
                                        setShowSetMs(false);
                                      }}
                                      style={{padding:"4px 8px",fontSize:10.5,borderRadius:4,border:"1px solid "+T.b1,background:"white",cursor:"pointer",color:T.t3}}>
                                      <option value="">Apply template…</option>
                                      {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>);
              })()}

              {/* ── % OF WO VALUE MODE ── (exact copy of Estimate) */}
              {msForm.kind === "percent" && (<>
                <div style={{padding:"7px 10px",background:T.surfaceB,borderRadius:6,fontSize:11,color:T.t3,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                  <span>WO value</span>
                  <span style={{fontWeight:700,color:T.t1}}>{fmtC(woValue)}</span>
                </div>
                {/* Quick presets */}
                <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>Quick:</span>
                  {[
                    { label:"30 / 40 / 30",      splits:[30,40,30],     names:["Advance","On Progress","On Handover"] },
                    { label:"40 / 30 / 20 / 10", splits:[40,30,20,10],  names:["Booking","Slab","Finishing","Handover"] },
                    { label:"25 / 25 / 25 / 25", splits:[25,25,25,25],  names:["Stage 1","Stage 2","Stage 3","Stage 4"] },
                    { label:"50 / 50",            splits:[50,50],        names:["Advance","Completion"] },
                  ].map(p=>(
                    <button key={p.label} onClick={()=>applyPreset(p.splits,p.names)}
                      style={{background:"white",color:T.blu,border:"1px solid "+T.bluM,borderRadius:14,padding:"3px 9px",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Table header */}
                <div style={{display:"grid",gridTemplateColumns:"40px 1fr 80px 120px 32px",gap:6,marginBottom:6}}>
                  {["#","Milestone Name","%","₹ amount",""].map(h=><span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                </div>
                {msForm.pctMs.map((m, mi) => {
                  const pctVal = parseFloat(m.pct) || 0;
                  const amt    = (woValue * pctVal) / 100;
                  return (
                    <div key={mi} style={{display:"grid",gridTemplateColumns:"40px 1fr 80px 120px 32px",gap:6,marginBottom:4,alignItems:"center"}}>
                      <span style={{fontSize:12,color:T.t4,paddingTop:8}}>{mi+1}</span>
                      <input value={m.name} onChange={e=>{const arr=[...msForm.pctMs];arr[mi]={...arr[mi],name:e.target.value};setMsForm(p=>({...p,pctMs:arr}));}} placeholder="e.g. Foundation" style={inpStyle}/>
                      <input type="number" value={m.pct} onChange={e=>{const arr=[...msForm.pctMs];arr[mi]={...arr[mi],pct:e.target.value};setMsForm(p=>({...p,pctMs:arr}));}} placeholder="%" style={{...inpStyle,textAlign:"right"}}/>
                      <span style={{padding:"7px 10px",background:T.surfaceB,borderRadius:6,fontSize:12,fontWeight:600,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(amt)}</span>
                      <button onClick={()=>{const arr=msForm.pctMs.filter((_,i)=>i!==mi);setMsForm(p=>({...p,pctMs:arr.length?arr:[{seq:0,name:"",pct:""}]}));}} style={{background:T.redL,color:T.red,border:"none",borderRadius:5,fontSize:14,cursor:"pointer"}}>×</button>
                    </div>
                  );
                })}
                <button onClick={()=>setMsForm(p=>({...p,pctMs:[...p.pctMs,{seq:p.pctMs.length,name:"",pct:""}]}))} style={{marginTop:6,background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Milestone</button>
                {/* Live total row */}
                <div style={{marginTop:12,padding:"9px 12px",borderRadius:7,
                  background: sumOk ? T.grnL : "#FFFBEB",
                  border:"1px solid "+(sumOk ? T.grnM : "#FCD34D"),
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11.5,fontWeight:700,color:sumOk?T.grn:"#92400E"}}>
                    {sumOk ? "✓ Total 100% — schedule covers full WO value"
                          : `Total ${pctSum.toFixed(2)}% — ${remaining>0?remaining.toFixed(2)+"% remaining":Math.abs(remaining).toFixed(2)+"% over"}`}
                  </span>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:sumOk?T.grn:"#92400E",fontVariantNumeric:"tabular-nums"}}>{fmtC(woValue*pctSum/100)}</span>
                    {!sumOk && Math.abs(remaining)>0.01 && (
                      <button onClick={distributeRemaining}
                        style={{background:"#FEF3C7",border:"1px solid #FCD34D",color:"#92400E",borderRadius:5,padding:"3px 9px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                        {remaining>0?"↻ Distribute remaining":"↻ Trim excess"}
                      </button>
                    )}
                  </div>
                </div>
              </>)}
            </div>

            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setShowSetMs(false)} style={{padding:"7px 16px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={submitMilestones} disabled={saving} style={{padding:"7px 18px",borderRadius:6,background:saving?T.t4:T.blu,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:saving?"default":"pointer"}}>{saving?"Saving…":"Save Schedule"}</button>
            </div>
          </div>
        </>);
      })()}

      {/* ── WO ITEM PICKER SIDE-SLIDE ────────────────────────────────────── */}
      {woItemPickerOpen && selWo && (() => {
        const q = woItemPickerSearch.trim().toLowerCase();
        const sections = (selWo.sections||[]).map(sec => {
          const items = (sec.items||[]).filter(it =>
            !q || (it.description||"").toLowerCase().includes(q)
          );
          return { title: sec.title, items };
        }).filter(s => s.items.length > 0);
        const unsect = (selWo.unsectioned||[]).filter(it =>
          !q || (it.description||"").toLowerCase().includes(q)
        );
        const totalFiltered = sections.reduce((n,s)=>n+s.items.length,0) + unsect.length;
        const togglePick = (itemId) => {
          setMsForm(p => {
            const isPicked = p.pickedItemIds.includes(itemId);
            if (isPicked) {
              return {
                ...p,
                pickedItemIds: p.pickedItemIds.filter(id => id !== itemId),
                itemStages: Object.fromEntries(Object.entries(p.itemStages).filter(([k])=>parseInt(k)!==itemId)),
              };
            }
            return {
              ...p,
              pickedItemIds: [...p.pickedItemIds, itemId],
              itemStages: { ...p.itemStages, [itemId]: p.itemStages[itemId] || [{ seq:0, name:"", cum_rate:"" }] },
              expandedItemId: p.expandedItemId || itemId,
            };
          });
        };
        const renderItem = (it) => {
          const pickIdx = msForm.pickedItemIds.indexOf(it.id);
          const isPicked = pickIdx >= 0;
          return (
            <div key={it.id} onClick={()=>togglePick(it.id)}
              style={{padding:"8px 18px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:isPicked?"#EFF6FF":"white"}}
              onMouseEnter={e=>{ if(!isPicked) e.currentTarget.style.background="#F8FAFC"; }}
              onMouseLeave={e=>{ if(!isPicked) e.currentTarget.style.background="white"; }}>
              {isPicked ? (
                <span style={{width:22,height:22,borderRadius:"50%",background:T.blu,color:"white",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {pickIdx+1}
                </span>
              ) : (
                <span style={{width:22,height:22,borderRadius:4,border:"1.5px solid "+T.b1,flexShrink:0}}/>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description}</div>
                <div style={{fontSize:10,color:T.t4,marginTop:1}}>{fmtC(it.rate)}/{it.unit} · qty {parseFloat(it.qty)||0}</div>
              </div>
            </div>
          );
        };
        return (<>
          <div onClick={()=>setWoItemPickerOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:320}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:420,maxWidth:"95vw",background:"white",boxShadow:"-8px 0 24px rgba(0,0,0,0.2)",zIndex:321,display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",background:T.t1,color:"white",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:700}}>Pick Items for Schedule</div>
                <button onClick={()=>setWoItemPickerOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.65)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)"}}>
                {totalFiltered} item{totalFiltered===1?"":"s"}
                {(msForm.pickedItemIds||[]).length > 0 && <> · <span style={{color:"#FCD34D",fontWeight:600}}>{msForm.pickedItemIds.length} picked</span></>}
              </div>
            </div>
            {/* Search */}
            <div style={{padding:"10px 18px",borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <input value={woItemPickerSearch} onChange={e=>setWoItemPickerSearch(e.target.value)}
                placeholder="Search WO items…" autoFocus
                style={{width:"100%",padding:"7px 11px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            {/* List */}
            <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
              {totalFiltered === 0 && (
                <div style={{padding:"40px 20px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                  {woItemPickerSearch ? `No items match "${woItemPickerSearch}"` : "No items in this WO"}
                </div>
              )}
              {sections.map(sec => (
                <div key={sec.title}>
                  <div style={{padding:"6px 18px",background:T.bluL,borderTop:"1px solid "+T.bluM,borderBottom:"1px solid "+T.bluM,fontSize:10,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".5px"}}>
                    {sec.title} · {sec.items.length}
                  </div>
                  {sec.items.map(renderItem)}
                </div>
              ))}
              {unsect.map(renderItem)}
            </div>
            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB}}>
              <button onClick={()=>setWoItemPickerOpen(false)}
                style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Done
              </button>
              <span style={{fontSize:11.5,color:T.t3}}>{(msForm.pickedItemIds||[]).length} item{(msForm.pickedItemIds||[]).length===1?"":"s"} selected</span>
            </div>
          </div>
        </>);
      })()}

      {/* NEW WO MODAL */}
      {showNewWO&&(
        <NewWOModal
          subcons={subcons} setSubcons={setSubcons} projectId={projectId} project={project} fmtC={fmtC}
          inpStyle={inpStyle} lblStyle={lblStyle} saving={saving} setSaving={setSaving}
          onClose={()=>setShowNewWO(false)}
          onSaved={()=>{ setShowNewWO(false); loadWOs(); }}
        />
      )}

      {/* NEW RA BILL MODAL */}
      {showNewBill&&selWo&&(
        <NewRaBillModal wo={selWo} milestones={woMilestones}
          projectId={projectId} fmtC={fmtC} inpStyle={inpStyle} lblStyle={lblStyle}
          saving={saving}
          onClose={()=>setShowNewBill(false)} onSave={submitBill}/>
      )}

      {/* MANUAL (FREE-FORM) RA BILL MODAL */}
      {showManualRaBill && selWo && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"white",borderRadius:10,width:"min(640px,96vw)",maxHeight:"92vh",overflowY:"auto",padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.25)",border:"2px solid #7C3AED"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#7C3AED"}}>📝 Manual RA Bill</div>
                <div style={{fontSize:11,color:"#6B7280",marginTop:2}}>Bill items NOT in the Work Order / BOQ scope</div>
              </div>
              <button onClick={()=>setShowManualRaBill(false)} style={{background:"none",border:"none",cursor:"pointer",color:"#6B7280",fontSize:20,lineHeight:1}}>×</button>
            </div>

            {/* Date + Remark */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10,marginBottom:14}}>
              <div>
                <label style={lblStyle}>Bill Date</label>
                <input type="date" value={manualBillForm.bill_date}
                  onChange={e=>setManualBillForm(p=>({...p,bill_date:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={lblStyle}>Remark / Notes</label>
                <input type="text" value={manualBillForm.remark}
                  onChange={e=>setManualBillForm(p=>({...p,remark:e.target.value}))}
                  style={inpStyle} placeholder="Optional notes..."/>
              </div>
            </div>

            {/* Line Items */}
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <label style={lblStyle}>Line Items</label>
                <button onClick={()=>setManualBillForm(p=>({...p,items:[...p.items,{description:"",qty:"",rate:""}]}))}
                  style={{background:"#F3E8FF",color:"#7C3AED",border:"1px solid #C4B5FD",borderRadius:5,padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  + Add Row
                </button>
              </div>
              {/* Header row */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 90px 28px",gap:6,padding:"5px 8px",background:"#1E293B",borderRadius:"6px 6px 0 0"}}>
                {["Description","Qty","Rate (₹)","Amount",""].map((h,i)=>(
                  <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.6)",textTransform:"uppercase",textAlign:i>=1&&i<=3?"right":"left"}}>{h}</div>
                ))}
              </div>
              {manualBillForm.items.map((it,idx)=>{
                const qty  = parseFloat(it.qty)  || 0;
                const rate = parseFloat(it.rate) || 0;
                const amt  = qty * rate;
                return (
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 90px 28px",gap:6,padding:"6px 8px",borderBottom:"1px solid #E2E8F0",alignItems:"center",background:"white"}}>
                    <input type="text" value={it.description} placeholder="Description of work"
                      onChange={e=>{const a=[...manualBillForm.items];a[idx]={...a[idx],description:e.target.value};setManualBillForm(p=>({...p,items:a}));}}
                      style={{...inpStyle,padding:"5px 7px",fontSize:11}}/>
                    <input type="number" value={it.qty} placeholder="0" min={0}
                      onChange={e=>{const a=[...manualBillForm.items];a[idx]={...a[idx],qty:e.target.value};setManualBillForm(p=>({...p,items:a}));}}
                      style={{...inpStyle,padding:"5px 7px",fontSize:11,textAlign:"right"}}/>
                    <input type="number" value={it.rate} placeholder="0" min={0}
                      onChange={e=>{const a=[...manualBillForm.items];a[idx]={...a[idx],rate:e.target.value};setManualBillForm(p=>({...p,items:a}));}}
                      style={{...inpStyle,padding:"5px 7px",fontSize:11,textAlign:"right"}}/>
                    <div style={{fontSize:12,fontWeight:700,color:amt>0?"#059669":"#9CA3AF",textAlign:"right",paddingRight:4}}>
                      {amt>0?fmtC(amt):"—"}
                    </div>
                    <button onClick={()=>{const a=manualBillForm.items.filter((_,i)=>i!==idx);setManualBillForm(p=>({...p,items:a.length?a:[{description:"",qty:"",rate:""}]}));}}
                      style={{background:"#FEE2E2",color:"#DC2626",border:"none",borderRadius:4,width:22,height:22,fontSize:14,cursor:"pointer",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                );
              })}
              {/* Total row */}
              {manualBillForm.items.some(it=>parseFloat(it.qty)>0&&parseFloat(it.rate)>0) && (
                <div style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 90px 28px",gap:6,padding:"8px 8px",background:"#F0FDF4",borderRadius:"0 0 6px 6px",borderTop:"2px solid #BBF7D0"}}>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#1E293B",gridColumn:"1/4"}}>Total</div>
                  <div style={{fontSize:13,fontWeight:800,color:"#059669",textAlign:"right"}}>
                    {fmtC(manualBillForm.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0))}
                  </div>
                  <div/>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
              <button onClick={()=>setShowManualRaBill(false)}
                style={{padding:"8px 18px",borderRadius:6,background:"#F1F5F9",color:"#475569",border:"1px solid #CBD5E1",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={submitManualRaBill} disabled={manualBillSaving}
                style={{padding:"8px 20px",borderRadius:6,background:manualBillSaving?"#A78BFA":"#7C3AED",color:"white",border:"none",fontSize:12,fontWeight:700,cursor:manualBillSaving?"not-allowed":"pointer"}}>
                {manualBillSaving?"Saving…":"💾 Save Manual Bill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RA BILL MODAL */}
      {showEditBillModal && editBill && (() => {
        // ── helpers to recompute net from current retention/TDS ──
        const recalcNet = (g, retPct, tdsPct) => {
          const retAmt = Math.round(g * retPct) / 100;
          const tdsAmt = Math.round((g - retAmt) * tdsPct) / 100;
          return { retention_amt: retAmt, tds_amt: tdsAmt, net_payable: Math.round((g - retAmt - tdsAmt) * 100) / 100 };
        };
        // Recompute gross from edited item cumulative qtys
        const recalcGross = (items) => {
          return items.reduce((s, it) => {
            const rate = parseFloat(it.rate || 0);
            const cum  = parseFloat(it._editCum ?? it.cumulative_qty ?? 0);
            const prev = parseFloat(it.prev_cumulative || 0);
            return s + Math.max(0, cum - prev) * rate;
          }, 0);
        };

        const editItems = (editBill.items || []).filter(it => it.is_active !== 0);
        const showItems = editItems.length > 0;

        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:T.surface,borderRadius:10,width:"min(640px,96vw)",maxHeight:"92vh",overflowY:"auto",padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.2)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:14,fontWeight:700,color:T.t1}}>Edit RA Bill — {editBill.bill_no}</div>
                <button onClick={()=>{setShowEditBillModal(false);setEditBill(null);}} style={{background:"none",border:"none",cursor:"pointer",color:T.t4,fontSize:18}}>×</button>
              </div>

              {/* Date + Status */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <label style={lblStyle}>Bill Date</label>
                  <input type="date" value={(editBill.bill_date||"").split("T")[0]}
                    onChange={e=>setEditBill(p=>({...p,bill_date:e.target.value}))} style={inpStyle}/>
                </div>
                <div>
                  <label style={lblStyle}>Status</label>
                  <SearchSelect value={editBill.status||"Submitted"} options={["Draft","Submitted","Approved","Rejected"]}
                    onChange={v=>setEditBill(p=>({...p,status:v}))} placeholder="Select status..."/>
                </div>
              </div>

              {/* ── Item Quantities ── */}
              {showItems && (
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>
                    Item Quantities (cumulative)
                  </div>
                  <div style={{border:"1px solid "+T.b1,borderRadius:7,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 85px 90px",gap:6,padding:"6px 10px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                      {["Description","Unit","Prev Cum","This Cum ▼","This Bill Amt"].map((h,i)=>(
                        <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left"}}>{h}</span>
                      ))}
                    </div>
                    {editItems.map((it,idx) => {
                      const prev    = parseFloat(it.prev_cumulative || 0);
                      const cumVal  = parseFloat(it._editCum ?? it.cumulative_qty ?? 0);
                      const rate    = parseFloat(it.rate || 0);
                      const thisQty = Math.max(0, cumVal - prev);
                      const amt     = Math.round(thisQty * rate * 100) / 100;
                      const overWO  = it.wo_qty && cumVal > parseFloat(it.wo_qty);
                      return (
                        <div key={it.id||idx} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 85px 90px",gap:6,padding:"7px 10px",borderBottom:"1px solid "+T.b1,alignItems:"center",background:overWO?"#FEF2F2":"white"}}>
                          <span style={{fontSize:11.5,color:T.t1,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description||("Item #"+it.wo_item_id)}</span>
                          <span style={{fontSize:11,color:T.t4,textAlign:"right"}}>{it.unit||""}</span>
                          <span style={{fontSize:11,color:T.t3,textAlign:"right"}}>{prev}</span>
                          <input type="number" value={it._editCum ?? it.cumulative_qty ?? ""}
                            onChange={e => {
                              const newItems = editItems.map((x,i) => i===idx ? {...x, _editCum: e.target.value} : x);
                              const newGross = Math.round(recalcGross(newItems) * 100) / 100;
                              const retPct = parseFloat(editBill.retention_pct ?? 0);
                              const tdsPct = parseFloat(editBill.tds_pct ?? 0);
                              setEditBill(p => ({
                                ...p,
                                items: newItems,
                                gross_amount: newGross,
                                ...recalcNet(newGross, retPct, tdsPct),
                              }));
                            }}
                            style={{...inpStyle,padding:"5px 7px",fontSize:11,textAlign:"right",
                              borderColor: overWO ? T.red : T.b1,
                              color: overWO ? T.red : T.t1}}/>
                          <span style={{fontSize:12,fontWeight:700,color:amt>0?T.grn:T.t4,textAlign:"right"}}>{amt>0?fmtC(amt):"—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gross / Retention / TDS / Net */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <label style={lblStyle}>Gross Amount</label>
                  <input type="number" value={editBill.gross_amount ?? 0}
                    onChange={e=>{
                      const g = parseFloat(e.target.value) || 0;
                      const retPct = parseFloat(editBill.retention_pct ?? 0);
                      const tdsPct = parseFloat(editBill.tds_pct ?? 0);
                      setEditBill(p=>({...p, gross_amount:g, ...recalcNet(g, retPct, tdsPct)}));
                    }} style={inpStyle}/>
                </div>
                <div>
                  <label style={lblStyle}>Net Payable (auto)</label>
                  <input type="number" value={editBill.net_payable ?? 0} disabled
                    style={{...inpStyle,background:T.surfaceB,color:T.t3,fontWeight:700}}/>
                </div>
                <div>
                  <label style={lblStyle}>Retention %</label>
                  <input type="number" min={0} max={100}
                    value={editBill.retention_pct ?? ""}
                    onChange={e=>{
                      const r = parseFloat(e.target.value) || 0;
                      const g = parseFloat(editBill.gross_amount) || 0;
                      const tdsPct = parseFloat(editBill.tds_pct ?? 0);
                      setEditBill(p=>({...p, retention_pct:r, ...recalcNet(g, r, tdsPct)}));
                    }}
                    placeholder="0"
                    style={inpStyle}/>
                </div>
                <div>
                  <label style={lblStyle}>TDS %</label>
                  <input type="number" min={0} max={100}
                    value={editBill.tds_pct ?? ""}
                    onChange={e=>{
                      const t = parseFloat(e.target.value) || 0;
                      const g = parseFloat(editBill.gross_amount) || 0;
                      const retPct = parseFloat(editBill.retention_pct ?? 0);
                      setEditBill(p=>({...p, tds_pct:t, ...recalcNet(g, retPct, t)}));
                    }}
                    placeholder="0"
                    style={inpStyle}/>
                </div>
              </div>

              {/* Remark */}
              <div style={{marginBottom:14}}>
                <label style={lblStyle}>Remark / Notes</label>
                <textarea value={editBill.remark||""} onChange={e=>setEditBill(p=>({...p,remark:e.target.value}))}
                  style={{...inpStyle,minHeight:55,resize:"vertical"}} placeholder="Optional notes..."/>
              </div>

              {/* Summary bar */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14,padding:"10px",background:T.surfaceB,borderRadius:7,border:"1px solid "+T.b1}}>
                {[
                  {l:"Gross",  v:fmtC(editBill.gross_amount||0),    c:T.t1},
                  {l:"Ret.",   v:fmtC(editBill.retention_amt||0),   c:T.amb},
                  {l:"TDS",    v:fmtC(editBill.tds_amt||0),         c:T.red},
                  {l:"Net Pay",v:fmtC(editBill.net_payable||0),     c:T.grn},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:T.t4,textTransform:"uppercase",fontWeight:700}}>{s.l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:s.c,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowEditBillModal(false);setEditBill(null);}}
                  style={{flex:1,padding:"9px",borderRadius:7,background:T.surfaceB,border:`1px solid ${T.b1}`,fontSize:12,fontWeight:600,color:T.t3,cursor:"pointer"}}>
                  Cancel
                </button>
                <button onClick={async()=>{
                    setEditBillSaving(true);
                    try {
                      const payload = {
                        bill_date:      editBill.bill_date,
                        gross_amount:   parseFloat(editBill.gross_amount)   || 0,
                        retention_pct:  parseFloat(editBill.retention_pct)  ?? 0,
                        retention_amt:  parseFloat(editBill.retention_amt)  || 0,
                        tds_pct:        parseFloat(editBill.tds_pct)        ?? 0,
                        tds_amt:        parseFloat(editBill.tds_amt)        || 0,
                        net_payable:    parseFloat(editBill.net_payable)    || 0,
                        status:         editBill.status,
                        remark:         editBill.remark,
                      };
                      // Send edited items only if quantities were changed
                      const editedItems = editItems.filter(it => it._editCum !== undefined);
                      if (editedItems.length > 0) {
                        payload.items = editItems.map(it => ({
                          milestone_id:    it.milestone_id || null,
                          wo_item_id:      it.wo_item_id   || null,
                          cumulative_qty:  parseFloat(it._editCum ?? it.cumulative_qty ?? 0),
                          rate:            parseFloat(it.rate || 0),
                        }));
                      }
                      const res = await api.put("/subcon/ra-bills/"+editBill.id, payload, { timeoutMs: 30000 });
                      if (res.success) {
                        setShowEditBillModal(false); setEditBill(null); selectWo(selWo);
                      } else alert(res.message || "Update failed");
                    } catch(e) { alert("Error: "+e.message); }
                    setEditBillSaving(false);
                  }} disabled={editBillSaving}
                  style={{flex:2,padding:"9px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",opacity:editBillSaving?0.6:1}}>
                  {editBillSaving ? "Saving…" : "💾 Save Changes"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PAYMENT MODAL */}
      {showPayModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.surface,borderRadius:10,width:"min(400px,94vw)",padding:20,boxShadow:"0 20px 50px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:14,fontWeight:700,color:T.t1,marginBottom:14}}>Record Payment</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}}>
              <div>
                <label style={lblStyle}>Amount *</label>
                <input type="number" value={payForm.amount_paid} onChange={e=>setPayForm(p=>({...p,amount_paid:e.target.value}))} style={inpStyle} placeholder="0"/>
              </div>
              <div>
                <label style={lblStyle}>Date</label>
                <input type="date" value={payForm.payment_date} onChange={e=>setPayForm(p=>({...p,payment_date:e.target.value}))} style={inpStyle}/>
              </div>
              <div>
                <label style={lblStyle}>Mode</label>
                <SearchSelect value={payForm.payment_mode} options={["Bank Transfer","Cheque","Cash","NEFT","RTGS","UPI"]}
                  onChange={v=>setPayForm(p=>({...p,payment_mode:v}))} placeholder="Select mode..."/>
              </div>
              <div>
                <label style={lblStyle}>Reference No.</label>
                <input value={payForm.reference_no} onChange={e=>setPayForm(p=>({...p,reference_no:e.target.value}))} style={inpStyle} placeholder="UTR/Cheque no."/>
              </div>
            </div>
            <input value={payForm.remark} onChange={e=>setPayForm(p=>({...p,remark:e.target.value}))} placeholder="Remark (optional)" style={{...inpStyle,marginBottom:12}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowPayModal(false)} style={{flex:1,padding:"8px",borderRadius:6,border:"1px solid "+T.b1,background:T.surface,cursor:"pointer",fontSize:12}}>Cancel</button>
              <button onClick={()=>submitPayment(showPayModal)} disabled={saving} style={{flex:2,padding:"8px",borderRadius:6,background:saving?T.t4:T.grn,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:"pointer"}}>{saving?"Saving...":"Save Payment"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TASK PICKER DRAWER (link milestone to project task) ─────────── */}
      {taskPickerFor !== null && (() => {
        const q = taskPickerSearch.trim().toLowerCase();
        const byId = {};
        for (const t of projectTasksSub) byId[t.id] = { ...t, _children: [] };
        const roots = [];
        for (const t of projectTasksSub) {
          const node = byId[t.id];
          if (t.parent_id && byId[t.parent_id]) byId[t.parent_id]._children.push(node);
          else roots.push(node);
        }
        const displayRows = [];
        if (q) {
          for (const t of projectTasksSub) {
            if ((t.title||t.name||"").toLowerCase().includes(q)) displayRows.push({ node: byId[t.id], depth: 0 });
          }
        } else {
          const walk = (node, depth) => {
            displayRows.push({ node, depth });
            if (node._children.length && taskPickerExpSub[node.id]) {
              for (const c of node._children) walk(c, depth + 1);
            }
          };
          for (const r of roots) walk(r, 0);
        }
        return (<>
          <div onClick={()=>setTaskPickerFor(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:330}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:440,maxWidth:"95vw",background:"white",boxShadow:"-8px 0 24px rgba(0,0,0,0.2)",zIndex:331,display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 18px",background:T.t1,color:"white",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:700}}>Link to Project Task</div>
                <button onClick={()=>setTaskPickerFor(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.65)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)"}}>Pick a task and set the % completion that triggers billing</div>
            </div>
            {/* Trigger % */}
            <div style={{padding:"12px 18px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>Trigger at task completion %</label>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="range" min={0} max={100} step={5} value={linkTrigPct} onChange={e=>setLinkTrigPct(parseInt(e.target.value)||0)} style={{flex:1}}/>
                <input type="number" min={0} max={100} value={linkTrigPct} onChange={e=>setLinkTrigPct(Math.min(100,Math.max(0,parseInt(e.target.value)||0)))}
                  style={{width:60,padding:"4px 7px",borderRadius:5,border:"1.5px solid "+T.b1,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                <span style={{fontSize:12,fontWeight:700,color:T.blu}}>%</span>
              </div>
              <div style={{display:"flex",gap:5,marginTop:6}}>
                {[25,50,75,100].map(p=>(
                  <button key={p} onClick={()=>setLinkTrigPct(p)}
                    style={{flex:1,background:linkTrigPct===p?T.blu:"white",color:linkTrigPct===p?"white":T.t3,border:"1px solid "+(linkTrigPct===p?T.blu:T.b1),borderRadius:4,padding:"3px 6px",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
            {/* Search */}
            <div style={{padding:"10px 18px",borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <input value={taskPickerSearch} onChange={e=>setTaskPickerSearch(e.target.value)}
                placeholder="Search tasks…" autoFocus
                style={{width:"100%",padding:"7px 11px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            {/* Task list */}
            <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
              {projectTasksSub.length === 0 && (
                <div style={{padding:"36px 20px",textAlign:"center",color:T.t3,fontSize:12.5}}>No tasks in this project yet.</div>
              )}
              {projectTasksSub.length > 0 && displayRows.length === 0 && (
                <div style={{padding:"30px 20px",textAlign:"center",color:T.t4,fontSize:12.5}}>No tasks match "{taskPickerSearch}"</div>
              )}
              {displayRows.map(({ node: t, depth }) => {
                const isSel = linkSelTaskId === t.id;
                const taskName = t.title || t.name;
                const progress = Number(t.progress) || 0;
                const stC2 = t.status==="Completed"?T.grn:t.status==="Ongoing"?T.blu:t.status==="Hold"?T.red:T.t4;
                const hasKids = (t._children||[]).length > 0;
                return (
                  <div key={t.id} onClick={()=>setLinkSelTaskId(t.id)}
                    style={{padding:"10px 18px 10px "+(18+depth*18)+"px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",gap:8,background:isSel?"#EFF6FF":"white"}}
                    onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background="#F8FAFC"; }}
                    onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="white"; }}>
                    {hasKids ? (
                      <button onClick={e=>{ e.stopPropagation(); setTaskPickerExpSub(p=>({...p,[t.id]:!p[t.id]})); }}
                        style={{background:"none",border:"none",cursor:"pointer",color:T.t3,fontSize:10,width:16,flexShrink:0,padding:0}}>
                        {taskPickerExpSub[t.id]?"▼":"▶"}
                      </button>
                    ) : <span style={{width:16,flexShrink:0}}/>}
                    <span style={{width:18,height:18,borderRadius:"50%",border:"2px solid "+(isSel?T.blu:T.b1),background:isSel?T.blu:"white",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {isSel && <span style={{width:6,height:6,borderRadius:"50%",background:"white"}}/>}
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:hasKids?700:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{taskName}</div>
                      <div style={{fontSize:10,color:T.t4,marginTop:2,display:"flex",gap:6}}>
                        <span style={{padding:"1px 6px",borderRadius:3,background:stC2+"22",color:stC2,fontWeight:600}}>{t.status||"Not Started"}</span>
                        <span>· {progress}%</span>
                      </div>
                      <div style={{marginTop:5,height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width:progress+"%",height:"100%",background:progress>=linkTrigPct?T.grn:T.blu,transition:"width .2s"}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB,gap:8}}>
              <button onClick={()=>setTaskPickerFor(null)} disabled={linkingTask}
                style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={confirmLinkTaskSub} disabled={linkingTask||!linkSelTaskId}
                style={{background:(!linkSelTaskId||linkingTask)?T.t4:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:(!linkSelTaskId||linkingTask)?"default":"pointer"}}>
                {linkingTask?"Linking…":"Link Task"}
              </button>
            </div>
          </div>
        </>);
      })()}
    </div>
  );
}

function NewWOModal({ subcons, setSubcons, projectId, project, fmtC, inpStyle, lblStyle, saving, setSaving, onClose, onSaved }) {
  const CATS       = ["Civil","Electrical","Plumbing","Finishing","Structural","MEP","Waterproofing","Painting","Tiling","Other"];
  const TRADE_CATS = ["Civil","Electrical","Plumbing","Finishing","Tile","MEP","Waterproofing","Painting","Other"];
  const blankSection = () => ({ title:"", items:[{ description:"", unit:"", qty:"", rate:"", isLibrary:false }] });

  // ── WO Type ────────────────────────────────────────────────────────────
  // "manual"    → existing manual entry (sections + items typed by hand)
  // "package"   → pick subcon rate card package → sections+items auto-load
  // "item_wise" → browse work items from library → tick + qty
  const [woType, setWoType] = useState("manual");

  // ── Package mode state ─────────────────────────────────────────────────
  // Reads project.city_id + project.construction_type_id for auto-detect
  const [pkgConTypes,  setPkgConTypes]  = useState([]);
  const [pkgCities,    setPkgCities]    = useState([]);
  const [pkgSelType,   setPkgSelType]   = useState(null);
  const [pkgSelCity,   setPkgSelCity]   = useState(null);
  const [pkgTrade,     setPkgTrade]     = useState(null);
  const [pkgList,      setPkgList]      = useState([]);
  const [pkgSelPkg,    setPkgSelPkg]    = useState(null);
  const [pkgStructures,setPkgStructures]= useState([]);
  const [pkgCategories,setPkgCategories]= useState([]);
  const [pkgSecItems,  setPkgSecItems]  = useState({}); // {sid:[rows]}
  const [pkgAreas,     setPkgAreas]     = useState({}); // {sid: area override}
  const [pkgCollapsed, setPkgCollapsed] = useState({});

  // ── Item-wise mode state ───────────────────────────────────────────────
  const [iwItems,      setIwItems]      = useState([]); // all work items for city+type
  const [iwLoading,    setIwLoading]    = useState(false);
  const [iwTradeFilter,setIwTradeFilter]= useState("All");
  const [iwPicked,     setIwPicked]     = useState({}); // {id: qty}
  const [iwShowPicker, setIwShowPicker] = useState(false);
  const [iwSearch,     setIwSearch]     = useState("");
  const [iwManualItems,setIwManualItems]= useState([]); // [{description,unit,qty,rate}]

  // ── Package builder extras (estimate-like UX) ──────────────────────────
  const [pkgShowInfo,        setPkgShowInfo]        = useState(true);
  const [pkgEditMode,        setPkgEditMode]        = useState(false);
  const [pkgCatCollapsed,    setPkgCatCollapsed]    = useState({});   // {`${sid}:${catId}`:true}
  const [pkgCatAreas,        setPkgCatAreas]        = useState({});   // {`${sid}:${catId}`:area_override}
  const [pkgItemEdits,       setPkgItemEdits]       = useState({});   // {`${sid}:${catId}:${iid}`:{base,addOn,qty}}
  const [pkgExcludedItems,   setPkgExcludedItems]   = useState({});   // {`${sid}:${catId}:${iid}`:true}
  const [pkgAddedItems,      setPkgAddedItems]      = useState({});   // {`${sid}:${catId}`:[{name,unit,qty,rate}]}
  const [pkgAddItemForm,     setPkgAddItemForm]     = useState(null); // {sid,catId,catName,form:{}} | null
  const [pkgAddedCats,       setPkgAddedCats]       = useState({});   // {[sid]:[{catName, perItem, items:[{name,unit,qty,rate}]}]}
  const [pkgAddedSections,   setPkgAddedSections]   = useState([]);   // [{title,items:[{name,unit,qty,rate}]}]
  const [pkgAddSecOpen,      setPkgAddSecOpen]      = useState(false);
  const [pkgAddSecForm,      setPkgAddSecForm]      = useState({title:"",items:[{name:"",unit:"Sqft",qty:"",rate:""}]});
  // Cloudinary attachment (same pattern as EstimateBuilderModal)
  const CLOUD_NAME    = "dd632nqfm";
  const UPLOAD_PRESET = "gb_buildcon_drawings";
  const [woAttachUrl,  setWoAttachUrl]  = useState("");
  const [woAttachName, setWoAttachName] = useState("");
  const [woAttachSize, setWoAttachSize] = useState("");
  const [woAttaching,  setWoAttaching]  = useState(false);
  const uploadWoAttachment = async (file) => {
    setWoAttaching(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("folder", "gb_buildcon/subcon_wo");
      const isPDF = file.type === "application/pdf" || /\.(pdf|dwg|dxf|doc|docx|xls|xlsx)$/i.test(file.name);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${isPDF?"raw":"image"}/upload`, { method:"POST", body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Upload failed");
      setWoAttachUrl(data.secure_url);
      setWoAttachName(file.name);
      setWoAttachSize(Math.round(file.size / 1024) + " KB");
    } catch(e) { alert(e.message || "Upload failed"); }
    finally { setWoAttaching(false); }
  };

  // Load base data for package/item-wise mode when modal opens
  useEffect(() => {
    if (woType === "manual") return;
    api.get("/library/construction-types").then(r => {
      if (!r.success) return;
      setPkgConTypes(r.data||[]);
      // Auto-select from project
      if (project?.construction_type_id) {
        const match = (r.data||[]).find(t => Number(t.id)===Number(project.construction_type_id));
        if (match) setPkgSelType(match);
      }
    });
    api.get("/library/cities").then(r => {
      if (!r.success) return;
      setPkgCities(r.data||[]);
      if (project?.city_id) {
        const match = (r.data||[]).find(c => Number(c.id)===Number(project.city_id));
        if (match) setPkgSelCity(match);
      }
    });
    // eslint-disable-next-line
  }, [woType]);

  // Load packages when type + trade selected
  useEffect(() => {
    if (!pkgSelType || !pkgTrade) { setPkgList([]); setPkgSelPkg(null); return; }
    api.get(`/library/rate-packages?for=subcon&trade_category=${encodeURIComponent(pkgTrade)}&type_id=${pkgSelType.id}`)
      .then(r => { if (r.success) setPkgList(r.data||[]); });
    setPkgSelPkg(null);
    // eslint-disable-next-line
  }, [pkgSelType?.id, pkgTrade]);

  // Load package tree when pkg + city selected
  useEffect(() => {
    if (!pkgSelPkg || !pkgSelCity) { setPkgStructures([]); setPkgCategories([]); setPkgSecItems({}); return; }
    Promise.all([
      api.get(`/library/packages/${pkgSelPkg.id}/structures`),
      api.get(`/library/packages/${pkgSelPkg.id}/categories`),
    ]).then(([sr, cr]) => {
      const structs = sr.success ? sr.data||[] : [];
      setPkgStructures(structs);
      if (cr.success) setPkgCategories(cr.data||[]);
      if (structs.length) {
        Promise.all(structs.map(s =>
          api.get(`/library/rate-matrix?package_id=${pkgSelPkg.id}&city_id=${pkgSelCity.id}&structure_id=${s.id}`)
            .then(r => [s.id, r.success ? r.data||[] : []])
            .catch(() => [s.id, []])
        )).then(results => {
          const map = {}; const aMap = {};
          for (const [sid, rows] of results) {
            map[sid] = rows;
            // Pre-fill area from section default_qty
            const sec = structs.find(x => x.id === sid);
            if (sec?.default_qty) aMap[sid] = String(sec.default_qty);
          }
          setPkgSecItems(map);
          setPkgAreas(aMap);
        });
      }
    });
    // eslint-disable-next-line
  }, [pkgSelPkg?.id, pkgSelCity?.id]);

  // Load work items for item-wise mode
  useEffect(() => {
    if (woType !== "item_wise" || !pkgSelCity || !pkgSelType) { setIwItems([]); return; }
    setIwLoading(true);
    api.get(`/library/subcon-work-items?city_id=${pkgSelCity.id}&type_id=${pkgSelType.id}`)
      .then(r => { if (r.success) setIwItems(r.data||[]); })
      .catch(() => {})
      .finally(() => setIwLoading(false));
    // eslint-disable-next-line
  }, [woType, pkgSelCity?.id, pkgSelType?.id]);

  // Build sections from package mode for submit.
  // Maps 3-level (library section → category → item) to 2-level WO.
  // Each category becomes a WO section: "Section — Category" title.
  // Respects pkgExcludedItems (deleted) and pkgAddedItems (added in builder).
  const buildPackageSections = () => {
    const libSections = pkgStructures.flatMap(sec => {
      const area    = parseFloat(pkgAreas[sec.id] || sec.default_qty || 0);
      const perItem = !!Number(sec.per_item_qty);
      const cats    = pkgCategories.filter(c => c.structure_id === sec.id);
      return cats.map(cat => {
        const catKey     = `${sec.id}:${cat.id}`;
        const catArea    = pkgCatAreas[catKey] != null ? parseFloat(pkgCatAreas[catKey]) : area;
        const catRows    = (pkgSecItems[sec.id]||[]).filter(r =>
          Number(r.category_id)===Number(cat.id) || r.category_name===cat.category_name
        );
        // Library items (minus excluded)
        const libItems = catRows
          .filter(r => !pkgExcludedItems[`${sec.id}:${cat.id}:${r.item_id}`])
          .map(r => {
            const base  = getPkgItemBase(sec.id, cat.id, r.item_id, r);
            const addOn = getPkgItemAddOn(sec.id, cat.id, r.item_id, r);
            const qty   = perItem ? getPkgItemQty(sec.id, cat.id, r.item_id, r, area, true) : catArea;
            return { description: r.item_name || r.name, unit: r.unit || "Sqft", qty, rate: base + addOn };
          }).filter(i => i.description && i.rate > 0);
        // WO-added items for this category
        const addedItems = (pkgAddedItems[catKey]||[]).map(i => ({
          description: i.name, unit: i.unit||"Sqft", qty: parseFloat(i.qty)||0, rate: parseFloat(i.rate)||0,
        })).filter(i => i.description && i.rate > 0);
        const items = [...libItems, ...addedItems];
        const title = cat.category_name === sec.name ? cat.category_name : `${sec.name} — ${cat.category_name}`;
        return { title, items };
      }).filter(s => s.items.length > 0);
    });
    // Extra manual sections added in WO builder
    const extraSections = pkgAddedSections.map(sec => ({
      title: sec.title,
      items: sec.items.filter(i => i.name && parseFloat(i.rate||0)>0).map(i => ({
        description: i.name, unit: i.unit||"Sqft", qty: parseFloat(i.qty||0), rate: parseFloat(i.rate||0),
      })),
    })).filter(s => s.items.length > 0);
    return [...libSections, ...extraSections];
  };

  // Build sections from item-wise picks + manual items for submit
  const buildItemSections = () => {
    // Library-picked items grouped by category
    const groups = {};
    for (const [id, qty] of Object.entries(iwPicked).filter(([,q]) => parseFloat(q||0) > 0)) {
      const item = iwItems.find(i => String(i.id)===String(id));
      if (!item) continue;
      const cat = item.trade_category || "Work Items";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ description:item.name, unit:item.unit||"Sqft", qty:parseFloat(qty), rate:parseFloat(item.rate||0) });
    }
    const sections = Object.entries(groups).map(([title, items]) => ({ title, items }));
    // Manual items appended as their own section
    const manuals = iwManualItems.filter(it => it.description.trim() && parseFloat(it.rate||0) > 0);
    if (manuals.length) sections.push({ title:"Manual Items", items: manuals.map(it => ({
      description: it.description.trim(), unit: it.unit||"Sqft",
      qty: parseFloat(it.qty||0), rate: parseFloat(it.rate||0),
    }))});
    return sections;
  };

  const [form, setForm] = useState({
    subcon_name:"", subcon_category:"Civil",
    description:"", retention_pct:5, tds_pct:2,
    start_date:"", end_date:"",
    sections:[ blankSection() ],
  });
  const [libItems, setLibItems] = useState([]);
  const [showLibFor, setShowLibFor] = useState(null); // {secIdx, itemIdx}
  const [libSearch, setLibSearch] = useState("");
  const [secCollapsed, setSecCollapsed] = useState({});
  const [showAddSc, setShowAddSc] = useState(false);  // inline new-subcon modal
  const toggleSecCollapse = (si) => setSecCollapsed(p=>({...p,[si]:!p[si]}));

  // ── Library-backed subcon match: when user types/picks a name that
  //    matches an entry in /library/subcontractors, surface its
  //    labour_strength + trade as a chip, and auto-fill the category.
  const matchedSubcon = (subcons || []).find(
    s => (s.name || "").trim().toLowerCase() === (form.subcon_name || "").trim().toLowerCase()
  );
  useEffect(() => {
    if (matchedSubcon && matchedSubcon.trade) {
      // Best-effort map library "trade" to WO "category". If the trade
      // string contains one of CATS, use it; else leave whatever the
      // user picked.
      const hit = CATS.find(c => (matchedSubcon.trade || "").toLowerCase().includes(c.toLowerCase()));
      if (hit && hit !== form.subcon_category) setForm(p => ({ ...p, subcon_category: hit }));
    }
    // eslint-disable-next-line
  }, [matchedSubcon?.id]);

  // Load library items when category changes
  useEffect(()=>{
    api.get("/library/materials").then(r=>{
      if(r.success) setLibItems(r.data||[]);
    }).catch(()=>{});
  },[]);

  // Section helpers
  const addSection = () => setForm(p=>({...p, sections:[...p.sections, blankSection()]}));
  const removeSection = (si) => setForm(p=>({...p, sections:p.sections.filter((_,i)=>i!==si)}));
  const updateSection = (si, key, val) => setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,[key]:val}:s)}));
  const addItem = (si) => {
    setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,items:[...s.items,{description:"",unit:"",qty:"",rate:"",isLibrary:false}]}:s)}));
    // After React paints the new row, auto-focus its description field
    // so a keyboard-driven user can keep typing without reaching for
    // the mouse. setTimeout(0) defers until after the commit phase.
    setTimeout(() => {
      const sec = form.sections[si];
      if (!sec) return;
      // length BEFORE setForm settled = index of the brand-new row
      const newIdx = sec.items.length;
      const el = document.querySelector(`[data-wo-desc="new-${si}-${newIdx}"]`);
      if (el) el.focus();
    }, 0);
  };
  const removeItem = (si,ii) => setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s)}));
  const updateItem = (si,ii,key,val) => setForm(p=>({...p, sections:p.sections.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,[key]:val}:it)}:s)}));

  // Pick from library
  const pickLibItem = (item) => {
    if(!showLibFor) return;
    const {secIdx,itemIdx} = showLibFor;
    updateItem(secIdx,itemIdx,"description",item.name);
    updateItem(secIdx,itemIdx,"unit",item.unit||"");
    updateItem(secIdx,itemIdx,"rate",item.rate||"");
    updateItem(secIdx,itemIdx,"isLibrary",true);
    setShowLibFor(null); setLibSearch("");
  };

  const grandTotal = form.sections.reduce((st,sec)=>
    st + sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0), 0
  );

  const submit = async () => {
    if(!form.subcon_name) return alert("Subcontractor required");

    // Build sections based on wo_type
    let finalSections = [];
    if (woType === "package") {
      finalSections = buildPackageSections();
      if (!finalSections.length) return alert("Package has no items with rates — set rates in Library → Subcon Rate Card first");
    } else if (woType === "item_wise") {
      finalSections = buildItemSections();
      if (!finalSections.length) return alert("Select at least one item with qty > 0 (from library or manual)");
    } else {
      // manual
      finalSections = form.sections.filter(s=>s.title.trim() && s.items.some(i=>i.description&&i.qty&&i.rate));
      if (!finalSections.length) return alert("At least 1 section with items required");
    }

    setSaving(true);
    const payload = {
      project_id:      projectId,
      wo_type:         woType,
      subcon_name:     form.subcon_name,
      subcon_category: form.subcon_category,
      description:     form.description,
      retention_pct:   parseFloat(form.retention_pct||5),
      tds_pct:         parseFloat(form.tds_pct||2),
      start_date:      form.start_date||null,
      end_date:        form.end_date||null,
      sections: finalSections.map(s=>({
        title: s.title,
        items: s.items
          .filter(i => i.description && parseFloat(i.rate||0) > 0)
          .map(i=>({
            description: i.description,
            unit:        i.unit||"Sqft",
            qty:         parseFloat(i.qty||0),
            rate:        parseFloat(i.rate),
          })),
      })).filter(s=>s.items.length>0),
    };
    const res = await api.post("/subcon/work-orders", payload)
      .catch(e=>({success:false,message:e?.message||"Network error"}));
    setSaving(false);
    if(res.success) {
      onSaved();
    } else {
      const errMsg = res.message || res.error || `Server error (${res._status||500})`;
      alert("Create Work Order failed:\n" + errMsg);
    }
  };

  const filteredLib = libItems.filter(i=>
    !libSearch || i.name.toLowerCase().includes(libSearch.toLowerCase())
  );

  // True when package is selected and we show full-screen builder
  const pkgBuilderMode = woType === "package" && pkgSelPkg !== null;
  // Helper: effective rate for a rate-matrix row
  const effR = (r) => r.base_rate != null
    ? parseFloat(r.base_rate||0) + parseFloat(r.add_on_rate||0)
    : parseFloat(r.rate||0);
  // Package builder math helpers
  const getPkgItemBase  = (sid,catId,iid,row) => pkgItemEdits[`${sid}:${catId}:${iid}`]?.base   ?? (row.base_rate != null ? parseFloat(row.base_rate||0) : parseFloat(row.rate||0) - parseFloat(row.add_on_rate||0));
  const getPkgItemAddOn = (sid,catId,iid,row) => pkgItemEdits[`${sid}:${catId}:${iid}`]?.addOn  ?? parseFloat(row.add_on_rate||0);
  const getPkgItemQty   = (sid,catId,iid,row,secArea,perItem) => perItem
    ? (pkgItemEdits[`${sid}:${catId}:${iid}`]?.qty ?? parseFloat(row.qty||0))
    : secArea;
  const patchPkgItem = (sid,catId,iid,patch) =>
    setPkgItemEdits(p=>({...p,[`${sid}:${catId}:${iid}`]:{...(p[`${sid}:${catId}:${iid}`]||{}),...patch}}));
  // Compute package grand total for footer
  const pkgGrandTotal = pkgStructures.reduce((gt,sec)=>{
    const area = parseFloat(pkgAreas[sec.id]||sec.default_qty||0);
    const perItem = !!Number(sec.per_item_qty);
    const cats = pkgCategories.filter(c=>c.structure_id===sec.id);
    return gt + cats.reduce((st,cat)=>{
      const rows = (pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name));
      return st + rows.reduce((ct,r)=>{
        const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
        const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
        const qty=getPkgItemQty(sec.id,cat.id,r.item_id,r,area,perItem);
        const catAreaKey=`${sec.id}:${cat.id}`;
        const catArea=pkgCatAreas[catAreaKey]!=null?parseFloat(pkgCatAreas[catAreaKey]):area;
        return ct+(base+addOn)*(perItem?qty:catArea);
      },0);
    },0);
  },0);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:pkgBuilderMode?0:12,
        width:pkgBuilderMode?"100vw":"min(780px,96vw)",
        height:pkgBuilderMode?"100vh":"auto",
        maxHeight:pkgBuilderMode?"100vh":"90vh",
        display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 18px",borderRadius:pkgBuilderMode?"0":"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:8}}>New Work Order</div>
            {/* WO Type toggle */}
            <div style={{display:"flex",gap:6}}>
              {[
                {id:"manual",    icon:"✏️", label:"Manual"},
                {id:"package",   icon:"📐", label:"Package"},
                {id:"item_wise", icon:"🔧", label:"Item-wise"},
              ].map(m=>(
                <button key={m.id} onClick={()=>setWoType(m.id)} style={{
                  padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer",
                  border:`1.5px solid ${woType===m.id?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.2)"}`,
                  background:woType===m.id?"rgba(255,255,255,0.2)":"transparent",
                  color:woType===m.id?"white":"rgba(255,255,255,0.5)",
                  display:"flex", alignItems:"center", gap:5,
                }}>
                  {m.icon} {m.label}
                </button>
              ))}
              <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",alignSelf:"center",marginLeft:4}}>
                {woType==="manual" ? "Type items manually" : woType==="package" ? "Load from Subcon Rate Card" : "Pick individual items from library"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",lineHeight:1,marginTop:2}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:pkgBuilderMode?"0":"16px"}}>
          {/* ── PACKAGE BUILDER: estimate-style full-screen body ─── */}
          {pkgBuilderMode && (
            <div style={{maxWidth:1200,margin:"0 auto",padding:"16px 20px 24px"}}>
              {/* Info Panel */}
              <div style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",marginBottom:14}}>
                <div onClick={()=>setPkgShowInfo(s=>!s)}
                  style={{padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,
                    borderBottom:pkgShowInfo?"1px solid #E5E7EB":"none"}}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                    style={{transition:"transform .15s",transform:pkgShowInfo?"rotate(90deg)":"rotate(0deg)"}}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span style={{fontSize:12,fontWeight:700,color:"#0F172A",textTransform:"uppercase",letterSpacing:".4px"}}>WO Settings</span>
                  <span style={{fontSize:11,color:"#64748B",marginLeft:"auto"}}>
                    Retention {form.retention_pct}% · TDS {form.tds_pct}%{woAttachUrl?" · 📎 Attached":""}
                  </span>
                </div>
                {pkgShowInfo && (() => {
                  const inpC={width:"100%",padding:"5px 8px",borderRadius:5,border:"1.5px solid #D1D5DB",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"};
                  const lblC={fontSize:9.5,fontWeight:700,color:"#6B7280",display:"block",marginBottom:3,textTransform:"uppercase",letterSpacing:".4px"};
                  return (
                    <div style={{padding:"12px 14px"}}>
                      {/* Row 1: Subcon + Description */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:9}}>
                        <div>
                          <label style={lblC}>Subcontractor <span style={{color:"#DC2626"}}>*</span></label>
                          <div style={{display:"flex",gap:6}}>
                            <input list="sc-list-wo-pkg" value={form.subcon_name}
                              onChange={e=>setForm(p=>({...p,subcon_name:e.target.value}))}
                              placeholder="Select from library or type..."
                              style={{...inpC,flex:1,border:`1.5px solid ${!form.subcon_name?"#FCA5A5":"#D1D5DB"}`}}/>
                            <datalist id="sc-list-wo-pkg">
                              {subcons.map(s=><option key={s.id} value={s.name}/>)}
                            </datalist>
                          </div>
                        </div>
                        <div>
                          <label style={lblC}>Description / Note</label>
                          <input value={form.description||""} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                            placeholder="Optional scope summary" style={inpC}/>
                        </div>
                      </div>
                      {/* Row 2: Retention / TDS / Start / End */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.3fr 1.3fr",gap:10,marginBottom:9}}>
                        <div><label style={lblC}>Retention %</label>
                          <input type="number" value={form.retention_pct} onChange={e=>setForm(p=>({...p,retention_pct:e.target.value}))} style={{...inpC,textAlign:"right"}}/></div>
                        <div><label style={lblC}>TDS %</label>
                          <input type="number" value={form.tds_pct} onChange={e=>setForm(p=>({...p,tds_pct:e.target.value}))} style={{...inpC,textAlign:"right"}}/></div>
                        <div><label style={lblC}>Start Date</label>
                          <input type="date" value={form.start_date||""} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={inpC}/></div>
                        <div><label style={lblC}>End Date</label>
                          <input type="date" value={form.end_date||""} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} style={inpC}/></div>
                      </div>
                      {/* Row 3: Attachment + Category */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                        <div>
                          <label style={lblC}>Attachment</label>
                          {!woAttachUrl ? (
                            <label style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:5,
                              border:"1.5px dashed #94A3B8",background:"white",cursor:woAttaching?"not-allowed":"pointer",fontSize:11.5,color:"#475569",fontWeight:600}}>
                              <span style={{fontSize:13}}>📎</span>
                              {woAttaching?"Uploading…":"Attach PDF / image / DWG"}
                              <input type="file" accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,image/*"
                                onChange={e=>{const f=e.target.files?.[0];if(f)uploadWoAttachment(f);e.target.value="";}}
                                disabled={woAttaching} style={{display:"none"}}/>
                            </label>
                          ) : (
                            <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:5,border:"1.5px solid #93C5FD",background:"#EFF6FF",fontSize:11.5,color:"#1D4ED8"}}>
                              <a href={woAttachUrl} target="_blank" rel="noreferrer"
                                style={{flex:1,color:"#1D4ED8",textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                📎 {woAttachName} <span style={{color:"#64748B"}}>· {woAttachSize}</span>
                              </a>
                              <button onClick={()=>{setWoAttachUrl("");setWoAttachName("");setWoAttachSize("");}}
                                style={{background:"none",border:"none",color:"#DC2626",cursor:"pointer",fontSize:14,lineHeight:1,padding:0}}>×</button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={lblC}>Trade Category</label>
                          <div style={{fontSize:12,color:T.t3,fontWeight:600,padding:"5px 0"}}>{pkgTrade} — {pkgSelPkg?.name}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Package picker compact row */}
              <div style={{background:"white",borderRadius:8,border:"1px solid #E5E7EB",padding:"10px 14px",marginBottom:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".4px"}}>{pkgSelType?.name} · {pkgSelCity?.name}</span>
                <span style={{color:"#CBD5E1"}}>›</span>
                {pkgList.map(p=>(
                  <button key={p.id} onClick={()=>setPkgSelPkg(p)} style={{
                    padding:"4px 12px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer",
                    border:`2px solid ${pkgSelPkg?.id===p.id?"#2563EB":"#E5E7EB"}`,
                    background:pkgSelPkg?.id===p.id?"#EFF6FF":"white",
                    color:pkgSelPkg?.id===p.id?"#2563EB":"#374151"}}>
                    {p.name}{p.sqft_rate>0&&<span style={{fontSize:10,fontWeight:500,marginLeft:4,opacity:.7}}>Rs.{Number(p.sqft_rate).toLocaleString()}/sqft</span>}
                  </button>
                ))}
              </div>

              {/* ── Section / Category / Item tree — estimate-style ── */}
              {pkgSelPkg && (<>
                {pkgStructures.length>0 && pkgStructures.every(sec=>(pkgSecItems[sec.id]||[]).every(r=>effR(r)===0)) && (
                  <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:8,padding:"9px 13px",marginBottom:10,fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:8}}>
                    ⚠ Rates not set — go to <b>Library → Subcon Rate Card</b>, select this package, set rates and Save Rates first.
                  </div>
                )}
                {pkgStructures.length>0 && (
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <button onClick={()=>setPkgEditMode(m=>!m)}
                      style={{padding:"5px 13px",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer",
                        background:pkgEditMode?"#10B981":"white",border:"1.5px solid "+(pkgEditMode?"#10B981":"#94A3B8"),
                        color:pkgEditMode?"white":"#334155",display:"flex",alignItems:"center",gap:5}}>
                      {pkgEditMode?"✓ Done Editing":"✎ Edit Package"}
                    </button>
                    <span style={{fontSize:10.5,color:"#64748B"}}>{pkgEditMode?"Override rates/qty per item":"Click to override rates or qty for this WO"}</span>
                  </div>
                )}
                {pkgStructures.map(sec=>{
                  const secArea=parseFloat(pkgAreas[sec.id]||sec.default_qty||0);
                  const perItem=!!Number(sec.per_item_qty);
                  const sCol=!!pkgCollapsed[sec.id];
                  const cats=pkgCategories.filter(c=>c.structure_id===sec.id);
                  const secBase=cats.reduce((sb,cat)=>sb+(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name)).reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0),0);
                  const secAddOn=cats.reduce((sa,cat)=>sa+(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name)).reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0),0);
                  const secTotal=cats.reduce((st,cat)=>{
                    const ck=`${sec.id}:${cat.id}`;
                    const ca=pkgCatAreas[ck]!=null?parseFloat(pkgCatAreas[ck]):secArea;
                    return st+(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name)).reduce((ct,r)=>{
                      const b=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                      const a=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                      const q=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):ca;
                      return ct+(b+a)*q;
                    },0);
                  },0);
                  return(
                    <div key={sec.id} style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",marginBottom:12,overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:"#0F172A",color:"white"}}>
                        <span onClick={()=>setPkgCollapsed(p=>({...p,[sec.id]:!p[sec.id]}))} style={{cursor:"pointer",display:"flex"}}>
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}
                            style={{transition:"transform .15s",transform:sCol?"rotate(0deg)":"rotate(90deg)"}}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </span>
                        <span style={{fontWeight:700,fontSize:14,flex:1}}>{sec.name}</span>
                        <span style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>· {cats.length} {cats.length===1?"category":"categories"}</span>
                        {perItem&&<span style={{fontSize:9,color:"#FCD34D",background:"rgba(245,158,11,0.2)",padding:"2px 7px",borderRadius:4,fontWeight:700}}>Per-item Qty</span>}
                        <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11.5,fontWeight:600}}>
                          {!perItem&&<>
                            <span style={{color:"rgba(255,255,255,0.6)"}}>Base <strong style={{color:"white"}}>Rs.{Math.round(secBase).toLocaleString("en-IN")}</strong></span>
                            <span style={{color:"rgba(255,255,255,0.6)"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(secAddOn).toLocaleString("en-IN")}</strong></span>
                            <span style={{padding:"3px 9px",background:"#CCFBF1",color:"#0D9488",borderRadius:4,fontWeight:700}}>Rs.{Math.round(secBase+secAddOn).toLocaleString("en-IN")}/sqft</span>
                            <span style={{display:"flex",alignItems:"center",gap:4}}>
                              <span style={{color:"rgba(255,255,255,0.55)",fontSize:11}}>Area</span>
                              <input type="number" value={pkgAreas[sec.id]||""} onChange={e=>setPkgAreas(p=>({...p,[sec.id]:e.target.value}))}
                                onClick={e=>e.stopPropagation()} placeholder="0"
                                style={{width:80,padding:"5px 8px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12,fontWeight:700,
                                  border:"1.5px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"white",outline:"none"}}/>
                            </span>
                          </>}
                          <span style={{color:"rgba(255,255,255,0.6)"}}>Total <strong style={{color:"#CCFBF1",fontSize:13}}>Rs.{Math.round(secTotal).toLocaleString("en-IN")}</strong></span>
                        </div>
                      </div>
                      {!sCol&&(
                        <div style={{padding:10}}>
                          {cats.length===0&&<div style={{padding:"14px",textAlign:"center",color:"#9CA3AF",fontSize:12.5}}>No categories — add via Library → Subcon Rate Card</div>}
                          {cats.map(cat=>{
                            const ck=`${sec.id}:${cat.id}`;
                            const catCol=!!pkgCatCollapsed[ck];
                            const catAOv=pkgCatAreas[ck];
                            const catArea=catAOv!=null?parseFloat(catAOv):secArea;
                            const catRows=(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name));
                            const catBase=catRows.reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0);
                            const catAddOn=catRows.reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0);
                            const catTotal=catRows.reduce((ct,r)=>{
                              const b=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                              const a=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                              const q=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                              return ct+(b+a)*q;
                            },0);
                            return(
                              <div key={ck} style={{marginBottom:10,border:"1px solid #E5E7EB",borderRadius:8,overflow:"hidden"}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#F1F5F9",borderBottom:catCol?"none":"1px solid #E5E7EB"}}>
                                  <span onClick={()=>setPkgCatCollapsed(p=>({...p,[ck]:!p[ck]}))} style={{cursor:"pointer",display:"flex"}}>
                                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                                      style={{transition:"transform .15s",transform:catCol?"rotate(0deg)":"rotate(90deg)"}}>
                                      <polyline points="9 18 15 12 9 6"/>
                                    </svg>
                                  </span>
                                  <span style={{fontWeight:700,fontSize:12.5,color:"#0F172A",flex:1}}>{cat.category_name}</span>
                                  <span style={{fontSize:10.5,color:"#94A3B8"}}>· {catRows.length} item{catRows.length===1?"":"s"}</span>
                                  <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11,fontWeight:600}}>
                                    {!perItem&&<>
                                      <span style={{color:"#64748B"}}>Base <strong style={{color:"#0F172A"}}>Rs.{Math.round(catBase).toLocaleString("en-IN")}</strong></span>
                                      <span style={{color:"#64748B"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(catAddOn).toLocaleString("en-IN")}</strong></span>
                                      <span style={{display:"flex",alignItems:"center",gap:4}}>
                                        <span style={{color:"#64748B",fontSize:10.5}}>Area</span>
                                        <input type="number" value={catAOv!=null?catAOv:""} onChange={e=>setPkgCatAreas(p=>({...p,[ck]:e.target.value===""?null:e.target.value}))}
                                          placeholder={String(secArea)}
                                          style={{width:70,padding:"4px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:11.5,fontWeight:700,
                                            border:"1.5px solid "+(catAOv?"#F59E0B":"#CBD5E1"),background:catAOv?"#FFFBEB":"white",
                                            color:catAOv?"#92400E":"#0F172A",outline:"none"}}/>
                                      </span>
                                    </>}
                                    <span style={{color:"#64748B"}}>Total <strong style={{color:"#059669"}}>Rs.{Math.round(catTotal).toLocaleString("en-IN")}</strong></span>
                                  </div>
                                </div>
                                {!catCol&&(
                                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                                    <thead>
                                      <tr style={{background:"#FAFAFA"}}>
                                        <th style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>Item</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",width:100}}>Base</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#F59E0B",textTransform:"uppercase",width:100}}>Add-on</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#0D9488",textTransform:"uppercase",width:80}}>{perItem?"Qty":"Area"}</th>
                                        <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#059669",textTransform:"uppercase",width:110}}>Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {catRows.length===0&&!(pkgAddedItems[ck]||[]).length&&<tr><td colSpan={pkgEditMode?6:5} style={{padding:"12px",textAlign:"center",color:"#9CA3AF",fontSize:12}}>No items — click + Add Item to add</td></tr>}
                                      {catRows.map((r,idx)=>{
                                        const excKey=`${sec.id}:${cat.id}:${r.item_id}`;
                                        if(pkgExcludedItems[excKey]) return null;
                                        const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                                        const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                                        const qty=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                                        const tot=(base+addOn)*qty;
                                        return(
                                          <tr key={r.item_id} style={{background:idx%2===0?"white":"#FAFAFA",borderBottom:"1px solid #F3F4F6"}}>
                                            <td style={{padding:"8px 12px",fontWeight:600,fontSize:12.5,color:"#0F172A"}}>
                                              {r.item_name||r.name}
                                              <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>{r.unit||"—"}</div>
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right"}}>
                                              {pkgEditMode?<input type="number" value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.base??""}
                                                  placeholder={String(Math.round(r.base_rate!=null?parseFloat(r.base_rate||0):parseFloat(r.rate||0)-parseFloat(r.add_on_rate||0)))}
                                                  onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{base:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                  style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,border:"1.5px solid #E5E7EB",background:"white",outline:"none"}}/>
                                                :<span style={{fontSize:12.5,fontWeight:600}}>Rs.{Math.round(base).toLocaleString("en-IN")}</span>}
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right"}}>
                                              {pkgEditMode?<input type="number" value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.addOn??""}
                                                  placeholder={String(Math.round(parseFloat(r.add_on_rate||0)))}
                                                  onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{addOn:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                  style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#F59E0B",fontWeight:600}}/>
                                                :<span style={{fontSize:12.5,fontWeight:600,color:"#F59E0B"}}>{addOn>0?`Rs.${Math.round(addOn).toLocaleString("en-IN")}`:"—"}</span>}
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#0D9488",fontWeight:600}}>
                                              {perItem&&pkgEditMode?<input type="number" value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.qty??""}
                                                  placeholder={String(parseFloat(r.qty||0))}
                                                  onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{qty:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                  style={{width:70,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#0D9488",fontWeight:700}}/>
                                                :Math.round(qty).toLocaleString("en-IN")}
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:700,color:"#059669"}}>
                                              Rs.{Math.round(tot).toLocaleString("en-IN")}
                                            </td>
                                            {/* × Delete column — only in edit mode */}
                                            {pkgEditMode&&<td style={{padding:"6px 10px",textAlign:"center"}}>
                                              <button onClick={()=>setPkgExcludedItems(p=>({...p,[excKey]:true}))}
                                                title="Remove from this WO"
                                                style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:15,lineHeight:1,padding:2}}>×</button>
                                            </td>}
                                          </tr>
                                        );
                                      })}
                                      {/* WO-added items for this category */}
                                      {(pkgAddedItems[ck]||[]).map((ai,aidx)=>{
                                        const aiRate=parseFloat(ai.rate||0);
                                        const aiQty=parseFloat(ai.qty||0);
                                        return(
                                          <tr key={`added-${aidx}`} style={{background:"#EFF6FF",borderBottom:"1px solid #BFDBFE"}}>
                                            <td style={{padding:"8px 12px",fontWeight:600,fontSize:12.5,color:"#1D4ED8"}}>
                                              {ai.name} <span style={{fontSize:9,background:"#2563EB",color:"white",borderRadius:3,padding:"1px 5px",marginLeft:4}}>NEW</span>
                                              <div style={{fontSize:10,color:"#93C5FD",marginTop:1}}>{ai.unit}</div>
                                            </td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:12.5,fontWeight:600,color:"#1D4ED8"}}>Rs.{Math.round(aiRate).toLocaleString("en-IN")}</td>
                                            <td style={{padding:"8px 12px",textAlign:"right",color:"#9CA3AF"}}>—</td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#0D9488",fontWeight:600}}>{aiQty.toLocaleString()}</td>
                                            <td style={{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:700,color:"#059669"}}>Rs.{Math.round(aiRate*aiQty).toLocaleString("en-IN")}</td>
                                            {pkgEditMode&&<td style={{padding:"6px 10px",textAlign:"center"}}>
                                              <button onClick={()=>setPkgAddedItems(p=>({...p,[ck]:(p[ck]||[]).filter((_,i)=>i!==aidx)}))}
                                                style={{background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:15,lineHeight:1,padding:2}}>×</button>
                                            </td>}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                                {/* + Add Item button — only in edit mode */}
                                {pkgEditMode&&!catCol&&(
                                  <button onClick={()=>setPkgAddItemForm({sid:sec.id,catId:cat.id,catName:cat.category_name,secName:sec.name,perItem,
                                      form:{name:"",unit:perItem?"No":"Sqft",qty:perItem?"1":"",rate:""}})}
                                    style={{width:"100%",padding:"7px",fontSize:11.5,fontWeight:700,color:"#2563EB",background:"#EFF6FF",
                                      border:"1.5px dashed #93C5FD",borderTop:"none",cursor:"pointer",borderRadius:"0 0 6px 6px",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                                    + Add Item to {cat.category_name}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* + Add Section (manual) — only in edit mode */}
                {pkgEditMode&&(
                  <button onClick={()=>{setPkgAddedSections(p=>[...p,{title:"",items:[{name:"",unit:"Sqft",qty:"",rate:""}]}]);}}
                    style={{width:"100%",padding:"10px",marginTop:4,fontSize:12,fontWeight:700,color:"#2563EB",background:"white",
                      border:"1.5px dashed #93C5FD",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    + Add New Section
                  </button>
                )}

                {/* Extra manual sections added in builder */}
                {pkgAddedSections.map((ms,msi)=>(
                  <div key={`ms-${msi}`} style={{background:"white",borderRadius:10,border:"1.5px solid #93C5FD",marginBottom:12,marginTop:8,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",background:"#1E3A5F",display:"flex",alignItems:"center",gap:10}}>
                      <input value={ms.title} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,title:e.target.value}:s))}
                        placeholder="Section name (e.g. Extra Civil Work)"
                        style={{flex:1,padding:"5px 9px",borderRadius:5,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:13,fontWeight:700,outline:"none",fontFamily:"inherit"}}/>
                      <button onClick={()=>setPkgAddedSections(p=>p.filter((_,i)=>i!==msi))}
                        style={{background:"rgba(239,68,68,0.2)",border:"1px solid #EF4444",color:"#FCA5A5",borderRadius:5,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                        × Remove Section
                      </button>
                    </div>
                    <div style={{padding:10}}>
                      <table style={{width:"100%",borderCollapse:"collapse",marginBottom:8}}>
                        <thead>
                          <tr style={{background:"#F8FAFC"}}>
                            {["Item Description","Unit","Qty","Rate","Total",""].map(h=>(
                              <th key={h} style={{padding:"6px 10px",textAlign:h==="Total"||h==="Qty"||h==="Rate"?"right":"left",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ms.items.map((it,iti)=>(
                            <tr key={iti} style={{borderBottom:"1px solid #F3F4F6"}}>
                              <td style={{padding:"6px 8px"}}><input value={it.name} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,name:e.target.value}:x)}:s))} placeholder="Item description" style={{width:"100%",padding:"5px 8px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12.5,outline:"none",fontFamily:"inherit"}}/></td>
                              <td style={{padding:"6px 8px"}}><select value={it.unit} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,unit:e.target.value}:x)}:s))} style={{padding:"5px 8px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12,background:"white",outline:"none"}}>
                                {["Sqft","Cft","No","Running Ft","Unit","Kg","Lump Sum"].map(u=><option key={u}>{u}</option>)}</select></td>
                              <td style={{padding:"6px 8px"}}><input type="number" value={it.qty} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,qty:e.target.value}:x)}:s))} placeholder="0" style={{width:70,padding:"5px 7px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12.5,textAlign:"right",outline:"none",fontFamily:"inherit"}}/></td>
                              <td style={{padding:"6px 8px"}}><input type="number" value={it.rate} onChange={e=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.map((x,j)=>j===iti?{...x,rate:e.target.value}:x)}:s))} placeholder="0" style={{width:80,padding:"5px 7px",borderRadius:4,border:"1.5px solid #E5E7EB",fontSize:12.5,textAlign:"right",outline:"none",fontFamily:"inherit"}}/></td>
                              <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:"#059669",fontSize:12.5}}>Rs.{Math.round((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0)).toLocaleString("en-IN")}</td>
                              <td style={{padding:"6px 8px",textAlign:"center"}}><button onClick={()=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:s.items.filter((_,j)=>j!==iti)}:s))} style={{background:"none",border:"none",color:"#EF4444",cursor:"pointer",fontSize:14,lineHeight:1}}>×</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <button onClick={()=>setPkgAddedSections(p=>p.map((s,i)=>i===msi?{...s,items:[...s.items,{name:"",unit:"Sqft",qty:"",rate:""}]}:s))}
                        style={{padding:"6px 14px",fontSize:11.5,fontWeight:700,color:"#2563EB",background:"#EFF6FF",border:"1.5px dashed #93C5FD",borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                        + Add Item
                      </button>
                    </div>
                  </div>
                ))}

                {pkgGrandTotal>0&&(
                  <div style={{marginTop:10,padding:"14px 20px",background:"#0F172A",color:"white",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",color:"rgba(255,255,255,0.7)"}}>Grand Total</span>
                    <span style={{fontSize:20,fontWeight:700,color:"#CCFBF1"}}>Rs.{Math.round(pkgGrandTotal).toLocaleString("en-IN")}</span>
                  </div>
                )}

                {/* Add Item modal */}
                {pkgAddItemForm&&(
                  <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setPkgAddItemForm(null)}>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)"}}/>
                    <div style={{position:"relative",width:400,maxWidth:"94vw",background:"white",borderRadius:12,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",overflow:"hidden",fontFamily:"inherit"}} onClick={e=>e.stopPropagation()}>
                      <div style={{padding:"14px 18px",background:"#0F172A",color:"white",fontSize:13,fontWeight:700}}>
                        + Add Item — {pkgAddItemForm.catName}
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:2,fontWeight:400}}>{pkgAddItemForm.secName}</div>
                      </div>
                      <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:10}}>
                        {[
                          {label:"Item Name *",key:"name",type:"text",ph:"e.g. Extra RCC Work"},
                          {label:"Unit",key:"unit",type:"select",opts:["Sqft","Cft","No","Running Ft","Unit","Kg","Lump Sum"]},
                          {label:pkgAddItemForm.perItem?"Quantity":"Qty (Area)",key:"qty",type:"number",ph:"0"},
                          {label:"Rate (₹)",key:"rate",type:"number",ph:"0"},
                        ].map(f=>(
                          <div key={f.key}>
                            <label style={{fontSize:11,fontWeight:700,color:"#64748B",display:"block",marginBottom:4,textTransform:"uppercase"}}>{f.label}</label>
                            {f.type==="select"
                              ?<select value={pkgAddItemForm.form[f.key]} onChange={e=>setPkgAddItemForm(p=>({...p,form:{...p.form,[f.key]:e.target.value}}))}
                                  style={{width:"100%",padding:"9px 12px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:13,outline:"none",background:"white",fontFamily:"inherit"}}>
                                  {f.opts.map(o=><option key={o}>{o}</option>)}
                                </select>
                              :<input type={f.type} value={pkgAddItemForm.form[f.key]} onChange={e=>setPkgAddItemForm(p=>({...p,form:{...p.form,[f.key]:e.target.value}}))}
                                  placeholder={f.ph} autoFocus={f.key==="name"}
                                  style={{width:"100%",padding:"9px 12px",borderRadius:7,border:"1.5px solid #E5E7EB",fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                            }
                          </div>
                        ))}
                      </div>
                      <div style={{padding:"12px 18px",borderTop:"1px solid #E5E7EB",display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <button onClick={()=>setPkgAddItemForm(null)} style={{padding:"8px 16px",borderRadius:7,border:"1px solid #E5E7EB",background:"#F8FAFC",fontSize:12.5,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                        <button disabled={!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate}
                          onClick={()=>{
                            const catKey=`${pkgAddItemForm.sid}:${pkgAddItemForm.catId}`;
                            setPkgAddedItems(p=>({...p,[catKey]:[...(p[catKey]||[]),{...pkgAddItemForm.form}]}));
                            setPkgAddItemForm(null);
                          }}
                          style={{padding:"8px 20px",borderRadius:7,background:!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate?"#D1D5DB":"#2563EB",
                            color:!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate?"#9CA3AF":"white",border:"none",fontSize:12.5,fontWeight:700,cursor:!pkgAddItemForm.form.name?.trim()||!pkgAddItemForm.form.rate?"not-allowed":"pointer",fontFamily:"inherit"}}>
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>)}
            </div>
          )}

          {/* ── Package / Item-wise picker (compact, shown when NOT in full builder) ── */}
          {woType!=="manual" && !pkgBuilderMode && (
            <div style={{marginBottom:14,padding:"12px 14px",background:T.surfaceB,borderRadius:8,border:`1px solid ${T.b1}`}}>
              <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>
                {woType==="package" ? "Select Rate Card Package" : "Select Items from Library"}
                {pkgSelCity && pkgSelType && <span style={{fontWeight:400,textTransform:"none",marginLeft:6,color:T.t4}}>— {pkgSelType.name} × {pkgSelCity.name}</span>}
              </div>

              {/* Type + City row */}
              <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>Construction Type</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {pkgConTypes.map(ct=>(
                      <button key={ct.id} onClick={()=>setPkgSelType(ct)} style={{
                        padding:"5px 12px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${pkgSelType?.id===ct.id?T.blu:T.b1}`,
                        background:pkgSelType?.id===ct.id?T.blu:T.surface,
                        color:pkgSelType?.id===ct.id?"white":T.t2,
                      }}>{ct.name}</button>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,minWidth:180}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>City</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {pkgCities.map(c=>(
                      <button key={c.id} onClick={()=>setPkgSelCity(c)} style={{
                        padding:"5px 12px",borderRadius:16,fontSize:12,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${pkgSelCity?.id===c.id?"#0D9488":T.b1}`,
                        background:pkgSelCity?.id===c.id?"#0D9488":T.surface,
                        color:pkgSelCity?.id===c.id?"white":T.t2,
                      }}>{c.name}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Package mode: Trade + Package picker ── */}
              {woType==="package" && pkgSelType && pkgSelCity && (<>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>Trade Category</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {TRADE_CATS.map(t=>(
                      <button key={t} onClick={()=>setPkgTrade(t)} style={{
                        padding:"4px 11px",borderRadius:16,fontSize:11.5,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${pkgTrade===t?"#7C3AED":T.b1}`,
                        background:pkgTrade===t?"#7C3AED":T.surface,
                        color:pkgTrade===t?"white":T.t3,
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                {pkgTrade && (
                  <div style={{marginBottom:pkgSelPkg?10:0}}>
                    <div style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:5}}>Rate Card</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {pkgList.map(p=>(
                        <button key={p.id} onClick={()=>setPkgSelPkg(p)} style={{
                          padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
                          border:`2px solid ${pkgSelPkg?.id===p.id?T.blu:T.b1}`,
                          background:pkgSelPkg?.id===p.id?T.bluL:T.surface,
                          color:pkgSelPkg?.id===p.id?T.blu:T.t1,
                        }}>
                          {p.name}{p.sqft_rate>0?<span style={{fontSize:10,fontWeight:500,marginLeft:5,opacity:.7}}>₹{Number(p.sqft_rate).toLocaleString()}/sqft</span>:null}
                        </button>
                      ))}
                      {pkgList.length===0 && <span style={{fontSize:11,color:T.t4}}>No packages for {pkgTrade} — add in Library → Subcon Rate Card</span>}
                    </div>
                  </div>
                )}

                {/* Section tree moved to pkgBuilderMode body above */}
                {false && pkgSelPkg && (<>
                  {/* 0-rate warning */}
                  {pkgStructures.length>0 && pkgStructures.every(sec=>(pkgSecItems[sec.id]||[]).every(r=>effR(r)===0)) && (
                    <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:8,padding:"9px 13px",marginTop:10,fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:8}}>
                      ⚠ Rates not set — go to <b>Library → Subcon Rate Card</b>, select this package, set rates and Save Rates first.
                    </div>
                  )}

                  {/* Edit Package toggle */}
                  {pkgStructures.length>0 && (
                    <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10,marginBottom:8}}>
                      <button onClick={()=>setPkgEditMode(m=>!m)}
                        style={{padding:"5px 13px",borderRadius:6,fontSize:11.5,fontWeight:700,cursor:"pointer",
                          background:pkgEditMode?"#10B981":"white",border:"1.5px solid "+(pkgEditMode?"#10B981":"#94A3B8"),
                          color:pkgEditMode?"white":"#334155",display:"flex",alignItems:"center",gap:5}}>
                        {pkgEditMode?"✓ Done Editing":"✎ Edit Package"}
                      </button>
                      <span style={{fontSize:10.5,color:T.t4}}>
                        {pkgEditMode?"Override rates / qty per item for this WO":"Click to override rates or qty"}
                      </span>
                    </div>
                  )}

                  {/* Section tree */}
                  {pkgStructures.map(sec=>{
                    const secArea   = parseFloat(pkgAreas[sec.id]||sec.default_qty||0);
                    const perItem   = !!Number(sec.per_item_qty);
                    const sCollapsed= !!pkgCollapsed[sec.id];
                    const cats      = pkgCategories.filter(c=>c.structure_id===sec.id);
                    // Section totals
                    const secBase = cats.reduce((sb,cat)=>sb+(pkgSecItems[sec.id]||[])
                      .filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name))
                      .reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0),0);
                    const secAddOn= cats.reduce((sa,cat)=>sa+(pkgSecItems[sec.id]||[])
                      .filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name))
                      .reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0),0);
                    const secTotal= cats.reduce((st,cat)=>{
                      const catAreaKey=`${sec.id}:${cat.id}`;
                      const catArea=pkgCatAreas[catAreaKey]!=null?parseFloat(pkgCatAreas[catAreaKey]):secArea;
                      return st+(pkgSecItems[sec.id]||[])
                        .filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name))
                        .reduce((ct,r)=>{
                          const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                          const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                          const qty=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                          return ct+(base+addOn)*qty;
                        },0);
                    },0);
                    const itemCount=(pkgSecItems[sec.id]||[]).length;

                    return (
                      <div key={sec.id} style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",marginBottom:12,overflow:"hidden",marginTop:8}}>
                        {/* Section header — dark */}
                        <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:"#0F172A",color:"white"}}>
                          <span onClick={()=>setPkgCollapsed(p=>({...p,[sec.id]:!p[sec.id]}))} style={{cursor:"pointer",display:"flex"}}>
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}
                              style={{transition:"transform .15s",transform:sCollapsed?"rotate(0deg)":"rotate(90deg)"}}>
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </span>
                          <span style={{fontWeight:700,fontSize:14,flex:1}}>{sec.name}</span>
                          <span style={{fontSize:11,color:"rgba(255,255,255,0.45)"}}>· {cats.length} {cats.length===1?"category":"categories"}</span>
                          {perItem && <span style={{fontSize:9,color:"#FCD34D",background:"rgba(245,158,11,0.2)",padding:"2px 7px",borderRadius:4,fontWeight:700}}>Per-item Qty</span>}
                          {/* Right: Base | AddOn | /sqft | Area | Total */}
                          <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11.5,fontWeight:600}}>
                            {!perItem&&<>
                              <span style={{color:"rgba(255,255,255,0.6)"}}>Base <strong style={{color:"white"}}>Rs.{Math.round(secBase).toLocaleString("en-IN")}</strong></span>
                              <span style={{color:"rgba(255,255,255,0.6)"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(secAddOn).toLocaleString("en-IN")}</strong></span>
                              <span style={{padding:"3px 9px",background:"#CCFBF1",color:"#0D9488",borderRadius:4,fontWeight:700}}>
                                Rs.{Math.round(secBase+secAddOn).toLocaleString("en-IN")}/sqft
                              </span>
                              <span style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{color:"rgba(255,255,255,0.55)",fontSize:11}}>Area</span>
                                <input type="number" value={pkgAreas[sec.id]||""} onChange={e=>setPkgAreas(p=>({...p,[sec.id]:e.target.value}))}
                                  onClick={e=>e.stopPropagation()} placeholder="0"
                                  style={{width:80,padding:"5px 8px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12,fontWeight:700,
                                    border:"1.5px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"white",outline:"none"}}/>
                              </span>
                            </>}
                            <span style={{color:"rgba(255,255,255,0.6)"}}>Total <strong style={{color:"#CCFBF1",fontSize:13}}>Rs.{Math.round(secTotal).toLocaleString("en-IN")}</strong></span>
                          </div>
                        </div>

                        {/* Categories */}
                        {!sCollapsed && (
                          <div style={{padding:10}}>
                            {cats.length===0 && <div style={{padding:"14px 12px",textAlign:"center",color:"#9CA3AF",fontSize:12.5}}>No categories — add via Library → Subcon Rate Card</div>}
                            {cats.map(cat=>{
                              const catKey=`${sec.id}:${cat.id}`;
                              const catCollapsed=!!pkgCatCollapsed[catKey];
                              const catAreaOverride=pkgCatAreas[catKey];
                              const catArea=catAreaOverride!=null?parseFloat(catAreaOverride):secArea;
                              const catRows=(pkgSecItems[sec.id]||[]).filter(r=>(Number(r.category_id)===Number(cat.id)||r.category_name===cat.category_name));
                              const catBase=catRows.reduce((b,r)=>b+getPkgItemBase(sec.id,cat.id,r.item_id,r),0);
                              const catAddOn=catRows.reduce((a,r)=>a+getPkgItemAddOn(sec.id,cat.id,r.item_id,r),0);
                              const catTotal=catRows.reduce((ct,r)=>{
                                const base=getPkgItemBase(sec.id,cat.id,r.item_id,r);
                                const addOn=getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                                const qty=perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                                return ct+(base+addOn)*qty;
                              },0);
                              return (
                                <div key={catKey} style={{marginBottom:10,border:"1px solid #E5E7EB",borderRadius:8,overflow:"hidden"}}>
                                  {/* Category header */}
                                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#F1F5F9",borderBottom:catCollapsed?"none":"1px solid #E5E7EB"}}>
                                    <span onClick={()=>setPkgCatCollapsed(p=>({...p,[catKey]:!p[catKey]}))} style={{cursor:"pointer",display:"flex"}}>
                                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                                        style={{transition:"transform .15s",transform:catCollapsed?"rotate(0deg)":"rotate(90deg)"}}>
                                        <polyline points="9 18 15 12 9 6"/>
                                      </svg>
                                    </span>
                                    <span style={{fontWeight:700,fontSize:12.5,color:"#0F172A",flex:1}}>{cat.category_name}</span>
                                    <span style={{fontSize:10.5,color:"#94A3B8"}}>· {catRows.length} item{catRows.length===1?"":"s"}</span>
                                    <div style={{display:"flex",gap:10,alignItems:"center",fontSize:11,fontWeight:600}}>
                                      {!perItem&&<>
                                        <span style={{color:"#64748B"}}>Base <strong style={{color:"#0F172A"}}>Rs.{Math.round(catBase).toLocaleString("en-IN")}</strong></span>
                                        <span style={{color:"#64748B"}}>Add-on <strong style={{color:"#F59E0B"}}>Rs.{Math.round(catAddOn).toLocaleString("en-IN")}</strong></span>
                                        <span style={{display:"flex",alignItems:"center",gap:4}}>
                                          <span style={{color:"#64748B",fontSize:10.5}}>Area</span>
                                          <input type="number"
                                            value={catAreaOverride!=null?catAreaOverride:""}
                                            onChange={e=>setPkgCatAreas(p=>({...p,[catKey]:e.target.value===""?null:e.target.value}))}
                                            placeholder={String(secArea)}
                                            title={catAreaOverride?`Override active — clear to inherit ${secArea} from section`:`Inherits ${secArea} from section`}
                                            style={{width:70,padding:"4px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:11.5,fontWeight:700,
                                              border:"1.5px solid "+(catAreaOverride?"#F59E0B":"#CBD5E1"),
                                              background:catAreaOverride?"#FFFBEB":"white",
                                              color:catAreaOverride?"#92400E":"#0F172A",outline:"none"}}/>
                                        </span>
                                      </>}
                                      <span style={{color:"#64748B"}}>Total <strong style={{color:"#059669"}}>Rs.{Math.round(catTotal).toLocaleString("en-IN")}</strong></span>
                                    </div>
                                  </div>

                                  {/* Item table */}
                                  {!catCollapsed && (
                                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                                      <thead>
                                        <tr style={{background:"#FAFAFA"}}>
                                          <th style={{padding:"7px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>Item</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",width:100}}>Base</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#F59E0B",textTransform:"uppercase",width:100}}>Add-on</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#0D9488",textTransform:"uppercase",width:80}}>{perItem?"Qty":"Area"}</th>
                                          <th style={{padding:"7px 12px",textAlign:"right",fontSize:10,fontWeight:700,color:"#059669",textTransform:"uppercase",width:110}}>Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {catRows.length===0 && <tr><td colSpan={5} style={{padding:"12px",textAlign:"center",color:"#9CA3AF",fontSize:12}}>No items</td></tr>}
                                        {catRows.map((r,idx)=>{
                                          const base   = getPkgItemBase(sec.id,cat.id,r.item_id,r);
                                          const addOn  = getPkgItemAddOn(sec.id,cat.id,r.item_id,r);
                                          const qty    = perItem?getPkgItemQty(sec.id,cat.id,r.item_id,r,secArea,true):catArea;
                                          const total  = (base+addOn)*qty;
                                          return (
                                            <tr key={r.item_id} style={{background:idx%2===0?"white":"#FAFAFA",borderBottom:"1px solid #F3F4F6"}}>
                                              <td style={{padding:"8px 12px",fontWeight:600,fontSize:12.5,color:"#0F172A"}}>
                                                {r.item_name||r.name}
                                                <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>{r.unit||"—"}</div>
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right"}}>
                                                {pkgEditMode
                                                  ? <input type="number"
                                                      value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.base ?? ""}
                                                      placeholder={String(Math.round(r.base_rate!=null?parseFloat(r.base_rate||0):parseFloat(r.rate||0)-parseFloat(r.add_on_rate||0)))}
                                                      onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{base:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                      style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,
                                                        border:"1.5px solid #E5E7EB",background:"white",outline:"none"}}/>
                                                  : <span style={{fontSize:12.5,fontWeight:600}}>Rs.{Math.round(base).toLocaleString("en-IN")}</span>
                                                }
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right"}}>
                                                {pkgEditMode
                                                  ? <input type="number"
                                                      value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.addOn ?? ""}
                                                      placeholder={String(Math.round(parseFloat(r.add_on_rate||0)))}
                                                      onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{addOn:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                      style={{width:90,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,
                                                        border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#F59E0B",fontWeight:600}}/>
                                                  : <span style={{fontSize:12.5,fontWeight:600,color:"#F59E0B"}}>{addOn>0?`Rs.${Math.round(addOn).toLocaleString("en-IN")}`:"—"}</span>
                                                }
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right",fontSize:12,color:"#0D9488",fontWeight:600}}>
                                                {perItem && pkgEditMode
                                                  ? <input type="number"
                                                      value={pkgItemEdits[`${sec.id}:${cat.id}:${r.item_id}`]?.qty ?? ""}
                                                      placeholder={String(parseFloat(r.qty||0))}
                                                      onChange={e=>patchPkgItem(sec.id,cat.id,r.item_id,{qty:e.target.value===""?undefined:parseFloat(e.target.value)||0})}
                                                      style={{width:70,padding:"5px 7px",borderRadius:5,textAlign:"right",fontFamily:"inherit",fontSize:12.5,
                                                        border:"1.5px solid #E5E7EB",background:"white",outline:"none",color:"#0D9488",fontWeight:700}}/>
                                                  : Math.round(qty).toLocaleString("en-IN")
                                                }
                                              </td>
                                              <td style={{padding:"8px 12px",textAlign:"right",fontSize:13,fontWeight:700,color:"#059669"}}>
                                                Rs.{Math.round(total).toLocaleString("en-IN")}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Grand Total bar */}
                  {pkgGrandTotal>0 && (
                    <div style={{marginTop:10,padding:"14px 20px",background:"#0F172A",color:"white",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",color:"rgba(255,255,255,0.7)"}}>Grand Total</span>
                      <span style={{fontSize:20,fontWeight:700,color:"#CCFBF1"}}>Rs.{Math.round(pkgGrandTotal).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </>)}
              </>)}

              {/* ── Item-wise mode: side-slide picker + picked summary ── */}
              {woType==="item_wise" && pkgSelType && pkgSelCity && (
                <div>
                  {/* Top bar: count + Browse button */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{fontSize:11,color:T.t3}}>
                      {Object.values(iwPicked).filter(q=>parseFloat(q||0)>0).length + iwManualItems.filter(it=>it.description.trim()&&parseFloat(it.rate||0)>0).length} item(s) · <span style={{color:T.grn,fontWeight:700}}>
                        {fmtC(Object.entries(iwPicked).reduce((s,[id,qty])=>{const it=iwItems.find(i=>String(i.id)===String(id));return s+(parseFloat(it?.rate||0)*parseFloat(qty||0));},0)+iwManualItems.reduce((s,it)=>s+(parseFloat(it.qty||0)*parseFloat(it.rate||0)),0))}
                      </span>
                    </div>
                    <button onClick={()=>{setIwShowPicker(true);setIwSearch("");}}
                      style={{padding:"6px 14px",borderRadius:6,background:T.blu,color:"white",border:"none",fontSize:11.5,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                      📋 Browse &amp; Pick Items
                    </button>
                  </div>

                  {/* Picked library items */}
                  {Object.keys(iwPicked).length>0 && (
                    <div style={{border:`1px solid ${T.b1}`,borderRadius:7,overflow:"hidden",marginBottom:8}}>
                      <div style={{background:"#1E293B",padding:"5px 10px",display:"grid",gridTemplateColumns:"2fr 55px 68px 80px 80px 22px",gap:5}}>
                        {["Item","Unit","Rate","Qty","Amount",""].map(h=><span key={h} style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase"}}>{h}</span>)}
                      </div>
                      {Object.entries(iwPicked).map(([id,qty])=>{
                        const item=iwItems.find(i=>String(i.id)===String(id));
                        if(!item) return null;
                        const amt=parseFloat(item.rate||0)*parseFloat(qty||0);
                        return(
                          <div key={id} style={{display:"grid",gridTemplateColumns:"2fr 55px 68px 80px 80px 22px",gap:5,padding:"7px 10px",borderTop:`1px solid ${T.b1}`,alignItems:"center",background:"white"}}>
                            <div>
                              <div style={{fontSize:11.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                              <div style={{fontSize:9.5,color:T.t4}}>{item.trade_category||""}</div>
                            </div>
                            <span style={{fontSize:11,color:T.t3}}>{item.unit}</span>
                            <span style={{fontSize:11,color:T.blu,fontWeight:600}}>₹{Number(item.rate||0).toLocaleString("en-IN")}</span>
                            <input type="number" value={qty} placeholder="Qty"
                              onChange={e=>setIwPicked(p=>({...p,[id]:e.target.value}))}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,textAlign:"right",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <span style={{fontSize:11,fontWeight:700,color:amt>0?T.grn:T.t4,textAlign:"right"}}>{amt>0?fmtC(amt):"—"}</span>
                            <button onClick={()=>setIwPicked(p=>{const n={...p};delete n[id];return n;})}
                              style={{background:"#FEE2E2",color:"#DC2626",border:"none",borderRadius:3,width:18,height:18,fontSize:12,cursor:"pointer",lineHeight:"18px",textAlign:"center",padding:0}}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual items rows */}
                  {iwManualItems.length>0 && (
                    <div style={{border:`1.5px dashed #C4B5FD`,borderRadius:7,overflow:"hidden",marginBottom:8}}>
                      <div style={{background:"#F3E8FF",padding:"5px 10px",display:"grid",gridTemplateColumns:"2fr 80px 80px 80px 80px 22px",gap:5,borderBottom:"1px solid #DDD6FE"}}>
                        {["Manual Item","Unit","Rate","Qty","Amount",""].map(h=><span key={h} style={{fontSize:8,fontWeight:700,color:"#6D28D9",textTransform:"uppercase"}}>{h}</span>)}
                      </div>
                      {iwManualItems.map((it,idx)=>{
                        const amt=parseFloat(it.qty||0)*parseFloat(it.rate||0);
                        return(
                          <div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 80px 80px 80px 80px 22px",gap:5,padding:"6px 8px",borderTop:idx>0?"1px solid #EDE9FE":"none",alignItems:"center",background:"white"}}>
                            <input type="text" value={it.description} placeholder="Item description"
                              onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],description:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <select value={it.unit||"Sqft"} onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],unit:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 5px",borderRadius:5,border:`1px solid ${T.b1}`,fontSize:11,outline:"none",background:"white",width:"100%"}}>
                              {["Sqft","Cft","No","Running Ft","Unit","Kg","Lump Sum"].map(u=><option key={u}>{u}</option>)}
                            </select>
                            <input type="number" value={it.rate} placeholder="Rate"
                              onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],rate:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,textAlign:"right",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <input type="number" value={it.qty} placeholder="Qty"
                              onChange={e=>{const a=[...iwManualItems];a[idx]={...a[idx],qty:e.target.value};setIwManualItems(a);}}
                              style={{padding:"4px 6px",borderRadius:5,border:`1.5px solid ${T.b1}`,fontSize:11,textAlign:"right",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}}/>
                            <span style={{fontSize:11,fontWeight:700,color:amt>0?"#059669":T.t4,textAlign:"right"}}>{amt>0?fmtC(amt):"—"}</span>
                            <button onClick={()=>setIwManualItems(p=>p.filter((_,i)=>i!==idx))}
                              style={{background:"#FEE2E2",color:"#DC2626",border:"none",borderRadius:3,width:18,height:18,fontSize:12,cursor:"pointer",lineHeight:"18px",textAlign:"center",padding:0}}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state */}
                  {Object.keys(iwPicked).length===0 && iwManualItems.length===0 && (
                    <div style={{textAlign:"center",padding:"18px 0",color:T.t4,fontSize:12,border:`1px dashed ${T.b1}`,borderRadius:7,marginBottom:8}}>
                      No items yet — click <b>Browse &amp; Pick Items</b> to select from library, or add manual items below.
                    </div>
                  )}

                  {/* + Manual Item button */}
                  <button onClick={()=>setIwManualItems(p=>[...p,{description:"",unit:"Sqft",qty:"",rate:""}])}
                    style={{padding:"5px 13px",fontSize:11.5,fontWeight:700,color:"#7C3AED",background:"#F3E8FF",border:"1.5px dashed #C4B5FD",borderRadius:5,cursor:"pointer"}}>
                    + Manual Item
                  </button>

                  {/* ── SIDE SLIDE PICKER ─────────────────────── */}
                  {iwShowPicker && (<>
                    <div onClick={()=>setIwShowPicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:520,backdropFilter:"blur(2px)"}}/>
                    <div style={{position:"fixed",right:0,top:0,bottom:0,width:520,maxWidth:"95vw",background:"white",zIndex:521,boxShadow:"-6px 0 36px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column",animation:"slideInRight .18s ease-out"}}>
                      {/* Picker header */}
                      <div style={{background:"#0F172A",padding:"14px 16px",flexShrink:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{fontSize:14,fontWeight:700,color:"white"}}>📋 Library Items</div>
                          <button onClick={()=>setIwShowPicker(false)}
                            style={{background:"#10B981",border:"none",color:"white",padding:"6px 14px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Done</button>
                        </div>
                        <input type="text" value={iwSearch} placeholder="Search items…" autoFocus
                          onChange={e=>setIwSearch(e.target.value)}
                          style={{width:"100%",padding:"8px 11px",borderRadius:6,border:"none",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                        <div style={{display:"flex",gap:5,marginTop:8,flexWrap:"wrap"}}>
                          {["All",...TRADE_CATS].map(t=>(
                            <button key={t} onClick={()=>setIwTradeFilter(t)} style={{
                              padding:"3px 9px",borderRadius:12,fontSize:10.5,fontWeight:600,cursor:"pointer",border:"none",
                              background:iwTradeFilter===t?"rgba(255,255,255,0.25)":"rgba(255,255,255,0.08)",
                              color:iwTradeFilter===t?"white":"rgba(255,255,255,0.5)",
                            }}>{t}</button>
                          ))}
                        </div>
                      </div>
                      {/* Picker body — category-grouped */}
                      <div style={{flex:1,overflowY:"auto"}}>
                        {iwLoading && <div style={{textAlign:"center",padding:"40px",color:"#94A3B8",fontSize:12}}>Loading…</div>}
                        {!iwLoading && (()=>{
                          const filtered=(iwTradeFilter==="All"?iwItems:iwItems.filter(i=>i.trade_category===iwTradeFilter))
                            .filter(i=>!iwSearch||i.name.toLowerCase().includes(iwSearch.toLowerCase()));
                          if(!filtered.length) return(
                            <div style={{textAlign:"center",padding:"40px 20px",color:"#94A3B8",fontSize:12}}>
                              {iwItems.length===0
                                ?`No items for ${pkgSelType?.name} × ${pkgSelCity?.name} — add in Library → Subcon Rate Card → Work Item Rates`
                                :"No items match your search"}
                            </div>
                          );
                          const cats=[...new Set(filtered.map(i=>i.trade_category||"Work Items"))];
                          return cats.map(cat=>{
                            const catItems=filtered.filter(i=>(i.trade_category||"Work Items")===cat);
                            return(
                              <div key={cat}>
                                <div style={{padding:"7px 14px",background:"#F1F5F9",fontSize:9.5,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".5px",borderBottom:"1px solid #E2E8F0",borderTop:"1px solid #E2E8F0",position:"sticky",top:0}}>
                                  {cat} <span style={{fontWeight:400,color:"#94A3B8"}}>({catItems.length})</span>
                                </div>
                                {catItems.map(item=>{
                                  const isPicked=iwPicked[item.id]!==undefined;
                                  return(
                                    <div key={item.id}
                                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:"1px solid #F1F5F9",cursor:"pointer",background:isPicked?"#EFF6FF":"white",transition:"background .1s"}}
                                      onClick={()=>{
                                        if(isPicked) setIwPicked(p=>{const n={...p};delete n[item.id];return n;});
                                        else setIwPicked(p=>({...p,[item.id]:""}));
                                      }}>
                                      <div style={{width:17,height:17,borderRadius:4,border:`2px solid ${isPicked?"#2563EB":"#CBD5E1"}`,background:isPicked?"#2563EB":"white",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                        {isPicked&&<span style={{color:"white",fontSize:11,lineHeight:1}}>✓</span>}
                                      </div>
                                      <div style={{flex:1,minWidth:0}}>
                                        <div style={{fontSize:12.5,fontWeight:isPicked?700:500,color:"#0F172A",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                                        <div style={{fontSize:10,color:"#64748B",marginTop:1}}>{item.unit} · ₹{Number(item.rate||0).toLocaleString("en-IN")}/unit</div>
                                      </div>
                                      {isPicked&&(
                                        <input type="number" value={iwPicked[item.id]||""} placeholder="Qty"
                                          onChange={e=>{e.stopPropagation();setIwPicked(p=>({...p,[item.id]:e.target.value}));}}
                                          onClick={e=>e.stopPropagation()}
                                          style={{width:72,padding:"5px 8px",borderRadius:5,border:"1.5px solid #3B82F6",fontSize:12,textAlign:"right",outline:"none",fontFamily:"inherit",background:"white"}}/>
                                      )}
                                      <div style={{fontSize:12,fontWeight:700,color:"#475569",minWidth:60,textAlign:"right"}}>
                                        ₹{Number(item.rate||0).toLocaleString("en-IN")}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {/* Picker footer */}
                      <div style={{padding:"12px 16px",background:"#0F172A",flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>
                          {Object.values(iwPicked).filter(q=>parseFloat(q||0)>0).length} selected · {fmtC(Object.entries(iwPicked).reduce((s,[id,qty])=>{const it=iwItems.find(i=>String(i.id)===String(id));return s+(parseFloat(it?.rate||0)*parseFloat(qty||0));},0))}
                        </div>
                        <button onClick={()=>setIwShowPicker(false)}
                          style={{padding:"7px 20px",borderRadius:6,background:"#10B981",color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Done Picking</button>
                      </div>
                    </div>
                  </>)}
                </div>
              )}
            </div>
          )}

          {/* Basic Info — only for manual / item-wise modes (package mode has its own info panel) */}
          {woType!=="package" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:14}}>
            <div style={{gridColumn:"1/3"}}>
              <label style={lblStyle}>Subcontractor *</label>
              <div style={{display:"flex",gap:6,alignItems:"stretch"}}>
                <input list="sc-list-wo" value={form.subcon_name}
                  onChange={e=>setForm(p=>({...p,subcon_name:e.target.value}))}
                  placeholder="Select from library or type new..."
                  style={{...inpStyle,flex:1}}/>
                <datalist id="sc-list-wo">
                  {subcons.map(s=>(
                    <option key={s.id} value={s.name}>
                      {s.trade || ""}{s.labour_strength?` • ${s.labour_strength} labour`:""}
                    </option>
                  ))}
                </datalist>
                <button type="button" onClick={()=>setShowAddSc(true)}
                  title="Add new subcontractor to master library"
                  style={{padding:"0 10px",borderRadius:6,border:`1.5px solid ${T.blu}`,background:T.bluL,color:T.blu,fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  + New
                </button>
              </div>
              {/* Labour strength chip — appears when typed name matches a library entry */}
              {matchedSubcon && (
                <div style={{marginTop:5,display:"flex",gap:6,flexWrap:"wrap",fontSize:10.5}}>
                  {matchedSubcon.trade && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:700}}>
                      {matchedSubcon.trade}
                    </span>
                  )}
                  {matchedSubcon.labour_strength > 0 && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:"#DCFCE7",color:"#15803D",fontWeight:700}}>
                      👷 {matchedSubcon.labour_strength} labour
                    </span>
                  )}
                  {matchedSubcon.phone && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:T.surfaceB,color:T.t3,fontWeight:600}}>
                      📞 {matchedSubcon.phone}
                    </span>
                  )}
                  {matchedSubcon.city && (
                    <span style={{padding:"2px 8px",borderRadius:10,background:T.surfaceB,color:T.t3,fontWeight:600}}>
                      📍 {matchedSubcon.city}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label style={lblStyle}>Category</label>
              <SearchSelect value={form.subcon_category} options={CATS}
                onChange={v=>setForm(p=>({...p,subcon_category:v}))} placeholder="Select category..."/>
            </div>
            <div>
              <label style={lblStyle}>Retention %</label>
              <input type="number" value={form.retention_pct} onChange={e=>setForm(p=>({...p,retention_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>TDS %</label>
              <input type="number" value={form.tds_pct} onChange={e=>setForm(p=>({...p,tds_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={inpStyle}/>
            </div>
          </div>
          }

          {/* Sections & Grand Total — manual / item-wise mode only */}
          {woType!=="package" && (<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:11,fontWeight:700,color:T.t2,textTransform:"uppercase",letterSpacing:".4px"}}>Sections & BOQ Items</div>
            <button onClick={addSection}
              style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              + Add Section
            </button>
          </div>

          {form.sections.map((sec,si)=>{
            const secTotal = sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0);
            return(
              <div key={si} style={{background:T.surfaceB,border:"1.5px solid "+T.b1,borderRadius:9,marginBottom:12,overflow:"hidden"}}>
                {/* Section header */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#1E293B",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                  <div onClick={()=>toggleSecCollapse(si)} style={{cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center"}}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2.5}
                      style={{transition:"transform .2s",transform:!secCollapsed[si]?"rotate(90deg)":"rotate(0deg)"}}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",minWidth:20}}>#{si+1}</span>
                  <input value={sec.title} onChange={e=>updateSection(si,"title",e.target.value)}
                    onClick={e=>e.stopPropagation()}
                    placeholder="Section name (e.g. Plinth Work, Lintel Level, Slab...)"
                    style={{flex:1,padding:"5px 9px",borderRadius:5,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"white",fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                  <span style={{fontSize:11,fontWeight:700,color:"#4ADE80",minWidth:80,textAlign:"right"}}>{fmtC(secTotal)}</span>
                  {form.sections.length>1&&(
                    <button onClick={()=>removeSection(si)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
                  )}
                </div>

                {/* Items — hidden when collapsed */}
                {!secCollapsed[si]&&(<div style={{padding:"10px 12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:5}}>
                    {["Description","Unit","Qty","Rate/Unit","Amt",""].map(h=><div key={h} style={{fontSize:8.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{h}</div>)}
                  </div>
                  {sec.items.map((it,ii)=>{
                    const amt=(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0);
                    return(
                      <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:6,alignItems:"center"}}>
                        <div style={{position:"relative"}}>
                          <input value={it.description} onChange={e=>updateItem(si,ii,"description",e.target.value)}
                            placeholder="Item description"
                            data-wo-desc={`new-${si}-${ii}`}
                            style={{...inpStyle,paddingRight:28}}/>
                          <button onClick={()=>{setShowLibFor({secIdx:si,itemIdx:ii});setLibSearch("");}}
                            title="Pick from library"
                            style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.blu,fontSize:14,lineHeight:1,padding:0}}>📚</button>
                        </div>
                        <input value={it.unit} onChange={e=>updateItem(si,ii,"unit",e.target.value)} placeholder="Sqft" style={inpStyle}/>
                        <input type="number" value={it.qty} onChange={e=>updateItem(si,ii,"qty",e.target.value)} placeholder="0" style={inpStyle}/>
                        <input type="number" value={it.rate} onChange={e=>updateItem(si,ii,"rate",e.target.value)} placeholder="0" style={inpStyle}/>
                        <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{amt>0?fmtC(amt):""}</div>
                        <button onClick={()=>removeItem(si,ii)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:15,padding:0,lineHeight:1}}>×</button>
                      </div>
                    );
                  })}
                  <button onClick={()=>addItem(si)}
                    style={{background:"none",border:"1px dashed "+T.b1,color:T.blu,cursor:"pointer",fontSize:11,fontWeight:600,padding:"5px 10px",borderRadius:5,width:"100%",marginTop:2}}>
                    + Add Item
                  </button>
                </div>)}
              </div>
            );
          })}

          {/* Grand Total */}
          <div style={{textAlign:"right",fontSize:14,fontWeight:800,color:T.grn,padding:"6px 0"}}>
            Grand Total: {fmtC(grandTotal)}
          </div>
          </>)}
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:"1px solid #E5E7EB",display:"flex",gap:8,flexShrink:0,alignItems:"center",background:"white"}}>
          {/* PDF download — only in package builder mode */}
          {pkgBuilderMode && (
            <button onClick={()=>window.print()} title="Download PDF of current view"
              style={{padding:"8px 14px",borderRadius:7,border:"1.5px solid #94A3B8",background:"white",fontSize:12,fontWeight:600,color:"#334155",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              📥 PDF
            </button>
          )}
          {/* Subtotal display */}
          {pkgBuilderMode && pkgGrandTotal>0 && (
            <span style={{fontSize:12,color:"#64748B",fontWeight:500}}>
              Subtotal: <strong style={{color:"#0F172A"}}>Rs.{Math.round(pkgGrandTotal).toLocaleString("en-IN")}</strong>
            </span>
          )}
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button onClick={onClose} style={{padding:"9px 18px",borderRadius:7,border:"1px solid #D1D5DB",background:"#F8FAFC",fontSize:12.5,fontWeight:600,color:"#374151",cursor:"pointer"}}>Cancel</button>
            <button onClick={submit} disabled={saving}
              style={{padding:"9px 22px",borderRadius:7,background:saving?"#9CA3AF":"#2563EB",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
              {saving?"Creating…":"Create Work Order"}
            </button>
          </div>
        </div>
      </div>

      {/* Add new subcontractor → master library */}
      {showAddSc && (
        <SubconLibraryFormModal
          onClose={()=>setShowAddSc(false)}
          onSaved={(newSc)=>{
            // 1. Append to local list so the datalist + chip updates immediately
            if (setSubcons) setSubcons(prev => [newSc, ...(prev || [])]);
            // 2. Auto-select the new subcontractor in the WO form
            setForm(p => ({
              ...p,
              subcon_name: newSc.name,
              // If the library entry's trade matches a WO category, prefill it
              subcon_category: (function() {
                const t = (newSc.trade || "").toLowerCase();
                const cats = ["Civil","Electrical","Plumbing","Finishing","Structural","MEP","Waterproofing","Painting","Tiling","Other"];
                return cats.find(c => t.includes(c.toLowerCase())) || p.subcon_category;
              })(),
            }));
            setShowAddSc(false);
          }}
          inpStyle={inpStyle}
          lblStyle={lblStyle}
        />
      )}

      {/* Library picker modal */}
      {showLibFor&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>setShowLibFor(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:10,width:"min(420px,92vw)",maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 50px rgba(0,0,0,0.3)"}}>
            <div style={{background:"#0F172A",padding:"10px 14px",borderRadius:"10px 10px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:"white"}}>Library — {form.subcon_category}</div>
              <button onClick={()=>setShowLibFor(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:18,cursor:"pointer"}}>×</button>
            </div>
            <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.b1}}>
              <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="Search items..."
                style={{...inpStyle,marginBottom:0}}/>
            </div>
            <div style={{flex:1,overflowY:"auto"}}>
              {filteredLib.length===0&&<div style={{padding:"20px",textAlign:"center",color:T.t4,fontSize:12}}>No items found</div>}
              {filteredLib.map(item=>(
                <div key={item.id} onClick={()=>pickLibItem(item)}
                  style={{padding:"9px 14px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{item.name}</div>
                    <div style={{fontSize:10.5,color:T.t4}}>{item.unit||"—"}</div>
                  </div>
                  {item.rate&&<div style={{fontSize:12,fontWeight:700,color:T.grn}}>₹{item.rate}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────
// SubconLibraryFormModal — inline "Add new subcontractor" form opened
// from inside NewWOModal / EditWOModal. Mirrors the field set used by
// MasterLibraryModule's SubcontractorSection so the master library
// stays consistent regardless of where the subcon was first created.
//
// POSTs to /library/subcontractors (the same endpoint MasterLibrary
// uses), then calls onSaved(newRow) so the caller can:
//   1. Append the row to its local `subcons` list (no full re-fetch)
//   2. Auto-select the new entry in the WO form
// ─────────────────────────────────────────────────────────────────────
function SubconLibraryFormModal({ onClose, onSaved, inpStyle, lblStyle }) {
  const TRADES = [
    "RCC & Civil","Electrical Work","Plumbing","Painting","Tiles & Flooring",
    "Fabrication","Carpentry","Waterproofing","False Ceiling","HVAC",
    "Landscaping","Demolition","Other",
  ];
  const [form, setForm] = useState({
    name: "", owner: "", trade: "RCC & Civil", phone: "", city: "",
    labour_strength: 0, gstin: "", status: "Active",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setErr("Firm / Company name is required"); return; }
    setSaving(true); setErr("");
    try {
      const res = await api.post("/library/subcontractors", form);
      setSaving(false);
      if (res?.success === false) { setErr(res.message || "Save failed"); return; }
      onSaved && onSaved(res.data || { ...form, id: Date.now() });
    } catch (e) {
      setSaving(false);
      setErr(e?.message || "Network error");
    }
  };

  return (
    <div onClick={onClose}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:T.surface,borderRadius:12,width:"min(560px,95vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>
        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 18px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>Add Subcontractor to Library</div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)",marginTop:1}}>Saved to master library so it appears across all projects</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {err && (
            <div style={{padding:"7px 10px",borderRadius:6,background:"#FEE2E2",color:"#B91C1C",fontSize:11.5,fontWeight:600,marginBottom:10}}>
              {err}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={lblStyle}>Firm / Company Name *</label>
              <input value={form.name} onChange={e=>upd("name", e.target.value)}
                placeholder="e.g. Raj Construction" style={inpStyle} autoFocus/>
            </div>
            <div>
              <label style={lblStyle}>Owner / Contact Person</label>
              <input value={form.owner} onChange={e=>upd("owner", e.target.value)}
                placeholder="Owner name" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Trade / Specialty *</label>
              <select value={form.trade} onChange={e=>upd("trade", e.target.value)} style={inpStyle}>
                {TRADES.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lblStyle}>Phone</label>
              <input value={form.phone} onChange={e=>upd("phone", e.target.value)}
                placeholder="+91 XXXXX XXXXX" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>City</label>
              <input value={form.city} onChange={e=>upd("city", e.target.value)}
                placeholder="Raipur" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Labour Strength</label>
              <input type="number" min={0} value={form.labour_strength || ""}
                onChange={e=>upd("labour_strength", parseInt(e.target.value) || 0)}
                placeholder="e.g. 15" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>GSTIN</label>
              <input value={form.gstin} onChange={e=>upd("gstin", e.target.value)}
                placeholder="If registered" style={inpStyle}/>
            </div>
            <div>
              <label style={lblStyle}>Status</label>
              <select value={form.status} onChange={e=>upd("status", e.target.value)} style={inpStyle}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid "+T.b1,display:"flex",gap:8}}>
          <button onClick={onClose}
            style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || !form.name.trim()}
            style={{flex:2,padding:"9px",borderRadius:7,background:(saving||!form.name.trim())?T.t4:T.blu,color:"white",border:"none",fontSize:13,fontWeight:700,cursor:(saving||!form.name.trim())?"not-allowed":"pointer"}}>
            {saving ? "Saving…" : "Save & Use"}
          </button>
        </div>
      </div>
    </div>
  );
}


function EditWOModal({ wo, subcons, fmtC, inpStyle, lblStyle, onClose, onSaved }) {
  const CATS = ["Civil","Electrical","Plumbing","Finishing","Structural","MEP","Waterproofing","Painting","Tiling","Other"];
  const blankItem = () => ({ description:"", unit:"", qty:"", rate:"", isNew:true });
  const blankSection = () => ({ id: null, title:"", items:[blankItem()], isNew:true });

  const [form, setForm] = useState({
    subcon_name: wo.subcon_name||"",
    subcon_category: wo.subcon_category||"Civil",
    description: wo.description||"",
    retention_pct: wo.retention_pct||5,
    tds_pct: wo.tds_pct||2,
    start_date: wo.start_date ? wo.start_date.split("T")[0] : "",
    end_date: wo.end_date ? wo.end_date.split("T")[0] : "",
    status: wo.status||"Active",
  });
  const [sections, setSections] = useState([]);
  const [loadingSecs, setLoadingSecs] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [secCollapsed, setSecCollapsed] = useState({});
  const [libItems, setLibItems] = useState([]);
  const [showLibFor, setShowLibFor] = useState(null);
  const [libSearch, setLibSearch] = useState("");

  useEffect(()=>{
    api.get("/subcon/work-orders/"+wo.id).then(r=>{
      if(r.success){
        const secs = (r.data.sections||[]).map(s=>({
          ...s, items: (s.items||[]).map(it=>({...it, isNew:false})), isNew:false
        }));
        setSections(secs);
      }
      setLoadingSecs(false);
    }).catch(()=>setLoadingSecs(false));
    api.get("/library/materials").then(r=>{ if(r.success) setLibItems(r.data||[]); }).catch(()=>{});
  },[wo.id]);

  // Section helpers
  const addSection = () => setSections(p=>[...p, blankSection()]);
  const removeSection = (si) => setSections(p=>p.filter((_,i)=>i!==si));
  const updateSection = (si,key,val) => setSections(p=>p.map((s,i)=>i===si?{...s,[key]:val}:s));
  const addItem = (si) => {
    setSections(p=>p.map((s,i)=>i===si?{...s,items:[...s.items,blankItem()]}:s));
    // Auto-focus new description input — keyboard-friendly (same UX as
    // NewWOModal). Defers to setTimeout so the row is in the DOM first.
    setTimeout(() => {
      const sec = sections[si];
      if (!sec) return;
      const newIdx = sec.items.length;
      const el = document.querySelector(`[data-wo-desc="edit-${si}-${newIdx}"]`);
      if (el) el.focus();
    }, 0);
  };
  const removeItem = (si,ii) => setSections(p=>p.map((s,i)=>i===si?{...s,items:s.items.filter((_,j)=>j!==ii)}:s));
  const updateItem = (si,ii,key,val) => setSections(p=>p.map((s,i)=>i===si?{...s,items:s.items.map((it,j)=>j===ii?{...it,[key]:val}:it)}:s));
  const pickLibItem = (item) => {
    if(!showLibFor) return;
    const {si,ii} = showLibFor;
    updateItem(si,ii,"description",item.name);
    updateItem(si,ii,"unit",item.unit||"");
    updateItem(si,ii,"rate",item.rate||"");
    setShowLibFor(null); setLibSearch("");
  };

  const grandTotal = sections.reduce((st,sec)=>st+sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0),0);

  const submit = async () => {
    if(!form.subcon_name) return alert("Subcontractor required");
    if(!reason.trim()) return alert("Change reason required for approval");
    const validSecs = sections.filter(s=>s.title.trim());
    setSaving(true);
    const res = await api.post("/subcon/work-orders/"+wo.id+"/amendment",{
      proposed_form: form,
      proposed_sections: validSecs.map(s=>({
        id: s.id||null,
        title: s.title,
        items: s.items.filter(i=>i.description&&i.qty&&i.rate).map(i=>({
          id: i.id||null,
          description:i.description, unit:i.unit||"", qty:parseFloat(i.qty), rate:parseFloat(i.rate)
        }))
      })),
      reason,
    }).catch(()=>({success:false,message:"Network error"}));
    setSaving(false);
    if(res.success){
      api.post("/approvals/submit", {
        module: "Subcon WO Amendment",
        ref_id: res.data.id,
        ref_no: res.data.amendment_no || wo.wo_number || "",
        title: (form.subcon_name||"") + " - WO Amendment",
        amount: grandTotal || 0,
        project_id: wo.project_id || projectId,
        project_name: wo.project_name || "",
        notes: reason || "",
      }).catch(e => console.error("Approval submit:", e));
      apiCache.refreshApprovals();  // pre-warm badge
      onSaved();
    }
    else alert(res.message||"Failed");
  };

  const filteredLib = libItems.filter(i=>!libSearch||i.name.toLowerCase().includes(libSearch.toLowerCase()));

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:12,width:"min(800px,97vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.35)"}}>

        {/* Header */}
        <div style={{background:"#0F172A",padding:"13px 18px",borderRadius:"12px 12px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"white"}}>Edit Work Order</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginTop:2}}>Changes will require admin approval before applying</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:22,cursor:"pointer",lineHeight:1}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:16}}>

          {/* Basic Info */}
          <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Basic Details</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:16,background:T.surfaceB,padding:12,borderRadius:8,border:"1px solid "+T.b1}}>
            <div style={{gridColumn:"1/3"}}>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Subcontractor *</label>
              <input list="sc-edit-list" value={form.subcon_name} onChange={e=>setForm(p=>({...p,subcon_name:e.target.value}))} style={inpStyle}/>
              <datalist id="sc-edit-list">{subcons.map(s=><option key={s.id} value={s.name}/>)}</datalist>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Category</label>
              <SearchSelect value={form.subcon_category} options={CATS}
                onChange={v=>setForm(p=>({...p,subcon_category:v}))} placeholder="Select category..."/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Status</label>
              <SearchSelect value={form.status} options={["Active","On Hold","Completed","Cancelled"]}
                onChange={v=>setForm(p=>({...p,status:v}))} placeholder="Select status..."/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Retention %</label>
              <input type="number" value={form.retention_pct} onChange={e=>setForm(p=>({...p,retention_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>TDS %</label>
              <input type="number" value={form.tds_pct} onChange={e=>setForm(p=>({...p,tds_pct:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setForm(p=>({...p,start_date:e.target.value}))} style={inpStyle}/>
            </div>
            <div>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>End Date</label>
              <input type="date" value={form.end_date} onChange={e=>setForm(p=>({...p,end_date:e.target.value}))} style={inpStyle}/>
            </div>
            <div style={{gridColumn:"1/4"}}>
              <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Description / Remark</label>
              <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={inpStyle} placeholder="Optional"/>
            </div>
          </div>

          {/* Sections & BOQ */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".5px"}}>
              Sections & BOQ Items
              <span style={{marginLeft:8,fontSize:10,fontWeight:700,color:T.grn}}>Grand Total: {fmtC(grandTotal)}</span>
            </div>
            <button onClick={addSection}
              style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
              + Add Section
            </button>
          </div>

          {loadingSecs&&<div style={{textAlign:"center",padding:"20px",color:T.t4,fontSize:12}}>Loading sections...</div>}

          {sections.map((sec,si)=>{
            const secTotal = sec.items.reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0);
            const isOpen = !secCollapsed[si];
            return(
              <div key={si} style={{background:T.surfaceB,border:"1.5px solid "+(sec.isNew?T.blu:T.b1),borderRadius:9,marginBottom:10,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#1E293B",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                  <div onClick={()=>setSecCollapsed(p=>({...p,[si]:!p[si]}))} style={{cursor:"pointer",flexShrink:0}}>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={2.5}
                      style={{transition:"transform .2s",transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                  {sec.isNew&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#1D4ED8",color:"white"}}>NEW</span>}
                  <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",minWidth:20}}>#{si+1}</span>
                  <input value={sec.title} onChange={e=>updateSection(si,"title",e.target.value)}
                    onClick={e=>e.stopPropagation()}
                    placeholder="Section name..."
                    style={{flex:1,padding:"5px 9px",borderRadius:5,border:"1px solid rgba(255,255,255,0.15)",background:"rgba(255,255,255,0.08)",color:"white",fontSize:12.5,outline:"none",fontFamily:"inherit"}}/>
                  <span style={{fontSize:11,fontWeight:700,color:"#4ADE80",minWidth:80,textAlign:"right"}}>{fmtC(secTotal)}</span>
                  <button onClick={()=>removeSection(si)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
                </div>

                {isOpen&&(<div style={{padding:"10px 12px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:5}}>
                    {["Description","Unit","Qty","Rate/Unit","Amt",""].map(h=><div key={h} style={{fontSize:8.5,color:T.t4,fontWeight:700,textTransform:"uppercase"}}>{h}</div>)}
                  </div>
                  {sec.items.map((it,ii)=>{
                    const amt=(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0);
                    return(
                      <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 34px 28px",gap:6,marginBottom:6,alignItems:"center",
                        background:it.isNew?"#EFF6FF":"transparent",borderRadius:it.isNew?4:0,padding:it.isNew?"2px 4px":"0"}}>
                        <div style={{position:"relative"}}>
                          <input value={it.description} onChange={e=>updateItem(si,ii,"description",e.target.value)}
                            placeholder="Item description"
                            data-wo-desc={`edit-${si}-${ii}`}
                            style={{...inpStyle,paddingRight:28}}/>
                          <button onClick={()=>{setShowLibFor({si,ii});setLibSearch("");}}
                            style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.blu,fontSize:14,lineHeight:1,padding:0}}>📚</button>
                        </div>
                        <input value={it.unit} onChange={e=>updateItem(si,ii,"unit",e.target.value)} placeholder="Sqft" style={inpStyle}/>
                        <input type="number" value={it.qty} onChange={e=>updateItem(si,ii,"qty",e.target.value)} placeholder="0" style={inpStyle}/>
                        <input type="number" value={it.rate} onChange={e=>updateItem(si,ii,"rate",e.target.value)} placeholder="0" style={inpStyle}/>
                        <div style={{fontSize:11,fontWeight:700,color:T.grn,textAlign:"right"}}>{amt>0?fmtC(amt):""}</div>
                        <button onClick={()=>removeItem(si,ii)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:15,padding:0,lineHeight:1}}>×</button>
                      </div>
                    );
                  })}
                  <button onClick={()=>addItem(si)}
                    style={{background:"none",border:"1px dashed "+T.b1,color:T.blu,cursor:"pointer",fontSize:11,fontWeight:600,padding:"5px 10px",borderRadius:5,width:"100%",marginTop:2}}>
                    + Add Item
                  </button>
                </div>)}
              </div>
            );
          })}

          {/* Change Reason */}
          <div style={{marginTop:14,background:"#FFF7ED",border:"1.5px solid #FED7AA",borderRadius:8,padding:12}}>
            <div style={{fontSize:10,fontWeight:700,color:"#92400E",textTransform:"uppercase",marginBottom:6}}>⚠ Change Reason (Required for Approval)</div>
            <textarea value={reason} onChange={e=>setReason(e.target.value)}
              placeholder="Reason for this change (e.g. Scope change — added FF slab work, rate revision approved by PM...)"
              style={{width:"100%",minHeight:60,padding:"8px 10px",borderRadius:6,border:"1.5px solid #FED7AA",fontSize:12,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",background:"white"}}/>
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 16px",borderTop:"1px solid "+T.b1,display:"flex",gap:8,flexShrink:0,background:T.surfaceB}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={submit} disabled={saving||!reason.trim()}
            style={{flex:2,padding:"9px",borderRadius:7,background:saving||!reason.trim()?T.t4:"#D97706",color:"white",border:"none",fontSize:13,fontWeight:700,cursor:saving||!reason.trim()?"not-allowed":"pointer"}}>
            {saving?"Submitting...":"Submit for Approval"}
          </button>
        </div>

        {/* Library picker */}
        {showLibFor&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.3)",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{background:T.surface,borderRadius:10,width:"min(400px,94vw)",maxHeight:"70vh",display:"flex",flexDirection:"column",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.b1,display:"flex",gap:8,alignItems:"center"}}>
                <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} autoFocus
                  placeholder="Search materials..." style={{...inpStyle,flex:1}}/>
                <button onClick={()=>setShowLibFor(null)} style={{background:"none",border:"none",color:T.t3,cursor:"pointer",fontSize:18}}>×</button>
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {filteredLib.map(item=>(
                  <div key={item.id} onClick={()=>pickLibItem(item)}
                    style={{padding:"9px 14px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F0F9FF"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{item.name}</div>
                      <div style={{fontSize:10,color:T.t4}}>{item.unit} · {item.category_name}</div>
                    </div>
                    {item.rate&&<div style={{fontSize:12,fontWeight:700,color:T.grn}}>₹{item.rate}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AmendmentsTab({ amendments, fmtC, onRefresh }) {
  const [actioning, setActioning] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const action = async (id, status) => {
    setActioning(id+status);
    await api.patch("/subcon/amendments/"+id+"/action", {status}).catch(()=>{});
    setActioning(null);
    onRefresh();
  };

  if(amendments.length===0) return(
    <div style={{textAlign:"center",padding:"48px 20px",color:T.t4}}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{margin:"0 auto 10px",display:"block"}}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <div style={{fontSize:13,color:T.t3}}>No amendments yet</div>
      <div style={{fontSize:11,color:T.t4,marginTop:4}}>Edit WO pe click karo changes propose karne ke liye</div>
    </div>
  );

  return(
    <div>
      {amendments.map(a=>{
        const stC = a.status==="Approved"?T.grn:a.status==="Rejected"?T.red:T.amb;
        const isExp = expandedId===a.id;
        let proposed = {};
        try { proposed = typeof a.proposed_data==="string" ? JSON.parse(a.proposed_data) : a.proposed_data; } catch(e){}
        return(
          <div key={a.id} style={{border:"1px solid "+T.b1,borderRadius:8,marginBottom:8,overflow:"hidden",borderLeft:"3px solid "+stC}}>
            <div onClick={()=>setExpandedId(isExp?null:a.id)}
              style={{padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surfaceB}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T.t1}}>Amendment #{a.id}</div>
                <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>{a.reason}</div>
                <div style={{fontSize:10,color:T.t4,marginTop:2}}>{a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit",hour:"2-digit",minute:"2-digit"}) : "—"}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stC+"22",color:stC}}>{a.status}</span>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth={2.5}
                  style={{transform:isExp?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {isExp&&(
              <div style={{padding:"12px 14px",borderTop:"1px solid "+T.b1}}>
                {/* Proposed basic changes */}
                {proposed.proposed_form&&(
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>Proposed Changes</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {[
                        {l:"Subcontractor",v:proposed.proposed_form.subcon_name},
                        {l:"Category",v:proposed.proposed_form.subcon_category},
                        {l:"Status",v:proposed.proposed_form.status},
                        {l:"Retention",v:proposed.proposed_form.retention_pct+"%"},
                        {l:"TDS",v:proposed.proposed_form.tds_pct+"%"},
                        {l:"Start",v:proposed.proposed_form.start_date||"—"},
                      ].map(f=>(
                        <div key={f.l} style={{background:T.surfaceB,borderRadius:5,padding:"6px 8px"}}>
                          <div style={{fontSize:9,color:T.t4,textTransform:"uppercase"}}>{f.l}</div>
                          <div style={{fontSize:11,fontWeight:600,color:T.t1}}>{f.v||"—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Sections summary */}
                {proposed.proposed_sections&&proposed.proposed_sections.length>0&&(
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.t3,textTransform:"uppercase",marginBottom:6}}>Sections ({proposed.proposed_sections.length})</div>
                    {proposed.proposed_sections.map((sec,si)=>{
                      const secTotal = (sec.items||[]).reduce((s,it)=>s+(parseFloat(it.qty)||0)*(parseFloat(it.rate)||0),0);
                      return(
                        <div key={si} style={{background:T.surfaceB,border:"1px solid "+T.b1,borderRadius:6,marginBottom:6,overflow:"hidden"}}>
                          <div style={{padding:"6px 10px",background:"#1E293B",display:"flex",justifyContent:"space-between"}}>
                            <span style={{fontSize:11,fontWeight:700,color:"white"}}>{si+1}. {sec.title}</span>
                            <span style={{fontSize:11,fontWeight:700,color:"#4ADE80"}}>{fmtC(secTotal)}</span>
                          </div>
                          {(sec.items||[]).map((it,ii)=>(
                            <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 60px 70px 80px 80px",padding:"5px 10px",gap:6,borderBottom:"1px solid "+T.b1,fontSize:11}}>
                              <span style={{color:T.t1}}>{it.description}</span>
                              <span style={{color:T.t3}}>{it.unit}</span>
                              <span style={{color:T.t2,textAlign:"right"}}>{it.qty}</span>
                              <span style={{color:T.t2,textAlign:"right"}}>{fmtC(it.rate)}</span>
                              <span style={{fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtC((parseFloat(it.qty)||0)*(parseFloat(it.rate)||0))}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Approve/Reject buttons */}
                {a.status==="Pending"&&(
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>action(a.id,"Rejected")} disabled={!!actioning}
                      style={{flex:1,padding:"7px",borderRadius:6,border:"1px solid "+T.red,background:"white",color:T.red,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      ✕ Reject
                    </button>
                    <button onClick={()=>action(a.id,"Approved")} disabled={!!actioning}
                      style={{flex:2,padding:"7px",borderRadius:6,background:actioning?T.t4:T.grn,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      {actioning===a.id+"Approved"?"Applying...":"✓ Approve & Apply"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WoItemsTable({ woId, fmtC }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState({});
  useEffect(()=>{
    setLoading(true);
    api.get("/subcon/work-orders/"+woId).then(r=>{
      if(r.success) setSections(r.data.sections||[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[woId]);

  const toggleSec = (id) => setCollapsed(p=>({...p,[id]:!p[id]}));

  if(loading) return <div style={{textAlign:"center",padding:"60px 0",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>;
  if(sections.length===0) return <div style={{textAlign:"center",padding:"24px",color:T.t4,fontSize:12}}>No BOQ items</div>;

  const grandTotal = sections.reduce((st,sec)=>st+(sec.items||[]).reduce((s,it)=>s+parseFloat(it.amount||0),0),0);

  return(
    <div>
      {sections.map((sec,si)=>{
        const secTotal = (sec.items||[]).reduce((s,it)=>s+parseFloat(it.amount||0),0);
        const isOpen = !collapsed[sec.id];
        return(
          <div key={sec.id} style={{marginBottom:8,border:"1px solid "+T.b1,borderRadius:8,overflow:"hidden"}}>
            {/* Section header — clickable to collapse */}
            <div onClick={()=>toggleSec(sec.id)}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:"#1E293B",cursor:"pointer",userSelect:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {/* Chevron */}
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5}
                  style={{transition:"transform .2s",transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span style={{fontSize:12.5,fontWeight:700,color:"white"}}>{si+1}. {sec.title}</span>
                <span style={{fontSize:9.5,color:"rgba(255,255,255,0.4)",fontWeight:400}}>{(sec.items||[]).length} items</span>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:"#4ADE80"}}>{fmtC(secTotal)}</span>
            </div>
            {/* Items — hidden when collapsed */}
            {isOpen&&(<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 90px",background:"#374151",padding:"5px 12px",gap:8}}>
                {["Description","Unit","Qty","Rate","Amount"].map((h,i)=>(
                  <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.4)",textTransform:"uppercase",textAlign:i>1?"right":"left"}}>{h}</div>
                ))}
              </div>
              {(sec.items||[]).map((it,i)=>(
                <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 90px 90px",padding:"7px 12px",gap:8,borderBottom:"1px solid "+T.b1,background:i%2===0?T.surface:"#F8FAFC"}}>
                  <div style={{fontSize:12,color:T.t1}}>{it.description}</div>
                  <div style={{fontSize:11,color:T.t3}}>{it.unit}</div>
                  <div style={{fontSize:12,color:T.t2,textAlign:"right"}}>{it.qty}</div>
                  <div style={{fontSize:12,color:T.t2,textAlign:"right"}}>{fmtC(it.rate)}</div>
                  <div style={{fontSize:12,fontWeight:700,color:T.grn,textAlign:"right"}}>{fmtC(it.amount)}</div>
                </div>
              ))}
            </>)}
          </div>
        );
      })}
      <div style={{textAlign:"right",fontSize:13,fontWeight:800,color:T.grn,padding:"6px 0"}}>
        Grand Total: {fmtC(grandTotal)}
      </div>
    </div>
  );
}

// Small helper — async-fetches a WO's items and renders them as <option> nodes.
// Used by the Set Milestones modal's WO Item dropdown.
function WoItemOptions({ woId, fmtC }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/subcon/work-orders/"+woId).then(r => {
      if (r.success) {
        const all = [];
        (r.data.sections||[]).forEach(s => (s.items||[]).forEach(it => all.push(it)));
        (r.data.unsectioned||[]).forEach(it => all.push(it));
        setItems(all);
      }
    }).catch(()=>{});
  }, [woId]);
  return items.map(it => (
    <option key={it.id} value={it.id}>{it.description} ({fmtC(it.rate)}/{it.unit||"-"}, qty {it.qty})</option>
  ));
}

function NewRaBillModal({ wo, milestones, fmtC, inpStyle, lblStyle, saving, onClose, onSave }) {
  const woId   = wo?.id;
  const method = wo?.billing_method || "manual";
  const retPct = parseFloat(wo?.retention_pct || 5);
  const tdsPct = parseFloat(wo?.tds_pct || 2);

  // ── Form state ─────────────────────────────────────────────────────────
  const [billDate,      setBillDate]      = useState(localYMD());
  const [remark,        setRemark]        = useState("");
  const [overBillMode,  setOverBillMode]  = useState(false);
  const [overBillReason,setOverBillReason]= useState("");
  const [pickedItems,   setPickedItems]   = useState({}); // {[ms_id or item_id]: {checked, cumulative_qty}}

  // ── Data state ─────────────────────────────────────────────────────────
  const [billingLedger, setBillingLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [sections,      setSections]      = useState([]);  // manual mode
  const [cumQtys,       setCumQtys]       = useState({});  // manual mode

  useEffect(() => {
    if (!woId) return;
    if (method === "milestone_rate" || method === "milestone_percent") {
      // Load billing ledger for ledger-aware UI
      setLedgerLoading(true);
      api.get("/subcon/wo/" + woId + "/billing-ledger")
        .then(r => { if (r?.success) setBillingLedger(r.data); })
        .catch(() => {})
        .finally(() => setLedgerLoading(false));
    } else {
      // Manual: load WO items + prev cumulative
      setLedgerLoading(true);
      api.get("/subcon/work-orders/" + woId).then(async r => {
        if (!r.success) { setLedgerLoading(false); return; }
        const secs = r.data.sections || [];
        const unsec = r.data.unsectioned || [];
        const allItems = [...secs.flatMap(s => s.items||[]), ...unsec];
        const pr = await api.get("/subcon/prev-cumulative-bulk?wo_id=" + woId).catch(() => ({success:false}));
        const prevMap = {};
        const serverMap = pr?.data?.prev_cum || {};
        for (const it of allItems) prevMap[it.id] = parseFloat(serverMap[it.id]||0)||0;
        const builtSecs = secs.map(s => ({ ...s, items: (s.items||[]).map(it => ({...it, prev_cum: prevMap[it.id]||0})) }));
        if (unsec.length) builtSecs.push({ title:"Other Items", items: unsec.map(it=>({...it,prev_cum:prevMap[it.id]||0})) });
        setSections(builtSecs);
        const initCums = {};
        allItems.forEach(it => { initCums[it.id] = String(prevMap[it.id]||""); });
        setCumQtys(initCums);
      }).catch(()=>{}).finally(()=>setLedgerLoading(false));
    }
  }, [woId, method]);

  // ── Live gross calculation ─────────────────────────────────────────────
  let gross = 0;
  if (method === "manual") {
    gross = sections.reduce((st, sec) => st + sec.items.reduce((s, it) => {
      const cum = parseFloat(cumQtys[it.id]||0);
      return s + Math.max(0, cum - (it.prev_cum||0)) * parseFloat(it.rate||0);
    }, 0), 0);
  } else if (method === "milestone_rate" && billingLedger?.mode === "milestone_rate") {
    for (const it of (billingLedger.items || [])) {
      for (const m of (it.milestones || [])) {
        const p = pickedItems[m.milestone_id];
        if (!p?.checked) continue;
        const thisQty = Math.max(0, parseFloat(p.this_qty || 0));
        gross += thisQty * (Number(m.rate) || 0);
      }
    }
  } else if (method === "milestone_percent" && billingLedger?.mode === "milestone_percent") {
    for (const s of (billingLedger.stages || [])) {
      if (pickedItems[s.milestone_id]?.checked) gross += Number(s.planned_amount) || 0;
    }
  }
  const grossR  = Math.round(gross * 100) / 100;
  const retAmt  = Math.round(grossR * retPct) / 100;
  const tdsAmt  = Math.round(grossR * tdsPct) / 100;
  const netPay  = Math.round((grossR - retAmt - tdsAmt) * 100) / 100;

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (overBillMode && !overBillReason.trim()) {
      alert("Over-Billing mode is ON. Please add a reason — it's compulsory for audit trail.");
      return;
    }
    if (method === "manual") {
      const items = sections.flatMap(sec => sec.items.map(it => ({
        wo_item_id: it.id,
        cumulative_qty: parseFloat(cumQtys[it.id]||0),
        rate: parseFloat(it.rate),
      })));
      onSave({ bill_date: billDate, remark, items, over_bill_mode: 0, over_bill_reason: "" });
      return;
    }
    if (method === "milestone_percent") {
      const items = [];
      for (const s of (billingLedger?.stages || [])) {
        if (pickedItems[s.milestone_id]?.checked) items.push({ milestone_id: s.milestone_id });
      }
      onSave({ bill_date: billDate, remark, items, over_bill_mode: 0, over_bill_reason: "" });
      return;
    }

    // ── milestone_rate: auto-split into normal + over-bill (mirrors Estimate exactly) ──
    // For each picked milestone, compute normal vs over portions.
    // CASE B: only normal → single call
    // CASE C: only over   → single over-bill call (over_bill_mode=1)
    // CASE D: both        → 2 calls; second linked to first
    const normalItems = [];
    const overItems   = [];
    for (const it of (billingLedger?.items || [])) {
      for (const m of (it.milestones || [])) {
        const p = pickedItems[m.milestone_id];
        if (!p?.checked) continue;
        const prevBilledMs = Number(m.billed_qty) || 0;
        const remainingQty = Number(m.remaining_qty) || 0;
        const thisQty      = Math.max(0, parseFloat(p.this_qty || 0));
        const normalQ      = Math.min(thisQty, Math.max(0, remainingQty));
        const overQ        = Math.max(0, thisQty - Math.max(0, remainingQty));
        if (normalQ > 0) normalItems.push({ milestone_id: m.milestone_id, cumulative_qty: prevBilledMs + normalQ });
        if (overQ   > 0) overItems.push({   milestone_id: m.milestone_id, cumulative_qty: prevBilledMs + normalQ + overQ });
      }
    }

    if (normalItems.length === 0 && overItems.length === 0) {
      alert("Nothing to bill — enter qty for at least one milestone.");
      return;
    }

    onSave({
      bill_date: billDate, remark,
      normalItems, overItems,
      over_bill_mode: overBillMode ? 1 : 0,
      over_bill_reason: overBillReason.trim(),
      _isSplit: true,
    });
  };

  const inpS = { ...inpStyle };
  const lblS = { ...lblStyle };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:12,width:"min(760px,96vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>

        {/* ── Header ── */}
        <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontSize:15,fontWeight:700,color:T.t1}}>New RA Bill (from milestones)</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>

          {/* ── Date + Remark ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,marginBottom:14}}>
            <div>
              <label style={lblS}>Bill Date *</label>
              <input type="date" value={billDate} onChange={e=>setBillDate(e.target.value)} style={inpS}/>
            </div>
            <div>
              <label style={lblS}>Remark</label>
              <input value={remark} onChange={e=>setRemark(e.target.value)} style={inpS} placeholder="e.g. Bill for plinth work completion…"/>
            </div>
          </div>

          {/* ── Over-Billing Mode toggle (mirrors Estimate exactly) ── */}
          {(method === "milestone_rate" || method === "manual") && (
            <div style={{marginBottom:14,padding:"10px 12px",borderRadius:7,
              background: overBillMode ? "#FEF2F2" : T.surfaceB,
              border:"1px solid "+(overBillMode?"#FCA5A5":T.b1)}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:overBillMode?"#991B1B":T.t1}}>
                    {overBillMode ? "⚠ OVER-BILLING MODE ENABLED" : "Normal billing mode"}
                  </div>
                  <div style={{fontSize:10.5,color:overBillMode?"#991B1B":T.t3,marginTop:2,lineHeight:1.45}}>
                    {overBillMode
                      ? "Fully-billed milestones selectable. Qty can exceed WO item qty. Reason compulsory."
                      : "WO-capped. Click toggle if extra work / site change needs over-billing."}
                  </div>
                </div>
                <button onClick={()=>{ setOverBillMode(p=>!p); if(overBillMode) setOverBillReason(""); }}
                  style={{padding:"6px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",
                    background:overBillMode?"#DC2626":T.bluL,color:overBillMode?"white":T.blu}}>
                  {overBillMode ? "Turn OFF" : "+ Over-Billing"}
                </button>
              </div>
              {overBillMode && (
                <div style={{marginTop:10}}>
                  <label style={{...lblS,color:"#991B1B",fontWeight:700}}>
                    Reason <span style={{color:"#DC2626"}}>*</span> <span style={{fontWeight:400,fontSize:10}}>(compulsory — shown on bill + audit trail)</span>
                  </label>
                  <textarea value={overBillReason} onChange={e=>setOverBillReason(e.target.value)}
                    placeholder="e.g. Extra work due to design change — client approval dated 28-May-2026"
                    rows={2}
                    style={{...inpS,minHeight:50,resize:"vertical",fontFamily:"inherit",borderColor:overBillReason.trim()?T.b1:"#FCA5A5"}}/>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
                    {["Extra work due to design change","Site condition change","Client requested addition","Material wastage compensation"].map(t=>(
                      <button key={t} onClick={()=>setOverBillReason(p=>p?p:t)}
                        style={{padding:"3px 8px",fontSize:9.5,fontWeight:600,background:"white",color:"#991B1B",border:"1px solid #FCA5A5",borderRadius:4,cursor:"pointer"}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {ledgerLoading && <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12}}>Loading billing ledger…</div>}

          {/* ── MILESTONE RATE — ledger-aware per-item + per-milestone ── */}
          {!ledgerLoading && method === "milestone_rate" && billingLedger?.mode === "milestone_rate" && (() => {
            const overbillOK = overBillMode;
            const allLedgerItems = billingLedger.items || [];
            if (!allLedgerItems.length) return (
              <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12,background:T.surfaceB,borderRadius:7}}>
                No milestones set yet. Close and use <b>+ Set Schedule → Item-wise</b>.
              </div>
            );

            // Match ledger items back to WO sections for grouping
            const ledgerById = {};
            for (const it of allLedgerItems) ledgerById[it.item_id] = it;

            // Build section groups from milestones prop (has sections) or flat
            const wsSections = wo?.sections || [];
            const wsUnsec    = wo?.unsectioned || [];

            const renderItemBlock = (ledgerItem) => {
              if (!ledgerItem) return null;
              const milestoneRows = ledgerItem.milestones || [];
              const pctBilled = ledgerItem.total_planned > 0
                ? Math.min(100, (ledgerItem.total_billed / ledgerItem.total_planned) * 100) : 0;
              return (
                <div key={ledgerItem.item_id} style={{marginBottom:12,border:"1px solid "+T.b1,borderRadius:7,background:"white",overflow:"hidden"}}>
                  {/* Item header */}
                  <div style={{padding:"8px 12px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{ledgerItem.description}</span>
                      <span style={{fontSize:10.5,color:T.t3}}>
                        Planned <b style={{color:T.t1}}>{ledgerItem.total_planned}</b> {ledgerItem.unit}
                        · Billed <b style={{color:T.amb}}>{ledgerItem.total_billed}</b>
                        · Remaining <b style={{color:ledgerItem.total_remaining>0?T.grn:T.t4}}>{ledgerItem.total_remaining}</b>
                      </span>
                    </div>
                    <div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                      <div style={{width:pctBilled+"%",height:"100%",background:pctBilled>=100?T.t4:T.blu,transition:"width .2s"}}/>
                    </div>
                  </div>
                  {/* Milestone rows */}
                  {milestoneRows.map(m => {
                    const isFully        = m.status === "fully_billed";
                    const isDisabled     = isFully && !overbillOK;
                    const p              = pickedItems[m.milestone_id];
                    const checked        = !!p?.checked;
                    const enteredQty     = parseFloat(p?.this_qty || 0);
                    const remainingQty   = Number(m.remaining_qty) || 0;
                    const incRate        = Number(m.rate) || 0;
                    const lineAmt        = enteredQty * incRate;
                    const exceedsRemaining = enteredQty > remainingQty;
                    const normalPortion  = Math.min(enteredQty, Math.max(0, remainingQty));
                    const overPortion    = Math.max(0, enteredQty - Math.max(0, remainingQty));
                    const isSplit        = exceedsRemaining && remainingQty > 0 && overPortion > 0;
                    const isFullOver     = isFully && enteredQty > 0;
                    const showOverWarn   = exceedsRemaining && !overBillMode;

                    return (
                      <div key={m.milestone_id} style={{borderTop:"1px dashed "+T.b1,opacity:isDisabled?0.55:1}}>
                        <div style={{display:"grid",gridTemplateColumns:"24px 1fr 80px 130px 110px",gap:6,alignItems:"center",padding:"7px 12px"}}>
                          <input type="checkbox" checked={checked} disabled={isDisabled}
                            onChange={e => {
                              const defaultQty = remainingQty > 0 ? String(remainingQty) : "";
                              setPickedItems(prev => ({
                                ...prev,
                                [m.milestone_id]: e.target.checked
                                  ? { checked: true, this_qty: defaultQty }
                                  : { checked: false, this_qty: "" },
                              }));
                            }}/>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                            <div style={{fontSize:10,color:T.t4,marginTop:1,display:"flex",gap:6,flexWrap:"wrap"}}>
                              {isFully
                                ? <span style={{padding:"1px 6px",background:overbillOK?"#FEE2E2":T.surfaceB,color:overbillOK?"#991B1B":T.t3,borderRadius:3,fontWeight:600}}>
                                    {overbillOK?"🔴 Fully billed — over-bill enabled":"✓ Fully billed"}
                                  </span>
                                : m.status === "partial"
                                  ? <span>{m.billed_qty}/{m.planned_qty} billed · {m.remaining_qty} left</span>
                                  : <span>{m.planned_qty} {ledgerItem.unit}</span>}
                              {m.linked_task && (
                                <span style={{padding:"1px 6px",background:T.bluL,color:T.blu,borderRadius:3,fontWeight:600}}>
                                  🔗 task @ {m.linked_task.progress}%
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{fontSize:11,color:T.t3,textAlign:"right",paddingRight:6,fontVariantNumeric:"tabular-nums"}}>{fmtC(incRate)}/unit</span>
                          <div>
                            <input type="number" disabled={!checked||isDisabled}
                              placeholder={String(remainingQty)}
                              value={p?.this_qty || ""}
                              onChange={e => {
                                const v = e.target.value;
                                setPickedItems(prev => ({...prev,[m.milestone_id]:{...prev[m.milestone_id],this_qty:v}}));
                              }}
                              style={{...inpS,padding:"5px 8px",fontSize:11.5,
                                borderColor: exceedsRemaining ? "#DC2626" : T.b1,
                                borderWidth: exceedsRemaining ? 2 : 1,
                                background: exceedsRemaining ? "#FEF2F2" : "white",
                                color: exceedsRemaining ? "#991B1B" : T.t1,
                                fontWeight: exceedsRemaining ? 700 : 400}}/>
                          </div>
                          <span style={{fontSize:12,fontWeight:700,textAlign:"right",fontVariantNumeric:"tabular-nums",
                            color:checked&&enteredQty>0?(exceedsRemaining?"#991B1B":T.grn):T.t4}}>
                            {checked && enteredQty > 0 ? fmtC(lineAmt) : "—"}
                            {isSplit && (
                              <div style={{fontSize:8.5,color:"#991B1B",fontWeight:700,marginTop:1,lineHeight:1.3}}>
                                🔴 SPLIT: {normalPortion} BOQ + {overPortion} over
                              </div>
                            )}
                            {isFullOver && !isSplit && (
                              <div style={{fontSize:8.5,color:"#991B1B",fontWeight:700,marginTop:1}}>
                                🔴 ALL OVER-BILL ({overPortion} qty)
                              </div>
                            )}
                          </span>
                        </div>
                        {/* Over-bill inline warning — exact same as Estimate */}
                        {showOverWarn && (
                          <div style={{margin:"4px 0 6px 26px",padding:"7px 10px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:6,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                            <span style={{fontSize:14}}>⚠️</span>
                            <div style={{flex:1,minWidth:180}}>
                              <div style={{fontSize:11.5,fontWeight:700,color:"#991B1B"}}>
                                Over-billing detected — {enteredQty} {ledgerItem.unit} entered, only {remainingQty} available
                              </div>
                              <div style={{fontSize:10.5,color:"#7F1D1D",marginTop:2}}>
                                Either reduce qty to {remainingQty}, or enable Over-Billing Mode + provide a reason explaining the extra work.
                              </div>
                            </div>
                            <button onClick={()=>setOverBillMode(true)}
                              style={{padding:"5px 10px",borderRadius:5,background:"#DC2626",color:"white",border:"none",fontSize:10.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                              Turn ON Over-Billing
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            };

            // Section-grouped output
            const sectionsWithItems = wsSections
              .map(sec => ({ ...sec, _ledgerItems: (sec.items||[]).map(it=>ledgerById[it.id]).filter(Boolean) }))
              .filter(sec => sec._ledgerItems.length > 0);
            const unsecItems = wsUnsec.map(it=>ledgerById[it.id]).filter(Boolean);

            if (!sectionsWithItems.length && !unsecItems.length) {
              // Fallback: flat list from ledger
              return allLedgerItems.map(renderItemBlock);
            }

            return (<>
              <div style={{fontSize:11,color:T.t3,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                <span>Tick milestones to bill. Qty = this bill qty; defaults to remaining qty.</span>
                {overbillOK && <span style={{padding:"2px 7px",fontSize:9.5,fontWeight:700,background:"#FEE2E2",color:"#991B1B",borderRadius:3}}>OVER-BILL ENABLED</span>}
              </div>
              {sectionsWithItems.map(sec => (
                <div key={sec.id||sec.title} style={{marginBottom:14}}>
                  <div style={{padding:"7px 12px",background:"#1E3A5F",borderRadius:"6px 6px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11.5,fontWeight:700,color:"white",textTransform:"uppercase",letterSpacing:".4px"}}>{sec.title}</span>
                    <span style={{fontSize:11,color:"#93C5FD"}}>{sec._ledgerItems.length} item{sec._ledgerItems.length!==1?"s":""}</span>
                  </div>
                  <div style={{border:"1px solid #BFDBFE",borderTop:"none",borderRadius:"0 0 6px 6px",overflow:"hidden",padding:"8px 8px 2px"}}>
                    {sec._ledgerItems.map(renderItemBlock)}
                  </div>
                </div>
              ))}
              {unsecItems.length > 0 && (
                <div style={{marginBottom:14}}>
                  <div style={{padding:"7px 12px",background:T.slt,borderRadius:"6px 6px 0 0"}}>
                    <span style={{fontSize:11.5,fontWeight:700,color:"white"}}>Other Items</span>
                  </div>
                  <div style={{border:"1px solid "+T.b1,borderTop:"none",borderRadius:"0 0 6px 6px",padding:"8px 8px 2px"}}>
                    {unsecItems.map(renderItemBlock)}
                  </div>
                </div>
              )}
            </>);
          })()}

          {/* ── MILESTONE PERCENT ── */}
          {!ledgerLoading && method === "milestone_percent" && billingLedger?.mode === "milestone_percent" && (() => {
            const stages = billingLedger.stages || [];
            if (!stages.length) return (
              <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12,background:T.surfaceB,borderRadius:7}}>
                No %-stages set. Close and use <b>+ Set Schedule → % of WO Value</b>.
              </div>
            );
            return (<>
              <div style={{fontSize:11,color:T.t3,marginBottom:8}}>Tick stages to bill. Each stage can only be billed once.</div>
              {stages.map(s => {
                const isFully = s.status === "fully_billed";
                const checked = !!pickedItems[s.milestone_id]?.checked;
                return (
                  <div key={s.milestone_id} style={{display:"grid",gridTemplateColumns:"24px 1fr 70px 130px 100px",gap:6,alignItems:"center",padding:"8px 10px",borderBottom:"1px solid "+T.b1,opacity:isFully?0.55:1}}>
                    <input type="checkbox" checked={checked} disabled={isFully}
                      onChange={e => setPickedItems(p => ({...p,[s.milestone_id]:{checked:e.target.checked}}))}/>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{s.name}</div>
                      <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                        {isFully
                          ? <span style={{padding:"1px 6px",background:T.surfaceB,color:T.t3,borderRadius:3,fontWeight:600}}>✓ Already billed</span>
                          : s.status==="partial"
                            ? <span>{fmtC(s.billed_amount)} billed · {fmtC(s.remaining_amount)} left</span>
                            : <span>{fmtC(s.planned_amount)} planned</span>}
                      </div>
                    </div>
                    <span style={{fontSize:11.5,color:T.t3,textAlign:"right",paddingRight:8}}>{s.pct}%</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(s.planned_amount)}</span>
                    <span style={{fontSize:11,color:T.t4,textAlign:"right"}}>{checked && <span style={{color:T.grn,fontWeight:700}}>✓ selected</span>}</span>
                  </div>
                );
              })}
            </>);
          })()}

          {/* ── MANUAL billing — per-item cumulative qty ── */}
          {!ledgerLoading && method === "manual" && (<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",background:"#1E293B",padding:"7px 12px",gap:8,borderRadius:"7px 7px 0 0"}}>
              {["Item","Unit","WO Qty","Prev Cum","Rate","This Cum ▼","This Bill Amt"].map((h,i)=>(
                <div key={h} style={{fontSize:8.5,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",textAlign:i>1?"right":"left"}}>{h}</div>
              ))}
            </div>
            {sections.map((sec,si)=>{
              const secAmt = sec.items.reduce((s,it)=>{
                const cum=parseFloat(cumQtys[it.id]||0);
                return s+Math.max(0,cum-(it.prev_cum||0))*parseFloat(it.rate||0);
              },0);
              return(
                <div key={si}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",padding:"6px 12px",gap:8,background:"#374151",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                    <div style={{gridColumn:"1/7",fontSize:11,fontWeight:700,color:"white"}}>{si+1}. {sec.title}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#4ADE80",textAlign:"right"}}>{fmtC(secAmt)}</div>
                  </div>
                  {sec.items.map(it=>{
                    const cum=parseFloat(cumQtys[it.id]||0);
                    const thisBill=Math.max(0,cum-(it.prev_cum||0));
                    const thisAmt=thisBill*parseFloat(it.rate||0);
                    const overLimit=cum>parseFloat(it.qty||0);
                    return(
                      <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 55px 70px 70px 70px 75px 85px",padding:"8px 12px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:overLimit?"#FEF2F2":T.surface}}>
                        <div style={{fontSize:11.5,color:T.t1,fontWeight:500}}>{it.description}</div>
                        <div style={{fontSize:11,color:T.t4,textAlign:"right"}}>{it.unit}</div>
                        <div style={{fontSize:12,color:T.t2,textAlign:"right",fontWeight:500}}>{it.qty}</div>
                        <div style={{fontSize:12,color:T.t3,textAlign:"right"}}>{it.prev_cum||0}</div>
                        <div style={{fontSize:12,fontWeight:700,color:T.blu,textAlign:"right"}}>₹{parseFloat(it.rate||0).toLocaleString("en-IN")}</div>
                        <div>
                          <input type="number" value={cumQtys[it.id]||""} min={0}
                            onChange={e=>setCumQtys(p=>({...p,[it.id]:e.target.value}))}
                            style={{...inpS,textAlign:"right",fontWeight:700,padding:"5px 8px",
                              border:"1.5px solid "+(overLimit?T.red:cum>(it.prev_cum||0)?T.blu:T.b1),
                              color:overLimit?T.red:T.t1}}/>
                          {overLimit&&<div style={{fontSize:9,color:T.red,marginTop:1,textAlign:"right"}}>Exceeds WO!</div>}
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:12,fontWeight:700,color:thisAmt>0?T.grn:T.t4}}>{thisAmt>0?fmtC(thisAmt):"—"}</div>
                          {thisBill>0&&<div style={{fontSize:9,color:T.t4,marginTop:1}}>{thisBill} {it.unit}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>)}

          {/* ── Bill Summary ── */}
          {grossR > 0 && (
            <div style={{marginTop:14,background:"#0F172A",borderRadius:8,padding:14,flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",marginBottom:10}}>Bill Summary</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[
                  {l:"Gross Amount",              v:fmtC(grossR), c:"#E2E8F0"},
                  {l:`Retention (${retPct}%)`,    v:fmtC(retAmt), c:"#FCD34D"},
                  {l:`TDS (${tdsPct}%)`,          v:fmtC(tdsAmt), c:"#F87171"},
                  {l:"Net Payable",               v:fmtC(netPay), c:"#4ADE80"},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:"center",background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"8px"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:3}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:s.c,fontVariantNumeric:"tabular-nums"}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {overBillMode && (
                <div style={{marginTop:8,padding:"6px 10px",background:"rgba(220,38,38,0.15)",borderRadius:5,fontSize:10.5,color:"#FCA5A5",fontWeight:600}}>
                  ⚠ Over-bill mode active — will be flagged for admin review
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",gap:8,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:"9px",borderRadius:7,border:"1px solid "+T.b1,background:T.surface,fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving||grossR===0}
            style={{flex:2,padding:"9px",borderRadius:7,
              background:saving||grossR===0?T.t4:overBillMode?"#DC2626":T.blu,
              color:"white",border:"none",fontSize:13,fontWeight:700,
              cursor:saving||grossR===0?"not-allowed":"pointer"}}>
            {saving ? "Submitting…" : grossR > 0 ? (overBillMode?"⚠ Submit Over-Bill — ":"Submit RA Bill — ")+fmtC(grossR) : "Select milestones to proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentsTab({ woId, fmtC }) {
  const [payments, setPayments] = useState([]);
  useEffect(()=>{
    api.get("/subcon/payments?wo_id="+woId).then(r=>{ if(r.success) setPayments(r.data||[]); }).catch(()=>{});
  },[woId]);
  if(payments.length===0) return <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No payments recorded yet</div>;
  const total = payments.reduce((s,p)=>s+parseFloat(p.amount_paid||0),0);
  return(
    <div>
      {payments.map((p,i)=>(
        <div key={p.id} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"10px 14px",marginBottom:8,borderLeft:"3px solid "+T.grn,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.grn}}>{fmtC(p.amount_paid)}</div>
            <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>{p.payment_mode} · {p.payment_date?new Date(p.payment_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</div>
          </div>
          <div style={{textAlign:"right"}}>
            {p.reference_no&&<div style={{fontSize:11,color:T.blu,fontFamily:"monospace"}}>{p.reference_no}</div>}
            {p.remark&&<div style={{fontSize:11,color:T.t3}}>{p.remark}</div>}
          </div>
        </div>
      ))}
      <div style={{textAlign:"right",fontSize:14,fontWeight:800,color:T.grn,marginTop:8}}>Total Paid: {fmtC(total)}</div>
    </div>
  );
}

export default TabSubcon;
