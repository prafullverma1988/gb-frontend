import React, { useState, useEffect, useCallback } from "react";
import PickSelect from "../../components/PickSelect";
import api from "../../config/api";
import { T, fmtN, localYMD } from "../shared/tokens";
import { Pill, Stat, Panel, THead, AddBtn, FilterTabs } from "../shared/ui";
import TabTripTracking from "./TabTripTracking";
import { t } from "../../i18n";
import { can, canAny, canEntry } from "../../utils/perms";
import uploadManager from "../../utils/uploadManager";
import { fileInputProps } from "../../utils/photoPolicy";

// Route keys as the backend stores them (routes/equipment.js PAYMENT_ROUTES).
// "site_exp" used to fall through unlabelled and render as raw text.
const ROUTE_LABEL = {
  get vendor() { return t("equipment.route_vendor"); },
  get site_exp() { return t("equipment.route_site_exp"); },
  get subcon_against() { return t("equipment.route_subcon"); },
  get owned() { return t("equipment.route_owned"); },
  get subcon_self_paid() { return t("equipment.route_contractor_paid"); },
};
// Legacy machine ka status API value ("On Site" / "Returned") hai — sirf label translate.
const STATUS_LABEL = { get "On Site"() { return t("equipment.on_site"); }, get "Returned"() { return t("equipment.returned"); } };

function TabEquipment({ projectId }) {
  // Roles & Access (5 Oct 2026): usage log aur equipment request roz ka kaam
  // hain — Equipment ka ENTRY (transition me Create bhi). Usage log Machinery
  // ke Entry tick se bhi (machine ka log; strict — row na ho to nahi). Server
  // (routes/equipment.js) yahi maanta hai; bina tick ke button hi nahi.
  const canLogUsage = canEntry("Equipment") || canAny("Machinery", "entry", { strict: true });
  const canRequest = canEntry("Equipment");
  // Purana "Period & Status" hissa Library ke project-equipment par chalta hai
  // (routes/library.js — Library create / edit / delete).
  const canLegacyAdd = can("Library", "create");
  const canLegacyEdit = can("Library", "edit");
  const canLegacyDel = can("Library", "delete");
  // Library ki machine ka Receive / Release (site par aayi / gayi) — roz ka
  // site ka kaam: server POST /equipment/receive, /release/:id par Equipment
  // ENTRY ya CREATE maangta hai (6 Oct 2026).
  const canReceive = canEntry("Equipment");
  // Top-level view toggle: existing Equipment sections vs Trip Tracking.
  const [view, setView] = useState("equipment");
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  // Add-form state
  const [name,    setName]    = useState("");
  const [vendor,  setVendor]  = useState("Self");
  const [fromD,   setFromD]   = useState("");
  const [toD,     setToD]     = useState("");
  const [stat,    setStat]    = useState("On Site");
  const [rate,    setRate]    = useState("");
  const [saving,  setSaving]  = useState(false);

  // ── New equipment-module state ──────────────────────────────────
  const [usageRows, setUsageRows] = useState([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [masterList, setMasterList] = useState([]);
  const [partiesList, setPartiesList] = useState([]);
  const [reqList, setReqList] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  // collapse state for each new section
  const [openUsage, setOpenUsage] = useState(true);
  const [openLegacy, setOpenLegacy] = useState(false);
  // Receive — machine site par pahunchi (mobile jaisa, 6 Oct 2026): allot hui
  // (raaste me) ya city ki koi bhi; machine par dekha number + kam se kam 1
  // photo. Receive par machine is project par On Site, kahin aur thi to wahan
  // apne aap Returned (server). Release = site se gayi.
  const [eqSum, setEqSum] = useState(null);
  const [rcvOpen, setRcvOpen] = useState(false);
  const [rcvOpt, setRcvOpt] = useState({ loading: false, failed: false, city: "", transit: [], machines: [] });
  const [rcvSel, setRcvSel] = useState(null);     // { machine, request_id }
  const [rcvReg, setRcvReg] = useState("");
  const [rcvNote, setRcvNote] = useState("");
  const [rcvPhotos, setRcvPhotos] = useState([]); // uploaded urls
  const [rcvUp, setRcvUp] = useState(0);          // abhi upload ho rahi
  const [rcvBusy, setRcvBusy] = useState(false);
  const [openReqs, setOpenReqs] = useState(false);
  const [openReserved, setOpenReserved] = useState(false);

  // Log-usage form
  const emptyLog = {
    equipment_id: "", equipment_name: "", vendor_name: "",
    usage_date: localYMD(), start_time: "", end_time: "",
    hours_or_days: "", rate_used: "", trip_charge: "", lump_amount: "",
    settlement_side: "company", vendor_id: "", subcon_id: "",
    operator_name: "", meter_start: "", meter_end: "",
    sector: "", remark: "",
  };
  const [logForm, setLogForm] = useState(emptyLog);
  const [logSaving, setLogSaving] = useState(false);
  const [logErr, setLogErr] = useState("");
  const updLog = (k, v) => setLogForm(p => ({ ...p, [k]: v }));

  // Request form
  const emptyReq = { equipment_type: "Earthwork", capacity: "", from_date: "", to_date: "", duration_approx: "", reason: "", task_id: "", priority: "normal" };
  const [reqForm, setReqForm] = useState(emptyReq);
  const [reqSaving, setReqSaving] = useState(false);
  const updReq = (k, v) => setReqForm(p => ({ ...p, [k]: v }));

  // Request form ki madad (5 Oct 2026 — mobile jaisa): project ki CITY ki library
  // machine (koi khaas machine maangni ho to — zaroori nahi; GET
  // /equipment/request/recommend), duration dates se, aur "kis kaam ke liye" me
  // project ka task bhi aur likha hua bhi.
  const REQ_TYPES = ["Earthwork","Lifting","Concrete","Steel","Safety","Transport","Pumping","Compaction"];
  // Kitni jaldi chahiye — server ki chaabi + rang
  const REQ_PRIO = [
    { k: "normal", l: t("equipment.req_p_normal"), c: T.t3,  bg: T.bg },
    { k: "high",   l: t("equipment.req_p_high"),   c: T.amb, bg: T.ambL },
    { k: "urgent", l: t("equipment.req_p_urgent"), c: T.red, bg: T.redL },
  ];
  const [reqRec, setReqRec] = useState({ loading: false, failed: false, city: "", machines: [] });
  const [reqMachQ, setReqMachQ] = useState("");
  const [reqPref, setReqPref] = useState(null);
  const [reqTasks, setReqTasks] = useState([]);
  const [reqTaskQ, setReqTaskQ] = useState("");
  useEffect(() => {
    if (!showReqForm || !projectId) return undefined;
    let alive = true;
    setReqRec((r) => ({ ...r, loading: true, failed: false }));
    api.get("/equipment/request/recommend?project_id=" + projectId)
      .then((r) => {
        if (!alive) return;
        if (r && r.success && r.data) setReqRec({ loading: false, failed: false, city: r.data.city_name || "", machines: r.data.machines || [] });
        else setReqRec({ loading: false, failed: true, city: "", machines: [] });
      })
      .catch(() => { if (alive) setReqRec({ loading: false, failed: true, city: "", machines: [] }); });
    // Sirf asli kaam — todo (title wala) aur parent task nahi
    api.get("/tasks?project_id=" + projectId)
      .then((r) => {
        if (!alive) return;
        const all = r && r.success && Array.isArray(r.data) ? r.data : [];
        const byId = Object.fromEntries(all.map((x) => [x.id, x]));
        const parents = new Set(all.map((x) => x.parent_id).filter(Boolean));
        setReqTasks(all.filter((x) => !x.title && x.name && x.is_active !== 0 && !parents.has(x.id))
          .map((x) => ({ id: x.id, name: x.name, parent: byId[x.parent_id] ? byId[x.parent_id].name : "" })));
      })
      .catch(() => { if (alive) setReqTasks([]); });
    return () => { alive = false; };
  }, [showReqForm, projectId]);
  const reqKind = (m) => String(m.category || m.type || m.machine_type || "").trim();
  const reqCap = (m) => String(m.capacity || (Number(m.capacity_qty) ? `${Number(m.capacity_qty)} ${m.capacity_unit || ""}` : "")).trim();
  // Kitne din — dono din shaamil (6 se 8 Oct = 3 din)
  const reqDays = (reqForm.from_date && reqForm.to_date)
    ? Math.round((Date.parse(reqForm.to_date + "T00:00:00Z") - Date.parse(reqForm.from_date + "T00:00:00Z")) / 86400000) + 1
    : null;
  const reqBadRange = reqDays !== null && reqDays < 1;
  useEffect(() => {
    if (reqDays && reqDays > 0) setReqForm((p) => ({ ...p, duration_approx: t("equipment.req_n_din", { n: reqDays }) }));
  }, [reqDays]);
  const regKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const reqMachines = reqRec.machines
    .filter((m) => {
      const q = reqMachQ.trim().toLowerCase();
      if (!q) return true;
      return String(m.name || "").toLowerCase().includes(q) || String(m.code || "").toLowerCase().includes(q)
        || (!!regKey(q) && regKey(m.registration_no).includes(regKey(q)));
    })
    .sort((a, b) => ((reqKind(b).toLowerCase() === reqForm.equipment_type.toLowerCase()) - (reqKind(a).toLowerCase() === reqForm.equipment_type.toLowerCase()))
      || String(a.name).localeCompare(String(b.name)));
  const pickReqMachine = (m) => {
    setReqPref(m);
    setReqForm((p) => {
      const n = { ...p };
      const c = reqCap(m);
      if (c && !String(p.capacity || "").trim()) n.capacity = c;
      const ty = REQ_TYPES.find((x) => x.toLowerCase() === reqKind(m).toLowerCase());
      if (ty) n.equipment_type = ty;
      return n;
    });
  };
  const reqTaskOpts = (() => {
    const q = reqTaskQ.trim().toLowerCase();
    const list = reqTasks.filter((x) => !q || x.name.toLowerCase().includes(q) || x.parent.toLowerCase().includes(q));
    const sel = reqTasks.find((x) => String(x.id) === String(reqForm.task_id));
    return sel && !list.includes(sel) ? [sel, ...list] : list;   // chuna hua task khoj me na bhi ho to dikhe
  })();
  const resetReq = () => { setReqForm(emptyReq); setReqPref(null); setReqMachQ(""); setReqTaskQ(""); };

  const SC = { "On Site": { c: T.grn, bg: T.grnL }, "Returned": { c: T.t3, bg: T.surfaceB } };
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtD = (raw) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  };

  const load = () => {
    if (!projectId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    api.get("/library/project-equipment?project_id=" + projectId)
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    api.get("/equipment/project-summary?project_id=" + projectId)
      .then(r => setEqSum(r && r.success ? r.data : null))
      .catch(() => setEqSum(null));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId]);

  const loadUsage = useCallback(() => {
    if (!projectId) { setUsageRows([]); setUsageLoading(false); return; }
    setUsageLoading(true);
    api.get("/equipment/usage?project_id=" + projectId)
      .then(r => setUsageRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setUsageRows([]))
      .finally(() => setUsageLoading(false));
  }, [projectId]);

  const loadRequests = useCallback(() => {
    if (!projectId) { setReqList([]); return; }
    api.get("/equipment/request?project_id=" + projectId)
      .then(r => setReqList(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setReqList([]));
  }, [projectId]);

  const loadReservations = useCallback(() => {
    if (!projectId) { setReservations([]); return; }
    api.get("/equipment/reservation?project_id=" + projectId)
      .then(r => setReservations(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setReservations([]));
  }, [projectId]);

  useEffect(() => {
    loadUsage(); loadRequests(); loadReservations();
  }, [loadUsage, loadRequests, loadReservations]);

  useEffect(() => {
    api.get("/equipment/master").then(r => {
      if (r && r.success) setMasterList(r.data || []);
    }).catch(() => {});
    api.get("/finance/parties").then(r => {
      if (r && r.success) setPartiesList(r.data || []);
    }).catch(() => {});
  }, []);

  // Hire and diesel are separate ledger legs, so the tile has to add them
  // back together — total_amount alone understates what the machine cost.
  const confirmed = usageRows.filter(u => u.finance_status === "confirmed");
  const hireCost = confirmed.reduce((s, u) => s + (Number(u.total_amount) || 0), 0);
  const fuelCost = confirmed.reduce((s, u) => s + (Number(u.fuel_cost) || 0), 0);
  const totalCost = hireCost + fuelCost;
  const confirmedCount = confirmed.length;

  const saveUsage = async () => {
    if (!projectId) { setLogErr(t("equipment.project_missing")); return; }
    if (!logForm.equipment_id && !logForm.equipment_name.trim()) {
      setLogErr(t("equipment.select_equipment_or_name"));
      return;
    }
    setLogSaving(true); setLogErr("");
    const body = {
      project_id: projectId,
      usage_date: logForm.usage_date,
      paid_by_contractor: false,
      settlement_side: logForm.settlement_side,
    };
    if (logForm.equipment_id) body.equipment_id = parseInt(logForm.equipment_id, 10);
    else body.equipment_name = logForm.equipment_name.trim();
    if (logForm.vendor_name) body.vendor_name = logForm.vendor_name;
    if (logForm.start_time) body.start_time = logForm.start_time;
    if (logForm.end_time) body.end_time = logForm.end_time;
    if (logForm.hours_or_days !== "") body.hours_or_days = parseFloat(logForm.hours_or_days) || 0;
    if (logForm.rate_used !== "") body.rate_used = parseFloat(logForm.rate_used) || 0;
    if (logForm.trip_charge !== "") body.trip_charge = parseFloat(logForm.trip_charge) || 0;
    if (logForm.lump_amount !== "") body.lump_amount = parseFloat(logForm.lump_amount) || 0;
    if (logForm.vendor_id) body.vendor_id = parseInt(logForm.vendor_id, 10);
    if (logForm.subcon_id) body.subcon_id = parseInt(logForm.subcon_id, 10);
    // Fuel yahan se nahi jaata — server usage ke saath fuel par 400 'fuel_moved' deta hai (MCH-22).
    if (logForm.operator_name) body.operator_name = logForm.operator_name;
    if (logForm.sector) body.sector = logForm.sector;
    if (logForm.remark) body.remark = logForm.remark;
    if (logForm.meter_start !== "") body.meter_start = parseFloat(logForm.meter_start) || 0;
    if (logForm.meter_end !== "") body.meter_end = parseFloat(logForm.meter_end) || 0;

    try {
      const res = await api.post("/equipment/usage", body);
      if (res && res.success) {
        setShowLogModal(false);
        setLogForm(emptyLog);
        loadUsage();
      } else {
        setLogErr((res && res.message) || t("equipment.save_failed"));
      }
    } catch (e) {
      setLogErr(e.message || t("equipment.save_failed"));
    }
    setLogSaving(false);
  };

  const saveRequest = async () => {
    if (!projectId) return;
    if (!reqForm.equipment_type) return;
    if (!reqForm.task_id && !String(reqForm.reason || "").trim()) { window.alert(t("equipment.req_task_ya_kaam")); return; }
    if (reqBadRange) { window.alert(t("equipment.req_to_before_from")); return; }
    setReqSaving(true);
    try {
      const res = await api.post("/equipment/request", {
        project_id: projectId,
        equipment_type: reqForm.equipment_type,
        capacity: reqForm.capacity,
        from_date: reqForm.from_date || null,
        to_date: reqForm.to_date || null,
        duration_approx: reqForm.duration_approx,
        reason: String(reqForm.reason || "").trim() || null,
        preferred_equipment_id: reqPref ? reqPref.id : null,
        task_id: reqForm.task_id ? Number(reqForm.task_id) : null,
        priority: reqForm.priority || "normal",
      });
      if (res && res.success) {
        setShowReqForm(false);
        resetReq();
        loadRequests();
      } else {
        window.alert((res && res.message) || t("equipment.save_failed"));
      }
    } catch (e) { window.alert(e.message || t("equipment.save_failed")); }
    setReqSaving(false);
  };

  const finStatusPill = (status, approval) => {
    if (status === "confirmed") return <Pill label={t("equipment.confirmed")} c={T.grn} bg={T.grnL} />;
    if (status === "log_only") return <Pill label={t("equipment.log_only")} c={T.t3} bg={T.sltL} />;
    if (status === "suggested" || !status) {
      if (approval === "pending") return <Pill label={t("equipment.approval_pending")} c={T.amb} bg={T.ambL} />;
      if (approval === "rejected") return <Pill label={t("equipment.rate_rejected")} c={T.red} bg={T.redL} />;
      return <Pill label={t("equipment.suggested")} c={T.amb} bg={T.ambL} />;
    }
    return <Pill label={status} c={T.t3} bg={T.sltL} />;
  };

  const reqStatusPill = (s) => {
    if (s === "fulfilled") return <Pill label={t("equipment.fulfilled")} c={T.grn} bg={T.grnL} />;
    if (s === "rejected") return <Pill label={t("common.rejected")} c={T.red} bg={T.redL} />;
    return <Pill label={t("common.pending")} c={T.amb} bg={T.ambL} />;
  };

  // A party can hold several roles; `roles` is the canonical comma list and
  // `type` is only the primary. Matching on `type` alone hid equipment
  // vendors (stored as type "equipment") from this picker entirely.
  const partyHasRole = (p, wanted) => {
    const bag = (String(p.roles || "") + "," + String(p.type || "")).toLowerCase();
    return wanted.some(w => bag.split(",").map(s => s.trim()).includes(w));
  };
  const vendorParties = partiesList.filter(p => partyHasRole(p,
    ["material_vendor", "equipment_vendor", "equipment", "vendor", "supplier", "material vendor", "material supplier", "transporter"]));
  const subconParties = partiesList.filter(p => partyHasRole(p,
    ["subcontractor", "subcon", "sub-con"]));

  const dispDuration = (u) => {
    if (u.measurement_mode === "fixed") return t("payroll.fixed");
    const n = Number(u.hours_or_days) || 0;
    if (u.measurement_mode === "daily") return t("equipment.dur_days", { n });
    if (u.measurement_mode === "monthly") return t("equipment.dur_months", { n });
    if (u.measurement_mode === "trip") return t("equipment.dur_trips", { n });
    // km wali machine (tipper/trailer) ka kiraya km par chalta hai — quantity
    // wahi field hai, sirf unit alag. "12 hr" likhna jhooth hota.
    if (u.measurement_mode === "km") return t("equipment.dur_km", { n });
    return t("equipment.dur_hr", { n });
  };

  // Usage form ki quantity ka naam machine ke mode se aata hai.
  const QTY_LABEL = { daily: t("equipment.qty_days"), monthly: t("equipment.qty_months"), km: t("equipment.qty_km"), trip: t("equipment.qty_trips"), fixed: t("common.quantity") };
  const qtyLabelFor = (eqId) => {
    const m = eqId ? masterList.find((x) => String(x.id) === String(eqId)) : null;
    return QTY_LABEL[m && m.measurement_mode] || t("equipment.hours_or_days");
  };

  // Collapsible section helper (inline)
  const SectionHeader = ({ title, open, onToggle, action, count }) => (
    <div onClick={onToggle}
      style={{ padding: "10px 15px", borderBottom: open ? `1px solid ${T.b1}` : "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: T.surfaceB, cursor: "pointer", userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth={2.4}
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .15s" }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{title}</span>
        {typeof count === "number" && (
          <span style={{ fontSize: 11, fontWeight: 600, color: T.t3, background: T.surface, border: `1px solid ${T.b1}`, padding: "1px 8px", borderRadius: 20 }}>{count}</span>
        )}
      </div>
      <div onClick={e => e.stopPropagation()}>{action}</div>
    </div>
  );

  const toggleStatus = async (eq) => {
    const next = eq.status === "Returned" ? "On Site" : "Returned";
    setRows(prev => prev.map(x => x.id === eq.id ? { ...x, status: next } : x));
    const r = await api.patch("/library/project-equipment/" + eq.id, { status: next });
    if (!r || r.success === false) { window.alert((r && r.message) || t("equipment.update_failed")); load(); }
  };
  const removeEq = async (eq) => {
    if (!await window.confirmAsync(t("equipment.remove_name", { name: eq.name }))) return;
    const r = await api.del("/library/project-equipment/" + eq.id);
    if (!r || r.success === false) { window.alert((r && r.message) || t("equipment.delete_failed")); return; }
    load();
  };
  const resetForm = () => { setName(""); setVendor("Self"); setFromD(""); setToD(""); setStat("On Site"); setRate(""); };

  // ── Receive / Release ──
  const locText = (l) => !l ? "" : l.state === "site" ? t("equipment.rcv_loc_at", { name: l.project_name || "—" })
    : l.state === "transit" ? t("equipment.rcv_loc_transit", { name: l.project_name || "—" }) : t("equipment.rcv_loc_free");
  const resetRcv = () => { setRcvSel(null); setRcvReg(""); setRcvNote(""); setRcvPhotos([]); };
  const openReceive = () => {
    setOpenLegacy(true); setRcvOpen(true); resetRcv();
    setRcvOpt((o) => ({ ...o, loading: true, failed: false }));
    api.get("/equipment/receive/options?project_id=" + projectId)
      .then((r) => {
        if (r && r.success && r.data) setRcvOpt({ loading: false, failed: false, city: r.data.city_name || "", transit: r.data.transit || [], machines: r.data.machines || [] });
        else setRcvOpt({ loading: false, failed: true, city: "", transit: [], machines: [] });
      })
      .catch(() => setRcvOpt({ loading: false, failed: true, city: "", transit: [], machines: [] }));
  };
  const addRcvPhotos = (files) => {
    files.forEach((file) => {
      setRcvUp((n) => n + 1);
      uploadManager.add({
        file, folder: "gb_buildcon/equipment_receive",
        label: t("equipment.rcv_photo_upload_label", { name: file.name }),
        onDone: (url) => { setRcvPhotos((p) => [...p, url]); setRcvUp((n) => Math.max(0, n - 1)); },
        onError: () => setRcvUp((n) => Math.max(0, n - 1)),
      });
    });
  };
  const submitReceive = async () => {
    if (!rcvSel) return;
    if (!rcvPhotos.length) { window.alert(t("equipment.rcv_photo_zaroori")); return; }
    setRcvBusy(true);
    const r = await api.post("/equipment/receive", {
      project_id: projectId, equipment_id: rcvSel.machine.id, request_id: rcvSel.request_id || null,
      reg_no_seen: rcvReg.trim() || null, note: rcvNote.trim() || null, photo_urls: rcvPhotos,
    });
    setRcvBusy(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("equipment.save_failed")); return; }
    window.alert(t("equipment.rcv_ok"));
    resetRcv(); setRcvOpen(false); load();
  };
  const releaseEq = async (eq) => {
    const msg = t("equipment.rel_q");
    const note = window.promptAsync ? await window.promptAsync({ message: msg, defaultValue: "" }) : window.prompt(msg, "");
    if (note === null || note === undefined) return;
    const r = await api.post("/equipment/release/" + eq.id, { note: String(note).trim() || null });
    if (!r || r.success === false) { window.alert((r && r.message) || t("equipment.update_failed")); }
    load();
  };
  const rcvLibReg = rcvSel ? rcvSel.machine.registration_no : "";
  const rcvRegState = !rcvSel || !rcvReg.trim() ? null : !rcvLibReg ? "nolib" : regKey(rcvReg) === regKey(rcvLibReg) ? "ok" : "diff";
  const transitN = eqSum && eqSum.transit_n ? eqSum.transit_n : 0;
  const saveNew = async () => {
    if (!name.trim()) { window.alert(t("equipment.equipment_name_required")); return; }
    setSaving(true);
    const r = await api.post("/library/project-equipment", {
      project_id: projectId,
      name: name.trim(),
      vendor: vendor.trim() || "Self",
      from_date: fromD || null,
      to_date: toD || null,
      status: stat,
      rate_per_day: rate || null,
    });
    setSaving(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("equipment.save_failed")); return; }
    resetForm();
    setShowAdd(false);
    load();
  };

  // Gaadi number ka chhota dabba (machine list me pehchaan)
  const regBadge = { fontSize: 10, fontWeight: 800, letterSpacing: .3, padding: "1px 6px", borderRadius: 4, color: T.blu, background: T.bluL, whiteSpace: "nowrap", flexShrink: 0 };
  const inp = { width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
    fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" };

  const onSite   = rows.filter(r => r.status !== "Returned").length;
  const returned = rows.filter(r => r.status === "Returned").length;

  return (
    <div>
      <div style={{ padding: "14px 18px 0" }}>
        <FilterTabs
          options={[{ id: "equipment", label: t("common.equipment") }, { id: "trips", label: t("equipment.trip_tracking") }]}
          active={view} onChange={setView} />
      </div>
      {view === "trips" ? <TabTripTracking projectId={projectId} /> : (
      <div style={{ padding: "16px 18px" }}>
      {/* ── KPI: Total equipment cost ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat label={t("equipment.total_equipment_cost")} value={`₹${fmtN(Math.round(totalCost))}`}
          note={fuelCost > 0
            ? t("equipment.note_hire_diesel", { hire: fmtN(Math.round(hireCost)), diesel: fmtN(Math.round(fuelCost)) })
            : t("equipment.note_n_confirmed", { n: confirmedCount })}
          color={T.blu} />
        <Stat label={t("equipment.usage_entries")} value={usageRows.length}
          note={t("equipment.note_n_awaiting_review", { n: usageRows.filter(u => (u.finance_status || "suggested") === "suggested").length })}
          color={T.amb} />
        <Stat label={t("equipment.active_requests")} value={reqList.filter(r => r.status === "pending").length}
          note={t("equipment.note_n_reserved", { n: reservations.length })}
          color={T.pur} />
      </div>

      {/* ── 1. USAGE LOG ──────────────────────────────────────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title={t("equipment.usage_log")} open={openUsage} onToggle={() => setOpenUsage(v => !v)}
          count={usageRows.length}
          action={canLogUsage ? <AddBtn label={t("equipment.log_usage")} onClick={() => { setLogForm(emptyLog); setLogErr(""); setShowLogModal(true); }} /> : null} />
        {openUsage && (
          <div>
            {usageLoading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>{t("equipment.loading_usage")}</div>}
            {!usageLoading && usageRows.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>{t("equipment.no_usage_entries_logged_yet")}</div>
            )}
            {!usageLoading && usageRows.length > 0 && (
              <>
                <THead cols="100px 1.6fr 1fr 90px 80px 100px 1.1fr 1fr"
                  headers={[t("common.date"), t("common.equipment"), t("equipment.mode_dur"), t("common.rate"), t("machinery.trip"), t("common.total"), t("equipment.route"), t("common.status")]} />
                {usageRows.map(u => {
                  const route = u.finance_confirmed_route || u.suggested_route || "—";
                  const routeLabel = ROUTE_LABEL[route] || route;
                  return (
                    <div key={u.id} style={{ display: "grid", gridTemplateColumns: "100px 1.6fr 1fr 90px 80px 100px 1.1fr 1fr",
                      padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(u.usage_date)}</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{u.equipment_name || "—"}</div>
                        {u.vendor_party_name && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{u.vendor_party_name}</div>}
                      </div>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>{dispDuration(u)}</span>
                      <span style={{ fontSize: 12, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{u.rate_used ? "₹" + fmtN(u.rate_used) : "—"}</span>
                      <span style={{ fontSize: 11.5, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{u.trip_charge ? "₹" + fmtN(u.trip_charge) : "—"}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>₹{fmtN(u.total_amount || 0)}</span>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>{routeLabel}</span>
                      <span>{finStatusPill(u.finance_status, u.approval_status)}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </Panel>

      {/* ── 4. EQUIPMENT REQUESTS ─────────────────────────────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title={t("equipment.equipment_requests")} open={openReqs} onToggle={() => setOpenReqs(v => !v)}
          count={reqList.length}
          action={canRequest ? <AddBtn label={t("equipment.request_equipment")} onClick={() => setShowReqForm(v => !v)} /> : null} />
        {openReqs && (
          <div>
            {showReqForm && (
              <div style={{ padding: "12px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 0.9fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.equipment_type")}</div>
                    <PickSelect value={reqForm.equipment_type} onChange={e => updReq("equipment_type", e.target.value)} style={inp}>
                      {REQ_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                    </PickSelect>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.capacity")}</div>
                    <input value={reqForm.capacity} onChange={e => updReq("capacity", e.target.value)} placeholder={t("equipment.e_g_1_cum")} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.from")}</div>
                    <input type="date" value={reqForm.from_date} onChange={e => updReq("from_date", e.target.value)} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.to")}</div>
                    <input type="date" value={reqForm.to_date} min={reqForm.from_date || undefined} onChange={e => updReq("to_date", e.target.value)} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.req_duration")}</div>
                    <input value={reqForm.duration_approx} onChange={e => updReq("duration_approx", e.target.value)} readOnly={reqDays > 0}
                      title={reqDays > 0 ? t("equipment.req_dates_se") : undefined}
                      placeholder={t("equipment.req_duration_ph")} style={{ ...inp, ...(reqDays > 0 ? { background: T.bg, color: T.t2 } : {}) }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.req_priority")}</div>
                    {(() => {
                      const pr = REQ_PRIO.find(x => x.k === reqForm.priority) || REQ_PRIO[0];
                      return (
                        <PickSelect value={reqForm.priority} onChange={e => updReq("priority", e.target.value)}
                          style={{ ...inp, color: pr.c, fontWeight: pr.k === "normal" ? 400 : 700, borderColor: pr.k === "normal" ? T.b1 : pr.c }}>
                          {REQ_PRIO.map(x => <option key={x.k} value={x.k}>{x.l}</option>)}
                        </PickSelect>
                      );
                    })()}
                  </div>
                </div>
                {reqBadRange && <div style={{ fontSize: 11, color: T.red, marginTop: 6 }}>{t("equipment.req_to_before_from")}</div>}

                {/* Recommend machine — site admin ko batata hai kaun si machine bhejein
                    (project ki city ki library machine). Search + dropdown. */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                    <div style={{ fontSize: 10, color: T.t4, fontWeight: 600 }}>{t("equipment.req_recommend")}</div>
                    {!reqRec.loading && !reqRec.failed && (
                      <span style={{ fontSize: 10.5, color: T.t4 }}>{t("equipment.req_city_n", { city: reqRec.city || "—", n: reqRec.machines.length })}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: T.t4, margin: "2px 0 6px" }}>{t("equipment.req_recommend_hint")}</div>
                  {reqRec.loading && <div style={{ fontSize: 11.5, color: T.t4, padding: "6px 0" }}>{t("common.loading")}</div>}
                  {!reqRec.loading && reqRec.failed && <div style={{ fontSize: 11.5, color: T.t4, padding: "6px 0" }}>{t("equipment.req_machine_load_fail")}</div>}
                  {!reqRec.loading && !reqRec.failed && reqRec.machines.length === 0 && (
                    <div style={{ fontSize: 11.5, color: T.t4, padding: "6px 0" }}>{t("equipment.req_no_machine")}</div>
                  )}
                  {!reqRec.loading && reqRec.machines.length > 0 && (() => {
                    const opts = reqPref && !reqMachines.some(m => m.id === reqPref.id) ? [reqPref, ...reqMachines] : reqMachines;
                    return (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "0.6fr 1.8fr", gap: 10 }}>
                          <input value={reqMachQ} onChange={e => setReqMachQ(e.target.value)} placeholder={t("equipment.req_machine_search")} style={inp} />
                          <PickSelect value={reqPref ? String(reqPref.id) : ""}
                            onChange={e => { const m = reqRec.machines.find(x => String(x.id) === e.target.value); if (m) pickReqMachine(m); else setReqPref(null); }}
                            style={{ ...inp, ...(reqPref ? { borderColor: T.blu } : {}) }}>
                            <option value="">{opts.length ? t("equipment.req_machine_none") : t("equipment.req_no_match")}</option>
                            {opts.map(m => (
                              <option key={m.id} value={String(m.id)}>
                                {m.name}{m.registration_no ? " · " + m.registration_no : ""}{[reqKind(m), reqCap(m)].filter(Boolean).length ? " — " + [reqKind(m), reqCap(m)].filter(Boolean).join(" · ") : ""}
                              </option>
                            ))}
                          </PickSelect>
                        </div>
                        {reqPref && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.t1 }}>{reqPref.name}</span>
                            {reqPref.registration_no && <span style={regBadge}>{reqPref.registration_no}</span>}
                            <span style={{ fontSize: 11, color: T.t4 }}>{[reqKind(reqPref), reqCap(reqPref), reqPref.ownership].filter(Boolean).join(" · ")}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Task (project ka) aur Note (kaam apne shabdon me) — koi ek zaroori */}
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.req_task_label")}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1.6fr", gap: 8 }}>
                      <input value={reqTaskQ} onChange={e => setReqTaskQ(e.target.value)} placeholder={t("equipment.req_task_filter")} style={inp} />
                      <PickSelect value={reqForm.task_id} onChange={e => updReq("task_id", e.target.value)} style={inp}>
                        <option value="">{reqTasks.length ? t("equipment.req_task_none") : t("equipment.req_no_task")}</option>
                        {reqTaskOpts.map(x => <option key={x.id} value={x.id}>{x.parent ? x.parent + " › " : ""}{x.name}</option>)}
                      </PickSelect>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.req_note")}</div>
                    <input value={reqForm.reason} onChange={e => updReq("reason", e.target.value)} placeholder={t("equipment.req_note_ph")} style={inp} />
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: T.t4, marginTop: 5 }}>{t("equipment.req_task_ya_note")}</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                  <button onClick={() => { setShowReqForm(false); resetReq(); }} type="button"
                    style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
                  <button onClick={saveRequest} disabled={reqSaving || reqBadRange || (!reqForm.task_id && !String(reqForm.reason || "").trim())} type="button"
                    style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: (reqSaving || reqBadRange || (!reqForm.task_id && !String(reqForm.reason || "").trim())) ? T.b1 : T.blu, color: (reqSaving || reqBadRange || (!reqForm.task_id && !String(reqForm.reason || "").trim())) ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: reqSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {reqSaving ? t("common.saving") : t("equipment.submit_request")}
                  </button>
                </div>
              </div>
            )}
            {reqList.length === 0 && !showReqForm && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>{t("equipment.no_requests_yet")}</div>
            )}
            {reqList.length > 0 && (
              <>
                <THead cols="1.4fr 1fr 1fr 1.4fr 110px" headers={[t("equipment.type_capacity"), t("common.from"), t("common.to"), t("common.reason"), t("common.status")]} />
                {reqList.map(rq => (
                  <div key={rq.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.4fr 110px",
                    padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, display: "flex", alignItems: "center", gap: 6 }}>
                        {rq.equipment_type || "—"}
                        {(() => { const pr = REQ_PRIO.find(x => x.k === rq.priority); return pr && pr.k !== "normal"
                          ? <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 8, color: pr.c, background: pr.bg }}>{pr.l}</span> : null; })()}
                      </div>
                      {rq.capacity && <div style={{ fontSize: 10.5, color: T.t4 }}>{rq.capacity}</div>}
                      {/* Site ne library ki koi khaas machine maangi ho (mobile form, 5 Oct 2026) */}
                      {rq.preferred_equipment_name && (
                        <div style={{ fontSize: 10.5, color: T.t2, marginTop: 2 }}>
                          {t("equipment.req_machine", { name: rq.preferred_equipment_name + (rq.preferred_registration_no ? " · " + rq.preferred_registration_no : "") })}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(rq.from_date)}</span>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(rq.to_date)}</span>
                    <span title={[rq.task_name, rq.reason].filter(Boolean).join(" · ")}
                      style={{ fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[rq.task_name ? t("equipment.req_task", { name: rq.task_name }) : null, rq.reason].filter(Boolean).join(" · ") || "—"}
                    </span>
                    <span>{reqStatusPill(rq.status)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </Panel>

      {/* ── 5. RESERVED EQUIPMENT ─────────────────────────────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title={t("equipment.reserved_equipment")} open={openReserved} onToggle={() => setOpenReserved(v => !v)}
          count={reservations.length} />
        {openReserved && (
          <div>
            {reservations.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>{t("equipment.no_reservations")}</div>
            )}
            {reservations.map(rv => {
              const eq = masterList.find(m => m.id === rv.equipment_id);
              return (
                <div key={rv.id} style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{eq?.name || t("equipment.equipment_n", { id: rv.equipment_id })}</div>
                    {rv.note && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{rv.note}</div>}
                  </div>
                  <span style={{ fontSize: 11.5, color: T.t2 }}>{t("equipment.reserved_fmtd_fmtd2", { fmtD: fmtD(rv.from_date), fmtD2: fmtD(rv.to_date) })}</span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── LEGACY: Period & Status (project_equipment) ───────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title={t("equipment.site_machines")} open={openLegacy} onToggle={() => setOpenLegacy(v => !v)}
          count={rows.length}
          action={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {canReceive && (
                <button type="button" onClick={openReceive}
                  style={{ padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${transitN ? T.grn : T.blu}`, background: transitN ? T.grnL : T.surface, color: transitN ? T.grn : T.blu,
                    display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t("equipment.rcv_btn")}
                  {transitN > 0 && <span style={{ minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: T.grn, color: "#fff", fontSize: 10.5, lineHeight: "18px", boxSizing: "border-box" }}>{transitN}</span>}
                </button>
              )}
              {canLegacyAdd && <AddBtn label={t("equipment.add_equipment")} onClick={() => setShowAdd(true)} />}
            </div>} />
        {openLegacy && (
          <div style={{ padding: "10px 15px" }}>
      {/* ── Machine Receive ── */}
      {rcvOpen && (
        <Panel style={{ marginBottom: 14, padding: "14px 16px", border: `1.5px solid ${T.grn}55` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("equipment.rcv_title")}</div>
            <button type="button" onClick={() => { resetRcv(); setRcvOpen(false); }}
              style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
          </div>
          {rcvOpt.loading && <div style={{ fontSize: 12, color: T.t4, padding: "8px 0" }}>{t("common.loading")}</div>}
          {!rcvOpt.loading && rcvOpt.failed && <div style={{ fontSize: 12, color: T.t4, padding: "8px 0" }}>{t("equipment.rcv_load_fail")}</div>}
          {!rcvOpt.loading && !rcvOpt.failed && !rcvSel && (
            <>
              <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>{t("equipment.rcv_allot_hui")}</div>
              {rcvOpt.transit.length === 0 && <div style={{ fontSize: 12, color: T.t4, marginBottom: 10 }}>{t("equipment.rcv_koi_allot_nahi")}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, marginBottom: 12 }}>
                {rcvOpt.transit.map((m) => (
                  <div key={m.request_id} role="button" onClick={() => setRcvSel({ machine: m, request_id: m.request_id })}
                    style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.b1}`, background: T.surface, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{m.name}</span>
                      {m.registration_no && <span style={regBadge}>{m.registration_no}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>
                      {t("equipment.rcv_allot_by", { date: fmtD(m.decided_at), name: m.decided_by_name || "—" })}{m.equipment_type ? " · " + m.equipment_type : ""}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>{t("equipment.rcv_doosri")}</div>
              <PickSelect value="" onChange={(e) => { const m = rcvOpt.machines.find((x) => String(x.id) === e.target.value); if (m) setRcvSel({ machine: m, request_id: null }); }} style={{ ...inp, maxWidth: 520 }}>
                <option value="">{t("equipment.rcv_doosri_ph", { city: rcvOpt.city || "—", n: rcvOpt.machines.length })}</option>
                {rcvOpt.machines.map((m) => (
                  <option key={m.id} value={String(m.id)}>{m.name}{m.registration_no ? " · " + m.registration_no : ""}{m.location ? " — " + locText(m.location) : ""}</option>
                ))}
              </PickSelect>
            </>
          )}
          {rcvSel && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.blu}`, background: T.bluL + "66", marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{rcvSel.machine.name}</span>
                  {rcvSel.machine.registration_no && <span style={regBadge}>{rcvSel.machine.registration_no}</span>}
                  <span style={{ fontSize: 11, color: T.t3 }}>{rcvSel.request_id ? t("equipment.rcv_allot_wali") : t("equipment.rcv_bina_request")}</span>
                </div>
                <button type="button" onClick={resetRcv} disabled={rcvBusy}
                  style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 11.5, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("equipment.rcv_badlo")}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.rcv_number_label")}</div>
                  <input value={rcvReg} onChange={(e) => setRcvReg(e.target.value.toUpperCase())} placeholder={rcvLibReg || t("equipment.rcv_number_ph")} style={inp} />
                  <div style={{ fontSize: 11, marginTop: 4, fontWeight: rcvRegState ? 700 : 400,
                    color: rcvRegState === "ok" ? T.grn : rcvRegState === "diff" ? T.amb : T.t4 }}>
                    {rcvRegState === "ok" ? t("equipment.rcv_number_mila")
                      : rcvRegState === "diff" ? t("equipment.rcv_number_alag", { n: rcvLibReg })
                      : rcvLibReg ? t("equipment.rcv_lib_number", { n: rcvLibReg }) : t("equipment.rcv_lib_no_number")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.rcv_note_label")}</div>
                  <input value={rcvNote} onChange={(e) => setRcvNote(e.target.value)} placeholder={t("equipment.rcv_note_ph")} style={inp} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: T.t4, marginBottom: 6, fontWeight: 600 }}>{t("equipment.rcv_photos_label")}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {rcvPhotos.map((u, i) => (
                    <div key={u + i} style={{ position: "relative" }}>
                      <img src={u} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 7, border: `1px solid ${T.b1}`, display: "block" }} />
                      <button type="button" onClick={() => setRcvPhotos((p) => p.filter((_, j) => j !== i))}
                        style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", color: "white", border: "none", fontSize: 10, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
                    </div>
                  ))}
                  <label style={{ width: 64, height: 64, borderRadius: 7, border: "1.5px dashed " + T.blu, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexDirection: "column", gap: 2, color: T.blu, fontSize: 11, fontWeight: 700 }}>
                    + {t("equipment.rcv_photo_add")}
                    <input {...fileInputProps({ source: "both" }, { multiple: true })} style={{ display: "none" }}
                      onChange={(e) => { addRcvPhotos(Array.from(e.target.files || [])); e.target.value = ""; }} />
                  </label>
                  {rcvUp > 0 && <span style={{ fontSize: 11, color: T.t3 }}>{t("equipment.rcv_uploading", { n: rcvUp })}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                <button onClick={submitReceive} disabled={rcvBusy || rcvUp > 0 || !rcvPhotos.length} type="button"
                  style={{ padding: "8px 18px", borderRadius: 7, border: "none",
                    background: (rcvBusy || rcvUp > 0 || !rcvPhotos.length) ? T.b1 : T.grn, color: (rcvBusy || rcvUp > 0 || !rcvPhotos.length) ? T.t4 : "white",
                    fontSize: 12.5, fontWeight: 700, cursor: (rcvBusy || rcvUp > 0 || !rcvPhotos.length) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {rcvBusy ? t("common.saving") : t("equipment.rcv_do")}
                </button>
              </div>
              {!rcvPhotos.length && <div style={{ fontSize: 11, color: T.t4, textAlign: "right", marginTop: 4 }}>{t("equipment.rcv_photo_zaroori")}</div>}
            </>
          )}
        </Panel>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>{t("common.total")}</div><div style={{ fontSize: 19, fontWeight: 700, color: T.t1 }}>{rows.length}</div></div>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>{t("equipment.on_site")}</div><div style={{ fontSize: 19, fontWeight: 700, color: T.grn }}>{onSite}</div></div>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>{t("equipment.returned")}</div><div style={{ fontSize: 19, fontWeight: 700, color: T.t3 }}>{returned}</div></div>
        </div>
      </div>

      {showAdd && (
        <Panel style={{ marginBottom: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{t("equipment.add_equipment")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.name")}</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t("equipment.jcb_excavator")} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.vendor")}</div>
              <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder={t("equipment.self_for_company_owned")} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.from")}</div>
              <input type="date" value={fromD} onChange={e => setFromD(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.to")}</div>
              <input type="date" value={toD} onChange={e => setToD(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.status")}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["On Site", "Returned"].map(s => {
                  const on = stat === s;
                  const sm = SC[s];
                  return (
                    <button key={s} onClick={() => setStat(s)} type="button"
                      style={{ flex: 1, padding: "8px", borderRadius: 7,
                        border: `1.5px solid ${on ? sm.c : T.b1}`,
                        background: on ? sm.bg : "transparent",
                        color: on ? sm.c : T.t3, fontSize: 12, fontWeight: on ? 700 : 500,
                        cursor: "pointer", fontFamily: "inherit" }}>{STATUS_LABEL[s] || s}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.day_rate_optional")}</div>
              <input value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 5000" style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={() => { resetForm(); setShowAdd(false); }} type="button"
              style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
            <button onClick={saveNew} disabled={saving || !name.trim()} type="button"
              style={{ padding: "8px 16px", borderRadius: 7, border: "none",
                background: (saving || !name.trim()) ? T.b1 : T.blu,
                color: (saving || !name.trim()) ? T.t4 : "white",
                fontSize: 12, fontWeight: 700,
                cursor: (saving || !name.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? t("common.saving") : t("equipment.add_equipment")}
            </button>
          </div>
        </Panel>
      )}

      {loading && <div style={{ textAlign: "center", padding: "40px 0", color: T.t4, fontSize: 13 }}>{t("common.loading")}</div>}

      {!loading && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: T.t4, fontSize: 13 }}>
         {t("equipment.no_equipment_deployed_yet_click_add")}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <Panel style={{ overflow: "hidden" }}>
          <THead cols="2fr 1.4fr 1.6fr 110px 110px 60px" headers={[t("common.equipment"), t("common.vendor"), t("equipment.period"), t("equipment.day_rate"), t("common.status"), ""]} />
          {rows.map(eq => {
            const sm = SC[eq.status] || SC["On Site"];
            return (
              <div key={eq.id}
                style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.6fr 110px 110px 60px",
                  padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{eq.name}</span>
                    {eq.equipment_reg_no && <span style={regBadge}>{eq.equipment_reg_no}</span>}
                  </div>
                  {eq.equipment_code && <div style={{ fontSize: 10, color: T.t4, marginTop: 1 }}>{eq.equipment_code}</div>}
                  {/* Receive ka saboot: kisne / kab mili, photo (tap = poori) */}
                  {eq.received_at && (
                    <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>
                      {t("equipment.rcv_mili", { date: fmtD(eq.received_at), name: eq.received_by_name || "—" })}
                      {eq.reg_no_seen && eq.equipment_reg_no && regKey(eq.reg_no_seen) !== regKey(eq.equipment_reg_no)
                        ? <span style={{ color: T.amb, fontWeight: 700 }}>{" · " + t("equipment.rcv_seen_diff", { n: eq.reg_no_seen })}</span> : null}
                    </div>
                  )}
                  {(() => { let ph = []; try { ph = Array.isArray(eq.photo_urls) ? eq.photo_urls : JSON.parse(eq.photo_urls || "[]"); } catch (_) { ph = []; }
                    return ph.length ? (
                      <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                        {ph.slice(0, 6).map((u, i) => (
                          <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                            <img src={u} alt="" style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 5, border: `1px solid ${T.b1}`, display: "block" }} />
                          </a>
                        ))}
                      </div>
                    ) : null; })()}
                  {eq.status === "Returned" && eq.release_note && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{eq.release_note}</div>}
                </div>
                <span style={{ fontSize: 12, color: T.t2 }}>{eq.vendor || t("payroll.self")}</span>
                <span style={{ fontSize: 11.5, color: T.t2 }}>
                  {eq.from_date ? fmtD(eq.from_date) : "—"}
                  {eq.to_date ? <> &nbsp;→&nbsp; {fmtD(eq.to_date)}</> : ""}
                </span>
                <span style={{ fontSize: 12.5, color: T.t1, fontVariantNumeric: "tabular-nums" }}>
                  {eq.rate_per_day ? "₹" + fmtN(eq.rate_per_day) : "—"}
                </span>
                {eq.equipment_master_id ? (
                  // Library ki machine: status Receive / Release se badalta hai (kahan hai sahi rahe)
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: sm.bg, color: sm.c }}>
                      {STATUS_LABEL[eq.status] || eq.status}
                    </span>
                    {eq.status === "On Site" && canReceive && (
                      <button type="button" onClick={() => releaseEq(eq)}
                        style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, color: T.t2, cursor: "pointer", fontFamily: "inherit" }}>
                        {t("equipment.rel_btn")}
                      </button>
                    )}
                  </div>
                ) : (
                <button onClick={canLegacyEdit ? () => toggleStatus(eq) : undefined} type="button" disabled={!canLegacyEdit}
                  style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                    background: sm.bg, color: sm.c, border: "none", cursor: canLegacyEdit ? "pointer" : "default",
                    fontFamily: "inherit", justifySelf: "start" }}>
                  {STATUS_LABEL[eq.status] || eq.status}
                </button>
                )}
                {canLegacyDel ? (
                  <button onClick={() => removeEq(eq)} type="button"
                    title={t("common.remove")}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: T.t4, fontSize: 16, fontFamily: "inherit", justifySelf: "end" }}>
                    ×
                  </button>
                ) : <span />}
              </div>
            );
          })}
        </Panel>
      )}
          </div>
        )}
      </Panel>

      {/* ── Log Usage Modal ───────────────────────────────────────── */}
      {showLogModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowLogModal(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
          <div style={{ position: "relative", width: 720, maxWidth: "94vw", maxHeight: "92vh", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{t("equipment.log_equipment_usage")}</div>
              <button onClick={() => setShowLogModal(false)} style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.equipment_from_master")}</div>
                  <PickSelect value={logForm.equipment_id} onChange={e => updLog("equipment_id", e.target.value)} style={inp}>
                    <option value="">{t("equipment.select_leave_empty_for_ad_hoc")}</option>
                    {masterList.map(m => <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ""}</option>)}
                  </PickSelect>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.or_ad_hoc_equipment_name")}</div>
                  <input value={logForm.equipment_name} onChange={e => updLog("equipment_name", e.target.value)} placeholder={t("equipment.e_g_borrowed_jcb")} style={inp} disabled={!!logForm.equipment_id} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.usage_date")}</div>
                  <input type="date" value={logForm.usage_date} onChange={e => updLog("usage_date", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.vendor_name_ad_hoc_optional")}</div>
                  <input value={logForm.vendor_name} onChange={e => updLog("vendor_name", e.target.value)} placeholder={t("equipment.if_no_party_set")} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.start_time")}</div>
                  <input type="time" value={logForm.start_time} onChange={e => updLog("start_time", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.end_time")}</div>
                  <input type="time" value={logForm.end_time} onChange={e => updLog("end_time", e.target.value)} style={inp} />
                </div>
                <div>
                  {/* Ye ek hi field har mode ki quantity hai — sirf naam mode
                      par nirbhar hai. "Hours or Days" likha rehna km/trip wali
                      machine par galat basis batata tha. */}
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{qtyLabelFor(logForm.equipment_id)}</div>
                  <input value={logForm.hours_or_days} onChange={e => updLog("hours_or_days", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 4" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.rate_used")}</div>
                  <input value={logForm.rate_used} onChange={e => updLog("rate_used", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.trip_charge")}</div>
                  <input value={logForm.trip_charge} onChange={e => updLog("trip_charge", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.lump_amount_fixed_mode")}</div>
                  <input value={logForm.lump_amount} onChange={e => updLog("lump_amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div style={{ gridColumn: "1 / 3" }}>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.settlement_side")}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ k: "company", l: t("equipment.company_pays") }, { k: "subcon", l: t("equipment.subcon_pays") }].map(o => {
                      const on = logForm.settlement_side === o.k;
                      return (
                        <button key={o.k} onClick={() => updLog("settlement_side", o.k)} type="button"
                          style={{ flex: 1, padding: "9px", borderRadius: 7,
                            border: `1.5px solid ${on ? T.blu : T.b1}`,
                            background: on ? T.bluL : T.surface,
                            color: on ? T.blu : T.t3, fontSize: 12.5, fontWeight: on ? 700 : 500,
                            cursor: "pointer", fontFamily: "inherit" }}>{o.l}</button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("machinery.vendor_party_2")}</div>
                  <PickSelect value={logForm.vendor_id} onChange={e => updLog("vendor_id", e.target.value)} style={inp}>
                    <option value="">—</option>
                    {vendorParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </PickSelect>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.subcon_party")}</div>
                  <PickSelect value={logForm.subcon_id} onChange={e => updLog("subcon_id", e.target.value)} style={inp}>
                    <option value="">—</option>
                    {subconParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </PickSelect>
                </div>
                {/* Diesel ab sirf Fuel module me (Fuel qty / cost / pump ke khaane
                    hata diye). Bharte hi server 400 'fuel_moved' deta tha (MCH-22). */}
                <div style={{ gridColumn: "1 / 3", fontSize: 11, color: T.t3, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 7, padding: "8px 11px" }}>
                  {t("equipment.diesel_fuel_module_me_darj_karo")}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.operator_name")}</div>
                  <input value={logForm.operator_name} onChange={e => updLog("operator_name", e.target.value)} placeholder={t("master_library.e_g_ramesh_kumar")} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.meter_start_end_optional")}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={logForm.meter_start} onChange={e => updLog("meter_start", e.target.value.replace(/[^0-9.]/g, ""))} placeholder={t("equipment.meter_start_ph")} style={inp} />
                    <input value={logForm.meter_end} onChange={e => updLog("meter_end", e.target.value.replace(/[^0-9.]/g, ""))} placeholder={t("equipment.meter_end_ph")} style={inp} />
                  </div>
                </div>
                {/* Sector aur Remark — kaagaz wali log sheet ke wahi do khaane.
                    Project se kaam nahi chalta: EK project me kai sector hote
                    hain, aur poori sheet unhi par tiki hoti hai. Bina in do ke
                    Log Sheet aur Usage Register me ye column khaali rehte the. */}
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("common.sector")}</div>
                  <input value={logForm.sector} onChange={e => updLog("sector", e.target.value)}
                    placeholder={t("equipment.e_g_15_15_12_kosa")} style={inp} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{t("equipment.remark_kya_kaam_hua")}</div>
                  <input value={logForm.remark} onChange={e => updLog("remark", e.target.value)}
                    placeholder={t("equipment.e_g_sec_15_bc_soil")} style={inp} />
                </div>
              </div>
              {logErr && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{logErr}</div>
              )}
            </div>
            <div style={{ padding: "12px 22px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLogModal(false)} type="button"
                style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12.5, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
              <button onClick={saveUsage} disabled={logSaving} type="button"
                style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: logSaving ? T.b1 : T.blu, color: logSaving ? T.t4 : "white", fontSize: 12.5, fontWeight: 700, cursor: logSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {logSaving ? t("common.saving") : t("equipment.save_usage")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </div>
  );
}

export default TabEquipment;
