import React, { useState, useEffect, useMemo } from "react";
import api, { API_BASE } from "../../config/api";
import apiCache from "../../utils/apiCache";
import SearchSelect from "../../components/SearchSelect";
import EstimateBuilderModal from "../EstimateBuilderModal";
import { T, localYMD } from "../shared/tokens";

function TabEstimate({ project }) {
  const projectId = project?.id;
  const [estimates, setEstimates] = useState([]);
  const [selEst, setSelEst] = useState(null);
  const [estDetail, setEstDetail] = useState(null);
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  // Standalone manual invoices (estimate_id=NULL, project-level ad-hoc)
  // shown in a separate section at the bottom of Invoices tab so they
  // don't get lost after scoping the main list to a specific estimate.
  const [standaloneInvoices, setStandaloneInvoices] = useState([]);
  const [milestones, setMilestones] = useState({ rate_by_item:{}, percent:[] });
  const [subTab, setSubTab] = useState("boq");
  const [loading, setLoading] = useState(true);
  const [showNewEst, setShowNewEst] = useState(false);
  // ── BOQ fold/expand state ──────────────────────────────────────
  // Sets hold the COLLAPSED keys (empty = everything expanded).
  // Section key = sec.id ; category key = `${sec.id}::${catName}`.
  const [collapsedSecs, setCollapsedSecs] = useState(() => new Set());
  const [collapsedCats, setCollapsedCats] = useState(() => new Set());
  const toggleSec = (id) => setCollapsedSecs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCat = (key) => setCollapsedCats(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // ── M5: Estimate Builder integration ──────────────────────────
  // Three new paths next to "Quick Manual": Take from CRM Final Quote,
  // Build from Library, Build from Scratch. All open EstimateBuilderModal
  // with different initialMode. The dropdown chooser lives next to the
  // "+ New" button on the Estimate list header.
  const [estChooserOpen,   setEstChooserOpen]   = useState(false);
  const [estBuilderOpen,   setEstBuilderOpen]   = useState(false);
  const [estBuilderMode,   setEstBuilderMode]   = useState("library");   // "library" | "scratch" | "from_quote"
  const [estBuilderQuoteId,setEstBuilderQuoteId]= useState(null);
  // CRM-quote availability for "Take from CRM" path. Loaded once per
  // project on mount; { mode: "specific"|"all"|"none", quotes: [...] }
  const [crmQuotes, setCrmQuotes] = useState({ mode: "none", quotes: [] });
  // Project object enriched for the builder. The Estimate tab fetches
  // its own project info — reuse the local `project` state if it exists,
  // else hydrate from the route.
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const r = await api.get("/customer-estimates/from-crm/" + projectId);
        if (r?.success) setCrmQuotes(r.data || { mode: "none", quotes: [] });
      } catch (_) {}
    })();
  }, [projectId]);
  const [showNewInv, setShowNewInv] = useState(false);
  const [showSetMs, setShowSetMs] = useState(false);
  // Payment Schedule mode chooser dropdown (Item-wise / % / Manual)
  const [msChooserOpen, setMsChooserOpen] = useState(false);
  const [showPay, setShowPay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);

  // Form state — New Estimate
  const [estForm, setEstForm] = useState({
    customer_id: "", customer_name: "", retention_pct: 5, tds_pct: 1, tax_pct: 0,
    description: "",
    sections: [{ title: "Section 1", items: [{ description:"", unit:"", qty:"", rate:"" }] }],
  });
  // Form state — New Invoice (milestone OR manual)
  const [invForm, setInvForm] = useState({
    source: "milestone", invoice_date: localYMD(), remark: "",
    items: [],  // milestone-based: [{milestone_id, this_qty}] (PS-17: qty per click, not cumulative)
    manualItems: [{ description:"", qty:"", rate:"" }],
    tax_pct: 0, retention_pct: 0, tds_pct: 0,
    customer_name: "",
    // ── Over-billing mode (P2+ feature) ─────────────────────────
    // User-driven per-invoice toggle. When ON:
    //   • Fully-billed milestones become re-enabled (allow extra qty)
    //   • Qty input doesn't clamp at remaining_qty
    //   • Reason field becomes compulsory
    //   • Submit auto-splits qty > remaining into 2 linked invoices
    //     (one normal for BOQ portion, one over-bill for excess)
    overBillMode: false,
    overBillReason: "",
  });
  // PS-18: Invoice detail side-slide drawer
  // Click any invoice card → fetch enriched detail (project, estimate,
  // creator, trigger task, items with milestone names, payments) →
  // open right-side drawer with full audit + edit/delete controls.
  const [invDetailFor,  setInvDetailFor]  = useState(null);  // invoice id
  const [invDetail,     setInvDetail]     = useState(null);  // full payload
  const [invDetailLoading, setInvDetailLoading] = useState(false);
  const openInvoiceDetail = async (invId) => {
    setInvDetailFor(invId);
    setInvDetail(null);
    setInvDetailLoading(true);
    const r = await api.get("/customer-estimates/invoices/"+invId).catch(()=>({success:false}));
    setInvDetailLoading(false);
    if (r?.success) setInvDetail(r.data);
    else setInvDetailFor(null);
  };
  const closeInvoiceDetail = () => { setInvDetailFor(null); setInvDetail(null); };
  // PS-19: Download invoice as PDF. fetch+blob (route needs JWT header so a
  // plain <a href> won't work). Filename = invoice_no.
  const downloadInvoicePdf = async (invId, invNo) => {
    try {
      const token = localStorage.getItem("gb_token");
      const res = await fetch(`${API_BASE}/customer-estimates/invoices/${invId}/pdf`, {
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        alert("PDF download failed: " + (txt || res.status));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (invNo || "invoice") + ".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      alert("PDF download failed: " + (e?.message || e));
    }
  };
  // PS-19/20: Edit an invoice.
  //   • Manual invoice → full New Invoice modal preloaded (items editable).
  //   • Milestone / auto invoice → compact header editor (date, remark,
  //     retention/TDS/tax %). Line items stay locked because they derive
  //     from the schedule + task progress — editing them in isolation
  //     would desync the billing ledger.
  const editInvoice = (inv) => {
    if (inv.source === "manual") {
      setInvForm({
        source: "manual",
        invoice_date: (inv.invoice_date || "").slice(0,10) || localYMD(),
        remark: inv.remark || "",
        items: [],
        manualItems: (inv.items || []).map(it => ({
          description: it.clean_description || it.description || "",
          qty: String(it.qty || ""),
          rate: String(it.rate || ""),
        })),
        tax_pct: parseFloat(inv.tax_pct || 0),
        retention_pct: parseFloat(inv.retention_pct || 0),
        tds_pct: parseFloat(inv.tds_pct || 0),
        customer_name: inv.customer_name || "",
        _editId: inv.id,
      });
      closeInvoiceDetail();
      setShowNewInv(true);
    } else {
      // Milestone / auto → compact header editor
      setHdrEditForm({
        id: inv.id,
        invoice_no: inv.invoice_no,
        gross_amount: parseFloat(inv.gross_amount) || 0,
        invoice_date: (inv.invoice_date || "").slice(0,10) || localYMD(),
        remark: inv.remark || "",
        retention_pct: parseFloat(inv.retention_pct) || 0,
        tds_pct: parseFloat(inv.tds_pct) || 0,
        tax_pct: parseFloat(inv.tax_pct) || 0,
      });
      closeInvoiceDetail();
    }
  };
  // Compact invoice-header editor state (milestone/auto invoices)
  const [hdrEditForm, setHdrEditForm] = useState(null);
  const [hdrEditSaving, setHdrEditSaving] = useState(false);
  const submitHdrEdit = async () => {
    if (!hdrEditForm) return;
    const gross = parseFloat(hdrEditForm.gross_amount) || 0;
    const retPct = parseFloat(hdrEditForm.retention_pct) || 0;
    const tdsPct = parseFloat(hdrEditForm.tds_pct) || 0;
    const taxPct = parseFloat(hdrEditForm.tax_pct) || 0;
    const r2 = (n) => Math.round((parseFloat(n)||0) * 100) / 100;
    const retAmt = r2(gross * retPct / 100);
    const tdsAmt = r2(gross * tdsPct / 100);
    const taxAmt = r2(gross * taxPct / 100);
    const netRec = r2(gross - retAmt - tdsAmt + taxAmt);
    setHdrEditSaving(true);
    const r = await api.put("/customer-estimates/invoices/" + hdrEditForm.id, {
      invoice_date: hdrEditForm.invoice_date,
      remark: hdrEditForm.remark,
      retention_pct: retPct, retention_amt: retAmt,
      tds_pct: tdsPct, tds_amt: tdsAmt,
      tax_pct: taxPct, tax_amt: taxAmt,
      net_receivable: netRec,
    }).catch(e => ({ success:false, message:e.message }));
    setHdrEditSaving(false);
    if (!r?.success) { alert(r?.message || "Save failed"); return; }
    setHdrEditForm(null);
    await reloadSel();
  };

  // Billing ledger — per-milestone planned/billed/remaining (PS-17)
  // Loaded when New Invoice (milestone) modal opens. Frontend uses this
  // for: progress bars, "fully invoiced" disabled state, qty clamping.
  const [billingLedger, setBillingLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const loadBillingLedger = async (estId) => {
    if (!estId) return;
    setLedgerLoading(true);
    const r = await api.get("/customer-estimates/"+estId+"/billing-ledger").catch(()=>({success:false}));
    setLedgerLoading(false);
    if (r?.success) setBillingLedger(r.data);
  };
  // Helper to open New Invoice (milestone) — preloads ledger so the modal
  // renders fresh remaining/billed numbers every time.
  const openNewInvoice = async () => {
    setInvForm(p=>({...p, source:"milestone", items:[], remark:""}));
    setShowNewInv(true);
    if (selEst?.id) loadBillingLedger(selEst.id);
  };

  // ── Build lookup maps from billingLedger so Payment Schedule rows
  // can show "Billed X · Remaining Y" per BOQ item and per milestone
  // without changing the original render structure. Empty when ledger
  // isn't loaded yet — UI gracefully degrades to the old plain numbers.
  const ledgerByItemId = useMemo(() => {
    const m = {};
    if (billingLedger?.mode === "milestone_rate" && Array.isArray(billingLedger.items)) {
      for (const it of billingLedger.items) {
        if (it?.item_id != null) m[it.item_id] = it;
      }
    }
    return m;
  }, [billingLedger]);
  const ledgerByMsId = useMemo(() => {
    const m = {};
    if (billingLedger?.mode === "milestone_rate" && Array.isArray(billingLedger.items)) {
      for (const it of billingLedger.items) {
        for (const ms of (it.milestones || [])) {
          if (ms?.milestone_id != null) m[ms.milestone_id] = ms;
        }
      }
    }
    return m;
  }, [billingLedger]);
  // Auto-load the billing ledger when user lands on Payment Schedule sub-tab.
  // Without this the per-item "Billed/Remaining" badges would only populate
  // after the user opens the New Invoice modal once (modal also loads the
  // same ledger). Re-runs on selEst change so switching between estimates
  // refreshes the data.
  useEffect(() => {
    if (subTab === "milestone" && selEst?.id) {
      loadBillingLedger(selEst.id);
    }
  }, [subTab, selEst?.id]);

  // Form state — Record Payment
  const [payForm, setPayForm] = useState({
    amount_received:"", payment_date: localYMD(), payment_mode:"Bank Transfer",
    reference_no:"", remark:"",
  });
  // Form state — Set Schedule
  // Item-wise mode supports multi-item picking. pickedItemIds preserves the
  // order in which the user added items (numbered badges in the picker).
  // itemStages maps each picked item to its own stage editor state.
  // Legacy fields (estimate_item_id, rateMs) kept temporarily for any code
  // that still references them, but the active flow uses the multi-item map.
  const [msForm, setMsForm] = useState({
    kind: "rate",   // 'rate' | 'percent'
    estimate_item_id: null,
    rateMs: [{ seq:0, name:"", cum_rate:"" }],
    pctMs:  [{ seq:0, name:"", pct:"" }],
    pickedItemIds: [],
    itemStages: {},        // { [estimate_item_id]: [{seq, name, cum_rate}, ...] }
    expandedItemId: null,  // which picked-item's stage editor is currently open
  });
  // Item picker drawer state
  const [itemPickerOpen, setItemPickerOpen]     = useState(false);
  const [itemPickerSearch, setItemPickerSearch] = useState("");

  // ── BOQ Amendment workflow (mirrors Subcon WO amendments) ──
  // Edits to a live estimate's BOQ go through an approval queue: user
  // submits proposed_form + proposed_sections + reason → Pending row →
  // admin approves on the Amendments tab → proposed values flush into
  // customer_estimates / sections / items + status flips to Approved.
  const [amendments, setAmendments] = useState([]);   // [{id, status, reason, proposed, ...}]
  const [showEditBoq, setShowEditBoq] = useState(false);
  const [amendForm, setAmendForm] = useState({
    description: "", retention_pct: 0, tds_pct: 0, tax_pct: 0,
    start_date: "", end_date: "", remark: "",
    sections: [],
    reason: "",
  });
  const [amendSaving, setAmendSaving] = useState(false);
  const [expandedAmend, setExpandedAmend] = useState(null);

  // ── Delete estimate (type-to-confirm danger flow) ──────────────
  // Soft-deletes via the existing DELETE /customer-estimates/:id route.
  // Two-step confirmation (open panel → type estimate_no → click confirm)
  // so accidental clicks can't wipe a live estimate that has invoices.
  const [delEstId,   setDelEstId]   = useState(null);
  const [delEstText, setDelEstText] = useState("");
  const [delEstBusy, setDelEstBusy] = useState(false);
  const openDelEst = (e) => { setDelEstId(e.id); setDelEstText(""); };
  const closeDelEst = () => { setDelEstId(null); setDelEstText(""); };
  const confirmDelEst = async (e) => {
    if (delEstText.trim() !== (e.estimate_no || "")) return;
    setDelEstBusy(true);
    const r = await api.del("/customer-estimates/" + e.id).catch(err => ({success:false, message: err.message}));
    setDelEstBusy(false);
    if (!r?.success) { alert(r?.message || "Delete failed"); return; }
    closeDelEst();
    if (selEst?.id === e.id) setSelEst(null);
    await loadEstimates();
  };

  const loadAmendments = async (estId) => {
    if (!estId) return;
    const r = await api.get("/customer-estimates/amendments?estimate_id=" + estId).catch(()=>({success:false}));
    if (r.success) setAmendments(r.data || []);
  };

  // Refetch linked-task progress whenever the user lands on the Payment
  // Schedule tab. Task progress can change in the Tasks tab without the
  // schedule tab knowing — this keeps chips in sync. Also covers the
  // "open estimate then switch to schedule" first-view case.
  useEffect(() => {
    if (subTab === "milestone" && selEst?.id && selEst.billing_method === "milestone_rate") {
      loadLinkedTasks(selEst.id);
    }
    // eslint-disable-next-line
  }, [subTab, selEst?.id]);

  // Seed the edit form from the currently-selected estimate's detail
  const openEditBoq = () => {
    if (!selEst || !estDetail) return;
    setAmendForm({
      description:   selEst.description   || "",
      retention_pct: selEst.retention_pct ?? 0,
      tds_pct:       selEst.tds_pct       ?? 0,
      tax_pct:       selEst.tax_pct       ?? 0,
      start_date:    (selEst.start_date || "").slice(0, 10),
      end_date:      (selEst.end_date   || "").slice(0, 10),
      remark:        selEst.remark        || "",
      sections: (estDetail.sections || []).map(s => ({
        id: s.id,
        title: s.title || "",
        // Preserve qty mode (uniform / per-item) end-to-end so the
        // amendment round-trips cleanly. Edit modal doesn't expose a
        // toggle; admin uses the builder for mode changes.
        per_item_qty: s.per_item_qty ? 1 : 0,
        items: (s.items || []).map(it => ({
          id: it.id,
          description: it.description || "",
          unit: it.unit || "",
          qty:  parseFloat(it.qty)  || 0,
          rate: parseFloat(it.rate) || 0,
        })),
      })),
      reason: "",
    });
    setShowEditBoq(true);
  };

  const submitAmendment = async () => {
    if (!selEst) return;
    if (!amendForm.reason || !amendForm.reason.trim()) {
      alert("Please provide a reason for the amendment.");
      return;
    }
    const validSecs = (amendForm.sections || [])
      .map(s => ({
        id: s.id || null,
        title: (s.title || "").trim() || "Section",
        // Pass-through qty mode so the apply step recreates sections
        // with the same uniform/per-item semantics.
        per_item_qty: s.per_item_qty ? 1 : 0,
        items: (s.items || [])
          .filter(it => (it.description || "").trim() && parseFloat(it.qty) > 0 && parseFloat(it.rate) > 0)
          .map(it => ({
            id: it.id || null,
            description: it.description.trim(),
            unit: it.unit || "",
            qty:  parseFloat(it.qty)  || 0,
            rate: parseFloat(it.rate) || 0,
          })),
      }))
      .filter(s => s.items.length > 0);
    if (validSecs.length === 0) {
      alert("Add at least one item with description, qty, and rate.");
      return;
    }
    setAmendSaving(true);
    const r = await api.post("/customer-estimates/" + selEst.id + "/amendment", {
      proposed_form: {
        description:   amendForm.description,
        retention_pct: amendForm.retention_pct,
        tds_pct:       amendForm.tds_pct,
        tax_pct:       amendForm.tax_pct,
        start_date:    amendForm.start_date || null,
        end_date:      amendForm.end_date   || null,
        remark:        amendForm.remark,
      },
      proposed_sections: validSecs,
      reason: amendForm.reason.trim(),
    }).catch(e => ({ success:false, message: e.message }));
    setAmendSaving(false);
    if (!r?.success) {
      alert(r?.message || "Failed to submit amendment");
      return;
    }
    // Register with central approvals system so the Pending Approvals
    // drawer surfaces it to admin (same wire-up as Subcon WO Amendment).
    const proposedTotal = validSecs.reduce((s, sec) =>
      s + sec.items.reduce((ss, it) => ss + (parseFloat(it.qty)||0) * (parseFloat(it.rate)||0), 0), 0);
    api.post("/approvals/submit", {
      module:       "Customer Estimate Amendment",
      ref_id:       r.data.id,
      ref_no:       (selEst.estimate_no || "EST") + " · A#" + r.data.id,
      title:        (selEst.customer_name || "Customer") + " — " + (selEst.estimate_no || "Estimate") + " Amendment",
      amount:       proposedTotal,
      project_id:   projectId,
      project_name: project?.name || "",
      notes:        amendForm.reason.trim(),
    }).catch(e => console.error("Approval submit:", e));
    if (typeof apiCache !== "undefined" && apiCache.refreshApprovals) apiCache.refreshApprovals();
    setShowEditBoq(false);
    await loadAmendments(selEst.id);
    setSubTab("amend");
  };

  const decideAmendment = async (amendId, status) => {
    if (status === "Rejected" && !await window.confirmAsync("Reject this amendment? The estimate will stay unchanged.")) return;
    if (status === "Approved" && !await window.confirmAsync("Approve this amendment? Sections + items will be replaced and the total recomputed.")) return;
    const r = await api.patch("/customer-estimates/amendments/" + amendId + "/action", { status })
      .catch(e => ({ success:false, message: e.message }));
    if (!r?.success) { alert(r?.message || "Failed"); return; }
    await loadAmendments(selEst.id);
    if (status === "Approved") {
      // Refresh the parent estimate detail + summary (header + total updated)
      await selectEst(selEst);
    }
  };

  const pendingAmendCount = amendments.filter(a => a.status === "Pending").length;

  const fmtC = (v) => "₹"+(parseFloat(v)||0).toLocaleString("en-IN",{maximumFractionDigits:0});
  const inpS = {padding:"7px 10px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};
  const lblS = {fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",display:"block",marginBottom:3};

  // ── BOQ flatten + fold + export helpers ────────────────────────
  const flattenBoqRows = () => {
    const rows = [];
    for (const sec of (estDetail?.sections || [])) {
      for (const it of (sec.items || [])) {
        const m = /^\[([^\]]+)\]\s*(.*)$/.exec(it.description || "");
        rows.push({
          section: sec.title || "", category: m ? m[1] : "", item: m ? m[2] : (it.description || ""),
          unit: it.unit || "", qty: parseFloat(it.qty) || 0, rate: parseFloat(it.rate) || 0, amount: parseFloat(it.amount) || 0,
        });
      }
    }
    return rows;
  };
  const collapseAllBoq = () => {
    const secIds = new Set(); const catKeys = new Set();
    for (const sec of (estDetail?.sections || [])) {
      secIds.add(sec.id);
      for (const it of (sec.items || [])) {
        const m = /^\[([^\]]+)\]\s*/.exec(it.description || "");
        if (m) catKeys.add(`${sec.id}::${m[1]}`);
      }
    }
    setCollapsedSecs(secIds); setCollapsedCats(catKeys);
  };
  const expandAllBoq = () => { setCollapsedSecs(new Set()); setCollapsedCats(new Set()); };

  const exportBoqExcel = () => {
    const rows = flattenBoqRows();
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [["Section","Category","Item","Unit","Qty","Rate","Amount"].map(esc).join(",")];
    for (const r of rows) lines.push([r.section, r.category, r.item, r.unit, r.qty, r.rate, r.amount].map(esc).join(","));
    const grand = rows.reduce((s, r) => s + r.amount, 0);
    lines.push(["", "", "", "", "", "GRAND TOTAL", grand].map(esc).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `BOQ_${(selEst?.estimate_no || "estimate")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportBoqPdf = () => {
    const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const inr = (n) => "₹" + (Number(n)||0).toLocaleString("en-IN");

    // ── Build body from estDetail.sections so we can honour the EXACT
    // on-screen fold state: a collapsed section prints only its header
    // row; a collapsed category prints only its sub-header. Mirrors the
    // [Category] prefix parsing the live render uses.
    let body = "";
    let grand = 0;
    for (const sec of (estDetail?.sections || [])) {
      const items = sec.items || [];
      const secTotal = items.reduce((s,i)=> s + (parseFloat(i.amount)||0), 0);
      grand += secTotal;
      const secCollapsed = collapsedSecs.has(sec.id);
      const secPerItem = !!Number(sec.per_item_qty);
      const secQtySum  = items.reduce((s,i)=> s + (parseFloat(i.qty)||0), 0);
      // Group items by category (needed before the section row — the section
      // rollup is derived from the per-category areas).
      const groups = {}; const catOrder = [];
      for (const it of items) {
        const m = /^\[([^\]]+)\]\s*(.*)$/.exec(it.description || "");
        const cat = m ? m[1] : "";
        const clean = m ? m[2] : (it.description || "");
        (groups[cat] ||= []); if (!catOrder.includes(cat)) catOrder.push(cat);
        groups[cat].push({ ...it, _clean: clean });
      }
      // Section rollup qty + rate — mirrors the live render. Uniform mode:
      // Qty = Σ category areas, Rate = blended (total ÷ qty) so the row
      // reconciles even when GF/FF/SF carry different areas. Per-item mode
      // shows Σ qty and a blank rate (per-sqft is meaningless there).
      const secAreaSum = catOrder.reduce(
        (a, cn) => a + (parseFloat(groups[cn][0]?.qty) || 0), 0);
      const secQtyDisp = secPerItem ? secQtySum : secAreaSum;
      const secBlended = secQtyDisp > 0 ? secTotal / secQtyDisp : 0;
      const secUnits = new Set(items.map(i => String(i.unit||"").trim().toLowerCase()).filter(Boolean));
      const secRateDisp = (!secPerItem && secUnits.size <= 1 && secQtyDisp > 0)
        ? inr(Math.round(secBlended)) + "/sqft" : "";
      body += `<tr class="sec"><td colspan="2">${secCollapsed ? "▸ " : "▾ "}${esc(sec.title||"")}${secPerItem ? ' <span class="tag">PER-ITEM QTY</span>' : ""}</td><td class="r">${Math.round(secQtyDisp).toLocaleString("en-IN")}</td><td class="r">${secRateDisp}</td><td></td><td class="r">${inr(secTotal)}</td></tr>`;
      if (secCollapsed) continue;
      for (const cat of catOrder) {
        const gi = groups[cat];
        const catTotal = gi.reduce((s,i)=> s + (parseFloat(i.amount)||0), 0);
        const catKey = `${sec.id}::${cat}`;
        const catCollapsed = !!cat && collapsedCats.has(catKey);
        const catRateSum = gi.reduce((s,i)=> s + (parseFloat(i.rate)||0), 0);
        const catQtySum  = gi.reduce((s,i)=> s + (parseFloat(i.qty)||0), 0);
        const catArea    = parseFloat(gi[0]?.qty) || 0;
        const catQtyDisp = secPerItem ? catQtySum : catArea;
        const catRateDisp = secPerItem ? "" : inr(catRateSum) + "/sqft";
        if (cat) body += `<tr class="cat"><td colspan="2">${catCollapsed ? "▸ " : "▾ "}${esc(cat)} <span class="cnt">· ${gi.length} item${gi.length===1?"":"s"}</span></td><td class="r">${Math.round(catQtyDisp).toLocaleString("en-IN")}</td><td class="r">${catRateDisp}</td><td></td><td class="r">${inr(catTotal)}</td></tr>`;
        if (catCollapsed) continue;
        for (const it of gi) {
          body += `<tr><td class="it">${esc(it._clean)}</td><td>${esc(it.unit||"")}</td><td class="r">${(parseFloat(it.qty)||0).toLocaleString("en-IN")}</td><td class="r">${inr(it.rate)}</td><td class="r">${inr(it.amount)}</td><td></td></tr>`;
        }
      }
    }

    // ── Tax / charge summary (uses estimate header %s) ──
    const retPct = parseFloat(selEst?.retention_pct)||0;
    const tdsPct = parseFloat(selEst?.tds_pct)||0;
    const taxPct = parseFloat(selEst?.tax_pct)||0;
    const retAmt = Math.round(grand * retPct/100);
    const tdsAmt = Math.round(grand * tdsPct/100);
    const taxAmt = Math.round(grand * taxPct/100);
    const net    = grand - retAmt - tdsAmt + taxAmt;
    let summary = `<div class="row"><span>Gross Amount</span><span>${inr(grand)}</span></div>`;
    if (retPct) summary += `<div class="row ret"><span>Retention (${retPct}%)</span><span>− ${inr(retAmt)}</span></div>`;
    if (tdsPct) summary += `<div class="row tds"><span>TDS (${tdsPct}%)</span><span>− ${inr(tdsAmt)}</span></div>`;
    if (taxPct) summary += `<div class="row"><span>Tax (${taxPct}%)</span><span>+ ${inr(taxAmt)}</span></div>`;
    summary += `<div class="row net"><span>NET PAYABLE</span><span>${inr(net)}</span></div>`;

    // ── Notes / Terms & Conditions ──
    const notes = (selEst?.description || "").trim();
    const terms = (selEst?.remark || "").trim();
    let termsBlock = "";
    if (notes) termsBlock += `<div class="tc"><div class="tch">Notes</div><div class="tcb">${esc(notes)}</div></div>`;
    if (terms) termsBlock += `<div class="tc"><div class="tch">Terms &amp; Conditions</div><div class="tcb">${esc(terms)}</div></div>`;

    const w = window.open("", "_blank");
    if (!w) { window.alert("Pop-up blocked — allow pop-ups to export PDF."); return; }
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>BOQ — ${esc(selEst?.estimate_no || "")}</title>
      <style>
        body{font-family:'Segoe UI',system-ui,sans-serif;color:#111827;margin:22px;font-size:12px}
        h1{font-size:18px;margin:0 0 2px}.sub{font-size:11px;color:#6B7280;margin-bottom:14px}
        .meta{display:flex;flex-wrap:wrap;gap:18px;margin:10px 0 16px;padding:10px 14px;background:#F8F9FB;border:1px solid #E5E7EB;border-radius:8px}
        .meta div{font-size:11px}.meta .l{color:#6B7280;text-transform:uppercase;letter-spacing:.3px;font-size:9.5px}
        .meta .v{font-weight:700;color:#111827;font-size:12.5px}
        table{width:100%;border-collapse:collapse}
        th{background:#EFF6FF;color:#1D4ED8;text-align:left;padding:7px 9px;font-size:10px;text-transform:uppercase;letter-spacing:.3px;border-bottom:2px solid #BFDBFE}
        td{padding:6px 9px;border-bottom:1px solid #F3F4F6}
        td.r{text-align:right;font-variant-numeric:tabular-nums}
        tr.sec td{background:#EFF6FF;color:#1D4ED8;font-weight:800;border-top:1px solid #BFDBFE}
        tr.cat td{background:#F1F5F9;color:#111827;font-weight:700;padding-left:16px}
        td.it{padding-left:24px}
        .tag{font-size:8px;font-weight:700;background:#FEF3C7;color:#92400E;padding:1px 5px;border-radius:3px;letter-spacing:.3px}
        .cnt{font-size:9.5px;color:#9CA3AF;font-weight:500}
        .totals{margin-top:16px;width:300px;margin-left:auto;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden}
        .totals .row{display:flex;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #F3F4F6;font-size:12px}
        .totals .row.ret{color:#D97706}.totals .row.tds{color:#DC2626}
        .totals .row.net{background:#ECFDF5;color:#059669;font-weight:800;font-size:13px;border-bottom:none}
        .tc{margin-top:16px}.tch{font-size:10.5px;font-weight:800;color:#374151;text-transform:uppercase;letter-spacing:.3px;margin-bottom:3px}
        .tcb{font-size:11.5px;color:#4B5563;white-space:pre-wrap;line-height:1.5}
        .footer{margin-top:22px;font-size:10px;color:#9CA3AF;text-align:center}
        @media print{body{margin:12mm}}
      </style></head><body>
        <h1>Bill of Quantities</h1>
        <div class="sub">Generated ${today}</div>
        <div class="meta">
          <div><div class="l">Estimate</div><div class="v">${esc(selEst?.estimate_no || "—")}</div></div>
          <div><div class="l">Customer</div><div class="v">${esc(selEst?.customer_name || "—")}</div></div>
          <div><div class="l">Project</div><div class="v">${esc(project?.name || "—")}</div></div>
          <div><div class="l">Billing</div><div class="v">${esc(selEst?.billing_method || "—")}</div></div>
        </div>
        <table>
          <tr><th>Description</th><th>Unit</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th><th style="text-align:right">Subtotal</th></tr>
          ${body}
        </table>
        <div class="totals">${summary}</div>
        ${termsBlock}
        <div class="footer">Generated by GB Buildcon · ${esc(selEst?.estimate_no || "")}</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // Library data — loaded once for the Library Picker. Cities + packages +
  // construction types feed the city/construction badge next to each rate.
  const [libItems, setLibItems] = useState([]);
  const [libCities, setLibCities] = useState([]);
  const [libPackages, setLibPackages] = useState([]);
  const [libConTypes, setLibConTypes] = useState([]);
  const [libRates, setLibRates] = useState([]);   // [{package_id, city_id, item_id, rate}]
  const [libPicker, setLibPicker] = useState(null); // { si, ii } or null
  const [libFilterCity, setLibFilterCity] = useState(null);
  const [libFilterPkg, setLibFilterPkg] = useState(null);
  const [libSearch, setLibSearch] = useState("");

  useEffect(() => {
    if (!projectId) return;
    loadEstimates();
    api.get("/customer-estimates/customers").then(r => { if(r.success) setCustomers(r.data||[]); }).catch(()=>{});
    // Load library data in parallel (small payloads, fine to keep in memory).
    Promise.all([
      api.get("/library/boq-items").catch(()=>({success:false})),
      api.get("/library/cities").catch(()=>({success:false})),
      api.get("/library/rate-packages").catch(()=>({success:false})),
      api.get("/library/construction-types").catch(()=>({success:false})),
    ]).then(([bi, ci, pk, ct]) => {
      if (bi.success) setLibItems(bi.data||[]);
      if (ci.success) setLibCities(ci.data||[]);
      if (pk.success) setLibPackages(pk.data||[]);
      if (ct.success) setLibConTypes(ct.data||[]);
    });
  }, [projectId]);

  // When city + package selected, fetch rates for that combo.
  useEffect(() => {
    if (!libFilterCity || !libFilterPkg) { setLibRates([]); return; }
    api.get("/library/rate-matrix?city_id="+libFilterCity.id+"&package_id="+libFilterPkg.id)
      .then(r => { if (r.success) setLibRates(r.data||[]); })
      .catch(()=>{});
  }, [libFilterCity, libFilterPkg]);

  // Effective rate for a library item in current city/package context (falls back to base_rate).
  const libEffectiveRate = (item) => {
    const row = libRates.find(x => parseInt(x.item_id) === parseInt(item.id));
    return row ? parseFloat(row.rate) : parseFloat(item.base_rate || 0);
  };
  const libConTypeName = (pkg) => {
    const ct = libConTypes.find(x => parseInt(x.id) === parseInt(pkg?.construction_type_id));
    return ct?.name || "";
  };

  const pickLibraryItem = (libItem) => {
    if (!libPicker) return;
    const { si, ii } = libPicker;
    const rate = libEffectiveRate(libItem);
    setEstForm(p => {
      const s = [...p.sections];
      s[si] = { ...s[si], items: s[si].items.map((it, i) => i === ii ? {
        ...it,
        description: libItem.name + (libItem.description ? " — " + libItem.description : ""),
        unit: libItem.unit || it.unit,
        rate: String(rate),
        library_item_id: libItem.id,
        library_city: libFilterCity?.name,
        library_type: libConTypeName(libFilterPkg),
      } : it) };
      return { ...p, sections: s };
    });
    setLibPicker(null);
  };

  const loadEstimates = async () => {
    setLoading(true);
    const r = await api.get("/customer-estimates?project_id="+projectId).catch(()=>({success:false}));
    if (r.success) setEstimates(r.data||[]);
    setLoading(false);
  };

  const selectEst = async (est) => {
    setSelEst(est);
    setSubTab("boq");
    const [det, sum, inv, pay, ms] = await Promise.all([
      api.get("/customer-estimates/"+est.id).catch(()=>({success:false})),
      api.get("/customer-estimates/"+est.id+"/summary").catch(()=>({success:false})),
      // Scope invoices + payments to THE SELECTED ESTIMATE so multi-customer
      // projects (e.g., different flats in same tower, each with own estimate)
      // don't cross-contaminate. Standalone manual invoices (estimate_id=NULL)
      // are loaded separately below as "Project-level manual invoices".
      api.get("/customer-estimates/invoices/list?estimate_id="+est.id).catch(()=>({success:false})),
      api.get("/customer-estimates/payments/list?estimate_id="+est.id).catch(()=>({success:false})),
      api.get("/customer-estimates/"+est.id+"/milestones").catch(()=>({success:false})),
    ]);
    if (det.success) {
      setEstDetail(det.data);
      // Refresh selEst from the detail so header fields like billing_method stay fresh
      // after server-side mutations (e.g. apply-library-stages flips it to milestone_rate).
      setSelEst(prev => prev ? { ...prev, ...det.data } : prev);
    }
    if (sum.success) setSummary(sum.data);
    if (inv.success) setInvoices(inv.data||[]);
    if (pay.success) setPayments(pay.data||[]);
    if (ms.success)  setMilestones(ms.data||{rate_by_item:{},percent:[]});
    loadAmendments(est.id);
    loadLinkedTasks(est.id);
    // Pull standalone (no-estimate) manual invoices for this project once.
    // Same payload regardless of which estimate is selected — they're
    // project-level by definition.
    api.get("/customer-estimates/invoices/list?project_id="+projectId+"&standalone=1")
      .then(r => { if (r?.success) setStandaloneInvoices(r.data || []); })
      .catch(()=>{});
  };

  const reloadSel = async () => { if (selEst) await selectEst(selEst); };

  const submitEst = async () => {
    const validSecs = estForm.sections
      .map(s => ({ title: s.title, items: s.items.filter(i => i.description && i.qty && i.rate) }))
      .filter(s => s.items.length > 0);
    if (!estForm.customer_name && !estForm.customer_id) return alert("Customer required");
    if (validSecs.length === 0) return alert("Add at least one item with description, qty, rate");
    setSaving(true);
    const r = await api.post("/customer-estimates", {
      project_id: projectId,
      customer_id: estForm.customer_id || null,
      customer_name: estForm.customer_name,
      description: estForm.description,
      retention_pct: parseFloat(estForm.retention_pct||0),
      tds_pct: parseFloat(estForm.tds_pct||0),
      tax_pct: parseFloat(estForm.tax_pct||0),
      sections: validSecs.map(s => ({
        title: s.title,
        items: s.items.map(i => ({
          description: i.description, unit: i.unit||"",
          qty: parseFloat(i.qty), rate: parseFloat(i.rate),
          library_item_id: i.library_item_id || null,
        })),
      })),
    }).catch(()=>({success:false}));
    setSaving(false);
    if (r.success) {
      setShowNewEst(false);
      setEstForm({ customer_id:"", customer_name:"", retention_pct:5, tds_pct:1, tax_pct:0, description:"",
        sections:[{title:"Section 1",items:[{description:"",unit:"",qty:"",rate:""}]}] });
      await loadEstimates();
      await selectEst(r.data);
    } else alert(r.message || "Failed");
  };

  const submitInvoice = async () => {
    if (!selEst && invForm.source === "milestone") return alert("Select an estimate first");

    // ── Over-Billing Mode validation ─────────────────────────────
    // Reason is compulsory when mode is on. Frontend guard saves a
    // round-trip; backend also enforces with OVER_BILL_REASON_REQUIRED.
    if (invForm.overBillMode && !invForm.overBillReason.trim()) {
      return alert("Over-Billing Mode is on. Please add a reason (compulsory for audit trail).");
    }

    setSaving(true);
    let body;
    if (invForm.source === "manual") {
      const items = invForm.manualItems.filter(i => i.description && i.qty && i.rate)
        .map(i => ({ description:i.description, qty:parseFloat(i.qty), rate:parseFloat(i.rate) }));
      if (items.length === 0) { setSaving(false); return alert("Add at least one line"); }
      body = {
        project_id: projectId, source: "manual",
        invoice_date: invForm.invoice_date, remark: invForm.remark,
        customer_name: invForm.customer_name || selEst?.customer_name || "",
        retention_pct: parseFloat(invForm.retention_pct||0),
        tds_pct: parseFloat(invForm.tds_pct||0),
        tax_pct: parseFloat(invForm.tax_pct||0),
        items,
        // Over-bill flags pass through on manual invoices too.
        is_over_bill:     invForm.overBillMode ? 1 : 0,
        over_bill_reason: invForm.overBillMode ? invForm.overBillReason.trim() : null,
      };
    } else {
      const items = invForm.items.filter(i => i.milestone_id);
      if (items.length === 0) { setSaving(false); return alert("Select at least one milestone"); }

      // Translate this_qty → cumulative_qty for the backend.
      // Ledger has billed_qty per milestone; cumulative = billed + this_qty.
      const ledgerByMs = {};
      if (billingLedger?.mode === "milestone_rate") {
        for (const it of (billingLedger.items || [])) {
          for (const m of (it.milestones || [])) ledgerByMs[m.milestone_id] = m;
        }
      }

      // ── Auto-split logic for Over-Billing Mode (user's Case 3) ──
      // For each picked milestone, compute normal vs over portions.
      // If ANY milestone needs splitting → fire 2 sequential API calls:
      //   Call 1: normal invoice (in-BOQ portions only), is_over_bill=false
      //   Call 2: over invoice (excess portions only), is_over_bill=true,
      //           linked_invoice_id = Call 1's id, over_bill_reason
      // If only FULL_OVER (no normal portion anywhere) → single over-bill call.
      // If no over-billing at all → single normal call (existing behavior).
      const normalItems = [];
      const overItems   = [];
      for (const i of items) {
        const ms = ledgerByMs[i.milestone_id];
        const remainingQty = ms ? (Number(ms.remaining_qty) || 0) : 0;
        const billedQty    = ms ? (Number(ms.billed_qty)    || 0) : 0;
        const thisQty      = parseFloat(i.this_qty) || 0;
        const normalQ = Math.min(thisQty, Math.max(0, remainingQty));
        const overQ   = Math.max(0, thisQty - Math.max(0, remainingQty));
        if (normalQ > 0) {
          normalItems.push({
            milestone_id: i.milestone_id,
            cumulative_qty: billedQty + normalQ,
          });
        }
        if (overQ > 0) {
          // Over portion: cumulative_qty = total billed + normal portion
          // (which is now billed by the normal invoice) + the over qty.
          overItems.push({
            milestone_id: i.milestone_id,
            cumulative_qty: billedQty + normalQ + overQ,
          });
        }
      }

      const baseBody = (msItems, opts = {}) => ({
        estimate_id: selEst.id,
        invoice_date: invForm.invoice_date,
        remark: invForm.remark,
        items: msItems,
        ...opts,
      });

      // Helper: post one invoice (CASE D normal portion).
      // 60s timeout — Railway can be cold on local; deployed Railway is warm.
      const postOne = (payload) =>
        api.post("/customer-estimates/invoices", payload, { timeoutMs: 60000 }).catch(() => ({ success: false }));

      let firstId = null;

      // CASE A: nothing to bill
      if (normalItems.length === 0 && overItems.length === 0) {
        setSaving(false);
        return alert("Nothing to bill — all selected milestones resolved to 0 qty.");
      }

      // CASE B: only normal items → single normal invoice
      if (overItems.length === 0) {
        body = baseBody(normalItems);
      }
      // CASE C: only over-bill items (no in-BOQ portion) → single over-bill invoice
      else if (normalItems.length === 0) {
        if (!invForm.overBillMode) {
          setSaving(false);
          return alert("⚠ One or more milestones are fully billed but you've entered extra quantity.\n\nTo proceed:\n• Click '+ Over-Billing' toggle at the top of the modal\n• Add a reason explaining the extra work\n• Save\n\nOr reduce the quantity to stay within BOQ.");
        }
        body = baseBody(overItems, {
          is_over_bill: 1,
          over_bill_reason: invForm.overBillReason.trim(),
        });
      }
      // CASE D: BOTH normal + over portions.
      //   Call 1 (postOne) → normal invoice.
      //   Call 2 (postOne) → over-bill linked invoice.
      //   Self-contained: returns here; does NOT fall through to the shared api.post below.
      else {
        if (!invForm.overBillMode) {
          setSaving(false);
          return alert("⚠ Some quantities exceed BOQ remaining.\n\nTo proceed:\n• Click '+ Over-Billing' toggle at the top of the modal\n• Add a reason for the extra qty\n• System will auto-split into 2 linked invoices (BOQ portion + over-bill portion)\n\nOr reduce qty to fit within remaining.");
        }
        const firstBody = baseBody(normalItems);
        const r1 = await postOne(firstBody);   // Call 1 — normal portion
        if (!r1.success || !r1.data?.id) {
          setSaving(false);
          return alert("Normal portion save failed: " + (r1.message || "Server error"));
        }
        firstId = r1.data.id;
        // Call 2 — over-bill linked to normal (explicit postOne, NOT via fall-through)
        const r2 = await postOne(baseBody(overItems, {
          is_over_bill: 1,
          over_bill_reason: invForm.overBillReason.trim(),
          linked_invoice_id: firstId,
        }));
        setSaving(false);
        if (!r2.success) {
          return alert("Over-bill portion failed: " + (r2.message || "Server error") +
                       "\n\nNormal invoice (id=" + firstId + ") was saved.");
        }
        setShowNewInv(false);
        setInvForm({ source:"milestone", invoice_date: localYMD(), remark:"", items:[],
          manualItems:[{description:"",qty:"",rate:""}], tax_pct:0, retention_pct:0, tds_pct:0, customer_name:"",
          overBillMode: false, overBillReason: "" });
        await reloadSel();
        if (!selEst) await loadEstimates();
        return;
      }
    }

    // ── Debug guard: body must be set by one of the CASE branches above.
    if (!body) {
      setSaving(false);
      console.error('[SUBMIT] body is undefined — CASE routing failed. invForm:', JSON.stringify({ source: invForm.source, overBillMode: invForm.overBillMode, _editId: invForm._editId }));
      return alert("Internal error: invoice body not prepared. Please refresh and try again.");
    }
    console.log('[SUBMIT] Sending invoice body:', JSON.stringify(body));

    // Edit path (PS-19): manual invoice being edited → PUT instead of POST.
    // 60s timeout: Railway cold start protection.
    const r = invForm._editId
      ? await api.put("/customer-estimates/invoices/" + invForm._editId, body, { timeoutMs: 60000 }).catch((e)=>{ console.error('[SUBMIT] PUT error:', e); return {success:false,message:String(e)}; })
      : await api.post("/customer-estimates/invoices", body, { timeoutMs: 60000 }).catch((e)=>{ console.error('[SUBMIT] POST error:', e); return {success:false,message:String(e)}; });
    console.log('[SUBMIT] result:', JSON.stringify({ success: r?.success, invoice_no: r?.data?.invoice_no, id: r?.data?.id, message: r?.message }));
    setSaving(false);

    // Handle the backend's 422 WOULD_OVER_BILL response — surfaces when
    // user submits without Over-Billing Mode but qty exceeded BOQ.
    if (!r.success && r.code === "WOULD_OVER_BILL" && Array.isArray(r.items)) {
      const lines = r.items.map(it =>
        `• ${it.description}: BOQ ${it.boq_qty}, already billed ${it.already_billed}, over by ${it.over_by_qty}`
      ).join("\n");
      alert("Some items exceed BOQ:\n\n" + lines + "\n\nTurn on Over-Billing Mode + add a reason to proceed.");
      return;
    }

    if (r.success) {
      setShowNewInv(false);
      setInvForm({ source:"milestone", invoice_date: localYMD(), remark:"", items:[],
        manualItems:[{description:"",qty:"",rate:""}], tax_pct:0, retention_pct:0, tds_pct:0, customer_name:"",
        overBillMode: false, overBillReason: "" });
      await reloadSel();
      if (!selEst) await loadEstimates();
    } else alert(r.message || "Failed");
  };

  const submitPayment = async () => {
    if (!showPay || !payForm.amount_received) return alert("Amount required");
    setSaving(true);
    const r = await api.post("/customer-estimates/payments", {
      invoice_id: showPay,
      amount_received: parseFloat(payForm.amount_received),
      payment_date: payForm.payment_date,
      payment_mode: payForm.payment_mode,
      reference_no: payForm.reference_no,
      remark: payForm.remark,
    }).catch(()=>({success:false}));
    setSaving(false);
    if (r.success) {
      setShowPay(null);
      setPayForm({amount_received:"",payment_date:localYMD(),payment_mode:"Bank Transfer",reference_no:"",remark:""});
      await reloadSel();
    } else alert(r.message || "Failed");
  };

  // ── Module C (pivoted): link milestones to EXISTING project tasks ────
  // No new task creation. User picks a task from the project's existing
  // task list and sets a trigger_pct (default 100). When the task's
  // progress reaches trigger_pct, the milestone becomes eligible for
  // auto-billing (Module B's hook will fire — Module B+ work).
  const [linkedTasks,   setLinkedTasks]   = useState({});       // { [milestone_id]: {task_id, task_name, progress, trigger_pct, eligible} }
  const [taskPickerFor, setTaskPickerFor] = useState(null);     // milestone id currently being linked
  const [projectTasks,  setProjectTasks]  = useState([]);       // all project_tasks for picker
  const [taskPickerSearch, setTaskPickerSearch] = useState("");
  const [linkTriggerPct, setLinkTriggerPct] = useState(100);
  const [linkSelectedTaskId, setLinkSelectedTaskId] = useState(null);
  const [linking, setLinking]             = useState(false);

  const [linkedTasksLoading, setLinkedTasksLoading] = useState(false);
  const [linkedTasksLastFetch, setLinkedTasksLastFetch] = useState(null);
  const loadLinkedTasks = async (estId) => {
    if (!estId) return;
    setLinkedTasksLoading(true);
    const r = await api.get("/customer-estimates/"+estId+"/linked-tasks").catch(()=>({success:false}));
    setLinkedTasksLoading(false);
    if (r?.success) {
      setLinkedTasks(r.data || {});
      setLinkedTasksLastFetch(Date.now());
    }
    // Also refresh the project task list so the picker shows latest progress
    if (projectId) {
      api.get("/projects/"+projectId+"/tasks").then(r2 => {
        if (r2?.success) setProjectTasks(r2.data || []);
      }).catch(()=>{});
    }
  };
  // Load the project's full WBS task list (same source as the Tasks tab:
  // /tasks?project_id — NOT /projects/:id/tasks which is todo-only). This
  // gives parent + child tasks so the link drawer can show the hierarchy.
  const reloadProjectTasks = async () => {
    if (!projectId) return [];
    const r = await api.get("/tasks?project_id="+projectId).catch(()=>({success:false}));
    const rows = r?.success ? (r.data || []) : [];
    setProjectTasks(rows);
    return rows;
  };
  const openTaskPicker = async (milestoneId) => {
    const existing = linkedTasks[milestoneId];
    setLinkSelectedTaskId(existing?.task_id || null);
    setLinkTriggerPct(existing?.trigger_pct ?? 100);
    setTaskPickerSearch("");
    setTaskPickerExpanded({});
    setTaskPickerFor(milestoneId);
    // Always refetch so newly-created tasks appear immediately.
    await reloadProjectTasks();
  };
  // Expand/collapse state for parent task rows in the picker
  const [taskPickerExpanded, setTaskPickerExpanded] = useState({});
  // Create-task modal (reuses PTAddTask) launched from the link drawer
  const [showCreateTaskFor, setShowCreateTaskFor] = useState(false);
  const createTaskFromPicker = async (form) => {
    if (!projectId) return;
    const dur = form.duration || (form.baseStart && form.baseEnd
      ? Math.round((new Date(form.baseEnd) - new Date(form.baseStart)) / 86400000) + 1 : 0);
    const r = await api.post("/tasks", {
      project_id: projectId,
      parent_id: null,
      name: form.name,
      category: form.category,
      tag: form.tag || "",
      assigned_to: null,
      base_start: form.baseStart || null,
      base_end: form.baseEnd || null,
      duration: dur,
      dependencies: form.dependencies || [],
      dhyan_rakhen: form.dhyanRakhen || null,
    }).catch(e => ({ success:false, message:e.message }));
    if (!r?.success) { alert(r?.message || "Task create failed"); return; }
    setShowCreateTaskFor(false);
    const rows = await reloadProjectTasks();
    // Auto-select the freshly created task in the picker
    const newId = r.data?.id || r.data?.insertId;
    if (newId) setLinkSelectedTaskId(newId);
  };
  const confirmLinkTask = async () => {
    if (!taskPickerFor || !linkSelectedTaskId) return;
    setLinking(true);
    const r = await api.put("/customer-estimates/milestones/rate/"+taskPickerFor+"/link", {
      task_id: linkSelectedTaskId, trigger_pct: linkTriggerPct,
    }).catch(e => ({ success:false, message:e.message }));
    setLinking(false);
    if (!r?.success) { alert(r?.message || "Link failed"); return; }
    setTaskPickerFor(null);
    await loadLinkedTasks(selEst.id);
  };
  const unlinkTask = async (milestoneId) => {
    if (!await window.confirmAsync("Unlink this milestone from its task?")) return;
    const r = await api.del("/customer-estimates/milestones/rate/"+milestoneId+"/link")
      .catch(e => ({ success:false, message:e.message }));
    if (!r?.success) { alert(r?.message || "Unlink failed"); return; }
    await loadLinkedTasks(selEst.id);
  };

  // ── Auto-bill invoice preview (Module D follow-up) ────────────
  // When an auto-bill invoice is created in Draft state, admin clicks
  // "Review Preview" → this modal loads /invoices/:id/preview which
  // returns invoice + items + the triggering task with its progress.
  // Admin can Confirm & Submit (→ Submitted) or Reject (→ delete draft).
  const [previewInv, setPreviewInv]       = useState(null); // {invoice, items, trigger_task}
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewConfirming, setPreviewConfirming] = useState(false);
  const openInvoicePreview = async (invId) => {
    setPreviewLoading(true);
    const r = await api.get("/customer-estimates/invoices/"+invId+"/preview").catch(()=>({success:false}));
    setPreviewLoading(false);
    if (!r?.success) { alert(r?.message || "Failed to load preview"); return; }
    setPreviewInv(r.data);
  };
  const confirmAutoInvoice = async () => {
    if (!previewInv?.invoice?.id) return;
    setPreviewConfirming(true);
    const r = await api.patch("/customer-estimates/invoices/"+previewInv.invoice.id+"/confirm")
      .catch(e => ({ success:false, message:e.message }));
    setPreviewConfirming(false);
    if (!r?.success) { alert(r?.message || "Confirm failed"); return; }
    setPreviewInv(null);
    await reloadSel();
  };
  const rejectAutoInvoice = async () => {
    if (!previewInv?.invoice?.id) return;
    if (!await window.confirmAsync("Reject and delete this auto-generated draft invoice?\n\nThe milestone will become eligible again on next trigger.")) return;
    setPreviewConfirming(true);
    const r = await api.del("/customer-estimates/invoices/"+previewInv.invoice.id)
      .catch(e => ({ success:false, message:e.message }));
    setPreviewConfirming(false);
    if (!r?.success) { alert(r?.message || "Reject failed"); return; }
    setPreviewInv(null);
    await reloadSel();
  };

  // ── Edit existing payment schedule (open modal pre-loaded) ────
  // Two entry points:
  //   - editRateSchedule(itemId)  → opens Item-wise modal with that item
  //                                  pre-picked + its stages loaded.
  //   - editPercentSchedule()     → opens % mode with existing pct stages.
  const editRateSchedule = (itemId) => {
    // Value-driven (PS-22): load per-milestone rate (inc_rate) + qty.
    const itm = (estDetail?.sections||[]).flatMap(s=>s.items).find(x=>x.id===itemId);
    const stored = (milestones.rate_by_item[itemId] || [])
      .slice()
      .sort((a,b) => a.seq - b.seq)
      .map(m => ({
        seq: m.seq,
        name: m.name || "",
        rate: String(m.inc_rate || ""),
        qty: m.qty != null ? String(m.qty) : (itm ? String(parseFloat(itm.qty)||0) : ""),
      }));
    setMsForm(p => ({
      ...p,
      kind: "rate",
      pickedItemIds: [itemId],
      itemStages: { [itemId]: stored.length ? stored : [{seq:0,name:"",rate:"",qty:""}] },
      expandedItemId: itemId,
    }));
    setShowSetMs(true);
  };
  const editPercentSchedule = () => {
    const stored = (milestones.percent || [])
      .slice()
      .sort((a,b) => a.seq - b.seq)
      .map(m => ({ seq:m.seq, name:m.name||"", pct: String(m.pct||"") }));
    setMsForm(p => ({
      ...p,
      kind: "percent",
      pctMs: stored.length ? stored : [{seq:0,name:"",pct:""}],
    }));
    setShowSetMs(true);
  };
  const deleteRateSchedule = async (itemId, itemName) => {
    if (!await window.confirmAsync(`Delete payment schedule for "${itemName}"?\n\nAll milestones for this item will be removed. Existing invoices stay intact.`)) return;
    const r = await api.del("/customer-estimates/"+selEst.id+"/milestones/rate/"+itemId).catch(e => ({success:false, message:e.message}));
    if (!r?.success) { alert(r?.message || "Delete failed"); return; }
    await reloadSel();
  };
  const deletePercentSchedule = async () => {
    if (!await window.confirmAsync("Delete the entire % payment schedule?\n\nAll stages will be removed. Existing invoices stay intact.")) return;
    const r = await api.del("/customer-estimates/"+selEst.id+"/milestones/percent").catch(e => ({success:false, message:e.message}));
    if (!r?.success) { alert(r?.message || "Delete failed"); return; }
    await reloadSel();
  };

  const submitMilestones = async () => {
    if (!selEst) return;
    setSaving(true);
    let r;
    if (msForm.kind === "rate") {
      // Value-driven (PS-22): each milestone carries its own rate + qty.
      // Block save if any item is over-allocated (Σ value > item value).
      const allItems = (estDetail?.sections||[]).flatMap(s => s.items);
      const itemById = {}; for (const x of allItems) itemById[x.id] = x;
      for (const itemId of msForm.pickedItemIds) {
        const it = itemById[itemId];
        if (!it) continue;
        const itemTotal = (parseFloat(it.rate)||0) * (parseFloat(it.qty)||0);
        const allocated = (msForm.itemStages[itemId] || [])
          .reduce((s,m) => s + (parseFloat(m.rate)||0) * (parseFloat(m.qty)||0), 0);
        if (allocated - itemTotal > 0.5) {
          setSaving(false);
          return alert(`"${(it.description||"").replace(/^\[[^\]]+\]\s*/,"")}" is over-allocated.\n\nMilestone values (₹${Math.round(allocated).toLocaleString("en-IN")}) exceed item value (₹${Math.round(itemTotal).toLocaleString("en-IN")}). Reduce a milestone before saving.`);
        }
      }
      const itemsPayload = msForm.pickedItemIds
        .map(itemId => {
          const stages = (msForm.itemStages[itemId] || [])
            .filter(m => m.name && m.rate && m.qty)
            .map((m,i) => ({
              seq:i,
              name:m.name,
              rate: parseFloat(m.rate),     // value-driven: per-milestone ₹/unit
              qty:  parseFloat(m.qty),
            }));
          return stages.length > 0 ? { estimate_item_id: itemId, milestones: stages } : null;
        })
        .filter(Boolean);
      if (itemsPayload.length === 0) {
        setSaving(false);
        return alert("Pick at least one item and add at least one milestone with rate + qty.");
      }
      if (selEst.billing_method !== "milestone_rate") {
        await api.put("/customer-estimates/"+selEst.id+"/billing-method",{billing_method:"milestone_rate"});
      }
      r = await api.post("/customer-estimates/"+selEst.id+"/milestones/rate", {
        items: itemsPayload,
      }).catch(()=>({success:false}));
    } else {
      const ms = msForm.pctMs.filter(m => m.name && m.pct)
        .map((m,i) => ({ seq:i, name:m.name, pct: parseFloat(m.pct) }));
      if (ms.length === 0) { setSaving(false); return alert("Add at least one milestone"); }
      if (selEst.billing_method !== "milestone_percent") {
        await api.put("/customer-estimates/"+selEst.id+"/billing-method",{billing_method:"milestone_percent"});
      }
      r = await api.post("/customer-estimates/"+selEst.id+"/milestones/percent", {
        milestones: ms,
      }).catch(()=>({success:false}));
    }
    setSaving(false);
    if (r.success) {
      // Capture milestone count BEFORE reloading state, for the banner copy
      const justSavedMilestones = msForm.kind === "rate"
        ? msForm.pickedItemIds.reduce((n, id) => n + ((msForm.itemStages[id] || []).filter(s => s.name && s.cum_rate).length), 0)
        : msForm.pctMs.filter(m => m.name && m.pct).length;
      setShowSetMs(false);
      setMsForm({
        kind:"rate", estimate_item_id:null,
        rateMs:[{seq:0,name:"",cum_rate:""}], pctMs:[{seq:0,name:"",pct:""}],
        pickedItemIds:[], itemStages:{}, expandedItemId:null,
      });
      await reloadSel();
      if (r.data?.warnings?.length) alert("Saved with warnings:\n" + r.data.warnings.join("\n"));
    } else alert(r.message || "Failed");
  };

  const deleteInvoice = async (invId, no) => {
    if (!await window.confirmAsync("Delete invoice " + no + "? This cannot be undone.")) return;
    const r = await api.del("/customer-estimates/invoices/" + invId);
    if (r.success) await reloadSel();
    else alert(r.message || "Delete failed");
  };

  // ── Form helpers (sections/items in New Estimate) ─────────────
  const addSection = () => setEstForm(p => ({
    ...p, sections: [...p.sections, { title: "Section " + (p.sections.length+1), items: [{description:"",unit:"",qty:"",rate:""}] }]
  }));
  const removeSection = (si) => setEstForm(p => ({ ...p, sections: p.sections.filter((_,i) => i !== si) }));
  const addItem = (si) => setEstForm(p => {
    const s = [...p.sections];
    s[si] = { ...s[si], items: [...s[si].items, {description:"",unit:"",qty:"",rate:""}] };
    return { ...p, sections: s };
  });
  const removeItem = (si, ii) => setEstForm(p => {
    const s = [...p.sections];
    s[si] = { ...s[si], items: s[si].items.filter((_,i) => i !== ii) };
    return { ...p, sections: s };
  });
  const setItemField = (si, ii, field, val) => setEstForm(p => {
    const s = [...p.sections];
    s[si] = { ...s[si], items: s[si].items.map((it,i) => i === ii ? { ...it, [field]: val } : it) };
    return { ...p, sections: s };
  });

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",gap:0,height:"100%",minHeight:520}}>
      {/* LEFT — Estimate list */}
      <div style={{width:230,borderRight:"1px solid "+T.b1,background:T.surfaceB,flexShrink:0,overflowY:"auto"}}>
        <div style={{padding:"10px 12px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
          <span style={{fontSize:11,fontWeight:700,color:T.t1}}>Estimates ({estimates.length})</span>
          <button onClick={()=>setEstChooserOpen(o=>!o)}
            style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"4px 8px",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
            + New ▾
          </button>
          {/* Chooser dropdown — 4 paths */}
          {estChooserOpen && (() => {
            const hasCity  = !!project?.city_id;
            const hasType  = !!project?.construction_type_id;
            const libReady = hasCity && hasType;
            const crmReady = crmQuotes.mode !== "none" && crmQuotes.quotes.length > 0 && libReady;
            const openBuilder = (mode, quoteId=null) => {
              setEstBuilderMode(mode);
              setEstBuilderQuoteId(quoteId);
              setEstBuilderOpen(true);
              setEstChooserOpen(false);
            };
            return (
              <>
                <div onClick={()=>setEstChooserOpen(false)}
                  style={{position:"fixed",inset:0,zIndex:200}}/>
                {/* Pulled LEFT so it overflows the narrow 230px sidebar
                    onto the wider main area. Fixed-positioned in viewport
                    coordinates so it can't get clipped by the sidebar. */}
                <div style={{position:"fixed",top:148,left:240,width:320,
                             background:"white",borderRadius:8,border:"1px solid "+T.b1,
                             boxShadow:"0 12px 32px rgba(0,0,0,0.18)",zIndex:201,overflow:"hidden"}}>
                  {!libReady && (
                    <div style={{padding:"8px 12px",fontSize:10.5,color:"#92400E",background:"#FFFBEB",borderBottom:"1px solid #FDE68A"}}>
                      ⚠️ Project missing City / Type — CRM path disabled. Library path will ask for them.
                    </div>
                  )}

                  {/* PATH 1 — Take from CRM Final Quote */}
                  {crmReady && crmQuotes.mode === "specific" && (
                    <div onClick={()=>openBuilder("from_quote", crmQuotes.quotes[0].id)}
                      style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                      onMouseEnter={e=>e.currentTarget.style.background="#F0FDF4"}
                      onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>📋 Take from CRM Final Quote</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>
                        {crmQuotes.quotes[0].quote_no} · ₹{Math.round(Number(crmQuotes.quotes[0].grand_total)||0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}
                  {crmReady && crmQuotes.mode === "all" && crmQuotes.quotes.length === 1 && (
                    <div onClick={()=>openBuilder("from_quote", crmQuotes.quotes[0].id)}
                      style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                      onMouseEnter={e=>e.currentTarget.style.background="#F0FDF4"}
                      onMouseLeave={e=>e.currentTarget.style.background="white"}>
                      <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>📋 Take from CRM Quote</div>
                      <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>
                        {crmQuotes.quotes[0].quote_no} · {crmQuotes.quotes[0].status}
                      </div>
                    </div>
                  )}
                  {crmReady && crmQuotes.mode === "all" && crmQuotes.quotes.length > 1 && (
                    <div style={{borderBottom:"1px solid "+T.b1}}>
                      <div style={{padding:"8px 12px 4px",fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px"}}>
                        📋 Take from CRM Quote
                      </div>
                      {crmQuotes.quotes.map(q => (
                        <div key={q.id} onClick={()=>openBuilder("from_quote", q.id)}
                          style={{padding:"7px 14px",cursor:"pointer",fontSize:11.5,color:"#0F172A",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#F0FDF4"}
                          onMouseLeave={e=>e.currentTarget.style.background="white"}>
                          <span><strong>{q.quote_no}</strong> · {q.status}</span>
                          <span style={{color:T.grn,fontWeight:600}}>₹{Math.round(Number(q.grand_total)||0).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PATH 2 — Pick from Library (asks for city/type inline if missing) */}
                  <div onClick={()=>openBuilder("library")}
                    style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                    onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                    onMouseLeave={e=>e.currentTarget.style.background="white"}>
                    <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>📚 Pick from Library</div>
                    <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>
                      {libReady ? "Pick a package + adjust quantities"
                               : "Will ask city + type, then pick package"}
                    </div>
                  </div>

                  {/* PATH 3 — Build from Scratch */}
                  <div onClick={()=>openBuilder("scratch")}
                    style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                    onMouseEnter={e=>e.currentTarget.style.background="#FAF5FF"}
                    onMouseLeave={e=>e.currentTarget.style.background="white"}>
                    <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>✏️ Build from Scratch</div>
                    <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>
                      Empty start — add sections + items from library or new
                    </div>
                  </div>

                  {/* PATH 4 — Quick Manual (existing modal, kept) */}
                  <div onClick={()=>{ setShowNewEst(true); setEstChooserOpen(false); }}
                    style={{padding:"10px 12px",cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                    onMouseLeave={e=>e.currentTarget.style.background="white"}>
                    <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>⚡ Quick Manual</div>
                    <div style={{fontSize:10.5,color:T.t3,marginTop:2}}>
                      Type free-form items — no library lookup
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
        {loading && <div style={{textAlign:"center",padding:"60px 0",color:T.t4,fontSize:11}}>Loading…</div>}
        {!loading && estimates.length === 0 && <div style={{padding:"24px 12px",textAlign:"center",color:T.t4,fontSize:12}}>No estimates yet</div>}
        {estimates.map(e => {
          const isSel = selEst?.id === e.id;
          const stC = e.status === "Active" ? T.grn : T.t4;
          const isDelOpen = delEstId === e.id;
          const delEnabled = delEstText.trim() === (e.estimate_no || "") && !delEstBusy;
          return (
            <div key={e.id} style={{borderBottom:"1px solid "+T.b1,background:isSel?"#EFF6FF":T.surfaceB,borderLeft:isSel?"3px solid "+T.blu:"3px solid transparent"}}>
              <div onClick={()=>selectEst(e)}
                style={{padding:"10px 12px",cursor:"pointer",position:"relative"}}>
                <div style={{fontSize:12,fontWeight:700,color:isSel?T.blu:T.t1,marginBottom:2,paddingRight:22}}>{e.customer_name || "—"}</div>
                <div style={{fontSize:10,color:T.t4,marginBottom:4}}>{e.estimate_no} · {e.billing_method}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:T.grn}}>{fmtC(e.total_value)}</span>
                  <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:stC+"22",color:stC}}>{e.status}</span>
                </div>
                {e.invoice_count > 0 && <div style={{fontSize:9.5,color:T.t4,marginTop:3}}>{e.invoice_count} invoice{e.invoice_count>1?"s":""}</div>}
                {/* Trash icon (top-right) — opens danger panel below */}
                <button onClick={(ev)=>{ ev.stopPropagation(); isDelOpen ? closeDelEst() : openDelEst(e); }}
                  title="Delete this estimate"
                  style={{position:"absolute",top:8,right:8,background: isDelOpen ? "#FEE2E2" : "transparent",
                          border:"1px solid " + (isDelOpen ? "#FCA5A5" : "transparent"),
                          color: isDelOpen ? "#DC2626" : "#94A3B8",
                          borderRadius:4,padding:"1px 5px",fontSize:11,cursor:"pointer",lineHeight:1}}>
                  🗑
                </button>
              </div>
              {/* Inline danger panel — type estimate_no to confirm */}
              {isDelOpen && (
                <div onClick={(ev)=>ev.stopPropagation()}
                  style={{padding:"9px 12px 11px",background:"#FEF2F2",borderTop:"1px solid #FCA5A5"}}>
                  <div style={{fontSize:10.5,color:"#7F1D1D",lineHeight:1.45,marginBottom:6}}>
                    Permanently delete <b>{e.estimate_no}</b>?
                    {e.invoice_count > 0 && <><br/><b style={{color:"#991B1B"}}>⚠ {e.invoice_count} invoice{e.invoice_count>1?"s":""} linked.</b> They'll lose their estimate reference.</>}
                    <br/>Type <b>{e.estimate_no}</b> below to confirm.
                  </div>
                  <input value={delEstText} onChange={(ev)=>setDelEstText(ev.target.value)}
                    placeholder={e.estimate_no}
                    style={{width:"100%",padding:"5px 8px",border:"1px solid #FCA5A5",borderRadius:5,fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:6}}/>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={closeDelEst} disabled={delEstBusy}
                      style={{flex:1,background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:5,padding:"4px",fontSize:10.5,fontWeight:600,cursor: delEstBusy?"not-allowed":"pointer"}}>
                      Cancel
                    </button>
                    <button onClick={()=>confirmDelEst(e)} disabled={!delEnabled}
                      style={{flex:1,background: delEnabled?"#DC2626":"#FCA5A5",border:"none",color:"white",borderRadius:5,padding:"4px",fontSize:10.5,fontWeight:700,cursor: delEnabled?"pointer":"not-allowed"}}>
                      {delEstBusy ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* "+ Manual Invoice" — available even without an estimate */}
        <div style={{padding:"10px 12px",borderTop:"1px solid "+T.b1,marginTop:8}}>
          <button onClick={()=>{ setInvForm(p=>({...p,source:"manual"})); setShowNewInv(true); }}
            style={{width:"100%",background:T.purL,color:T.pur,border:"1.5px dashed "+T.pur,borderRadius:6,padding:"7px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            + Manual Invoice
          </button>
          <div style={{fontSize:9.5,color:T.t4,marginTop:4,textAlign:"center"}}>Ad-hoc, not tied to an estimate</div>
        </div>
      </div>

      {/* RIGHT — Detail */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {!selEst && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:T.t4,flexDirection:"column",gap:8}}>
            <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5}><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <div style={{fontSize:13,color:T.t3}}>Select an estimate or create one</div>
          </div>
        )}

        {selEst && (<>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid "+T.b1,background:"#0F172A",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"white"}}>{selEst.customer_name || "—"}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{selEst.estimate_no} · {selEst.billing_method} · Ret {selEst.retention_pct}% · TDS {selEst.tds_pct}% · Tax {selEst.tax_pct}%</div>
              </div>
              <div style={{display:"flex",gap:16,alignItems:"center"}}>
                {summary && [
                  {l:"Estimate",v:fmtC(summary.estimate_value),c:"#94A3B8"},
                  {l:"Invoiced",v:fmtC(summary.total_invoiced),c:"#60A5FA"},
                  {l:"Received",v:fmtC(summary.total_received),c:"#4ADE80"},
                  {l:"Manual+",v:fmtC(summary.manual_extras),c:"#A78BFA"},
                  {l:"Balance",v:fmtC(summary.balance_receivable),c:"#F87171"},
                ].map(s => (
                  <div key={s.l} style={{textAlign:"right"}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>{s.l}</div>
                    <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sub Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid "+T.b1,background:T.surfaceB,flexShrink:0}}>
            {[
              {id:"boq",label:"BOQ / Items"},
              {id:"milestone",label:"Payment Schedule"},
              {id:"invoice",label:"Invoices ("+invoices.length+")"},
              // Payments tab removed — customer receipts are managed at the
              // Party Ledger level (Party tab → Receipt), not per-estimate.
              {id:"amend",label:"Amendments ("+amendments.length+")", dot: pendingAmendCount > 0},
            ].map(t => (
              <button key={t.id} onClick={()=>setSubTab(t.id)}
                style={{padding:"8px 16px",border:"none",background:"transparent",color:subTab===t.id?T.blu:T.t3,fontSize:12,fontWeight:subTab===t.id?700:400,cursor:"pointer",borderBottom:subTab===t.id?"2px solid "+T.blu:"2px solid transparent",fontFamily:"inherit",position:"relative"}}>
                {t.label}
                {t.dot && (
                  <span style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:"#EF4444"}}/>
                )}
              </button>
            ))}
            <div style={{flex:1}}/>
            <div style={{display:"flex",alignItems:"center",gap:6,paddingRight:12}}>
              {subTab==="boq" && estDetail && (
                <>
                  {/* Fold / expand all */}
                  <button onClick={expandAllBoq} title="Expand all sections"
                    style={{background:T.surface,border:"1px solid "+T.b1,color:T.t2,borderRadius:5,padding:"5px 9px",fontSize:11,fontWeight:600,cursor:"pointer"}}>⊞ Expand all</button>
                  <button onClick={collapseAllBoq} title="Collapse all sections"
                    style={{background:T.surface,border:"1px solid "+T.b1,color:T.t2,borderRadius:5,padding:"5px 9px",fontSize:11,fontWeight:600,cursor:"pointer"}}>⊟ Collapse all</button>
                  {/* Exports */}
                  <button onClick={exportBoqExcel} title="Download BOQ as Excel (CSV)"
                    style={{background:T.grnL,border:"1px solid "+T.grnM,color:T.grn,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>⬇ Excel</button>
                  <button onClick={exportBoqPdf} title="Download / print BOQ as PDF"
                    style={{background:T.redL,border:"1px solid "+T.redM,color:T.red,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>⬇ PDF</button>
                  <button onClick={openEditBoq}
                    title={pendingAmendCount > 0 ? "A pending amendment already exists — review it in the Amendments tab first" : "Propose changes to this estimate's BOQ (requires admin approval)"}
                    disabled={pendingAmendCount > 0}
                    style={{background: pendingAmendCount > 0 ? "#E5E7EB" : "#FEF3C7",
                            color: pendingAmendCount > 0 ? "#9CA3AF" : "#92400E",
                            border:"1px solid "+ (pendingAmendCount > 0 ? "#E5E7EB" : "#FCD34D"),
                            borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,
                            cursor: pendingAmendCount > 0 ? "not-allowed" : "pointer"}}>
                    ✎ Edit BOQ
                  </button>
                </>
              )}
              {subTab==="milestone" && (
                <>
                  {/* ↻ Refresh chip — pulls latest task progress from the
                      Tasks tab. Useful when user updates progress elsewhere
                      and wants to see if the milestone chip flips to
                      "ready to bill". Also auto-refreshes on tab switch. */}
                  {selEst.billing_method === "milestone_rate" && (
                    <button onClick={async()=>{
                        // Refresh progress also sweeps for any newly-eligible
                        // milestones that need auto-bill drafts. Two-in-one
                        // affordance — fast feedback loop for the PM.
                        await loadLinkedTasks(selEst.id);
                        if (selEst.auto_bill_on_complete) {
                          const sw = await api.post("/customer-estimates/"+selEst.id+"/auto-bill-sweep")
                            .catch(e => ({ success:false, message:e.message }));
                          if (sw?.success && sw.data?.created?.length > 0) {
                            alert(sw.data.created.length + " draft invoice" + (sw.data.created.length === 1 ? "" : "s") + " created for newly-eligible milestones. Review them in the Invoices tab.");
                            await reloadSel();
                          }
                        }
                      }}
                      disabled={linkedTasksLoading}
                      title={selEst.auto_bill_on_complete
                        ? "Refresh task progress + create drafts for any newly-eligible milestones"
                        : "Refresh task progress on milestones"}
                      style={{
                        background:"white",
                        color:T.t3,
                        border:"1px solid "+T.b1,
                        borderRadius:14,padding:"4px 10px",fontSize:10.5,fontWeight:600,
                        cursor: linkedTasksLoading ? "default" : "pointer",
                        display:"flex",alignItems:"center",gap:4,
                      }}>
                      {linkedTasksLoading ? "Refreshing…" : "↻ Refresh progress"}
                    </button>
                  )}
                  {/* 🤖 Auto-billing toggle — single estimate-level switch
                      (Module B). When ON + a linked task hits "Complete",
                      the future hook will auto-create a DRAFT invoice. Off
                      by default; safe opt-in. Toggle never affects existing
                      drafts — they wait for admin review regardless. */}
                  <button onClick={async()=>{
                      const next = !selEst.auto_bill_on_complete;
                      if (next && !await window.confirmAsync(
                        "Turn ON auto-billing?\n\n" +
                        "When a project task linked to a milestone is marked Complete, " +
                        "the system will auto-create a DRAFT invoice.\n\n" +
                        "Drafts always need your review before going to the customer. " +
                        "You can turn this off anytime."
                      )) return;
                      const r = await api.patch("/customer-estimates/"+selEst.id+"/auto-bill", { enabled: next })
                        .catch(e => ({ success:false, message:e.message }));
                      if (!r?.success) { alert(r?.message || "Failed"); return; }
                      // Optimistic local update — full reload would jump scroll
                      setSelEst(prev => prev ? { ...prev, auto_bill_on_complete: next ? 1 : 0 } : prev);
                      // When turning ON: sweep for already-eligible milestones.
                      // Tasks that were already past trigger before the toggle
                      // was enabled won't fire via PUT hook, so sweep catches them.
                      if (next) {
                        const sw = await api.post("/customer-estimates/"+selEst.id+"/auto-bill-sweep")
                          .catch(e => ({ success:false, message:e.message }));
                        if (sw?.success && sw.data?.created?.length > 0) {
                          alert("Auto-billing ON.\n\n" +
                                sw.data.created.length + " draft invoice" + (sw.data.created.length === 1 ? "" : "s") +
                                " created for already-eligible milestones.\nReview them in the Invoices tab.");
                          await reloadSel();
                        }
                      }
                    }}
                    title={selEst.auto_bill_on_complete
                      ? "Auto-billing is ON. Click to turn off."
                      : "Auto-billing is OFF. Click to turn on — drafts created on task completion."}
                    style={{
                      background: selEst.auto_bill_on_complete ? "#DCFCE7" : T.surfaceB,
                      color: selEst.auto_bill_on_complete ? "#15803D" : T.t3,
                      border:"1px solid " + (selEst.auto_bill_on_complete ? "#86EFAC" : T.b1),
                      borderRadius:14,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",gap:5,
                    }}>
                    🤖 Auto-bill {selEst.auto_bill_on_complete ? "ON" : "OFF"}
                  </button>
                <div style={{position:"relative"}}>
                  <button onClick={()=>setMsChooserOpen(o=>!o)}
                    style={{background:T.bluL,color:T.blu,border:"1px solid "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    + Set Schedule ▾
                  </button>
                  {msChooserOpen && (<>
                    {/* Click-outside scrim — sits below the menu, captures
                        clicks anywhere else to close. */}
                    <div onClick={()=>setMsChooserOpen(false)} style={{position:"fixed",inset:0,zIndex:200}}/>
                    <div style={{position:"absolute",top:30,right:0,width:280,background:"white",border:"1px solid "+T.b1,borderRadius:8,boxShadow:"0 12px 32px rgba(0,0,0,0.18)",zIndex:201,overflow:"hidden"}}>
                      <div style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",borderBottom:"1px solid "+T.b1,background:T.surfaceB}}>
                        Choose billing mode
                      </div>
                      {/* Item-wise — opens existing modal with kind=rate */}
                      <div onClick={()=>{
                          setMsForm(p=>({...p,kind:"rate",estimate_item_id:null}));
                          setShowSetMs(true); setMsChooserOpen(false);
                        }}
                        style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                        onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                        onMouseLeave={e=>e.currentTarget.style.background="white"}>
                        <div style={{fontSize:12,fontWeight:700,color:T.t1}}>📋 Item-wise</div>
                        <div style={{fontSize:10.5,color:T.t3,marginTop:2,lineHeight:1.4}}>
                          Pick BOQ items, define billing stages per item (₹/unit)
                        </div>
                      </div>
                      {/* % of Order Value */}
                      <div onClick={()=>{
                          setMsForm(p=>({...p,kind:"percent"}));
                          setShowSetMs(true); setMsChooserOpen(false);
                        }}
                        style={{padding:"10px 12px",cursor:"pointer",borderBottom:"1px solid "+T.b1}}
                        onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                        onMouseLeave={e=>e.currentTarget.style.background="white"}>
                        <div style={{fontSize:12,fontWeight:700,color:T.t1}}>📊 % of Order Value</div>
                        <div style={{fontSize:10.5,color:T.t3,marginTop:2,lineHeight:1.4}}>
                          Define milestones as % of total estimate value
                        </div>
                      </div>
                      {/* Manual — directly switches billing_method, no modal */}
                      <div onClick={async()=>{
                          setMsChooserOpen(false);
                          if (selEst.billing_method === "manual") return;
                          if (!await window.confirmAsync("Switch to Manual mode? You'll bill per-item cumulative qty without preset stages.")) return;
                          const r = await api.put("/customer-estimates/"+selEst.id+"/billing-method",{billing_method:"manual"}).catch(()=>({success:false}));
                          if (r.success) await reloadSel();
                          else alert(r.message||"Switch failed");
                        }}
                        style={{padding:"10px 12px",cursor:"pointer"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#FAF5FF"}
                        onMouseLeave={e=>e.currentTarget.style.background="white"}>
                        <div style={{fontSize:12,fontWeight:700,color:T.t1}}>✍️ Manual (Item Cumulative)</div>
                        <div style={{fontSize:10.5,color:T.t3,marginTop:2,lineHeight:1.4}}>
                          No preset stages — bill cumulative qty per item ad-hoc
                        </div>
                      </div>
                    </div>
                  </>)}
                </div>
                </>
              )}
              {subTab==="invoice" && (<>
                <button onClick={openNewInvoice}
                  style={{background:T.blu,color:"white",border:"none",borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  + Invoice
                </button>
                <button onClick={()=>{ setInvForm(p=>({...p,source:"manual"})); setShowNewInv(true); }}
                  style={{background:T.purL,color:T.pur,border:"1px solid "+T.pur,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  + Manual
                </button>
              </>)}
            </div>
          </div>

          {/* Tab Body */}
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px"}}>

            {/* BOQ TAB */}
            {subTab==="boq" && estDetail && (
              <div>
                {(estDetail.sections||[]).length === 0 && (estDetail.unsectioned||[]).length === 0 && (
                  <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No items in this estimate</div>
                )}
                {(() => {
                  // Item rows stay column-aligned in this 5-col grid so
                  // RATE + AMOUNT line up properly down the table.
                  // Section + category BARS use a flex layout instead and
                  // sit slightly right of the item Rate/Amount columns so
                  // the totals visually pop out as a rolled-up summary.
                  const GRID = "1fr 60px 70px 95px 110px";
                  return (estDetail.sections||[]).map(sec => {
                    const secTotal   = (sec.items||[]).reduce((s,i) => s + parseFloat(i.amount||0), 0);
                    const secQtySum  = (sec.items||[]).reduce((s,i) => s + parseFloat(i.qty||0),    0);
                    const secPerItem = !!Number(sec.per_item_qty);
                    // Group items by parsed [Category] prefix in description.
                    // EstimateBuilderModal flattens 3-level (sec › cat › item)
                    // → 2-level (section + items[]) by stuffing the category
                    // into description as "[Category] Item Name". Reverse it
                    // here to render category sub-headers + rollups.
                    const groups = {};
                    const catOrder = [];
                    for (const it of (sec.items || [])) {
                      const m = /^\[([^\]]+)\]\s*(.*)$/.exec(it.description || "");
                      const catName = m ? m[1] : "";
                      const cleanDesc = m ? m[2] : (it.description || "");
                      if (!groups[catName]) { groups[catName] = []; catOrder.push(catName); }
                      groups[catName].push({ ...it, _cleanDesc: cleanDesc });
                    }
                    // Uniform mode: every item in a category shares that
                    // category's area, so the section Qty is the SUM of the
                    // category areas and the Rate is BLENDED (total ÷ qty).
                    // Old behaviour showed Σ item rates against the FIRST
                    // item's qty — the moment two categories had different
                    // areas (GF 1500, SF 1470…) rate × qty ≠ amount.
                    const secAreaSum = catOrder.reduce(
                      (a, cn) => a + (parseFloat(groups[cn][0]?.qty) || 0), 0);
                    const secQtyDisplay = secPerItem ? secQtySum : secAreaSum;
                    const secBlended    = secQtyDisplay > 0 ? secTotal / secQtyDisplay : 0;
                    // A blended per-unit rate only means something when every
                    // item shares one unit; hide it for a mixed-unit section.
                    const secUnits = new Set((sec.items||[])
                      .map(i => String(i.unit||"").trim().toLowerCase()).filter(Boolean));
                    const secRateShown = !secPerItem && secUnits.size <= 1 && secQtyDisplay > 0;
                    const secCollapsed = collapsedSecs.has(sec.id);
                    return (
                      <div key={sec.id} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,marginBottom:10,overflow:"hidden"}}>
                        {/* Section bar — click to fold/expand. Chevron + same
                            grid as item rows so Qty/Rate sit under headers. */}
                        <div onClick={()=>toggleSec(sec.id)}
                          style={{display:"grid",gridTemplateColumns:GRID,padding:"9px 0 9px 14px",background:T.bluL,borderBottom:"1px solid "+T.bluM,borderLeft:"3px solid "+T.blu,alignItems:"center",cursor:"pointer"}}>
                          <span style={{fontSize:12.5,fontWeight:700,color:T.blu,display:"flex",alignItems:"center",gap:7}}>
                            <span style={{display:"inline-block",transition:"transform .15s",transform:secCollapsed?"rotate(-90deg)":"rotate(0deg)",fontSize:11,color:T.blu}}>▼</span>
                            {sec.title}
                            {secPerItem && <span style={{marginLeft:4,padding:"1px 6px",fontSize:9.5,fontWeight:700,background:"#FEF3C7",color:"#92400E",borderRadius:3,letterSpacing:".3px"}}>PER-ITEM QTY</span>}
                          </span>
                          <span/>{/* Unit column — empty on bar */}
                          <span style={{fontSize:11.5,fontWeight:700,color:T.blu,fontVariantNumeric:"tabular-nums",textAlign:"right",paddingRight:8}}>
                            {Math.round(secQtyDisplay).toLocaleString("en-IN")}
                          </span>
                          <span style={{fontSize:11.5,fontWeight:700,color:T.blu,fontVariantNumeric:"tabular-nums",textAlign:"right",paddingRight:8}}>
                            {secRateShown ? fmtC(Math.round(secBlended)) + "/sqft" : ""}
                          </span>
                          <span style={{fontSize:13.5,fontWeight:800,color:T.blu,fontVariantNumeric:"tabular-nums",textAlign:"right",paddingRight:0}}>
                            {fmtC(secTotal)}
                          </span>
                        </div>
                        {!secCollapsed && (
                        <div style={{display:"grid",gridTemplateColumns:GRID,padding:"6px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                          {["Description","Unit","Qty","Rate","Amount"].map((h,i) => (
                            <span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",textAlign:i>=2?"right":"left",paddingRight:(i===2||i===3)?8:0}}>{h}</span>
                          ))}
                        </div>
                        )}
                        {!secCollapsed && catOrder.map(catName => {
                          const items = groups[catName] || [];
                          const catTotal   = items.reduce((s,i) => s + parseFloat(i.amount||0), 0);
                          const catRateSum = items.reduce((s,i) => s + parseFloat(i.rate||0),   0);
                          const catQtySum  = items.reduce((s,i) => s + parseFloat(i.qty||0),    0);
                          // Category inherits the section's mode (categories
                          // don't carry their own flag — they're just visual
                          // sub-groups within a section).
                          const catArea       = parseFloat(items[0]?.qty) || 0;
                          const catQtyDisplay = secPerItem ? catQtySum : catArea;
                          const catKey = `${sec.id}::${catName}`;
                          const catCollapsed = !!catName && collapsedCats.has(catKey);
                          return (
                            <React.Fragment key={catName || "__none__"}>
                              {catName && (
                                <div onClick={()=>toggleCat(catKey)}
                                  style={{display:"grid",gridTemplateColumns:GRID,padding:"6px 0 6px 18px",background:"#F1F5F9",
                                             borderBottom:"1px solid "+T.b1,borderLeft:"3px solid "+T.bluM,alignItems:"center",cursor:"pointer"}}>
                                  <span style={{fontSize:11.5,fontWeight:700,color:T.t1,letterSpacing:".2px",display:"flex",alignItems:"center",gap:6}}>
                                    <span style={{display:"inline-block",transition:"transform .15s",transform:catCollapsed?"rotate(-90deg)":"rotate(0deg)",fontSize:9,color:T.t3}}>▼</span>
                                    {catName}
                                    <span style={{fontSize:10,color:T.t4,fontWeight:500}}>
                                      · {items.length} item{items.length === 1 ? "" : "s"}
                                    </span>
                                  </span>
                                  <span/>{/* Unit col */}
                                  <span style={{fontSize:11,fontWeight:700,color:T.t2,fontVariantNumeric:"tabular-nums",textAlign:"right",paddingRight:8}}>
                                    {Math.round(catQtyDisplay).toLocaleString("en-IN")}
                                  </span>
                                  <span style={{fontSize:11,fontWeight:700,color:T.t2,fontVariantNumeric:"tabular-nums",textAlign:"right",paddingRight:8}}>
                                    {secPerItem ? "" : fmtC(catRateSum) + "/sqft"}
                                  </span>
                                  <span style={{fontSize:12.5,fontWeight:700,color:T.t1,fontVariantNumeric:"tabular-nums",textAlign:"right",paddingRight:0}}>
                                    {fmtC(catTotal)}
                                  </span>
                                </div>
                              )}
                              {!catCollapsed && items.map(it => (
                                <div key={it.id} style={{display:"grid",gridTemplateColumns:GRID,padding:"8px 14px",borderBottom:"1px solid "+T.b1,alignItems:"center", paddingLeft: catName ? 28 : 14}}>
                                  <span style={{fontSize:12.5,color:T.t1}}>{it._cleanDesc}</span>
                                  <span style={{fontSize:11.5,color:T.t3}}>{it.unit}</span>
                                  <span style={{fontSize:12,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>{parseFloat(it.qty)}</span>
                                  <span style={{fontSize:12,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>{fmtC(it.rate)}</span>
                                  <span style={{fontSize:12.5,fontWeight:600,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(it.amount)}</span>
                                </div>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* MILESTONES TAB */}
            {subTab==="milestone" && (
              <div>
                {selEst.billing_method === "manual" && (
                  <div style={{padding:"24px",textAlign:"center",color:T.t3,background:T.surface,border:"1px dashed "+T.b1,borderRadius:8}}>
                    <div style={{fontSize:13,marginBottom:6}}>This estimate uses <b>manual</b> billing (per-item cumulative qty).</div>
                    <div style={{fontSize:11.5,color:T.t4}}>Click <b>+ Set Schedule</b> to switch to milestone-based (item-wise rate or % of order value).</div>
                  </div>
                )}
                {selEst.billing_method === "milestone_rate" && (estDetail?.sections||[]).map(sec => {
                  // Group items by parsed [Category] prefix — same convention
                  // as BOQ tab. Renders Section › Category › Item › Milestones.
                  const groups = {}; const catOrder = [];
                  for (const it of (sec.items || [])) {
                    const m = /^\[([^\]]+)\]\s*(.*)$/.exec(it.description || "");
                    const catName = m ? m[1] : "";
                    const cleanDesc = m ? m[2] : (it.description || "");
                    if (!groups[catName]) { groups[catName] = []; catOrder.push(catName); }
                    groups[catName].push({ ...it, _cleanDesc: cleanDesc });
                  }
                  const secTotal = (sec.items||[]).reduce((s,i)=> s + parseFloat(i.amount||0), 0);
                  return (
                    <div key={sec.id} style={{marginBottom:14}}>
                      {/* Section header — light-blue estimate theme */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",background:T.bluL,borderRadius:"8px 8px 0 0",border:"1px solid "+T.bluM,borderBottom:"none"}}>
                        <span style={{fontSize:12.5,fontWeight:800,color:T.blu,letterSpacing:".3px"}}>{sec.title}</span>
                        <span style={{fontSize:12,fontWeight:700,color:T.blu,fontVariantNumeric:"tabular-nums"}}>{fmtC(secTotal)}</span>
                      </div>
                      <div style={{border:"1px solid "+T.bluM,borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
                        {catOrder.map((catName, ci) => {
                          const items = groups[catName] || [];
                          const catTotal = items.reduce((s,i)=> s + parseFloat(i.amount||0), 0);
                          return (
                            <div key={catName || "__none__"}>
                              {/* Category sub-header */}
                              {catName && (
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 14px 6px 18px",background:"#F1F5F9",borderTop: ci>0 ? "1px solid "+T.b1 : "none",borderLeft:"3px solid "+T.bluM}}>
                                  <span style={{fontSize:11,fontWeight:700,color:T.t1,letterSpacing:".2px"}}>
                                    {catName}<span style={{fontSize:10,color:T.t4,fontWeight:500,marginLeft:6}}>· {items.length} item{items.length===1?"":"s"}</span>
                                  </span>
                                  <span style={{fontSize:11,fontWeight:700,color:T.t2,fontVariantNumeric:"tabular-nums"}}>{fmtC(catTotal)}</span>
                                </div>
                              )}
                              {/* Items + their milestones */}
                              {items.map(it => {
                                const ms = milestones.rate_by_item[it.id] || [];
                                const hasSchedule = ms.length > 0;
                                // Pull live billing state from the loaded ledger
                                // (auto-loaded when this tab is active). Falls
                                // back to a zeroed shape so the UI doesn't
                                // crash if the ledger hasn't loaded yet.
                                const lit = ledgerByItemId[it.id] || null;
                                const boqQty   = parseFloat(it.qty)  || 0;
                                const boqRate  = parseFloat(it.rate) || 0;
                                const boqValue = boqQty * boqRate;
                                const billedQty   = lit ? (Number(lit.total_billed) || 0)    : 0;
                                const remainQty   = lit ? (Number(lit.total_remaining) || 0) : boqQty;
                                const billedValue = billedQty * boqRate;
                                const remainValue = remainQty * boqRate;
                                const pctBilled   = boqQty > 0 ? Math.min(100, (billedQty / boqQty) * 100) : 0;
                                const isFully     = pctBilled >= 99.99;
                                return (
                                  <div key={it.id} style={{padding:"10px 14px",borderTop:"1px solid "+T.b1,background:T.surface}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: hasSchedule?8:4,gap:8}}>
                                      <div style={{fontSize:12,fontWeight:700,color:T.t1,flex:1}}>
                                        {it._cleanDesc}
                                        <span style={{fontSize:10.5,color:T.t4,fontWeight:500,marginLeft:8}}>· {boqQty} {it.unit} @ {fmtC(boqRate)}/unit = {fmtC(boqValue)}</span>
                                      </div>
                                      {hasSchedule && (
                                        <div style={{display:"flex",gap:5}}>
                                          <button onClick={()=>editRateSchedule(it.id)} title="Edit schedule"
                                            style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:5,width:24,height:24,fontSize:11,cursor:"pointer",lineHeight:1}}>✎</button>
                                          <button onClick={()=>deleteRateSchedule(it.id, it._cleanDesc)} title="Delete schedule"
                                            style={{background:T.redL,border:"1px solid "+T.redM,color:T.red,borderRadius:5,width:24,height:24,fontSize:11,cursor:"pointer",lineHeight:1}}>🗑</button>
                                        </div>
                                      )}
                                    </div>
                                    {/* ── Item-level billing summary (P2+ enhancement) ──
                                        Three-stat chip row: BOQ / Billed / Remaining
                                        with qty + value + progress bar. Renders only
                                        when the ledger has loaded so users don't see
                                        a confusing "0 billed" while it's still fetching. */}
                                    {hasSchedule && lit && (
                                      <div style={{marginBottom:8,padding:"7px 10px",background:T.surfaceB,borderRadius:6,border:"1px solid "+T.b1}}>
                                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:6}}>
                                          <div>
                                            <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>Total (BOQ)</div>
                                            <div style={{fontSize:12,fontWeight:700,color:T.t1,fontVariantNumeric:"tabular-nums"}}>{boqQty} {it.unit}</div>
                                            <div style={{fontSize:10.5,color:T.t3,fontVariantNumeric:"tabular-nums"}}>{fmtC(boqValue)}</div>
                                          </div>
                                          <div>
                                            <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>Billed</div>
                                            <div style={{fontSize:12,fontWeight:700,color:billedQty>0?T.amb:T.t4,fontVariantNumeric:"tabular-nums"}}>{billedQty} {it.unit}</div>
                                            <div style={{fontSize:10.5,color:billedQty>0?T.amb:T.t4,fontVariantNumeric:"tabular-nums"}}>{fmtC(billedValue)}</div>
                                          </div>
                                          <div>
                                            <div style={{fontSize:9,color:T.t4,fontWeight:600,textTransform:"uppercase",letterSpacing:".3px"}}>Remaining</div>
                                            <div style={{fontSize:12,fontWeight:700,color:remainQty>0?T.grn:T.t4,fontVariantNumeric:"tabular-nums"}}>{remainQty} {it.unit}</div>
                                            <div style={{fontSize:10.5,color:remainQty>0?T.grn:T.t4,fontVariantNumeric:"tabular-nums"}}>{fmtC(remainValue)}</div>
                                          </div>
                                        </div>
                                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                                          <div style={{flex:1,height:5,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                                            <div style={{width: pctBilled+"%",height:"100%",background: isFully ? T.amb : (pctBilled >= 50 ? T.blu : T.grn),transition:"width .3s"}}/>
                                          </div>
                                          <span style={{fontSize:10.5,fontWeight:700,color: isFully ? T.amb : T.t3,minWidth:42,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>
                                            {isFully ? "✓ FULL" : pctBilled.toFixed(0)+"%"}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {!hasSchedule && <div style={{fontSize:11,color:T.t4,fontStyle:"italic"}}>No payment schedule set. Use + Set Schedule.</div>}
                                    {hasSchedule && (
                                      <>
                                        {/* Milestone column header — clear Qty / Rate / Bill Value */}
                                        <div style={{display:"grid",gridTemplateColumns:"26px 1fr 70px 85px 100px",gap:6,padding:"4px 0",borderBottom:"1px solid "+T.b1,marginBottom:2}}>
                                          {["#","Milestone","Qty","Rate","Bill Value"].map((h,i) => <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2?"right":"left",paddingRight:(i===2||i===3)?6:0}}>{h}</span>)}
                                        </div>
                                        {ms.map(m => {
                                          const linked = linkedTasks[m.id];
                                          const mQty = (m.qty != null ? parseFloat(m.qty) : parseFloat(it.qty)) || 0;
                                          const mRate = parseFloat(m.inc_rate) || 0;
                                          const billVal = mQty * mRate;
                                          // Live billing state for this milestone from the loaded ledger.
                                          const mls = ledgerByMsId[m.id] || null;
                                          const mBilledQty = mls ? (Number(mls.billed_qty) || 0)    : 0;
                                          const mRemainQty = mls ? (Number(mls.remaining_qty) || 0) : mQty;
                                          const mStatus    = mls?.status || "unbilled";
                                          return (
                                            <div key={m.id} style={{padding:"4px 0",fontSize:12,borderBottom:"1px solid "+T.b1}}>
                                              <div style={{display:"grid",gridTemplateColumns:"26px 1fr 70px 85px 100px",gap:6,alignItems:"center"}}>
                                                <span style={{color:T.t4}}>{m.seq+1}</span>
                                                <span style={{color:T.t1,fontWeight:600}}>{m.name}</span>
                                                <span style={{color:T.t2,textAlign:"right",paddingRight:6,fontVariantNumeric:"tabular-nums"}}>{mQty}</span>
                                                <span style={{color:T.t2,textAlign:"right",paddingRight:6,fontVariantNumeric:"tabular-nums"}}>{fmtC(mRate)}</span>
                                                <span style={{color:T.grn,textAlign:"right",fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmtC(billVal)}</span>
                                              </div>
                                              {/* Per-milestone live billing state — only render
                                                  when we actually have ledger data AND something
                                                  has been billed. Avoids clutter on un-billed rows. */}
                                              {mls && mBilledQty > 0 && (
                                                <div style={{paddingLeft:26,paddingTop:2,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                                                  <span style={{padding:"1px 7px",fontSize:10,fontWeight:700,borderRadius:10,
                                                                background: mStatus === "fully_billed" ? "#FEF3C7" : T.grnL,
                                                                color:      mStatus === "fully_billed" ? "#92400E" : T.grn,
                                                                border:"1px solid " + (mStatus === "fully_billed" ? "#FCD34D" : T.grnM)}}>
                                                    {mStatus === "fully_billed" ? "✓ FULLY BILLED" : "PARTIAL"}
                                                  </span>
                                                  <span style={{fontSize:10.5,color:T.t3,fontVariantNumeric:"tabular-nums"}}>
                                                    Billed <b style={{color:T.amb}}>{mBilledQty}</b> {it.unit} = <b style={{color:T.amb}}>{fmtC(mBilledQty * mRate)}</b>
                                                  </span>
                                                  {mRemainQty > 0 && (
                                                    <span style={{fontSize:10.5,color:T.t3,fontVariantNumeric:"tabular-nums"}}>
                                                      · Remaining <b style={{color:T.grn}}>{mRemainQty}</b> {it.unit} = <b style={{color:T.grn}}>{fmtC(mRemainQty * mRate)}</b>
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                              {/* Task link chip / Link button */}
                                              <div style={{paddingLeft:26,paddingTop:4,paddingBottom:2,display:"flex",alignItems:"center",gap:8}}>
                                                {linked ? (
                                                  <>
                                                    <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 8px",borderRadius:14,background: linked.eligible ? "#DCFCE7" : T.bluL,border:"1px solid "+ (linked.eligible ? "#86EFAC" : T.bluM),fontSize:10.5,fontWeight:600,color: linked.eligible ? "#15803D" : T.blu}}>
                                                      🔗 {linked.task_name}
                                                      <span style={{color: linked.eligible ? "#15803D" : T.t3,fontWeight:500}}>· {linked.progress}% / trigger @ {linked.trigger_pct}%</span>
                                                      {linked.eligible && <span style={{fontSize:10}}>✓ ready to bill</span>}
                                                    </span>
                                                    <button onClick={()=>openTaskPicker(m.id)} title="Change link or trigger %"
                                                      style={{background:"none",border:"none",color:T.t3,fontSize:11,cursor:"pointer",padding:"0 4px"}}>✎</button>
                                                    <button onClick={()=>unlinkTask(m.id)} title="Unlink from task"
                                                      style={{background:"none",border:"none",color:T.red,fontSize:12,cursor:"pointer",padding:"0 4px"}}>×</button>
                                                  </>
                                                ) : (
                                                  <button onClick={()=>openTaskPicker(m.id)}
                                                    style={{background:"transparent",border:"1px dashed "+T.b1,color:T.t3,borderRadius:14,padding:"3px 10px",fontSize:10.5,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
                                                    🔗 Link to task
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {selEst.billing_method === "milestone_percent" && (
                  <div style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"12px 14px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>Payment Milestones (% of order value)</div>
                      {milestones.percent.length > 0 && (
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={editPercentSchedule}
                            title="Edit schedule"
                            style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:5,width:26,height:26,fontSize:12,cursor:"pointer",lineHeight:1}}>
                            ✎
                          </button>
                          <button onClick={deletePercentSchedule}
                            title="Delete schedule"
                            style={{background:T.redL,border:"1px solid "+T.redM,color:T.red,borderRadius:5,width:26,height:26,fontSize:12,cursor:"pointer",lineHeight:1}}>
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                    {milestones.percent.length === 0 && <div style={{fontSize:11.5,color:T.t4,fontStyle:"italic"}}>No milestones set yet.</div>}
                    {milestones.percent.length > 0 && (
                      <div style={{display:"grid",gridTemplateColumns:"30px 1fr 80px 130px",gap:6,padding:"4px 0",borderBottom:"1px solid "+T.b1,marginBottom:4}}>
                        {["#","Milestone","%","Amount"].map(h => <span key={h} style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                      </div>
                    )}
                    {milestones.percent.map(m => (
                      <div key={m.id} style={{display:"grid",gridTemplateColumns:"30px 1fr 80px 130px",gap:6,padding:"4px 0",fontSize:12}}>
                        <span style={{color:T.t4}}>{m.seq+1}</span>
                        <span style={{color:T.t1}}>{m.name}</span>
                        <span style={{color:T.t2,textAlign:"right",paddingRight:8}}>{parseFloat(m.pct)}%</span>
                        <span style={{color:T.grn,textAlign:"right",paddingRight:8,fontWeight:600}}>{fmtC(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INVOICES TAB */}
            {subTab==="invoice" && (
              <div>
                {invoices.length === 0 && <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No invoices yet</div>}
                {invoices.map(inv => {
                  // Color-code the left accent + status pill by lifecycle stage
                  const stC = inv.status==="Paid" ? T.grn
                            : inv.status==="Approved" ? T.blu
                            : inv.status==="Submitted" ? T.amb
                            : inv.status==="Draft" ? "#7C3AED"  // purple for Draft (auto-bill preview)
                            : T.t4;
                  const isAutoDraft = inv.source === "auto" && inv.status === "Draft";
                  return (
                    <div key={inv.id}
                      onClick={(e)=>{ e.stopPropagation(); openInvoiceDetail(inv.id); }}
                      onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}
                      style={{
                        background:T.surface,
                        border: isAutoDraft ? "1.5px solid #C4B5FD" : "1px solid "+T.b1,
                        borderRadius:8,padding:"12px 14px",marginBottom:8,
                        borderLeft:"3px solid "+stC,
                        cursor:"pointer",
                        transition:"all .15s ease",
                      }}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div>
                          <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{inv.invoice_no}</span>
                          {inv.source==="manual" && <span style={{marginLeft:8,fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:T.purL,color:T.pur,border:"1px solid "+T.pur}}>MANUAL</span>}
                          {inv.source==="auto" && <span style={{marginLeft:8,fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#EDE9FE",color:"#6D28D9",border:"1px solid #C4B5FD"}}>🤖 AUTO</span>}
                          {inv.is_over_bill==1 && <span title={inv.over_bill_reason||"Over-bill invoice"} style={{marginLeft:8,fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#FEE2E2",color:"#991B1B",border:"1px solid #FCA5A5"}}>🔴 OVER-BILL</span>}
                          <span style={{fontSize:10.5,color:T.t4,marginLeft:8}}>{inv.invoice_date}</span>
                        </div>
                        <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stC+"22",color:stC}}>{inv.status}</span>
                      </div>
                      {isAutoDraft && (
                        <div style={{padding:"7px 10px",background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:6,marginBottom:8,fontSize:11,color:"#5B21B6",lineHeight:1.45}}>
                          ⏳ Auto-generated from task progress. Click to review preview before confirming.
                        </div>
                      )}
                      {/* ── Item summary line (P2+ enhancement) ──
                          Tells the user WHAT was billed at a glance, without
                          opening the drawer. Strips the "[Category] " prefix
                          for cleaner display. Falls back gracefully if the
                          summary fields aren't populated (older backend). */}
                      {inv.item_count > 0 && (() => {
                        const cleanDesc = (inv.first_item_desc || "").replace(/^\[[^\]]+\]\s*/, "").trim();
                        const q = inv.first_item_boq_qty != null ? parseFloat(inv.first_item_boq_qty) : parseFloat(inv.first_item_qty || 0);
                        const u = inv.first_item_unit || "";
                        return (
                          <div style={{marginBottom:8,padding:"6px 10px",background:T.surfaceB,borderRadius:5,borderLeft:"2px solid "+T.bluM,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>Billed:</span>
                            <span style={{fontSize:11.5,fontWeight:700,color:T.t1}}>{cleanDesc || "(item)"}</span>
                            {q > 0 && (
                              <span style={{fontSize:10.5,color:T.t3,fontVariantNumeric:"tabular-nums"}}>· {q} {u}</span>
                            )}
                            {inv.item_count > 1 && (
                              <span style={{fontSize:10,fontWeight:600,padding:"1px 7px",background:T.bluL,color:T.blu,borderRadius:10,border:"1px solid "+T.bluM}}>
                                + {inv.item_count - 1} more
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                        {[{l:"Gross",v:fmtC(inv.gross_amount),c:T.t1},{l:"Retention",v:fmtC(inv.retention_amt),c:T.amb},{l:"TDS",v:fmtC(inv.tds_amt),c:T.red},{l:"Net Receivable",v:fmtC(inv.net_receivable),c:T.grn}].map(s => (
                          <div key={s.l} style={{textAlign:"center",background:T.surfaceB,borderRadius:6,padding:"6px 8px"}}>
                            <div style={{fontSize:9,color:T.t4,textTransform:"uppercase"}}>{s.l}</div>
                            <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{marginTop:8,fontSize:10.5,color:T.t4,textAlign:"center",fontStyle:"italic"}}>
                        Click anywhere to view full detail · delete
                      </div>
                    </div>
                  );
                })}
                {/* Standalone manual invoices (estimate_id=NULL) — project-level
                    ad-hoc bills that don't belong to any specific estimate.
                    Shown as a clearly separated section so they remain visible
                    even after the main list is scoped to a specific estimate. */}
                {standaloneInvoices.length > 0 && (
                  <>
                    <div style={{margin:"18px 0 10px",padding:"6px 12px",background:T.purL,borderRadius:6,fontSize:10,fontWeight:700,color:T.pur,textTransform:"uppercase",letterSpacing:".4px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>📋 Standalone Manual Invoices · Not tied to any estimate ({standaloneInvoices.length})</span>
                      <span style={{fontSize:9.5,color:T.t4,fontWeight:500,textTransform:"none",letterSpacing:0}}>Project-level ad-hoc</span>
                    </div>
                    {standaloneInvoices.map(inv => {
                      const stC = inv.status==="Paid" ? T.grn : inv.status==="Approved" ? T.blu : inv.status==="Submitted" ? T.amb : T.t4;
                      return (
                        <div key={inv.id}
                          onClick={(e)=>{ e.stopPropagation(); openInvoiceDetail(inv.id); }}
                          onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.transform="translateY(-1px)"; }}
                          onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}
                          style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+stC,cursor:"pointer",transition:"all .15s ease"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                            <div>
                              <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{inv.invoice_no}</span>
                              <span style={{marginLeft:8,fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:T.purL,color:T.pur,border:"1px solid "+T.pur}}>MANUAL · STANDALONE</span>
                              {inv.is_over_bill==1 && <span title={inv.over_bill_reason||"Over-bill invoice"} style={{marginLeft:8,fontSize:9.5,fontWeight:700,padding:"2px 6px",borderRadius:3,background:"#FEE2E2",color:"#991B1B",border:"1px solid #FCA5A5"}}>🔴 OVER-BILL</span>}
                              <span style={{fontSize:10.5,color:T.t4,marginLeft:8}}>{inv.invoice_date}</span>
                            </div>
                            <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stC+"22",color:stC}}>{inv.status}</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                            {[{l:"Gross",v:fmtC(inv.gross_amount),c:T.t1},{l:"Retention",v:fmtC(inv.retention_amt),c:T.amb},{l:"TDS",v:fmtC(inv.tds_amt),c:T.red},{l:"Net Receivable",v:fmtC(inv.net_receivable),c:T.grn}].map(s => (
                              <div key={s.l} style={{textAlign:"center",background:T.surfaceB,borderRadius:6,padding:"6px 8px"}}>
                                <div style={{fontSize:9,color:T.t4,textTransform:"uppercase"}}>{s.l}</div>
                                <div style={{fontSize:13,fontWeight:800,color:s.c}}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                          {/* Item summary (P2+) — also shown on standalone manual invoices */}
                          {inv.item_count > 0 && (() => {
                            const cleanDesc = (inv.first_item_desc || "").replace(/^\[[^\]]+\]\s*/, "").trim();
                            const q = inv.first_item_boq_qty != null ? parseFloat(inv.first_item_boq_qty) : parseFloat(inv.first_item_qty || 0);
                            const u = inv.first_item_unit || "";
                            return (
                              <div style={{marginTop:8,padding:"6px 10px",background:T.surfaceB,borderRadius:5,borderLeft:"2px solid "+T.bluM,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                <span style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>Billed:</span>
                                <span style={{fontSize:11.5,fontWeight:700,color:T.t1}}>{cleanDesc || "(item)"}</span>
                                {q > 0 && (
                                  <span style={{fontSize:10.5,color:T.t3,fontVariantNumeric:"tabular-nums"}}>· {q} {u}</span>
                                )}
                                {inv.item_count > 1 && (
                                  <span style={{fontSize:10,fontWeight:600,padding:"1px 7px",background:T.bluL,color:T.blu,borderRadius:10,border:"1px solid "+T.bluM}}>
                                    + {inv.item_count - 1} more
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                          {inv.remark && <div style={{fontSize:10.5,color:T.t4,marginTop:8,fontStyle:"italic"}}>"{inv.remark}"</div>}
                          <div style={{marginTop:6,fontSize:10.5,color:T.t4,textAlign:"center",fontStyle:"italic"}}>
                            Click to view detail
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* PAYMENTS TAB */}
            {subTab==="payment" && (
              <div>
                {payments.length === 0 && <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No payments recorded</div>}
                {payments.map(p => (
                  <div key={p.id} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,padding:"10px 14px",marginBottom:6,display:"grid",gridTemplateColumns:"100px 1fr 120px 100px",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:11.5,color:T.t3}}>{p.payment_date}</span>
                    <span style={{fontSize:12,color:T.t1}}>{p.payment_mode} {p.reference_no?" · "+p.reference_no:""}</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(p.amount_received)}</span>
                    <span style={{fontSize:11,color:T.t4}}>Inv #{p.invoice_id}</span>
                  </div>
                ))}
              </div>
            )}

            {/* AMENDMENTS TAB — Pending / Approved / Rejected history with approve-reject */}
            {subTab==="amend" && (
              <div>
                {amendments.length === 0 && (
                  <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>
                    No amendments yet. Click <b>✎ Edit BOQ</b> on the BOQ tab to propose changes.
                  </div>
                )}
                {amendments.map(a => {
                  const isOpen = expandedAmend === a.id;
                  const stCol = a.status === "Pending" ? "#D97706" : a.status === "Approved" ? T.grn : "#DC2626";
                  const stBg  = a.status === "Pending" ? "#FEF3C7" : a.status === "Approved" ? "#DCFCE7" : "#FEE2E2";
                  const secs  = a.proposed?.proposed_sections || [];
                  const form  = a.proposed?.proposed_form || {};
                  let amendTotal = 0;
                  secs.forEach(s => (s.items||[]).forEach(it => amendTotal += (parseFloat(it.qty)||0) * (parseFloat(it.rate)||0)));
                  return (
                    <div key={a.id} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,marginBottom:8,overflow:"hidden"}}>
                      <div onClick={()=>setExpandedAmend(o => o === a.id ? null : a.id)}
                        style={{padding:"10px 14px",display:"grid",gridTemplateColumns:"24px 1fr 140px 110px 110px",gap:10,alignItems:"center",cursor:"pointer",borderBottom: isOpen ? "1px solid "+T.b1 : "none"}}>
                        <span style={{transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition:"transform .15s", color:T.t3, fontSize:13}}>▸</span>
                        <div>
                          <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>Amendment #{a.id}</div>
                          <div style={{fontSize:11,color:T.t3,marginTop:2,lineHeight:1.4}}>
                            <b>Reason:</b> {a.reason}
                          </div>
                        </div>
                        <span style={{fontSize:10.5,color:T.t4}}>
                          {(a.created_at || "").slice(0,16).replace("T", " ")}
                          {a.created_by_name && <><br/>by {a.created_by_name}</>}
                        </span>
                        <span style={{fontSize:13,fontWeight:700,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>
                          {fmtC(amendTotal)}
                        </span>
                        <span style={{padding:"3px 9px",borderRadius:4,fontSize:10.5,fontWeight:700,background:stBg,color:stCol,textAlign:"center"}}>
                          {a.status}
                        </span>
                      </div>
                      {isOpen && (
                        <div style={{padding:"12px 16px",background:T.surfaceB}}>
                          {/* Proposed header diff */}
                          <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10,marginBottom:12}}>
                            {[
                              ["Retention %", form.retention_pct],
                              ["TDS %",       form.tds_pct],
                              ["Tax %",       form.tax_pct],
                              ["Start",       form.start_date],
                              ["End",         form.end_date],
                              ["Description", form.description],
                            ].filter(([_,v]) => v !== undefined && v !== null && v !== "").map(([l,v]) => (
                              <div key={l} style={{background:T.surface,padding:"7px 10px",borderRadius:6,border:"1px solid "+T.b1}}>
                                <div style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>{l}</div>
                                <div style={{fontSize:12,color:T.t1,marginTop:2}}>{String(v)}</div>
                              </div>
                            ))}
                          </div>
                          {/* Proposed sections + items */}
                          {secs.map((sec, si) => {
                            const secTotal = (sec.items||[]).reduce((s,it) => s + (parseFloat(it.qty)||0)*(parseFloat(it.rate)||0), 0);
                            return (
                              <div key={si} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:6,marginBottom:8,overflow:"hidden"}}>
                                <div style={{padding:"7px 12px",background:T.bluL,borderBottom:"1px solid "+T.bluM,display:"flex",justifyContent:"space-between"}}>
                                  <span style={{fontSize:12,fontWeight:700,color:T.blu}}>{sec.title}</span>
                                  <span style={{fontSize:12,fontWeight:700,color:T.blu}}>{fmtC(secTotal)}</span>
                                </div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 60px 70px 95px 110px",padding:"5px 12px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                                  {["Description","Unit","Qty","Rate","Amount"].map(h => (
                                    <span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>{h}</span>
                                  ))}
                                </div>
                                {(sec.items||[]).map((it, ii) => {
                                  const amt = (parseFloat(it.qty)||0) * (parseFloat(it.rate)||0);
                                  return (
                                    <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 60px 70px 95px 110px",padding:"6px 12px",borderBottom:"1px solid "+T.b1,alignItems:"center"}}>
                                      <span style={{fontSize:12,color:T.t1}}>{it.description}</span>
                                      <span style={{fontSize:11,color:T.t3}}>{it.unit}</span>
                                      <span style={{fontSize:11.5,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>{parseFloat(it.qty)}</span>
                                      <span style={{fontSize:11.5,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>{fmtC(it.rate)}</span>
                                      <span style={{fontSize:12,fontWeight:600,color:T.t1,fontVariantNumeric:"tabular-nums"}}>{fmtC(amt)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {/* Decided meta */}
                          {a.status !== "Pending" && (
                            <div style={{padding:"8px 12px",background:T.surface,borderRadius:6,border:"1px solid "+T.b1,fontSize:11,color:T.t3,marginBottom:8}}>
                              {a.status} on {(a.decided_at || "").slice(0,16).replace("T"," ")}
                              {a.decided_by_name && <> · by {a.decided_by_name}</>}
                            </div>
                          )}
                          {/* Approve / Reject — only when Pending */}
                          {a.status === "Pending" && (
                            <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
                              <button onClick={()=>decideAmendment(a.id,"Rejected")}
                                style={{background:"white",color:"#DC2626",border:"1.5px solid #FCA5A5",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                                Reject
                              </button>
                              <button onClick={()=>decideAmendment(a.id,"Approved")}
                                style={{background:T.grn,color:"white",border:"none",borderRadius:6,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                                ✓ Approve & Apply
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>)}
      </div>

      {/* ── MODAL: Edit BOQ → Amendment (admin-approval required) ── */}
      {showEditBoq && selEst && (<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,backdropFilter:"blur(2px)"}}/>
        <div style={{position:"fixed",top:"4vh",left:"50%",transform:"translateX(-50%)",width:920,maxWidth:"95vw",height:"92vh",background:T.surface,borderRadius:12,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:T.t1}}>Edit BOQ — {selEst.estimate_no}</div>
              <div style={{fontSize:11,color:"#92400E",marginTop:2}}>⚠ Changes require admin approval before they apply.</div>
            </div>
            <button onClick={()=>setShowEditBoq(false)} disabled={amendSaving}
              style={{background:"none",border:"none",fontSize:20,color:T.t3,cursor: amendSaving?"not-allowed":"pointer"}}>×</button>
          </div>
          <div style={{padding:"16px 18px",overflowY:"auto",flex:1}}>
            {/* Header fields */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10,marginBottom:14}}>
              <div>
                <label style={lblS}>Retention %</label>
                <input type="number" value={amendForm.retention_pct}
                  onChange={e=>setAmendForm(p=>({...p,retention_pct:e.target.value}))} style={inpS}/>
              </div>
              <div>
                <label style={lblS}>TDS %</label>
                <input type="number" value={amendForm.tds_pct}
                  onChange={e=>setAmendForm(p=>({...p,tds_pct:e.target.value}))} style={inpS}/>
              </div>
              <div>
                <label style={lblS}>Tax %</label>
                <input type="number" value={amendForm.tax_pct}
                  onChange={e=>setAmendForm(p=>({...p,tax_pct:e.target.value}))} style={inpS}/>
              </div>
              <div>
                <label style={lblS}>Description</label>
                <input type="text" value={amendForm.description}
                  onChange={e=>setAmendForm(p=>({...p,description:e.target.value}))} style={inpS}/>
              </div>
              <div>
                <label style={lblS}>Start Date</label>
                <input type="date" value={amendForm.start_date}
                  onChange={e=>setAmendForm(p=>({...p,start_date:e.target.value}))} style={inpS}/>
              </div>
              <div>
                <label style={lblS}>End Date</label>
                <input type="date" value={amendForm.end_date}
                  onChange={e=>setAmendForm(p=>({...p,end_date:e.target.value}))} style={inpS}/>
              </div>
              <div style={{gridColumn:"span 2"}}>
                <label style={lblS}>Internal Remark</label>
                <input type="text" value={amendForm.remark}
                  onChange={e=>setAmendForm(p=>({...p,remark:e.target.value}))} style={inpS}/>
              </div>
            </div>

            {/* Sections + items editor */}
            {amendForm.sections.map((sec, si) => {
              const secTotal = (sec.items||[]).reduce((s,it) => s + (parseFloat(it.qty)||0)*(parseFloat(it.rate)||0), 0);
              return (
                <div key={si} style={{background:T.surfaceB,border:"1px solid "+T.b1,borderRadius:8,marginBottom:10,overflow:"hidden"}}>
                  <div style={{padding:"8px 12px",background:T.bluL,borderBottom:"1px solid "+T.bluM,display:"flex",gap:8,alignItems:"center"}}>
                    <input value={sec.title}
                      onChange={e=>{
                        const v = e.target.value;
                        setAmendForm(p=>{
                          const next = [...p.sections];
                          next[si] = { ...next[si], title: v };
                          return { ...p, sections: next };
                        });
                      }}
                      placeholder="Section title"
                      style={{flex:1,padding:"5px 9px",border:"1px solid "+T.bluM,borderRadius:5,fontSize:12.5,fontWeight:700,color:T.blu,background:"white",outline:"none"}}/>
                    <span style={{fontSize:12,fontWeight:700,color:T.blu}}>{fmtC(secTotal)}</span>
                    <button onClick={async ()=>{
                      if (!await window.confirmAsync("Delete this section + its items from the proposed BOQ?")) return;
                      setAmendForm(p=>({ ...p, sections: p.sections.filter((_,i)=> i !== si) }));
                    }}
                      style={{background:"white",border:"1px solid #FCA5A5",color:"#DC2626",borderRadius:4,padding:"2px 8px",fontSize:11,cursor:"pointer"}}>
                      🗑
                    </button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 95px 90px 30px",padding:"5px 12px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                    {["Description","Unit","Qty","Rate","Amount",""].map(h => (
                      <span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>{h}</span>
                    ))}
                  </div>
                  {sec.items.map((it, ii) => {
                    const amt = (parseFloat(it.qty)||0) * (parseFloat(it.rate)||0);
                    const patch = (k, v) => setAmendForm(p => {
                      const next = [...p.sections];
                      const items = [...next[si].items];
                      items[ii] = { ...items[ii], [k]: v };
                      next[si] = { ...next[si], items };
                      return { ...p, sections: next };
                    });
                    return (
                      <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 95px 90px 30px",padding:"5px 12px",borderBottom:"1px solid "+T.b1,gap:6,alignItems:"center",background:"white"}}>
                        <input value={it.description} onChange={e=>patch("description", e.target.value)}
                          placeholder="Item description"
                          style={{padding:"5px 8px",border:"1px solid "+T.b1,borderRadius:4,fontSize:12,outline:"none"}}/>
                        <input value={it.unit} onChange={e=>patch("unit", e.target.value)}
                          placeholder="Sq.Ft"
                          style={{padding:"5px 8px",border:"1px solid "+T.b1,borderRadius:4,fontSize:11.5,outline:"none"}}/>
                        <input type="number" value={it.qty} onChange={e=>patch("qty", e.target.value)}
                          style={{padding:"5px 8px",border:"1px solid "+T.b1,borderRadius:4,fontSize:11.5,outline:"none",textAlign:"right"}}/>
                        <input type="number" value={it.rate} onChange={e=>patch("rate", e.target.value)}
                          style={{padding:"5px 8px",border:"1px solid "+T.b1,borderRadius:4,fontSize:11.5,outline:"none",textAlign:"right"}}/>
                        <span style={{fontSize:12,fontWeight:600,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(amt)}</span>
                        <button onClick={()=>setAmendForm(p=>{
                          const next = [...p.sections];
                          next[si] = { ...next[si], items: next[si].items.filter((_,j)=> j !== ii) };
                          return { ...p, sections: next };
                        })}
                          title="Delete row"
                          style={{background:"transparent",border:"none",color:"#DC2626",cursor:"pointer",fontSize:13}}>×</button>
                      </div>
                    );
                  })}
                  <div style={{padding:"6px 12px",background:T.surfaceB,borderTop:"1px solid "+T.b1}}>
                    <button onClick={()=>setAmendForm(p=>{
                      const next = [...p.sections];
                      next[si] = { ...next[si], items: [...next[si].items, { description:"", unit:"", qty:"", rate:"" }] };
                      return { ...p, sections: next };
                    })}
                      style={{background:"transparent",border:"1px dashed "+T.bluM,color:T.blu,borderRadius:4,padding:"4px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                      + Add Item
                    </button>
                  </div>
                </div>
              );
            })}

            <button onClick={()=>setAmendForm(p=>({ ...p, sections: [...p.sections, { title:"New Section", items:[{description:"",unit:"",qty:"",rate:""}] }] }))}
              style={{background:"white",border:"1.5px dashed "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:11.5,fontWeight:700,cursor:"pointer",marginBottom:14}}>
              + Add Section
            </button>

            {/* Reason — required */}
            <div style={{background:"#FFFBEB",border:"1.5px solid #FCD34D",borderRadius:8,padding:"12px 14px",marginTop:6}}>
              <label style={{fontSize:11,fontWeight:700,color:"#92400E",display:"block",marginBottom:5,textTransform:"uppercase",letterSpacing:".4px"}}>
                ⚠ Change Reason (Required for Approval)
              </label>
              <textarea value={amendForm.reason}
                onChange={e=>setAmendForm(p=>({...p,reason:e.target.value}))}
                rows={3}
                placeholder="Why is this amendment being requested? Mention client request, scope change, error correction, etc."
                style={{width:"100%",padding:"8px 10px",border:"1px solid #FCD34D",borderRadius:6,fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
            </div>
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB}}>
            <div style={{fontSize:11.5,color:T.t3}}>
              Subtotal: <b style={{color:T.t1,fontSize:13}}>
                {fmtC(amendForm.sections.reduce((s,sec) => s + (sec.items||[]).reduce((ss,it)=> ss + (parseFloat(it.qty)||0)*(parseFloat(it.rate)||0), 0), 0))}
              </b>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowEditBoq(false)} disabled={amendSaving}
                style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:600,cursor: amendSaving?"not-allowed":"pointer"}}>
                Cancel
              </button>
              <button onClick={submitAmendment} disabled={amendSaving || !amendForm.reason.trim()}
                style={{background: (amendSaving || !amendForm.reason.trim()) ? "#9CA3AF" : T.blu, color:"white", border:"none", borderRadius:6, padding:"7px 20px", fontSize:12, fontWeight:700, cursor: (amendSaving || !amendForm.reason.trim()) ? "not-allowed" : "pointer"}}>
                {amendSaving ? "Submitting…" : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      </>)}

      {/* ── M5: Library-backed Estimate Builder (paths 1, 2, 3) ─── */}
      {estBuilderOpen && (
        <EstimateBuilderModal
          project={project}
          initialMode={estBuilderMode}
          sourceQuoteId={estBuilderQuoteId}
          onClose={() => setEstBuilderOpen(false)}
          onSaved={() => {
            setEstBuilderOpen(false);
            // Refresh the estimates list — reuse the existing fetch.
            loadEstimates();
          }}
        />
      )}

      {/* ── MODAL: Quick Manual Estimate (Path 4, existing flow) ── */}
      {showNewEst && (<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,backdropFilter:"blur(2px)"}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:760,maxWidth:"95vw",maxHeight:"90vh",background:T.surface,borderRadius:12,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div style={{fontSize:15,fontWeight:700,color:T.t1}}>New Customer Estimate</div>
            <button onClick={()=>setShowNewEst(false)} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
          </div>
          <div style={{padding:"16px 18px",overflowY:"auto",flex:1}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={lblS}>Customer</label>
                {/* Searchable picker — client parties only (junk names
                    filtered server-side). value = customer_id. */}
                <SearchSelect
                  value={estForm.customer_id}
                  options={customers.map(c => ({ id: c.id, name: c.name }))}
                  onChange={(id) => {
                    const match = customers.find(c => String(c.id) === String(id));
                    setEstForm(p => ({...p, customer_id: match?.id || "", customer_name: match?.name || ""}));
                  }}
                  placeholder="Search or pick a customer"
                />
              </div>
              <div>
                <label style={lblS}>Description</label>
                <input type="text" value={estForm.description} onChange={e=>setEstForm(p=>({...p,description:e.target.value}))} style={inpS}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
              <div><label style={lblS}>Retention %</label><input type="number" value={estForm.retention_pct} onChange={e=>setEstForm(p=>({...p,retention_pct:e.target.value}))} style={inpS}/></div>
              <div><label style={lblS}>TDS %</label><input type="number" value={estForm.tds_pct} onChange={e=>setEstForm(p=>({...p,tds_pct:e.target.value}))} style={inpS}/></div>
              <div><label style={lblS}>Tax % (GST)</label><input type="number" value={estForm.tax_pct} onChange={e=>setEstForm(p=>({...p,tax_pct:e.target.value}))} style={inpS}/></div>
            </div>

            {estForm.sections.map((sec, si) => (
              <div key={si} style={{border:"1px solid "+T.b1,borderRadius:8,padding:"10px 12px",marginBottom:10,background:T.surfaceB}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <input type="text" value={sec.title}
                    onChange={e=>{ const s=[...estForm.sections]; s[si]={...s[si],title:e.target.value}; setEstForm(p=>({...p,sections:s})); }}
                    style={{...inpS,width:"60%",fontWeight:700,fontSize:13}}/>
                  {estForm.sections.length > 1 && (
                    <button onClick={()=>removeSection(si)} style={{background:T.redL,color:T.red,border:"none",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Remove Section</button>
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 100px 32px",gap:6,marginBottom:6}}>
                  {["Description","Unit","Qty","Rate",""].map(h => <span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                </div>
                {sec.items.map((it, ii) => (
                  <div key={ii} style={{marginBottom:4}}>
                    <div style={{display:"grid",gridTemplateColumns:"24px 1fr 70px 80px 100px 32px",gap:6}}>
                      <button onClick={()=>setLibPicker({si,ii})} title="Pick from Library"
                        style={{background:T.bluL,color:T.blu,border:"1px solid "+T.bluM,borderRadius:5,fontSize:13,cursor:"pointer"}}>
                        📚
                      </button>
                      <input value={it.description} onChange={e=>setItemField(si,ii,"description",e.target.value)} placeholder="Item description (or pick 📚)" style={inpS}/>
                      <input value={it.unit} onChange={e=>setItemField(si,ii,"unit",e.target.value)} placeholder="sqft" style={inpS}/>
                      <input type="number" value={it.qty} onChange={e=>setItemField(si,ii,"qty",e.target.value)} placeholder="area" style={inpS}/>
                      <input type="number" value={it.rate} onChange={e=>setItemField(si,ii,"rate",e.target.value)} placeholder="rate" style={inpS}/>
                      <button onClick={()=>removeItem(si,ii)} disabled={sec.items.length<=1} style={{background:sec.items.length<=1?T.b1:T.redL,color:sec.items.length<=1?T.t4:T.red,border:"none",borderRadius:5,fontSize:14,cursor:sec.items.length<=1?"default":"pointer"}}>×</button>
                    </div>
                    {(it.library_item_id || it.library_city) && (
                      <div style={{marginLeft:30,marginTop:3,fontSize:10,color:T.t4}}>
                        <span style={{background:T.purL,color:T.pur,padding:"1px 6px",borderRadius:3,fontWeight:600}}>📚 Library</span>
                        {it.library_city && <span style={{marginLeft:6}}>{it.library_city}{it.library_type?" · "+it.library_type:""}</span>}
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={()=>addItem(si)} style={{marginTop:6,background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Item</button>
              </div>
            ))}
            <button onClick={addSection} style={{background:T.surface,color:T.blu,border:"1.5px dashed "+T.blu,borderRadius:6,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add Section</button>
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"flex-end",gap:8,flexShrink:0}}>
            <button onClick={()=>setShowNewEst(false)} style={{padding:"7px 16px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={submitEst} disabled={saving} style={{padding:"7px 18px",borderRadius:6,background:saving?T.t4:T.blu,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:saving?"default":"pointer"}}>{saving?"Saving…":"Create Estimate"}</button>
          </div>
        </div>
      </>)}

      {/* ── MODAL: New Invoice ──────────────────────────────────── */}
      {showNewInv && (() => {
        // Closing must also clear the edit marker so a subsequent
        // "+ Invoice" creates fresh (POST) rather than re-editing (PUT).
        const closeInvModal = () => { setShowNewInv(false); setInvForm(p=>({...p, _editId: undefined })); };
        return (<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:680,maxWidth:"95vw",maxHeight:"90vh",background:T.surface,borderRadius:12,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:T.t1}}>{invForm._editId ? "Edit Manual Invoice" : invForm.source==="manual"?"New Manual Invoice":"New Invoice (from milestones)"}</div>
            <button onClick={closeInvModal} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
          </div>
          <div style={{padding:"16px 18px",overflowY:"auto",flex:1}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><label style={lblS}>Invoice Date</label><input type="date" value={invForm.invoice_date} onChange={e=>setInvForm(p=>({...p,invoice_date:e.target.value}))} style={inpS}/></div>
              {invForm.source==="manual" && <div><label style={lblS}>Customer Name</label><input value={invForm.customer_name} onChange={e=>setInvForm(p=>({...p,customer_name:e.target.value}))} placeholder={selEst?.customer_name||"Customer"} style={inpS}/></div>}
              {invForm.source==="milestone" && selEst && <div><div style={{fontSize:11,color:T.t3,paddingTop:18}}><b>Estimate:</b> {selEst.estimate_no} ({selEst.billing_method})</div></div>}
            </div>

            {/* ── Over-Billing Mode toggle ──────────────────────────
                Per-invoice user-driven flag for legitimate extra work
                (design change, site condition, client addition). When
                enabled, fully-billed items become selectable + qty
                inputs allow exceeding BOQ remaining. Reason becomes
                compulsory + auto-notifies admins on save. */}
            <div style={{marginBottom:14,padding:"10px 12px",borderRadius:7,
                         background: invForm.overBillMode ? "#FEF2F2" : T.surfaceB,
                         border: "1px solid " + (invForm.overBillMode ? "#FCA5A5" : T.b1)}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:700,color: invForm.overBillMode ? "#991B1B" : T.t1}}>
                    {invForm.overBillMode ? "⚠ OVER-BILLING MODE ENABLED" : "Normal billing mode"}
                  </div>
                  <div style={{fontSize:10.5,color: invForm.overBillMode ? "#991B1B" : T.t3,marginTop:2,lineHeight:1.45}}>
                    {invForm.overBillMode
                      ? "Fully-billed items selectable. Qty can exceed remaining. Reason compulsory."
                      : "BOQ-capped. Click toggle if extra work / site change needs over-billing."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={()=>setInvForm(p=>({...p, overBillMode: !p.overBillMode, overBillReason: !p.overBillMode ? p.overBillReason : ""}))}
                  style={{
                    padding:"6px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",border:"none",
                    background: invForm.overBillMode ? "#DC2626" : T.bluL,
                    color: invForm.overBillMode ? "white" : T.blu,
                  }}>
                  {invForm.overBillMode ? "Turn OFF" : "+ Over-Billing"}
                </button>
              </div>
              {invForm.overBillMode && (
                <div style={{marginTop:10}}>
                  <label style={{...lblS, color:"#991B1B", fontWeight:700}}>
                    Reason <span style={{color:"#DC2626"}}>*</span> <span style={{fontWeight:400,fontSize:10}}>(compulsory — shown on invoice + client query)</span>
                  </label>
                  <textarea
                    value={invForm.overBillReason}
                    onChange={e=>setInvForm(p=>({...p,overBillReason:e.target.value}))}
                    placeholder="e.g. Extra work due to design change — additional 250 qty for slab thickness increase per client approval dated 28-May-2026"
                    rows={2}
                    style={{...inpS, minHeight:50, resize:"vertical", fontFamily:"inherit", borderColor: invForm.overBillReason.trim() ? T.b1 : "#FCA5A5"}}
                  />
                  {/* Quick templates row */}
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
                    {[
                      "Extra work due to design change",
                      "Site condition change",
                      "Client requested addition",
                      "Material wastage compensation",
                    ].map(t => (
                      <button key={t} type="button"
                        onClick={()=>setInvForm(p=>({...p, overBillReason: p.overBillReason ? p.overBillReason : t}))}
                        style={{padding:"3px 8px",fontSize:9.5,fontWeight:600,background:"white",color:"#991B1B",border:"1px solid #FCA5A5",borderRadius:4,cursor:"pointer"}}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {invForm.source==="manual" && (<>
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 100px 32px",gap:6,marginBottom:6}}>
                {["Description","Unit","Qty","Rate",""].map(h => <span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
              </div>
              {invForm.manualItems.map((it, ii) => (
                <div key={ii} style={{display:"grid",gridTemplateColumns:"1fr 70px 80px 100px 32px",gap:6,marginBottom:4}}>
                  <input value={it.description} onChange={e=>{const arr=[...invForm.manualItems];arr[ii]={...arr[ii],description:e.target.value};setInvForm(p=>({...p,manualItems:arr}));}} placeholder="e.g. Termite treatment" style={inpS}/>
                  <input value={it.unit||""} onChange={e=>{const arr=[...invForm.manualItems];arr[ii]={...arr[ii],unit:e.target.value};setInvForm(p=>({...p,manualItems:arr}));}} placeholder="" style={inpS}/>
                  <input type="number" value={it.qty} onChange={e=>{const arr=[...invForm.manualItems];arr[ii]={...arr[ii],qty:e.target.value};setInvForm(p=>({...p,manualItems:arr}));}} placeholder="0" style={inpS}/>
                  <input type="number" value={it.rate} onChange={e=>{const arr=[...invForm.manualItems];arr[ii]={...arr[ii],rate:e.target.value};setInvForm(p=>({...p,manualItems:arr}));}} placeholder="0" style={inpS}/>
                  <button onClick={()=>{const arr=invForm.manualItems.filter((_,i)=>i!==ii);setInvForm(p=>({...p,manualItems:arr.length?arr:[{description:"",qty:"",rate:""}]}));}} style={{background:T.redL,color:T.red,border:"none",borderRadius:5,fontSize:14,cursor:"pointer"}}>×</button>
                </div>
              ))}
              <button onClick={()=>setInvForm(p=>({...p,manualItems:[...p.manualItems,{description:"",qty:"",rate:""}]}))} style={{marginTop:6,background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Line</button>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:14}}>
                <div><label style={lblS}>Retention %</label><input type="number" value={invForm.retention_pct} onChange={e=>setInvForm(p=>({...p,retention_pct:e.target.value}))} style={inpS}/></div>
                <div><label style={lblS}>TDS %</label><input type="number" value={invForm.tds_pct} onChange={e=>setInvForm(p=>({...p,tds_pct:e.target.value}))} style={inpS}/></div>
                <div><label style={lblS}>Tax %</label><input type="number" value={invForm.tax_pct} onChange={e=>setInvForm(p=>({...p,tax_pct:e.target.value}))} style={inpS}/></div>
              </div>
            </>)}

            {/* PS-17: Ledger-aware milestone selector with RA-bill discipline.
                Each item shows a progress bar (planned vs billed). Each
                milestone row shows: remaining/planned, rate, chip if
                fully billed (disabled) or red-flag warning when over-bill
                is allowed by company policy. */}
            {invForm.source==="milestone" && selEst && selEst.billing_method === "milestone_rate" && (<>
              {ledgerLoading && (
                <div style={{textAlign:"center",padding:"20px",color:T.t4,fontSize:12}}>Loading billing ledger…</div>
              )}
              {!ledgerLoading && billingLedger?.mode === "milestone_rate" && (() => {
                // overbillOK = company-level policy allow_overbill OR per-invoice user toggle (overBillMode)
                const overbillOK = !!billingLedger.allow_overbill || invForm.overBillMode;
                return (
                  <>
                    <div style={{fontSize:11,color:T.t3,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>Tick milestones to bill. Qty defaults to remaining; {overbillOK ? "over-bill allowed with red flag" : "capped at remaining qty"}.</span>
                      {overbillOK && <span style={{padding:"2px 7px",fontSize:9.5,fontWeight:700,background:"#FEE2E2",color:"#991B1B",borderRadius:3}}>OVER-BILL ENABLED</span>}
                    </div>
                    {billingLedger.items.map(it => {
                      const pctBilled = it.total_planned > 0 ? Math.min(100, (it.total_billed / it.total_planned) * 100) : 0;
                      return (
                        <div key={it.item_id} style={{marginBottom:12,border:"1px solid "+T.b1,borderRadius:7,padding:"10px 12px",background:"white"}}>
                          {/* Item header: name + planned/billed/remaining + progress bar */}
                          <div style={{marginBottom:8}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                              <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{it.description}</span>
                              <span style={{fontSize:10.5,color:T.t3}}>
                                Planned <b style={{color:T.t1}}>{it.total_planned}</b> {it.unit} · Billed <b style={{color:T.amb}}>{it.total_billed}</b> · Remaining <b style={{color:it.total_remaining > 0 ? T.grn : T.t4}}>{it.total_remaining}</b>
                              </span>
                            </div>
                            <div style={{height:5,background:T.b1,borderRadius:3,overflow:"hidden"}}>
                              <div style={{width: pctBilled+"%",height:"100%",background: pctBilled >= 100 ? T.t4 : T.blu,transition:"width .2s"}}/>
                            </div>
                          </div>
                          {/* Milestone rows */}
                          {it.milestones.map(m => {
                            const picked = invForm.items.find(x => x.milestone_id === m.milestone_id);
                            const isFully = m.status === "fully_billed";
                            // In over-bill mode, fully-billed milestones re-open for extra-work scenario.
                            const isDisabled = isFully && !overbillOK;
                            const enteredQty = parseFloat(picked?.this_qty) || 0;
                            const remainingQty = Number(m.remaining_qty) || 0;
                            const exceedsRemaining = enteredQty > remainingQty;
                            // Split-aware breakdown for the user's Case 3 scenario:
                            //   entered > remaining AND remaining > 0
                            //   → normal portion (in BOQ) + over portion (excess)
                            const normalPortion = Math.min(enteredQty, Math.max(0, remainingQty));
                            const overPortion   = Math.max(0, enteredQty - Math.max(0, remainingQty));
                            const isSplit       = exceedsRemaining && remainingQty > 0 && overPortion > 0;
                            const isFullOver    = isFully && enteredQty > 0;
                            // Show warning row when user has typed a qty
                            // exceeding remaining AND over-bill mode is OFF.
                            // Mode ON → split breakdown is enough (already shown).
                            const showOverWarning = exceedsRemaining && !invForm.overBillMode;
                            return (
                              <div key={m.milestone_id} style={{borderTop:"1px dashed "+T.b1, opacity: isDisabled ? 0.55 : 1}}>
                              <div style={{display:"grid",gridTemplateColumns:"24px 1fr 80px 120px 110px",gap:6,alignItems:"center",padding:"6px 0"}}>
                                <input type="checkbox" checked={!!picked} disabled={isDisabled}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      // Default qty: remaining (0 when fully billed → user types extra)
                                      const defaultQty = remainingQty > 0 ? String(remainingQty) : "";
                                      setInvForm(p => ({...p, items:[...p.items, {milestone_id:m.milestone_id, this_qty: defaultQty}]}));
                                    } else {
                                      setInvForm(p => ({...p, items: p.items.filter(x => x.milestone_id !== m.milestone_id)}));
                                    }
                                  }}/>
                                <div style={{minWidth:0}}>
                                  <div style={{fontSize:12,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div>
                                  <div style={{fontSize:10,color:T.t4,marginTop:1,display:"flex",gap:6,flexWrap:"wrap"}}>
                                    {isFully ? <span style={{padding:"1px 6px",background: overbillOK ? "#FEE2E2" : T.surfaceB,color: overbillOK ? "#991B1B" : T.t3,borderRadius:3,fontWeight:600}}>{overbillOK ? "🔴 Fully billed — over-bill enabled" : "✓ Fully invoiced"}</span>
                                             : m.status === "partial" ? <span>{m.billed_qty}/{m.planned_qty} billed · {m.remaining_qty} left</span>
                                             : <span>{m.planned_qty} {it.unit}</span>}
                                    {m.linked_task && (
                                      <span style={{padding:"1px 6px",background:T.bluL,color:T.blu,borderRadius:3,fontWeight:600}}>
                                        🔗 task @ {m.linked_task.progress}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span style={{fontSize:11,color:T.t3,textAlign:"right",paddingRight:6,fontVariantNumeric:"tabular-nums"}}>{fmtC(m.rate)}/unit</span>
                                <div>
                                  {/* ── No silent clamp ──────────────────────
                                      User feedback: silent reset confused users
                                      (typed 300 → reverted to 200 without explanation).
                                      Now we ACCEPT the typed value as-is and surface
                                      a visible warning + action below. User can either
                                      lower the qty OR turn on Over-Billing Mode + add
                                      reason. Submit is also guarded server-side. */}
                                  <input type="number"
                                    placeholder={isFully && overbillOK ? "extra qty" : String(remainingQty)}
                                    disabled={!picked || isDisabled}
                                    value={picked?.this_qty || ""}
                                    onChange={e => {
                                      const v = e.target.value;
                                      setInvForm(p => ({...p, items: p.items.map(x => x.milestone_id===m.milestone_id ? {...x, this_qty:v} : x)}));
                                    }}
                                    style={{...inpS,padding:"5px 8px",fontSize:11.5,
                                            borderColor: exceedsRemaining ? "#DC2626" : (isFully && picked && !enteredQty && overbillOK) ? "#F59E0B" : T.b1,
                                            borderWidth: (exceedsRemaining || (isFully && picked && !enteredQty && overbillOK)) ? 2 : 1,
                                            background: exceedsRemaining ? "#FEF2F2" : (isFully && picked && !enteredQty && overbillOK) ? "#FFFBEB" : "white",
                                            color: exceedsRemaining ? "#991B1B" : T.t1,
                                            fontWeight: exceedsRemaining ? 700 : 400}}/>
                                </div>
                                <span style={{fontSize:12,fontWeight:700,color:picked && enteredQty>0 ? (exceedsRemaining ? "#991B1B" : T.grn) : T.t4,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>
                                  {picked && enteredQty > 0 ? fmtC(enteredQty * m.rate) : "—"}
                                  {/* Split-aware over-bill breakdown — user-facing clarity */}
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
                              {/* ── Over-bill warning ROW (P2+ UX fix) ──────
                                  Fired when typed qty > remaining AND user
                                  hasn't yet enabled Over-Billing Mode. Tells
                                  them exactly what happened + what to do.
                                  One-click "Turn ON Over-Billing" CTA so
                                  they don't have to scroll back to the top. */}
                              {showOverWarning && (
                                <div style={{
                                  margin:"4px 0 6px 26px",
                                  padding:"7px 10px",
                                  background:"#FEF2F2",
                                  border:"1px solid #FCA5A5",
                                  borderRadius:6,
                                  display:"flex",
                                  alignItems:"center",
                                  gap:8,
                                  flexWrap:"wrap",
                                }}>
                                  <span style={{fontSize:14}}>⚠️</span>
                                  <div style={{flex:1,minWidth:180}}>
                                    <div style={{fontSize:11.5,fontWeight:700,color:"#991B1B",lineHeight:1.4}}>
                                      Over-billing detected — {enteredQty} {it.unit} entered, only {remainingQty} available
                                    </div>
                                    <div style={{fontSize:10.5,color:"#7F1D1D",marginTop:2,lineHeight:1.45}}>
                                      Either reduce qty to {remainingQty}, or enable Over-Billing Mode + provide a reason explaining the extra work.
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={()=>setInvForm(p=>({...p, overBillMode: true}))}
                                    style={{
                                      padding:"5px 10px",
                                      borderRadius:5,
                                      background:"#DC2626",
                                      color:"white",
                                      border:"none",
                                      fontSize:10.5,
                                      fontWeight:700,
                                      cursor:"pointer",
                                      whiteSpace:"nowrap",
                                    }}>
                                    Turn ON Over-Billing
                                  </button>
                                </div>
                              )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {billingLedger.items.length === 0 && (
                      <div style={{padding:"30px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                        No milestones defined. Use <b>+ Set Schedule</b> first.
                      </div>
                    )}
                  </>
                );
              })()}
            </>)}

            {/* % mode — same ledger pattern, but amounts instead of qty */}
            {invForm.source==="milestone" && selEst && selEst.billing_method === "milestone_percent" && (<>
              {ledgerLoading && <div style={{textAlign:"center",padding:"20px",color:T.t4,fontSize:12}}>Loading billing ledger…</div>}
              {!ledgerLoading && billingLedger?.mode === "milestone_percent" && (() => {
                const overbillOK = !!billingLedger.allow_overbill;
                return (
                  <div>
                    <div style={{fontSize:11,color:T.t3,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span>Tick stages to bill. {overbillOK ? "Over-bill allowed with red flag." : "Each stage can be billed once."}</span>
                      {overbillOK && <span style={{padding:"2px 7px",fontSize:9.5,fontWeight:700,background:"#FEE2E2",color:"#991B1B",borderRadius:3}}>OVER-BILL ENABLED</span>}
                    </div>
                    {billingLedger.stages.map(m => {
                      const picked = invForm.items.find(x => x.milestone_id === m.milestone_id);
                      const isFully = m.status === "fully_billed";
                      return (
                        <div key={m.milestone_id} style={{display:"grid",gridTemplateColumns:"24px 1fr 80px 140px 100px",gap:6,alignItems:"center",padding:"8px 8px",borderBottom:"1px solid "+T.b1, opacity: isFully ? 0.55 : 1}}>
                          <input type="checkbox" checked={!!picked} disabled={isFully}
                            onChange={e => {
                              if (e.target.checked) setInvForm(p => ({...p, items:[...p.items, {milestone_id:m.milestone_id}]}));
                              else setInvForm(p => ({...p, items: p.items.filter(x => x.milestone_id !== m.milestone_id)}));
                            }}/>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{m.name}</div>
                            <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                              {isFully ? <span style={{padding:"1px 6px",background:T.surfaceB,color:T.t3,borderRadius:3,fontWeight:600}}>✓ Fully invoiced</span>
                                       : m.status === "partial" ? <span>{fmtC(m.billed_amount)} billed · {fmtC(m.remaining_amount)} left</span>
                                       : <span>{fmtC(m.planned_amount)} planned</span>}
                            </div>
                          </div>
                          <span style={{fontSize:11.5,color:T.t3,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>{m.pct}%</span>
                          <span style={{fontSize:12.5,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(m.planned_amount)}</span>
                          <span style={{fontSize:11,color:T.t4,textAlign:"right"}}>
                            {picked && <span style={{color:T.grn,fontWeight:700}}>billed</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>)}

            {invForm.source==="milestone" && selEst && selEst.billing_method === "manual" && (
              <div>
                <div style={{fontSize:11,color:T.t3,marginBottom:8}}>Estimate uses manual billing — enter cumulative qty per item.</div>
                {(estDetail?.sections||[]).flatMap(s=>s.items).map(it => {
                  const picked = invForm.items.find(x => x.estimate_item_id === it.id);
                  return (
                    <div key={it.id} style={{display:"grid",gridTemplateColumns:"24px 1fr 100px 100px",gap:6,alignItems:"center",padding:"5px 8px",borderBottom:"1px solid "+T.b1}}>
                      <input type="checkbox" checked={!!picked}
                        onChange={e => {
                          if (e.target.checked) setInvForm(p => ({...p, items:[...p.items, {estimate_item_id:it.id, cumulative_qty:"", rate:parseFloat(it.rate)}]}));
                          else setInvForm(p => ({...p, items: p.items.filter(x => x.estimate_item_id !== it.id)}));
                        }}/>
                      <span style={{fontSize:12,color:T.t1}}>{it.description}</span>
                      <span style={{fontSize:11.5,color:T.t3,textAlign:"right",paddingRight:8}}>{fmtC(it.rate)}/{it.unit}</span>
                      <input type="number" placeholder="cum qty" disabled={!picked}
                        value={picked?.cumulative_qty || ""}
                        onChange={e => setInvForm(p => ({...p, items: p.items.map(x => x.estimate_item_id===it.id ? {...x, cumulative_qty:e.target.value} : x)}))}
                        style={{...inpS,padding:"4px 8px",fontSize:11}}/>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"flex-end",gap:8}}>
            <button onClick={closeInvModal} style={{padding:"7px 16px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={submitInvoice} disabled={saving} style={{padding:"7px 18px",borderRadius:6,background:saving?T.t4:T.blu,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:saving?"default":"pointer"}}>{saving?"Saving…":(invForm._editId?"Save Changes":"Create Invoice")}</button>
          </div>
        </div>
      </>);
      })()}

      {/* ── MODAL: Payment Schedule Setup ────────────────────────── */}
      {showSetMs && selEst && (<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:620,maxWidth:"95vw",maxHeight:"90vh",background:T.surface,borderRadius:12,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:T.t1}}>Payment Schedule Setup</div>
            <button onClick={()=>setShowSetMs(false)} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
          </div>
          <div style={{padding:"16px 18px",overflowY:"auto",flex:1}}>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>setMsForm(p=>({...p,kind:"rate"}))}
                style={{padding:"7px 14px",borderRadius:6,background:msForm.kind==="rate"?T.blu:T.surfaceB,color:msForm.kind==="rate"?"white":T.t2,border:"1px solid "+(msForm.kind==="rate"?T.blu:T.b1),fontSize:12,fontWeight:700,cursor:"pointer"}}>📋 Item-wise</button>
              <button onClick={()=>setMsForm(p=>({...p,kind:"percent"}))}
                style={{padding:"7px 14px",borderRadius:6,background:msForm.kind==="percent"?T.blu:T.surfaceB,color:msForm.kind==="percent"?"white":T.t2,border:"1px solid "+(msForm.kind==="percent"?T.blu:T.b1),fontSize:12,fontWeight:700,cursor:"pointer"}}>📊 % of Order Value</button>
            </div>

            {msForm.kind === "rate" && (() => {
              const allItems = (estDetail?.sections||[]).flatMap(s =>
                (s.items||[]).map(it => ({ ...it, _sectionTitle: s.title }))
              );
              const pickedItems = msForm.pickedItemIds
                .map(id => allItems.find(x => x.id === id))
                .filter(Boolean);
              const patchItemStages = (itemId, updater) => {
                setMsForm(p => {
                  const cur = p.itemStages[itemId] || [{ seq:0, name:"", rate:"", qty:"" }];
                  return { ...p, itemStages: { ...p.itemStages, [itemId]: updater(cur) } };
                });
              };
              // PS-22 value-driven edit with last-row auto-balance.
              // itemTotal = item.rate × item.qty (conserved invariant).
              // Editing a NON-last row → recompute last row qty (keeping its
              // rate) to absorb remaining. Editing the LAST row's rate →
              // qty = target/rate; its qty → rate = target/qty.
              const r3 = (n) => Math.round((parseFloat(n)||0) * 1000) / 1000;
              const editStageField = (item, rowIdx, field, value) => {
                patchItemStages(item.id, arr => {
                  const rows = arr.map(r => ({ ...r }));
                  rows[rowIdx][field] = value;
                  const n = rows.length;
                  if (n < 1) return rows;
                  const itemTotal = (parseFloat(item.rate)||0) * (parseFloat(item.qty)||0);
                  const lastIdx = n - 1;
                  const valOf = (r) => (parseFloat(r.rate)||0) * (parseFloat(r.qty)||0);
                  // Sum of all rows EXCEPT the last (the balancer)
                  let others = 0;
                  for (let i = 0; i < lastIdx; i++) others += valOf(rows[i]);
                  const target = itemTotal - others;   // value the last row must hit
                  if (rowIdx === lastIdx) {
                    // Editing the balancing row itself — keep edited field,
                    // derive the other from target.
                    if (field === "rate") {
                      const rt = parseFloat(rows[lastIdx].rate) || 0;
                      rows[lastIdx].qty = rt > 0 ? String(r3(target / rt)) : rows[lastIdx].qty;
                    } else if (field === "qty") {
                      const q = parseFloat(rows[lastIdx].qty) || 0;
                      rows[lastIdx].rate = q > 0 ? String(r3(target / q)) : rows[lastIdx].rate;
                    }
                  } else {
                    // Edited an upstream row — rebalance the last row, keeping
                    // its rate (or item rate as default), recompute its qty.
                    const lastRate = parseFloat(rows[lastIdx].rate) || parseFloat(item.rate) || 0;
                    rows[lastIdx].rate = String(lastRate);
                    rows[lastIdx].qty  = lastRate > 0 ? String(r3(target / lastRate)) : rows[lastIdx].qty;
                  }
                  return rows;
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
              return (<>
                {/* Picker trigger — opens side drawer */}
                {pickedItems.length === 0 ? (
                  <div style={{padding:"22px 16px",background:T.surfaceB,border:"1.5px dashed "+T.b1,borderRadius:8,textAlign:"center",marginBottom:12}}>
                    <div style={{fontSize:12.5,color:T.t3,marginBottom:8}}>No items picked yet</div>
                    <button onClick={()=>{ setItemPickerSearch(""); setItemPickerOpen(true); }}
                      style={{background:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      📚 Pick Items from BOQ
                    </button>
                  </div>
                ) : (
                  <div style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px"}}>
                        Picked Items ({pickedItems.length})
                      </span>
                      <div style={{display:"flex",gap:6}}>
                        {/* Bulk: turn every picked item into a single 'Complete' milestone
                            at its full rate. Saves clicks when stages aren't needed. */}
                        <button onClick={()=>{
                            setMsForm(p => {
                              const next = { ...p.itemStages };
                              for (const itm of pickedItems) {
                                next[itm.id] = [{ seq:0, name:"Complete", rate: String(parseFloat(itm.rate)||0), qty: String(parseFloat(itm.qty)||0) }];
                              }
                              return { ...p, itemStages: next };
                            });
                          }}
                          title="Each picked item becomes a single 'Complete' milestone at its full rate × qty"
                          style={{background:"#FEF3C7",color:"#92400E",border:"1px dashed #FCD34D",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                          ✓ All = 1 milestone each
                        </button>
                        <button onClick={()=>{ setItemPickerSearch(""); setItemPickerOpen(true); }}
                          style={{background:T.bluL,color:T.blu,border:"1px solid "+T.bluM,borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                          + Pick More
                        </button>
                      </div>
                    </div>
                    {/* Per-item accordion: header bar with stage count, click to expand stage editor */}
                    {pickedItems.map((it, idx) => {
                      const stages   = msForm.itemStages[it.id] || [{ seq:0, name:"", rate:"", qty:"" }];
                      const expanded = msForm.expandedItemId === it.id;
                      const filledCount = stages.filter(s => s.name && s.rate && s.qty).length;
                      // Value-driven conservation (PS-22)
                      const itemTotal  = (parseFloat(it.rate)||0) * (parseFloat(it.qty)||0);
                      const allocated  = stages.reduce((s,m) => s + (parseFloat(m.rate)||0) * (parseFloat(m.qty)||0), 0);
                      const remaining  = itemTotal - allocated;
                      const overAlloc  = remaining < -0.5;   // tolerance for rounding
                      const balanced   = Math.abs(remaining) <= 0.5;
                      // Library template chip — surfaces apply-library-stages
                      // when the estimate item came from a library row with stages.
                      const libItem = libItems.find(x => parseInt(x.id) === parseInt(it.library_item_id));
                      const libStageCount = parseInt(libItem?.stage_count || 0);
                      return (
                        <div key={it.id} style={{border:"1px solid "+T.b1,borderRadius:7,marginBottom:6,overflow:"hidden",background:"white"}}>
                          <div onClick={()=>setMsForm(p=>({...p,expandedItemId: expanded ? null : it.id}))}
                            style={{padding:"8px 12px",background: expanded ? T.bluL : T.surfaceB,borderBottom: expanded ? "1px solid "+T.bluM : "none",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:T.blu,color:"white",fontSize:10.5,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              {idx+1}
                            </span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:700,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.description}</div>
                              <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                                Item value <b style={{color:T.t2}}>{fmtC(itemTotal)}</b> ({fmtC(it.rate)} × {parseFloat(it.qty)})
                                {filledCount > 0 && <span style={{color:T.grn,marginLeft:6,fontWeight:600}}>· {filledCount} milestone{filledCount>1?"s":""}</span>}
                                {overAlloc && <span style={{color:"#DC2626",marginLeft:6,fontWeight:700}}>⚠ over-allocated</span>}
                                {!overAlloc && filledCount > 0 && balanced && <span style={{color:T.grn,marginLeft:6,fontWeight:600}}>✓ balanced</span>}
                              </div>
                            </div>
                            <button onClick={(e)=>{ e.stopPropagation(); removePicked(it.id); }}
                              title="Remove from picked items"
                              style={{background:T.redL,color:T.red,border:"none",borderRadius:4,width:22,height:22,fontSize:13,cursor:"pointer"}}>×</button>
                            <span style={{fontSize:10,color:T.t4}}>{expanded ? "▴" : "▾"}</span>
                          </div>
                          {expanded && (
                            <div style={{padding:"10px 12px"}}>
                              {/* Library template chip */}
                              {it.library_item_id && libStageCount > 0 && (
                                <div style={{marginBottom:10,padding:"7px 10px",background:T.grnL,border:"1px solid "+T.grnM,borderRadius:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                  <span style={{fontSize:11,color:T.grn}}>📚 <b>{libItem.name}</b> has {libStageCount} library stage{libStageCount>1?"s":""}</span>
                                  <button onClick={async()=>{
                                      setSaving(true);
                                      const r = await api.post("/customer-estimates/"+selEst.id+"/items/"+it.id+"/apply-library-stages", {}).catch(()=>({success:false}));
                                      setSaving(false);
                                      if (r.success) {
                                        // Remove this item from picked list since it's now saved
                                        removePicked(it.id);
                                        await reloadSel();
                                      } else alert(r.message||"Failed");
                                    }}
                                    disabled={saving}
                                    style={{padding:"4px 10px",background:T.grn,color:"white",border:"none",borderRadius:4,fontSize:10.5,fontWeight:700,cursor:saving?"default":"pointer"}}>
                                    {saving?"Applying…":"Apply Library Stages"}
                                  </button>
                                </div>
                              )}
                              <div style={{display:"grid",gridTemplateColumns:"26px 1fr 80px 70px 95px 26px",gap:6,marginBottom:4}}>
                                {["#","Milestone Name","Rate ₹/unit","Qty","Value","",].map((h,i)=><span key={h} style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign:i>=2&&i<=4?"right":"left",paddingRight:(i===2||i===3)?6:0}}>{h}</span>)}
                              </div>
                              {stages.map((m, mi) => {
                                const isLast = mi === stages.length - 1 && stages.length > 1;
                                const rowVal = (parseFloat(m.rate)||0) * (parseFloat(m.qty)||0);
                                return (
                                <div key={mi} style={{display:"grid",gridTemplateColumns:"26px 1fr 80px 70px 95px 26px",gap:6,marginBottom:4,alignItems:"center"}}>
                                  <span style={{fontSize:11,color:T.t4,display:"flex",alignItems:"center",gap:2}}>
                                    {mi+1}{isLast && <span title="Auto-balances to remaining value" style={{fontSize:10}}>⚖</span>}
                                  </span>
                                  <input value={m.name}
                                    onChange={e=>patchItemStages(it.id, arr => { const next=[...arr]; next[mi]={...next[mi],name:e.target.value}; return next; })}
                                    placeholder="e.g. Footing complete" style={{...inpS,padding:"5px 8px",fontSize:11.5}}/>
                                  <input type="number" value={m.rate || ""}
                                    onChange={e=>editStageField(it, mi, "rate", e.target.value)}
                                    placeholder={String(parseFloat(it.rate)||0)}
                                    style={{...inpS,padding:"5px 8px",fontSize:11.5,textAlign:"right"}}/>
                                  <input type="number" value={m.qty || ""}
                                    onChange={e=>editStageField(it, mi, "qty", e.target.value)}
                                    placeholder={String(parseFloat(it.qty)||0)}
                                    style={{...inpS,padding:"5px 8px",fontSize:11.5,textAlign:"right"}}/>
                                  <span style={{fontSize:11.5,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(rowVal)}</span>
                                  <button onClick={()=>patchItemStages(it.id, arr => {
                                      const next = arr.filter((_,i)=>i!==mi);
                                      return next.length ? next : [{seq:0,name:"",rate:"",qty:""}];
                                    })}
                                    style={{background:T.redL,color:T.red,border:"none",borderRadius:4,fontSize:13,cursor:"pointer"}}>×</button>
                                </div>
                                );
                              })}
                              {/* Live allocation bar */}
                              <div style={{marginTop:6,padding:"7px 10px",borderRadius:6,
                                           background: overAlloc ? "#FEF2F2" : balanced ? "#ECFDF5" : T.surfaceB,
                                           border:"1px solid " + (overAlloc ? "#FCA5A5" : balanced ? T.grnM : T.b1),
                                           display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11}}>
                                <span style={{color: overAlloc ? "#991B1B" : balanced ? "#065F46" : T.t3,fontWeight:600}}>
                                  Allocated {fmtC(allocated)} / {fmtC(itemTotal)}
                                </span>
                                <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums",
                                              color: overAlloc ? "#DC2626" : balanced ? T.grn : T.amb}}>
                                  {overAlloc ? "Over by " + fmtC(Math.abs(remaining)) : balanced ? "✓ Fully allocated" : "Remaining " + fmtC(remaining)}
                                </span>
                              </div>
                              <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                                <button onClick={()=>patchItemStages(it.id, arr => [...arr, { seq:arr.length, name:"", rate: String(parseFloat(it.rate)||0), qty:"" }])}
                                  style={{background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:4,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                                  + Add Milestone
                                </button>
                                {/* "Item itself = 1 milestone" shortcut → rate + qty = item's */}
                                <button onClick={()=>patchItemStages(it.id, () => ([
                                    { seq:0, name:"Complete", rate: String(parseFloat(it.rate) || 0), qty: String(parseFloat(it.qty) || 0) }
                                  ]))}
                                  title={`Replace stages with one milestone "Complete" at ${fmtC(it.rate)}/unit × ${parseFloat(it.qty)||0}`}
                                  style={{background:"#FEF3C7",color:"#92400E",border:"1px dashed #FCD34D",borderRadius:4,padding:"4px 10px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                                  ✓ Use whole item as 1 milestone
                                </button>
                              </div>
                              {overAlloc && (
                                <div style={{marginTop:8,padding:"6px 9px",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:4,fontSize:10.5,color:"#991B1B"}}>
                                  ⚠ Milestone values exceed item value by {fmtC(Math.abs(remaining))}. Reduce a milestone — can't save until balanced.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>);
            })()}

            {msForm.kind === "percent" && (() => {
              // Live aggregates for the % editor.
              const orderValue = parseFloat(selEst.total_value) || 0;
              const pctSum = msForm.pctMs.reduce((s,m) => s + (parseFloat(m.pct) || 0), 0);
              const remaining = +(100 - pctSum).toFixed(2);
              const sumOk  = Math.abs(pctSum - 100) < 0.01;
              // Preset templates — one-click fill
              const applyPreset = (splits, names) => {
                setMsForm(p => ({
                  ...p,
                  pctMs: splits.map((pct, i) => ({ seq:i, name: names[i] || ("Milestone "+(i+1)), pct: String(pct) }))
                }));
              };
              const distributeRemaining = () => {
                if (Math.abs(remaining) < 0.01) return;
                // Distribute remaining across rows whose pct is blank/zero.
                // If all rows are filled, dump into the last row.
                const blanks = msForm.pctMs.filter(m => !parseFloat(m.pct)).length;
                setMsForm(p => {
                  const arr = [...p.pctMs];
                  if (blanks > 0) {
                    const each = +(remaining / blanks).toFixed(2);
                    return { ...p, pctMs: arr.map(m => parseFloat(m.pct) ? m : { ...m, pct: String(each) }) };
                  }
                  // Fill into last row instead
                  if (!arr.length) return p;
                  const last = arr[arr.length-1];
                  arr[arr.length-1] = { ...last, pct: String(+(parseFloat(last.pct||0) + remaining).toFixed(2)) };
                  return { ...p, pctMs: arr };
                });
              };
              return (<>
                <div style={{padding:"7px 10px",background:T.surfaceB,borderRadius:6,fontSize:11,color:T.t3,marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                  <span>Order value</span>
                  <span style={{fontWeight:700,color:T.t1}}>{fmtC(orderValue)}</span>
                </div>
                {/* Preset chips — quick splits */}
                <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px"}}>Quick:</span>
                  {[
                    { label:"30 / 40 / 30",          splits:[30,40,30],          names:["Advance","On Progress","On Handover"] },
                    { label:"40 / 30 / 20 / 10",     splits:[40,30,20,10],       names:["Booking","Slab","Finishing","Handover"] },
                    { label:"25 / 25 / 25 / 25",     splits:[25,25,25,25],       names:["Stage 1","Stage 2","Stage 3","Stage 4"] },
                    { label:"50 / 50",                splits:[50,50],             names:["Advance","Completion"] },
                  ].map(p => (
                    <button key={p.label} onClick={()=>applyPreset(p.splits, p.names)}
                      style={{background:"white",color:T.blu,border:"1px solid "+T.bluM,borderRadius:14,padding:"3px 9px",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
                      {p.label}
                    </button>
                  ))}
                </div>
                {/* Editor table: # | Name | % | ₹ amount | × */}
                <div style={{display:"grid",gridTemplateColumns:"40px 1fr 80px 120px 32px",gap:6,marginBottom:6}}>
                  {["#","Milestone Name","%","₹ amount",""].map(h=><span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>{h}</span>)}
                </div>
                {msForm.pctMs.map((m, mi) => {
                  const pctVal = parseFloat(m.pct) || 0;
                  const amt    = (orderValue * pctVal) / 100;
                  return (
                    <div key={mi} style={{display:"grid",gridTemplateColumns:"40px 1fr 80px 120px 32px",gap:6,marginBottom:4,alignItems:"center"}}>
                      <span style={{fontSize:12,color:T.t4,paddingTop:8}}>{mi+1}</span>
                      <input value={m.name} onChange={e=>{const arr=[...msForm.pctMs];arr[mi]={...arr[mi],name:e.target.value};setMsForm(p=>({...p,pctMs:arr}));}} placeholder="e.g. Foundation" style={inpS}/>
                      <input type="number" value={m.pct} onChange={e=>{const arr=[...msForm.pctMs];arr[mi]={...arr[mi],pct:e.target.value};setMsForm(p=>({...p,pctMs:arr}));}} placeholder="%" style={{...inpS,textAlign:"right"}}/>
                      <span style={{padding:"7px 10px",background:T.surfaceB,borderRadius:6,fontSize:12,fontWeight:600,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(amt)}</span>
                      <button onClick={()=>{const arr=msForm.pctMs.filter((_,i)=>i!==mi);setMsForm(p=>({...p,pctMs:arr.length?arr:[{seq:0,name:"",pct:""}]}));}} style={{background:T.redL,color:T.red,border:"none",borderRadius:5,fontSize:14,cursor:"pointer"}}>×</button>
                    </div>
                  );
                })}
                <button onClick={()=>setMsForm(p=>({...p,pctMs:[...p.pctMs,{seq:p.pctMs.length,name:"",pct:""}]}))} style={{marginTop:6,background:T.bluL,color:T.blu,border:"1px dashed "+T.bluM,borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer"}}>+ Add Milestone</button>
                {/* Live total row — green when ✓ 100%, amber when off */}
                <div style={{marginTop:12,padding:"9px 12px",borderRadius:7,
                             background: sumOk ? T.grnL : "#FFFBEB",
                             border: "1px solid " + (sumOk ? T.grnM : "#FCD34D"),
                             display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11.5,fontWeight:700,color: sumOk ? T.grn : "#92400E"}}>
                    {sumOk ? "✓ Total 100% — schedule covers full order value"
                          : `Total ${pctSum.toFixed(2)}% — ${remaining > 0 ? remaining.toFixed(2) + "% remaining" : Math.abs(remaining).toFixed(2) + "% over"}`}
                  </span>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,fontWeight:700,color: sumOk ? T.grn : "#92400E",fontVariantNumeric:"tabular-nums"}}>
                      {fmtC((orderValue * pctSum) / 100)}
                    </span>
                    {!sumOk && Math.abs(remaining) > 0.01 && (
                      <button onClick={distributeRemaining}
                        style={{background:"#FEF3C7",border:"1px solid #FCD34D",color:"#92400E",borderRadius:5,padding:"3px 9px",fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                        {remaining > 0 ? "↻ Distribute remaining" : "↻ Trim excess"}
                      </button>
                    )}
                  </div>
                </div>
              </>);
            })()}
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"flex-end",gap:8}}>
            <button onClick={()=>setShowSetMs(false)} style={{padding:"7px 16px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={submitMilestones} disabled={saving} style={{padding:"7px 18px",borderRadius:6,background:saving?T.t4:T.blu,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:saving?"default":"pointer"}}>{saving?"Saving…":"Save Schedule"}</button>
          </div>
        </div>
      </>)}

      {/* ── MODAL: Auto-Bill Invoice Preview ─────────────────────────
          Shows complete audit context for a Draft auto-generated invoice:
          item name, milestone, the task that triggered it (with current
          progress %), qty, rate, amount, tax breakdown. Admin reviews
          then Confirms (→ Submitted) or Rejects (deletes the draft). */}
      {previewInv && (() => {
        const inv = previewInv.invoice;
        const items = previewInv.items || [];
        const task = previewInv.trigger_task;
        return (<>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:340,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",top:"4vh",left:"50%",transform:"translateX(-50%)",width:760,maxWidth:"95vw",maxHeight:"92vh",background:T.surface,borderRadius:12,zIndex:341,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"#F5F3FF"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#5B21B6",display:"flex",alignItems:"center",gap:8}}>
                  🤖 Auto-Invoice Preview · {inv.invoice_no}
                </div>
                <div style={{fontSize:11,color:"#7C3AED",marginTop:2}}>
                  Review this draft. On Confirm, it becomes a live invoice.
                </div>
              </div>
              <button onClick={()=>setPreviewInv(null)} disabled={previewConfirming}
                style={{background:"none",border:"none",fontSize:20,color:"#7C3AED",cursor: previewConfirming?"not-allowed":"pointer"}}>×</button>
            </div>
            {/* Body */}
            <div style={{padding:"16px 18px",overflowY:"auto",flex:1}}>
              {/* Trigger audit panel */}
              {task && (
                <div style={{padding:"10px 12px",background:"#EFF6FF",border:"1px solid "+T.bluM,borderRadius:8,marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>
                    🔗 Triggered by Task
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.t1,flex:1}}>{task.title || task.name}</div>
                    <span style={{fontSize:11,color:T.t3}}>{task.status}</span>
                    <span style={{fontSize:13,fontWeight:800,color:T.grn,fontVariantNumeric:"tabular-nums"}}>{task.progress}% complete</span>
                  </div>
                </div>
              )}
              {/* Invoice header — 4 cols: Customer | Project | Date | Source */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:10,marginBottom:14}}>
                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Customer</div>
                  <div style={{fontSize:12.5,color:T.t1,marginTop:2,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={inv.customer_name || "—"}>{inv.customer_name || "—"}</div>
                </div>
                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Project</div>
                  <div style={{fontSize:12.5,color:T.t1,marginTop:2,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={inv.project_name || project?.name || "—"}>{inv.project_name || project?.name || "—"}</div>
                </div>
                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Invoice Date</div>
                  <div style={{fontSize:12.5,color:T.t1,marginTop:2,fontWeight:600}}>{inv.invoice_date}</div>
                </div>
                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px"}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase"}}>Source</div>
                  <div style={{fontSize:12.5,color:"#6D28D9",marginTop:2,fontWeight:700}}>🤖 AUTO · DRAFT</div>
                </div>
              </div>
              {/* Line items grid */}
              <div style={{border:"1px solid "+T.b1,borderRadius:8,overflow:"hidden",marginBottom:14}}>
                <div style={{display:"grid",gridTemplateColumns:"1.7fr 1fr 60px 75px 90px 100px",padding:"7px 12px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                  {["Item","Milestone","Unit","Qty","Rate","Amount"].map((h,i) => (
                    <span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign: i>=2 ? "right" : "left", paddingRight: i===2||i===3||i===4 ? 8 : 0}}>{h}</span>
                  ))}
                </div>
                {items.map((it, idx) => (
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"1.7fr 1fr 60px 75px 90px 100px",padding:"9px 12px",borderBottom: idx<items.length-1 ? "1px solid "+T.b1 : "none",alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.clean_description || it.description}</span>
                    <span style={{fontSize:11,color:T.blu,fontWeight:600}}>{it.milestone_name || "—"}</span>
                    <span style={{fontSize:11,color:T.t3}}>{it.unit}</span>
                    <span style={{fontSize:12,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums",fontWeight:600}}>{parseFloat(it.qty)}</span>
                    <span style={{fontSize:12,color:T.t2,textAlign:"right",paddingRight:8,fontVariantNumeric:"tabular-nums"}}>{fmtC(it.rate)}</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(it.this_invoice_amount)}</span>
                  </div>
                ))}
              </div>
              {/* Tax breakdown */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:8}}>
                {[
                  {l:"Gross",v:inv.gross_amount,c:T.t1},
                  {l:`Retention ${inv.retention_pct}%`,v:inv.retention_amt,c:T.amb},
                  {l:`TDS ${inv.tds_pct}%`,v:inv.tds_amt,c:T.red},
                  {l:"Net Receivable",v:inv.net_receivable,c:T.grn},
                ].map(s => (
                  <div key={s.l} style={{textAlign:"center",background:T.surfaceB,borderRadius:7,padding:"9px 8px"}}>
                    <div style={{fontSize:9,color:T.t4,textTransform:"uppercase",fontWeight:700}}>{s.l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:s.c,marginTop:3}}>{fmtC(s.v)}</div>
                  </div>
                ))}
              </div>
              {inv.remark && (
                <div style={{padding:"8px 11px",background:T.surfaceB,borderRadius:6,marginTop:12,fontSize:11,color:T.t3,fontStyle:"italic",lineHeight:1.5}}>
                  {inv.remark}
                </div>
              )}
            </div>
            {/* Footer actions */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB,gap:8}}>
              <button onClick={rejectAutoInvoice} disabled={previewConfirming}
                style={{background:"white",border:"1.5px solid "+T.redM,color:T.red,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:700,cursor: previewConfirming?"default":"pointer"}}>
                ✕ Reject Draft
              </button>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setPreviewInv(null)} disabled={previewConfirming}
                  style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor: previewConfirming?"default":"pointer"}}>
                  Close
                </button>
                <button onClick={confirmAutoInvoice} disabled={previewConfirming}
                  style={{background: previewConfirming ? T.t4 : T.grn,color:"white",border:"none",borderRadius:6,padding:"7px 20px",fontSize:12,fontWeight:700,cursor: previewConfirming?"default":"pointer"}}>
                  {previewConfirming ? "Submitting…" : "✓ Confirm & Submit"}
                </button>
              </div>
            </div>
          </div>
        </>);
      })()}

      {/* ── DRAWER: Invoice Detail (PS-18) ──────────────────────────
          Right-side slide-in panel with full invoice audit context:
          who/when created, project + estimate + customer, trigger task
          (for auto-bills), items + tax breakdown, payments history.
          Footer: Delete (destructive, with confirm) + Record Payment. */}
      {invDetailFor && (() => {
        const inv = invDetail || {};
        const items = inv.items || [];
        const payments = inv.payments || [];
        const paid = payments.reduce((s,p) => s + (parseFloat(p.amount_received) || 0), 0);
        const due = Math.max(0, (parseFloat(inv.net_receivable) || 0) - paid);
        const stColor = inv.status === "Paid" ? T.grn
                      : inv.status === "Approved" ? T.blu
                      : inv.status === "Submitted" ? T.amb
                      : inv.status === "Draft" ? "#7C3AED"
                      : T.t4;
        const isAuto = inv.source === "auto";
        return (<>
          {/* Use onMouseDown to avoid the same click that opened this drawer
              bubbling up and landing on the overlay (which would close it
              immediately on first open). */}
          <div onMouseDown={closeInvoiceDetail} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:340,backdropFilter:"blur(2px)"}}/>
          <div onClick={(e)=>e.stopPropagation()}
            style={{position:"fixed",top:0,right:0,bottom:0,width:520,maxWidth:"95vw",background:T.surface,boxShadow:"-12px 0 32px rgba(0,0,0,0.2)",zIndex:341,display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",background: isAuto ? "#F5F3FF" : T.t1,color: isAuto ? "#5B21B6" : "white",flexShrink:0,borderBottom: isAuto ? "1px solid #DDD6FE" : "none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,opacity:0.7,textTransform:"uppercase",letterSpacing:".4px",marginBottom:3}}>
                    {isAuto ? "🤖 Auto Invoice" : inv.source === "manual" ? "Manual Invoice" : "Customer Invoice"}
                  </div>
                  <div style={{fontSize:18,fontWeight:800,marginBottom:3}}>{inv.invoice_no || "—"}</div>
                  <div style={{fontSize:11,opacity:0.7}}>
                    {inv.invoice_date}
                    {inv.estimate_no && <> · {inv.estimate_no}</>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{padding:"4px 10px",borderRadius:14,background: isAuto ? "white" : "rgba(255,255,255,0.15)",color: isAuto ? "#7C3AED" : "white",fontSize:10.5,fontWeight:700,border: isAuto ? "1px solid #DDD6FE" : "none"}}>
                    {inv.status}
                  </span>
                  <button onClick={closeInvoiceDetail}
                    style={{background:"none",border:"none",color: isAuto ? "#7C3AED" : "rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer",lineHeight:1,padding:0}}>×</button>
                </div>
              </div>
            </div>
            {/* Body */}
            <div style={{flex:1,overflowY:"auto"}}>
              {/* ── OVER-BILL banner (P2+ feature) ─────────────────
                  Prominently shown so anyone reviewing the invoice
                  (especially in client conversations) understands
                  WHY this invoice exists outside the BOQ + sees the
                  reason captured at creation time. */}
              {invDetail && invDetail.is_over_bill == 1 && (
                <div style={{margin:"14px 18px 0",padding:"12px 14px",borderRadius:8,background:"#FEF2F2",border:"1px solid #FCA5A5"}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#991B1B",letterSpacing:".3px",textTransform:"uppercase",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                    🔴 Over-Bill Invoice
                    {invDetail.linked_invoice_id && (
                      <span style={{fontWeight:600,fontSize:10,padding:"2px 7px",background:"white",border:"1px solid #FCA5A5",borderRadius:10,letterSpacing:0,textTransform:"none"}}>
                        🔗 Linked to normal portion: INV-{invDetail.linked_invoice_id}
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11.5,color:"#7F1D1D",lineHeight:1.5}}>
                    <b>Reason:</b> {invDetail.over_bill_reason || "(no reason recorded)"}
                  </div>
                  <div style={{fontSize:10,color:"#991B1B",marginTop:6,fontStyle:"italic"}}>
                    This invoice bills quantity beyond the original BOQ. Audit-relevant for client billing discussions.
                  </div>
                </div>
              )}
              {invDetailLoading && (
                <div style={{textAlign:"center",padding:"40px 20px",color:T.t4,fontSize:13}}>
                  Loading invoice…
                </div>
              )}
              {!invDetailLoading && invDetail && (
                <div style={{padding:"16px 18px"}}>
                  {/* Audit / origin panel */}
                  <div style={{background:T.surfaceB,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>
                      Origin
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <div>
                        <div style={{fontSize:10,color:T.t4,marginBottom:2}}>Project</div>
                        <div style={{fontSize:12,color:T.t1,fontWeight:600}}>{inv.project_name || "—"}</div>
                        {inv.city_name && <div style={{fontSize:10,color:T.t4}}>{inv.city_name}</div>}
                      </div>
                      <div>
                        <div style={{fontSize:10,color:T.t4,marginBottom:2}}>Customer</div>
                        <div style={{fontSize:12,color:T.t1,fontWeight:600}}>{inv.customer_name || "—"}</div>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:T.t4,marginBottom:2}}>Created by</div>
                        <div style={{fontSize:12,color:T.t1,fontWeight:600}}>
                          {inv.created_by_name ? inv.created_by_name : (isAuto ? "🤖 System (Auto-bill)" : "—")}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:T.t4,marginBottom:2}}>Estimate</div>
                        <div style={{fontSize:12,color:T.t1,fontWeight:600}}>{inv.estimate_no || "Ad-hoc (manual)"}</div>
                        {inv.billing_method && <div style={{fontSize:10,color:T.t4}}>{inv.billing_method}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Trigger task panel — auto-bills only */}
                  {isAuto && inv.triggered_by_task_id && (
                    <div style={{background:"#F5F3FF",border:"1px solid #DDD6FE",borderRadius:8,padding:"10px 12px",marginBottom:12}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#6D28D9",textTransform:"uppercase",letterSpacing:".4px",marginBottom:4}}>
                        🔗 Triggered by Task
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{inv.trigger_task_title || inv.trigger_task_name || ("Task #"+inv.triggered_by_task_id)}</span>
                        <span style={{fontSize:13,fontWeight:800,color:T.grn,fontVariantNumeric:"tabular-nums"}}>{inv.trigger_task_progress}%</span>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>
                    Line Items ({items.length})
                  </div>
                  <div style={{border:"1px solid "+T.b1,borderRadius:8,overflow:"hidden",marginBottom:14}}>
                    <div style={{display:"grid",gridTemplateColumns:"1.5fr 90px 60px 75px 90px",padding:"7px 12px",background:T.surfaceB,borderBottom:"1px solid "+T.b1}}>
                      {["Item","Milestone","Qty","Rate","Amount"].map((h,i) => (
                        <span key={h} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",textAlign: i>=2?"right":"left", paddingRight: (i===2||i===3)?6:0}}>{h}</span>
                      ))}
                    </div>
                    {items.length === 0 && (
                      <div style={{padding:"20px",textAlign:"center",color:T.t4,fontSize:11.5}}>No line items</div>
                    )}
                    {items.map((it, idx) => (
                      <div key={idx} style={{display:"grid",gridTemplateColumns:"1.5fr 90px 60px 75px 90px",padding:"9px 12px",borderBottom: idx<items.length-1 ? "1px solid "+T.b1 : "none",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.clean_description || it.description}</span>
                        <span style={{fontSize:10.5,color:T.blu,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.milestone_name || "—"}</span>
                        <span style={{fontSize:11.5,color:T.t2,textAlign:"right",paddingRight:6,fontVariantNumeric:"tabular-nums",fontWeight:600}}>{parseFloat(it.qty||0)}</span>
                        <span style={{fontSize:11.5,color:T.t2,textAlign:"right",paddingRight:6,fontVariantNumeric:"tabular-nums"}}>{fmtC(it.rate)}</span>
                        <span style={{fontSize:12.5,fontWeight:700,color:T.t1,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(it.this_invoice_amount)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tax breakdown */}
                  <div style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>
                    Computation
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                    {[
                      {l:"Gross",v:inv.gross_amount,c:T.t1,bold:false},
                      {l:`Retention ${inv.retention_pct||0}%`,v:inv.retention_amt,c:T.amb,sign:"−"},
                      {l:`TDS ${inv.tds_pct||0}%`,v:inv.tds_amt,c:T.red,sign:"−"},
                      {l:`Tax ${inv.tax_pct||0}%`,v:inv.tax_amt,c:T.blu,sign:"+"},
                    ].map(r => (
                      <div key={r.l} style={{background:T.surfaceB,borderRadius:7,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:11,color:T.t3}}>{r.l}</span>
                        <span style={{fontSize:13,fontWeight:700,color:r.c,fontVariantNumeric:"tabular-nums"}}>
                          {r.sign||""}{fmtC(r.v)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Net + paid + due */}
                  <div style={{background:"linear-gradient(135deg, #ECFDF5, #D1FAE5)",border:"1.5px solid "+T.grnM,borderRadius:8,padding:"12px 14px",marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#065F46",textTransform:"uppercase",letterSpacing:".4px"}}>Net Receivable</span>
                      <span style={{fontSize:18,fontWeight:800,color:"#065F46",fontVariantNumeric:"tabular-nums"}}>{fmtC(inv.net_receivable)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#065F46"}}>
                      <span>Received: <b>{fmtC(paid)}</b></span>
                      <span>Due: <b style={{color: due > 0 ? T.red : T.grn}}>{fmtC(due)}</b></span>
                    </div>
                  </div>

                  {/* Payments list */}
                  {payments.length > 0 && (
                    <>
                      <div style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".4px",marginBottom:6}}>
                        Payments ({payments.length})
                      </div>
                      <div style={{border:"1px solid "+T.b1,borderRadius:8,overflow:"hidden",marginBottom:14}}>
                        {payments.map((p, idx) => (
                          <div key={p.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 100px",gap:8,padding:"9px 12px",alignItems:"center",borderBottom: idx<payments.length-1 ? "1px solid "+T.b1 : "none"}}>
                            <span style={{fontSize:11.5,color:T.t3}}>{p.payment_date}</span>
                            <span style={{fontSize:12,color:T.t1}}>
                              {p.payment_mode}
                              {p.reference_no && <span style={{color:T.t4}}> · {p.reference_no}</span>}
                            </span>
                            <span style={{fontSize:13,fontWeight:700,color:T.grn,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtC(p.amount_received)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Remark */}
                  {inv.remark && (
                    <div style={{padding:"10px 12px",background:T.surfaceB,borderRadius:7,fontSize:11.5,color:T.t3,fontStyle:"italic",lineHeight:1.5,marginBottom:14}}>
                      "{inv.remark}"
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Footer actions */}
            {!invDetailLoading && invDetail && (
              <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,gap:8}}>
                {inv.status !== "Paid" ? (
                  <button onClick={()=>{ closeInvoiceDetail(); deleteInvoice(inv.id, inv.invoice_no); }}
                    style={{background:"white",border:"1.5px solid "+T.redM,color:T.red,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    🗑 Delete Invoice
                  </button>
                ) : <span/>}
                <div style={{display:"flex",gap:8}}>
                  {/* PDF download — always available */}
                  <button onClick={()=>downloadInvoicePdf(inv.id, inv.invoice_no)}
                    style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    ⬇ PDF
                  </button>
                  {/* Edit — all non-Paid invoices. Manual → full item editor;
                      milestone/auto → compact header editor (date/remark/%). */}
                  {inv.status !== "Paid" && (
                    <button onClick={()=>editInvoice(inv)}
                      style={{background:"white",border:"1px solid "+T.bluM,color:T.blu,borderRadius:6,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      ✎ Edit
                    </button>
                  )}
                  <button onClick={closeInvoiceDetail}
                    style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    Close
                  </button>
                  {/* Record Payment removed — customer receipts are recorded
                      in the Party Ledger (Party tab → Receipt), keeping all
                      money-in for this client in one place. */}
                  {inv.status === "Draft" && (
                    <button onClick={()=>{ closeInvoiceDetail(); openInvoicePreview(inv.id); }}
                      style={{background:"#7C3AED",color:"white",border:"none",borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      Confirm & Submit
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>);
      })()}

      {/* ── MODAL: Compact Invoice Header Editor (milestone/auto) ────
          Edits date, remark + deduction % only. Line items stay locked
          (they derive from the schedule). Net recomputed live from the
          existing gross_amount. */}
      {hdrEditForm && (() => {
        const gross  = parseFloat(hdrEditForm.gross_amount) || 0;
        const retPct = parseFloat(hdrEditForm.retention_pct) || 0;
        const tdsPct = parseFloat(hdrEditForm.tds_pct) || 0;
        const taxPct = parseFloat(hdrEditForm.tax_pct) || 0;
        const retAmt = Math.round(gross * retPct) / 100;
        const tdsAmt = Math.round(gross * tdsPct) / 100;
        const taxAmt = Math.round(gross * taxPct) / 100;
        const netRec = gross - retAmt - tdsAmt + taxAmt;
        const set = (k,v) => setHdrEditForm(p => ({ ...p, [k]: v }));
        return (<>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:350,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:480,maxWidth:"95vw",background:T.surface,borderRadius:12,zIndex:351,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:T.t1}}>Edit Invoice · {hdrEditForm.invoice_no}</div>
                <div style={{fontSize:10.5,color:T.t4,marginTop:2}}>Line items are locked (from schedule). Edit date, note &amp; deductions.</div>
              </div>
              <button onClick={()=>setHdrEditForm(null)} disabled={hdrEditSaving} style={{background:"none",border:"none",fontSize:20,color:T.t3,cursor:hdrEditSaving?"not-allowed":"pointer"}}>×</button>
            </div>
            <div style={{padding:"16px 18px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div>
                  <label style={lblS}>Invoice Date</label>
                  <input type="date" value={hdrEditForm.invoice_date} onChange={e=>set("invoice_date", e.target.value)} style={inpS}/>
                </div>
                <div>
                  <label style={lblS}>Gross (locked)</label>
                  <input value={fmtC(gross)} disabled style={{...inpS,background:T.surfaceB,color:T.t3}}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                <div>
                  <label style={lblS}>Retention %</label>
                  <input type="number" value={hdrEditForm.retention_pct} onChange={e=>set("retention_pct", e.target.value)} style={{...inpS,textAlign:"right"}}/>
                </div>
                <div>
                  <label style={lblS}>TDS %</label>
                  <input type="number" value={hdrEditForm.tds_pct} onChange={e=>set("tds_pct", e.target.value)} style={{...inpS,textAlign:"right"}}/>
                </div>
                <div>
                  <label style={lblS}>Tax %</label>
                  <input type="number" value={hdrEditForm.tax_pct} onChange={e=>set("tax_pct", e.target.value)} style={{...inpS,textAlign:"right"}}/>
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={lblS}>Remark</label>
                <input value={hdrEditForm.remark} onChange={e=>set("remark", e.target.value)} placeholder="Optional note" style={inpS}/>
              </div>
              {/* Live recompute preview */}
              <div style={{background:"linear-gradient(135deg, #ECFDF5, #D1FAE5)",border:"1.5px solid "+T.grnM,borderRadius:8,padding:"10px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:"#065F46",marginBottom:4}}>
                  <span>Retention −{fmtC(retAmt)}</span><span>TDS −{fmtC(tdsAmt)}</span><span>Tax +{fmtC(taxAmt)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#065F46",textTransform:"uppercase",letterSpacing:".4px"}}>Net Receivable</span>
                  <span style={{fontSize:18,fontWeight:800,color:"#065F46",fontVariantNumeric:"tabular-nums"}}>{fmtC(netRec)}</span>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setHdrEditForm(null)} disabled={hdrEditSaving}
                style={{background:T.surfaceB,border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:hdrEditSaving?"not-allowed":"pointer"}}>Cancel</button>
              <button onClick={submitHdrEdit} disabled={hdrEditSaving}
                style={{background:hdrEditSaving?T.t4:T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:hdrEditSaving?"default":"pointer"}}>
                {hdrEditSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </>);
      })()}

      {/* ── DRAWER: Task Picker (link milestone → existing task) ─────
          Right-side slide-in. Lists existing project_tasks (active),
          searchable. User picks one + sets trigger_pct (0-100). On
          confirm, PUT /milestones/rate/:msId/link saves the link.
          No new task creation. */}
      {taskPickerFor !== null && (() => {
        const q = taskPickerSearch.trim().toLowerCase();
        // Build hierarchy tree from flat task list (parent_id links).
        const byId = {};
        for (const t of projectTasks) byId[t.id] = { ...t, _children: [] };
        const roots = [];
        for (const t of projectTasks) {
          const node = byId[t.id];
          if (t.parent_id && byId[t.parent_id]) byId[t.parent_id]._children.push(node);
          else roots.push(node);
        }
        // Flatten into an ordered display list honoring expand state.
        // When searching, show ALL matches flat (ignore collapse).
        const matchesQ = (t) => !q || (t.title || t.name || "").toLowerCase().includes(q) || (t.task_no||"").toLowerCase().includes(q);
        const displayRows = [];
        if (q) {
          for (const t of projectTasks) if (matchesQ(t)) displayRows.push({ node: byId[t.id], depth: 0, searchHit: true });
        } else {
          const walk = (node, depth) => {
            displayRows.push({ node, depth, searchHit: false });
            if (node._children.length && taskPickerExpanded[node.id]) {
              for (const c of node._children) walk(c, depth + 1);
            }
          };
          for (const r of roots) walk(r, 0);
        }
        return (<>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:330}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:440,maxWidth:"95vw",background:"white",boxShadow:"-8px 0 24px rgba(0,0,0,0.2)",zIndex:331,display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",background:T.t1,color:"white",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:700}}>Link to Project Task</div>
                <button onClick={()=>setTaskPickerFor(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.65)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)"}}>
                Pick an existing task and set the % completion that triggers billing
              </div>
            </div>
            {/* Trigger % input — always visible at top */}
            <div style={{padding:"12px 18px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <label style={{fontSize:10,fontWeight:700,color:T.t3,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".4px"}}>
                Trigger at task completion %
              </label>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="range" min={0} max={100} step={5}
                  value={linkTriggerPct} onChange={e=>setLinkTriggerPct(parseInt(e.target.value)||0)}
                  style={{flex:1}}/>
                <input type="number" min={0} max={100} value={linkTriggerPct}
                  onChange={e=>setLinkTriggerPct(Math.min(100, Math.max(0, parseInt(e.target.value)||0)))}
                  style={{width:60,padding:"4px 7px",borderRadius:5,border:"1.5px solid "+T.b1,fontSize:12,textAlign:"right",fontFamily:"inherit"}}/>
                <span style={{fontSize:12,fontWeight:700,color:T.blu}}>%</span>
              </div>
              <div style={{display:"flex",gap:5,marginTop:6}}>
                {[25, 50, 75, 100].map(p => (
                  <button key={p} onClick={()=>setLinkTriggerPct(p)}
                    style={{flex:1,background: linkTriggerPct===p ? T.blu : "white",color: linkTriggerPct===p ? "white" : T.t3,border:"1px solid " + (linkTriggerPct===p ? T.blu : T.b1),borderRadius:4,padding:"3px 6px",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>
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
            {/* Task list — hierarchical (parent → expandable children) */}
            <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
              {projectTasks.length === 0 && (
                <div style={{padding:"36px 20px",textAlign:"center"}}>
                  <div style={{fontSize:12.5,color:T.t3,marginBottom:4}}>No tasks in this project yet.</div>
                  <div style={{fontSize:11,color:T.t4,marginBottom:14}}>Create a task to link this milestone to it.</div>
                  <button onClick={()=>setShowCreateTaskFor(true)}
                    style={{background:T.blu,color:"white",border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    + Create Task
                  </button>
                </div>
              )}
              {projectTasks.length > 0 && displayRows.length === 0 && (
                <div style={{padding:"30px 20px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                  No tasks match "{taskPickerSearch}"
                </div>
              )}
              {displayRows.map(({ node: t, depth }) => {
                const isSel  = linkSelectedTaskId === t.id;
                const taskName = t.title || t.name;
                const progress = Number(t.progress) || 0;
                const status   = t.status || "Not Started";
                const statusColor = status === "Completed" ? T.grn : status === "Ongoing" ? T.blu : status === "Hold" ? T.red : T.t4;
                const hasKids = (t._children || []).length > 0;
                const isExpanded = !!taskPickerExpanded[t.id];
                return (
                  <div key={t.id} onClick={()=>setLinkSelectedTaskId(t.id)}
                    style={{padding:"10px 18px 10px "+(18 + depth*18)+"px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",gap:8,background: isSel ? "#EFF6FF" : "white"}}
                    onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background="#F8FAFC"; }}
                    onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="white"; }}>
                    {/* Expand chevron for parents (collapse state); spacer for leaves */}
                    {hasKids ? (
                      <button onClick={(e)=>{ e.stopPropagation(); setTaskPickerExpanded(p=>({...p,[t.id]:!p[t.id]})); }}
                        title={isExpanded?"Collapse":"Expand subtasks"}
                        style={{background:"none",border:"none",cursor:"pointer",color:T.t3,fontSize:10,width:16,flexShrink:0,padding:0}}>
                        {isExpanded ? "▼" : "▶"}
                      </button>
                    ) : <span style={{width:16,flexShrink:0}}/>}
                    {/* Radio */}
                    <span style={{width:18,height:18,borderRadius:"50%",border:"2px solid " + (isSel ? T.blu : T.b1),background: isSel ? T.blu : "white",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {isSel && <span style={{width:6,height:6,borderRadius:"50%",background:"white"}}/>}
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight: hasKids ? 700 : 600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {taskName}
                        {hasKids && <span style={{fontSize:9.5,color:T.t4,fontWeight:500,marginLeft:6}}>({t._children.length})</span>}
                      </div>
                      <div style={{fontSize:10,color:T.t4,marginTop:2,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{padding:"1px 6px",borderRadius:3,background:statusColor+"22",color:statusColor,fontWeight:600}}>{status}</span>
                        <span>· {progress}%</span>
                        {t.task_no && <span>· {t.task_no}</span>}
                      </div>
                      <div style={{marginTop:5,height:4,background:T.b1,borderRadius:2,overflow:"hidden"}}>
                        <div style={{width: progress+"%",height:"100%",background: progress >= linkTriggerPct ? T.grn : T.blu, transition:"width .2s"}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Create-task affordance always present at the bottom too */}
              {projectTasks.length > 0 && (
                <div style={{padding:"10px 18px",borderTop:"1px solid "+T.b1}}>
                  <button onClick={()=>setShowCreateTaskFor(true)}
                    style={{width:"100%",background:"transparent",border:"1px dashed "+T.bluM,color:T.blu,borderRadius:6,padding:"7px",fontSize:11.5,fontWeight:700,cursor:"pointer"}}>
                    + Create New Task
                  </button>
                </div>
              )}
            </div>
            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB,gap:8}}>
              <button onClick={()=>setTaskPickerFor(null)} disabled={linking}
                style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor: linking?"default":"pointer"}}>
                Cancel
              </button>
              <button onClick={confirmLinkTask} disabled={linking || !linkSelectedTaskId}
                style={{background: (!linkSelectedTaskId || linking) ? T.t4 : T.blu,color:"white",border:"none",borderRadius:6,padding:"7px 18px",fontSize:12,fontWeight:700,cursor: (!linkSelectedTaskId || linking) ? "default" : "pointer"}}>
                {linking ? "Linking…" : "Link Task"}
              </button>
            </div>
          </div>
        </>);
      })()}

      {/* Create Task modal launched from the link drawer — reuses the same
          PTAddTask form as the Tasks tab. On save → POST /tasks → refetch
          the picker list → auto-select the new task. */}
      {showCreateTaskFor && (
        <PTAddTask
          parent={null}
          allTasks={(projectTasks || []).map(t => ({
            id: t.id, no: t.task_no || "", name: t.title || t.name || "", level: 0,
          }))}
          onClose={()=>setShowCreateTaskFor(false)}
          onSave={createTaskFromPicker}
        />
      )}

      {/* ── DRAWER: Item Picker (Payment Schedule item-wise) ─────────
          Side-slide panel with items grouped by section › category,
          searchable, multi-select with pick-order numbered badges
          (matches Library Add Item drawer UX). On Add Selected, items
          land in msForm.pickedItemIds + each gets a default stage row. */}
      {itemPickerOpen && estDetail && (() => {
        const q = itemPickerSearch.trim().toLowerCase();
        // Build groups: section title → category name → items
        const sections = (estDetail.sections || []).map(sec => {
          // Parse items into category groups using the [Category] prefix
          // convention (same as BOQ tab render).
          const catMap = {};
          const catOrder = [];
          for (const it of (sec.items || [])) {
            const m = /^\[([^\]]+)\]\s*(.*)$/.exec(it.description || "");
            const catName = m ? m[1] : "";
            const cleanDesc = m ? m[2] : (it.description || "");
            if (!catMap[catName]) { catMap[catName] = []; catOrder.push(catName); }
            // Apply search filter at item level
            if (q && !cleanDesc.toLowerCase().includes(q) && !catName.toLowerCase().includes(q) && !sec.title.toLowerCase().includes(q)) continue;
            catMap[catName].push({ ...it, _cleanDesc: cleanDesc, _catName: catName });
          }
          return { title: sec.title, catOrder, catMap };
        }).filter(s => s.catOrder.some(c => s.catMap[c].length > 0));
        const totalFiltered = sections.reduce((n, s) => n + s.catOrder.reduce((nn, c) => nn + s.catMap[c].length, 0), 0);
        const togglePick = (itemId) => {
          setMsForm(p => {
            const isPicked = p.pickedItemIds.includes(itemId);
            if (isPicked) {
              return {
                ...p,
                pickedItemIds: p.pickedItemIds.filter(id => id !== itemId),
                itemStages: Object.fromEntries(Object.entries(p.itemStages).filter(([k]) => parseInt(k) !== itemId)),
              };
            }
            return {
              ...p,
              pickedItemIds: [...p.pickedItemIds, itemId],
              itemStages: { ...p.itemStages, [itemId]: p.itemStages[itemId] || [{ seq:0, name:"", cum_rate:"" }] },
              expandedItemId: p.expandedItemId || itemId,  // auto-expand first pick
            };
          });
        };
        return (<>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:320}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:440,maxWidth:"95vw",background:"white",boxShadow:"-8px 0 24px rgba(0,0,0,0.2)",zIndex:321,display:"flex",flexDirection:"column"}}>
            {/* Header */}
            <div style={{padding:"14px 18px",background:T.t1,color:"white",flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <div style={{fontSize:14,fontWeight:700}}>Pick Items for Schedule</div>
                <button onClick={()=>setItemPickerOpen(false)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.65)",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
              </div>
              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.55)"}}>
                {selEst.estimate_no} · {totalFiltered} item{totalFiltered === 1 ? "" : "s"}
                {msForm.pickedItemIds.length > 0 && <> · <span style={{color:"#FCD34D",fontWeight:600}}>{msForm.pickedItemIds.length} picked</span></>}
              </div>
            </div>
            {/* Search */}
            <div style={{padding:"10px 18px",borderBottom:"1px solid "+T.b1,flexShrink:0}}>
              <input value={itemPickerSearch} onChange={e=>setItemPickerSearch(e.target.value)}
                placeholder="Search items by name or category…" autoFocus
                style={{width:"100%",padding:"7px 11px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            {/* List */}
            <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
              {sections.length === 0 && (
                <div style={{padding:"40px 20px",textAlign:"center",color:T.t4,fontSize:12.5}}>
                  No items match "{itemPickerSearch}"
                </div>
              )}
              {sections.map((sec) => (
                <div key={sec.title} style={{marginBottom:4}}>
                  {/* Section header */}
                  <div style={{padding:"6px 18px",background:T.bluL,borderTop:"1px solid "+T.bluM,borderBottom:"1px solid "+T.bluM,fontSize:10,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".5px"}}>
                    {sec.title} · {sec.catOrder.reduce((n,c)=>n+sec.catMap[c].length,0)}
                  </div>
                  {sec.catOrder.map(catName => {
                    const items = sec.catMap[catName] || [];
                    if (items.length === 0) return null;
                    return (
                      <React.Fragment key={catName || "__none__"}>
                        {catName && (
                          <div style={{padding:"4px 18px 4px 24px",background:"#F8FAFC",fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".3px"}}>
                            {catName} · {items.length}
                          </div>
                        )}
                        {items.map(it => {
                          const pickIdx = msForm.pickedItemIds.indexOf(it.id);
                          const isPicked = pickIdx >= 0;
                          return (
                            <div key={it.id} onClick={()=>togglePick(it.id)}
                              style={{padding:"8px 18px",borderBottom:"1px solid "+T.b1,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background: isPicked ? "#EFF6FF" : "white"}}
                              onMouseEnter={e=>{ if(!isPicked) e.currentTarget.style.background="#F8FAFC"; }}
                              onMouseLeave={e=>{ if(!isPicked) e.currentTarget.style.background="white"; }}>
                              {/* Checkbox / pick-order badge */}
                              {isPicked ? (
                                <span style={{width:22,height:22,borderRadius:"50%",background:T.blu,color:"white",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                  {pickIdx + 1}
                                </span>
                              ) : (
                                <span style={{width:22,height:22,borderRadius:4,border:"1.5px solid "+T.b1,flexShrink:0}}/>
                              )}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12.5,fontWeight:600,color:T.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                  {it._cleanDesc}
                                  {it.library_item_id && <span style={{marginLeft:5,fontSize:11}}>📚</span>}
                                </div>
                                <div style={{fontSize:10,color:T.t4,marginTop:1}}>
                                  {fmtC(it.rate)}/{it.unit}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
            </div>
            {/* Footer */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.surfaceB}}>
              <button onClick={()=>setItemPickerOpen(false)}
                style={{background:"white",border:"1px solid "+T.b1,color:T.t2,borderRadius:6,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                Done
              </button>
              <span style={{fontSize:11.5,color:T.t3}}>
                {msForm.pickedItemIds.length} item{msForm.pickedItemIds.length === 1 ? "" : "s"} selected
              </span>
            </div>
          </div>
        </>);
      })()}

      {/* ── MODAL: Library Picker ────────────────────────────────
          Pick a library item to populate an estimate row. City+package
          chips drive the effective rate; base_rate is used when no city
          context is selected.
      */}
      {libPicker && (<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:310}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:760,maxWidth:"95vw",maxHeight:"90vh",background:T.surface,borderRadius:12,zIndex:311,boxShadow:"0 24px 64px rgba(0,0,0,0.3)",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:T.t1}}>Pick from Client BOQ Library</div>
            <button onClick={()=>setLibPicker(null)} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
          </div>
          <div style={{padding:"12px 18px",borderBottom:"1px solid "+T.b1,background:T.surfaceB}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:700,color:T.t3,alignSelf:"center"}}>CITY:</span>
              {libCities.map(c => (
                <button key={c.id} onClick={()=>setLibFilterCity(libFilterCity?.id===c.id?null:c)}
                  style={{padding:"4px 10px",borderRadius:5,border:"1px solid "+(libFilterCity?.id===c.id?"#0891B2":T.b1),background:libFilterCity?.id===c.id?"#0891B2":T.surface,color:libFilterCity?.id===c.id?"white":T.t2,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  {c.name}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
              <span style={{fontSize:10,fontWeight:700,color:T.t3,alignSelf:"center"}}>PACKAGE:</span>
              {libPackages.map(p => (
                <button key={p.id} onClick={()=>setLibFilterPkg(libFilterPkg?.id===p.id?null:p)}
                  style={{padding:"4px 10px",borderRadius:5,border:"1px solid "+(libFilterPkg?.id===p.id?T.pur:T.b1),background:libFilterPkg?.id===p.id?T.pur:T.surface,color:libFilterPkg?.id===p.id?"white":T.t2,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  {p.name} {p.sqft_rate>0?"· ₹"+p.sqft_rate+"/sqft":""} <span style={{opacity:0.7,marginLeft:4}}>({libConTypeName(p)})</span>
                </button>
              ))}
            </div>
            <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="🔍 Search items by name / description"
              style={{...inpS,marginTop:4}}/>
            {(!libFilterCity || !libFilterPkg) && (
              <div style={{marginTop:6,fontSize:10.5,color:T.amb}}>Pick a city + package to see city-specific rates. Without them, base rates are shown.</div>
            )}
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            {libItems
              .filter(it => !libSearch || (it.name+" "+(it.description||"")).toLowerCase().includes(libSearch.toLowerCase()))
              .map(it => {
                const rate = libEffectiveRate(it);
                const stages = parseInt(it.stage_count || 0);
                return (
                  <div key={it.id} onClick={()=>pickLibraryItem(it)}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bluL}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 130px",gap:10,padding:"10px 18px",borderBottom:"1px solid "+T.b1,cursor:"pointer",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{it.name}</div>
                      {it.description && <div style={{fontSize:11,color:T.t4,marginTop:2}}>{it.description}</div>}
                      <div style={{fontSize:10,color:T.t4,marginTop:3}}>
                        <span style={{background:T.purL,color:T.pur,padding:"1px 5px",borderRadius:3,fontWeight:600}}>{it.category || "—"}</span>
                        {stages > 0 && <span style={{marginLeft:6,background:T.grnL,color:T.grn,padding:"1px 5px",borderRadius:3,fontWeight:600}}>{stages} stages</span>}
                      </div>
                    </div>
                    <span style={{fontSize:11.5,color:T.t3}}>{it.unit}</span>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.blu,fontVariantNumeric:"tabular-nums"}}>₹{rate.toLocaleString("en-IN")}</div>
                      {libFilterCity && libFilterPkg && (
                        <div style={{fontSize:9,color:T.t4,marginTop:1}}>{libFilterCity.name} · {libConTypeName(libFilterPkg)}</div>
                      )}
                    </div>
                    <button style={{padding:"6px 12px",background:T.blu,color:"white",border:"none",borderRadius:5,fontSize:11,fontWeight:700,cursor:"pointer"}}>Pick →</button>
                  </div>
                );
              })}
            {libItems.length === 0 && <div style={{textAlign:"center",padding:"40px",color:T.t4,fontSize:13}}>No library items. Add some in Master Library → Client BOQ Rate.</div>}
          </div>
        </div>
      </>)}

      {/* ── MODAL: Record Payment ───────────────────────────────── */}
      {showPay && (<>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:480,maxWidth:"95vw",background:T.surface,borderRadius:12,zIndex:301,boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
          <div style={{padding:"14px 18px",borderBottom:"1px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:700,color:T.t1}}>Record Payment</div>
            <button onClick={()=>setShowPay(null)} style={{background:"none",border:"none",fontSize:18,color:T.t3,cursor:"pointer"}}>×</button>
          </div>
          <div style={{padding:"16px 18px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
              <div><label style={lblS}>Amount</label><input type="number" value={payForm.amount_received} onChange={e=>setPayForm(p=>({...p,amount_received:e.target.value}))} style={inpS}/></div>
              <div><label style={lblS}>Date</label><input type="date" value={payForm.payment_date} onChange={e=>setPayForm(p=>({...p,payment_date:e.target.value}))} style={inpS}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
              <div><label style={lblS}>Mode</label>
                <select value={payForm.payment_mode} onChange={e=>setPayForm(p=>({...p,payment_mode:e.target.value}))} style={inpS}>
                  <option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>UPI</option><option>Credit Card</option>
                </select>
              </div>
              <div><label style={lblS}>Reference #</label><input value={payForm.reference_no} onChange={e=>setPayForm(p=>({...p,reference_no:e.target.value}))} style={inpS}/></div>
            </div>
            <div><label style={lblS}>Remark</label><input value={payForm.remark} onChange={e=>setPayForm(p=>({...p,remark:e.target.value}))} style={inpS}/></div>
          </div>
          <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,display:"flex",justifyContent:"flex-end",gap:8}}>
            <button onClick={()=>setShowPay(null)} style={{padding:"7px 16px",borderRadius:6,background:T.surfaceB,border:"1px solid "+T.b1,color:T.t2,fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={submitPayment} disabled={saving} style={{padding:"7px 18px",borderRadius:6,background:saving?T.t4:T.grn,color:"white",border:"none",fontSize:12,fontWeight:700,cursor:saving?"default":"pointer"}}>{saving?"Saving…":"Record"}</button>
          </div>
        </div>
      </>)}
    </div>
  );
}

export default TabEstimate;
