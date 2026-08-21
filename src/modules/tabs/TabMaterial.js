import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../config/api";
import apiCache from "../../utils/apiCache";
import uploadManager from "../../utils/uploadManager";
import LibrarySelect from "../../components/LibrarySelect";
import MaterialFlowDrawer from "../../components/MaterialFlowDrawer";
import MRDetailDrawer from "../../components/MRDetailDrawer";
import MaterialTransferTab from "../../components/MaterialTransferTab";
import MaterialLedgerDrawer from "../../components/MaterialLedgerDrawer";
import { T, fmtN, STAGES, STAGE_S } from "../shared/tokens";
import { Pill, Panel, THead } from "../shared/ui";

// ── Dual-unit billing toggle (GRN item) ────────────────────────────────
// Some materials are received by count (TMT = bundle) but billed by weight
// from the weighbridge parchi (kg). This per-item switch captures that second
// billing-basis measurement. Zero config: it learns the unit + conversion
// ratio from this material's last GRN (tenant-scoped) and prefills a *~kg*
// suggestion the site person can correct. Photo proof reuses the existing GRN
// photo attachment. Switch OFF = normal single-unit GRN, no behaviour change.
function DualUnitToggle({ units, primaryUnit, itemName, qty, value, onChange }) {
  const [learned, setLearned] = React.useState(null);   // {unit, alt_unit, ratio}
  const on = !!value?.altOn;
  const nameKey = (itemName || "").trim();

  React.useEffect(() => {
    if (!nameKey) { setLearned(null); return; }
    let alive = true;
    api.get("/procurement/grns/last-alt?name=" + encodeURIComponent(nameKey))
      .then(r => { if (alive && r && r.success) setLearned(r.data || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [nameKey]);

  const ratio = value?.ratio ?? learned?.ratio ?? null;
  const suggestQty = (on && ratio && Number(qty) > 0)
    ? Math.round(Number(qty) * ratio * 100) / 100 : null;

  const toggle = () => {
    if (on) { onChange({ altOn: false, alt_unit: "", alt_qty: "", ratio: null }); return; }
    // Turning ON: default the billing unit to the learned one (else kg), carry
    // the learned ratio so the qty box can prefill, but leave alt_qty editable.
    const defUnit = learned?.alt_unit || (units.includes("Kg") ? "Kg" : units[0]);
    onChange({
      altOn: true,
      alt_unit: value?.alt_unit || defUnit,
      alt_qty: value?.alt_qty || (learned?.ratio && Number(qty) > 0 ? String(Math.round(Number(qty) * learned.ratio * 100) / 100) : ""),
      ratio: learned?.ratio || null,
    });
  };

  const altUnitOptions = units.filter(u => u !== primaryUnit);

  return (
    <div style={{ gridColumn: "1 / -1", paddingTop: on ? 6 : 2 }}>
      <button type="button" onClick={toggle}
        style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
        <span style={{ width: 30, height: 17, borderRadius: 9, background: on ? T.blu : T.b2, position: "relative", transition: "background .15s", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: 2, left: on ? 15 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)" }} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: on ? T.blu : T.t3 }}>Billing unit alag?</span>
        {!on && learned?.alt_unit && (
          <span style={{ fontSize: 10, color: T.t4 }}>· pichhli baar {learned.alt_unit} me bill hua tha</span>
        )}
      </button>
      {on && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, color: T.t3 }}>Billing basis:</span>
          <input type="number" value={value?.alt_qty || ""}
            onChange={e => onChange({ ...value, altOn: true, alt_qty: e.target.value })}
            placeholder={suggestQty != null ? String(suggestQty) : "weighbridge weight"}
            title="Weighbridge parchi ka actual weight — editable"
            style={{ width: 110, padding: "6px 9px", borderRadius: 6, border: "1.5px solid " + T.bluM, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: T.bluL }} />
          <select value={value?.alt_unit || ""}
            onChange={e => onChange({ ...value, altOn: true, alt_unit: e.target.value })}
            style={{ padding: "6px 9px", borderRadius: 6, border: "1.5px solid " + T.bluM, fontSize: 12.5, outline: "none", fontFamily: "inherit", cursor: "pointer", background: T.surface }}>
            {altUnitOptions.map(u => <option key={u}>{u}</option>)}
          </select>
          {suggestQty != null && !value?.alt_qty && (
            <span style={{ fontSize: 10.5, color: T.t4 }}>~{suggestQty} {value?.alt_unit} suggested (×{ratio})</span>
          )}
          <span style={{ fontSize: 10.5, color: T.t4 }}>· parchi photo neeche attach karein</span>
        </div>
      )}
    </div>
  );
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
  const [orderedMRs, setOrderedMRs] = useState([]);
  const [grnRows, setGrnRows] = useState({});
  // Vendor-grouped receive — shared challan/date/received_by per vendor
  // card so user enters them ONCE per delivery instead of per material.
  // Shape: { [vendor_name]: { challan, date, received_by } }
  const [vendorReceive, setVendorReceive] = useState({});
  // Direct Receive — vendor + challan + date moved to global (one per
  // submission) since a single delivery is always from ONE vendor.
  const [directGlobal, setDirectGlobal] = useState({ vendor: "", challan: "", date: new Date().toLocaleDateString('en-CA'), received_by: "" });
  const [directRows, setDirectRows] = useState([{id:1, item_name:"", qty:"", unit:"Bags", vendor:"", challan:"", received_by:""}]);
  const [grnPhotos, setGrnPhotos] = useState([]);
  // Company-level GRN photo policy — true = at least one photo mandatory
  const [grnPhotoRequired, setGrnPhotoRequired] = useState(false);
  useEffect(() => {
    api.get("/settings/company").then(r => {
      if (r?.success && r.data) setGrnPhotoRequired(Number(r.data.grn_photo_required) === 1);
    }).catch(() => {});
  }, []);
  // (Add-new-vendor flow now handled inside <LibrarySelect type="supplier"/>)
  const [grnSaving, setGrnSaving] = useState(false);
  const [grnDone, setGrnDone] = useState([]);
  const [directGrns, setDirectGrns] = useState([]); // Direct GRNs without MR
  const [vendorList, setVendorList] = useState([]);
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
  const MAT_LIB = matLibReal.map(m => m.name);

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
    api.get("/procurement/vendors").then(r => {
      if (r.success) setVendorList(r.data || []);
    }).catch(() => {});
  }, [projectId]);

  const loadMRs = () => {
    // Fetch both MRs and direct GRNs (no linked MR) in parallel
    Promise.all([
      api.get("/procurement/mrs?project_id=" + projectId),
      api.get("/procurement/grns?project_id=" + projectId),
    ]).then(([mrRes, grnRes]) => {
      const mrEntries = (mrRes.success && Array.isArray(mrRes.data))
        ? mrRes.data.map(m => ({
            id: m.id, name: m.item_name,
            qty: (parseFloat(m.quantity)||0) + " " + (m.unit||""),
            stage: m.stage || "Requested",
            by: m.requested_by || "Site Team",
            date: m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
            vendor: m.linked_vendor || null,
            amt: parseFloat(m.approx_amount) || 0,
          }))
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
                date: g.received_date ? new Date(g.received_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
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
    // Fetch both fully-Ordered AND PartialReceived MRs — both still need more material
    Promise.all([
      api.get("/procurement/mrs?project_id=" + projectId + "&stage=Ordered"),
      api.get("/procurement/mrs?project_id=" + projectId + "&mat_status=PartialReceived"),
    ]).then(([r1, r2]) => {
      const m1 = r1?.success  ? (r1.data||[]) : [];
      const m2 = r2?.success  ? (r2.data||[]) : [];
      const seen = new Set();
      setOrderedMRs([...m1, ...m2].filter(m => { if(seen.has(m.id)) return false; seen.add(m.id); return true; }));
    }).catch(()=>{});
    loadPendingTransfers();
    loadPendingIssues();
    setTrReceiveDone([]);
    setTrReceiveQty({});
    setIssueReceiveDone([]);
    setIssueReceiveQty({});
  }, [showGRN, projectId, loadPendingTransfers, loadPendingIssues]);

  const handleReceiveTransfer = async (tr) => {
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
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
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
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

  // GRN handlers
  const handleReceiveMR = async (mrId) => {
    const row = grnRows[mrId] || {};
    if (!row.challan) { alert("Challan number required"); return; }
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    setGrnSaving(true);
    try {
      const mr = orderedMRs.find(m => m.id === mrId);
      const res = await api.patch("/procurement/mrs/" + mrId + "/mark-received", {
        challan_no: row.challan,
        received_qty: parseFloat(row.received_qty) || parseFloat(mr?.quantity) || 0,
        photo_urls: grnPhotos.length ? grnPhotos : null,
      });
      if (res.success) {
        setGrnDone(p => [...p, mrId]);
        // Reload ledger + requests directly
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
        }).catch(() => {});
        api.get("/procurement/mrs?project_id=" + projectId).then(res2 => {
          if (res2.success && Array.isArray(res2.data)) {
            setMaterials(res2.data.map(m => ({
              id: m.id, name: m.item_name,
              qty: (parseFloat(m.quantity)||0) + " " + (m.unit||""),
              stage: m.stage || "Requested",
              by: m.requested_by || "Site Team",
              date: m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
              vendor: m.linked_vendor || null, amt: parseFloat(m.approx_amount) || 0,
            })));
          }
        }).catch(() => {});
      }
      else alert(res.message || "Failed");
    } catch(e) { alert(e.message); }
    setGrnSaving(false);
  };

  // Vendor-grouped receive — one delivery from a vendor can carry multiple
  // MRs (TMT 12mm + 8mm + 10mm in one truck). Loops mark-received per MR
  // with the shared challan + date so the user only enters info once.
  // Skips rows where received_qty is 0/blank → those stay pending for
  // the next delivery.
  const handleReceiveVendor = async (vendor) => {
    const meta = vendorReceive[vendor] || {};
    if (!meta.challan || !meta.challan.trim()) { alert("Challan number required"); return; }
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    const targetMRs = orderedMRs.filter(mr =>
      (mr.linked_vendor || "— Unassigned —") === vendor &&
      !grnDone.includes(mr.id) &&
      Number((grnRows[mr.id] || {}).received_qty || 0) > 0
    );
    if (targetMRs.length === 0) { alert("Kam se kam ek material ka received qty fill karo"); return; }
    setGrnSaving(true);
    let okCount = 0, failures = [];
    for (const mr of targetMRs) {
      const gr = grnRows[mr.id] || {};
      const recvQty = parseFloat(gr.received_qty) || 0;
      const dual = gr.dual;
      try {
        const res = await api.patch("/procurement/mrs/" + mr.id + "/mark-received", {
          challan_no: meta.challan,
          received_qty: recvQty,
          received_date: meta.date || new Date().toLocaleDateString('en-CA'),
          received_by: meta.received_by || meUser?.name || undefined,
          photo_urls: grnPhotos.length ? grnPhotos : null,
          // Dual-unit billing basis (weighbridge weight), if the switch is on.
          alt_qty:  dual?.altOn && Number(dual.alt_qty) > 0 ? parseFloat(dual.alt_qty) : null,
          alt_unit: dual?.altOn && Number(dual.alt_qty) > 0 && dual.alt_unit ? dual.alt_unit : null,
        });
        if (res.success) { setGrnDone(p => [...p, mr.id]); okCount += 1; }
        else failures.push(`${mr.item_name}: ${res.message||"failed"}`);
      } catch (e) { failures.push(`${mr.item_name}: ${e.message}`); }
    }
    // Single reload after the whole vendor batch
    api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
      if (r.success) { setLedger(r.data || []); setLedgerLoaded(true); }
    }).catch(() => {});
    api.get("/procurement/mrs?project_id=" + projectId).then(res2 => {
      if (res2.success && Array.isArray(res2.data)) {
        setMaterials(res2.data.map(m => ({
          id: m.id, name: m.item_name,
          qty: (parseFloat(m.quantity)||0) + " " + (m.unit||""),
          stage: m.stage || "Requested",
          by: m.requested_by || "Site Team",
          date: m.created_at ? new Date(m.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}) : "—",
          vendor: m.linked_vendor || null, amt: parseFloat(m.approx_amount) || 0,
        })));
      }
    }).catch(() => {});
    setGrnSaving(false);
    if (failures.length > 0) {
      alert(`Received ${okCount}/${targetMRs.length}. Errors:\n${failures.join("\n")}`);
    }
  };

  const handleDirectReceive = async () => {
    // Global vendor/challan/date — Direct Receive is single-vendor.
    if (!directGlobal.vendor) { alert("Vendor select karo"); return; }
    if (!directGlobal.challan) { alert("Challan number daalo"); return; }
    const validRows = directRows.filter(r => r.item_name && Number(r.qty) > 0);
    if (!validRows.length) { alert("Kam se kam ek material + qty required hai"); return; }
    if (grnPhotoRequired && grnPhotos.length === 0) {
      alert("Company policy: GRN ke saath kam se kam ek photo attach karo (challan / material).");
      return;
    }
    setGrnSaving(true);
    try {
      const res = await api.post("/procurement/grns", {
        po_id: null,
        vendor_name: directGlobal.vendor,
        project_id: projectId,
        project_name: projectName,
        challan_no: directGlobal.challan,
        received_by: directGlobal.received_by || meUser?.name || null,
        received_date: directGlobal.date || new Date().toISOString().split("T")[0],
        photo_urls: grnPhotos.length ? grnPhotos : null,
        items: validRows.map(r => ({
          po_item_id: null,
          description: r.item_name,
          ordered_qty: parseFloat(r.qty),
          received_qty: parseFloat(r.qty),
          unit: r.unit || "Bags",
          // Dual-unit: only send when switch is ON with a real weight + unit.
          alt_qty:  r.dual?.altOn && Number(r.dual.alt_qty) > 0 ? parseFloat(r.dual.alt_qty) : null,
          alt_unit: r.dual?.altOn && Number(r.dual.alt_qty) > 0 && r.dual.alt_unit ? r.dual.alt_unit : null,
        })),
      });
      if (res.success) {
        setShowGRN(false);
        setDirectRows([{id:1, item_name:"", qty:"", unit:"Bags"}]);
        setDirectGlobal({vendor:"", challan:"", date: new Date().toLocaleDateString('en-CA'), received_by:""});
        setGrnPhotos([]);
        // Reload MRs + direct GRNs + ledger + inventory
        loadMRs();
        // Reload ledger + inventory
        setLedgerLoading(true);
        api.get("/tasks/project/" + projectId + "/material-ledger").then(r => {
          if (r.success) setLedger(r.data || []);
          setLedgerLoaded(true);
          setLedgerLoading(false);
        }).catch(() => setLedgerLoading(false));
        setInvLoading(true);
        api.get("/tasks/project/" + projectId + "/inventory").then(r => {
          if (r.success) setInventory(r.data || []);
          setInvLoaded(true);
          setInvLoading(false);
        }).catch(() => setInvLoading(false));
        alert("GRN created: " + res.grn_number);
      } else {
        alert(res.message || "GRN failed");
      }
    } catch(e) { alert(e.message); }
    setGrnSaving(false);
  };

  const handleSubmitMR = async () => {
    if (mrSubmitRef.current) return; // hard guard against double-fire
    // Validate at least one filled row
    const validItems = (form.items || []).filter(it => it.item_name?.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) {
      alert("At least one material with quantity is required");
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
            date:new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
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
  const TABS = [{id:"requests",l:"Requests"},{id:"ledger",l:"Material Inventory"},{id:"transfer",l:"Transfer"}];

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
                <div style={{fontSize:14,fontWeight:700,color:"white",letterSpacing:"-.2px"}}>📦 New Material Request</div>
                <div style={{fontSize:10.5,color:"rgba(255,255,255,0.42)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{projectName}</div>
              </div>
              <button onClick={()=>setShowAddLib(s=>!s)}
                style={{padding:"5px 11px",borderRadius:6,background:showAddLib?"rgba(168,85,247,0.35)":"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.55)",color:"#C4B5FD",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(168,85,247,0.3)"}
                onMouseLeave={e=>e.currentTarget.style.background=showAddLib?"rgba(168,85,247,0.35)":"rgba(168,85,247,0.15)"}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                {showAddLib ? "Cancel" : "+ Library"}
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
              <span style={{fontSize:11.5,color:"#92400E",lineHeight:1.4}}>Request → Admin approves → Purchase Order → Received at site</span>
            </div>

            {/* ── Scrollable body ─────────────────────────────────── */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:14}}>

              {/* Add-to-library inline form */}
              {showAddLib && (
                <div style={{padding:"12px 14px",background:T.purL,border:`1.5px solid ${T.purM}`,borderRadius:9}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.pur,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
                    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.pur} strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Add new material to Library
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 100px 76px",gap:8,alignItems:"center"}}>
                    <input value={libNewName} onChange={e=>setLibNewName(e.target.value)} placeholder="Material name *" autoFocus
                      style={{padding:"8px 10px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12.5,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                    <select value={libNewUnit} onChange={e=>setLibNewUnit(e.target.value)}
                      style={{padding:"8px 9px",borderRadius:6,border:`1.5px solid ${T.purM}`,fontSize:12,color:T.t1,background:"white",outline:"none",fontFamily:"inherit",boxSizing:"border-box",cursor:"pointer"}}>
                      <option value="">Unit</option>
                      {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                    </select>
                    <button onClick={saveLibMaterial} disabled={!libNewName.trim()||libSaving}
                      style={{padding:"8px 0",borderRadius:6,background:libNewName.trim()?T.pur:T.b1,color:libNewName.trim()?"white":T.t4,border:"none",fontSize:12,fontWeight:700,cursor:libNewName.trim()?"pointer":"not-allowed",fontFamily:"inherit"}}>
                      {libSaving?"…":"Save"}
                    </button>
                  </div>
                  <div style={{fontSize:10,color:T.pur,marginTop:6,opacity:.72}}>Save hone ke baad item rows mein immediately available hoga.</div>
                </div>
              )}

              {/* ── Items table ──────────────────────────────────── */}
              <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.b1}`,overflow:"hidden"}}>
                {/* Table header bar */}
                <div style={{background:"#0D1B2A",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:"white"}}>Items</span>
                    <span style={{fontSize:10,color:"rgba(255,255,255,0.38)"}}>Library se pick karein · unit auto-locked</span>
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
                          placeholder="Pick material..."/>
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
                          <div title="Unit Material Library se aata hai"
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
                          <div style={{fontWeight:700,marginBottom:3}}>⚠ Already in pipeline · Pending: <b>{pipe.total_pending_qty} {pipe.unit||""}</b></div>
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
                    Add another item
                  </button>
                </div>
              </div>

              {/* Required By + Notes — side by side */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>
                    Required By <span style={{fontSize:9,fontWeight:500,textTransform:"none",color:T.t4}}>(all items)</span>
                  </label>
                  <input type="date" value={form.required_date} onChange={e=>setForm(p=>({...p,required_date:e.target.value}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:5}}>Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={1} placeholder="Special requirements…"
                    style={{width:"100%",padding:"8px 10px",borderRadius:7,border:`1.5px solid ${T.b1}`,fontSize:12.5,color:T.t1,background:T.surface,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"none",minHeight:38}}/>
                </div>
              </div>

              {/* Photos */}
              <div>
                <label style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".5px",display:"block",marginBottom:7}}>
                  Photos <span style={{fontSize:9,fontWeight:500,textTransform:"none"}}>(optional)</span>
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
                    <span style={{fontSize:10,fontWeight:600}}>Add</span>
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
                  <span style={{fontSize:10,color:T.t4}}>Camera opens on mobile · multi-select ok</span>
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
                    Cancel
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    {validCount > 0
                      ? <div style={{fontSize:10.5,color:T.blu,fontWeight:600}}>{validCount} item{validCount!==1?"s":""} ready · {(form.items||[]).filter(it=>!it.item_name?.trim()).length > 0 && <span style={{color:T.t4,fontWeight:400}}>unfilled rows will be skipped</span>}</div>
                      : <div style={{fontSize:10.5,color:T.t4}}>Pick at least one item to submit</div>
                    }
                  </div>
                  <button onClick={handleSubmitMR} disabled={!canSubmit}
                    style={{padding:"9px 22px",borderRadius:8,background:canSubmit?"#0D1B2A":"#CBD5E1",color:"white",border:"none",fontSize:12.5,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",transition:"all .15s",flexShrink:0,minWidth:150}}>
                    {saving ? "Submitting…" : canSubmit ? `Submit${validCount>1?" "+validCount+" Requests":" Request"}` : "Select items first"}
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
                <div style={{fontSize:15,fontWeight:700,color:"white"}}>Material Used Log</div>
                <button onClick={()=>setShowUsedLog(false)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",display:"flex"}}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{projectName} · {usedLog.length} entries</div>
            </div>
            {/* Filters */}
            <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.b1,background:"#F8FAFC",flexShrink:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                <input value={ulFilterMat} onChange={e=>setUlFilterMat(e.target.value)} placeholder="Filter by material..."
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                <input value={ulFilterTask} onChange={e=>setUlFilterTask(e.target.value)} placeholder="Filter by task..."
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                <input value={ulFilterBy} onChange={e=>setUlFilterBy(e.target.value)} placeholder="Used by..."
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11.5,outline:"none",fontFamily:"inherit"}}/>
                <input type="date" value={ulFilterFrom} onChange={e=>setUlFilterFrom(e.target.value)}
                  title="From date"
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                <input type="date" value={ulFilterTo} onChange={e=>setUlFilterTo(e.target.value)}
                  title="To date"
                  style={{padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:11,outline:"none",fontFamily:"inherit"}}/>
              </div>
              {(ulFilterMat||ulFilterTask||ulFilterBy||ulFilterFrom||ulFilterTo)&&(
                <button onClick={()=>{setUlFilterMat("");setUlFilterTask("");setUlFilterBy("");setUlFilterFrom("");setUlFilterTo("");}}
                  style={{marginTop:6,background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:11,padding:0,fontWeight:600}}>
                  × Clear filters
                </button>
              )}
            </div>
            {/* Table */}
            <div style={{flex:1,overflowY:"auto"}}>
              {usedLogLoading&&<div style={{textAlign:"center",padding:"60px 0",color:T.t4}}><div style={{width:28,height:28,border:"3px solid #E2E8F0",borderTopColor:"#3B82F6",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}></div>Loading...</div>}
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
                    {usedLog.length===0?"No used entries yet":"No entries match filters"}
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
                        <div style={{fontSize:11.5,color:T.t2}}>{u.user_name||"Site"}</div>
                        <div style={{fontSize:11,color:T.t3}}>
                          {u.task_name&&<div style={{color:T.blu,fontWeight:600,fontSize:10.5}}>{u.task_no} {u.task_name}</div>}
                          {u.remark&&<div>{u.remark}</div>}
                          {!u.task_name&&!u.remark&&"—"}
                        </div>
                        <div style={{display:"flex",justifyContent:"center"}}>
                          {showDel?(
                            <button title="Delete this usage entry"
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
                      <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{filtered.length} entries shown</span>
                      <span style={{fontSize:13,fontWeight:800,color:T.amb}}>
                        Total: {filtered.reduce((s,u)=>s+Number(u.used_qty||0),0).toFixed(2)}
                      </span>
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
                <div style={{fontSize:14,fontWeight:700,color:"white",letterSpacing:"-.2px"}}>📥 Record GRN — Material Received</div>
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
              {[{id:"ordered",label:"Ordered Materials"},{id:"direct",label:"Direct Receive"}].map(t=>{
                const isActive=grnTab===t.id;
                const badge=t.id==="ordered"?(orderedMRs.length+pendingTransfers.length+pendingIssues.length):0;
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
                        <span style={{fontSize:11.5,fontWeight:700,color:T.amb}}>Issues from Warehouse — site team receive karega ({pendingIssues.length})</span>
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
                                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.ambL,color:T.amb,fontWeight:600,border:"1px solid "+T.ambM}}>Material In</span>
                                  {iss.status==="Partial"&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:600}}>Partial</span>}
                                </div>
                                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>From: 🔒 Warehouse</div>
                                <div style={{fontSize:11,color:T.t4,marginTop:2}}>Qty: {totalQty.toFixed(2)} · Value: ₹{totalValue.toLocaleString("en-IN")} · issued to {iss.issued_to_name||"—"} · by {iss.issued_by_name||"—"}</div>
                              </div>
                              {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>✓ Received</span>}
                            </div>
                            {!isDone&&(
                              <>
                                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px",marginBottom:9,border:"1px solid "+T.b1}}>
                                  <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Items received</div>
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
                                          <div style={{fontSize:10,color:T.t4}}>Sent: {sent.toFixed(2)} {it.unit}</div>
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
                                    {issueReceiving?"...":"✓ Receive — GRN bana do"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {(orderedMRs.length+pendingTransfers.length)>0&&<div style={{height:1,background:T.b1,margin:"14px 0 10px"}}/>}
                    </div>
                  )}
                  {/* ── INCOMING TRANSFERS (project-to-project) ────────── */}
                  {pendingTransfers.length>0&&(
                    <div style={{marginBottom:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",background:T.cynL,border:"1px solid "+T.cynM,borderRadius:7,marginBottom:8}}>
                        <span style={{fontSize:14}}>🔄</span>
                        <span style={{fontSize:11.5,fontWeight:700,color:T.cyn}}>Incoming transfers — kisi aur project se aaya material ({pendingTransfers.length})</span>
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
                                  <span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.cynL,color:T.cyn,fontWeight:600,border:"1px solid "+T.cynM}}>Transfer in</span>
                                  {tr.status==="Partial"&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:10,background:T.bluL,color:T.blu,fontWeight:600}}>Partial</span>}
                                </div>
                                <div style={{fontSize:12.5,fontWeight:700,color:T.t1}}>From: {tr.from_project_name||tr.from_location||"—"}</div>
                                <div style={{fontSize:11,color:T.t4,marginTop:2}}>Qty: {totalQty.toFixed(2)} · Value: ₹{totalValue.toLocaleString("en-IN")} · by {tr.transferred_by_name||"—"}</div>
                              </div>
                              {isDone&&<span style={{fontSize:11,fontWeight:700,color:T.grn,background:T.grnL,padding:"3px 10px",borderRadius:20,border:"1px solid "+T.grnM}}>✓ Received</span>}
                            </div>
                            {!isDone&&(
                              <>
                                <div style={{background:T.surfaceB,borderRadius:7,padding:"8px 10px",marginBottom:9,border:"1px solid "+T.b1}}>
                                  <div style={{fontSize:9.5,color:T.t4,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px",marginBottom:5}}>Items received</div>
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
                                          <div style={{fontSize:10,color:T.t4}}>Sent: {sent.toFixed(2)} {it.unit}</div>
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
                                    {trReceiving?"...":"✓ Receive — GRN bana do"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {orderedMRs.length>0&&<div style={{height:1,background:T.b1,margin:"14px 0 10px"}}/>}
                    </div>
                  )}
                  {orderedMRs.length===0&&pendingTransfers.length===0&&pendingIssues.length===0&&<div style={{textAlign:"center",padding:"40px",color:T.t4}}><div style={{fontSize:13,fontWeight:600,color:T.t2,marginBottom:4}}>Koi ordered material, transfer, ya warehouse issue pending nahi</div></div>}
                  {/* Vendor-grouped receive — one delivery from a vendor
                      typically carries multiple materials (TMT 12mm + 8mm
                      + 10mm in one truck). Group by linked_vendor, share
                      challan + date inputs across all materials from same
                      vendor, single "Receive" button processes the batch. */}
                  {(() => {
                    // Group active (not-yet-done) MRs by linked_vendor
                    const groups = {};
                    orderedMRs.forEach(mr => {
                      if (grnDone.includes(mr.id)) return;
                      const v = mr.linked_vendor || "— Unassigned —";
                      if (!groups[v]) groups[v] = [];
                      groups[v].push(mr);
                    });
                    const vendorList = Object.keys(groups).sort();
                    const doneMRs = orderedMRs.filter(mr => grnDone.includes(mr.id));
                    return (
                      <>
                        {vendorList.map(vendor => {
                          const mrs = groups[vendor];
                          const meta = vendorReceive[vendor] || {};
                          const filledCount = mrs.filter(mr => Number((grnRows[mr.id]||{}).received_qty||0) > 0).length;
                          return (
                            <div key={vendor} style={{background:T.surface,border:"1px solid "+T.b1,borderRadius:8,marginBottom:10,borderLeft:"3px solid "+T.blu,overflow:"hidden"}}>
                              {/* Vendor header */}
                              <div style={{padding:"10px 14px",background:T.bluL+"66",borderBottom:"1px solid "+T.b1,display:"flex",alignItems:"center",gap:8}}>
                                <span style={{fontSize:14}}>🏭</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:700,color:T.t1}}>{vendor}</div>
                                  <div style={{fontSize:10.5,color:T.t4,marginTop:1}}>{mrs.length} pending material{mrs.length>1?"s":""}</div>
                                </div>
                                {filledCount>0&&<span style={{fontSize:10.5,fontWeight:700,color:T.grn,background:T.grnL,border:"1px solid "+T.grnM,padding:"2px 9px",borderRadius:20}}>{filledCount} qty filled</span>}
                              </div>
                              {/* Shared challan + date + received_by */}
                              <div style={{padding:"10px 14px",background:T.surfaceB,borderBottom:"1px solid "+T.b1,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                                <div>
                                  <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Challan No. *</label>
                                  <input value={meta.challan||""} onChange={e=>setVendorReceive(p=>({...p,[vendor]:{...p[vendor],challan:e.target.value}}))}
                                    placeholder="e.g. CH-445"
                                    style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                                </div>
                                <div>
                                  <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Delivery Date</label>
                                  <input type="date" value={meta.date||new Date().toLocaleDateString('en-CA')} onChange={e=>setVendorReceive(p=>({...p,[vendor]:{...p[vendor],date:e.target.value}}))}
                                    style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                                </div>
                                <div>
                                  <label style={{fontSize:9.5,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Received By</label>
                                  <input
                                    value={meta.received_by !== undefined ? meta.received_by : (meUser?.name || "")}
                                    onChange={e=>setVendorReceive(p=>({...p,[vendor]:{...p[vendor],received_by:e.target.value}}))}
                                    placeholder={meUser?.name || "Site person"}
                                    title="Default: logged-in user. Override karne ke liye type karein."
                                    style={{width:"100%",padding:"6px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                                </div>
                              </div>
                              {/* Per-material rows */}
                              <div style={{padding:"4px 14px 10px"}}>
                                <div style={{display:"grid",gridTemplateColumns:"100px 1fr 90px 110px 70px",gap:7,padding:"6px 0",fontSize:9,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>
                                  <span>MR No</span><span>Material</span><span style={{textAlign:"right"}}>Pending</span><span style={{textAlign:"right"}}>Receive Qty</span><span></span>
                                </div>
                                {mrs.map(mr => {
                                  const row = grnRows[mr.id] || {};
                                  const alreadyReceived = Number(mr.received_qty || 0);
                                  const orderedQty     = Number(mr.quantity || 0);
                                  const pendingQty     = Math.max(0, orderedQty - alreadyReceived);
                                  const isPartial      = mr.mat_status === "PartialReceived";
                                  const recv = Number(row.received_qty||0);
                                  const over = recv > pendingQty;
                                  return (
                                    <div key={mr.id} style={{display:"grid",gridTemplateColumns:"100px 1fr 90px 110px 70px",gap:7,padding:"7px 0",borderTop:"1px dashed "+T.b1,alignItems:"center"}}>
                                      <div>
                                        <span style={{fontSize:11,color:T.amb,fontWeight:700,fontFamily:"monospace"}}>{mr.mr_number||`MR-${mr.id}`}</span>
                                        {isPartial&&<div style={{fontSize:9,color:T.amb,fontWeight:700,background:T.ambL,border:"1px solid "+T.ambM,borderRadius:4,padding:"1px 5px",marginTop:2,display:"inline-block"}}>Partial</div>}
                                      </div>
                                      <div style={{minWidth:0}}>
                                        <div style={{fontSize:12,fontWeight:600,color:T.t1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mr.item_name}</div>
                                        {isPartial
                                          ? <div style={{fontSize:10,color:T.amb}}>Ordered {orderedQty} · Received {alreadyReceived} · <b>Pending {pendingQty}</b></div>
                                          : mr.approx_amount>0&&<div style={{fontSize:10,color:T.t4}}>@ ₹{Math.round(Number(mr.approx_amount)/Number(mr.quantity||1)).toLocaleString("en-IN")}/{mr.unit}</div>
                                        }
                                      </div>
                                      <span style={{fontSize:11.5,color:isPartial?T.amb:T.t2,fontWeight:700,textAlign:"right"}}>{pendingQty} {mr.unit}</span>
                                      <input type="number" value={row.received_qty||""}
                                        onChange={e=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],received_qty:e.target.value}}))}
                                        placeholder={String(pendingQty)}
                                        style={{padding:"6px 8px",borderRadius:5,border:"1.5px solid "+(over?T.red:T.b1),fontSize:11.5,textAlign:"right",fontFamily:"inherit",outline:"none",background:over?T.redL:T.surface,color:over?T.red:T.t1}}/>
                                      <span style={{fontSize:10.5,color:T.t4}}>{mr.unit}</span>
                                      {recv>0&&(
                                        <DualUnitToggle units={UNITS_MR} primaryUnit={mr.unit} itemName={mr.item_name} qty={row.received_qty}
                                          value={row.dual} onChange={d=>setGrnRows(p=>({...p,[mr.id]:{...p[mr.id],dual:d}}))}/>
                                      )}
                                    </div>
                                  );
                                })}
                                {/* Single Receive button — vendor batch */}
                                <div style={{display:"flex",justifyContent:"flex-end",marginTop:10,paddingTop:8,borderTop:"1.5px solid "+T.b1}}>
                                  <button onClick={()=>handleReceiveVendor(vendor)} disabled={grnSaving||!meta.challan||filledCount===0}
                                    title={!meta.challan?"Challan no daalo":filledCount===0?"Kam se kam ek material ka qty fill karo":""}
                                    style={{padding:"8px 18px",borderRadius:6,background:(meta.challan&&filledCount>0)?T.grn:T.b1,border:"none",color:"white",fontSize:12.5,fontWeight:700,cursor:(meta.challan&&filledCount>0)?"pointer":"not-allowed",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                                    {grnSaving?"...":`✓ Receive (${filledCount} item${filledCount===1?"":"s"})`}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* Completed (received) MRs — collapsed summary */}
                        {doneMRs.length>0&&(
                          <div style={{marginTop:10,padding:"8px 12px",background:T.grnL,border:"1px solid "+T.grnM,borderRadius:7,fontSize:11.5,color:T.grn,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:13}}>✓</span>
                            <span>{doneMRs.length} material{doneMRs.length>1?"s":""} received this session — {doneMRs.map(m=>m.item_name).join(", ")}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              {grnTab==="direct"&&(
                <div>
                  <div style={{background:T.bluL,border:"1px solid "+T.bluM,borderRadius:7,padding:"8px 11px",fontSize:11.5,color:T.blu,marginBottom:12}}>
                    Bina PO ke directly site pe aaya material — ek vendor ka multiple items ek hi GRN me receive karo
                  </div>
                  {/* Global vendor + challan + date — one per submission */}
                  <div style={{background:T.surface,border:"1.5px solid "+T.bluM,borderRadius:8,padding:"12px",marginBottom:12,borderLeft:"3px solid "+T.blu}}>
                    <div style={{fontSize:10.5,fontWeight:700,color:T.blu,textTransform:"uppercase",letterSpacing:".4px",marginBottom:8}}>🏭 Delivery details (single vendor, one challan)</div>
                    <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr",gap:8}}>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Vendor *</label>
                        <LibrarySelect type="supplier" value={directGlobal.vendor}
                          onChange={v=>setDirectGlobal(p=>({...p,vendor:v||""}))}
                          onAdded={(v)=>setVendorList(prev=>[...prev,v].sort((a,b)=>(a.name||"").localeCompare(b.name||"")))}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Challan No. *</label>
                        <input value={directGlobal.challan} onChange={e=>setDirectGlobal(p=>({...p,challan:e.target.value}))} placeholder="e.g. CH-445"
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Date</label>
                        <input type="date" value={directGlobal.date} onChange={e=>setDirectGlobal(p=>({...p,date:e.target.value}))}
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:600,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:4}}>Received By</label>
                        <input
                          value={directGlobal.received_by !== undefined && directGlobal.received_by !== "" ? directGlobal.received_by : (meUser?.name || "")}
                          onChange={e=>setDirectGlobal(p=>({...p,received_by:e.target.value}))}
                          placeholder={meUser?.name || "Site person"}
                          title="Default: logged-in user. Override karne ke liye type karein."
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                      </div>
                    </div>
                  </div>
                  {/* Items table — multiple materials in one delivery */}
                  <div style={{fontSize:10.5,fontWeight:700,color:T.t3,textTransform:"uppercase",letterSpacing:".4px",marginBottom:7}}>📦 Items received <span style={{textTransform:"none",letterSpacing:0,color:T.t4,fontWeight:500}}>· same vendor / same challan</span></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 28px",gap:7,padding:"5px 8px",background:T.surfaceB,borderRadius:6,border:"1px solid "+T.b1,marginBottom:5}}>
                    {["Material Name *","Qty *","Unit","",].map((h,i)=>(<span key={i} style={{fontSize:9.5,fontWeight:700,color:T.t4,textTransform:"uppercase",letterSpacing:".3px"}}>{h}</span>))}
                  </div>
                  {directRows.map((row,i)=>{
                    const libMatch = matLibReal.find(m => (m.name||"").trim().toLowerCase() === (row.item_name||"").trim().toLowerCase());
                    const isLocked = !!row.item_name;
                    const displayUnit = libMatch?.unit || row.unit || "Bags";
                    return (
                      <div key={row.id} style={{display:"grid",gridTemplateColumns:"1fr 80px 90px 28px",gap:7,padding:"6px 8px",alignItems:"center",borderBottom:i<directRows.length-1?"1px dashed "+T.b1:"none"}}>
                        <div>
                          <input value={row.item_name} onChange={e=>{
                              const v=e.target.value;
                              const m=matLibReal.find(x=>(x.name||"").trim().toLowerCase()===v.trim().toLowerCase());
                              setDirectRows(p=>p.map(r=>r.id===row.id?{...r,item_name:v,unit:m?.unit||r.unit}:r));
                            }}
                            placeholder="e.g. Cement OPC 53" list={"mat_lib_"+row.id}
                            style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                          <datalist id={"mat_lib_"+row.id}>{MAT_LIB.map(m=><option key={m} value={m}/>)}</datalist>
                        </div>
                        <input type="number" value={row.qty} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,qty:e.target.value}:r))} placeholder="0"
                          style={{width:"100%",padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                        {isLocked ? (
                          <div title="Library me change karein" style={{padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t2,background:T.surfaceB,fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:5,height:33,boxSizing:"border-box",justifyContent:"center"}}>
                            <span style={{fontSize:9}}>🔒</span>{displayUnit}
                          </div>
                        ) : (
                          <select value={row.unit} onChange={e=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,unit:e.target.value}:r))}
                            style={{padding:"7px 9px",borderRadius:6,border:"1.5px solid "+T.b1,fontSize:12.5,outline:"none",boxSizing:"border-box",fontFamily:"inherit",cursor:"pointer"}}>
                            {UNITS_MR.map(u=><option key={u}>{u}</option>)}
                          </select>
                        )}
                        {directRows.length>1?(
                          <button onClick={()=>setDirectRows(p=>p.filter(r=>r.id!==row.id))} title="Remove row"
                            style={{width:26,height:26,borderRadius:6,background:T.redL,border:"1px solid "+T.redM,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2.4} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        ):<span/>}
                        <DualUnitToggle units={UNITS_MR} primaryUnit={displayUnit} itemName={row.item_name} qty={row.qty}
                          value={row.dual} onChange={d=>setDirectRows(p=>p.map(r=>r.id===row.id?{...r,dual:d}:r))}/>
                      </div>
                    );
                  })}
                  <button onClick={()=>setDirectRows(p=>[...p,{id:Date.now(),item_name:"",qty:"",unit:"Bags"}])}
                    style={{width:"100%",padding:"9px",borderRadius:7,border:"1.5px dashed "+T.bluM,background:"transparent",color:T.blu,fontSize:12,cursor:"pointer",marginTop:6,fontWeight:600,fontFamily:"inherit"}}>
                    + Add Another Item
                  </button>
                </div>
              )}

              {/* ── Photos section (inside scroll body) ── */}
              <div style={{marginTop:18,borderTop:"1px solid "+T.b1,paddingTop:14}}>
                <div style={{fontSize:10.5,fontWeight:700,color:grnPhotoRequired&&grnPhotos.length===0?T.amb:T.t3,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                  📷 GRN Photos
                  <span style={{textTransform:"none",fontSize:10,fontWeight:500,color:T.t4}}>(challan / material / quality)</span>
                  {grnPhotoRequired&&(
                    <span style={{textTransform:"none",fontSize:9.5,fontWeight:700,color:grnPhotos.length===0?T.red:T.grn,background:grnPhotos.length===0?T.redL:T.grnL,padding:"2px 8px",borderRadius:10,border:`1px solid ${grnPhotos.length===0?T.redM:T.grnM}`}}>
                      {grnPhotos.length===0?"⚠ Required":"✓ Attached"}
                    </span>
                  )}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {grnPhotos.map((url,idx)=>(
                    <div key={idx} style={{position:"relative",width:64,height:64,borderRadius:7,overflow:"hidden",border:"1px solid "+T.b1,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                      <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      <button onClick={()=>setGrnPhotos(p=>p.filter((_,i)=>i!==idx))}
                        style={{position:"absolute",top:3,right:3,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,0.65)",color:"white",border:"none",fontSize:10,cursor:"pointer",lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                    </div>
                  ))}
                  <label style={{width:64,height:64,borderRadius:7,border:"1.5px dashed "+T.b2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexDirection:"column",gap:2,transition:"border-color .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=T.blu}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=T.b2}>
                    <span style={{fontSize:18}}>📷</span>
                    <span style={{fontSize:10,color:T.t4,fontWeight:600}}>Add</span>
                    <input type="file" accept="image/*" capture="environment" multiple style={{display:"none"}}
                      onChange={e=>{
                        const files=Array.from(e.target.files||[]);
                        files.forEach(file=>{
                          uploadManager.add({
                            file, folder:"gb_buildcon/grn",
                            label:"GRN photo: "+file.name,
                            onDone:(url)=>setGrnPhotos(p=>[...p,url]),
                          });
                        });
                        e.target.value="";
                      }}/>
                  </label>
                </div>
                <div style={{marginTop:5,fontSize:10,color:T.t4}}>Camera opens on mobile · Multi-select supported</div>
              </div>

            </div>{/* end scroll body */}

            {/* ── Sticky footer ── */}
            <div style={{padding:"12px 18px",borderTop:"1px solid "+T.b1,background:T.bg,display:"flex",gap:10,flexShrink:0}}>
              <button onClick={()=>setShowGRN(false)}
                style={{flex:1,padding:"9px",borderRadius:7,background:T.surface,border:"1px solid "+T.b1,fontSize:12.5,fontWeight:600,color:T.t3,cursor:"pointer",fontFamily:"inherit"}}>
                Close
              </button>
              {grnTab==="direct"&&(
                <button onClick={handleDirectReceive} disabled={grnSaving}
                  style={{flex:2,padding:"9px",borderRadius:7,background:grnSaving?"#ccc":T.grn,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:grnSaving?"not-allowed":"pointer",fontFamily:"inherit",letterSpacing:"-.1px"}}>
                  {grnSaving?"Saving…":"✅ Submit GRN"}
                </button>
              )}
              {grnTab==="ordered"&&grnDone.length>0&&(
                <button onClick={()=>setShowGRN(false)}
                  style={{flex:2,padding:"9px",borderRadius:7,background:T.grn,border:"none",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                  Done ✓ ({grnDone.length} received)
                </button>
              )}
            </div>

          </div>{/* end drawer */}
        </>)}

        {/* Toolbar */}
        <div style={{background:T.surface,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",border:"1px solid "+T.b1}}>
          <div style={{position:"relative",flex:1,minWidth:180}}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search material..."
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
          <span style={{fontSize:11,color:T.t4}}>{filtered.length} items · Rs.{fmtN(totalAmt)}</span>
          <button onClick={()=>setShowModal(true)}
            style={{padding:"7px 13px",borderRadius:7,background:T.blu,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
            New Request
          </button>
          <button onClick={()=>setShowGRN(true)}
            style={{padding:"7px 13px",borderRadius:7,background:T.grn,color:"white",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>
            Record GRN
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
                      {m.vendor&&<span style={{fontSize:11,color:T.blu}}>🏪 {m.vendor}</span>}
                      {m.isDirect&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:"#DCFCE7",color:"#16A34A",border:"1px solid #BBF7D0"}}>Direct</span>}
                      {m.isViaBill&&<span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:"#FEF3C7",color:"#92400E",border:"1px solid #FDE68A"}}>Via Bill</span>}
                      {m.challan&&<span style={{fontSize:9,color:T.t4}}>CH: {m.challan}</span>}
                    </div>
                    <div style={{fontSize:11,color:T.t4}}>{m.date} · {m.by}</div>
                  </div>
                  <div style={{padding:"7px 12px",borderTop:"1px solid "+T.b1,background:T.surfaceB,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,color:T.t4}}>By {(m.by||"—").split(" ")[0]}</span>
                    <span style={{fontSize:13,fontWeight:700,color:T.t1}}>Rs.{fmtN(m.amt||0)}</span>
                  </div>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{gridColumn:"1/-1",padding:"48px",textAlign:"center",color:T.t4,background:T.surface,borderRadius:8,border:"1px solid "+T.b1}}>No materials found</div>}
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
                  <span style={{fontSize:12,color:T.t2}}>{m.qty}</span>
                  <Pill label={m.stage} c={ss.c} bg={ss.bg}/>
                  <span style={{fontSize:12,color:T.t2}}>{m.vendor||"—"}
                    {m.isDirect&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#DCFCE7",color:"#16A34A"}}>Direct</span>}
                    {m.isViaBill&&<span style={{marginLeft:5,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:"#FEF3C7",color:"#92400E"}}>Via Bill</span>}
                  </span>
                  <span style={{fontSize:12,color:T.t2}}>{(m.by||"—").split(" ")[0]}</span>
                  <span style={{fontSize:13,fontWeight:600,color:T.t1}}>Rs.{fmtN(m.amt||0)}</span>
                </div>
              );
            })}
            {filtered.length===0&&<div style={{padding:"40px",textAlign:"center",color:T.t4}}>No materials found</div>}
          </Panel>
        )}
      </>)}

      {/* ══════════════════════════════════════════════════════
          TAB 2: MATERIAL LEDGER
      ══════════════════════════════════════════════════════ */}
      {activeTab==="ledger"&&(
        <div>
          {ledgerLoading&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>Loading ledger...</div>}
          {!ledgerLoading&&(
            <div>
              {/* Search + Vendor filter */}
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <div style={{position:"relative",flex:1}}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={1.8} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)"}}><path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                  <input value={ledgerSearch} onChange={e=>setLedgerSearch(e.target.value)} placeholder="Search material..."
                    style={{width:"100%",padding:"7px 9px 7px 28px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12.5,color:T.t1,background:"white",outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                </div>
                <select value={ledgerVendor} onChange={e=>setLedgerVendor(e.target.value)}
                  style={{padding:"7px 10px",borderRadius:7,border:"1.5px solid "+T.b1,fontSize:12,color:T.t1,background:"white",fontFamily:"inherit",cursor:"pointer"}}>
                  {allVendors.map(v=><option key={v}>{v}</option>)}
                </select>
              </div>

              {ledgerFiltered.length===0&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>No material data — Record GRN to see ledger</div>}

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
                          <span style={{fontSize:10.5,color:isOpen?"rgba(255,255,255,0.5)":T.t4,marginLeft:8}}>{mat.unit} · {mat.receipts?.length||0} GRN · {mat.usage?.length||0} used entries</span>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:20,alignItems:"center"}}>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>Received</div>
                          <div style={{fontSize:14,fontWeight:700,color:isOpen?"#4ADE80":T.grn}}>{mat.total_received}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>Used</div>
                          <div style={{fontSize:14,fontWeight:700,color:isOpen?"#FCD34D":T.amb}}>{mat.total_used}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:10,color:isOpen?"rgba(255,255,255,0.4)":T.t4}}>Balance</div>
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
                              {markUsedOpen?"▲ Cancel":"▼ Mark Used"}
                            </button>
                          )}
                        </div>

                        {/* Inline Mark-Used form */}
                        {markUsedOpen&&mat.balance>0&&(
                          <div style={{padding:"11px 14px",background:T.grnL,borderBottom:"1px solid "+T.grnM}}>
                            <div style={{display:"grid",gridTemplateColumns:"110px 130px 1fr 110px",gap:8,alignItems:"end"}}>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Qty Used *</label>
                                <input type="number" value={uForm.qty}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,qty:e.target.value}}))}
                                  placeholder={"max "+mat.balance}
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
                                <input type="date" value={uForm.used_date}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,used_date:e.target.value}}))}
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <div>
                                <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Remark</label>
                                <input value={uForm.remark}
                                  onChange={e=>setInvUsedForm(p=>({...p,[mat.material_name]:{...uForm,remark:e.target.value}}))}
                                  placeholder="Optional"
                                  style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                              </div>
                              <button onClick={async()=>{
                                if(!uForm.qty||parseFloat(uForm.qty)<=0) return alert("Qty required");
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
                                {invUsedSaving===mat.material_name?"Saving...":"✓ Save Used"}
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
                          <div style={{padding:"24px",textAlign:"center",color:T.t4,fontSize:12}}>No entries{ledgerRowFilter!=="all"?` (${ledgerRowFilter})`:""} yet</div>
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
                                  ? <span style={{fontSize:10.5,padding:"2px 7px",borderRadius:3,background:T.grnL,color:T.grn,fontWeight:600}}>GRN Received</span>
                                  : <span>{row.task_name?<span style={{fontSize:10,color:T.t4,marginRight:4}}>{row.task_no}</span>:""}{row.task_name||""}{row.remark?<span style={{color:T.t3}}>{row.task_name?" · ":""}{row.remark}</span>:<span style={{color:T.t4,fontSize:10}}>{!row.task_name?"Project level":""}</span>}</span>
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
                                  <button title="Delete this usage entry"
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
                          <div style={{gridColumn:"1/6",fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:".4px"}}>Total</div>
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
          {invLoading&&<div style={{textAlign:"center",padding:"50px 0",color:T.t4,fontSize:13}}>Loading inventory...</div>}
          {!invLoading&&inventory.length===0&&(
            <div style={{textAlign:"center",padding:"60px 0",color:T.t4}}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={1.5} style={{margin:"0 auto 12px",display:"block"}}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              <div style={{fontSize:14,fontWeight:600,color:T.t3}}>No inventory yet</div>
              <div style={{fontSize:12,marginTop:4}}>Record GRN to see live stock</div>
            </div>
          )}
          {!invLoading&&inventory.length>0&&(
            <div>
              {/* Summary stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9,marginBottom:14}}>
                {[
                  {l:"Total Materials",v:inventory.length,c:T.slt},
                  {l:"Low / Exhausted",v:inventory.filter(i=>i.status==="Low"||i.status==="Exhausted").length,c:T.red},
                  {l:"Available",v:inventory.filter(i=>i.status==="Available").length,c:T.grn},
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
                          <div style={{fontSize:8.5,color:T.t4}}>Received</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:T.amb}}>{used}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>Used</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:15,fontWeight:800,color:stC}}>{bal}</div>
                          <div style={{fontSize:8.5,color:T.t4}}>Balance</div>
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
                        {isExpanded?"▲ Cancel":"▼ Mark Used"}
                      </button>}
                      {/* Inline form */}
                      {isExpanded&&bal>0&&(
                        <div style={{borderTop:"1px solid "+T.grnM,paddingTop:8}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Qty Used *</label>
                              <input type="number" value={uForm.qty}
                                onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,qty:e.target.value}}))}
                                placeholder={"max "+bal}
                                style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                            </div>
                            <div>
                              <label style={{fontSize:9,fontWeight:700,color:T.t3,textTransform:"uppercase",display:"block",marginBottom:3}}>Date</label>
                              <input type="date" value={uForm.used_date}
                                onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,used_date:e.target.value}}))}
                                style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                            </div>
                          </div>
                          <input value={uForm.remark}
                            onChange={e=>setInvUsedForm(p=>({...p,[item.material_name]:{...uForm,remark:e.target.value}}))}
                            placeholder="Remark (optional)"
                            style={{width:"100%",padding:"6px 8px",borderRadius:5,border:"1.5px solid "+T.grnM,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:7}}/>
                          <button onClick={async()=>{
                            if(!uForm.qty||parseFloat(uForm.qty)<=0) return alert("Qty required");
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
                            {invUsedSaving===item.material_name?"Saving...":"✓ Save Used Entry"}
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
