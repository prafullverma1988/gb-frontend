import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T, fmtN, localYMD } from "../shared/tokens";
import { Pill, Stat, Panel, THead, AddBtn, FilterTabs } from "../shared/ui";

// ════════════════════════════════════════════════════════════════
// TabTripTracking — web management view for the Trip Tracking module
// (truck trips load→unload; the camera/GPS punch itself lives in the
// mobile app). Manager surface: monitor + review flagged/stuck trips,
// manage routes (leads) + trucks, run reports, and bill vendors.
// ════════════════════════════════════════════════════════════════

const FLAG_META = {
  too_fast:         { label: "TOO FAST",         tone: "red" },
  impossible_cycle: { label: "IMPOSSIBLE CYCLE", tone: "red" },
  too_slow:         { label: "TOO SLOW",         tone: "amber" },
  gps_weak:         { label: "GPS WEAK",         tone: "amber" },
  load_outside:     { label: "LOAD OUTSIDE",     tone: "amber" },
  unload_outside:   { label: "UNLOAD OUTSIDE",   tone: "amber" },
  manual_close:     { label: "MANUAL CLOSE",     tone: "amber" },
};
const flagMeta = (f) => FLAG_META[f] || { label: String(f || "").toUpperCase(), tone: "amber" };
const parseFlags = (raw) => { try { return Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []); } catch { return []; } };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtD = (raw) => { if (!raw) return "—"; const d = new Date(String(raw).replace(" ", "T")); return isNaN(d.getTime()) ? String(raw).slice(0,10) : d.getDate() + " " + MONTHS[d.getMonth()]; };
const fmtClock = (raw) => {
  if (!raw) return "—";
  const d = new Date(String(raw).replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";
  let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return h + ":" + String(m).padStart(2, "0") + " " + ap;
};
// Month-to-date in IST.
function istRange() {
  const ist = new Date(Date.now() + 330 * 60000);
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth();
  return { from: y + "-" + String(m + 1).padStart(2, "0") + "-01", to: ist.toISOString().slice(0, 10) };
}
const rs = (v) => "₹" + fmtN(Math.round(Number(v) || 0));

const inp = { width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" };
const lblS = { fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 };

function TabTripTracking({ projectId }) {
  const [sub, setSub] = useState("monitor");
  const [summary, setSummary] = useState(null);

  const loadSummary = useCallback(() => {
    if (!projectId) return;
    api.get("/trips/summary?project_id=" + projectId)
      .then(r => setSummary(r && r.success ? r.data : null)).catch(() => setSummary(null));
  }, [projectId]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  return (
    <div style={{ padding: "16px 18px" }}>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat label="Trips Today" value={summary ? summary.trips_today : "—"} note="Aaj ki trips" color={T.blu} />
        <Stat label="In Transit" value={summary ? summary.in_transit_count : "—"} note="Raste me abhi" color={T.amb} />
        <Stat label="Flagged" value={summary ? summary.flagged_count : "—"} note="Review pending" color={summary && summary.flagged_count ? T.red : T.slt} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FilterTabs
          options={[
            { id: "monitor", label: "Monitor" },
            { id: "routes",  label: "Routes / Leads" },
            { id: "trucks",  label: "Trucks" },
            { id: "reports", label: "Reports" },
            { id: "billing", label: "Billing" },
          ]}
          active={sub} onChange={setSub} />
      </div>

      {sub === "monitor" && <MonitorTab projectId={projectId} onChange={loadSummary} />}
      {sub === "routes"  && <RoutesTab projectId={projectId} />}
      {sub === "trucks"  && <TrucksTab />}
      {sub === "reports" && <ReportsTab projectId={projectId} />}
      {sub === "billing" && <BillingTab projectId={projectId} />}
    </div>
  );
}

// ── MONITOR ──────────────────────────────────────────────────────
function MonitorTab({ projectId, onChange }) {
  const [filter, setFilter] = useState("flagged");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    let qs = "project_id=" + projectId;
    if (filter === "flagged") qs += "&verify_status=flagged";
    else if (filter === "transit") qs += "&status=in_transit";
    else if (filter === "completed") qs += "&status=completed";
    api.get("/trips?" + qs)
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [projectId, filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (t, action) => {
    const note = (notes[t.id] || "").trim();
    if (action === "reject" && !note) { window.alert("Reject ke liye note zaroori hai"); return; }
    setBusyId(t.id);
    const r = await api.post("/trips/" + t.id + "/review", { action, note: note || null });
    setBusyId(null);
    if (!r || r.success === false) { window.alert((r && r.message) || "Action fail"); return; }
    setOpenId(null); load(); onChange && onChange();
  };
  const stuckAct = async (t, kind) => {
    const remark = (notes[t.id] || "").trim();
    if (!remark) { window.alert("Remark zaroori hai"); return; }
    setBusyId(t.id);
    const r = kind === "cancel"
      ? await api.post("/trips/" + t.id + "/cancel", { remark })
      : await api.post("/trips/" + t.id + "/manual-close", { remark });
    setBusyId(null);
    if (!r || r.success === false) { window.alert((r && r.message) || "Action fail"); return; }
    setOpenId(null); load(); onChange && onChange();
  };

  const verifyPill = (t) => {
    const v = t.verify_status;
    if (v === "auto_verified") return <Pill label="Auto-verified" c={T.grn} bg={T.grnL} />;
    if (v === "approved")      return <Pill label="Approved" c={T.grn} bg={T.grnL} />;
    if (v === "flagged")       return <Pill label="Flagged" c={T.red} bg={T.redL} />;
    if (v === "rejected")      return <Pill label="Rejected" c={T.red} bg={T.redL} />;
    return <Pill label="Pending" c={T.amb} bg={T.ambL} />;
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <FilterTabs
          options={[
            { id: "flagged", label: "Flagged" },
            { id: "transit", label: "In transit" },
            { id: "completed", label: "Completed" },
            { id: "all", label: "All" },
          ]}
          active={filter} onChange={setFilter} />
      </div>

      <Panel>
        {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>Loading trips…</div>}
        {!loading && rows.length === 0 && (
          <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>Is filter me koi trip nahi.</div>
        )}
        {!loading && rows.length > 0 && (
          <>
            <THead cols="150px 1.3fr 1fr 90px 100px 1fr 40px"
              headers={["Truck / Trip", "Route", "Loaded", "Travel", "Amount", "Status", ""]} />
            {rows.map(t => {
              const flags = parseFlags(t.flag_reasons);
              const open = openId === t.id;
              return (
                <div key={t.id} style={{ borderBottom: `1px solid ${T.b1}` }}>
                  <div onClick={() => setOpenId(open ? null : t.id)}
                    style={{ display: "grid", gridTemplateColumns: "150px 1.3fr 1fr 90px 100px 1fr 40px",
                      padding: "10px 15px", alignItems: "center", gap: 6, cursor: "pointer", background: open ? T.surfaceB : "transparent" }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t.registration_no || t.truck_name || "Truck"}</div>
                      <div style={{ fontSize: 10.5, color: T.t4 }}>#{t.trip_no} · {fmtD(t.trip_date)}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.route_name || "—"}</div>
                      {t.task_name && <div style={{ fontSize: 10.5, color: T.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.task_name}</div>}
                    </div>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtClock(t.load_at)}</span>
                    <span style={{ fontSize: 11.5, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{t.travel_min != null ? t.travel_min + " min" : "—"}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{t.amount != null ? rs(t.amount) : "—"}</span>
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>{verifyPill(t)}
                      {flags.slice(0, 1).map(f => { const m = flagMeta(f); return <Pill key={f} label={m.label} c={m.tone === "red" ? T.red : T.amb} bg={m.tone === "red" ? T.redL : T.ambL} />; })}
                      {flags.length > 1 && <span style={{ fontSize: 10, color: T.t4 }}>+{flags.length - 1}</span>}
                    </span>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2.4}
                      style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", justifySelf: "end" }}><path d="M9 18l6-6-6-6" /></svg>
                  </div>

                  {open && (
                    <div style={{ padding: "0 15px 14px", background: T.surfaceB }}>
                      {/* flags */}
                      {flags.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                          {flags.map(f => { const m = flagMeta(f); return <Pill key={f} label={m.label} c={m.tone === "red" ? T.red : T.amb} bg={m.tone === "red" ? T.redL : T.ambL} />; })}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <PhotoThumb label="Load" url={t.load_photo_url} />
                        <PhotoThumb label="Unload" url={t.unload_photo_url} />
                        <div style={{ flex: 1, fontSize: 11.5, color: T.t2, lineHeight: 1.9 }}>
                          <div>Travel: <b>{t.travel_min != null ? t.travel_min + " min" : "—"}</b>{t.expected_travel_min != null ? ` (expected ${t.expected_travel_min} ± ${t.tolerance_min || 0})` : ""}</div>
                          <div>Loaded by: {t.load_by_name || "—"} · {fmtClock(t.load_at)}</div>
                          <div>Unloaded by: {t.unload_by_name || "—"} · {fmtClock(t.unload_at)}</div>
                          <div>Vendor: {t.vendor_name || "—"} · Rate: {t.rate_snap != null ? rs(t.rate_snap) : "RATE PENDING"}</div>
                          {t.delay_reason && <div style={{ color: T.amb }}>Delay: {t.delay_reason}</div>}
                          {t.review_note && <div style={{ color: T.t3 }}>Review note: {t.review_note}</div>}
                        </div>
                      </div>

                      {(t.verify_status === "flagged" || t.status === "in_transit") && (
                        <div>
                          <input value={notes[t.id] || ""} onChange={e => setNotes(n => ({ ...n, [t.id]: e.target.value }))}
                            placeholder={t.status === "in_transit" ? "Remark (cancel / manual close ke liye)" : "Note (reject ke liye zaroori)"}
                            style={{ ...inp, marginBottom: 8 }} />
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            {t.verify_status === "flagged" && t.status !== "in_transit" && (
                              <>
                                <BtnOutline label="Reject" color={T.red} busy={busyId === t.id} onClick={() => act(t, "reject")} />
                                <BtnSolid label="Approve" color={T.grn} busy={busyId === t.id} onClick={() => act(t, "approve")} />
                              </>
                            )}
                            {t.status === "in_transit" && (
                              <>
                                <BtnOutline label="Cancel trip" color={T.red} busy={busyId === t.id} onClick={() => stuckAct(t, "cancel")} />
                                <BtnOutline label="Manual close" color={T.amb} busy={busyId === t.id} onClick={() => stuckAct(t, "close")} />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </Panel>
    </div>
  );
}

// ── ROUTES ───────────────────────────────────────────────────────
function RoutesTab({ projectId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(null); // null | {} | route

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    api.get("/trips/routes?project_id=" + projectId)
      .then(r => setList(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [projectId]);
  useEffect(() => {
    load();
    api.get("/tasks?project_id=" + projectId).then(r => setTasks(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setTasks([]));
  }, [load, projectId]);

  return (
    <Panel>
      <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>Routes / Leads {list.length ? `(${list.length})` : ""}</span>
        <AddBtn label="New route" onClick={() => setForm({})} />
      </div>

      {form && <RouteForm projectId={projectId} tasks={tasks} route={form.id ? form : null}
        onCancel={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}

      {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>Loading…</div>}
      {!loading && list.length === 0 && !form && (
        <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>Abhi koi route nahi — "New route" se banayein.</div>
      )}
      {!loading && list.length > 0 && (
        <>
          <THead cols="1.6fr 100px 120px 110px 90px 70px" headers={["Route", "Lead km", "Rate / trip", "Exp. time", "Status", ""]} />
          {list.map(r => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 100px 120px 110px 90px 70px",
              padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{r.name}</div>
                {r.default_task_name && <div style={{ fontSize: 10.5, color: T.t4 }}>{r.default_task_name}</div>}
              </div>
              <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{r.lead_km != null ? r.lead_km : "—"}</span>
              <span style={{ fontSize: 12 }}>
                {r.rate_per_trip != null ? <span style={{ color: T.t1, fontVariantNumeric: "tabular-nums" }}>{rs(r.rate_per_trip)}</span> : <Pill label="RATE PENDING" c={T.amb} bg={T.ambL} />}
              </span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{r.expected_travel_min != null ? r.expected_travel_min + " min" : "—"}</span>
              <span>{r.is_active ? <Pill label="Active" c={T.grn} bg={T.grnL} /> : <Pill label="Inactive" c={T.t3} bg={T.sltL} />}</span>
              <button onClick={() => setForm(r)} type="button" style={{ justifySelf: "end", fontSize: 11.5, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>Edit</button>
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

function RouteForm({ projectId, tasks, route, onCancel, onSaved }) {
  const [f, setF] = useState({
    name: route?.name || "",
    lead_km: route?.lead_km != null ? String(route.lead_km) : "",
    rate_per_trip: route?.rate_per_trip != null ? String(route.rate_per_trip) : "",
    expected_travel_min: route?.expected_travel_min != null ? String(route.expected_travel_min) : "",
    tolerance_min: route?.tolerance_min != null ? String(route.tolerance_min) : "10",
    expected_cycle_min: route?.expected_cycle_min != null ? String(route.expected_cycle_min) : "",
    load_lat: route?.load_lat ?? "", load_lng: route?.load_lng ?? "",
    unload_lat: route?.unload_lat ?? "", unload_lng: route?.unload_lng ?? "",
    load_radius: route?.load_radius || 100,
    default_task_id: route?.default_task_id || "",
  });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const numf = (v) => (v !== "" && v != null && !isNaN(parseFloat(v)) ? parseFloat(v) : null);

  const save = async () => {
    if (!f.name.trim()) { window.alert("Route ka naam daalein"); return; }
    if (numf(f.lead_km) == null) { window.alert("Lead km bharein"); return; }
    setSaving(true);
    const body = {
      project_id: projectId, name: f.name.trim(),
      default_task_id: f.default_task_id || null,
      load_lat: numf(f.load_lat), load_lng: numf(f.load_lng),
      unload_lat: numf(f.unload_lat), unload_lng: numf(f.unload_lng),
      load_radius: f.load_radius, unload_radius: f.load_radius,
      lead_km: numf(f.lead_km), rate_per_trip: numf(f.rate_per_trip),
      expected_travel_min: numf(f.expected_travel_min) != null ? Math.round(numf(f.expected_travel_min)) : null,
      tolerance_min: numf(f.tolerance_min) != null ? Math.round(numf(f.tolerance_min)) : 10,
      expected_cycle_min: numf(f.expected_cycle_min) != null ? Math.round(numf(f.expected_cycle_min)) : null,
    };
    let r;
    if (route) {
      r = await api.put("/trips/routes/" + route.id, body);
      if (r && r.success !== false && route.rate_per_trip == null && numf(f.rate_per_trip) != null) {
        await api.post("/trips/routes/" + route.id + "/backfill-rate", { rate: numf(f.rate_per_trip) });
      }
    } else {
      r = await api.post("/trips/routes", body);
    }
    setSaving(false);
    if (!r || r.success === false) { window.alert((r && r.message) || "Save fail"); return; }
    onSaved();
  };

  return (
    <div style={{ padding: "14px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{route ? "Edit route" : "New route"}</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
        <div><div style={lblS}>Route name *</div><input value={f.name} onChange={e => upd("name", e.target.value)} placeholder="Quarry → Site A" style={inp} /></div>
        <div><div style={lblS}>Lead km * <span style={{ color: T.t4, fontWeight: 400 }}>(haul road)</span></div><input value={f.lead_km} onChange={e => upd("lead_km", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} /></div>
        <div><div style={lblS}>Rate / trip <span style={{ color: T.t4, fontWeight: 400 }}>(blank = pending)</span></div><input value={f.rate_per_trip} onChange={e => upd("rate_per_trip", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="800" style={inp} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
        <div><div style={lblS}>Expected time (min)</div><input value={f.expected_travel_min} onChange={e => upd("expected_travel_min", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" style={inp} /></div>
        <div><div style={lblS}>Tolerance (min)</div><input value={f.tolerance_min} onChange={e => upd("tolerance_min", e.target.value.replace(/[^0-9]/g, ""))} placeholder="10" style={inp} /></div>
        <div><div style={lblS}>Cycle time (min)</div><input value={f.expected_cycle_min} onChange={e => upd("expected_cycle_min", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" style={inp} /></div>
        <div><div style={lblS}>Geofence radius (m)</div>
          <select value={f.load_radius} onChange={e => upd("load_radius", Number(e.target.value))} style={inp}>
            {[50, 100, 150, 200].map(rd => <option key={rd} value={rd}>{rd} m</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
        <div><div style={lblS}>Load lat</div><input value={f.load_lat} onChange={e => upd("load_lat", e.target.value)} placeholder="21.2xxxx" style={inp} /></div>
        <div><div style={lblS}>Load lng</div><input value={f.load_lng} onChange={e => upd("load_lng", e.target.value)} placeholder="81.6xxxx" style={inp} /></div>
        <div><div style={lblS}>Unload lat</div><input value={f.unload_lat} onChange={e => upd("unload_lat", e.target.value)} placeholder="21.2xxxx" style={inp} /></div>
        <div><div style={lblS}>Unload lng</div><input value={f.unload_lng} onChange={e => upd("unload_lng", e.target.value)} placeholder="81.6xxxx" style={inp} /></div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={lblS}>Default task (optional)</div>
        <select value={f.default_task_id || ""} onChange={e => upd("default_task_id", e.target.value ? Number(e.target.value) : "")} style={inp}>
          <option value="">— none —</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.name || t.title}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onCancel} type="button" style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
        <button onClick={save} disabled={saving} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: saving ? T.b1 : T.blu, color: saving ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{saving ? "Saving…" : (route ? "Update route" : "Save route")}</button>
      </div>
    </div>
  );
}

// ── TRUCKS ───────────────────────────────────────────────────────
function TrucksTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [add, setAdd] = useState(false);
  const [reg, setReg] = useState("");
  const [own, setOwn] = useState("rented");
  const [vendorId, setVendorId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/trips/trucks").then(r => setList(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setList([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
    api.get("/finance/parties").then(r => setVendors(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setVendors([]));
  }, [load]);

  const save = async () => {
    if (!reg.trim()) { window.alert("Registration number daalein"); return; }
    setSaving(true);
    const r = await api.post("/trips/trucks", { registration_no: reg.trim(), ownership: own, default_vendor_id: vendorId || null });
    setSaving(false);
    if (!r || r.success === false) { window.alert((r && r.message) || "Truck save fail"); return; }
    setAdd(false); setReg(""); setVendorId(""); load();
  };

  return (
    <Panel>
      <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>Trucks {list.length ? `(${list.length})` : ""}</span>
        <AddBtn label="Add truck" onClick={() => setAdd(v => !v)} />
      </div>
      {add && (
        <div style={{ padding: "12px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55", display: "grid", gridTemplateColumns: "1.4fr 1fr 1.4fr auto", gap: 10, alignItems: "end" }}>
          <div><div style={lblS}>Registration no *</div><input value={reg} onChange={e => setReg(e.target.value)} placeholder="CG04 AB 1234" style={inp} /></div>
          <div><div style={lblS}>Ownership</div>
            <select value={own} onChange={e => setOwn(e.target.value)} style={inp}><option value="rented">Rented</option><option value="owned">Owned</option></select>
          </div>
          <div><div style={lblS}>Vendor (optional)</div>
            <select value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : "")} style={inp}>
              <option value="">— none —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <button onClick={save} disabled={saving} type="button" style={{ padding: "9px 16px", borderRadius: 7, border: "none", background: saving ? T.b1 : T.blu, color: saving ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{saving ? "…" : "Add"}</button>
        </div>
      )}
      {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>Loading…</div>}
      {!loading && list.length === 0 && <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>Abhi koi truck nahi.</div>}
      {!loading && list.length > 0 && (
        <>
          <THead cols="1.4fr 1fr 1.4fr 110px 110px" headers={["Registration", "Ownership", "Vendor", "Today trips", "Status"]} />
          {list.map(t => (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.4fr 110px 110px", padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>{t.registration_no || t.name}</span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t.ownership || "—"}</span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t.default_vendor_name || "—"}</span>
              <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{Number(t.today_trip_count || 0)}</span>
              <span>{Number(t.open_trip_count) > 0 ? <Pill label="In transit" c={T.amb} bg={T.ambL} /> : <Pill label="Idle" c={T.t3} bg={T.sltL} />}</span>
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

// ── REPORTS ──────────────────────────────────────────────────────
function ReportsTab({ projectId }) {
  const [kind, setKind] = useState("truck");
  const init = istRange();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const qs = "from=" + from + "&to=" + to + "&project_id=" + projectId;
    const ep = kind === "vendor" ? "/trips/reports/by-vendor" : kind === "task" ? "/trips/reports/by-task" : "/trips/reports/by-truck";
    api.get(ep + "?" + qs).then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, [kind, from, to, projectId]);

  const nameOf = (r) => kind === "vendor" ? (r.vendor_name || "—") : kind === "task" ? (r.task_name || "—") : (r.registration_no || r.truck_name || "Truck");

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
        <FilterTabs options={[{ id: "truck", label: "By Truck" }, { id: "vendor", label: "By Vendor" }, { id: "task", label: "By Task" }]} active={kind} onChange={setKind} />
        <div><div style={lblS}>From</div><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, width: 150 }} /></div>
        <div><div style={lblS}>To</div><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, width: 150 }} /></div>
      </div>
      <Panel>
        {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>Loading…</div>}
        {!loading && rows.length === 0 && <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>Is range me koi verified trip nahi.</div>}
        {!loading && rows.length > 0 && (
          <>
            <THead cols="1.6fr 90px 110px 130px 1.2fr" headers={["Name", "Trips", "Total km", "Amount", "Hired / Owned"]} />
            {rows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 90px 110px 130px 1.2fr", padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{nameOf(r)}</span>
                <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{r.trips || 0}</span>
                <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{fmtN(Number(r.total_km) || 0)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{rs(r.total_amount)}</span>
                <span style={{ fontSize: 11, color: T.t3 }}>Hired {r.hired_trips || 0} ({rs(r.hired_amount)}) · Owned {r.owned_trips || 0} ({rs(r.owned_amount)})</span>
              </div>
            ))}
          </>
        )}
      </Panel>
    </div>
  );
}

// ── BILLING ──────────────────────────────────────────────────────
function BillingTab({ projectId }) {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const init = istRange();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [preview, setPreview] = useState(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bills, setBills] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const loadBills = useCallback(() => {
    if (!projectId) return;
    api.get("/trips/bills?project_id=" + projectId).then(r => setBills(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setBills([]));
  }, [projectId]);
  useEffect(() => {
    api.get("/finance/parties").then(r => setVendors(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setVendors([]));
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (!vendorId) { setPreview(null); return; }
    setLoadingPrev(true);
    const qs = "vendor_id=" + vendorId + "&from=" + from + "&to=" + to + "&project_id=" + projectId;
    api.get("/trips/bills/preview?" + qs).then(r => setPreview(r && r.success ? r.data : null)).catch(() => setPreview(null)).finally(() => setLoadingPrev(false));
  }, [vendorId, from, to, projectId]);

  const generate = async () => {
    if (!vendorId || !preview || !preview.trip_count) return;
    setGenerating(true);
    const r = await api.post("/trips/bills", { vendor_id: vendorId, from, to, project_id: projectId });
    setGenerating(false);
    if (!r || r.success === false) { window.alert((r && r.message) || "Bill generate fail"); return; }
    window.alert("Bill #" + r.data.id + " ban gaya · " + rs(r.data.total_amount) + " — Finance me party_payment ban gaya");
    setPreview(null); setVendorId(""); loadBills();
  };
  const toggleBill = async (b) => {
    if (expanded && expanded.billId === b.id) { setExpanded(null); return; }
    const r = await api.get("/trips/bills/" + b.id);
    setExpanded({ billId: b.id, trips: r && r.success ? (r.data.trips || []) : [] });
  };

  return (
    <div>
      <Panel style={{ marginBottom: 12 }}>
        <div style={{ padding: "12px 15px", display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}><div style={lblS}>Vendor</div>
            <select value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : "")} style={inp}>
              <option value="">Vendor chuniye…</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div><div style={lblS}>From</div><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, width: 150 }} /></div>
          <div><div style={lblS}>To</div><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, width: 150 }} /></div>
        </div>

        {vendorId && (
          <div style={{ padding: "0 15px 15px" }}>
            {loadingPrev && <div style={{ color: T.t4, fontSize: 12.5, padding: "6px 0" }}>Preview le raha…</div>}
            {!loadingPrev && preview && preview.trip_count === 0 && <div style={{ color: T.t4, fontSize: 12.5, padding: "6px 0" }}>Is vendor ki is range me koi billable trip nahi.</div>}
            {!loadingPrev && preview && preview.trip_count > 0 && (
              <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t3, marginBottom: 8 }}>{preview.trip_count} verified trips</div>
                {preview.breakdown.map((b, i) => {
                  const rate = b.trips ? Math.round(b.amount / b.trips) : 0;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                      <span style={{ color: T.t2 }}>{b.route_name} · {b.trips} × {rs(rate)}</span>
                      <span style={{ color: T.t1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{rs(b.amount)}</span>
                    </div>
                  );
                })}
                <div style={{ height: 1, background: T.b1, margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>Total payable</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: T.grn, fontVariantNumeric: "tabular-nums" }}>{rs(preview.total_amount)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: T.t4, marginTop: 8 }}>Sirf verified / approved trips · billed trips dobara nahi · owned trucks excluded.</div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={generate} disabled={generating} type="button" style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: generating ? T.b1 : T.blu, color: generating ? T.t4 : "white", fontSize: 12.5, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{generating ? "Generating…" : "Generate bill"}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel>
        <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>Bills {bills.length ? `(${bills.length})` : ""}</span>
        </div>
        {bills.length === 0 && <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>Abhi koi bill nahi bana.</div>}
        {bills.map(b => (
          <div key={b.id} style={{ borderBottom: `1px solid ${T.b1}` }}>
            <div onClick={() => toggleBill(b)} style={{ display: "grid", gridTemplateColumns: "80px 1.4fr 1.4fr 100px 120px", padding: "10px 15px", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>#{b.id}</span>
              <span style={{ fontSize: 12.5, color: T.t1 }}>{b.vendor_name || "—"}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{String(b.from_date).slice(0, 10)} → {String(b.to_date).slice(0, 10)}</span>
              <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{b.trip_count} trips</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums", justifySelf: "end" }}>{rs(b.total_amount)}</span>
            </div>
            {expanded && expanded.billId === b.id && (
              <div style={{ padding: "6px 15px 12px", background: T.surfaceB }}>
                {expanded.trips.length === 0 && <div style={{ fontSize: 11.5, color: T.t4, padding: "6px 0" }}>Koi trip detail nahi.</div>}
                {expanded.trips.map(t => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11.5 }}>
                    <span style={{ color: T.t3 }}>{(t.registration_no || "Truck")} · #{t.trip_no} · {t.route_name || "—"}</span>
                    <span style={{ color: T.t1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{rs(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ── small bits ───────────────────────────────────────────────────
function PhotoThumb({ label, url }) {
  return (
    <div style={{ width: 120 }}>
      <div style={{ fontSize: 9.5, color: T.t4, fontWeight: 700, marginBottom: 3, textTransform: "uppercase" }}>{label}</div>
      {url ? (
        <img src={url} alt={label} onClick={() => window.open(url, "_blank")}
          style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 7, cursor: "pointer", border: `1px solid ${T.b1}` }} />
      ) : (
        <div style={{ width: 120, height: 90, borderRadius: 7, border: `1px dashed ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.t4, fontSize: 10.5 }}>No photo</div>
      )}
    </div>
  );
}
function BtnOutline({ label, color, busy, onClick }) {
  return <button onClick={onClick} disabled={busy} type="button" style={{ padding: "8px 16px", borderRadius: 7, border: `1.5px solid ${color}`, background: T.surface, color, fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{label}</button>;
}
function BtnSolid({ label, color, busy, onClick }) {
  return <button onClick={onClick} disabled={busy} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: color, color: "white", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{label}</button>;
}

export default TabTripTracking;
