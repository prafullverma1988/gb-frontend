import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../config/api";
import apiCache from "../../utils/apiCache";
import uploadManager from "../../utils/uploadManager";
import LibrarySelect from "../../components/LibrarySelect";
import MaterialFlowDrawer from "../../components/MaterialFlowDrawer";
import MRDetailDrawer from "../../components/MRDetailDrawer";
import MaterialTransferTab from "../../components/MaterialTransferTab";
import MaterialLedgerDrawer from "../../components/MaterialLedgerDrawer";
import GrnReceive from "../../components/grn/GrnReceive";
import WeighbridgePanel from "../../components/grn/WeighbridgePanel";
import { loadPhotoPolicy, policyFor } from "../../utils/photoPolicy";
import { T, fmtN, STAGES, STAGE_S } from "../shared/tokens";
import { Pill, Panel, THead } from "../shared/ui";
import { t } from "../../i18n";

// Dual-unit billing toggle ab components/grn/DualUnitToggle.js me hai —
// site aur godown dono ke GRN me wahi switch chalta hai.

// One MR → Requests-card mapper. This used to be copy-pasted in three places
// (initial load + two post-save reloads), and all three put the ORDERED
// quantity under a plain "Received" pill — so an MR ordered 100 with only 40
// arrived showed "100 CFT · Received". A partially received MR now shows
// "received / ordered" plus a Partial % badge, the same way Procurement does.
function toMrCard(m) {
  const ordered   = parseFloat(m.quantity) || 0;
  const received  = parseFloat(m.received_qty) || 0;
  const unit      = m.unit || "";
  const isPartial = m.mat_status === "PartialReceived";
  return {
    id: m.id, name: m.item_name,
    qty: isPartial ? `${received} / ${ordered} ${unit}` : `${ordered} ${unit}`,
    partialPct: isPartial && ordered > 0 ? Math.round((received / ordered) * 100) : null,
    stage: m.stage || "Requested",
    by: m.requested_by || "Site Team",
    date: m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—",
    vendor: m.linked_vendor || null,
    amt: parseFloat(m.approx_amount) || 0,
  };
}

function TabMaterial({ project }) {
  const projectId   = project?.id || 1;
  const projectName = project?.name || "Project";

  // Current logged-in user (for owner-only delete on used entries)
  const meUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const meId = Number(meUser?.id) || null;
  const meIsPriv = ["admin","super_admin","project_manager"].includes((meUser?.role || "").toLowerCase());
  const canDeleteUsed = (createdById) => meIsPriv || (createdById != null && Number(createdById) === meId);

  // ── Tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("requests"); // requests | ledger | inventory

  // ── Requests tab state (existing) ──────────────────────────
  const [materials, setMaterials] = useState([]);
  const [fStage, setFStage] = useState("All");
  const [fMaterial, setFMaterial] = useState("All");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("tile");
  const [showModal, setShowModal] = useState(false);
  const [showAddMat, setShowAddMat] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("Nos");
  const [newMatSaving, setNewMatSaving] = useState(false);
  const [showGRN, setShowGRN] = useState(false);
  const [saving, setSaving] = useState(false);
  const mrSubmitRef = useRef(false);
  // Multi-item MR — each row is a separate material+qty+amount.
  // required_date / notes / photos are shared across the whole batch.
  const [form, setForm] = useState({
    items: [{ item_name:"", quantity:"", unit:"Bags", approx_amount:"" }],
    required_date:"", notes:"", photos: [],
  });
  // Duplicate-MR pipeline check — when user picks a material, query if the
  // same item is already in-flight for THIS project (Pending / Approved /
  // Ordered / Partial). Warning UI sits under the row; submit requires an
  // explicit force-confirm if hits exist.
  const [mrPipelineByIdx, setMrPipelineByIdx] = useState({});
  const checkMrPipeline = async (idx, matName) => {
    if (!matName) {
      setMrPipelineByIdx(p => { const n = {...p}; delete n[idx]; return n; });
      return;
    }
    try {
      const r = await api.get(`/warehouse/mr-pipeline-check?type=project&project_id=${projectId}&name=${encodeURIComponent(matName)}`);
      if (r?.success && r.data?.in_pipeline) setMrPipelineByIdx(p => ({...p,[idx]:r.data}));
      else setMrPipelineByIdx(p => { const n = {...p}; delete n[idx]; return n; });
    } catch (_) {}
  };
  const [showAddLib, setShowAddLib] = useState(false);
  const [libNewName, setLibNewName] = useState("");
  const [libNewUnit, setLibNewUnit] = useState("Nos");
  const [libSaving, setLibSaving] = useState(false);
  // Auto-focus the LibrarySelect on the freshly-added row so user can
  // start typing the next material name without reaching for the mouse.
  const itemRowRefs = useRef([]);
  const addItemRow = () => {
    setForm(p => {
      const next = [...p.items, { item_name:"", quantity:"", unit:"Bags", approx_amount:"" }];
      setTimeout(() => {
        const el = itemRowRefs.current[next.length - 1];
        if (el && typeof el.focus === "function") el.focus();
      }, 0);
      return { ...p, items: next };
    });
  };
  const removeItemRow = (idx) => setForm(p => ({ ...p, items: p.items.length > 1 ? p.items.filter((_,i)=>i!==idx) : p.items }));
  const updItem = (idx, patch) => setForm(p => ({ ...p, items: p.items.map((it,i)=> i===idx ? { ...it, ...patch } : it) }));
  const saveLibMaterial = async () => {
    const name = (libNewName||"").trim();
    if (!name) return;
    setLibSaving(true);
    try {
      const r = await api.post("/library/materials", { name, unit: libNewUnit || "Nos" });
      if (r?.success) {
        const m = r.data || { id: Date.now(), name, unit: libNewUnit };
        setMatLibReal(prev => [...prev, m].sort((a,b)=>(a.name||"").localeCompare(b.name||"")));
        // The <LibrarySelect type="material"> picker keeps its OWN module-level
        // cache — pushing to matLibReal isn't enough, the picker won't see the
        // new material and shows "No match found". Refresh its cache so the
        // freshly-added material is immediately pickable in the item rows.
        try { await LibrarySelect.refresh("material"); } catch(_) {}
        setLibNewName("");
        setLibNewUnit("Nos");
        setShowAddLib(false);
      } else {
        window.alert(r?.message || "Failed to add to library");
      }
    } catch (e) { window.alert(e?.message || "Network error"); }
    setLibSaving(false);
  };
  const [grnTab, setGrnTab] = useState("ordered");
  // GRN ka form (ordered + direct) ab components/grn/GrnReceive.js me hai —
  // site aur godown ek hi form. Yahan sirf drawer ko jo chahiye wo bacha.
  const grnRef = useRef(null);
  const [orderedCount, setOrderedCount] = useState(0);
  const [grnDoneCount, setGrnDoneCount] = useState(0);
  const [grnPhotos, setGrnPhotos] = useState([]);
  // Company ki photo policy (Settings → Photo Settings). Is tab me teen
  // alag jagah photo lagti hai aur teeno ki apni setting hai:
  //   grn               — vendor se maal receive
  //   material_issue    — warehouse se aaya maal receive
  //   material_transfer — doosri site se aaya maal receive
  const [photoPol, setPhotoPol] = useState(null);
  useEffect(() => { loadPhotoPolicy().then(setPhotoPol); }, []);
  const polFor = (key) => policyFor(photoPol, key);
  // Photo ka box GRN/issue/transfer teeno ke liye ek hi hai, isliye uska
  // "required" nishaan sabse sakht setting par chalta hai — jo bhi flow
  // abhi khula ho, user ko pehle hi pata chal jaata hai ki photo maangi
  // jaayegi, submit par 400 khaane ke baad nahi.
  const grnPhotoRequired = ["grn", "material_issue", "material_transfer"]
    .some(k => polFor(k).mode === "required");
  const grnPhotoCameraOnly = ["grn", "material_issue", "material_transfer"]
    .some(k => polFor(k).source === "camera");
  // Submit se pehle ki rok. true = ruk jao. Server par bhi wahi check hai
  // (utils/photoPolicy.js) — yahan sirf isliye ki user ko form bharne ke
  // baad 400 na mile.
  const photoBlocked = (key, label) => {
    if (polFor(key).mode !== "required" || grnPhotos.length > 0) return false;
    alert(t("material.company_setting_label_ke_saath_kam", { label }));
    return true;
  };
  // (Add-new-vendor flow now handled inside <LibrarySelect type="supplier"/>)
  const [grnSaving, setGrnSaving] = useState(false);
  const [directGrns, setDirectGrns] = useState([]); // Direct GRNs without MR
  const [usedLog, setUsedLog] = useState([]);
  const [usedLogLoading, setUsedLogLoading] = useState(false);
  const [showUsedLog, setShowUsedLog] = useState(false);
  const [ulFilterMat, setUlFilterMat] = useState("");
  const [ulFilterTask, setUlFilterTask] = useState("");
  const [ulFilterBy, setUlFilterBy] = useState("");
  const [ulFilterFrom, setUlFilterFrom] = useState("");
  const [ulFilterTo, setUlFilterTo] = useState("");
  const [invExpandedMat, setInvExpandedMat] = useState(null);
  const [invUsedForm, setInvUsedForm] = useState({});
  const [invUsedSaving, setInvUsedSaving] = useState(false);
  const UNITS_MR = ["Bags","MT","Nos","Loads","Sqft","Mtrs","Kg","Sheets","Ltrs","Cu.m","Ton","RFT","Brass"];
  const [matLibReal, setMatLibReal] = useState([]);

  // ── Ledger tab state ────────────────────────────────────────
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [expandedMat, setExpandedMat] = useState(null);
  // Material Inventory accordion — per-material row filter + inline Mark-Used
  const [ledgerRowFilter, setLedgerRowFilter] = useState("all"); // all | grn | used
  const [ledgerMarkUsedFor, setLedgerMarkUsedFor] = useState(null); // material_name being marked-used
  // Material clicked → opens the side ledger drawer (GRN / Used / MR tabs)
  const [ledgerDrawerMat, setLedgerDrawerMat] = useState(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  // Flow drawer state — opens when user clicks a GRN row in Material Ledger
  const [flowGrnId, setFlowGrnId] = useState(null);
  const [flowEditMR, setFlowEditMR] = useState(null);
  const [ledgerVendor, setLedgerVendor] = useState("All");

  // ── Inventory tab state ─────────────────────────────────────
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invLoaded, setInvLoaded] = useState(false);

  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—";
  const fmtN = n => n >= 10000000 ? (n/10000000).toFixed(1)+"Cr" : n >= 100000 ? (n/100000).toFixed(1)+"L" : n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n||0);

  useEffect(() => {
    api.get("/library/materials").then(r => {
      if (r.success && r.data?.length > 0) setMatLibReal(r.data);
    }).catch(() => {});
  }, [projectId]);

  const loadMRs = () => {
    // Fetch both MRs and direct GRNs (no linked MR) in parallel
    Promise.all([
      api.get("/procurement/mrs?project_id=" + projectId),
      api.get("/procurement/grns?project_id=" + projectId),
    ]).then(([mrRes, grnRes]) => {
      const mrEntries = (mrRes.success && Array.isArray(mrRes.data))
        ? mrRes.data.map(toMrCard)
        : [];

      // Build a set of all MR material names BEFORE building direct entries.
      // We use it to decide whether a GRN is *truly* direct (= walk-in receipt
      // with no MR ever filed for it) vs a procurement-flow receipt that just
      // happens to be saved without po_id / linked_mr_id.
      const norm = s => (s || "").toString().trim().toLowerCase();
      const allMrMaterials = new Set(mrEntries.map(m => norm(m.name)));

      // GRNs without PO/MR link → either Direct receipts OR Auto-Bill (synthesized
       // when finance team added an extra material row inside a bill). Both should
       // surface in the Requests view as Received items, with different badges so
       // the user can tell where a material came from.
      const directEntries = [];
      if (grnRes.success && Array.isArray(grnRes.data)) {
        grnRes.data
          .filter(g => !g.po_id && !g.linked_mr_id)
          .forEach(g => {
            (g.items || []).forEach((item, i) => {
              const matName = item.description || item.item_name || "Material";
              const hasMatchingMr = allMrMaterials.has(norm(matName));
              const isAutoBill = g.grn_type === "Auto-Bill";
              directEntries.push({
                id: (isAutoBill ? "ab-" : "d-") + g.id + "-" + i,
                name: matName,
                qty: (Number.isInteger(Number(item.received_qty)) ? Number(item.received_qty) : parseFloat(item.received_qty||0)) + " " + (item.unit || ""),
                stage: "Received",
                by: g.received_by || (isAutoBill ? "Finance" : "Site"),
                date: g.received_date ? new Date(g.received_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}) : "—",
                vendor: g.vendor_name || null,
                // Value of what was received. GRN lines carry rate/amount for
                // priced receipts (site-expense purchase, direct warehouse receipt);
                // procurement GRNs that only record quantity stay 0.
                amt: Number(item.amount) || (Number(item.rate) || 0) * (Number(item.received_qty) || 0),
                // "Direct" badge: only when NO MR exists for this material AND not an Auto-Bill.
                // Auto-Bill rows get a separate "via Bill" badge below.
                isDirect: !hasMatchingMr && !isAutoBill,
                isViaBill: isAutoBill,
                challan: g.challan_no,
                grn_number: g.grn_number,
                _autoBillGrnId: isAutoBill ? g.id : null,
              });
            });
          });
      }

      // Dedupe: if a Direct GRN exists for the same material (case-insensitive)
      // AND an MR for the same material is sitting in "Received" status, drop
      // the MR card. The GRN card represents the actual receipt — keeping both
      // makes it look like the same delivery happened twice (user reported
      // Distemper showing twice while Inventory was correct).
      const receivedDirectMaterials = new Set(
        directEntries.map(d => norm(d.name))
      );
      const dedupedMrEntries = mrEntries.filter(m => {
        const isReceivedStage = norm(m.stage) === "received";
        if (!isReceivedStage) return true;            // pending / approved / ordered → keep
        return !receivedDirectMaterials.has(norm(m.name));
      });

      setMaterials([...directEntries, ...dedupedMrEntries]);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!projectId) return;
    loadMRs();
  }, [projectId]);

  // Project switch — TabMaterial does NOT re-mount, it just gets a new
  // `project` prop, so all material state stays stale. Wipe it whenever
  // projectId changes so the load effect below re-fetches for the new
  // project instead of showing the previous one's ledger.
  useEffect(() => {
    setLedger([]); setLedgerLoaded(false); setLedgerLoading(false);
    setInventory([]); setInvLoaded(false); setInvLoading(false);
    setExpandedMat(null); setLedgerDrawerMat(null);
    setLedgerSearch(""); setLedgerVendor("All");
  }, [projectId]);

  // Load ledger on tab switch / project switch. projectId + the loaded
  // flags are in the deps so a freshly-reset state (after project switch)
  // triggers a re-fetch.
  useEffect(() => {
    if (activeTab === "ledger" && !ledgerLoaded && projectId) {
      setLedgerLoading(true);
      api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
        if (r.success) setLedger(r.data || []);
        setLedgerLoaded(true);
        setLedgerLoading(false);
      }).catch(() => setLedgerLoading(false));
    }
    if (activeTab === "inventory" && !invLoaded && projectId) {
      setInvLoading(true);
      api.get("/tasks/project/" + projectId + "/inventory").then(r => {
        if (r.success) setInventory(r.data || []);
        setInvLoaded(true);
        setInvLoading(false);
      }).catch(() => setInvLoading(false));
    }
  }, [activeTab, projectId, ledgerLoaded, invLoaded]);

  // Pending incoming transfers TO this project (warehouse → site receive flow)
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [trReceiveDone, setTrReceiveDone] = useState([]);
  const [trReceiveQty, setTrReceiveQty] = useState({});
  const [trReceiving, setTrReceiving] = useState(false);
  // Pending issues from warehouse TO this project
  const [pendingIssues, setPendingIssues] = useState([]);
  const [issueReceiveDone, setIssueReceiveDone] = useState([]);
  const [issueReceiveQty, setIssueReceiveQty] = useState({});
  const [issueReceiving, setIssueReceiving] = useState(false);

  const loadPendingTransfers = useCallback(() => {
    if (!projectId) return;
    api.get(`/warehouse/transfers?status=Pending&to_project_id=${projectId}`).then(r => {
      if (r.success) setPendingTransfers(r.data || []);
    }).catch(()=>{});
    api.get(`/warehouse/transfers?status=Partial&to_project_id=${projectId}`).then(r => {
      if (r.success) setPendingTransfers(prev => {
        const ids = new Set(prev.map(t=>t.id));
        return [...prev, ...(r.data||[]).filter(t=>!ids.has(t.id))];
      });
    }).catch(()=>{});
  }, [projectId]);

  const loadPendingIssues = useCallback(() => {
    if (!projectId) return;
    api.get(`/warehouse/issues?status=Pending&project_id=${projectId}`).then(r => {
      if (r.success) setPendingIssues(r.data || []);
    }).catch(()=>{});
    api.get(`/warehouse/issues?status=Partial&project_id=${projectId}`).then(r => {
      if (r.success) setPendingIssues(prev => {
        const ids = new Set(prev.map(i=>i.id));
        return [...prev, ...(r.data||[]).filter(i=>!ids.has(i.id))];
      });
    }).catch(()=>{});
  }, [projectId]);

  useEffect(() => {
    if (!showGRN || !projectId) return;
    // Ordered MR ab GrnReceive khud laata hai (components/grn/grnData.js).
    loadPendingTransfers();
    loadPendingIssues();
    setTrReceiveDone([]);
    setTrReceiveQty({});
    setIssueReceiveDone([]);
    setIssueReceiveQty({});
  }, [showGRN, projectId, loadPendingTransfers, loadPendingIssues]);

  const handleReceiveTransfer = async (tr) => {
    if (photoBlocked("material_transfer", "Stock transfer receive")) return;
    setTrReceiving(true);
    try {
      const items = (tr.items || []).map(it => ({
        id: it.id,
        received_qty: Number(trReceiveQty[`${tr.id}_${it.id}`] ?? it.qty) || 0,
      }));
      const res = await api.post(`/warehouse/transfers/${tr.id}/receive`, { items, photo_urls: grnPhotos.length ? grnPhotos : null });
      if (res.success) {
        setTrReceiveDone(p => [...p, tr.id]);
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
        }).catch(()=>{});
      } else {
        alert(res.message || "Receive failed");
      }
    } catch (e) { alert(e.message); }
    setTrReceiving(false);
  };

  const handleReceiveIssue = async (iss) => {
    if (photoBlocked("material_issue", "Material issue receive")) return;
    setIssueReceiving(true);
    try {
      const items = (iss.items || []).map(it => ({
        id: it.id,
        received_qty: Number(issueReceiveQty[`${iss.id}_${it.id}`] ?? it.qty) || 0,
      }));
      const res = await api.post(`/warehouse/issues/${iss.id}/receive`, { items, photo_urls: grnPhotos.length ? grnPhotos : null });
      if (res.success) {
        setIssueReceiveDone(p => [...p, iss.id]);
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
        }).catch(()=>{});
      } else {
        alert(res.message || "Receive failed");
      }
    } catch (e) { alert(e.message); }
    setIssueReceiving(false);
  };

  // GRN save hone ke baad — ledger, requests, aur direct par inventory bhi.
  // Receive ka kaam ab components/grn/GrnReceive.js karta hai.
  const handleGrnReceived = (info) => {
    api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
      if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
    }).catch(() => {});
    api.get("/procurement/mrs?project_id=" + projectId).then(res2 => {
      if (res2.success && Array.isArray(res2.data)) setMaterials(res2.data.map(toMrCard));
    }).catch(() => {});
    if (info && info.mode === "direct") {
      setShowGRN(false);
      loadMRs();
      setInvLoading(true);
      api.get("/tasks/project/" + projectId + "/inventory").then(r => {
        if (r.success) setInventory(r.data || []);
        setInvLoaded(true);
        setInvLoading(false);
      }).catch(() => setInvLoading(false));
    }
  };

  const handleSubmitMR = async () => {
    if (mrSubmitRef.current) return; // hard guard against double-fire
    // Validate at least one filled row
    const validItems = (form.items || []).filter(it => it.item_name?.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      alert(t("material.at_least_one_material_with_quantity"));
      return;
    }
    // Pipeline-duplicate force confirm — if any picked material is
    // already in-flight for this project, list them and require an
    // explicit Continue. Cancel = abort.
    const pipeHits = Object.values(mrPipelineByIdx).filter(p => p && p.in_pipeline);
    if (pipeHits.length > 0) {
      const lines = pipeHits.flatMap(h => h.entries.map(e => `  • ${e.mr_no} — ${e.status} — ${e.pending_qty} ${e.unit||""}`));
      const ok = await window.confirmAsync(
        `⚠ Iss project me ye material(s) already pipeline me hai:\n\n${lines.join("\n")}\n\nFir bhi naya MR raise karna hai? (Continue = force, Cancel = wait)`
      );
      if (!ok) return;
    }
    mrSubmitRef.current = true;
    setSaving(true);
    try {
      // Each row creates its own MR. Sequential so we get a stable order
      // and a single rejection doesn't lose the rest.
      const newMaterialRows = [];
      for (const it of validItems) {
        const res = await api.post("/procurement/mrs", {
          project_id: projectId, project_name: projectName,
          item_name: it.item_name.trim(),
          quantity: parseFloat(it.quantity),
          unit: it.unit || "Nos",
          required_date: form.required_date || null,
          approx_amount: it.approx_amount ? parseFloat(it.approx_amount) : null,
          notes: form.notes || null,
          photo_urls: form.photos && form.photos.length ? form.photos : null,
        });
        if (res?.success) {
          api.post("/approvals/submit", {
            module: "Material Request",
            ref_id: res.data.id,
            ref_no: res.data.mr_number || "",
            title: it.item_name + " (" + it.quantity + " " + (it.unit||"Nos") + ")",
            amount: Number(it.approx_amount) || 0,
            project_id: projectId,
            project_name: projectName || "",
          }).catch(e => console.error("Approval submit:", e));
          const m = res.data;
          newMaterialRows.push({
            id:m.id, name:m.item_name, qty:m.quantity+" "+m.unit,
            stage:"Requested", by: m.requested_by || "—",
            date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}),
            vendor:null, amt:parseFloat(m.approx_amount)||0,
          });
        }
      }
      if (newMaterialRows.length > 0) {
        setMaterials(prev => [...newMaterialRows, ...prev]);
        setForm({
          items: [{ item_name:"", quantity:"", unit:"Bags", approx_amount:"" }],
          required_date:"", notes:"", photos: [],
        });
        setShowModal(false);
        // One refresh after the whole batch — pre-warm the badge once.
        apiCache.refreshApprovals();
      }
    } catch(e) { alert("Error: " + e.message); }
    finally { setSaving(false); mrSubmitRef.current = false; }
  };

  const MATERIAL_NAMES = ["All", ...[...new Set(materials.map(m => m.name))]];
  const filtered = materials.filter(m => {
    if (fStage !== "All" && m.stage !== fStage) return false;
    if (fMaterial !== "All" && m.name !== fMaterial) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const stageData = STAGES.map(s => ({ stage:s, ...STAGE_S[s], count: materials.filter(m=>m.stage===s).length }));
  const totalAmt = filtered.reduce((s,m) => s + (m.amt||0), 0);

  // Ledger filtered
  const allVendors = ["All", ...new Set(ledger.flatMap(m => m.receipts.map(r => r.vendor_name)).filter(v => v && v !== "—"))];
  const ledgerFiltered = ledger.filter(m => {
    if (ledgerSearch && !m.material_name.toLowerCase().includes(ledgerSearch.toLowerCase())) return false;
    if (ledgerVendor !== "All" && !m.receipts.some(r => r.vendor_name === ledgerVendor)) return false;
    return true;
  });

  // Inventory tab merged into Material Inventory — the ledger accordion
  // already shows per-material Received/Used/Balance + GRN/Used entries,
  // plus an inline Mark-Used form. Separate Inventory tab dropped.
  const TABS = [{id:"requests",l:t("common.requests")},{id:"ledger",l:t("material.material_inventory")},{id:"transfer",l:t("projects.transfer")}];

  return (
    <div style={{padding:"14px 18px"}}>

      {/* ── TAB SWITCHER ── */}
      <div style={{display:"flex",gap:0,marginBottom:16,borderBottom:"2px solid "+T.b1}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"9px 16px",border:"none",background:"none",fontSize:13,fontWeight:activeTab===t.id?700:400,
              color:activeTab===t.id?T.blu:T.t3,borderBottom:activeTab===t.id?"2px solid "+T.blu:"2px solid transparent",
              cursor:"pointer",marginBottom:-2,transition:"all .15s"}}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: REQUESTS (existing UI — unchanged)
      ══════════════════════════════════════════════════════ */}
      {activeTab==="requests"&&(<>

        {/* NEW REQUEST — side-slide drawer */}
        {showModal && (<>
          <style>{`@keyframes mrSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.42)",zIndex:400,backdropFilter:"blur(3px)"}}/>
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(560px,96vw)",background:T.bg,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.22)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"mrSlideIn .22s ease-out"}}>

            {/* ── Header ─────────────────────────────────────────── */}
            <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"white",letterSpacing:"-.2px"}}>{t("material.new_material_request")}</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.42)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{projectName}</div>
              </div>
              <button onClick={()=>setShowAddLib(s=>!s)}
                style={{padding:"5px 11px",borderRadius:6,background:showAddLib?"rgba(168,85,247,0.35)":"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.55)",color:"#C4B5FD",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(168,85,247,0.3)"}
                onMouseLeave={e=>e.currentTarget.style.background=showAddLib?"rgba(168,85,247,0.35)":"rgba(168,85,247,0.15)"}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                {showAddLib ? t("common.cancel") : t("material.library")}
              </button>
              <button onClick={()=>setShowModal(false)}
                style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
                ×
              </button>
            </div>

            {/* ── Workflow info strip ─────────────────────────────── */}
            <div style={{padding:"8px 18px",background:"#FFFBEB",borderBottom:"1px solid #FDE68A",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{fontSize:13}}>📋</span>
              <span style={{fontSize:11.5,color:"#92400E",lineHeight:1.4}}>{t("material.request_admin_approves_purchase_order_received")}</span>
            </div>

            {/* ── Scrollable body ─────────────────────────────────── */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:14}}>

              {/* Add-to-library inline form */}
              {showAddLib && (
                <div style={{padding:"12px 14px",background:T.purL,border:`1.5px solid ${T.purM}`,borderRadius:9}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.pur,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.pur} strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                   {t("procurement.add_new_material_to_library")}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 100px 76px",gap:8,alignItems:"center"}}>
                    <input value={libNewName} onChange={e=>setLibNewName(e.target.value)} placeholder={t("common.material_name")} autoFocus
                      style={{padding:"8px 10px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                    <select value={libNewUnit} onChange={e=>setLibNewUnit(e.target.value)}
                      style={{padding:"8px 9px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box",cursor:"pointer"}}>
                      <option value="">{t("common.unit")}</option>
                      {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                    </select>
                    <button onClick={saveLibMaterial} disabled={!libNewName.trim()||libSaving}
                      style={{padding:"8px 0",borderRadius:6,background:libNewName.trim()?T.pur:T.b1,color:libNewName.trim()?"white":T.t4,border:"none",fontSize:12,fontWeight:700,cursor:libNewName.trim()?"pointer":"not-allowed",fontFamily:"inherit"}}>
                      {libSaving?"…":t("common.save")}
                    </button>
                  </div>
                  <div style={{fontSize:10,color:T.pur,marginTop:6,opacity:.72}}>{t("material.save_hone_ke_baad_item_rows")}</div>
                </div>
              )}

              {/* ── Items table ──────────────────────────────────── */}
              <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                {/* Table header bar */}
                <div style={{background:"#0D1B2A",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:"white"}}>{t("common.items")}</span>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>{t("material.library_se_pick_karein_unit_auto")}</span>
                  </div>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:600,flexShrink:0}}>
                    {form.items.filter(it=>it.item_name?.trim()).length}/{form.items.length} filled
                  </span>
                </div>
                {/* Column labels */}
                <div style={{display:"grid",gridTemplateColumns:"2.2fr 72px 88px 88px 30px",gap:6,padding:"7px 14px",background:"#1B2A3A"}}>
                  {["Material","Qty","Unit","Approx ₹",""].map((h,i)=>(
                    <span key={i} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".5px"}}>{h}</span>
                  ))}
                </div>
                {/* Item rows */}
                {form.items.map((it,idx)=>{
                  const libMatch = matLibReal.find(m => (m.name||"").trim().toLowerCase() === (it.item_name||"").trim().toLowerCase());
                  const isLocked = !!it.item_name;
                  const displayUnit = libMatch?.unit || it.unit || "—";
                  const pipe = mrPipelineByIdx[idx];
                  return (
                    <React.Fragment key={idx}>
                      <div style={{display:"grid",gridTemplateColumns:"2.2fr 72px 88px 88px 30px",gap:6,padding:"8px 14px",alignItems:"center",borderBottom:`1px solid ${T.b1}`,background:idx%2===0?T.surface:T.surfaceB,transition:"background .1s"}}>
                        <LibrarySelect type="material" value={it.item_name}
                          hideAddNew compact
                          inputRef={el=>{ if(el) itemRowRefs.current[idx] = el; }}
                          onChange={v=>{
                            const found = matLibReal.find(m=>m.name===v);
                            updItem(idx, { item_name:v||"", unit: found?.unit || it.unit });
                            checkMrPipeline(idx, v||"");
                          }}
                          placeholder={t("procurement.pick_material")}/>
                        <input type="number" inputMode="decimal" min={0} step="any" value={it.quantity}
                          onKeyDown={e=>{if(e.key==="-"||e.key==="e"||e.key==="E"||e.key==="+") e.preventDefault();}}
                          onChange={e=>{
                            const v=e.target.value;
                            if(v===""){updItem(idx,{quantity:""});return;}
                            const n=parseFloat(v);
                            if(!isNaN(n)&&n>=0) updItem(idx,{quantity:v});
                          }}
                          placeholder="0"
                          style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",textAlign:"right",width:"100%"}}
                          onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                        {isLocked ? (
                          <div title={t("material.unit_material_library_se_aata_hai")}
                            style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t2,background:"#F5F7FA",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:4,justifyContent:"center",cursor:"not-allowed",boxSizing:"border-box"}}>
                            <span style={{fontSize:9,opacity:.5}}>🔒</span>{displayUnit}
                          </div>
                        ) : (
                          <select value={it.unit} onChange={e=>updItem(idx,{unit:e.target.value})}
                            style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer",width:"100%"}}>
                            {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                          </select>
                        )}
                        <input type="number" value={it.approx_amount} onChange={e=>updItem(idx,{approx_amount:e.target.value})} placeholder="0"
                          style={{padding:"7px 8px",borderRadius:6,border:`1.5px solid ${T.b1}`,fontSize:12,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"}}
                          onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
                        <button onClick={()=>{removeItemRow(idx); setMrPipelineByIdx(p=>{const n={...p};delete n[idx];return n;});}} disabled={form.items.length===1}
                          style={{width:26,height:26,borderRadius:6,background:form.items.length===1?"transparent":T.redL,border:`1px solid ${form.items.length===1?T.b1:T.redM}`,cursor:form.items.length===1?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:form.items.length===1?.3:1,flexShrink:0}}>
                          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2.4} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                      {pipe && pipe.in_pipeline && (
                        <div style={{margin:"2px 14px 8px",padding:"7px 11px",borderRadius:6,background:"#FFFBEB",border:`1.5px solid #FDE68A`,fontSize:11,color:"#92400E",lineHeight:1.5}}>
                          <div style={{fontWeight:700,marginBottom:3}}>{t("material.already_in_pipeline_pending")} <b>{pipe.total_pending_qty} {pipe.unit||""}</b></div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {pipe.entries.map((e,k)=>(
                              <span key={k} style={{background:"white",border:`1px solid #FDE68A`,borderRadius:20,padding:"2px 8px",fontSize:10.5,color:T.t2}}>
                                <span style={{color:T.blu,fontFamily:"monospace"}}>{e.mr_no}</span>
                                <span style={{color:T.t4,margin:"0 3px"}}>·</span>{e.status}
                                <span style={{color:T.t4,margin:"0 3px"}}>·</span><b>{e.pending_qty} {e.unit||""}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Add row button */}
                <div style={{padding:"8px 14px",background:T.surfaceB,borderTop:`1px solid ${T.b1}`}}>
                  <button onClick={addItemRow}
                    style={{width:"100%",padding:"8px 12px",borderRadius:7,background:"transparent",border:`1.5px dashed ${T.blu}44`,color:T.blu,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=T.bluL;e.currentTarget.style.borderColor=T.blu;}}
                    onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=`${T.blu}44`;}}>
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                   {t("material.add_another_item")}
                  </button>
                </div>
              </div>

              {/* Required By + Notes — side by side */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>
                   {t("common.required_by")} <span style={{fontSize:9,fontWeight:500,textTransform:"none",color:T.t4}}>{t("material.all_items")}</span>
                  </label>
                  <input type="date" value={form.required_date} onChange={e=>setForm(p=>({...p,required_date:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>{t("common.notes")}</label>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={1} placeholder={t("material.special_requirements")}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none",minHeight:38}}/>
                </div>
              </div>

              {/* Photos */}
              <div>
                <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:7}}>
                 {t("common.photos")} <span style={{fontSize:9,fontWeight:500,textTransform:"none"}}>{t("procurement.optional_2")}</span>
                </label>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                  {(form.photos||[]).map((url,idx)=>(
                    <div key={idx} style={{position:"relative",width:60,height:60,borderRadius:7,overflow:"hidden",border:`1px solid ${T.b1}`}}>
                      <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <button onClick={()=>setForm(p=>({...p,photos:(p.photos||[]).filter((_,i)=>i!==idx)}))}
                        style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.65)",color:"white",border:"none",fontSize:10,cursor:"pointer",padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                  ))}
                  <label style={{width:60,height:60,borderRadius:7,border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexDirection:"column",gap:2,color:T.t3}}>
                    <span style={{fontSize:18}}>📷</span>
                    <span style={{fontSize:10,fontWeight:600}}>{t("common.add")}</span>
                    <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}}
                      onChange={e=>{
                        const files = Array.from(e.target.files||[]);
                        files.forEach(file=>{
                          uploadManager.add({
                            file, folder:"gb_buildcon/mr",
                            label:"MR photo: "+file.name,
                            onDone:(url)=>setForm(p=>({...p,photos:[...(p.photos||[]),url]})),
                          });
                        });
                        e.target.value="";
                      }}/>
                  </label>
                  <span style={{fontSize:10,color:T.t4}}>{t("material.camera_opens_on_mobile_multi_select")}</span>
                </div>{/* end photos flex row */}
              </div>{/* end photos section */}

            </div>{/* end scrollable body */}

            {/* ── Sticky footer ──────────────────────────────────── */}
            <div style={{padding:"12px 18px",borderTop:`1px solid ${T.b1}`,background:T.surface,display:"flex",gap:10,alignItems:"center",flexShrink:0}}>
              {(()=>{
                const validCount = (form.items||[]).filter(it => it.item_name?.trim() && Number(it.quantity) > 0).length;
                const canSubmit = !saving && validCount > 0;
                return (<>
                  <button onClick={()=>setShowModal(false)}
                    style={{padding:"9px 18px",borderRadius:8,background:"white",border:`1.5px solid ${T.b1}`,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer",flexShrink:0}}>
                   {t("common.cancel")}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    {validCount > 0
                      ? <div style={{fontSize:10.5,color:T.blu,fontWeight:600}}>{t("material.validcount_itemvalidcount2_ready", { validCount, validCount2: validCount!==1?"s":"" })}{(form.items||[]).filter(it=>!it.item_name?.trim()).length > 0 && <span style={{color:T.t4,fontWeight:400}}>{t("material.unfilled_rows_will_be_skipped")}</span>}</div>
                      : <div style={{fontSize:10.5,color:T.t4}}>{t("material.pick_at_least_one_item_to")}</div>
                    }
                  </div>
                  <button onClick={handleSubmitMR} disabled={!canSubmit}
                    style={{padding:"9px 22px",borderRadius:8,background:canSubmit?"#0D1B2A":"#CBD5E1",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",transition:"all .15s",flexShrink:0,minWidth:150}}>
                    {saving ? t("common.submitting") : canSubmit ? `Submit${validCount>1?" "+validCount+" Requests":" Request"}` : t("material.select_items_first")}
                  </button>
                </>);
              })()}
            </div>

          </div>{/* end drawer */}
        </>)}

        {/* Stage pipeline */}
        <div style={{display:"grid",gridTemplateColumns:"repeat("+STAGES.length+",1fr)",gap:8,marginBottom:12}}>
          {stageData.map((s,i)=>{
            const isA=fStage===s.stage;
            return(
              <div key={s.stage} onClick={()=>{
                if(s.stage==="Used"){
                  setUsedLogLoading(true);
                  setShowUsedLog(true);
                  api.get("/tasks/project/"+projectId+"/used-history").then(r=>{
                    if(r.success) setUsedLog(r.data||[]);
                    setUsedLogLoading(false);
                  }).catch(()=>setUsedLogLoading(false));
                } else {
                  setFStage(isA?"All":s.stage);
                }
              }}
                style={{padding:"9px 12px",background:isA?s.bg:T.surface,border:"1.5px solid "+(isA?s.c:T.b1),borderRadius:8,borderTop:"3px solid "+s.c,cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
                {i>0&&<div style={{display:"flex",justifyContent:"center",marginBottom:3}}>
                  <svg width={12} height={8} viewBox="0 0 12 8" fill="none"><path d="M1 4h8M6 1l3 3-3 3" stroke={isA?s.c:T.b2} strokeWidth={1.5} strokeLinecap="round"/></svg>
                </div>}
                <div style={{fontSize:18,fontWeight:700,color:isA?s.c:T.t1}}>{s.count}</div>
                <div style={{fontSize:11,fontWeight:600,color:isA?s.c:T.t2}}>{s.stage}</div>
              </div>
            );
          })}
        </div>

        {/* USED LOG DRAWER */}
        {showUsedLog&&(<>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}}/>
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(580px,96vw)",background:T.surface,zIndex:401,boxShadow:"-6px 0 32px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif"}}>
            {/* Header */}
            <div style={{background:"#0F172A",padding:"13px 18px",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                <div style={{fontSize:15,fontWeight:700,color:"white"}}>{t("material.material_used_log")}</div>
                <button onClick={()=>setShowUsedLog(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{projectName} · {usedLog.length} entries</div>
            </div>
            {/* Filters */}
            <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.b1,background:"#F8FAFC",flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                <input value={ulFilterMat} onChange={e=>setUlFilterMat(e.target.value)} placeholder={t("material.filter_by_material")}
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                <input value={ulFilterTask} onChange={e=>setUlFilterTask(e.target.value)} placeholder={t("material.filter_by_task")}
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                <input value={ulFilterBy} onChange={e=>setUlFilterBy(e.target.value)} placeholder={t("material.used_by")}
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                <input type="date" value={ulFilterFrom} onChange={e=>setUlFilterFrom(e.target.value)}
                  title={t("finance.from_date")}
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                <input type="date" value={ulFilterTo} onChange={e=>setUlFilterTo(e.target.value)}
                  title={t("finance.to_date")}
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
              </div>
              {(ulFilterMat||ulFilterTask||ulFilterBy||ulFilterFrom||ulFilterTo)&&(
                <button onClick={()=>{setUlFilterMat("");setUlFilterTask("");setUlFilterBy("");setUlFilterFrom("");setUlFilterTo("");}}
                  style={{marginTop:6,background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:11,padding:0,fontWeight:600}}>
                 {t("material.clear_filters")}
                </button>
              )}
            </div>
            {/* Table */}
            <div style={{flex:1,overflowY:"auto"}}>
              {usedLogLoading&&<div style={{textAlign:"center",padding:"60px 0",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>{t("common.loading")}</div>}
              {!usedLogLoading&&(()=>{
                const filtered=usedLog.filter(u=>{
                  if(ulFilterMat&&!u.material_name?.toLowerCase().includes(ulFilterMat.toLowerCase())) return false;
                  if(ulFilterTask&&!(u.task_name||"").toLowerCase().includes(ulFilterTask.toLowerCase())) return false;
                  if(ulFilterBy&&!(u.user_name||"").toLowerCase().includes(ulFilterBy.toLowerCase())) return false;
                  if(ulFilterFrom&&u.used_date&&u.used_date<ulFilterFrom) return false;
                  if(ulFilterTo&&u.used_date&&u.used_date>ulFilterTo) return false;
                  return true;
                });
                return filtered.length===0?(
                  <div style={{textAlign:"center",padding:"60px",color:T.t4,fontSize:13}}>
                    {usedLog.length===0?t("material.no_used_entries_yet"):t("material.no_entries_match_filters")}
                  </div>
                ):(
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"85px 1fr 75px 90px 1fr 32px",background:"#1E293B",padding:"7px 16px",gap:8}}>
                      {["Date","Material","Qty","Used By","Remark/Task",""].map((h,hi)=>(
                        <div key={hi} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".4px"}}>{h}</div>
                      ))}
                    </div>
                    {filtered.map((u,i)=>{
                      const showDel = u.id && u.task_id && canDeleteUsed(u.created_by_id ?? u.created_by);
                      return (
                      <div key={u.id||i} style={{display:"grid",gridTemplateColumns:"85px 1fr 75px 90px 1fr 32px",padding:"9px 16px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:i%2===0?T.surface:"white"}}>
                        <div style={{fontSize:11.5,color:T.t3}}>{u.used_date?new Date(u.used_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—"}</div>
                        <div>
                          <div style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{u.material_name}</div>
                          <div style={{fontSize:10,color:T.t4}}>{u.unit}</div>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:T.amb}}>{u.used_qty}</div>
                        <div style={{fontSize:11.5,color:T.t2}}>{u.user_name||t("common.site")}</div>
                        <div style={{fontSize:11,color:T.t3}}>
                          {u.task_name&&<div style={{color:T.blu,fontWeight:600,fontSize:10.5}}>{u.task_no} {u.task_name}</div>}
                          {u.remark&&<div>{u.remark}</div>}
                          {!u.task_name&&!u.remark&&"—"}
                        </div>
                        <div style={{display:"flex",justifyContent:"center"}}>
                          {showDel?(
                            <button title={t("material.delete_this_usage_entry")}
                              onClick={async()=>{
                                if(!await window.confirmAsync("Is used entry ko delete kar dein? ("+u.used_qty+" "+(u.unit||"")+")")) return;
                                const r=await api.del("/tasks/"+u.task_id+"/used-log/"+u.id);
                                if(r.success){
                                  setUsedLog(prev=>prev.filter(x=>x.id!==u.id));
                                  setLedgerLoaded(false);
                                } else {
                                  alert(r.message||"Delete fail ho gaya");
                                }
                              }}
                              style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:4,color:T.red,display:"flex",alignItems:"center",justifyContent:"center"}}
                              onMouseEnter={e=>e.currentTarget.style.background=T.redL}
                              onMouseLeave={e=>e.currentTarget.style.background="none"}>
                              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>
                            </button>
                          ):null}
                        </div>
                      </div>
                      );
                    })}
                    {/* Summary footer */}
                    <div style={{padding:"8px 16px",background:"#0F172A",borderTop:"2px solid "+T.b1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{t("material.filtered_entries_shown", { filtered: filtered.length })}</span>
                      <span style={{fontSize:13,fontWeight:800,color:T.amb}}>{t("material.total_filtered", { filtered: filtered.reduce((s,u)=>s+Number(u.used_qty||0),0).toFixed(2) })}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>)}

        {/* GRN MODAL */}
        {showGRN&&(<>
          <style>{`@keyframes grnSlideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:400,backdropFilter:"blur(3px)"}}/>
          <div style={{position:"fixed",right:0,top:0,bottom:0,width:"min(640px,96vw)",background:T.bg,zIndex:401,boxShadow:"-8px 0 40px rgba(0,0,0,0.22)",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',sans-serif",animation:"grnSlideIn .22s ease-out"}}>

            {/* Header */}
            <div style={{background:"#0D1B2A",padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"white",letterSpacing:"-.2px"}}>{t("material.record_grn_material_received")}</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.42)",marginTop:2}}>{projectName}</div>
              </div>
              <button onClick={()=>setShowGRN(false)}
                style={{width:28,height:28,borderRadius:6,background:"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
                ×
              </button>
            </div>

            {/* Tab bar */}
            <div style={{display:"flex",background:"#111E2C",flexShrink:0}}>
              {[{id:"ordered",label:t("material.ordered_materials")},{id:"direct",label:t("material.direct_receive")},{id:"weigh",label:t("weigh.tab")}].map(t=>{
                const isActive=grnTab===t.id;
                const badge=t.id==="ordered"?(orderedCount+pendingTransfers.length+pendingIssues.length):0;
                return(
                  <button key={t.id} onClick={()=>setGrnTab(t.id)}
                    style={{flex:1,padding:"11px 14px",border:"none",background:isActive?"#1E3048":"none",color:isActive?"white":"rgba(255,255,255,0.45)",fontSize:12.5,fontWeight:isActive?700:400,cursor:"pointer",borderBottom:isActive?"2px solid "+T.blu:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all .15s"}}>
                    {t.label}
                    {badge>0&&<span style={{background:T.amb,color:"white",fontSize:9,fontWeight:800,padding:"1px 7px",borderRadius:10,lineHeight:"16px"}}>{badge}</span>}
                  </button>
                );
              })}
            </div>

            {/* Scrollable body */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
              {grnTab==="ordered"&&(
                <div>
                  {/* ── PENDING ISSUES from Warehouse ──────────────────── */}
                  {pendingIssues.length>0&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",background:T.ambL,border:"1px solid "+T.ambM,borderRadius:7,marginBottom:8}}>
                        <span style={{fontSize:14}}>📦</span>
                        <span style={{fontSize:11.5,fontWeight:700,color:T.amb}}>{t("material.issues_from_warehouse_site_team_receive", { pendingIssues: pendingIssues.length })}</span>
                      </div>
                      {pendingIssues.map(iss=>{
                        const isDone=issueReceiveDone.includes(iss.id);
                        const totalQty=(iss.items||[]).reduce((s,it)=>s+Number(it.qty||0),0);
                        const totalValue=Number(iss.total_value||iss.total||0);
                        return(
                          <div key={iss.id} style={{background:isDone?T.grnL:T.surface,border:"1px solid "+(isDone?T.grnM:T.ambM),borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+(isDone?T.grn:T.amb)}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDone?0:10}}>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:700,color:T.amb,fontFamily:"monospace"}}>{iss.issue_no}</span>
                                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.ambL,color:T.amb,fontWeight:600,border:"1px solid "+T.ambM}}>{t("material.material_in")}</span>
                                  {iss.status==="Partial"&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:600}}>{t("common.partial")}</span>}
                                </div>
                                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{t("material.from_warehouse")}</div>
                                <div style={{fontSize:11,color:T.t4,marginTop:2}}>{t("material.qty_totalqty_value_totalvalue_issued_to", { totalQty: totalQty.toFixed(2), totalValue: totalValue.toLocaleString("en-IN"), iss: iss.issued_to_name||"—", iss2: iss.issued_by_name||"—" })}</div>
                              </div>
                              {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>{t("common.received_2")}</span>}
                            </div>
                            {!isDone&&(
                              <>
                                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px",marginBottom:9,border:"1px solid "+T.b1}}>
                                  <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>{t("material.items_received")}</div>
                                  {(iss.items||[]).map(it=>{
                                    const key=`${iss.id}_${it.id}`;
                                    const recvVal=issueReceiveQty[key]??it.qty;
                                    const sent=Number(it.qty||0);
                                    const recv=Number(recvVal||0);
                                    const short=recv<sent;
                                    return(
                                      <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 70px",gap:7,alignItems:"center",marginBottom:5}}>
                                        <div>
                                          <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.name||it.material_name}</div>
                                          <div style={{fontSize:10,color:T.t4}}>{t("material.sent_sent_unit", { sent: sent.toFixed(2), unit: it.unit })}</div>
                                        </div>
                                        <div style={{fontSize:11,color:T.t4,textAlign:"right"}}>@ ₹{Number(it.rate||0).toLocaleString("en-IN")}</div>
                                        <input type="number" value={recvVal} max={sent}
                                          onChange={e=>setIssueReceiveQty(p=>({...p,[key]:e.target.value}))}
                                          style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+(short?T.amb:T.b1),fontSize:12,textAlign:"right",fontFamily:"inherit",outline:"none",background:short?T.ambL:T.surface,color:short?T.amb:T.t1}}/>
                                        <div style={{fontSize:10.5,color:T.t4,textAlign:"right"}}>{it.unit}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{display:"flex",justifyContent:"flex-end"}}>
                                  <button onClick={()=>handleReceiveIssue(iss)} disabled={issueReceiving}
                                    style={{padding:"7px 16px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:issueReceiving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5}}>
                                    {issueReceiving?"...":t("material.receive_grn_bana_do")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {(orderedCount+pendingTransfers.length)>0&&<div style={{height:1,background:T.b1,margin:"14px 0 10px"}}/>}
                    </div>
                  )}
                  {/* ── INCOMING TRANSFERS (project-to-project) ────────── */}
                  {pendingTransfers.length>0&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",background:T.cynL,border:"1px solid "+T.cynM,borderRadius:7,marginBottom:8}}>
                        <span style={{fontSize:14}}>🔄</span>
                        <span style={{fontSize:11.5,fontWeight:700,color:T.cyn}}>{t("material.incoming_transfers_kisi_aur_project_se", { pendingTransfers: pendingTransfers.length })}</span>
                      </div>
                      {pendingTransfers.map(tr=>{
                        const isDone=trReceiveDone.includes(tr.id);
                        const totalQty=(tr.items||[]).reduce((s,it)=>s+Number(it.qty||0),0);
                        const totalValue=Number(tr.total_value||0);
                        return(
                          <div key={tr.id} style={{background:isDone?T.grnL:T.surface,border:"1px solid "+(isDone?T.grnM:T.cynM),borderRadius:8,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+(isDone?T.grn:T.cyn)}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDone?0:10}}>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:12,fontWeight:700,color:T.cyn,fontFamily:"monospace"}}>{tr.transfer_no}</span>
                                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.cynL,color:T.cyn,fontWeight:600,border:"1px solid "+T.cynM}}>{t("material.transfer_in")}</span>
                                  {tr.status==="Partial"&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:600}}>{t("common.partial")}</span>}
                                </div>
                                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>{t("material.from_tr", { tr: tr.from_project_name||tr.from_location||"—" })}</div>
                                <div style={{fontSize:11,color:T.t4,marginTop:2}}>{t("material.qty_totalqty_value_totalvalue_by_tr", { totalQty: totalQty.toFixed(2), totalValue: totalValue.toLocaleString("en-IN"), tr: tr.transferred_by_name||"—" })}</div>
                              </div>
                              {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>{t("common.received_2")}</span>}
                            </div>
                            {!isDone&&(
                              <>
                                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px",marginBottom:9,border:"1px solid "+T.b1}}>
                                  <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>{t("material.items_received")}</div>
                                  {(tr.items||[]).map(it=>{
                                    const key=`${tr.id}_${it.id}`;
                                    const recvVal=trReceiveQty[key]??it.qty;
                                    const sent=Number(it.qty||0);
                                    const recv=Number(recvVal||0);
                                    const short=recv<sent;
                                    return(
                                      <div key={it.id} style={{display:"grid",gridTemplateColumns:"1fr 70px 90px 70px",gap:7,alignItems:"center",marginBottom:5}}>
                                        <div>
                                          <div style={{fontSize:12,fontWeight:600,color:T.t1}}>{it.material_name}</div>
                                          <div style={{fontSize:10,color:T.t4}}>{t("material.sent_sent_unit", { sent: sent.toFixed(2), unit: it.unit })}</div>
                                        </div>
                                        <div style={{fontSize:11,color:T.t4,textAlign:"right"}}>@ ₹{Number(it.rate||0).toLocaleString("en-IN")}</div>
                                        <input type="number" value={recvVal} max={sent}
                                          onChange={e=>setTrReceiveQty(p=>({...p,[key]:e.target.value}))}
                                          style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+(short?T.amb:T.b1),fontSize:12,textAlign:"right",fontFamily:"inherit",outline:"none",background:short?T.ambL:T.surface,color:short?T.amb:T.t1}}/>
                                        <div style={{fontSize:10.5,color:T.t4,textAlign:"right"}}>{it.unit}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{display:"flex",justifyContent:"flex-end"}}>
                                  <button onClick={()=>handleReceiveTransfer(tr)} disabled={trReceiving}
                                    style={{padding:"7px 16px",borderRadius:6,background:T.grn,border:"none",color:"white",fontSize:12,fontWeight:700,cursor:trReceiving?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:5}}>
                                    {trReceiving?"...":t("material.receive_grn_bana_do")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {orderedCount>0&&<div style={{height:1,background:T.b1,margin:"14px 0 10px"}}/>}
                    </div>
                  )}
                </div>
              )}
              {/* Vendor ka maal — ordered aur direct — site aur godown ka EK form.
                  Ek hi jagah render hota hai taaki tab badalne par bhara hua na mite. */}
              {(grnTab==="ordered"||grnTab==="direct")&&(
                <GrnReceive ref={grnRef} mode={grnTab}
                  dest={{ type: "project", projectId, projectName }}
                  photos={grnPhotos} setPhotos={setGrnPhotos}
                  photoRequired={polFor("grn").mode==="required"}
                  photoBadgeRequired={grnTab==="ordered" ? grnPhotoRequired : polFor("grn").mode==="required"}
                  photoCameraOnly={grnPhotoCameraOnly}
                  meUser={meUser}
                  hasOtherPending={pendingTransfers.length+pendingIssues.length>0}
                  onReceived={handleGrnReceived}
                  onSavingChange={setGrnSaving}
                  onDoneCount={setGrnDoneCount}
                  onOrderedCount={setOrderedCount}/>
              )}
              {grnTab==="weigh"&&(
                <WeighbridgePanel dest={{ type: "project", projectId, projectName }}/>
              )}

            </div>{/* end scroll body */}

            {/* ── Sticky footer ── */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,background:T.bg,display:"flex",gap:10,flexShrink:0}}>
              <button onClick={()=>setShowGRN(false)}
                style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer",fontFamily:"inherit"}}>
               {t("common.close")}
              </button>
              {grnTab==="direct"&&(
                <button onClick={()=>grnRef.current&&grnRef.current.submitDirect()} disabled={grnSaving}
                  style={{flex:2,padding:"9px",borderRadius:7,background:grnSaving?"#ccc":T.grn,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:grnSaving?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:"-.1px"}}>
                  {grnSaving?t("common.saving_2"):t("material.submit_grn")}
                </button>
              )}
              {grnTab==="ordered"&&grnDoneCount>0&&(
                <button onClick={()=>setShowGRN(false)}
                  style={{flex:2,padding:"9px",borderRadius:7,background:T.grn,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{t("material.done_grndone_received", { grnDone: grnDoneCount })}</button>
              )}
            </div>

          </div>{/* end drawer */}
        </>)}

        {/* Toolbar */}
        <div style={{background:T.surface,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",border:"1px solid "+T.b1}}>
          <div style={{position:"relative",flex:1,minWidth:180}}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("common.search_material")}
              style={{width:"100%",padding:"7px 9px 7px 28px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
              onFocus={e=>e.target.style.borderColor=T.blu} onBlur={e=>e.target.style.borderColor=T.b1}/>
          </div>
          <select value={fMaterial} onChange={e=>setFMaterial(e.target.value)}
            style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
            {MATERIAL_NAMES.map(n=><option key={n}>{n}</option>)}
          </select>
          <div style={{display:"flex",gap:3,background:T.surfaceB,borderRadius:6,padding:3}}>
            {[["tile","⊞"],["list","☰"]].map(([id,icon])=>(
              <button key={id} onClick={()=>setViewMode(id)}
                style={{padding:"4px 9px",borderRadius:4,border:"none",background:viewMode===id?T.blu:"none",color:viewMode===id?"white":T.t3,fontSize:13,cursor:"pointer"}}>
                {icon}
              </button>
            ))}
          </div>
          <span style={{fontSize:11,color:T.t4}}>{t("material.filtered_items_rs_fmtn", { filtered: filtered.length, fmtN: fmtN(totalAmt) })}</span>
          <button onClick={()=>setShowModal(true)}
            style={{padding:"7px 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
           {t("common.new_request")}
          </button>
          <button onClick={()=>setShowGRN(true)}
            style={{padding:"7px 13px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
           {t("common.record_grn")}
          </button>
        </div>

        {/* TILE VIEW */}
        {viewMode==="tile"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
            {filtered.map(m=>{
              const ss=STAGE_S[m.stage]||STAGE_S["Requested"];
              return(
                <div key={m.id} style={{background:T.surface,borderRadius:10,overflow:"hidden",border:"1px solid "+T.b1,borderTop:"3px solid "+ss.c,boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
                  <div style={{padding:"12px 14px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{fontSize:13.5,fontWeight:700,color:T.t1,lineHeight:1.3,flex:1,marginRight:6}}>{m.name}</div>
                      <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                    </div>
                    <div style={{fontSize:20,fontWeight:800,color:T.t1,marginBottom:2}}>{m.qty}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      {m.partialPct!=null&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:"#FEF3C7",color:"#B45309",border:"1px solid #FDE68A"}}>{t("procurement.partial_pct", { pct: m.partialPct })}</span>}
                      {m.vendor&&<span style={{fontSize:11,color:T.blu}}>🏪 {m.vendor}</span>}
                      {m.isDirect&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:"#DCFCE7",color:"#16A34A",border:"1px solid #BBF7D0"}}>{t("projects.direct")}</span>}
                      {m.isViaBill&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:"#FEF3C7",color:"#92400E",border:"1px solid #FDE68A"}}>{t("material.via_bill")}</span>}
                      {m.challan&&<span style={{fontSize:9,color:T.t4}}>{t("material.ch_challan", { challan: m.challan })}</span>}
                    </div>
                    <div style={{fontSize:11,color:T.t4}}>{m.date} · {m.by}</div>
                  </div>
                  <div style={{padding:"7px 12px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:T.t4}}>{t("material.by_m", { m: (m.by||"—").split(" ")[0] })}</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.t1}}>{t("material.rs_fmtn", { fmtN: fmtN(m.amt||0) })}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{gridColumn:"1/-1",padding:"48px",textAlign:"center",color:T.t4,background:T.surface,borderRadius:8,border:"1px solid "+T.b1}}>{t("material.no_materials_found")}</div>}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode==="list"&&(
          <Panel>
            <THead cols="2fr 90px 110px 130px 110px 110px" headers={["Material","Qty","Stage","Vendor","Requested By","Amount"]}/>
            {filtered.map(m=>{
              const ss=STAGE_S[m.stage]||STAGE_S["Requested"];
              return(
                <div key={m.id} style={{display:"grid",gridTemplateColumns:"2fr 90px 110px 130px 110px 110px",padding:"9px 15px",borderBottom:"1px solid "+T.b1,alignItems:"center",borderLeft:"3px solid "+ss.c+"44",transition:"background .1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceB}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontSize:12.5,fontWeight:600,color:T.t1}}>{m.name}</span>
                  <span style={{fontSize:12,color:T.t2}}>{m.qty}
                    {m.partialPct!=null&&<div style={{fontSize:9,fontWeight:700,color:"#B45309"}}>{t("procurement.partial_pct", { pct: m.partialPct })}</div>}
                  </span>
                  <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                  <span style={{fontSize:12,color:T.t2}}>{m.vendor||"—"}
                    {m.isDirect&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#DCFCE7",color:"#16A34A"}}>{t("projects.direct")}</span>}
                    {m.isViaBill&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#FEF3C7",color:"#92400E"}}>{t("material.via_bill")}</span>}
                  </span>
                  <span style={{fontSize:12,color:T.t2}}>{(m.by||"—").split(" ")[0]}</span>
                  <span style={{fontSize:13,fontWeight:600,color:T.t1}}>{t("material.rs_fmtn", { fmtN: fmtN(m.amt||0) })}</span>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4}}>{t("material.no_materials_found")}</div>}
          </Panel>
        )}
      </>)}

      {/* ══════════════════════════════════════════════════════
          TAB 2: MATERIAL LEDGER
      ══════════════════════════════════════════════════════ */}
      {activeTab==="ledger"&&(
        <div>
          {ledgerLoading&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>{t("material.loading_ledger")}</div>}
          {!ledgerLoading&&(
            <div>
              {/* Search + Vendor filter */}
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <div style={{position:"relative",flex:1}}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                  <input value={ledgerSearch} onChange={e=>setLedgerSearch(e.target.value)} placeholder={t("common.search_material")}
                    style={{width:"100%",padding:"7px 9px 7px 28px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <select value={ledgerVendor} onChange={e=>setLedgerVendor(e.target.value)}
                  style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,color:T.t1,background:"white",fontFamily:"inherit",cursor:"pointer"}}>
                  {allVendors.map(v=><option key={v}>{v}</option>)}
                </select>
              </div>

              {ledgerFiltered.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>{t("material.no_material_data_record_grn_to")}</div>}

              {/* Material accordion */}
              {ledgerFiltered.map((mat,mi)=>{
                // Expanded inline view replaced by the side ledger drawer —
                // isOpen pinned false so the old accordion body is dead code.
                const isOpen=false;
                const balColor=mat.balance<=0?T.red:mat.balance<mat.total_received*0.2?T.amb:T.grn;

                // Build chronological rows with running balance
                const allRows=[];
                let runBal=0;
                const allEntries=[
                  ...(mat.receipts||[]).map(r=>({...r,_type:"grn",_date:new Date(r.received_date||0)})),
                  ...(mat.usage||[]).map(u=>({...u,_type:"used",_date:new Date(u.used_date||0)})),
                ].sort((a,b)=>a._date-b._date);
                allEntries.forEach((e,i)=>{
                  if(e._type==="grn"){
                    runBal+=Number(e.qty||0);
                    allRows.push({...e,runBal,idx:i});
                  } else {
                    runBal-=Number(e.qty||0);
                    allRows.push({...e,runBal,idx:i});
                  }
                });

                return(
                  <div key={mat.material_name} style={{marginBottom:10,background:T.surface,borderRadius:10,border:"1px solid "+T.b1,overflow:"hidden"}}>
                    {/* Accordion header */}
                    <div onClick={()=>setLedgerDrawerMat(mat)}
                      style={{padding:"11px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",background:T.surface,transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=T.bluL+"55"}
                      onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={isOpen?"white":T.t3} strokeWidth={2.5} style={{transition:"transform .2s",transform:isOpen?"rotate(90deg)":"rotate(0deg)"}}><path d="M9 18l6-6-6-6"/></svg>
                        <div>
                          <span style={{fontSize:13,fontWeight:700,color:isOpen?"white":T.t1}}>{mat.material_name}</span>
                          <span style={{fontSize:10.5,color:isOpen?"rgba(255,255,255,0.5)":T.t4,marginLeft:8}}>{t("material.unit_mat_grn_mat2_used_entries", { unit: mat.unit, mat: mat.receipts?.length||0, mat2: mat.usage?.length||0 })}</span>
                          {Number(mat.open_issues)>0&&(
                            <span title={t("material.is_material_ki_kisi_delivery_me")}
                              style={{fontSize:10,fontWeight:700,color:T.red,background:T.redL,border:"1px solid "+T.redM,borderRadius:10,padding:"1px 8px",marginLeft:8}}>
                              ⚠ {mat.open_issues}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:20,alignItems:"center"}}>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>{t("common.received")}</div>
                          <div style={{fontSize:14,fontWeight:700,color:isOpen?"#4ADE80":T.grn}}>{mat.total_received}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>{t("common.used")}</div>
                          <div style={{fontSize:14,fontWeight:700,color:isOpen?"#FCD34D":T.amb}}>{mat.total_used}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>{t("common.balance")}</div>
                          <div style={{fontSize:14,fontWeight:800,color:mat.balance<=0?"#F87171":isOpen?"white":balColor}}>{mat.balance}</div>
                        </div>
                      </div>
                    </div>

                    {/* Finance-style ledger table */}
                    {isOpen&&(()=>{
                      // Per-material filter — show GRN-only / Used-only / All
                      const visibleRows = allRows.filter(r =>
                        ledgerRowFilter==="all" ? true :
                        ledgerRowFilter==="grn" ? r._type==="grn" : r._type==="used");
                      const markUsedOpen = ledgerMarkUsedFor===mat.material_name;
                      const today = new Date().toISOString().split("T")[0];
                      const uForm = invUsedForm[mat.material_name]||{qty:"",remark:"",used_date:today};
                      return (
                      <div>
                        {/* Toolbar — filter chips + Mark Used */}
                        <div style={{display:"flex",alignItems:"center",gap:6,padding:"9px 14px",background:"#0F172A",borderTop:"1px solid #1E293B"}}>
                          {[["all","All"],["grn","GRN only"],["used","Used only"]].map(([k,l])=>(
                            <button key={k} onClick={()=>setLedgerRowFilter(k)}
                              style={{padding:"3px 11px",borderRadius:12,fontSize:10.5,fontWeight:700,cursor:"pointer",border:"1px solid "+(ledgerRowFilter===k?T.blu:"#334155"),background:ledgerRowFilter===k?T.blu:"transparent",color:ledgerRowFilter===k?"white":"rgba(255,255,255,.6)"}}>
                              {l}
                            </button>
                          ))}
                          <div style={{flex:1}}/>
                          {mat.balance>0&&(
                            <button onClick={()=>{
                              setLedgerMarkUsedFor(markUsedOpen?null:mat.material_name);
                              if(!markUsedOpen) setInvUsedForm(p=>({...p,[mat.material_name]:{qty:"",remark:"",used_date:today}}));
                            }}
                              style={{padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",border:"1px solid "+(markUsedOpen?"#4ADE80":T.grn),background:markUsedOpen?T.grn:"transparent",color:markUsedOpen?"white":"#4ADE80"}}>
                              {markUsedOpen?t("material.cancel"):t("material_ledger.mark_used")}
                            </button>
                          )}
                        </div>

                        {/* Inline Mark-Used form */}
                        {markUsedOpen&&mat.balance>0&&(
                          <div style={{padding:"11px 14px",background:T.grnL,borderBottom:"1px solid "+T.grnM}}>
                            <div style={{display:"grid",gridTemplateColumns:"110px 130px 1fr 110px",gap:8,alignItems:"end"}}>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>{t("material_ledger.qty_used")}</label>
                                <input type="number" value={uForm.qty}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,qty:e.target.value}}))}
                                  placeholder={"max "+mat.balance}
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>{t("common.date")}</label>
                                <input type="date" value={uForm.used_date}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,used_date:e.target.value}}))}
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>{t("common.remark")}</label>
                                <input value={uForm.remark}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,remark:e.target.value}}))}
                                  placeholder={t("common.optional")}
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <button onClick={async()=>{
                                if(!uForm.qty||parseFloat(uForm.qty)<=0) return alert(t("material.qty_required"));
                                if(parseFloat(uForm.qty)>mat.balance) return alert("Qty exceeds balance ("+mat.balance+")");
                                setInvUsedSaving(mat.material_name);
                                try{
                                  const res=await api.post("/tasks/project/"+projectId+"/mark-used",{
                                    material_name:mat.material_name,
                                    used_qty:parseFloat(uForm.qty),
                                    unit:mat.unit,
                                    remark:uForm.remark||null,
                                    used_date:uForm.used_date,
                                  });
                                  if(res.success){
                                    setLedgerMarkUsedFor(null);
                                    const rr=await api.get("/tasks/project/"+projectId+"/material-ledger");
                                    if(rr.success) setLedger(rr.data||[]);
                                  } else alert(res.message||"Failed");
                                }catch(e){alert(e.message);}
                                setInvUsedSaving(null);
                              }} disabled={invUsedSaving===mat.material_name}
                                style={{padding:"7px",borderRadius:6,background:invUsedSaving===mat.material_name?T.b1:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
                                {invUsedSaving===mat.material_name?t("common.saving"):t("material.save_used")}
                              </button>
                            </div>
                          </div>
                        )}

                      <div style={{overflowX:"auto"}}>
                        {/* Column headers */}
                        <div style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px 36px",background:"#1E293B",padding:"7px 14px",gap:8,minWidth:936}}>
                          {["Date","Vendor","Challan","Remark / Task","Ref#","Cr (In)","Dr (Out)","Balance","By",""].map((h,hi)=>(
                            <div key={hi} style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:".5px",textAlign:hi>=5&&hi<=7?"right":"left"}}>{h}</div>
                          ))}
                        </div>

                        {/* Rows */}
                        {visibleRows.length===0&&(
                          <div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:12}}>{t("material.no_entriesledgerrowfilter_yet", { ledgerRowFilter: ledgerRowFilter!=="all"?` (${ledgerRowFilter})`:"" })}</div>
                        )}
                        {visibleRows.map((row,ri)=>{
                          const isGRN=row._type==="grn";
                          const balNeg=row.runBal<0;
                          const balLow=row.runBal>=0&&row.runBal<mat.total_received*0.2;
                          const balColor=balNeg?T.red:balLow?T.amb:T.grn;
                          const dateStr=row._date?row._date.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"2-digit"}):"—";
                          const showDel = !isGRN && row.used_log_id && row.task_id && canDeleteUsed(row.created_by_id);
                          return(
                            <div key={ri}
                              onClick={()=>{ if(isGRN && row.grn_id) setFlowGrnId(row.grn_id); }}
                              style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px 36px",padding:"9px 14px",gap:8,borderBottom:"1px solid "+T.b1,alignItems:"center",background:ri%2===0?T.surface:"#F8FAFC",minWidth:936,borderLeft:"3px solid "+(isGRN?T.grn:T.amb),cursor:isGRN&&row.grn_id?"pointer":"default",transition:"background .1s"}}
                              onMouseEnter={e=>{ if(isGRN && row.grn_id) e.currentTarget.style.background=T.bluL+"66"; }}
                              onMouseLeave={e=>{ e.currentTarget.style.background=ri%2===0?T.surface:"#F8FAFC"; }}>
                              {/* Date */}
                              <div style={{fontSize:11.5,color:T.t3,fontWeight:500}}>{dateStr}</div>
                              {/* Vendor */}
                              <div style={{fontSize:12,color:T.t2,fontWeight:isGRN?500:400}}>{isGRN?(row.vendor_name||"—"):"—"}</div>
                              {/* Challan */}
                              <div style={{fontSize:11,color:T.blu,fontFamily:"monospace"}}>{isGRN?(row.challan_no||"—"):"—"}</div>
                              {/* Remark/Task */}
                              <div style={{fontSize:12,color:T.t1}}>
                                {isGRN
                                  ? <>
                                      <span style={{fontSize:10.5,padding:"2px 7px",borderRadius:3,background:T.grnL,color:T.grn,fontWeight:600}}>{t("common.grn_received")}</span>
                                      {Number(row.open_issues)>0&&(
                                        <span title={t("material.is_delivery_me_open_issue_hai")}
                                          style={{fontSize:10.5,padding:"2px 7px",borderRadius:3,background:T.redL,color:T.red,fontWeight:700,marginLeft:6,border:"1px solid "+T.redM}}>
                                          ⚠ {row.open_issues} issue
                                        </span>
                                      )}
                                    </>
                                  : <span>{row.task_name?<span style={{fontSize:10,color:T.t4,marginRight:4}}>{row.task_no}</span>:""}{row.task_name||""}{row.remark?<span style={{color:T.t3}}>{row.task_name?" · ":""}{row.remark}</span>:<span style={{color:T.t4,fontSize:10}}>{!row.task_name?t("material.project_level"):""}</span>}</span>
                                }
                              </div>
                              {/* Ref# */}
                              <div style={{fontSize:11,fontWeight:700,color:isGRN?T.grn:T.amb,fontFamily:"monospace"}}>{isGRN?(row.grn_number||"—"):("USE-"+(ri+1))}</div>
                              {/* Cr (In) */}
                              <div style={{fontSize:13,fontWeight:800,color:isGRN?T.grn:T.t4,textAlign:"right"}}>{isGRN?row.qty:"—"}</div>
                              {/* Dr (Out) */}
                              <div style={{fontSize:13,fontWeight:800,color:!isGRN?T.red:T.t4,textAlign:"right"}}>{!isGRN?row.qty:"—"}</div>
                              {/* Running Balance */}
                              <div style={{fontSize:13,fontWeight:800,color:balColor,textAlign:"right",background:balNeg?T.redL:"transparent",borderRadius:4,padding:"1px 4px"}}>{row.runBal}</div>
                              {/* By */}
                              <div style={{fontSize:11.5,color:T.t2}}>{isGRN?(row.received_by||"—"):(row.used_by||row.user_name||"—")}</div>
                              {/* Delete (only owner can delete a usage entry) */}
                              <div style={{display:"flex",justifyContent:"center"}}>
                                {showDel?(
                                  <button title={t("material.delete_this_usage_entry")}
                                    onClick={async(e)=>{
                                      e.stopPropagation();
                                      if(!await window.confirmAsync("Is used entry ko delete kar dein? ("+row.qty+" "+(row.unit||mat.unit||"")+" — "+(row.task_name||"Project level")+")")) return;
                                      const r=await api.del("/tasks/"+row.task_id+"/used-log/"+row.used_log_id);
                                      if(r.success){
                                        const rr=await api.get("/tasks/project/"+projectId+"/material-ledger");
                                        if(rr.success) setLedger(rr.data||[]);
                                      } else {
                                        alert(r.message||"Delete fail ho gaya");
                                      }
                                    }}
                                    style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:4,color:T.red,display:"flex",alignItems:"center",justifyContent:"center"}}
                                    onMouseEnter={e=>e.currentTarget.style.background=T.redL}
                                    onMouseLeave={e=>e.currentTarget.style.background="none"}>
                                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"/></svg>
                                  </button>
                                ):null}
                              </div>
                            </div>
                          );
                        })}

                        {/* Footer summary */}
                        <div style={{display:"grid",gridTemplateColumns:"85px 130px 85px 1fr 85px 85px 85px 85px 90px 36px",padding:"8px 14px",gap:8,background:"#0F172A",minWidth:936,borderTop:"2px solid "+T.b1}}>
                          <div style={{gridColumn:"1/6",fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".4px"}}>{t("common.total")}</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#4ADE80",textAlign:"right"}}>{mat.total_received}</div>
                          <div style={{fontSize:13,fontWeight:800,color:"#F87171",textAlign:"right"}}>{mat.total_used}</div>
                          <div style={{fontSize:13,fontWeight:800,color:mat.balance<=0?"#F87171":"#4ADE80",textAlign:"right"}}>{mat.balance}</div>
                          <div/>
                          <div/>
                        </div>
                      </div>
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3 (retired): INVENTORY — merged into Material Inventory
      ══════════════════════════════════════════════════════ */}
      {false&&(
        <div>
          {invLoading&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>{t("common.loading_inventory")}</div>}
          {!invLoading&&inventory.length===0&&(
            <div style={{textAlign:"center",padding:"60px 0",color:T.t4}}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{margin:"0 auto 12px",display:"block"}}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <div style={{fontSize:14,fontWeight:600,color:T.t3}}>{t("material.no_inventory_yet")}</div>
              <div style={{fontSize:12,marginTop:4}}>{t("material.record_grn_to_see_live_stock")}</div>
            </div>
          )}
          {!invLoading&&inventory.length>0&&(
            <div>
              {/* Summary stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:14}}>
                {[
                  {l:t("material.total_materials"),v:inventory.length,c:T.slt},
                  {l:t("material.low_exhausted"),v:inventory.filter(i=>i.status==="Low"||i.status==="Exhausted").length,c:T.red},
                  {l:t("common.available"),v:inventory.filter(i=>i.status==="Available").length,c:T.grn},
                ].map(s=>(
                  <div key={s.l} style={{padding:"10px 12px",background:T.surface,border:"1px solid "+T.b1,borderRadius:8,borderTop:"3px solid "+s.c,textAlign:"center"}}>
                    <div style={{fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:10,color:T.t3,marginTop:2}}>{s.l}</div>
                  </div>
                ))}
              </div>
              {/* Cards grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:9}}>
                {inventory.map((item,i)=>{
                  const rec=Number(item.total_received||0);
                  const used=Number(item.total_used||0);
                  const bal=Number(item.balance||0);
                  const pct=rec>0?Math.min(100,Math.round((used/rec)*100)):0;
                  const stC=item.status==="Exhausted"?T.red:item.status==="Low"?T.amb:T.grn;
                  const stBg=item.status==="Exhausted"?T.redL:item.status==="Low"?T.ambL:T.grnL;
                  const isExpanded = invExpandedMat===item.material_name;
                  const today = new Date().toISOString().split("T")[0];
                  const uForm = invUsedForm[item.material_name]||{qty:"",remark:"",used_date:today};
                  return(
                    <div key={i} style={{background:T.surface,borderRadius:9,border:"1.5px solid "+(isExpanded?T.grn:T.b1),padding:"11px 13px",borderTop:"3px solid "+stC,transition:"border .2s"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:1}}>
                        <div style={{fontSize:12,fontWeight:700,color:T.t1}}>{item.material_name}</div>
                        <span style={{fontSize:9.5,fontWeight:700,padding:"2px 8px",borderRadius:4,background:stBg,color:stC}}>{item.status}</span>
                      </div>
                      <div style={{fontSize:10,color:T.t4,marginBottom:8}}>{item.unit}</div>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:T.grn}}>{rec}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>{t("common.received")}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:T.amb}}>{used}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>{t("common.used")}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:stC}}>{bal}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>{t("common.balance")}</div>
                        </div>
                      </div>
                      {rec>0&&<div style={{height:4,background:T.b1,borderRadius:2,overflow:"hidden",marginBottom:8}}>
                        <div style={{height:"100%",width:pct+"%",background:pct>=100?T.red:pct>60?T.amb:T.grn,borderRadius:2,transition:"width .4s"}}/>
                      </div>}
                      {/* Mark Used button */}
                      {bal>0&&<button onClick={()=>{
                        setInvExpandedMat(isExpanded?null:item.material_name);
                        if(!isExpanded) setInvUsedForm(p=>({...p,[item.material_name]:{qty:"",remark:"",used_date:today}}));
                      }}
                        style={{width:"100%",padding:"5px",borderRadius:6,border:"1.5px solid "+(isExpanded?T.grn:T.grnM),background:isExpanded?T.grn:T.grnL,color:isExpanded?"white":T.grn,fontSize:11,fontWeight:700,cursor:"pointer",marginBottom:isExpanded?8:0,transition:"all .15s"}}>
                        {isExpanded?t("material.cancel"):t("material_ledger.mark_used")}
                      </button>}
                      {/* Inline form */}
                      {isExpanded&&bal>0&&(
                        <div style={{borderTop:"1px solid "+T.grnM,paddingTop:8}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>{t("material_ledger.qty_used")}</label>
                              <input type="number" value={uForm.qty}
                                onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,qty:e.target.value}}))}
                                placeholder={"max "+bal}
                                style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                            </div>
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>{t("common.date")}</label>
                              <input type="date" value={uForm.used_date}
                                onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,used_date:e.target.value}}))}
                                style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                            </div>
                          </div>
                          <input value={uForm.remark}
                            onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,remark:e.target.value}}))}
                            placeholder={t("common.remark_optional")}
                            style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:7}}/>
                          <button onClick={async()=>{
                            if(!uForm.qty||parseFloat(uForm.qty)<=0) return alert(t("material.qty_required"));
                            if(parseFloat(uForm.qty)>bal) return alert("Qty exceeds balance ("+bal+")");
                            setInvUsedSaving(item.material_name);
                            try{
                              const res=await api.post("/tasks/project/"+projectId+"/mark-used",{
                                material_name:item.material_name,
                                used_qty:parseFloat(uForm.qty),
                                unit:item.unit,
                                remark:uForm.remark||null,
                                used_date:uForm.used_date,
                              });
                              if(res.success){
                                setInvExpandedMat(null);
                                // Reload inventory
                                setInvLoading(true);
                                api.get("/tasks/project/"+projectId+"/inventory").then(r=>{
                                  if(r.success)setInventory(r.data||[]);
                                  setInvLoading(false);
                                });
                                setLedgerLoaded(false);
                              } else alert(res.message||"Failed");
                            }catch(e){alert(e.message);}
                            setInvUsedSaving(null);
                          }} disabled={invUsedSaving===item.material_name}
                            style={{width:"100%",padding:"7px",borderRadius:6,background:invUsedSaving===item.material_name?T.b1:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>
                            {invUsedSaving===item.material_name?t("common.saving"):t("material_ledger.save_used_entry")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 4: TRANSFER — site-to-site material transfer with approval
      ══════════════════════════════════════════════════════ */}
      {activeTab==="transfer"&&(
        <MaterialTransferTab projectId={projectId} projectName={projectName} isAdmin={meIsPriv}/>
      )}

      {/* ── MATERIAL LEDGER DRAWER (material click → GRN/Used/MR tabs) ── */}
      <MaterialLedgerDrawer
        material={ledgerDrawerMat}
        projectId={projectId}
        onClose={()=>setLedgerDrawerMat(null)}
        canDeleteUsed={canDeleteUsed}
        onGrnClick={(grnId)=>{ setLedgerDrawerMat(null); setFlowGrnId(grnId); }}
        onChanged={async()=>{
          try {
            const r = await api.get("/tasks/project/"+projectId+"/material-ledger");
            if (r.success) setLedger(r.data || []);
          } catch {}
        }}
      />

      {/* ── MATERIAL FLOW DRAWER (Material Ledger row click) ── */}
      <MaterialFlowDrawer
        grnId={flowGrnId}
        onClose={()=>setFlowGrnId(null)}
        onChanged={async()=>{
          try {
            const r = await api.get("/tasks/project/"+projectId+"/material-ledger");
            if (r.success) setLedger(r.data || []);
          } catch {}
        }}
        onEditMR={(mr)=>{ setFlowEditMR(mr); setFlowGrnId(null); }}
      />
      {/* ── MR Edit Drawer (opened from Material Flow's Edit button) ── */}
      <MRDetailDrawer
        mr={flowEditMR}
        onClose={()=>setFlowEditMR(null)}
        onChanged={async()=>{
          try {
            const [r1, r2] = await Promise.all([
              api.get("/tasks/project/"+projectId+"/material-ledger"),
              api.get("/tasks/project/"+projectId+"/inventory"),
            ]);
            if (r1.success) setLedger(r1.data || []);
            if (r2.success) setInventory(r2.data || []);
          } catch {}
        }}
      />
    </div>
  );
}

export default TabMaterial;
