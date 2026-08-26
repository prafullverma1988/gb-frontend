// ═══════════════════════════════════════════════════════════════════
// EstimateBuilderModal — library-backed customer estimate builder
// ═══════════════════════════════════════════════════════════════════
// Full-screen modal. Two start modes:
//   • initialMode="library"   — opens with package picker (default)
//   • initialMode="scratch"   — empty start, user adds sections/items
//   • initialMode="from_quote" with sourceQuoteId — pre-loads measurements
//                                from a CRM quote (M4 wiring point)
//
// Persists structural changes (sections / categories / items) to the
// LIBRARY so future estimates reuse them. Saves the estimate itself to
// customer_estimates + customer_estimate_sections + customer_estimate_items
// via POST /api/customer-estimates (existing route, no schema change).
//
// Mirrors QuoteBuilderModal's UX (edit-mode toggle, per-item qty, ↺
// reset, + Add Section/Category/Item drawers, pick-order badges) but
// adds Estimate-specific header fields: customer party picker,
// retention %, TDS %, GST %, start/end dates, terms, internal notes.
// ───────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from "react";
import api from "../config/api";
import SearchSelect from "../components/SearchSelect";
import { t, Rich } from "../i18n";

const inrIN = (n) => Math.round(Number(n) || 0).toLocaleString("en-IN");
const isSet = (v) => v !== null && v !== undefined && v !== "";

export default function EstimateBuilderModal({
  project,                    // { id, name, city_id, construction_type_id, city_name, construction_type_name, client_name, ... }
  estimateId,                 // null for new; future: pre-load existing
  initialMode  = "library",   // "library" | "scratch" | "from_quote"
  sourceQuoteId,              // for from_quote mode
  onClose,
  onSaved,
}){
  // ── Local project state (so we can PATCH city/type inline) ────
  // The chooser may open the modal with a project that lacks city_id /
  // construction_type_id. Step "needs_rates" lets the user pick them
  // inline (mirrors CRM Build-Quote tab UX). On save we PATCH the
  // project and use the updated local copy for downstream rate
  // lookups (package list, rate-matrix, refresh, save).
  const [proj, setProj] = useState(project || {});
  useEffect(() => { setProj(project || {}); }, [project]);
  const projectNeedsRates = !proj?.city_id || !proj?.construction_type_id;

  // ── Step state ─────────────────────────────────────────────────
  // "needs_rates" → inline city/type picker (project missing FKs)
  // "package"  → user picks a package (Path 2)
  // "scratch"  → empty builder, user adds sections from drawers (Path 3)
  // "loading"  → loading from existing estimate or source quote
  // "build"    → main builder
  const initialStep = estimateId ? "loading"
                    : initialMode === "scratch" ? "scratch"
                    : initialMode === "from_quote" ? "loading"
                    : (projectNeedsRates ? "needs_rates" : "package");
  const [step, setStep] = useState(initialStep);
  const [loadError, setLoadError] = useState("");

  // ── Rates picker (when projectNeedsRates) ─────────────────────
  const [cities, setCities] = useState([]);
  const [ctypes, setCtypes] = useState([]);
  const [pickCityId,  setPickCityId]  = useState(proj?.city_id || "");
  const [pickTypeId,  setPickTypeId]  = useState(proj?.construction_type_id || "");
  const [savingRates, setSavingRates] = useState(false);
  useEffect(() => {
    if (!projectNeedsRates) return;
    (async () => {
      try {
        const [c, t] = await Promise.all([
          api.get("/library/cities"),
          api.get("/library/construction-types"),
        ]);
        if (c?.success) setCities(c.data || []);
        if (t?.success) setCtypes(t.data || []);
      } catch (_) {}
    })();
    // eslint-disable-next-line
  }, []);
  const saveProjectRates = async () => {
    if (!pickCityId || !pickTypeId) { alert(t("estimate_builder.pick_both_city_and_construction_type")); return; }
    setSavingRates(true);
    try {
      const r = await api.put("/projects/" + proj.id, {
        cityId: Number(pickCityId),
        constructionTypeId: Number(pickTypeId),
      });
      if (!r?.success) throw new Error(r?.message || "Save failed");
      // Hydrate joined names from library lookups
      const cityRow = cities.find(c => Number(c.id) === Number(pickCityId));
      const typeRow = ctypes.find(t => Number(t.id) === Number(pickTypeId));
      setProj(p => ({
        ...p,
        city_id: Number(pickCityId),
        construction_type_id: Number(pickTypeId),
        city_name: cityRow?.name || p.city_name,
        construction_type_name: typeRow?.name || p.construction_type_name,
      }));
      // Load packages now that we know the type
      try {
        const pr = await api.get("/library/rate-packages");
        if (pr?.success) setAllPackages(pr.data || []);
      } catch (_) {}
      setStep("package");
    } catch (e) {
      alert(e.message || "Save failed");
    } finally {
      setSavingRates(false);
    }
  };

  // ── Package picker state ───────────────────────────────────────
  const [allPackages, setAllPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // ── Builder state ──────────────────────────────────────────────
  const [pkgStructures, setPkgStructures] = useState([]);
  const [pkgCategories, setPkgCategories] = useState([]);
  const [pkgItems, setPkgItems] = useState({});     // { [sid]: pcrRows[] }
  const [measurements, setMeasurements] = useState({ sections: {} });

  // ── Estimate header fields ─────────────────────────────────────
  const [terms, setTerms]                 = useState("");
  const [notes, setNotes]                 = useState("");
  const [retentionPct, setRetentionPct]   = useState(5);
  const [tdsPct, setTdsPct]               = useState(1);
  const [taxPct,  setTaxPct]              = useState(0);
  const [startDate, setStartDate]         = useState("");
  const [endDate, setEndDate]             = useState("");
  const [customers, setCustomers]         = useState([]);
  const [customerId, setCustomerId]       = useState(null);
  const [customerName, setCustomerName]   = useState(project?.client_name || "");
  const [description, setDescription]     = useState("");

  // ── Scratch-mode sections: pkgStructures will hold ad-hoc sections
  //    created via the + Add Section drawer when no package is picked.
  //    These are NOT persisted to library — they live in local state
  //    only and get flattened into customer_estimate_sections at save.
  const scratchMode = (step === "scratch") || (selectedPackage === null && pkgStructures.some(s => s._scratch));

  // Open by default so user doesn't forget to fill it; they can collapse later.
  const [showSettings, setShowSettings]   = useState(true);

  // ── Attachment (single file, Cloudinary direct-upload) ───────
  const [attachmentUrl,  setAttachmentUrl]  = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentSize, setAttachmentSize] = useState("");
  const [attaching,      setAttaching]      = useState(false);
  const CLOUD_NAME    = "dd632nqfm";
  const UPLOAD_PRESET = "gb_buildcon_drawings";
  const uploadAttachment = async (file) => {
    setAttaching(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      fd.append("folder", "gb_buildcon/estimates");
      const isPDF = file.type === "application/pdf" || /\.(pdf|dwg|dxf|doc|docx|xls|xlsx)$/i.test(file.name);
      const resType = isPDF ? "raw" : "image";
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resType}/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Upload failed");
      setAttachmentUrl(data.secure_url);
      setAttachmentName(file.name);
      setAttachmentSize(Math.round(file.size / 1024) + " KB");
    } catch (e) {
      alert(e.message || "Upload failed");
    } finally {
      setAttaching(false);
    }
  };
  const clearAttachment = () => { setAttachmentUrl(""); setAttachmentName(""); setAttachmentSize(""); };

  // ── Save state ─────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ── UI fold state ──────────────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState({});
  const [collapsedCats, setCollapsedCats] = useState({});

  // ── Edit-mode toggle ───────────────────────────────────────────
  // Default = view mode (read-only base/add_on/description + + Add
  // buttons hidden). Area / per-item Qty stay editable regardless —
  // those are the QUOTE's primary inputs that a salesperson changes
  // per client. "✎ Edit Package" click flips into edit mode, where
  // structural changes (add section/category/item) + master rate
  // edits become available.
  const [editMode, setEditMode] = useState(false);

  // ── Inline-edit state (Add Section / Category / Item from builder) ──
  // All structural adds PERSIST to the library so future quotes also see
  // them. Per-item rate/qty tweaks stay quote-scoped in measurements.
  const [pkgEditOpen,     setPkgEditOpen]     = useState(false);
  const [pkgEditForm,     setPkgEditForm]     = useState({});
  const [pkgEditSaving,   setPkgEditSaving]   = useState(false);
  const [addSecModal,     setAddSecModal]     = useState(false);
  const [addSecForm,      setAddSecForm]      = useState({ name: "", default_qty: 0, unit: "sqft", per_item_qty: false });
  const [addSecSaving,    setAddSecSaving]    = useState(false);
  const [addCatDrawer,    setAddCatDrawer]    = useState(null); // {structure_id, section_name}
  const [addCatPicks,     setAddCatPicks]     = useState([]);   // ordered ids
  const [addCatNewForm,   setAddCatNewForm]   = useState(null);
  const [addCatSaving,    setAddCatSaving]    = useState(false);
  const [addItemDrawer,   setAddItemDrawer]   = useState(null); // {structure_id, category_id, ...}
  const [addItemPicks,    setAddItemPicks]    = useState([]);
  const [addItemSearch,   setAddItemSearch]   = useState("");
  const [addItemNewForm,  setAddItemNewForm]  = useState(null);
  const [addItemSaving,   setAddItemSaving]   = useState(false);
  // Master library lookups for the Add Category / Item drawers
  const [allWorkCats,     setAllWorkCats]     = useState([]);
  const [allBoqItems,     setAllBoqItems]     = useState([]);
  const [allUoms,         setAllUoms]         = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [wc, bi, u, cu] = await Promise.all([
          api.get("/library/work-categories"),
          api.get("/library/boq-items"),
          api.get("/library/uom").catch(() => ({ success: false })),
          api.get("/customer-estimates/customers").catch(() => ({ success: false })),
        ]);
        if (wc?.success) setAllWorkCats(wc.data || []);
        if (bi?.success) setAllBoqItems(bi.data || []);
        if (u?.success)  setAllUoms(u.data || []);
        if (cu?.success) setCustomers(cu.data || []);
      } catch (_) {}
    })();
  }, []);
  const toggleCatPick  = (id) => setAddCatPicks(p => {
    const idx = p.indexOf(id); return idx >= 0 ? p.filter(x => x !== id) : [...p, id];
  });
  const toggleItemPick = (id) => setAddItemPicks(p => {
    const idx = p.indexOf(id); return idx >= 0 ? p.filter(x => x !== id) : [...p, id];
  });

  // ── Initial load ───────────────────────────────────────────────
  // initialMode dispatches:
  //   • library  → load all packages → user picks → build
  //   • scratch  → empty builder → user uses + Add Section drawer
  //   • from_quote → pre-load a CRM quotation's measurements (M4)
  useEffect(() => {
    if (initialMode === "from_quote" && sourceQuoteId) {
      (async () => {
        try {
          const r = await api.get("/library/quotations/" + sourceQuoteId);
          if (!r?.success) throw new Error(r?.message || "Could not load source quote");
          const q = r.data;
          setTerms(q.terms || "");
          setNotes(q.notes || "");
          // Hydrate package + tree from the source quote
          const pkgRes = await api.get("/library/rate-packages");
          const pkg = pkgRes.success ? (pkgRes.data || []).find(p => p.id === q.package_id) : null;
          setSelectedPackage(pkg || { id: q.package_id, name: q.package_name });
          await loadPackageTree(q.package_id, proj.city_id);
          setMeasurements(q.measurements && q.measurements.sections ? q.measurements : { sections: {} });
          setStep("build");
        } catch (e) {
          setLoadError(e.message || "Load failed");
          setStep(projectNeedsRates ? "needs_rates" : "package");
        }
      })();
    } else if (initialMode === "library") {
      // Load packages filtered by project's construction_type_id
      (async () => {
        try {
          const r = await api.get("/library/rate-packages");
          if (r?.success) setAllPackages(r.data || []);
        } catch (_) {}
      })();
    }
    // scratch mode: nothing to load up front — user starts adding sections
    // eslint-disable-next-line
  }, []);

  // ── Load package tree (structures + categories + per-section items) ──
  const loadPackageTree = async (pkgId, cityId) => {
    const [sr, cr] = await Promise.all([
      api.get("/library/packages/" + pkgId + "/structures"),
      api.get("/library/packages/" + pkgId + "/categories"),
    ]);
    const structs = sr?.success ? (sr.data || []) : [];
    const catRows = cr?.success ? (cr.data || []) : [];
    setPkgStructures(structs);
    setPkgCategories(catRows);
    // Parallel item fetch per section
    const itemResults = await Promise.all(structs.map(s =>
      api.get(`/library/rate-matrix?package_id=${pkgId}&city_id=${cityId}&structure_id=${s.id}`)
        .then(r => [s.id, r?.success ? (r.data || []) : []])
        .catch(() => [s.id, []])
    ));
    const itemMap = {};
    for (const [sid, rows] of itemResults) itemMap[sid] = rows;
    setPkgItems(itemMap);
    return { structs, catRows };
  };
  // Refresh tree after structural edits (add section/category/item).
  // Preserves existing measurements for known sections/categories and
  // initialises defaults for newly-added ones.
  const refreshPackageTree = async () => {
    if (!selectedPackage) return;
    const { structs } = await loadPackageTree(selectedPackage.id, proj.city_id);
    setMeasurements(m => {
      const next = { ...m, sections: { ...(m.sections || {}) } };
      for (const s of structs) {
        if (!next.sections[s.id]) {
          next.sections[s.id] = { area: Number(s.default_qty) || 0, categories: {} };
        }
      }
      return next;
    });
  };

  // ── EDIT PACKAGE basics — name + sqft_rate + description ─────
  const openEditPkg = () => {
    if (!selectedPackage) return;
    setPkgEditForm({
      name:        selectedPackage.name || "",
      sqft_rate:   selectedPackage.sqft_rate || 0,
      description: selectedPackage.description || "",
    });
    setPkgEditOpen(true);
  };
  const saveEditPkg = async () => {
    if (!selectedPackage || !pkgEditForm.name?.trim()) return;
    setPkgEditSaving(true);
    const r = await api.put("/library/rate-packages/" + selectedPackage.id, {
      name:        pkgEditForm.name.trim(),
      sqft_rate:   Number(pkgEditForm.sqft_rate) || 0,
      description: pkgEditForm.description || "",
      construction_type_id: selectedPackage.construction_type_id,
    });
    setPkgEditSaving(false);
    if (r?.success) {
      setSelectedPackage(p => ({ ...p, ...pkgEditForm }));
      setPkgEditOpen(false);
    } else alert(r?.message || "Save failed");
  };

  // ── ADD SECTION — POSTs to library, then refresh tree ────────
  const openAddSec = () => {
    setAddSecForm({ name: "", default_qty: 0, unit: "sqft", per_item_qty: false });
    setAddSecModal(true);
  };
  const saveAddSec = async () => {
    if (!addSecForm.name?.trim()) return;
    setAddSecSaving(true);
    if (selectedPackage) {
      // Library mode — persists to library so future estimates can reuse
      const r = await api.post("/library/packages/" + selectedPackage.id + "/structures", {
        name:         addSecForm.name.trim(),
        unit:         addSecForm.unit || "sqft",
        rate:         0,
        default_qty:  Number(addSecForm.default_qty) || 0,
        per_item_qty: !!addSecForm.per_item_qty,
      });
      setAddSecSaving(false);
      if (r?.success) {
        await refreshPackageTree();
        setAddSecModal(false);
      } else alert(r?.message || "Save failed");
    } else {
      // Scratch mode — section lives only in local state. Synthetic id
      // namespaced under a high prefix so it never collides with real
      // library ids. Cleared at save-time when we flatten to payload.
      const newSec = {
        id: `scratch_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        _scratch: true,
        name:         addSecForm.name.trim(),
        unit:         addSecForm.unit || "sqft",
        default_qty:  Number(addSecForm.default_qty) || 0,
        per_item_qty: addSecForm.per_item_qty ? 1 : 0,
        sort_order:   pkgStructures.length,
        is_active:    1,
      };
      setPkgStructures(p => [...p, newSec]);
      setMeasurements(m => ({
        sections: { ...m.sections, [newSec.id]: { area: newSec.default_qty, categories: {} } },
      }));
      setAddSecSaving(false);
      setAddSecModal(false);
    }
  };

  // ── RENAME / DELETE section ─────────────────────────────────────
  // Library-backed sections persist via /library/structures/:id. Scratch
  // sections live only in local state — handle them inline. Deleting a
  // section also clears its measurement entry so totals recompute clean.
  const renameSection = async (sec) => {
    const name = prompt(t("estimate_builder.rename_section_name", { name: sec.name }), sec.name);
    if (!name || !name.trim() || name.trim() === sec.name) return;
    if (sec._scratch) {
      setPkgStructures(p => p.map(s => s.id === sec.id ? { ...s, name: name.trim() } : s));
      return;
    }
    const r = await api.put("/library/structures/" + sec.id, { name: name.trim() });
    if (r?.success) await refreshPackageTree();
    else alert(r?.message || "Rename failed");
  };
  const deleteSection = async (sec) => {
    if (!await window.confirmAsync(t("estimate_builder.delete_section_name_this_will_remove", { name: sec.name }))) return;
    if (sec._scratch) {
      setPkgStructures(p => p.filter(s => s.id !== sec.id));
      setMeasurements(m => {
        const next = { ...m.sections };
        delete next[sec.id];
        return { sections: next };
      });
      return;
    }
    const r = await api.del("/library/structures/" + sec.id);
    if (r?.success) {
      setMeasurements(m => {
        const next = { ...m.sections };
        delete next[sec.id];
        return { sections: next };
      });
      await refreshPackageTree();
    } else alert(r?.message || "Delete failed");
  };

  // ── RENAME / DELETE category ────────────────────────────────────
  const renameCategory = async (sec, cat) => {
    const name = prompt(t("estimate_builder.rename_category_name", { name: cat.name }), cat.name);
    if (!name || !name.trim() || name.trim() === cat.name) return;
    const r = await api.put("/library/categories/" + cat.id, { category_name: name.trim() });
    if (r?.success) await refreshPackageTree();
    else alert(r?.message || "Rename failed");
  };
  const deleteCategory = async (sec, cat) => {
    if (!await window.confirmAsync(t("estimate_builder.delete_category_name_this_removes_it", { name: cat.name }))) return;
    const r = await api.del("/library/categories/" + cat.id);
    if (r?.success) {
      setMeasurements(m => {
        const s = m.sections[sec.id];
        if (!s) return m;
        const nextCats = { ...(s.categories || {}) };
        delete nextCats[cat.id];
        return { sections: { ...m.sections, [sec.id]: { ...s, categories: nextCats } } };
      });
      await refreshPackageTree();
    } else alert(r?.message || "Delete failed");
  };

  // ── ADD CATEGORY drawer (per section) — multi-pick + create new ─
  const openAddCat = (sec) => {
    setAddCatPicks([]); setAddCatNewForm(null);
    setAddCatDrawer({ structure_id: sec.id, section_name: sec.name });
  };
  const confirmAddCat = async () => {
    if (!addCatDrawer || !selectedPackage) return;
    setAddCatSaving(true);
    // sort_order = append after existing in this section
    const existingMax = pkgCategories
      .filter(c => c.structure_id === addCatDrawer.structure_id)
      .reduce((mx, c) => Math.max(mx, Number(c.sort_order) || 0), 0);
    for (let i = 0; i < addCatPicks.length; i++) {
      const id = addCatPicks[i];
      const nm = allWorkCats.find(c => c.id === id)?.name;
      if (!nm) continue;
      await api.post("/library/packages/" + selectedPackage.id + "/categories", {
        structure_id:  addCatDrawer.structure_id,
        category_name: nm,
        sort_order:    existingMax + 1 + i,
      });
    }
    setAddCatSaving(false);
    await refreshPackageTree();
    setAddCatDrawer(null);
  };
  const createAndAddCat = async () => {
    if (!addCatNewForm?.name?.trim() || !addCatDrawer || !selectedPackage) return;
    setAddCatSaving(true);
    const wr = await api.post("/library/work-categories", {
      name: addCatNewForm.name.trim(),
      code: (addCatNewForm.code || "").trim(),
      description: (addCatNewForm.desc || "").trim(),
    });
    if (wr?.success) {
      const existingMax = pkgCategories
        .filter(c => c.structure_id === addCatDrawer.structure_id)
        .reduce((mx, c) => Math.max(mx, Number(c.sort_order) || 0), 0);
      await api.post("/library/packages/" + selectedPackage.id + "/categories", {
        structure_id:  addCatDrawer.structure_id,
        category_name: addCatNewForm.name.trim(),
        sort_order:    existingMax + 1,
      });
      const wcRes = await api.get("/library/work-categories");
      if (wcRes?.success) setAllWorkCats(wcRes.data || []);
      await refreshPackageTree();
      setAddCatNewForm(null);
    } else alert(wr?.message || "Failed");
    setAddCatSaving(false);
  };

  // ── ADD ITEM drawer (per category) — multi-pick + create new ───
  const openAddItem = (sec, cat) => {
    setAddItemPicks([]); setAddItemSearch(""); setAddItemNewForm(null);
    setAddItemDrawer({
      structure_id:  sec.id, section_name: sec.name,
      category_id:   cat.id, category_name: cat.name,
    });
  };
  const confirmAddItems = async () => {
    if (!addItemDrawer || !selectedPackage) return;
    setAddItemSaving(true);
    // Insert the picked items into package_city_rates via /rate-matrix/bulk.
    // We need to PRESERVE existing items in this section + APPEND new ones.
    const sid   = addItemDrawer.structure_id;
    const catId = addItemDrawer.category_id;
    const existing = (pkgItems[sid] || []).map(r => ({
      item_id:     r.item_id,
      category_id: r.category_id,
      base_rate:   (Number(r.rate) || 0) - (Number(r.add_on_rate) || 0),
      add_on_rate: Number(r.add_on_rate) || 0,
      description: r.description || "",
      qty:         Number(r.qty) || 0,
    }));
    const existingIds = new Set(existing.map(r => r.item_id));
    const fresh = addItemPicks
      .filter(id => !existingIds.has(id))
      .map(id => {
        const bi = allBoqItems.find(x => x.id === id);
        return {
          item_id:     id,
          category_id: catId,
          base_rate:   Number(bi?.base_rate) || 0,
          add_on_rate: 0,
          description: "",
          qty:         0,
        };
      });
    const all = [...existing, ...fresh];
    const r = await api.post("/library/rate-matrix/bulk", {
      package_id:   selectedPackage.id,
      city_id:      proj.city_id,
      structure_id: sid,
      items:        all,
    });
    setAddItemSaving(false);
    if (r?.success) {
      await refreshPackageTree();
      setAddItemDrawer(null);
    } else alert(r?.message || "Failed");
  };
  const createAndAddItem = async () => {
    if (!addItemNewForm?.name?.trim() || !addItemDrawer || !selectedPackage) return;
    setAddItemSaving(true);
    const cr = await api.post("/library/boq-items", {
      name:        addItemNewForm.name.trim(),
      category:    addItemNewForm.category || addItemDrawer.category_name,
      unit:        addItemNewForm.unit || "Sq.Ft",
      base_rate:   Number(addItemNewForm.base_rate) || 0,
      description: "",
    });
    if (cr?.success && cr.data) {
      // Refresh master library + immediately insert into the pcr scope
      setAllBoqItems(p => [cr.data, ...p]);
      const sid = addItemDrawer.structure_id;
      const catId = addItemDrawer.category_id;
      const existing = (pkgItems[sid] || []).map(r => ({
        item_id: r.item_id, category_id: r.category_id,
        base_rate: (Number(r.rate)||0) - (Number(r.add_on_rate)||0),
        add_on_rate: Number(r.add_on_rate) || 0,
        description: r.description || "",
        qty: Number(r.qty) || 0,
      }));
      existing.push({
        item_id: cr.data.id, category_id: catId,
        base_rate: Number(cr.data.base_rate) || 0,
        add_on_rate: 0, description: "", qty: 0,
      });
      await api.post("/library/rate-matrix/bulk", {
        package_id:   selectedPackage.id,
        city_id:      proj.city_id,
        structure_id: sid,
        items:        existing,
      });
      await refreshPackageTree();
      setAddItemNewForm(null);
    } else alert(cr?.message || "Save failed");
    setAddItemSaving(false);
  };

  // ── Per-item qty override patcher (quote-scoped) ──────────────
  const patchItemQtyOverride = (sid, cid, itemId, val) => {
    setMeasurements(m => {
      const sec = m.sections[sid] || { area: 0, categories: {} };
      const cat = sec.categories[cid] || {};
      const items = cat.items || {};
      const cur = items[itemId] || {};
      const next = { ...cur };
      if (val === "" || val === null) delete next.qty_override;
      else next.qty_override = val;
      const allEmpty = !isSet(next.base_rate_override) && !isSet(next.add_on_override)
                    && !isSet(next.description_override) && !isSet(next.qty_override);
      const nextItems = { ...items };
      if (allEmpty) delete nextItems[itemId];
      else nextItems[itemId] = next;
      return {
        sections: {
          ...m.sections,
          [sid]: { ...sec, categories: { ...sec.categories, [cid]: { ...cat, items: nextItems } } },
        },
      };
    });
  };

  // ── Package picked → load tree + initialize measurements ──────
  const pickPackage = async (pkg) => {
    setSelectedPackage(pkg);
    setStep("loading");
    const { structs } = await loadPackageTree(pkg.id, proj.city_id);
    // Default measurements: each section's area = its default_qty
    const initSections = {};
    for (const s of structs) {
      initSections[s.id] = {
        area: Number(s.default_qty) || 0,
        categories: {},
      };
    }
    setMeasurements({ sections: initSections });
    setStep("build");
  };

  // ── Measurement patchers ───────────────────────────────────────
  // No patchSection: the section has no editable area any more. Its stored
  // `area` survives only as the package default a category inherits until it
  // is given its own; every edit goes through patchCategory.
  const patchCategory = (sid, cid, patch) => setMeasurements(m => {
    const sec = m.sections[sid] || { area: 0, categories: {} };
    return {
      sections: {
        ...m.sections,
        [sid]: {
          ...sec,
          categories: {
            ...sec.categories,
            [cid]: { ...(sec.categories[cid] || {}), ...patch },
          },
        },
      },
    };
  });
  const patchItem = (sid, cid, itemId, patch) => setMeasurements(m => {
    const sec = m.sections[sid] || { area: 0, categories: {} };
    const cat = sec.categories[cid] || {};
    const items = cat.items || {};
    const cur = items[itemId] || {};
    const nextItem = { ...cur, ...patch };
    // Drop entry if all overrides cleared (cleaner JSON)
    const allEmpty = !isSet(nextItem.base_rate_override)
                  && !isSet(nextItem.add_on_override)
                  && !isSet(nextItem.description_override);
    const nextItems = { ...items };
    if (allEmpty) delete nextItems[itemId];
    else nextItems[itemId] = nextItem;
    return {
      sections: {
        ...m.sections,
        [sid]: {
          ...sec,
          categories: {
            ...sec.categories,
            [cid]: { ...cat, items: nextItems },
          },
        },
      },
    };
  });
  const resetItemRow = (sid, cid, itemId) => patchItem(sid, cid, itemId, {
    base_rate_override: null,
    add_on_override: null,
    description_override: null,
  });

  // ── Live compute (mirrors backend computeQuotationTotals) ──────
  const breakdown = useMemo(() => {
    if (step !== "build" && step !== "scratch") return { grandTotal: 0, sections: [] };
    let grand = 0;
    const sections = pkgStructures.map(s => {
      const sm = measurements.sections[s.id] || {};
      const sArea = isSet(sm.area) ? Number(sm.area) || 0 : Number(s.default_qty || 0);
      const perItem = !!Number(s.per_item_qty);
      const sCats = pkgCategories
        .filter(c => c.structure_id === s.id)
        .sort((a,b) => (a.sort_order||0) - (b.sort_order||0) || a.id - b.id);
      let sTotal = 0, sBase = 0, sAddOn = 0;
      const catRows = sCats.map(c => {
        const cm = (sm.categories && sm.categories[c.id]) || {};
        // Area cascade: this quote's override > the library category's own
        // area (Client BOQ Rate) > the section default it inherits.
        const cArea = isSet(cm.area_override) ? Number(cm.area_override) || 0
                    : isSet(c.qty)            ? Number(c.qty)            || 0
                    : sArea;
        const items = (pkgItems[s.id] || []).filter(it => Number(it.category_id) === Number(c.id));
        const itemOverrides = cm.items || {};
        let cBase = 0, cAddOn = 0, cItemTotalSum = 0;
        const itemRows = items.map(it => {
          const ov = itemOverrides[it.item_id] || {};
          const masterBase  = (Number(it.rate) || 0) - (Number(it.add_on_rate) || 0);
          const masterAddOn = Number(it.add_on_rate) || 0;
          const masterDesc  = it.description || "";
          const masterQty   = Number(it.qty) || 0;
          const base  = isSet(ov.base_rate_override)   ? Number(ov.base_rate_override)   || 0 : masterBase;
          const addOn = isSet(ov.add_on_override)      ? Number(ov.add_on_override)      || 0 : masterAddOn;
          const desc  = isSet(ov.description_override) ? ov.description_override            : masterDesc;
          // Per-item mode: each item carries its own qty (override > pcr master).
          // Uniform mode: every item shares cArea.
          const effQty = perItem
            ? (isSet(ov.qty_override) ? Number(ov.qty_override) || 0 : masterQty)
            : cArea;
          const total = (base + addOn) * effQty;
          cBase += base; cAddOn += addOn; cItemTotalSum += total;
          return {
            item_id: it.item_id, base, addOn, desc, qty: effQty, total,
            masterBase, masterAddOn, masterDesc, masterQty,
            hasOverride: base !== masterBase || addOn !== masterAddOn || desc !== masterDesc
                       || (perItem && isSet(ov.qty_override) && Number(ov.qty_override) !== masterQty),
          };
        });
        // Category total: per-item mode → Σ item totals (each qty-weighted)
        //                 uniform mode → (Σ base + Σ addOn) × cArea
        const cTotal = perItem ? cItemTotalSum : (cBase + cAddOn) * cArea;
        sTotal += cTotal;
        sBase  += cBase;
        sAddOn += cAddOn;
        // Alias category_name → name so all downstream code (display
        // + [Category] prefix in save flow) reads cat.name uniformly.
        // Backend SELECT * returns category_name, not name.
        return { ...c, name: c.category_name || c.name, area: cArea, base: cBase, addOn: cAddOn, total: cTotal, items: itemRows };
      });
      grand += sTotal;
      // Section header rollup. Qty = SUM of the category areas (GF/FF/SF each
      // carry their own), rate = BLENDED average (total ÷ qty). The old header
      // showed Σ of the category rates against ONE section area, which stopped
      // reconciling the moment any category had a different area:
      // rate × qty ≠ total. Sum + blended always reconciles.
      const sQty  = catRows.reduce((a, c) => a + (Number(c.area) || 0), 0);
      const sRate = sQty > 0 ? sTotal / sQty : 0;
      return { ...s, area: sArea, per_item_qty: perItem ? 1 : 0,
               base: sBase, addOn: sAddOn, total: sTotal,
               qty: sQty, rate: sRate, categories: catRows };
    });
    return { grandTotal: grand, sections };
    // eslint-disable-next-line
  }, [measurements, pkgStructures, pkgCategories, pkgItems, step]);

  // ── Save flow — flatten builder breakdown → customer_estimates payload ──
  // Maps 3-level tree (section › category › item) to the 2-level estimate
  // schema by embedding [category] prefix in item description. Preserves
  // section grouping. Each item gets library_item_id for traceability.
  const saveEstimate = async () => {
    if (!project?.id) return;
    if (!customerName.trim()) {
      setShowSettings(true); // open the panel so the highlighted field is visible
      return alert(t("estimate_builder.customer_name_is_required"));
    }
    if (!hasMeasurements) return alert(t("estimate_builder.add_at_least_one_section_before"));
    setSaving(true);
    try {
      // breakdown.sections is the computed tree (handles per-item qty mode)
      const sectionsPayload = breakdown.sections.map(sec => {
        const sectionTitle = sec.name + (sec.unit && sec.unit !== "sqft" ? ` (${sec.unit})` : "");
        const itemsPayload = [];
        for (const cat of sec.categories) {
          for (const it of cat.items) {
            // Skip zero-everything rows
            if (!it.base && !it.addOn && !it.qty) continue;
            const masterItem = allBoqItems.find(b => b.id === it.item_id);
            const itemName = masterItem?.name || ("Item #" + it.item_id);
            const itemUnit = masterItem?.unit || (sec.unit === "lump_sum" ? "Lump Sum" : "Sq.Ft");
            itemsPayload.push({
              description: cat.name ? `[${cat.name}] ${itemName}` + (it.desc ? ` — ${it.desc}` : "")
                                    : itemName + (it.desc ? ` — ${it.desc}` : ""),
              unit:        itemUnit,
              qty:         Number(it.qty) || 0,
              rate:        (Number(it.base) || 0) + (Number(it.addOn) || 0),
              library_item_id: it.item_id || null,
            });
          }
        }
        // Persist the section's qty mode so render paths (BOQ tab,
        // amendment expand, future PDF/Excel) read it directly instead
        // of inferring from data shape. Matches rate_package_structures.
        return {
          title: sectionTitle,
          per_item_qty: sec.per_item_qty ? 1 : 0,
          items: itemsPayload,
        };
      }).filter(s => s.items.length > 0);

      if (sectionsPayload.length === 0) {
        alert(t("estimate_builder.no_items_to_save_add_at"));
        setSaving(false);
        return;
      }

      const body = {
        project_id:    project.id,
        customer_id:   customerId || null,
        customer_name: customerName || project.client_name || null,
        // Settings panel collapsed Description + Notes into a single field
        // (UI label: "Description / Note"). Keep `remark` populated too so
        // any old reports/PDFs that referenced it still render text.
        description:   description || null,
        retention_pct: Number(retentionPct) || 0,
        tds_pct:       Number(tdsPct) || 0,
        tax_pct:       Number(taxPct) || 0,
        start_date:    startDate || null,
        end_date:      endDate || null,
        remark:        description || null,
        sections:      sectionsPayload,
        attachment_url:  attachmentUrl  || null,
        attachment_name: attachmentName || null,
        attachment_size: attachmentSize || null,
      };
      const res = await api.post("/customer-estimates", body);
      if (!res?.success) { alert(res?.message || "Save failed"); return; }
      if (onSaved) onSaved(res.data);
      onClose();
    } catch (e) {
      alert("Save failed: " + (e?.message || ""));
    } finally { setSaving(false); }
  };

  // ── Disabled-state derivations ─────────────────────────────────
  // Estimate has no Draft/Sent status workflow (yet) — always editable
  // until saved. Once saved, the modal closes via onSaved(). Future
  // editing of saved estimate (Phase polish) can re-add readOnly logic.
  const readOnly = false;
  const canEdit  = editMode && !readOnly;
  const hasMeasurements = pkgStructures.length > 0;
  const canSave = hasMeasurements && !readOnly && !saving;

  // ── Filtered packages for picker ───────────────────────────────
  const filteredPackages = allPackages.filter(p =>
    !proj.construction_type_id || Number(p.construction_type_id) === Number(proj.construction_type_id)
  );

  // ── PALETTE ────────────────────────────────────────────────────
  const COL_DARK    = "#0F172A";
  const COL_DARK2   = "#1E293B";
  const COL_CAT_BG  = "#F1F5F9";
  const COL_AMBER   = "#F59E0B";
  const COL_TEAL    = "#0D9488";
  const COL_TEAL_BG = "#CCFBF1";
  const COL_GREEN   = "#059669";
  const COL_BLUE    = "#2563EB";
  const COL_RED     = "#EF4444";

  return (
    <div style={{ position:"fixed", inset:0, background:"white", zIndex:900,
                  display:"flex", flexDirection:"column", fontFamily:"inherit" }}>
      {/* ─── HEADER ───────────────────────────────────────────── */}
      <div style={{ background:COL_DARK, padding:"12px 24px", color:"white",
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, display:"flex", gap:10, alignItems:"center" }}>
            {initialMode === "scratch" ? t("estimate_builder.new_estimate_scratch")
             : initialMode === "from_quote" ? t("estimate_builder.new_estimate_from_crm_quote")
             : t("estimate_builder.new_estimate_from_library")}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>
            {proj.name} · {proj.city_name || proj.city || "—"} · {proj.construction_type_name || proj.type || "—"}
            {step === "build" && selectedPackage && <> · <strong style={{color:"white"}}>{selectedPackage.name}</strong></>}
          </div>
        </div>
        <button onClick={onClose} disabled={saving}
          style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)",
                   fontSize:26, cursor:saving?"not-allowed":"pointer", lineHeight:1 }}>×</button>
      </div>

      {/* ─── BODY ─────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", background:"#F8FAFC" }}>
        {step === "loading" && (
          <div style={{ padding:"60px 20px", textAlign:"center", color:"#64748B", fontSize:13 }}>
           {t("crm.loading_quotation")}
          </div>
        )}

        {/* STEP 0: City + Construction Type picker (when project lacks FKs) */}
        {step === "needs_rates" && (
          <div style={{ maxWidth:560, margin:"0 auto", padding:"40px 20px" }}>
            <div style={{ background:"white", borderRadius:12, border:"1px solid #E5E7EB",
                          padding:"22px 22px 18px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6B7280",
                            textTransform:"uppercase", letterSpacing:".5px", marginBottom:6 }}>
               {t("estimate_builder.step_1_project_rate_scope")}
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:"#0F172A", marginBottom:4 }}>
               {t("estimate_builder.set_city_and_construction_type")}
              </div>
              <div style={{ fontSize:12, color:"#64748B", marginBottom:18, lineHeight:1.45 }}>
               {t("estimate_builder.library_rates_and_packages_depend_on")}
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10.5, fontWeight:700, color:"#6B7280",
                                display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".4px" }}>
                 {t("common.city")}
                </label>
                <select value={pickCityId} onChange={e => setPickCityId(e.target.value)}
                  style={{ width:"100%", padding:"9px 10px", fontSize:13,
                           border:"1px solid #CBD5E1", borderRadius:7, background:"white" }}>
                  <option value="">{t("estimate_builder.select_city")}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:10.5, fontWeight:700, color:"#6B7280",
                                display:"block", marginBottom:5, textTransform:"uppercase", letterSpacing:".4px" }}>
                 {t("common.construction_type")}
                </label>
                <select value={pickTypeId} onChange={e => setPickTypeId(e.target.value)}
                  style={{ width:"100%", padding:"9px 10px", fontSize:13,
                           border:"1px solid #CBD5E1", borderRadius:7, background:"white" }}>
                  <option value="">{t("estimate_builder.select_type")}</option>
                  {ctypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={onClose} disabled={savingRates}
                  style={{ padding:"8px 16px", fontSize:12.5, fontWeight:600,
                           background:"white", color:"#475569",
                           border:"1px solid #CBD5E1", borderRadius:7,
                           cursor: savingRates ? "not-allowed" : "pointer" }}>
                 {t("common.cancel")}
                </button>
                <button onClick={saveProjectRates}
                  disabled={savingRates || !pickCityId || !pickTypeId}
                  style={{ padding:"8px 18px", fontSize:12.5, fontWeight:700,
                           background: (savingRates || !pickCityId || !pickTypeId) ? "#9CA3AF" : COL_BLUE,
                           color:"white", border:"none", borderRadius:7,
                           cursor: (savingRates || !pickCityId || !pickTypeId) ? "not-allowed" : "pointer" }}>
                  {savingRates ? t("common.saving_2") : t("estimate_builder.save_continue")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: PACKAGE PICKER */}
        {step === "package" && (
          <div style={{ maxWidth:880, margin:"0 auto", padding:"24px 20px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase",
                          letterSpacing:".5px", marginBottom:8 }}>
             {t("crm.pick_a_package")}
            </div>
            {loadError && (
              <div style={{ padding:"10px 14px", background:"#FEE2E2", border:"1px solid #FECACA",
                            borderRadius:8, color:"#991B1B", fontSize:12.5, marginBottom:14 }}>
                ⚠️ {loadError}
              </div>
            )}
            {filteredPackages.length === 0 ? (
              <div style={{ padding:"30px 18px", background:"white", border:"1px dashed #CBD5E1",
                            borderRadius:10, textAlign:"center", color:"#64748B", fontSize:13 }}>
               {t("crm.no_packages_defined_for")} <strong>{proj.construction_type_name || t("crm.this_construction_type")}</strong> {t("crm.yet")}
                <div style={{ marginTop:6, fontSize:12, color:"#9CA3AF" }}>
                 {t("crm.go_to")} <strong>{t("crm.library_client_boq_rate")}</strong> {t("crm.to_set_one_up")}
                </div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12 }}>
                {filteredPackages.map(pkg => (
                  <div key={pkg.id} onClick={() => pickPackage(pkg)}
                    style={{ padding:"16px 18px", background:"white", borderRadius:10,
                             border:"2px solid #E5E7EB", cursor:"pointer", transition:"all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = COL_BLUE; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", marginBottom:4 }}>{pkg.name}</div>
                    {pkg.sqft_rate > 0 && (
                      <div style={{ fontSize:12, color:"#64748B" }}>{t("estimate_builder.rs_inrin_sqft", { inrIN: inrIN(pkg.sqft_rate) })}</div>
                    )}
                    {pkg.description && (
                      <div style={{ fontSize:11, color:"#94A3B8", marginTop:6, lineHeight:1.4 }}>{pkg.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: BUILDER (also catches "scratch" mode — empty start) */}
        {(step === "build" || step === "scratch") && (
          <div style={{ maxWidth:1180, margin:"0 auto", padding:"16px 20px 24px" }}>
            {/* (Estimate is create-only — no drift banner needed; saved
                values are frozen the moment Save Estimate fires.) */}

            {/* Estimate header — customer + retention/TDS/GST + dates + terms */}
            <div style={{ background:"white", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:14 }}>
              <div onClick={() => setShowSettings(s => !s)}
                style={{ padding:"10px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                         borderBottom: showSettings ? "1px solid #E5E7EB" : "none" }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                  style={{ transition:"transform .15s", transform: showSettings ? "rotate(90deg)" : "rotate(0deg)" }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span style={{ fontSize:12, fontWeight:700, color:"#0F172A", textTransform:"uppercase", letterSpacing:".4px" }}>
                 {t("estimate_builder.estimate_settings")}
                </span>
                <span style={{ fontSize:11, color:"#64748B", marginLeft:"auto" }}>{t("estimate_builder.retention_retentionpct_tds_tdspct_gst_taxpct", { retentionPct, tdsPct, taxPct })}</span>
              </div>
              {showSettings && (() => {
                // Shared compact styles for inputs in this settings panel.
                const inpC  = { width:"100%", padding:"5px 8px", borderRadius:5, border:"1.5px solid #D1D5DB", fontSize:12, outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
                const inpN  = { ...inpC, textAlign:"right" };
                const lblC  = { fontSize:9.5, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:".4px" };
                const custInvalid = !customerName.trim();
                return (
                <div style={{ padding:"12px 14px" }}>
                  {/* Row 1: Customer (datalist combobox) + Description — single line */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:9 }}>
                    <div>
                      <label style={lblC}>{t("common.customer")} <span style={{color:"#DC2626"}}>*</span></label>
                      {/* Proper searchable dropdown — sourced ONLY from the
                          party library (client-type, junk names excluded
                          server-side). value = customerId; we mirror the
                          chosen name into customerName for the save payload. */}
                      <SearchSelect
                        value={customerId}
                        options={customers.map(c => ({ id: c.id, name: c.name }))}
                        onChange={(id) => {
                          const match = customers.find(c => String(c.id) === String(id));
                          setCustomerId(match?.id || null);
                          setCustomerName(match?.name || "");
                        }}
                        placeholder={t("estimate_builder.search_or_pick_a_customer")}
                        accent={custInvalid ? "#DC2626" : "#2563EB"}
                      />
                    </div>
                    <div>
                      <label style={lblC}>{t("estimate_builder.description_note")}</label>
                      <input value={description} onChange={e => setDescription(e.target.value)}
                        placeholder={t("estimate_builder.optional_summary_or_internal_note")}
                        style={inpC}/>
                    </div>
                  </div>
                  {/* Row 2: Retention / TDS / Tax / Start / End — five compact columns on one line */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1.3fr 1.3fr", gap:10, marginBottom:9 }}>
                    <div>
                      <label style={lblC}>{t("common.retention")}</label>
                      <input type="number" value={retentionPct} onChange={e => setRetentionPct(e.target.value)} style={inpN}/>
                    </div>
                    <div>
                      <label style={lblC}>{t("common.tds")}</label>
                      <input type="number" value={tdsPct} onChange={e => setTdsPct(e.target.value)} style={inpN}/>
                    </div>
                    <div>
                      <label style={lblC}>{t("estimate_builder.gst")}</label>
                      <input type="number" value={taxPct} onChange={e => setTaxPct(e.target.value)} style={inpN}/>
                    </div>
                    <div>
                      <label style={lblC}>{t("common.start_date")}</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inpC}/>
                    </div>
                    <div>
                      <label style={lblC}>{t("common.end_date")}</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inpC}/>
                    </div>
                  </div>
                  {/* Row 3: Attachment + Terms — attachment is single-line affordance */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:12, marginBottom:0 }}>
                    <div>
                      <label style={lblC}>{t("estimate_builder.attachment")}</label>
                      {!attachmentUrl ? (
                        <label style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px",
                                        borderRadius:5, border:"1.5px dashed #94A3B8", background:"white",
                                        cursor: attaching ? "not-allowed" : "pointer",
                                        fontSize:11.5, color:"#475569", fontWeight:600 }}>
                          <span style={{fontSize:13}}>📎</span>
                          {attaching ? t("estimate_builder.uploading") : t("estimate_builder.attach_pdf_image_dwg")}
                          <input type="file"
                            accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,image/*"
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }}
                            disabled={attaching}
                            style={{display:"none"}}/>
                        </label>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px",
                                      borderRadius:5, border:"1.5px solid #93C5FD", background:"#EFF6FF",
                                      fontSize:11.5, color:"#1D4ED8" }}>
                          <a href={attachmentUrl} target="_blank" rel="noreferrer"
                            style={{flex:1, color:"#1D4ED8", textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                            📎 {attachmentName} <span style={{color:"#64748B"}}>· {attachmentSize}</span>
                          </a>
                          <button onClick={clearAttachment}
                            title={t("estimate_builder.remove_attachment")}
                            style={{background:"none", border:"none", color:"#DC2626", cursor:"pointer", fontSize:14, lineHeight:1, padding:0}}>×</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={lblC}>{t("crm.terms_conditions")}</label>
                      <textarea value={terms} onChange={e => setTerms(e.target.value)}
                        rows={2} placeholder={t("crm.payment_terms_warranty_exclusions")}
                        style={{ ...inpC, resize:"vertical" }}/>
                    </div>
                  </div>
                </div>
                );
              })()}
            </div>

            {/* Package controls — Edit toggle + (when ON) basics modal + Add Section */}
            {!readOnly && (
              <div style={{ display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button onClick={() => setEditMode(m => !m)}
                    title={canEdit ? t("crm.exit_edit_mode_back_to_quoting") : t("crm.unlock_structural_edits_master_rate_changes")}
                    style={{ padding:"6px 14px", borderRadius:6,
                             background: canEdit ? "#10B981" : "white",
                             border:"1.5px solid " + (canEdit ? "#10B981" : "#94A3B8"),
                             color: canEdit ? "white" : "#334155",
                             fontSize:11.5, fontWeight:700, cursor:"pointer",
                             display:"flex", alignItems:"center", gap:5 }}>
                    {canEdit ? t("common.done_editing") : t("common.edit_package")}
                  </button>
                  {canEdit && (
                    <button onClick={openEditPkg}
                      title={t("crm.edit_package_name_per_sqft_rate")}
                      style={{ padding:"6px 11px", borderRadius:6, background:"white",
                               border:"1px dashed #94A3B8", fontSize:11, fontWeight:600,
                               color:"#475569", cursor:"pointer" }}>
                     {t("crm.package_basics")}
                    </button>
                  )}
                </div>
                {canEdit && (
                  <button onClick={openAddSec}
                    style={{ padding:"6px 12px", borderRadius:6, background:"white",
                             border:"1.5px solid " + COL_DARK, fontSize:11.5, fontWeight:700,
                             color: COL_DARK, cursor:"pointer" }}>
                   {t("common.add_section")}
                  </button>
                )}
              </div>
            )}

            {/* Sections tree */}
            {breakdown.sections.length === 0 ? (
              <div style={{ padding:"30px 18px", background:"white", border:"1px dashed #CBD5E1",
                            borderRadius:10, textAlign:"center", color:"#64748B", fontSize:13 }}>
                {t("crm.package_no_sections")} {!readOnly && <span>{t("common.click")} <strong>{t("common.add_section")}</strong> {t("crm.above")}</span>}
              </div>
            ) : breakdown.sections.map(sec => {
              const sCollapsed = !!collapsedSections[sec.id];
              // Warn when NO category has an area yet — the section's qty is
              // derived, so a zero total means nothing has been entered below.
              const noAreaHint = !(sec.qty > 0);
              const secPerItem = !!sec.per_item_qty;
              return (
                <div key={sec.id}
                  style={{ background:"white", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:12, overflow:"hidden" }}>
                  {/* Section header */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 16px", background:COL_DARK, color:"white" }}>
                    <span onClick={() => setCollapsedSections(p => ({ ...p, [sec.id]: !p[sec.id] }))}
                      style={{ cursor:"pointer", display:"flex" }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={2.5}
                        style={{ transition:"transform .15s", transform: sCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </span>
                    <span style={{ fontWeight:700, fontSize:14, color:"white" }}>{sec.name}</span>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>
                      · {sec.categories.length} categ{sec.categories.length === 1 ? "ory" : "ories"}
                    </span>
                    {canEdit && (
                      <span style={{ display:"flex", gap:4, marginLeft:2 }}>
                        <button onClick={() => renameSection(sec)} title={t("estimate_builder.rename_section")}
                          style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.18)",
                                   color:"rgba(255,255,255,0.85)", borderRadius:4, width:22, height:22,
                                   fontSize:11, cursor:"pointer", padding:0, lineHeight:1 }}>
                          ✎
                        </button>
                        <button onClick={() => deleteSection(sec)} title={t("estimate_builder.delete_section")}
                          style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.35)",
                                   color:"#FCA5A5", borderRadius:4, width:22, height:22,
                                   fontSize:11, cursor:"pointer", padding:0, lineHeight:1 }}>
                          🗑
                        </button>
                      </span>
                    )}
                    {noAreaHint && !readOnly && !secPerItem && (
                      <span style={{ marginLeft:6, padding:"2px 8px", fontSize:10.5, fontWeight:600,
                                     background:"rgba(252,211,77,0.18)", color:"#FCD34D", borderRadius:4, border:"1px solid rgba(252,211,77,0.35)" }}>
                       {t("crm.set_area")}
                      </span>
                    )}
                    {secPerItem && (
                      <span style={{ marginLeft:6, padding:"2px 8px", fontSize:10, fontWeight:700,
                                     background:"rgba(245,158,11,0.22)", color:"#FCD34D",
                                     border:"1px solid #F59E0B", borderRadius:4,
                                     letterSpacing:".3px", textTransform:"uppercase" }}>
                       {t("common.per_item_qty")}
                      </span>
                    )}
                    <div style={{ marginLeft:"auto", display:"flex", gap:12, alignItems:"center", fontSize:11.5, fontWeight:600 }}>
                      {/* Aggregates only when in uniform mode — per-item mode
                          totals are item-by-item so per-sqft / aggregated Area
                          are mathematically meaningless. */}
                      {!secPerItem && (
                        <>
                          {/* Section rollup is DERIVED — area is entered per
                              category (GF/FF/SF can differ), so the section
                              shows Σ area and the blended rate. There is no
                              section-level area input: one editable place for
                              a number, and rate × qty always equals total. */}
                          <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ color:"rgba(255,255,255,0.55)", fontSize:11, textTransform:"uppercase" }}>{t("common.qty")}</span>
                            <strong style={{ color:"white", fontSize:12.5 }}>{inrIN(sec.qty || 0)}</strong>
                          </span>
                          <span style={{ padding:"3px 9px", background:COL_TEAL_BG, color:COL_TEAL, borderRadius:4, fontWeight:700 }}
                            title={t("estimate_builder.blended_rate_total_total_area")}>{t("estimate_builder.rs_inrin_sec", { inrIN: inrIN(Math.round(sec.rate || 0)), sec: sec.unit || "sqft" })}</span>
                        </>
                      )}
                      <span style={{ color:"rgba(255,255,255,0.6)" }}>{t("common.total")} <strong style={{ color:COL_TEAL_BG, fontSize:13 }}>{t("estimate_builder.rs_inrin", { inrIN: inrIN(sec.total) })}</strong></span>
                    </div>
                  </div>

                  {/* Categories */}
                  {!sCollapsed && (
                    <div style={{ padding:10 }}>
                      {sec.categories.length === 0 && (
                        <div style={{ padding:"14px 12px", textAlign:"center", color:"#9CA3AF", fontSize:12.5 }}>
                         {t("crm.no_categories")}
                        </div>
                      )}
                      {sec.categories.map(cat => {
                        const catKey = `${sec.id}:${cat.id}`;
                        const catCollapsed = !!collapsedCats[catKey];
                        const cm = measurements.sections[sec.id]?.categories?.[cat.id] || {};
                        // Category area is now the ONLY place a qty is entered.
                        // Show the effective value (own area, else the package
                        // default) so the field always reads what is in use.
                        const areaVal = cat.area === 0 && !isSet(cm.area_override) ? "" : String(cat.area ?? "");
                        return (
                          <div key={cat.id} style={{ marginBottom:10, border:"1px solid #E5E7EB", borderRadius:8, overflow:"hidden" }}>
                            {/* Category header */}
                            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:COL_CAT_BG, borderBottom: catCollapsed ? "none" : "1px solid #E5E7EB" }}>
                              <span onClick={() => setCollapsedCats(p => ({ ...p, [catKey]: !p[catKey] }))}
                                style={{ cursor:"pointer", display:"flex" }}>
                                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2.5}
                                  style={{ transition:"transform .15s", transform: catCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}>
                                  <polyline points="9 18 15 12 9 6"/>
                                </svg>
                              </span>
                              <span style={{ fontWeight:700, fontSize:12.5, color:"#0F172A" }}>{cat.name}</span>
                              <span style={{ fontSize:10.5, color:"#94A3B8" }}>· {cat.items.length} item{cat.items.length === 1 ? "" : "s"}</span>
                              {canEdit && (
                                <span style={{ display:"flex", gap:4, marginLeft:2 }}>
                                  <button onClick={() => renameCategory(sec, cat)} title={t("estimate_builder.rename_category")}
                                    style={{ background:"white", border:"1px solid #CBD5E1",
                                             color:"#475569", borderRadius:4, width:20, height:20,
                                             fontSize:10.5, cursor:"pointer", padding:0, lineHeight:1 }}>
                                    ✎
                                  </button>
                                  <button onClick={() => deleteCategory(sec, cat)} title={t("estimate_builder.delete_category")}
                                    style={{ background:"#FEF2F2", border:"1px solid #FECACA",
                                             color:COL_RED, borderRadius:4, width:20, height:20,
                                             fontSize:10.5, cursor:"pointer", padding:0, lineHeight:1 }}>
                                    🗑
                                  </button>
                                </span>
                              )}
                              <div style={{ marginLeft:"auto", display:"flex", gap:10, alignItems:"center", fontSize:11, fontWeight:600 }}>
                                {/* Category Area override hidden when section uses per-item qty */}
                                {/* Σ Base + Σ Add-on of items in this category —
                                    same triple as the library so user can
                                    cross-verify rates instantly. */}
                                {!secPerItem && (
                                  <>
                                    <span style={{ color:"#64748B" }}>{t("common.base")} <strong style={{ color:"#0F172A" }}>{t("estimate_builder.rs_inrin", { inrIN: inrIN(cat.base || 0) })}</strong></span>
                                    <span style={{ color:"#64748B" }}>{t("common.add_on")} <strong style={{ color:COL_AMBER }}>{t("estimate_builder.rs_inrin", { inrIN: inrIN(cat.addOn || 0) })}</strong></span>
                                    <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                                      <span style={{ color:"#64748B", fontSize:10.5, textTransform:"uppercase" }}>{t("common.area")}</span>
                                      {readOnly ? (
                                        <span style={{ padding:"3px 7px", color:"#0F172A", fontWeight:700, fontSize:12 }}>{inrIN(cat.area)}</span>
                                      ) : (
                                        <input type="number" value={areaVal}
                                          onChange={e => patchCategory(sec.id, cat.id, { area_override: e.target.value === "" ? null : e.target.value })}
                                          placeholder="0"
                                          title={t("estimate_builder.is_category_ki_area_qty_section")}
                                          style={{ width:70, padding:"4px 7px", borderRadius:5, textAlign:"right",
                                                   fontFamily:"inherit", fontSize:11.5, fontWeight:700,
                                                   border:"1.5px solid #CBD5E1", background:"white",
                                                   color:"#0F172A", outline:"none" }}/>
                                      )}
                                    </span>
                                  </>
                                )}
                                <span style={{ color:"#64748B" }}>{t("common.total")} <strong style={{ color:COL_GREEN }}>{t("estimate_builder.rs_inrin", { inrIN: inrIN(cat.total) })}</strong></span>
                              </div>
                            </div>

                            {/* Items */}
                            {!catCollapsed && (
                              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                                <thead>
                                  <tr style={{ background:"#FAFAFA" }}>
                                    <th style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase" }}>{t("common.item")}</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", width:100 }}>{t("common.base")}</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:COL_AMBER, textTransform:"uppercase", width:100 }}>{t("common.add_on")}</th>
                                    <th style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase" }}>{t("common.description")}</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:COL_TEAL, textTransform:"uppercase", width:70 }}>{t("common.area")}</th>
                                    <th style={{ padding:"7px 12px", textAlign:"right", fontSize:10, fontWeight:700, color:COL_GREEN, textTransform:"uppercase", width:110 }}>{t("common.total")}</th>
                                    <th style={{ width:36 }}/>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cat.items.length === 0 && (
                                    <tr><td colSpan={7} style={{ padding:"12px", textAlign:"center", color:"#9CA3AF", fontSize:12 }}>{t("common.no_items")}</td></tr>
                                  )}
                                  {cat.items.map((it, idx) => {
                                    // Look up master item name from boqItems? We don't have it here.
                                    // Instead use the pcr row's item_id mapping — we'd need to join.
                                    // Pull name from pkgItems master rows via a quick find.
                                    const pcr = (pkgItems[sec.id] || []).find(p => p.item_id === it.item_id) || {};
                                    const itemName = pcr.item_name || pcr.name || ("Item #" + it.item_id);
                                    const itemUnit = pcr.unit || "—";
                                    const overrideEntry = measurements.sections[sec.id]?.categories?.[cat.id]?.items?.[it.item_id] || {};
                                    const baseVal  = isSet(overrideEntry.base_rate_override)   ? overrideEntry.base_rate_override   : "";
                                    const addOnVal = isSet(overrideEntry.add_on_override)      ? overrideEntry.add_on_override      : "";
                                    const descVal  = isSet(overrideEntry.description_override) ? overrideEntry.description_override : "";
                                    return (
                                      <tr key={it.item_id} style={{ background: it.hasOverride ? "#FFFBEB" : (idx % 2 === 0 ? "white" : "#FAFAFA"), borderBottom:"1px solid #F3F4F6" }}>
                                        <td style={{ padding:"8px 12px", fontWeight:600, fontSize:12.5, color:"#0F172A" }}>
                                          {itemName}
                                          {it.hasOverride && (
                                            <span style={{ marginLeft:6, padding:"1px 6px", fontSize:9.5, fontWeight:700, background:COL_AMBER, color:"white", borderRadius:3 }}>EDITED</span>
                                          )}
                                          <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>{itemUnit}</div>
                                        </td>
                                        <td style={{ padding:"8px 12px", textAlign:"right" }}>
                                          {canEdit ? (
                                            <input type="number" value={baseVal} placeholder={String(it.masterBase)}
                                              onChange={e => patchItem(sec.id, cat.id, it.item_id, { base_rate_override: e.target.value === "" ? null : e.target.value })}
                                              title={`Master: Rs.${inrIN(it.masterBase)} · leave blank to use master`}
                                              style={{ width:90, padding:"5px 7px", borderRadius:5, textAlign:"right", fontFamily:"inherit", fontSize:12.5,
                                                       border:"1.5px solid " + (baseVal !== "" ? COL_AMBER : "#E5E7EB"),
                                                       background: baseVal !== "" ? "#FFFBEB" : "white", outline:"none",
                                                       color: baseVal !== "" ? "#92400E" : "#0F172A", fontWeight: baseVal !== "" ? 700 : 500 }}/>
                                          ) : (
                                            <span style={{ fontSize:12.5, fontWeight:600 }}>{inrIN(it.base)}</span>
                                          )}
                                        </td>
                                        <td style={{ padding:"8px 12px", textAlign:"right" }}>
                                          {canEdit ? (
                                            <input type="number" value={addOnVal} placeholder={String(it.masterAddOn)}
                                              onChange={e => patchItem(sec.id, cat.id, it.item_id, { add_on_override: e.target.value === "" ? null : e.target.value })}
                                              title={`Master: Rs.${inrIN(it.masterAddOn)} · leave blank to use master`}
                                              style={{ width:90, padding:"5px 7px", borderRadius:5, textAlign:"right", fontFamily:"inherit", fontSize:12.5,
                                                       border:"1.5px solid " + (addOnVal !== "" ? COL_AMBER : "#E5E7EB"),
                                                       background: addOnVal !== "" ? "#FFFBEB" : "white", outline:"none",
                                                       color: COL_AMBER, fontWeight: addOnVal !== "" ? 700 : 500 }}/>
                                          ) : (
                                            <span style={{ fontSize:12.5, fontWeight:600, color:COL_AMBER }}>{inrIN(it.addOn)}</span>
                                          )}
                                        </td>
                                        <td style={{ padding:"8px 12px" }}>
                                          {canEdit ? (
                                            <input type="text" value={descVal} placeholder={it.masterDesc || t("common.optional")}
                                              onChange={e => patchItem(sec.id, cat.id, it.item_id, { description_override: e.target.value || null })}
                                              title={it.masterDesc ? `Master: ${it.masterDesc}` : t("crm.leave_blank_to_use_master")}
                                              style={{ width:"100%", padding:"5px 9px", borderRadius:5, fontFamily:"inherit", fontSize:11.5,
                                                       border:"1.5px solid " + (descVal ? COL_AMBER : "#E5E7EB"),
                                                       background: descVal ? "#FFFBEB" : "white", outline:"none", boxSizing:"border-box" }}/>
                                          ) : (
                                            <span style={{ fontSize:11.5, color:"#475569" }}>{it.desc || "—"}</span>
                                          )}
                                        </td>
                                        {/* Area / Qty column. Per-item mode + editable: amber qty input
                                            for THIS quote (stored as qty_override in measurements).
                                            Uniform mode: shows category/section area. */}
                                        <td style={{ padding:"8px 12px", textAlign:"right", fontSize:12, color:COL_TEAL, fontWeight:600 }}>
                                          {secPerItem && !readOnly ? (
                                            (() => {
                                              const itOv = measurements.sections[sec.id]?.categories?.[cat.id]?.items?.[it.item_id] || {};
                                              const qVal = isSet(itOv.qty_override) ? String(itOv.qty_override) : "";
                                              return (
                                                <input type="number" value={qVal}
                                                  onChange={e => patchItemQtyOverride(sec.id, cat.id, it.item_id, e.target.value)}
                                                  placeholder={String(it.masterQty || 0)}
                                                  title={`Master qty: ${it.masterQty || 0} — leave blank to use master`}
                                                  style={{ width:70, padding:"5px 7px", borderRadius:5, textAlign:"right",
                                                           fontFamily:"inherit", fontSize:12.5,
                                                           border:"1.5px solid " + (qVal ? COL_AMBER : "#E5E7EB"),
                                                           background: qVal ? "#FFFBEB" : "white", outline:"none",
                                                           color: COL_TEAL, fontWeight: 700 }}/>
                                              );
                                            })()
                                          ) : (
                                            inrIN(it.qty != null ? it.qty : cat.area)
                                          )}
                                        </td>
                                        <td style={{ padding:"8px 12px", textAlign:"right", fontSize:13, fontWeight:700, color:COL_GREEN }}>{t("estimate_builder.rs_inrin", { inrIN: inrIN(it.total) })}</td>
                                        <td style={{ padding:"8px 6px", textAlign:"center" }}>
                                          {it.hasOverride && canEdit && (
                                            <button onClick={() => resetItemRow(sec.id, cat.id, it.item_id)}
                                              title={t("crm.reset_to_master_rates")}
                                              style={{ background:"transparent", border:"1px solid #E5E7EB", color:"#64748B", borderRadius:4, width:22, height:22, fontSize:11, cursor:"pointer" }}>
                                              ↺
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                            {/* + Add Item per category — only in edit mode */}
                            {!catCollapsed && canEdit && (
                              <div style={{ padding:"7px 12px", borderTop:"1px solid #F3F4F6", background:"#FAFAFA" }}>
                                <button onClick={() => openAddItem(sec, cat)}
                                  style={{ background:"transparent", border:"1px dashed #BFDBFE",
                                           color: COL_BLUE, borderRadius:5,
                                           padding:"4px 11px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{t("estimate_builder.add_item_to_name", { name: cat.name })}</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* + Add Category at section bottom — only in edit mode */}
                      {canEdit && (
                        <div style={{ paddingTop:6, textAlign:"right" }}>
                          <button onClick={() => openAddCat(sec)}
                            style={{ background:"white", border:"1px dashed #94A3B8",
                                     color:"#475569", borderRadius:6,
                                     padding:"5px 13px", fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
                           {t("common.add_category")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Grand Total bar */}
            {breakdown.sections.length > 0 && (
              <div style={{ marginTop:10, padding:"14px 20px", background:COL_DARK, color:"white",
                            borderRadius:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:".4px", color:"rgba(255,255,255,0.7)" }}>
                 {t("common.grand_total")}
                </span>
                <span style={{ fontSize:20, fontWeight:700, color:COL_TEAL_BG }}>{t("estimate_builder.rs_inrin", { inrIN: inrIN(breakdown.grandTotal) })}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      {(step === "build" || step === "scratch") && (
        <div style={{ borderTop:"1px solid #E5E7EB", background:"white",
                      padding:"12px 24px", display:"flex", gap:8, alignItems:"center" }}>
          {initialMode === "library" && selectedPackage && (
            <button onClick={() => setStep("package")} disabled={saving}
              style={{ padding:"9px 16px", borderRadius:7, border:"1px solid #D1D5DB", background:"white",
                       fontSize:12.5, color:"#475569", fontWeight:600, cursor:saving?"not-allowed":"pointer" }}>
             {t("crm.back_to_packages")}
            </button>
          )}
          <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, color:"#64748B", fontWeight:500 }}><Rich k="estimate_builder.subtotal_inrin" params={{ inrIN: inrIN(breakdown.grandTotal) }} />{Number(taxPct) > 0 && <>{t("estimate_builder.gst_taxpct_inrin", { taxPct, inrIN: inrIN(breakdown.grandTotal * (Number(taxPct)/100)) })}</>}
              {Number(taxPct) > 0 && <> · <span style={{color:"#059669",fontWeight:700}}>{t("estimate_builder.total_inrin", { inrIN: inrIN(breakdown.grandTotal * (1 + Number(taxPct)/100)) })}</span></>}
            </span>
            <button onClick={onClose} disabled={saving}
              style={{ padding:"9px 18px", borderRadius:7, background:"#F8FAFC", border:"1px solid #D1D5DB",
                       fontSize:12.5, fontWeight:600, color:"#374151", cursor:saving?"not-allowed":"pointer" }}>
             {t("common.cancel")}
            </button>
            <button onClick={saveEstimate} disabled={!canSave}
              style={{ padding:"9px 22px", borderRadius:7,
                       background: canSave ? COL_BLUE : "#9CA3AF",
                       color:"white", border:"none", fontSize:12.5, fontWeight:700,
                       cursor: canSave ? "pointer" : "not-allowed" }}>
              {saving ? t("common.saving_2") : t("estimate_builder.save_estimate")}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          EDIT PACKAGE MODAL — basics only (name + sqft_rate + description).
          For deep edits (sections / items / category renames) use Library.
      ═══════════════════════════════════════════════════════════════ */}
      {pkgEditOpen && (
        <>
          <div onClick={() => !pkgEditSaving && setPkgEditOpen(false)}
            style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:920 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                     width:"min(460px,95vw)", background:"white", borderRadius:12, zIndex:921,
                     boxShadow:"0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background:COL_DARK, padding:"13px 18px", borderRadius:"12px 12px 0 0",
                          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"white" }}>{t("common.edit_package_2")}</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1 }}>
                 {t("crm.changes_save_to_library_affects_future")}
                </div>
              </div>
              <button onClick={() => !pkgEditSaving && setPkgEditOpen(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>{t("common.name")}</label>
                <input autoFocus value={pkgEditForm.name || ""}
                  onChange={e => setPkgEditForm(p => ({ ...p, name: e.target.value }))}
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>{t("crm.per_sqft_rate_rs")}</label>
                <input type="number" value={pkgEditForm.sqft_rate ?? 0}
                  onChange={e => setPkgEditForm(p => ({ ...p, sqft_rate: e.target.value }))}
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", textAlign:"right" }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>{t("common.description")}</label>
                <input value={pkgEditForm.description || ""}
                  onChange={e => setPkgEditForm(p => ({ ...p, description: e.target.value }))}
                  placeholder={t("common.optional")}
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
            </div>
            <div style={{ padding:"12px 16px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8, background:"#F9FAFB" }}>
              <button onClick={() => !pkgEditSaving && setPkgEditOpen(false)} disabled={pkgEditSaving}
                style={{ flex:1, padding:"9px", borderRadius:6, border:"1px solid #D1D5DB",
                         background:"white", fontSize:13, color:"#374151", cursor: pkgEditSaving ? "not-allowed":"pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={saveEditPkg} disabled={pkgEditSaving || !pkgEditForm.name?.trim()}
                style={{ flex:2, padding:"9px", borderRadius:6,
                         background:(pkgEditSaving||!pkgEditForm.name?.trim())?"#9CA3AF":COL_BLUE,
                         color:"white", border:"none", fontSize:13, fontWeight:700,
                         cursor:(pkgEditSaving||!pkgEditForm.name?.trim())?"not-allowed":"pointer" }}>
                {pkgEditSaving ? t("common.saving_2") : t("common.save")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD SECTION MODAL (centered)
      ═══════════════════════════════════════════════════════════════ */}
      {addSecModal && (
        <>
          <div onClick={() => !addSecSaving && setAddSecModal(false)}
            style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:920 }}/>
          <div onClick={e => e.stopPropagation()}
            style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                     width:"min(460px,95vw)", background:"white", borderRadius:12, zIndex:921,
                     boxShadow:"0 24px 64px rgba(0,0,0,0.35)" }}>
            <div style={{ background:COL_DARK, padding:"13px 18px", borderRadius:"12px 12px 0 0",
                          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"white" }}>{t("common.add_section_2")}</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1 }}>{t("estimate_builder.saves_to_library_package_name", { name: selectedPackage?.name })}</div>
              </div>
              <button onClick={() => !addSecSaving && setAddSecModal(false)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:18 }}>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>{t("common.name")}</label>
                <input autoFocus value={addSecForm.name}
                  onChange={e => setAddSecForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={t("crm.e_g_ground_floor_other_civil")}
                  style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                           fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:COL_TEAL, display:"block", marginBottom:3, textTransform:"uppercase" }}>{t("crm.area_qty")}</label>
                  <input type="number" value={addSecForm.default_qty}
                    onChange={e => setAddSecForm(p => ({ ...p, default_qty: e.target.value }))}
                    placeholder="0"
                    style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid " + COL_TEAL_BG,
                             fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", textAlign:"right", background:"#F0FDFA" }}/>
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:3, textTransform:"uppercase" }}>{t("common.unit")}</label>
                  <select value={addSecForm.unit}
                    onChange={e => setAddSecForm(p => ({ ...p, unit: e.target.value }))}
                    style={{ width:"100%", padding:"8px 11px", borderRadius:6, border:"1.5px solid #D1D5DB",
                             fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", background:"white" }}>
                    <option value="sqft">sqft</option>
                    <option value="lump_sum">{t("common.lump_sum")}</option>
                    <option value="rft">rft</option>
                    <option value="nos">nos</option>
                    <option value="cubic_ft">{t("common.cubic_ft")}</option>
                  </select>
                </div>
              </div>
              {/* Per-item qty toggle */}
              <div style={{ padding:"9px 11px", background: addSecForm.per_item_qty ? "#FFFBEB" : "#F9FAFB",
                            border:"1.5px solid " + (addSecForm.per_item_qty ? "#FCD34D" : "#E5E7EB"),
                            borderRadius:6, cursor:"pointer", userSelect:"none" }}
                onClick={() => setAddSecForm(p => ({ ...p, per_item_qty: !p.per_item_qty }))}>
                <label style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer" }}>
                  <input type="checkbox" checked={!!addSecForm.per_item_qty} onChange={() => {}}
                    style={{ width:15, height:15, cursor:"pointer", flexShrink:0 }}/>
                  <div>
                    <div style={{ fontSize:11.5, fontWeight:700, color:"#0F172A" }}>{t("estimate_builder.per_item_quantity_addsecform", { addSecForm: addSecForm.per_item_qty ? "(ON)" : "(OFF — uniform area)" })}</div>
                    <div style={{ fontSize:10, color:"#6B7280", marginTop:1 }}>
                     {t("crm.each_item_has_its_own_qty")}
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <div style={{ padding:"12px 16px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8, background:"#F9FAFB" }}>
              <button onClick={() => !addSecSaving && setAddSecModal(false)} disabled={addSecSaving}
                style={{ flex:1, padding:"9px", borderRadius:6, border:"1px solid #D1D5DB",
                         background:"white", fontSize:13, color:"#374151", cursor: addSecSaving?"not-allowed":"pointer" }}>
               {t("common.cancel")}
              </button>
              <button onClick={saveAddSec} disabled={addSecSaving || !addSecForm.name?.trim()}
                style={{ flex:2, padding:"9px", borderRadius:6,
                         background:(addSecSaving||!addSecForm.name?.trim())?"#9CA3AF":COL_BLUE,
                         color:"white", border:"none", fontSize:13, fontWeight:700,
                         cursor:(addSecSaving||!addSecForm.name?.trim())?"not-allowed":"pointer" }}>
                {addSecSaving ? t("common.adding") : t("common.add_section_2")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ADD CATEGORY DRAWER (right slide-over, multi-pick + create new)
      ═══════════════════════════════════════════════════════════════ */}
      {addCatDrawer && (() => {
        const alreadyInSection = new Set(
          pkgCategories.filter(c => c.structure_id === addCatDrawer.structure_id).map(c => c.category_name)
        );
        return (
          <>
            <div onClick={() => !addCatSaving && setAddCatDrawer(null)}
              style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:920 }}/>
            <div onClick={e => e.stopPropagation()}
              style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(400px,95vw)",
                       background:"white", zIndex:921, boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",
                       display:"flex", flexDirection:"column" }}>
              <div style={{ background:COL_DARK, padding:"13px 16px", color:"white",
                            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{t("common.add_category_2")}</div>
                  <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1 }}>{t("estimate_builder.section_section_name", { section_name: addCatDrawer.section_name })}</div>
                </div>
                <button onClick={() => !addCatSaving && setAddCatDrawer(null)}
                  style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:12 }}>
                {allWorkCats.map(c => {
                  const exists = alreadyInSection.has(c.name);
                  const pickIdx = addCatPicks.indexOf(c.id);
                  const isPicked = pickIdx >= 0;
                  return (
                    <label key={c.id}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:6,
                               cursor: exists ? "not-allowed" : "pointer",
                               background: exists ? "#F3F4F6" : (isPicked ? "#EFF6FF" : "white"),
                               border: "1px solid " + (isPicked ? "#BFDBFE" : "#E5E7EB"),
                               marginBottom:5, opacity: exists ? 0.55 : 1 }}>
                      <input type="checkbox" disabled={exists} checked={isPicked}
                        onChange={() => toggleCatPick(c.id)}
                        style={{ width:16, height:16 }}/>
                      {isPicked && (
                        <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                                       width:20, height:20, borderRadius:"50%", background:COL_BLUE,
                                       color:"white", fontSize:10.5, fontWeight:700, flexShrink:0 }}>
                          {pickIdx + 1}
                        </span>
                      )}
                      <span style={{ flex:1 }}>
                        <span style={{ fontSize:12.5, fontWeight:600, color:"#0F172A" }}>{c.name}</span>
                        {exists && <span style={{ marginLeft:8, fontSize:10, color:"#9CA3AF" }}>{t("common.already_added")}</span>}
                      </span>
                    </label>
                  );
                })}
                <div style={{ marginTop:12, paddingTop:12, borderTop:"1px dashed #E5E7EB" }}>
                  {addCatNewForm === null ? (
                    <button onClick={() => setAddCatNewForm({ name:"", code:"", desc:"" })}
                      style={{ width:"100%", padding:"8px 12px", background:"#F0FDF4",
                               border:"1px dashed #10B981", color:"#10B981",
                               borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                     {t("common.create_new_category")}
                    </button>
                  ) : (
                    <div style={{ padding:10, background:"#F9FAFB", borderRadius:6, border:"1px solid #E5E7EB" }}>
                      <input autoFocus value={addCatNewForm.name}
                        onChange={e => setAddCatNewForm(p => ({ ...p, name: e.target.value }))}
                        placeholder={t("common.name_2")}
                        style={{ width:"100%", padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB",
                                 fontSize:12, marginBottom:6, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                      <input value={addCatNewForm.code}
                        onChange={e => setAddCatNewForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        placeholder={t("common.code_optional")}
                        style={{ width:"100%", padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB",
                                 fontSize:12, marginBottom:6, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setAddCatNewForm(null)}
                          style={{ flex:1, padding:6, borderRadius:5, background:"white",
                                   border:"1px solid #D1D5DB", fontSize:11.5, color:"#6B7280", cursor:"pointer" }}>
                         {t("common.cancel")}
                        </button>
                        <button onClick={createAndAddCat} disabled={addCatSaving || !addCatNewForm.name?.trim()}
                          style={{ flex:2, padding:6, borderRadius:5,
                                   background: (addCatSaving||!addCatNewForm.name?.trim())?"#9CA3AF":"#10B981",
                                   color:"white", border:"none", fontSize:11.5, fontWeight:700,
                                   cursor: (addCatSaving||!addCatNewForm.name?.trim())?"not-allowed":"pointer" }}>
                          {addCatSaving ? t("common.saving_2") : t("common.create_add")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding:"12px 14px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8 }}>
                <button onClick={() => !addCatSaving && setAddCatDrawer(null)} disabled={addCatSaving}
                  style={{ flex:1, padding:"8px", borderRadius:6, border:"1px solid #D1D5DB",
                           background:"white", fontSize:12, color:"#374151", cursor: addCatSaving?"not-allowed":"pointer" }}>
                 {t("common.cancel")}
                </button>
                <button onClick={confirmAddCat} disabled={addCatSaving || addCatPicks.length === 0}
                  style={{ flex:2, padding:"8px", borderRadius:6,
                           background:(addCatSaving||addCatPicks.length===0)?"#9CA3AF":COL_BLUE,
                           color:"white", border:"none", fontSize:12, fontWeight:700,
                           cursor:(addCatSaving||addCatPicks.length===0)?"not-allowed":"pointer" }}>
                  {addCatSaving ? t("common.adding") : `Add Selected (${addCatPicks.length})`}
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════
          ADD ITEM DRAWER (right slide-over, items grouped by master cat)
      ═══════════════════════════════════════════════════════════════ */}
      {addItemDrawer && (() => {
        const sid = addItemDrawer.structure_id;
        const alreadyHere = new Set((pkgItems[sid] || []).map(r => r.item_id));
        const q = addItemSearch.trim().toLowerCase();
        const filtered = allBoqItems.filter(i =>
          !q || (i.name || "").toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q)
        );
        const grouped = filtered.reduce((acc, i) => {
          const k = i.category || "Uncategorized";
          (acc[k] ||= []).push(i);
          return acc;
        }, {});
        return (
          <>
            <div onClick={() => !addItemSaving && setAddItemDrawer(null)}
              style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:920 }}/>
            <div onClick={e => e.stopPropagation()}
              style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(480px,95vw)",
                       background:"white", zIndex:921, boxShadow:"-12px 0 32px rgba(0,0,0,0.18)",
                       display:"flex", flexDirection:"column" }}>
              <div style={{ background:COL_DARK, padding:"13px 16px", color:"white",
                            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{t("common.add_item_2")}</div>
                  <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.55)", marginTop:1,
                                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {addItemDrawer.section_name} › {addItemDrawer.category_name}
                  </div>
                </div>
                <button onClick={() => !addItemSaving && setAddItemDrawer(null)}
                  style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
              </div>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid #E5E7EB", background:"#F9FAFB" }}>
                <input value={addItemSearch}
                  onChange={e => setAddItemSearch(e.target.value)}
                  placeholder={t("common.search_items")}
                  style={{ width:"100%", padding:"7px 11px", borderRadius:6,
                           border:"1.5px solid #E5E7EB", fontSize:12.5, outline:"none",
                           fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
                {Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0])).map(([catName, items]) => (
                  <div key={catName} style={{ marginBottom:4 }}>
                    <div style={{ padding:"6px 14px", fontSize:10.5, fontWeight:700,
                                  color:"#6B7280", textTransform:"uppercase",
                                  background:"#F3F4F6", letterSpacing:".4px" }}>
                      {catName} <span style={{ color:"#9CA3AF" }}>· {items.length}</span>
                    </div>
                    {items.map(i => {
                      const here = alreadyHere.has(i.id);
                      const pickIdx = addItemPicks.indexOf(i.id);
                      const isPicked = pickIdx >= 0;
                      return (
                        <label key={i.id}
                          style={{ display:"flex", alignItems:"center", gap:10,
                                   padding:"8px 14px", cursor: here ? "not-allowed" : "pointer",
                                   background: here ? "#F9FAFB" : (isPicked ? "#EFF6FF" : "white"),
                                   borderBottom:"1px solid #F3F4F6",
                                   opacity: here ? 0.55 : 1 }}>
                          <input type="checkbox" disabled={here} checked={isPicked}
                            onChange={() => toggleItemPick(i.id)}
                            style={{ width:16, height:16 }}/>
                          {isPicked && (
                            <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
                                           width:20, height:20, borderRadius:"50%", background:COL_BLUE,
                                           color:"white", fontSize:10.5, fontWeight:700, flexShrink:0 }}>
                              {pickIdx + 1}
                            </span>
                          )}
                          <span style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12.5, fontWeight:600, color:"#0F172A" }}>
                              {i.name}{here && <span style={{ marginLeft:8, fontSize:10, color:"#9CA3AF" }}>{t("common.already_here")}</span>}
                            </div>
                            <div style={{ fontSize:10.5, color:"#64748B", marginTop:1 }}>{t("estimate_builder.base_rs_inrin_unit", { inrIN: inrIN(i.base_rate), unit: i.unit })}</div>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
                <div style={{ padding:"12px 14px", borderTop:"1px dashed #E5E7EB", marginTop:8 }}>
                  {addItemNewForm === null ? (
                    <button onClick={() => setAddItemNewForm({ name:"", unit:"Sq.Ft", category: addItemDrawer.category_name, base_rate:0 })}
                      style={{ width:"100%", padding:"8px 12px", background:"#F0FDF4",
                               border:"1px dashed #10B981", color:"#10B981",
                               borderRadius:6, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                     {t("common.create_new_item")}
                    </button>
                  ) : (
                    <div style={{ padding:10, background:"#F9FAFB", borderRadius:6, border:"1px solid #E5E7EB" }}>
                      <input autoFocus value={addItemNewForm.name}
                        onChange={e => setAddItemNewForm(p => ({ ...p, name: e.target.value }))}
                        placeholder={t("common.item_name")}
                        style={{ width:"100%", padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB",
                                 fontSize:12, marginBottom:6, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:6 }}>
                        <select value={addItemNewForm.unit}
                          onChange={e => setAddItemNewForm(p => ({ ...p, unit: e.target.value }))}
                          style={{ padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB", fontSize:12, fontFamily:"inherit", background:"white" }}>
                          {(allUoms.length > 0 ? allUoms.map(u => u.name) : ["Sq.Ft","Nos","Lump Sum","Running Ft","Kg","Point","Unit"]).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" value={addItemNewForm.base_rate}
                          onChange={e => setAddItemNewForm(p => ({ ...p, base_rate: e.target.value }))}
                          placeholder={t("common.base_rate")}
                          style={{ padding:"6px 9px", borderRadius:5, border:"1.5px solid #D1D5DB", fontSize:12, fontFamily:"inherit", textAlign:"right", boxSizing:"border-box" }}/>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => setAddItemNewForm(null)}
                          style={{ flex:1, padding:6, borderRadius:5, background:"white",
                                   border:"1px solid #D1D5DB", fontSize:11.5, color:"#6B7280", cursor:"pointer" }}>
                         {t("common.cancel")}
                        </button>
                        <button onClick={createAndAddItem} disabled={addItemSaving || !addItemNewForm.name?.trim()}
                          style={{ flex:2, padding:6, borderRadius:5,
                                   background:(addItemSaving||!addItemNewForm.name?.trim())?"#9CA3AF":"#10B981",
                                   color:"white", border:"none", fontSize:11.5, fontWeight:700,
                                   cursor:(addItemSaving||!addItemNewForm.name?.trim())?"not-allowed":"pointer" }}>
                          {addItemSaving ? t("common.saving_2") : t("common.create_add")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding:"12px 14px", borderTop:"1px solid #E5E7EB", display:"flex", gap:8 }}>
                <button onClick={() => !addItemSaving && setAddItemDrawer(null)} disabled={addItemSaving}
                  style={{ flex:1, padding:"8px", borderRadius:6, border:"1px solid #D1D5DB",
                           background:"white", fontSize:12, color:"#374151", cursor: addItemSaving?"not-allowed":"pointer" }}>
                 {t("common.cancel")}
                </button>
                <button onClick={confirmAddItems} disabled={addItemSaving || addItemPicks.length === 0}
                  style={{ flex:2, padding:"8px", borderRadius:6,
                           background:(addItemSaving||addItemPicks.length===0)?"#9CA3AF":COL_BLUE,
                           color:"white", border:"none", fontSize:12, fontWeight:700,
                           cursor:(addItemSaving||addItemPicks.length===0)?"not-allowed":"pointer" }}>
                  {addItemSaving ? t("common.adding") : `Add Selected (${addItemPicks.length})`}
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}