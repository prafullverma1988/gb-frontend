import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T, fmtN, localYMD } from "../shared/tokens";
import { Pill, Stat, Panel, THead, AddBtn, FilterTabs } from "../shared/ui";
import TabTripTracking from "./TabTripTracking";

// Route keys as the backend stores them (routes/equipment.js PAYMENT_ROUTES).
// "site_exp" used to fall through unlabelled and render as raw text.
const ROUTE_LABEL = {
  vendor: "Vendor",
  site_exp: "Site expense",
  subcon_against: "Sub-con",
  owned: "Owned",
  subcon_self_paid: "Contractor paid",
};

function TabEquipment({ projectId }) {
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
  const [openReqs, setOpenReqs] = useState(false);
  const [openReserved, setOpenReserved] = useState(false);

  // Log-usage form
  const emptyLog = {
    equipment_id: "", equipment_name: "", vendor_name: "",
    usage_date: localYMD(), start_time: "", end_time: "",
    hours_or_days: "", rate_used: "", trip_charge: "", lump_amount: "",
    settlement_side: "company", vendor_id: "", subcon_id: "",
    fuel_qty: "", fuel_cost: "", fuel_vendor_id: "", operator_name: "", meter_start: "", meter_end: "",
  };
  const [logForm, setLogForm] = useState(emptyLog);
  const [logSaving, setLogSaving] = useState(false);
  const [logErr, setLogErr] = useState("");
  const updLog = (k, v) => setLogForm(p => ({ ...p, [k]: v }));

  // Request form
  const emptyReq = { equipment_type: "Earthwork", capacity: "", from_date: "", to_date: "", duration_approx: "", reason: "" };
  const [reqForm, setReqForm] = useState(emptyReq);
  const [reqSaving, setReqSaving] = useState(false);
  const updReq = (k, v) => setReqForm(p => ({ ...p, [k]: v }));

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
    if (!projectId) { setLogErr("Project missing"); return; }
    if (!logForm.equipment_id && !logForm.equipment_name.trim()) {
      setLogErr("Select equipment or enter a name");
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
    if (logForm.fuel_qty !== "") body.fuel_qty = parseFloat(logForm.fuel_qty) || 0;
    if (logForm.fuel_cost !== "") body.fuel_cost = parseFloat(logForm.fuel_cost) || 0;
    if (logForm.fuel_vendor_id) body.fuel_vendor_id = parseInt(logForm.fuel_vendor_id, 10);
    if (logForm.operator_name) body.operator_name = logForm.operator_name;
    if (logForm.meter_start !== "") body.meter_start = parseFloat(logForm.meter_start) || 0;
    if (logForm.meter_end !== "") body.meter_end = parseFloat(logForm.meter_end) || 0;

    try {
      const res = await api.post("/equipment/usage", body);
      if (res && res.success) {
        setShowLogModal(false);
        setLogForm(emptyLog);
        loadUsage();
      } else {
        setLogErr((res && res.message) || "Save failed");
      }
    } catch (e) {
      setLogErr(e.message || "Save failed");
    }
    setLogSaving(false);
  };

  const saveRequest = async () => {
    if (!projectId) return;
    if (!reqForm.equipment_type) return;
    setReqSaving(true);
    try {
      const res = await api.post("/equipment/request", {
        project_id: projectId,
        equipment_type: reqForm.equipment_type,
        capacity: reqForm.capacity,
        from_date: reqForm.from_date || null,
        to_date: reqForm.to_date || null,
        duration_approx: reqForm.duration_approx,
        reason: reqForm.reason,
      });
      if (res && res.success) {
        setShowReqForm(false);
        setReqForm(emptyReq);
        loadRequests();
      } else {
        window.alert((res && res.message) || "Save failed");
      }
    } catch (e) { window.alert(e.message || "Save failed"); }
    setReqSaving(false);
  };

  const finStatusPill = (status, approval) => {
    if (status === "confirmed") return <Pill label="Confirmed" c={T.grn} bg={T.grnL} />;
    if (status === "log_only") return <Pill label="Log only" c={T.t3} bg={T.sltL} />;
    if (status === "suggested" || !status) {
      if (approval === "pending") return <Pill label="Approval pending" c={T.amb} bg={T.ambL} />;
      if (approval === "rejected") return <Pill label="Rate rejected" c={T.red} bg={T.redL} />;
      return <Pill label="Suggested" c={T.amb} bg={T.ambL} />;
    }
    return <Pill label={status} c={T.t3} bg={T.sltL} />;
  };

  const reqStatusPill = (s) => {
    if (s === "fulfilled") return <Pill label="Fulfilled" c={T.grn} bg={T.grnL} />;
    if (s === "rejected") return <Pill label="Rejected" c={T.red} bg={T.redL} />;
    return <Pill label="Pending" c={T.amb} bg={T.ambL} />;
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
    if (u.measurement_mode === "fixed") return "Fixed";
    const n = Number(u.hours_or_days) || 0;
    if (u.measurement_mode === "daily") return `${n} day${n !== 1 ? "s" : ""}`;
    if (u.measurement_mode === "trip") return `${n} trip${n !== 1 ? "s" : ""}`;
    // km wali machine (tipper/trailer) ka kiraya km par chalta hai — quantity
    // wahi field hai, sirf unit alag. "12 hr" likhna jhooth hota.
    if (u.measurement_mode === "km") return `${n} km`;
    return `${n} hr`;
  };

  // Usage form ki quantity ka naam machine ke mode se aata hai.
  const QTY_LABEL = { daily: "Days", km: "Km", trip: "Trips", fixed: "Quantity" };
  const qtyLabelFor = (eqId) => {
    const m = eqId ? masterList.find((x) => String(x.id) === String(eqId)) : null;
    return QTY_LABEL[m && m.measurement_mode] || "Hours or Days";
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
    if (!r || r.success === false) { window.alert((r && r.message) || "Update failed"); load(); }
  };
  const removeEq = async (eq) => {
    if (!await window.confirmAsync(`Remove ${eq.name}?`)) return;
    const r = await api.del("/library/project-equipment/" + eq.id);
    if (!r || r.success === false) { window.alert((r && r.message) || "Delete failed"); return; }
    load();
  };
  const resetForm = () => { setName(""); setVendor("Self"); setFromD(""); setToD(""); setStat("On Site"); setRate(""); };
  const saveNew = async () => {
    if (!name.trim()) { window.alert("Equipment name required"); return; }
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
    if (!r || r.success === false) { window.alert((r && r.message) || "Save failed"); return; }
    resetForm();
    setShowAdd(false);
    load();
  };

  const inp = { width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
    fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" };

  const onSite   = rows.filter(r => r.status !== "Returned").length;
  const returned = rows.filter(r => r.status === "Returned").length;

  return (
    <div>
      <div style={{ padding: "14px 18px 0" }}>
        <FilterTabs
          options={[{ id: "equipment", label: "Equipment" }, { id: "trips", label: "Trip Tracking" }]}
          active={view} onChange={setView} />
      </div>
      {view === "trips" ? <TabTripTracking projectId={projectId} /> : (
      <div style={{ padding: "16px 18px" }}>
      {/* ── KPI: Total equipment cost ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat label="Total Equipment Cost" value={`₹${fmtN(Math.round(totalCost))}`}
          note={fuelCost > 0
            ? `Hire ₹${fmtN(Math.round(hireCost))} + diesel ₹${fmtN(Math.round(fuelCost))}`
            : `${confirmedCount} confirmed entr${confirmedCount === 1 ? "y" : "ies"}`}
          color={T.blu} />
        <Stat label="Usage Entries" value={usageRows.length}
          note={`${usageRows.filter(u => (u.finance_status || "suggested") === "suggested").length} awaiting review`}
          color={T.amb} />
        <Stat label="Active Requests" value={reqList.filter(r => r.status === "pending").length}
          note={`${reservations.length} reserved`}
          color={T.pur} />
      </div>

      {/* ── 1. USAGE LOG ──────────────────────────────────────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title="Usage Log" open={openUsage} onToggle={() => setOpenUsage(v => !v)}
          count={usageRows.length}
          action={<AddBtn label="Log usage" onClick={() => { setLogForm(emptyLog); setLogErr(""); setShowLogModal(true); }} />} />
        {openUsage && (
          <div>
            {usageLoading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>Loading usage...</div>}
            {!usageLoading && usageRows.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>No usage entries logged yet.</div>
            )}
            {!usageLoading && usageRows.length > 0 && (
              <>
                <THead cols="100px 1.6fr 1fr 90px 80px 100px 1.1fr 1fr"
                  headers={["Date", "Equipment", "Mode / Dur.", "Rate", "Trip", "Total", "Route", "Status"]} />
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
        <SectionHeader title="Equipment Requests" open={openReqs} onToggle={() => setOpenReqs(v => !v)}
          count={reqList.length}
          action={<AddBtn label="Request equipment" onClick={() => setShowReqForm(v => !v)} />} />
        {openReqs && (
          <div>
            {showReqForm && (
              <div style={{ padding: "12px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Equipment Type</div>
                    <select value={reqForm.equipment_type} onChange={e => updReq("equipment_type", e.target.value)} style={inp}>
                      {["Earthwork","Lifting","Concrete","Steel","Safety","Transport","Pumping","Compaction"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Capacity</div>
                    <input value={reqForm.capacity} onChange={e => updReq("capacity", e.target.value)} placeholder="e.g. 1 cum" style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>From</div>
                    <input type="date" value={reqForm.from_date} onChange={e => updReq("from_date", e.target.value)} style={inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>To</div>
                    <input type="date" value={reqForm.to_date} onChange={e => updReq("to_date", e.target.value)} style={inp} />
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Reason / Notes</div>
                  <input value={reqForm.reason} onChange={e => updReq("reason", e.target.value)} placeholder="Site needs JCB for excavation" style={inp} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
                  <button onClick={() => { setShowReqForm(false); setReqForm(emptyReq); }} type="button"
                    style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={saveRequest} disabled={reqSaving} type="button"
                    style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: reqSaving ? T.b1 : T.blu, color: reqSaving ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: reqSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {reqSaving ? "Saving..." : "Submit request"}
                  </button>
                </div>
              </div>
            )}
            {reqList.length === 0 && !showReqForm && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>No requests yet.</div>
            )}
            {reqList.length > 0 && (
              <>
                <THead cols="1.4fr 1fr 1fr 1.4fr 110px" headers={["Type / Capacity", "From", "To", "Reason", "Status"]} />
                {reqList.map(rq => (
                  <div key={rq.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1.4fr 110px",
                    padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{rq.equipment_type || "—"}</div>
                      {rq.capacity && <div style={{ fontSize: 10.5, color: T.t4 }}>{rq.capacity}</div>}
                    </div>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(rq.from_date)}</span>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtD(rq.to_date)}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rq.reason || "—"}</span>
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
        <SectionHeader title="Reserved Equipment" open={openReserved} onToggle={() => setOpenReserved(v => !v)}
          count={reservations.length} />
        {openReserved && (
          <div>
            {reservations.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>No reservations.</div>
            )}
            {reservations.map(rv => {
              const eq = masterList.find(m => m.id === rv.equipment_id);
              return (
                <div key={rv.id} style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{eq?.name || `Equipment #${rv.equipment_id}`}</div>
                    {rv.note && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{rv.note}</div>}
                  </div>
                  <span style={{ fontSize: 11.5, color: T.t2 }}>
                    Reserved {fmtD(rv.from_date)} → {fmtD(rv.to_date)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* ── LEGACY: Period & Status (project_equipment) ───────────── */}
      <Panel style={{ marginBottom: 12 }}>
        <SectionHeader title="Period & Status (legacy)" open={openLegacy} onToggle={() => setOpenLegacy(v => !v)}
          count={rows.length}
          action={<AddBtn label="Add Equipment" onClick={() => setShowAdd(true)} />} />
        {openLegacy && (
          <div style={{ padding: "10px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 18 }}>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>Total</div><div style={{ fontSize: 19, fontWeight: 700, color: T.t1 }}>{rows.length}</div></div>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>On Site</div><div style={{ fontSize: 19, fontWeight: 700, color: T.grn }}>{onSite}</div></div>
          <div><div style={{ fontSize: 10, color: T.t4, textTransform: "uppercase", fontWeight: 600 }}>Returned</div><div style={{ fontSize: 19, fontWeight: 700, color: T.t3 }}>{returned}</div></div>
        </div>
      </div>

      {showAdd && (
        <Panel style={{ marginBottom: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 10 }}>Add Equipment</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Name *</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="JCB Excavator" style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Vendor</div>
              <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder='"Self" for company-owned' style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>From</div>
              <input type="date" value={fromD} onChange={e => setFromD(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>To</div>
              <input type="date" value={toD} onChange={e => setToD(e.target.value)} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Status</div>
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
                        cursor: "pointer", fontFamily: "inherit" }}>{s}</button>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Day Rate (optional)</div>
              <input value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 5000" style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={() => { resetForm(); setShowAdd(false); }} type="button"
              style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={saveNew} disabled={saving || !name.trim()} type="button"
              style={{ padding: "8px 16px", borderRadius: 7, border: "none",
                background: (saving || !name.trim()) ? T.b1 : T.blu,
                color: (saving || !name.trim()) ? T.t4 : "white",
                fontSize: 12, fontWeight: 700,
                cursor: (saving || !name.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
              {saving ? "Saving..." : "Add Equipment"}
            </button>
          </div>
        </Panel>
      )}

      {loading && <div style={{ textAlign: "center", padding: "40px 0", color: T.t4, fontSize: 13 }}>Loading...</div>}

      {!loading && rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: T.t4, fontSize: 13 }}>
          No equipment deployed yet — click "Add Equipment" to track one.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <Panel style={{ overflow: "hidden" }}>
          <THead cols="2fr 1.4fr 1.6fr 110px 110px 60px" headers={["Equipment", "Vendor", "Period", "Day Rate", "Status", ""]} />
          {rows.map(eq => {
            const sm = SC[eq.status] || SC["On Site"];
            return (
              <div key={eq.id}
                style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1.6fr 110px 110px 60px",
                  padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{eq.name}</div>
                  {eq.equipment_code && <div style={{ fontSize: 10, color: T.t4, marginTop: 1 }}>{eq.equipment_code}</div>}
                </div>
                <span style={{ fontSize: 12, color: T.t2 }}>{eq.vendor || "Self"}</span>
                <span style={{ fontSize: 11.5, color: T.t2 }}>
                  {eq.from_date ? fmtD(eq.from_date) : "—"}
                  {eq.to_date ? <> &nbsp;→&nbsp; {fmtD(eq.to_date)}</> : ""}
                </span>
                <span style={{ fontSize: 12.5, color: T.t1, fontVariantNumeric: "tabular-nums" }}>
                  {eq.rate_per_day ? "₹" + fmtN(eq.rate_per_day) : "—"}
                </span>
                <button onClick={() => toggleStatus(eq)} type="button"
                  style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                    background: sm.bg, color: sm.c, border: "none", cursor: "pointer",
                    fontFamily: "inherit", justifySelf: "start" }}>
                  {eq.status}
                </button>
                <button onClick={() => removeEq(eq)} type="button"
                  title="Remove"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: T.t4, fontSize: 16, fontFamily: "inherit", justifySelf: "end" }}>
                  ×
                </button>
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
              <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>Log Equipment Usage</div>
              <button onClick={() => setShowLogModal(false)} style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex" }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.t3} strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: "16px 22px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Equipment (from master)</div>
                  <select value={logForm.equipment_id} onChange={e => updLog("equipment_id", e.target.value)} style={inp}>
                    <option value="">— Select / leave empty for ad-hoc —</option>
                    {masterList.map(m => <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>OR Ad-hoc equipment name</div>
                  <input value={logForm.equipment_name} onChange={e => updLog("equipment_name", e.target.value)} placeholder="e.g. Borrowed JCB" style={inp} disabled={!!logForm.equipment_id} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Usage Date</div>
                  <input type="date" value={logForm.usage_date} onChange={e => updLog("usage_date", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Vendor name (ad-hoc, optional)</div>
                  <input value={logForm.vendor_name} onChange={e => updLog("vendor_name", e.target.value)} placeholder="If no party set" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Start Time</div>
                  <input type="time" value={logForm.start_time} onChange={e => updLog("start_time", e.target.value)} style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>End Time</div>
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
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Rate Used (₹)</div>
                  <input value={logForm.rate_used} onChange={e => updLog("rate_used", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Trip Charge (₹)</div>
                  <input value={logForm.trip_charge} onChange={e => updLog("trip_charge", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Lump Amount (Fixed mode)</div>
                  <input value={logForm.lump_amount} onChange={e => updLog("lump_amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div style={{ gridColumn: "1 / 3" }}>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Settlement Side</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ k: "company", l: "Company pays" }, { k: "subcon", l: "Subcon pays" }].map(o => {
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
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Vendor (party)</div>
                  <select value={logForm.vendor_id} onChange={e => updLog("vendor_id", e.target.value)} style={inp}>
                    <option value="">—</option>
                    {vendorParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Subcon (party)</div>
                  <select value={logForm.subcon_id} onChange={e => updLog("subcon_id", e.target.value)} style={inp}>
                    <option value="">—</option>
                    {subconParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Fuel Qty (L)</div>
                  <input value={logForm.fuel_qty} onChange={e => updLog("fuel_qty", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Fuel Cost (₹)</div>
                  <input value={logForm.fuel_cost} onChange={e => updLog("fuel_cost", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
                </div>
                <div style={{ gridColumn: "1 / 3" }}>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Fuel paid to (pump / vendor)</div>
                  <select value={logForm.fuel_vendor_id} onChange={e => updLog("fuel_vendor_id", e.target.value)} style={inp}>
                    <option value="">— Site cash (no separate payee) —</option>
                    {vendorParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div style={{ fontSize: 10, color: T.t4, marginTop: 4 }}>
                    Diesel ka kharcha rent se alag book hota hai. Pump chuno to wo Pending Payments me jayega, warna site expense.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Operator Name</div>
                  <input value={logForm.operator_name} onChange={e => updLog("operator_name", e.target.value)} placeholder="e.g. Ramesh Kumar" style={inp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>Meter Start / End (optional)</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input value={logForm.meter_start} onChange={e => updLog("meter_start", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="start" style={inp} />
                    <input value={logForm.meter_end} onChange={e => updLog("meter_end", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="end" style={inp} />
                  </div>
                </div>
              </div>
              {logErr && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{logErr}</div>
              )}
            </div>
            <div style={{ padding: "12px 22px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowLogModal(false)} type="button"
                style={{ padding: "9px 16px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12.5, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveUsage} disabled={logSaving} type="button"
                style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: logSaving ? T.b1 : T.blu, color: logSaving ? T.t4 : "white", fontSize: 12.5, fontWeight: 700, cursor: logSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {logSaving ? "Saving..." : "Save Usage"}
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
