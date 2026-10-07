import React, { useState, useEffect, useCallback, useRef } from "react";
import PickSelect from "../../components/PickSelect";
import api from "../../config/api";
import { T, fmtN, localYMD } from "../shared/tokens";
import { Pill, Stat, Panel, THead, AddBtn, FilterTabs } from "../shared/ui";
import { currentUser, canAny, canEntry } from "../../utils/perms";
import { t, Rich } from "../../i18n";
import { cld } from "../../utils/cloudinary";
import SearchSelect from "../../components/SearchSelect";
import { BackClose } from "../../utils/backNav";

// ── Kaun kya kar sakta hai (is tab ka apna — module independence) ──
// 3 Oct 2026 se Trip Tracking Roles & Access ki "Equipment" row se chalta hai
// (pehle Machinery). Niyam wahi jo server routes/trips.js lagata hai — button
// sirf use dikhe jo dabaa sake, warna 403:
//   Create  = naya route                   Edit = route badalna
//   Entry   = loading / unloading (mobile) + apni trip 10 min me cancel
//             + naya truck jodna (5 Oct 2026 se; transition me Create bhi)
//   Approve = review, manual close, doosre ki trip cancel — Admin / PM role se
//             hamesha, baaki ko Equipment ka Approve tick chahiye
//   Bill    = Finance ka Create (Finance ki row hi nahi = band)
//   Rate    = route ka rate, rate card, "Rate badlo" — 5 Oct 2026 se sirf
//             Finance ka Create (strict); Equipment Edit / approver ab nahi
// Asli rok server par hai; yahan sirf chhupana hai.
const TRIP_MOD = "Equipment";
const roleOf = (u) => String(u?.role || "").toLowerCase().replace(/[\s-]+/g, "_");
const isAdminU = (u) => ["admin", "super_admin"].includes(roleOf(u));
const eqRow = (u) => (u?.module_permissions || {})[TRIP_MOD];
// View/Create/Edit/Delete: purana niyam — row nahi to khula (Viewer sirf dekhe).
function canEq(action, u = currentUser()) {
  if (isAdminU(u)) return true;
  const row = eqRow(u);
  if (!row) return roleOf(u) !== "viewer" || action === "view";
  return !!row[action];
}
// Entry: purane cache wale user object me `entry` hota hi nahi (undefined) —
// agle permission refresh (≤60 s) tak button dikhao, faisla server kare.
function canTripEntry(u = currentUser()) {
  if (isAdminU(u)) return true;
  const row = eqRow(u);
  if (!row) return roleOf(u) !== "viewer";
  return row.entry === undefined ? true : !!row.entry;
}
function canApproveTrip(u = currentUser()) {
  if (["admin", "super_admin", "project_manager"].includes(roleOf(u))) return true;
  const row = eqRow(u);
  return !!row && row.approve === true;
}
// Route banana / badalna: Equipment Create / Edit ya Finance Create (office jo
// rate aur bill sambhalta hai — accountant). Server: routeCreateGate / routeEditGate.
function canRoute(action, u = currentUser()) {
  return canEq(action, u) || canBillTrips(u);
}
function canBillTrips(u = currentUser()) {
  return canAny("Finance", "create", { strict: true }, u);
}
// Bill dekhna (Bills ki list, gaadi ke bills) = Finance View (admin hamesha) — 7 Oct 2026.
// Bill banana ab yahan nahi, Machinery → Trips & Billing me (Finance Create).
function canSeeBills(u = currentUser()) {
  return canAny("Finance", "view", { strict: true }, u);
}
// Cancel: approver kisi ki bhi (remark ke saath); Entry wala sirf APNI raste
// wali trip, load ke 10 min ke andar. Ghadi ka thoda farak ho to server bata dega.
function canCancelTrip(trip, u = currentUser()) {
  if (canApproveTrip(u)) return true;
  if (!canTripEntry(u) || !trip || trip.status !== "in_transit") return false;
  if (trip.load_by == null || !trip.load_at) return true;
  if (Number(trip.load_by) !== Number(u?.id)) return false;
  const at = new Date(String(trip.load_at).replace(" ", "T"));
  if (isNaN(at.getTime())) return true;
  return (Date.now() - at.getTime()) / 60000 <= 10;
}

// "Rate badlo" (ek trip ka rate, 4 Oct 2026) — server ka overrideGate:
// 5 Oct 2026 se sirf Finance ka Create (strict). Approver / Equipment Edit nahi.
function canOverrideRate(u = currentUser()) {
  return canAny("Finance", "create", { strict: true }, u);
}
// Trip par "Rate badlo" kab: poori hui, bill me nahi, reject nahi, bill
// banne wali (fleet 'own' / mahina nahi) — server ka overrideBlock wahi.
// Billing = load ka billing_snap; purani trip (billing_snap khaali) par
// ownership se — Owned = 'own' (server ka tripBilling), warna 'trip'.
const tripBillingOf = (tr) => (["km", "trip", "monthly", "own", "pending"].includes(tr.billing_snap) ? tr.billing_snap
  : (String(tr.ownership || "").toLowerCase() === "owned" ? "own" : "trip"));
// Naya server har trip par bill_state bhejta hai — wahi pehle (own / monthly / billed… me nahi).
const canOverrideTrip = (tr) => {
  if (!tr || tr.status !== "completed" || tr.bill_id != null || tr.verify_status === "rejected") return false;
  if (tr.bill_state) return ["ready", "rate_pending", "flagged"].includes(tr.bill_state);
  return !["own", "monthly"].includes(tripBillingOf(tr));
};

// ════════════════════════════════════════════════════════════════
// TabTripTracking — web management view for the Trip Tracking module
// (truck trips load→unload; the camera/GPS punch itself lives in the
// mobile app). Manager surface: monitor + review flagged/stuck trips,
// manage routes (leads) + trucks, run reports, and bill vendors.
// ════════════════════════════════════════════════════════════════

const FLAG_META = {
  too_fast:         { get label() { return t("trip_tracking.too_fast"); },         tone: "red" },
  impossible_cycle: { get label() { return t("trip_tracking.impossible_cycle"); }, tone: "red" },
  plate_mismatch: { get label() { return t("trip_tracking.plate_mismatch"); }, tone: "red" },
  slip_vehicle_mismatch: { get label() { return t("trip_tracking.slip_vehicle_mismatch"); }, tone: "red" },
  slip_qty_mismatch: { get label() { return t("trip_tracking.slip_qty_mismatch"); }, tone: "red" },
  too_slow:         { get label() { return t("trip_tracking.too_slow"); },         tone: "amber" },
  gps_weak:         { get label() { return t("trip_tracking.gps_weak"); },         tone: "amber" },
  load_outside:     { get label() { return t("trip_tracking.load_outside"); },     tone: "amber" },
  unload_outside:   { get label() { return t("trip_tracking.unload_outside"); },   tone: "amber" },
  manual_close:     { get label() { return t("trip_tracking.manual_close"); },     tone: "amber" },
  // Route par point hai par phone ne location nahi bheji — pehle ye "bahar" dikhta tha.
  gps_missing:      { get label() { return t("trip_tracking.gps_missing"); },      tone: "amber" },
  // GPS se raaste ki km bharosemand nahi bani — route ki lead km lagi (3 Oct 2026).
  km_andaza:        { get label() { return t("trip_tracking.km_andaza"); },        tone: "amber" },
};
const flagMeta = (f) => FLAG_META[f] || { label: String(f || "").toUpperCase(), tone: "amber" };
const parseFlags = (raw) => { try { return Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []); } catch { return []; } };
// Unload ka delay reason app CODE me bhejta hai ("jam" / "jam: note") — label yahin.
const DELAY_CODES = ["truck_breakdown", "jam", "stuck", "other"];
const delayReasonLabel = (raw) => {
  const s = String(raw || "");
  const m = s.match(/^([a-z_]+)(?::\s*([\s\S]*))?$/);
  if (!m || !DELAY_CODES.includes(m[1])) return s;
  const lbl = t("trip_tracking.delay_" + m[1]);
  return m[2] ? lbl + ": " + m[2] : lbl;
};

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
// Rate card ke rate paise me bhi ho sakte hain (₹12.50) — wahan gol nahi karte.
const rs2 = (v) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtKm = (v) => (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// ── Gaadi ka bill kaise banta hai (3 Oct 2026) ──────────────────
// Server har gaadi ka "effective" trip_billing bhejta hai: km = vendor ka
// rate card, trip = route ka per-trip rate (purana tareeka), monthly =
// mahine ka kiraya (trip sirf record, bill nahi), own = apni gaadi,
// pending = "Rate baaki" (4 Oct 2026 — site par phone se judi gaadi, rate
// office tay karega; card lagne tak trip RATE PENDING).
// Trip par wahi load ke waqt billing_snap me jam jaata hai.
const BILLING = {
  km:      { get label() { return t("trip_tracking.bill_km"); },      get hint() { return t("trip_tracking.bill_km_hint"); },      c: T.ind, bg: T.indL },
  trip:    { get label() { return t("trip_tracking.bill_trip"); },    get hint() { return t("trip_tracking.bill_trip_hint"); },    c: T.blu, bg: T.bluL },
  monthly: { get label() { return t("trip_tracking.bill_monthly"); }, get hint() { return t("trip_tracking.bill_monthly_hint"); }, c: T.amb, bg: T.ambL },
  pending: { get label() { return t("trip_tracking.bill_pending"); }, get hint() { return t("trip_tracking.bill_pending_hint"); }, c: T.amb, bg: T.ambL },
  own:     { get label() { return t("trip_tracking.bill_own"); },     c: T.slt, bg: T.sltL },
};
// Truck form me chunne layak (own nahi — apni gaadi Machinery se aati hai).
const BILL_CHOICES = ["km", "trip", "monthly", "pending"];
// Km kahan se aayi — GPS (raaste par napi), Route km (GPS bharosemand nahi,
// lead km lagi — andaza), Manual (route ka naksha hi nahi), Badla gaya
// (approver ne review me badli).
const KM_SRC = {
  gps:    { get label() { return t("trip_tracking.km_src_gps"); },    c: T.grn, bg: T.grnL },
  route:  { get label() { return t("trip_tracking.km_src_route"); },  c: T.amb, bg: T.ambL },
  manual: { get label() { return t("trip_tracking.km_src_manual"); }, c: T.slt, bg: T.sltL },
  edited: { get label() { return t("trip_tracking.km_src_edited"); }, c: T.blu, bg: T.bluL },
};

// ── Km rate card ka ganit ───────────────────────────────────────
// Server ke utils/tripKm.js (amountForKm) jaisa hi — yahan sirf DIKHANE ke
// liye (card list ka "10 km = ₹", review me naya amount). Asli amount server
// banata hai; dono ka ganit alag hua to screen ka ₹ aur bill ka ₹ alag
// aayega. Contract ka udaharan dono jagah sach hona chahiye:
//   rates [100, 80, 70], aage 60, 10 km → Slab se ₹600, Jod kar ₹670.
// (Card ka editor ab Machinery → Trip vehicles → Rate card me — 4 Oct 2026.)
const r2 = (n) => Math.round(n * 100) / 100;
// i-th km ka rate (1 se ginti): slab me ho to uska, warna "isse aage" wala.
function rcRateAt(card, i) {
  const rates = card.rates || [];
  return Number(i <= rates.length ? rates[i - 1] : card.onward_rate) || 0;
}
// slab:       K ka slab (K ≤ slab rows → ceil(K) wala rate, warna aage wala) × K
// cumulative: har poore km ka apna rate jodo + bache hisse × agle km ka rate
function rcAmount(card, km) {
  const K = Number(km);
  if (!card || !Number.isFinite(K) || K <= 0) return 0;
  const n = (card.rates || []).length;
  if (card.method === "cumulative") {
    const whole = Math.floor(K);
    let sum = 0;
    for (let i = 1; i <= Math.min(whole, n); i++) sum += rcRateAt(card, i);
    sum += Math.max(0, whole - n) * (Number(card.onward_rate) || 0);
    const frac = K - whole;
    if (frac > 0) sum += frac * rcRateAt(card, whole + 1);
    return r2(sum);
  }
  return r2(rcRateAt(card, K <= n ? Math.ceil(K) : n + 1) * K);
}
// Server rates / rate_card_snap JSON text bhi bhej sakta hai, array bhi.
const parseRates = (v) => {
  try { const a = Array.isArray(v) ? v : JSON.parse(v || "[]"); return Array.isArray(a) ? a.map(Number) : []; }
  catch { return []; }
};
const parseCard = (raw) => {
  try {
    const c = raw && typeof raw === "object" ? raw : JSON.parse(raw || "null");
    return c && typeof c === "object" ? { ...c, rates: parseRates(c.rates) } : null;
  } catch { return null; }
};

// Trip ka "Rate badla" JSON (4 Oct 2026) — server object bhejta hai; purana
// TEXT bhi samajh lo.
const overrideOf = (tr) => {
  const v = tr && tr.rate_override;
  if (!v) return null;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return null; }
};
const fmtDT = (raw) => {
  if (!raw) return "—";
  const d = new Date(String(raw).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(raw).slice(0, 16);
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2) + ", " + fmtClock(raw);
};
const tripLabel = (tr) => (tr.registration_no || tr.truck_name || t("trip_tracking.truck")) + " #" + tr.trip_no;
const amtOrPending = (v) => (v == null ? t("trip_tracking.rate_pending") : rs(v));

const inp = { width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" };
const lblS = { fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 };

// ── Capacity (4 Oct 2026) ────────────────────────────────────────
// Trip gaadi ki capacity = number + unit (cft / cum / ton); server saath me
// "500 cft" text (capacity) bhi bhejta hai.
const CAP_UNITS = ["cft", "cum", "ton"];
// Khaana → { empty } (kuch nahi bhara) · { bad } · { ok, qty, unit }.
function capCheck(qty, unit) {
  const s = String(qty == null ? "" : qty).trim();
  if (!s && !unit) return { empty: true };
  const n = Number(s);
  if (!s || !Number.isFinite(n) || n <= 0 || !CAP_UNITS.includes(unit)) return { bad: true };
  return { ok: true, qty: n, unit };
}
function CapacityInput({ qty, unit, onQty, onUnit, bad }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input value={qty} inputMode="decimal" placeholder="500" onChange={e => onQty(e.target.value.replace(/[^0-9.]/g, ""))}
        style={{ ...inp, flex: 1, minWidth: 0, borderColor: bad ? T.red : T.b1 }} />
      <PickSelect value={unit} onChange={e => onUnit(e.target.value)} style={{ ...inp, width: 84, flexShrink: 0, borderColor: bad ? T.red : T.b1 }}>
        <option value="">{t("trip_tracking.cap_unit")}</option>
        {CAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </PickSelect>
    </div>
  );
}

// ── Naksha: doori (haversine) — lambai server nikalta hai, ye sirf dikhane ko ──
const segM = (a, b) => {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
};
const pathM = (pts) => { let m = 0; for (let i = 1; i < (pts || []).length; i++) m += segM(pts[i - 1], pts[i]); return m; };
// Expected time ka andaza: bhari gaadi haul road par ~20 km/h (mobile jaisa).
const SUGGEST_KMH = 20;

// ── Google Maps loader (is tab ka apna) ───────────────────────────
// Wahi REACT_APP_GOOGLE_MAPS_KEY jo Tenders / Site Mapping lete hain. Kisi aur
// module ne script pehle daal di ho to dobara nahi daalte, bas intezaar. Khud
// daalein to geometry+places ke saath — Tenders ko yahi chahiye, aur Google
// ek page par script do baar load hone par shikayat karta hai.
const MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;
let _tripGmaps = null;
function loadTripGmaps() {
  if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve(window.google);
  if (!MAPS_KEY) return Promise.reject(new Error("no key"));
  if (_tripGmaps) return _tripGmaps;
  _tripGmaps = new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      let n = 0;
      const iv = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) { clearInterval(iv); resolve(window.google); }
        else if (++n > 75) { clearInterval(iv); _tripGmaps = null; reject(new Error("maps timeout")); }
      }, 200);
      return;
    }
    const cb = "__gmapsTrip_" + Math.random().toString(36).slice(2);
    window[cb] = () => {
      try { delete window[cb]; } catch (_) { /* noop */ }
      if (window.google && window.google.maps) resolve(window.google);
      else { _tripGmaps = null; reject(new Error("maps missing")); }
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&callback=${cb}&libraries=geometry,places`;
    s.async = true; s.defer = true;
    s.onerror = () => { _tripGmaps = null; s.remove(); reject(new Error("maps load failed")); };
    document.head.appendChild(s);
  });
  return _tripGmaps;
}

function TabTripTracking({ projectId }) {
  const [sub, setSub] = useState("monitor");
  const [summary, setSummary] = useState(null);

  const loadSummary = useCallback(() => {
    if (!projectId) return;
    api.get("/trips/summary?project_id=" + projectId)
      .then(r => setSummary(r && r.success ? r.data : null)).catch(() => setSummary(null));
  }, [projectId]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Rate card aur bill ab yahan nahi — Machinery → Trips & Billing me (7 Oct 2026).
  return (
    <div style={{ padding: "16px 18px" }}>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat label={t("trip_tracking.trips_today")} value={summary ? summary.trips_today : "—"} note={t("trip_tracking.note_aaj_ki_trips")} color={T.blu} />
        <Stat label={t("common.in_transit")} value={summary ? summary.in_transit_count : "—"} note={t("trip_tracking.note_raste_me_abhi")} color={T.amb} />
        <Stat label={t("trip_tracking.flagged")} value={summary ? summary.flagged_count : "—"} note={t("trip_tracking.note_review_pending")} color={summary && summary.flagged_count ? T.red : T.slt} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <FilterTabs
          options={[
            { id: "monitor", label: t("trip_tracking.monitor") },
            { id: "routes",  label: t("trip_tracking.routes_leads") },
            { id: "trucks",  label: t("tripbill.pt_gaadi") },
            { id: "reports", label: t("common.reports") },
          ]}
          active={sub} onChange={setSub} />
      </div>

      {sub === "monitor"  && <MonitorTab projectId={projectId} onChange={loadSummary} />}
      {sub === "routes"   && <RoutesTab projectId={projectId} />}
      {sub === "trucks"   && <GaadiTab projectId={projectId} />}
      {sub === "reports"  && <ReportsTab projectId={projectId} />}
    </div>
  );
}

// ── MONITOR ──────────────────────────────────────────────────────
function MonitorTab({ projectId, onChange }) {
  // Monitor "Sab" par khulta hai (6 Oct 2026). Pehle "Flagged" par khulta tha —
  // review ke liye theek tha, par jab koi flagged trip na ho to poori screen
  // khaali dikhti thi aur lagta tha ki trip hai hi nahi (asli me approve /
  // reject hui trips list me baithi thi, bas doosre tab me).
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [notes, setNotes] = useState({});
  // Review par "Bill km" — trip id → likha hua (khaali = jo hai wahi rahe).
  const [billKm, setBillKm] = useState({});
  const [busyId, setBusyId] = useState(null);
  // "Rate badlo" (4 Oct 2026) — khuli trip aur save ke baad ki line.
  const [over, setOver] = useState(null);
  const [del, setDel] = useState(null);   // kaunsi trip hatani hai
  const [flash, setFlash] = useState("");
  // Trip kholne par naksha: route ka raasta + geofence — route ek hi baar laao.
  const [routesById, setRoutesById] = useState({});
  useEffect(() => {
    if (!projectId) return;
    api.get("/trips/routes?project_id=" + projectId)
      .then(r => {
        const m = {};
        (r && r.success && Array.isArray(r.data) ? r.data : []).forEach(x => { m[x.id] = x; });
        setRoutesById(m);
      })
      .catch(() => setRoutesById({}));
  }, [projectId]);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    let qs = "project_id=" + projectId;
    if (filter === "flagged") qs += "&verify_status=flagged&status=completed";
    else if (filter === "transit") qs += "&status=in_transit";
    else if (filter === "completed") qs += "&status=completed";
    api.get("/trips?" + qs)
      .then(r => setRows(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [projectId, filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (item, action) => {
    const note = (notes[item.id] || "").trim();
    if (action === "reject" && !note) { window.alert(t("trip_tracking.reject_ke_liye_note_zaroori_hai")); return; }
    const body = { action, note: note || null };
    // Bill km sirf tab bhejo jab approver ne sach me badli ho — server use
    // "Badla gaya" (edited) maan leta hai, bina badle bhejna source bigaad deta.
    if (action === "approve" && showBillKm(item) && billKm[item.id] != null && String(billKm[item.id]).trim() !== "") {
      const v = Number(billKm[item.id]);
      if (!Number.isFinite(v) || v < 0) { window.alert(t("trip_tracking.rv_bill_km_galat")); return; }
      if (item.km_billed == null || Math.abs(v - Number(item.km_billed)) > 0.001) body.km_billed = v;
    }
    setBusyId(item.id);
    const r = await api.post("/trips/" + item.id + "/review", body);
    setBusyId(null);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.action_fail")); return; }
    setOpenId(null); load(); onChange && onChange();
  };
  const stuckAct = async (item2, kind) => {
    const remark = (notes[item2.id] || "").trim();
    if (!remark) { window.alert(t("trip_tracking.remark_zaroori_hai")); return; }
    setBusyId(item2.id);
    const r = kind === "cancel"
      ? await api.post("/trips/" + item2.id + "/cancel", { remark })
      : await api.post("/trips/" + item2.id + "/manual-close", { remark });
    setBusyId(null);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.action_fail")); return; }
    setOpenId(null); load(); onChange && onChange();
  };

  // Km wali trip, ya jiski km andaze (route km) se lagi — approver bill km dekh / badal sake.
  const showBillKm = (it) => it.billing_snap === "km" || parseFlags(it.flag_reasons).includes("km_andaza");

  const verifyPill = (item3) => {
    const v = item3.verify_status;
    if (v === "auto_verified") return <Pill label={t("trip_tracking.auto_verified")} c={T.grn} bg={T.grnL} />;
    if (v === "approved")      return <Pill label={t("common.approved")} c={T.grn} bg={T.grnL} />;
    if (v === "flagged")       return <Pill label={t("trip_tracking.flagged")} c={T.red} bg={T.redL} />;
    if (v === "rejected")      return <Pill label={t("common.rejected")} c={T.red} bg={T.redL} />;
    return <Pill label={t("common.pending")} c={T.amb} bg={T.ambL} />;
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <FilterTabs
          options={[
            { id: "flagged", label: t("trip_tracking.flagged") },
            { id: "transit", label: t("trip_tracking.in_transit") },
            { id: "completed", label: t("common.completed") },
            { id: "all", label: t("common.all") },
          ]}
          active={filter} onChange={setFilter} />
      </div>

      {flash && <div style={{ border: `1px solid ${T.grn}44`, background: T.grnL, borderRadius: 8, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: T.grn, fontWeight: 600 }}>{flash}</div>}
      {over && (
        <RateOverrideModal trip={over} onClose={() => setOver(null)}
          onSaved={(saved, msg) => {
            setOver(null); setFlash(msg);
            // Server ki taaza row usi jagah (filter "completed" / "all" me dikhti rahe); na aaye to list dobara.
            if (saved) setRows((p) => p.map((x) => (x.id === saved.id ? saved : x))); else load();
            onChange && onChange();
          }} />
      )}
      {del && (
        <DeleteTripModal trip={del} onClose={() => setDel(null)}
          onDone={(msg) => { setDel(null); setFlash(msg); load(); onChange && onChange(); }} />
      )}
      <Panel>
        {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>{t("trip_tracking.loading_trips")}</div>}
        {!loading && rows.length === 0 && (
          <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>{t("trip_tracking.is_filter_me_koi_trip_nahi")}</div>
        )}
        {!loading && rows.length > 0 && (
          <>
            <THead cols="150px 1.3fr 1fr 90px 100px 1fr 40px"
              headers={[t("trip_tracking.hdr_truck_trip"), t("trip_tracking.hdr_route"), t("trip_tracking.hdr_loaded"), t("trip_tracking.hdr_travel"), t("trip_tracking.hdr_amount"), t("trip_tracking.hdr_status"), ""]} />
            {rows.map(item4 => {
              const flags = parseFlags(item4.flag_reasons);
              const open = openId === item4.id;
              return (
                <div key={item4.id} style={{ borderBottom: `1px solid ${T.b1}` }}>
                  <div onClick={() => setOpenId(open ? null : item4.id)}
                    style={{ display: "grid", gridTemplateColumns: "150px 1.3fr 1fr 90px 100px 1fr 40px",
                      padding: "10px 15px", alignItems: "center", gap: 6, cursor: "pointer", background: open ? T.surfaceB : "transparent" }}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{item4.registration_no || item4.truck_name || t("trip_tracking.truck")}</div>
                      <div style={{ fontSize: 10.5, color: T.t4 }}>#{item4.trip_no} · {fmtD(item4.trip_date)}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item4.route_name || "—"}</div>
                      {item4.task_name && <div style={{ fontSize: 10.5, color: T.t4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item4.task_name}</div>}
                    </div>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{fmtClock(item4.load_at)}</span>
                    <span style={{ fontSize: 11.5, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{item4.travel_min != null ? t("trip_tracking.n_min", { n: item4.travel_min }) : "—"}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>
                      {item4.billing_snap === "monthly" || item4.billing_snap === "own"
                        ? <span style={{ fontSize: 11, fontWeight: 600, color: T.t4 }}>{BILLING[item4.billing_snap].label}</span>
                        : (item4.amount != null ? rs(item4.amount) : "—")}
                      {item4.km_billed != null && <span style={{ display: "block", fontSize: 10.5, fontWeight: 500, color: T.t4 }}>{t("trip_tracking.n_km", { n: fmtKm(item4.km_billed) })}</span>}
                      {overrideOf(item4) && <span style={{ display: "block", marginTop: 2 }}><OverrideChip trip={item4} /></span>}
                    </span>
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>{verifyPill(item4)}
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
                      {MAPS_KEY && (item4.load_lat != null || item4.unload_lat != null || (routesById[item4.route_id] && routesById[item4.route_id].load_lat != null)) && (
                        <TripMiniMap key={item4.id + (routesById[item4.route_id] ? "-r" : "")} route={routesById[item4.route_id]} trip={item4} />
                      )}
                      {/* Naya server har trip par loading / unloading ki teen-teen photo
                          ke khane bhejta hai (bucket, slip, number plate). Purane par
                          sirf do the — tab pehle jaisa. */}
                      {"load_slip_photo_url" in item4 && (
                        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 10 }}>
                          <PhotoGroup title={t("trip_tracking.loading")} items={[
                            [t("trip_tracking.ph_bucket"), item4.load_photo_url],
                            [t("trip_tracking.ph_slip"), item4.load_slip_photo_url],
                            [t("trip_tracking.ph_plate"), item4.load_plate_photo_url],
                          ]} />
                          <PhotoGroup title={t("trip_tracking.unloading")} items={[
                            [t("trip_tracking.ph_bucket"), item4.unload_photo_url],
                            [t("trip_tracking.ph_plate"), item4.unload_plate_photo_url],
                            [t("trip_tracking.ph_sign_slip"), item4.unload_slip_photo_url],
                          ]} />
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        {!("load_slip_photo_url" in item4) && <PhotoThumb label={t("trip_tracking.load")} url={item4.load_photo_url} />}
                        {!("load_slip_photo_url" in item4) && <PhotoThumb label={t("trip_tracking.unload")} url={item4.unload_photo_url} />}
                        <div style={{ flex: 1, fontSize: 11.5, color: T.t2, lineHeight: 1.9 }}>
                          <TripLoadDetails trip={item4} />
                          <div><Rich k="trip_tracking.travel_t_t2" params={{ t: item4.travel_min != null ? t("trip_tracking.n_min", { n: item4.travel_min }) : "—", t2: item4.expected_travel_min != null ? t("trip_tracking.expected_pm", { exp: item4.expected_travel_min, tol: item4.tolerance_min || 0 }) : "" }} /></div>
                          <div>{t("trip_tracking.loaded_by_t_fmtclock", { t: item4.load_by_name || "—", fmtClock: fmtClock(item4.load_at) })}</div>
                          {/* Manual close hui trip me unload ka punch hota hi nahi — wahan
                              "Unloaded by: — ·" likhne se behtar hai wajah likhna. */}
                          {item4.unload_at
                            ? <div>{t("trip_tracking.unloaded_by_t_fmtclock", { t: item4.unload_by_name || "—", fmtClock: fmtClock(item4.unload_at) })}</div>
                            : item4.status === "completed" ? <div>{t("trip_tracking.unload_nahi")}</div> : null}
                          <div>{t("trip_tracking.vendor_t_rate_t2", { t: item4.vendor_name || "—", t2:
                            item4.billing_snap === "km" ? t("trip_tracking.rate_km_card")
                              : item4.billing_snap === "monthly" ? t("trip_tracking.rate_monthly")
                              : item4.billing_snap === "own" ? t("trip_tracking.rate_own")
                              : item4.rate_snap != null ? rs(item4.rate_snap) : t("trip_tracking.rate_pending") })}</div>
                          {item4.delay_reason && <div style={{ color: T.amb }}>{t("trip_tracking.delay_delay_reason", { delay_reason: delayReasonLabel(item4.delay_reason) })}</div>}
                          {item4.review_note && <div style={{ color: T.t3 }}>{t("trip_tracking.review_note_review_note", { review_note: item4.review_note })}</div>}
                          {/* Office ne is trip ka rate haath se badla (4 Oct 2026) — pehle → ab, note, kisne, kab. */}
                          {overrideOf(item4) && (
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <OverrideChip trip={item4} />
                              <span style={{ color: T.t3 }}>{overrideLine(overrideOf(item4))}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {(() => {
                        // Jo button server maanega wahi — koi na bache to remark ka dabba bhi nahi.
                        const approver = canApproveTrip();
                        const canReview = item4.verify_status === "flagged" && item4.status !== "in_transit" && approver;
                        const canCancel = item4.status === "in_transit" && canCancelTrip(item4);
                        const canClose = item4.status === "in_transit" && approver;
                        // "Rate badlo" — poori, bina-bill trip par, jiske paas haq ho (4 Oct 2026).
                        const canOver = canOverrideRate() && canOverrideTrip(item4);
                        // Trip hatana (6 Oct 2026): Equipment ka Delete, aur bill me
                        // ja chuki trip kabhi nahi — server bhi yahi rokta hai.
                        const canDel = canEq("delete") && item4.bill_id == null;
                        if (!canReview && !canCancel && !canClose) {
                          return (
                            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                              {item4.verify_status === "flagged" && item4.status !== "in_transit"
                                ? <span style={{ fontSize: 11.5, color: T.t4 }}>{t("trip_tracking.review_approver_karega")}</span> : <span />}
                              <div style={{ display: "flex", gap: 8 }}>
                                {canOver && <BtnOutline label={t("trip_tracking.ro_button")} color={T.ind} onClick={() => setOver(item4)} />}
                                {canDel && <BtnOutline label={t("trip_tracking.del_button")} color={T.red} onClick={() => setDel(item4)} />}
                              </div>
                            </div>
                          );
                        }
                        const kmBox = canReview && showBillKm(item4);
                        const kmVal = billKm[item4.id] != null ? billKm[item4.id] : (item4.km_billed != null ? String(item4.km_billed) : "");
                        const snap = item4.billing_snap === "km" ? parseCard(item4.rate_card_snap) : null;
                        const kmNum = kmVal !== "" && Number.isFinite(Number(kmVal)) ? Number(kmVal) : null;
                        return (
                          <div>
                            {kmBox && (
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>{t("trip_tracking.rv_bill_km")}</span>
                                <input value={kmVal} inputMode="decimal"
                                  onChange={e => { const v = e.target.value.replace(/[^0-9.]/g, ""); setBillKm(b => ({ ...b, [item4.id]: v })); }}
                                  style={{ ...inp, width: 110 }} />
                                {snap && kmNum != null && (
                                  <span style={{ fontSize: 12, color: T.t2 }}>{t("trip_tracking.rv_bill_km_amount", { amt: rs2(rcAmount(snap, kmNum)) })}</span>
                                )}
                                <span style={{ fontSize: 11, color: T.t4 }}>{t("trip_tracking.rv_bill_km_hint")}</span>
                                {/* "Rate badlo" ke baad paisa pakka — approve par km badle to bhi server paisa nahi badalta (override_kept). */}
                                {overrideOf(item4) && <span style={{ flexBasis: "100%", fontSize: 11, color: T.amb, fontWeight: 600 }}>{t("trip_tracking.rv_override_kept")}</span>}
                              </div>
                            )}
                            <input value={notes[item4.id] || ""} onChange={e => setNotes(n => ({ ...n, [item4.id]: e.target.value }))}
                              placeholder={item4.status === "in_transit" ? (canClose ? t("trip_tracking.remark_cancel_manual_close_ke_liye") : t("trip_tracking.remark_cancel_ke_liye")) : t("trip_tracking.note_reject_ke_liye_zaroori")}
                              style={{ ...inp, marginBottom: 8 }} />
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              {canOver && <BtnOutline label={t("trip_tracking.ro_button")} color={T.ind} busy={busyId === item4.id} onClick={() => setOver(item4)} />}
                              {canReview && (
                                <>
                                  <BtnOutline label={t("common.reject_2")} color={T.red} busy={busyId === item4.id} onClick={() => act(item4, "reject")} />
                                  <BtnSolid label={t("common.approve_2")} color={T.grn} busy={busyId === item4.id} onClick={() => act(item4, "approve")} />
                                </>
                              )}
                              {canCancel && <BtnOutline label={t("trip_tracking.cancel_trip")} color={T.red} busy={busyId === item4.id} onClick={() => stuckAct(item4, "cancel")} />}
                              {canClose && <BtnOutline label={t("trip_tracking.manual_close_2")} color={T.amb} busy={busyId === item4.id} onClick={() => stuckAct(item4, "close")} />}
                              {canDel && <BtnOutline label={t("trip_tracking.del_button")} color={T.red} onClick={() => setDel(item4)} />}
                            </div>
                          </div>
                        );
                      })()}
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
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.routes_leads_list", { list: list.length ? `(${list.length})` : "" })}</span>
        {canRoute("create") && <AddBtn label={t("trip_tracking.new_route")} onClick={() => setForm({})} />}
      </div>

      {form && <RouteForm projectId={projectId} tasks={tasks} route={form.id ? form : null}
        onCancel={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}

      {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>{t("common.loading_2")}</div>}
      {!loading && list.length === 0 && !form && (
        <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>{canRoute("create") ? t("trip_tracking.abhi_koi_route_nahi_new_route") : t("trip_tracking.abhi_koi_route_nahi")}</div>
      )}
      {!loading && list.length > 0 && (
        <>
          <THead cols="1.8fr 100px 110px 90px 70px" headers={[t("trip_tracking.hdr_route"), t("trip_tracking.hdr_lead_km"), t("trip_tracking.hdr_exp_time"), t("trip_tracking.hdr_status"), ""]} />
          {list.map(r => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1.8fr 100px 110px 90px 70px",
              padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>
                  {r.name}
                  {Array.isArray(r.route_geometry) && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: T.grn }}>{t("trip_tracking.naksha_tag")}</span>}
                </div>
                {r.default_task_name && <div style={{ fontSize: 10.5, color: T.t4 }}>{r.default_task_name}</div>}
                {/* Route par ab rate nahi (4 Oct 2026) — paisa gaadi ke rate card se.
                    Purana rate sirf bina card wali Per trip gaadi par lagta hai. */}
                {r.rate_per_trip != null && <div style={{ fontSize: 10.5, color: T.t4 }}>{t("trip_tracking.purana_rate_route", { rate: rs(r.rate_per_trip) })}</div>}
              </div>
              <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{r.lead_km != null ? r.lead_km : "—"}</span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{r.expected_travel_min != null ? t("trip_tracking.n_min", { n: r.expected_travel_min }) : "—"}</span>
              <span>{r.is_active ? <Pill label={t("common.active")} c={T.grn} bg={T.grnL} /> : <Pill label={t("subcon.inactive")} c={T.t3} bg={T.sltL} />}</span>
              {canRoute("edit") ? <button onClick={() => setForm(r)} type="button" style={{ justifySelf: "end", fontSize: 11.5, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("common.edit_2")}</button> : <span />}
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
    expected_travel_min: route?.expected_travel_min != null ? String(route.expected_travel_min) : "",
    tolerance_min: route?.tolerance_min != null ? String(route.tolerance_min) : "10",
    expected_cycle_min: route?.expected_cycle_min != null ? String(route.expected_cycle_min) : "",
    load_lat: route?.load_lat ?? "", load_lng: route?.load_lng ?? "",
    unload_lat: route?.unload_lat ?? "", unload_lng: route?.unload_lng ?? "",
    load_radius: route?.load_radius || 100,
    default_task_id: route?.default_task_id || "",
    material_id: route?.material_id || null,
    material_name: route?.material_name || "",
  });
  const [saving, setSaving] = useState(false);
  // Route ka material (5 Oct 2026) — Library se; app ke loading form me pehle se bhara.
  const [mats, setMats] = useState([]);
  useEffect(() => {
    api.get("/library/materials").then(r => setMats(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setMats([]));
  }, []);
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const numf = (v) => (v !== "" && v != null && !isNaN(parseFloat(v)) ? parseFloat(v) : null);

  // ── Naksha ── pts user ke kheenche kram me; startIs = pehla point Loading
  // hai ya Unloading — user khud chunta hai, system andaza nahi lagata.
  // Server ko HAMESHA loading → unloading (canon). geoTouched = is baar
  // naksha chheda; tabhi bhejte hain, warna server par jo hai wahi rehta hai.
  const hasGeo = Array.isArray(route?.route_geometry) && route.route_geometry.length >= 2;
  const [pts, setPts] = useState(hasGeo ? route.route_geometry : []);
  const [startIs, setStartIs] = useState(hasGeo ? "load" : null);
  const [showMap, setShowMap] = useState(hasGeo);
  const [geoTouched, setGeoTouched] = useState(false);
  // Lead / expected time naksha ki lambai ke saath chalte hain — jab tak user
  // haath se na likhe (contract ka lead naksha se alag ho sakta hai).
  const [leadAuto, setLeadAuto] = useState(!!(route && route.route_len_m != null && route.lead_km != null &&
    Math.abs(Number(route.lead_km) - Number(route.route_len_m) / 1000) < 0.006));
  const [expAuto, setExpAuto] = useState(false);
  const geoMode = pts.length >= 2;
  const canon = geoMode && startIs ? (startIs === "load" ? pts : [...pts].reverse()) : null;
  const mapKm = geoMode ? Math.round(pathM(pts) / 10) / 100 : null;
  const leadNum = numf(f.lead_km);
  const leadPct = mapKm > 0 && leadNum != null ? ((leadNum - mapKm) / mapKm) * 100 : null;

  const onPts = (np) => {
    setPts(np); setGeoTouched(true);
    if (!np.length) { setStartIs(null); return; }
    if (np.length < 2) return;
    const km = Math.round(pathM(np) / 10) / 100;
    const fillLead = leadAuto || !f.lead_km;
    const fillExp = expAuto || !f.expected_travel_min;
    setF(p => ({ ...p,
      ...(fillLead ? { lead_km: String(km) } : {}),
      ...(fillExp ? { expected_travel_min: String(Math.max(1, Math.round((km / SUGGEST_KMH) * 60))) } : {}),
    }));
    if (fillLead) setLeadAuto(true);
    if (fillExp) setExpAuto(true);
  };
  const removeGeo = () => {
    if (pts.length && !window.confirm(t("trip_tracking.raasta_hatao_confirm"))) return;
    // Naksha ke sire lat/lng khanon me utaar do — point bache rahein.
    if (canon) {
      const a = canon[0], b = canon[canon.length - 1];
      setF(p => ({ ...p, load_lat: a.lat, load_lng: a.lng, unload_lat: b.lat, unload_lng: b.lng }));
    }
    setPts([]); setStartIs(null); setShowMap(false); setLeadAuto(false); setExpAuto(false);
    setGeoTouched(hasGeo || geoTouched);
  };
  // Purane route (bina naksha) ke point — naksha par halke nishaan.
  const refPts = !hasGeo && (numf(f.load_lat) != null || numf(f.unload_lat) != null) ? {
    load: numf(f.load_lat) != null && numf(f.load_lng) != null ? { lat: numf(f.load_lat), lng: numf(f.load_lng) } : null,
    unload: numf(f.unload_lat) != null && numf(f.unload_lng) != null ? { lat: numf(f.unload_lat), lng: numf(f.unload_lng) } : null,
  } : null;

  const save = async () => {
    if (!f.name.trim()) { window.alert(t("trip_tracking.route_ka_naam_daalein")); return; }
    if (pts.length === 1) { window.alert(t("trip_tracking.kam_se_kam_2_point")); return; }
    if (geoMode && !startIs) { window.alert(t("trip_tracking.pehle_batao")); return; }
    if (numf(f.lead_km) == null) { window.alert(t("trip_tracking.lead_km_bharein")); return; }
    setSaving(true);
    const a = canon ? canon[0] : null, b = canon ? canon[canon.length - 1] : null;
    const body = {
      project_id: projectId, name: f.name.trim(),
      default_task_id: f.default_task_id || null,
      material_id: f.material_id || null,
      material_name: f.material_name || null,
      load_lat: a ? a.lat : numf(f.load_lat), load_lng: a ? a.lng : numf(f.load_lng),
      unload_lat: b ? b.lat : numf(f.unload_lat), unload_lng: b ? b.lng : numf(f.unload_lng),
      load_radius: f.load_radius, unload_radius: f.load_radius,
      // Route par rate nahi (4 Oct 2026) — rate_per_trip bheja hi nahi, to
      // purane route ka rate jaisa tha waisa rehta hai (server PUT sirf aaye khaane badalta hai).
      lead_km: numf(f.lead_km),
      expected_travel_min: numf(f.expected_travel_min) != null ? Math.round(numf(f.expected_travel_min)) : null,
      tolerance_min: numf(f.tolerance_min) != null ? Math.round(numf(f.tolerance_min)) : 10,
      expected_cycle_min: numf(f.expected_cycle_min) != null ? Math.round(numf(f.expected_cycle_min)) : null,
      // null = naksha hatao. Server loading/unloading point aur seedhi doori
      // naksha ke siron se khud bharta hai.
      ...(geoTouched ? { route_geometry: canon, route_source: canon ? "draw" : null } : {}),
    };
    let r;
    if (route) {
      r = await api.put("/trips/routes/" + route.id, body);
    } else {
      r = await api.post("/trips/routes", body);
    }
    setSaving(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.save_fail")); return; }
    onSaved();
  };

  return (
    <div style={{ padding: "14px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{route ? t("trip_tracking.edit_route") : t("trip_tracking.new_route")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <div><div style={lblS}>{t("trip_tracking.route_name")}</div><input value={f.name} onChange={e => upd("name", e.target.value)} placeholder={t("trip_tracking.quarry_site_a")} style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.lead_km")} <span style={{ color: T.t4, fontWeight: 400 }}>{t("trip_tracking.haul_road")}</span></div><input value={f.lead_km} onChange={e => { upd("lead_km", e.target.value.replace(/[^0-9.]/g, "")); setLeadAuto(false); }} placeholder="0" style={inp} /></div>
      </div>
      {/* Route sirf jagah aur samay hai (4 Oct 2026) — paisa gaadi ke rate card se. */}
      {route && route.rate_per_trip != null && (
        <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{t("trip_tracking.purana_rate_route", { rate: rs(route.rate_per_trip) })}</div>
      )}
      {mapKm != null && (
        leadPct != null && Math.abs(leadPct) > 5
          ? <div style={{ fontSize: 11, color: T.amb, fontWeight: 700, marginTop: 5 }}>{t("trip_tracking.lead_farak", { map: mapKm.toFixed(2), lead: leadNum, pct: (leadPct > 0 ? "+" : "") + Math.round(leadPct) })}</div>
          : <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{t("trip_tracking.lead_naksha_km", { map: mapKm.toFixed(2) })}</div>
      )}

      {/* Naksha par raasta — dono sire user khud Loading/Unloading mark karta hai */}
      <div style={{ marginTop: 10 }}>
        {showMap ? (
          <RouteMapEditor pts={pts} onPts={onPts} startIs={startIs}
            onStartIs={(v) => { setStartIs(v); setGeoTouched(true); }}
            refPts={refPts} km={mapKm} onRemove={removeGeo} />
        ) : (
          <button type="button" onClick={() => setShowMap(true)}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 8, border: `1.5px dashed ${T.blu}`, background: T.surface,
              cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.blu }}>🗺 {t("trip_tracking.naksha_par_raasta_banao")}</span>
            <span style={{ fontSize: 11, color: T.t4 }}>{t("trip_tracking.naksha_hint_short")}</span>
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
        <div><div style={lblS}>{t("trip_tracking.expected_time_min")}</div><input value={f.expected_travel_min} onChange={e => { upd("expected_travel_min", e.target.value.replace(/[^0-9]/g, "")); setExpAuto(false); }} placeholder="0" style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.tolerance_min")}</div><input value={f.tolerance_min} onChange={e => upd("tolerance_min", e.target.value.replace(/[^0-9]/g, ""))} placeholder="10" style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.cycle_time_min")}</div><input value={f.expected_cycle_min} onChange={e => upd("expected_cycle_min", e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.geofence_radius_m")}</div>
          <PickSelect value={f.load_radius} onChange={e => upd("load_radius", Number(e.target.value))} style={inp}>
            {[50, 100, 150, 200].map(rd => <option key={rd} value={rd}>{rd} m</option>)}
          </PickSelect>
        </div>
      </div>
      {expAuto && <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{t("trip_tracking.exp_andaza", { kmh: SUGGEST_KMH })}</div>}
      {geoMode ? (
        // Naksha ho to point usi ke siron se — yahan badalne ka matlab naksha
        // aur point alag ho jaana, isliye khane band.
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          {[["a", t("trip_tracking.load_lat"), canon && canon[0].lat], ["b", t("trip_tracking.load_lng"), canon && canon[0].lng],
            ["c", t("trip_tracking.unload_lat"), canon && canon[canon.length - 1].lat],
            ["d", t("trip_tracking.unload_lng"), canon && canon[canon.length - 1].lng]].map(([k, lbl, v]) => (
            <div key={k}><div style={lblS}>{lbl}</div>
              <input value={v != null ? Number(v).toFixed(6) : ""} readOnly disabled placeholder="—" style={{ ...inp, background: T.surfaceB, color: T.t3 }} /></div>
          ))}
          <div style={{ gridColumn: "1 / -1", fontSize: 10.5, color: T.t4, marginTop: -4 }}>{t("trip_tracking.points_naksha_se")}</div>
        </div>
      ) : (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
        <div><div style={lblS}>{t("trip_tracking.load_lat")}</div><input value={f.load_lat} onChange={e => upd("load_lat", e.target.value)} placeholder={t("trip_tracking.21_2xxxx")} style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.load_lng")}</div><input value={f.load_lng} onChange={e => upd("load_lng", e.target.value)} placeholder={t("trip_tracking.81_6xxxx")} style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.unload_lat")}</div><input value={f.unload_lat} onChange={e => upd("unload_lat", e.target.value)} placeholder={t("trip_tracking.21_2xxxx")} style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.unload_lng")}</div><input value={f.unload_lng} onChange={e => upd("unload_lng", e.target.value)} placeholder={t("trip_tracking.81_6xxxx")} style={inp} /></div>
      </div>
      )}
      <div style={{ marginTop: 10 }}>
        <div style={lblS}>{t("trip_tracking.route_material")}</div>
        <SearchSelect value={f.material_id || ""} options={mats.map(m => ({ id: m.id, name: m.name + (m.unit ? " (" + m.unit + ")" : "") }))}
          onChange={(id) => { const m = mats.find(x => String(x.id) === String(id)); setF(p => ({ ...p, material_id: m ? m.id : null, material_name: m ? m.name : "" })); }}
          placeholder={t("trip_tracking.route_material_ph")} />
        <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{t("trip_tracking.route_material_hint")}</div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={lblS}>{t("trip_tracking.default_task_optional")}</div>
        <PickSelect value={f.default_task_id || ""} onChange={e => upd("default_task_id", e.target.value ? Number(e.target.value) : "")} style={inp}>
          <option value="">{t("boq_import_wizard.none")}</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.name || t.title}</option>)}
        </PickSelect>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        <button onClick={onCancel} type="button" style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
        <button onClick={save} disabled={saving} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: saving ? T.b1 : T.blu, color: saving ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{saving ? t("common.saving_2") : (route ? t("trip_tracking.update_route") : t("trip_tracking.save_route"))}</button>
      </div>
    </div>
  );
}

// ── TRUCKS ───────────────────────────────────────────────────────
// Vendor-wise (3 Oct 2026): har vendor ki gaadiyan ek saath, aur har gaadi
// ka bill kaise banta hai (Km rate / Per trip / Mahina). Nayi gaadi par
// vendor aur billing dono zaroori — bina vendor ke trip ka bill kisi ke naam
// nahi banta. Apni gaadi yahan nahi banti, wo Machinery → Fleet se aati hai.
// 4 Oct 2026: "Apni gaadi" = poori Machinery fleet (?own=1 — Dumper / JCB
// bhi), har gaadi ki capacity aur rate card, aur upar ek khoj (number /
// vendor / capacity) + capacity ki chhanni. Trip gaadi ki capacity zaroori.
// Rate office tay karega (4 Oct 2026): phone se judi gaadi "Rate baaki" —
// upar amber "Rate tay karna baaki" aur note ki card Machinery me lagta hai.
const truckVendorId = (r) => (r.vendor_id != null ? r.vendor_id : (r.default_vendor_id != null ? r.default_vendor_id : null));

// ── GAADI (project ki gaadi, vendor-wise) ─────────────────────────
// 7 Oct 2026: is project ki trip wali gaadiyan vendor-wise (GET /trips/office/
// vendors + /vendors/:id/vehicles, project_id ke saath) — vendor dabao to
// gaadiyan, gaadi ka number dabao to Vehicle page (is project ki trips).
// Nayi gaadi = Equipment Entry; Edit = Equipment Edit (sirf trip gaadi).
// Rate card / bill yahan nahi — Machinery → Trips & Billing.
function GaadiTab({ projectId }) {
  const init = istRange();
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [q, setQ] = useState("");
  const [rk, setRk] = useState(0);
  const [page, setPage] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState(null); // null | {} nayi | truck (edit)
  const loadTrucks = useCallback(() => {
    api.get("/trips/trucks").then(r => setTrucks(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setTrucks([]));
  }, []);
  useEffect(() => {
    loadTrucks();
    api.get("/finance/parties").then(r => setParties(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setParties([]));
  }, [loadTrucks]);
  const showBills = canSeeBills();
  const newApi = trucks.some(r => r && "trip_billing" in r);
  const fltS = { ...inp, width: "auto", padding: "7px 10px", fontSize: 12 };
  return (
    <Panel>
      <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("tripbill.pt_gaadi_title")}</span>
        {/* Naya truck = Equipment ki Entry (ya Create) — server ka POST /trips/trucks (5 Oct 2026) */}
        {canEntry("Equipment") && <AddBtn label={t("trip_tracking.add_truck")} onClick={() => setForm(f => (f && !f.id ? null : {}))} />}
      </div>
      {form && <TruckForm key={form.id || "new"} truck={form.id ? form : null} parties={parties}
        onCancel={() => setForm(null)} onSaved={() => { setForm(null); loadTrucks(); setRk(k => k + 1); }} />}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 15px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t("common.from")}</span>
        <input type="date" value={from} max={to} onChange={e => e.target.value && setFrom(e.target.value)} style={{ ...fltS, padding: "5px 8px" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t("common.to")}</span>
        <input type="date" value={to} min={from} onChange={e => e.target.value && setTo(e.target.value)} style={{ ...fltS, padding: "5px 8px" }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("trip_tracking.gaadi_khoj_ph")}
          style={{ ...fltS, flex: 1, minWidth: 200, borderColor: q ? T.ind : T.b1 }} />
        {q && <MiniBtn onClick={() => setQ("")}>{t("common.clear")}</MiniBtn>}
      </div>
      <div style={{ padding: "12px 15px" }}>
        <TbVendorVehicles projectId={projectId} from={from} to={to} q={q} reloadKey={rk}
          emptyHint={t("tripbill.pt_gaadi_empty")}
          onVehicle={v => setPage({ vehicle: v })}
          vehicleExtra={v => {
            const tr = !v.is_fleet ? trucks.find(x => x.id === v.id) : null;
            return tr && newApi && canEq("edit")
              ? <button onClick={() => setForm(tr)} type="button" style={{ fontSize: 11.5, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("common.edit_2")}</button>
              : null;
          }} />
      </div>
      {page && (
        <TbVehiclePage key={page.vehicle.id} vehicle={page.vehicle} projectId={projectId} from={from} to={to} showBills={showBills}
          onClose={() => setPage(null)} onChanged={() => setRk(k => k + 1)} />
      )}
    </Panel>
  );
}

function TruckForm({ truck, parties, onCancel, onSaved }) {
  const editing = !!(truck && truck.id);
  const [reg, setReg] = useState(truck ? truck.registration_no || "" : "");
  const [vendorId, setVendorId] = useState(truck && truckVendorId(truck) != null ? truckVendorId(truck) : "");
  // Nayi gaadi par billing khaali — km aur per-trip ka farak paisa badalta hai, aadmi khud chune.
  const [billing, setBilling] = useState(truck && BILL_CHOICES.includes(truck.trip_billing) ? truck.trip_billing : "");
  const [capQty, setCapQty] = useState(truck && truck.capacity_qty != null ? String(Number(truck.capacity_qty)) : "");
  const [capUnit, setCapUnit] = useState(truck && truck.capacity_unit ? truck.capacity_unit : "");
  const [driver, setDriver] = useState("");
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const cap = capCheck(capQty, capUnit);

  const save = async () => {
    setTried(true);
    if (!reg.trim()) { window.alert(t("trip_tracking.registration_number_daalein")); return; }
    if (!vendorId) { window.alert(t("trip_tracking.vendor_select_karo")); return; }
    if (!billing) { window.alert(t("trip_tracking.billing_select_karo")); return; }
    // Capacity zaroori (4 Oct 2026) — rate card isi se gaadi chunta hai.
    if (!cap.ok) { window.alert(t("trip_tracking.cap_zaroori")); return; }
    setSaving(true);
    const body = { registration_no: reg.trim(), vendor_id: Number(vendorId), trip_billing: billing,
      capacity_qty: cap.qty, capacity_unit: cap.unit };
    const r = editing
      ? await api.put("/trips/trucks/" + truck.id, body)
      // default_vendor_id + ownership purane server ke liye (wo vendor_id /
      // trip_billing padhta hi nahi) — deploy ke beech bhi gaadi sahi vendor par bane.
      : await api.post("/trips/trucks", { ...body, default_vendor_id: Number(vendorId), ownership: "rented", ...(driver.trim() ? { driver_name: driver.trim() } : {}) });
    setSaving(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.truck_save_fail")); return; }
    // Billing / vendor badalne se card gaadi ke tareeke / vendor ka nahi raha — server ne hata diya.
    if (r.data && r.data.rate_card_cleared) window.alert(t("trip_tracking.card_hat_gaya"));
    onSaved();
  };

  return (
    <div style={{ padding: "12px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 10 }}>{editing ? t("trip_tracking.edit_truck") : t("trip_tracking.add_truck")}</div>
      <div style={{ display: "grid", gridTemplateColumns: editing ? "1.1fr 1.4fr 1.1fr 1.2fr" : "1.1fr 1.4fr 1.1fr 1.2fr 1.1fr", gap: 10, alignItems: "end" }}>
        <div><div style={lblS}>{t("trip_tracking.registration_no")}</div><input value={reg} onChange={e => setReg(e.target.value)} placeholder={t("trip_tracking.cg04_ab_1234")} style={inp} /></div>
        <div><div style={lblS}>{t("trip_tracking.vendor_req")}</div>
          <PickSelect value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : "")} style={inp}>
            <option value="">{t("trip_tracking.vendor_chuniye")}</option>{parties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </PickSelect>
        </div>
        <div><div style={lblS}>{t("trip_tracking.billing_type")}</div>
          <PickSelect value={billing} onChange={e => setBilling(e.target.value)} style={inp}>
            <option value="">{t("trip_tracking.billing_select")}</option>
            {BILL_CHOICES.map(k => <option key={k} value={k}>{BILLING[k].label}</option>)}
          </PickSelect>
        </div>
        <div><div style={lblS}>{t("trip_tracking.capacity_req")}</div>
          <CapacityInput qty={capQty} unit={capUnit} onQty={setCapQty} onUnit={setCapUnit} bad={tried && !cap.ok} />
        </div>
        {!editing && (
          <div><div style={lblS}>{t("trip_tracking.driver_optional")}</div><input value={driver} onChange={e => setDriver(e.target.value)} maxLength={80} style={inp} /></div>
        )}
      </div>
      {editing && truck.capacity && truck.capacity_qty == null && (
        <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{t("trip_tracking.cap_purana_likha", { text: truck.capacity })}</div>
      )}
      {billing && <div style={{ fontSize: 11.5, color: T.t2, marginTop: 7 }}>{BILLING[billing].hint}</div>}
      <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("trip_tracking.apni_gaadi_fleet_se")}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <button onClick={onCancel} type="button" style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
        <button onClick={save} disabled={saving} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: saving ? T.b1 : T.blu, color: saving ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{saving ? t("common.saving_2") : (editing ? t("common.update") : t("common.add"))}</button>
      </div>
    </div>
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

  const nameOf = (r) => kind === "vendor" ? (r.vendor_name || "—") : kind === "task" ? (r.task_name || "—") : (r.registration_no || r.truck_name || t("trip_tracking.truck"));

  return (
    <div>
      {/* Bill ab Machinery → Trips & Billing me trip tick karke banta hai (7 Oct 2026). */}
      <div style={{ border: `1px solid ${T.b1}`, background: T.surfaceB, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: T.t2, fontWeight: 600 }}>
        {t("tripbill.pt_bill_note")}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 12, flexWrap: "wrap" }}>
        <FilterTabs options={[{ id: "truck", label: t("trip_tracking.by_truck") }, { id: "vendor", label: t("trip_tracking.by_vendor") }, { id: "task", label: t("trip_tracking.by_task") }]} active={kind} onChange={setKind} />
        <div><div style={lblS}>{t("common.from")}</div><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, width: 150 }} /></div>
        <div><div style={lblS}>{t("common.to")}</div><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, width: 150 }} /></div>
      </div>
      <Panel>
        {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>{t("common.loading_2")}</div>}
        {!loading && rows.length === 0 && <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>{t("trip_tracking.is_range_me_koi_verified_trip")}</div>}
        {!loading && rows.length > 0 && (
          <>
            <THead cols="1.6fr 90px 110px 130px 1.2fr" headers={[t("trip_tracking.hdr_name"), t("trip_tracking.hdr_trips"), t("trip_tracking.hdr_total_km"), t("trip_tracking.hdr_amount"), t("trip_tracking.hdr_hired_owned")]} />
            {rows.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 90px 110px 130px 1.2fr", padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{nameOf(r)}</span>
                <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{r.trips || 0}</span>
                <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{fmtN(Number(r.total_km) || 0)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{rs(r.total_amount)}
                  {Number(r.rate_pending_trips) > 0 && <span style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: T.amb }}>{t("trip_tracking.n_rate_pending", { n: Number(r.rate_pending_trips) })}</span>}
                </span>
                <span style={{ fontSize: 11, color: T.t3 }}>{t("trip_tracking.hired_r_rs_owned_r2_rs2", { r: r.hired_trips || 0, rs: rs(r.hired_amount), r2: r.owned_trips || 0, rs2: rs(r.owned_amount) })}</span>
              </div>
            ))}
          </>
        )}
      </Panel>
    </div>
  );
}

// ── NAKSHA: route ka raasta banao ────────────────────────────────
// Editable polyline hi sach hai (uska MVCArray path). Click = naya point,
// point kheencho = khiskao, lakeer ke beech ka gola kheencho = beech me
// naya point, point par right-click = hatao. Har badlaav path se padh kar
// upar bhejte hain — React state se path kabhi dobara nahi likhte (purane
// Tenders map me yahi galti thi: kheencha hua point wapas kood jaata tha).
function RouteMapEditor({ pts, onPts, startIs, onStartIs, refPts, km, onRemove }) {
  const boxRef = useRef(null);
  const m = useRef(null);
  const onPtsRef = useRef(onPts);
  onPtsRef.current = onPts;
  const initPts = useRef(pts);       // sirf pehli baar ke liye
  const initRef = useRef(refPts);
  const [state, setState] = useState("loading");
  const [mapType, setMapType] = useState("hybrid");

  useEffect(() => {
    let dead = false;
    loadTripGmaps().then((g) => {
      if (dead || !boxRef.current) return;
      const map = new g.maps.Map(boxRef.current, {
        center: { lat: 21.25, lng: 81.63 }, zoom: 11, mapTypeId: "hybrid",
        streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false,
      });
      const init = initPts.current || [];
      // Satellite par peela raasta sabse saaf dikhta hai.
      const line = new g.maps.Polyline({ map, editable: true, strokeColor: "#FFC400", strokeWeight: 4, zIndex: 10,
        path: init.map((p) => new g.maps.LatLng(p.lat, p.lng)) });
      const path = line.getPath();
      // mute: "Saaf karo" har point par alag remove_at bhejta hai — beech ki
      // adhoori lambai lead km me na chipke, isliye tab chup, ant me ek baar.
      const sync = () => {
        if (m.current && m.current.mute) return;
        onPtsRef.current(path.getArray().map((ll) => ({ lat: ll.lat(), lng: ll.lng() })));
      };
      path.addListener("insert_at", sync);
      path.addListener("set_at", sync);
      path.addListener("remove_at", sync);
      map.addListener("click", (e) => { if (e.latLng) path.push(e.latLng); });
      line.addListener("contextmenu", (e) => { if (e.vertex != null) path.removeAt(e.vertex); });
      const endMk = () => new g.maps.Marker({ map, visible: false, clickable: false, zIndex: 50 });
      m.current = { g, map, path, aMk: endMk(), bMk: endMk() };

      // Purane route ke point (naksha nahi tha) — halke nishaan.
      const rp = initRef.current;
      if (!init.length && rp) {
        const ref = (p, txt) => p && new g.maps.Marker({ map, position: p, clickable: false, zIndex: 20, opacity: 0.75,
          label: { text: txt, color: "#fff", fontSize: "10px", fontWeight: "700" },
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: txt === "L" ? T.grn : T.red, fillOpacity: 0.55, strokeColor: "#fff", strokeWeight: 1.5 } });
        ref(rp.load, "L"); ref(rp.unload, "U");
      }
      const b = new g.maps.LatLngBounds();
      let n = 0;
      init.forEach((p) => { b.extend(p); n++; });
      if (!n && rp) { [rp.load, rp.unload].forEach((p) => { if (p) { b.extend(p); n++; } }); }
      if (n >= 2) map.fitBounds(b, 40);
      else if (n === 1) { map.setCenter(b.getCenter()); map.setZoom(16); }
      setState("ready");
    }).catch(() => { if (!dead) setState("fail"); });
    return () => { dead = true; };
  }, []);

  // Dono sire: chunav se pehle A/B, phir L (hara) / U (laal).
  useEffect(() => {
    const mm = m.current;
    if (!mm) return;
    const lab = (isA) => (!startIs ? (isA ? "A" : "B") : (isA === (startIs === "load") ? "L" : "U"));
    const col = (x) => (x === "L" ? T.grn : x === "U" ? T.red : "#607D8B");
    const setMk = (mk, p, txt) => {
      if (!p) { mk.setVisible(false); return; }
      mk.setPosition(p);
      mk.setIcon({ path: mm.g.maps.SymbolPath.CIRCLE, scale: 11, fillColor: col(txt), fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 });
      mk.setLabel({ text: txt, color: "#fff", fontSize: "11px", fontWeight: "800" });
      mk.setVisible(true);
    };
    setMk(mm.aMk, pts[0], lab(true));
    setMk(mm.bMk, pts.length >= 2 ? pts[pts.length - 1] : null, lab(false));
  }, [pts, startIs, state]);

  useEffect(() => { if (m.current) m.current.map.setMapTypeId(mapType); }, [mapType]);

  const undo = () => { const mm = m.current; if (mm && mm.path.getLength()) mm.path.pop(); };
  const clear = () => {
    const mm = m.current;
    if (!mm || !mm.path.getLength() || !window.confirm(t("trip_tracking.saaf_confirm"))) return;
    mm.mute = true;
    mm.path.clear();
    mm.mute = false;
    onPtsRef.current([]);
  };

  return (
    <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden", background: T.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{t("trip_tracking.naksha_km", { km: (km || 0).toFixed(2) })}</span>
        <span style={{ fontSize: 11, color: T.t4 }}>{t("trip_tracking.n_point", { n: pts.length })}</span>
        <span style={{ flex: 1 }} />
        <MiniBtn onClick={undo} disabled={!pts.length}>↶ {t("trip_tracking.undo")}</MiniBtn>
        <MiniBtn onClick={clear} disabled={!pts.length}>{t("trip_tracking.saaf_karo")}</MiniBtn>
        <MiniBtn onClick={() => setMapType((v) => (v === "hybrid" ? "roadmap" : "hybrid"))}>{mapType === "hybrid" ? t("trip_tracking.road") : t("trip_tracking.satellite")}</MiniBtn>
        <MiniBtn danger onClick={onRemove}>{t("trip_tracking.raasta_hatao")}</MiniBtn>
      </div>
      <div style={{ position: "relative", height: 380 }}>
        <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />
        {state !== "ready" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            textAlign: "center", fontSize: 12.5, color: T.t3, background: T.surfaceB }}>
            {state === "fail" ? t("trip_tracking.naksha_nahi_khula") : t("common.loading_2")}
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px", borderTop: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        background: pts.length && !startIs ? T.ambL : T.surface }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: T.t2 }}>{t("trip_tracking.pehla_point_kya_hai")}</span>
        <SegBtn on={startIs === "load"} color={T.grn} disabled={!pts.length} onClick={() => onStartIs("load")}>L · {t("trip_tracking.loading")}</SegBtn>
        <SegBtn on={startIs === "unload"} color={T.red} disabled={!pts.length} onClick={() => onStartIs("unload")}>U · {t("trip_tracking.unloading")}</SegBtn>
        {startIs && pts.length >= 2 && (
          <MiniBtn onClick={() => onStartIs(startIs === "load" ? "unload" : "load")}>⇄ {t("trip_tracking.ulta_karo")}</MiniBtn>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color: T.t4 }}>{t("trip_tracking.naksha_hint_web")}</span>
      </div>
    </div>
  );
}

// ── NAKSHA: trip kholne par — route ka raasta, geofence ghera, asli punch ──
// L/U pin = asli punch; hara = ghere ke andar, laal = bahar (flag wahi batata hai).
function TripMiniMap({ route, trip }) {
  const boxRef = useRef(null);
  const dataRef = useRef({ route, trip });
  const [state, setState] = useState("loading");

  useEffect(() => {
    let dead = false;
    loadTripGmaps().then((g) => {
      if (dead || !boxRef.current) return;
      const r = dataRef.current.route || {}, tr = dataRef.current.trip || {};
      const map = new g.maps.Map(boxRef.current, {
        center: { lat: 21.25, lng: 81.63 }, zoom: 12, mapTypeId: "hybrid", gestureHandling: "cooperative",
        streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false,
      });
      const P = (lat, lng) => (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
        ? { lat: Number(lat), lng: Number(lng) } : null);
      const b = new g.maps.LatLngBounds();
      let n = 0;
      const add = (p) => { if (p) { b.extend(p); n++; } };
      const rl = P(r.load_lat, r.load_lng), ru = P(r.unload_lat, r.unload_lng);
      const geo = Array.isArray(r.route_geometry) && r.route_geometry.length >= 2 ? r.route_geometry : null;
      if (geo) {
        new g.maps.Polyline({ map, path: geo, strokeColor: "#FFC400", strokeWeight: 4, clickable: false });
        geo.forEach(add);
      } else if (rl && ru) {
        // Naksha nahi bana — sirf seedhi tooti lakeer, andaze ke liye.
        new g.maps.Polyline({ map, path: [rl, ru], strokeOpacity: 0, clickable: false,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: "#FFC400", scale: 3 }, offset: "0", repeat: "12px" }] });
      }
      const fence = (p, rad) => p && new g.maps.Circle({ map, center: p, radius: Number(rad) || 100, clickable: false,
        strokeColor: "#42A5F5", strokeOpacity: 0.95, strokeWeight: 1.5, fillColor: "#42A5F5", fillOpacity: 0.12 });
      fence(rl, r.load_radius); fence(ru, r.unload_radius);
      add(rl); add(ru);
      const flags = parseFlags(tr.flag_reasons);
      const pin = (p, txt, bad) => p && new g.maps.Marker({ map, position: p, zIndex: 50, clickable: false,
        label: { text: txt, color: "#fff", fontSize: "11px", fontWeight: "800" },
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 10, fillColor: bad ? T.red : T.grn, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
      const tl = P(tr.load_lat, tr.load_lng), tu = P(tr.unload_lat, tr.unload_lng);
      pin(tl, "L", flags.includes("load_outside"));
      pin(tu, "U", flags.includes("unload_outside"));
      add(tl); add(tu);
      if (n >= 2) map.fitBounds(b, 30);
      else if (n === 1) { map.setCenter(b.getCenter()); map.setZoom(16); }
      setState("ready");
    }).catch(() => { if (!dead) setState("fail"); });
    return () => { dead = true; };
  }, []);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ position: "relative", height: 220, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.b1}` }}>
        <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />
        {state !== "ready" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: T.t3, background: T.surfaceB, padding: 16, textAlign: "center" }}>
            {state === "fail" ? t("trip_tracking.naksha_nahi_khula") : t("common.loading_2")}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{t("trip_tracking.mini_legend")}</div>
    </div>
  );
}

function MiniBtn({ onClick, disabled, danger, children }) {
  const c = danger ? T.red : T.t2;
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${danger ? T.redL : T.b1}`, background: T.surface,
        color: disabled ? T.t4 : c, fontSize: 11.5, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}
function SegBtn({ on, color, disabled, onClick, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${on ? color : T.b1}`, background: on ? color : T.surface,
        color: on ? "white" : (disabled ? T.t4 : T.t2), fontSize: 11.5, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

// ── small bits ───────────────────────────────────────────────────
function PhotoThumb({ label, url, w = 120 }) {
  const h = Math.round(w * 0.75);
  return (
    <div style={{ width: w }}>
      <div style={{ fontSize: 9.5, color: T.t4, fontWeight: 700, marginBottom: 3, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      {url ? (
        <img src={cld(url, "thumb")} alt={label} onClick={() => window.open(url, "_blank")}
          style={{ width: w, height: h, objectFit: "cover", borderRadius: 7, cursor: "pointer", border: `1px solid ${T.b1}` }} />
      ) : (
        <div style={{ width: w, height: h, borderRadius: 7, border: `1px dashed ${T.b1}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.t4, fontSize: 10.5 }}>{t("trip_tracking.no_photo")}</div>
      )}
    </div>
  );
}
// Loading / Unloading ki teen-teen photo (Photo Policy: bucket, slip, number plate).
function PhotoGroup({ title, items }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.t2, marginBottom: 4 }}>{title}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {items.map(([label, url]) => <PhotoThumb key={label} label={label} url={url} w={96} />)}
      </div>
    </div>
  );
}
// Loading par bhari details (3 Oct 2026): party, material, driver, maatra,
// slip no.; aur km — napi (GPS / route) aur bill wali, saath me km kahan se
// aayi. Jo khana khaali hai wo chhupa — purani trip par kuch nahi badalta.
function TripLoadDetails({ trip }) {
  const l1 = [];
  if (trip.party_name) l1.push(t("trip_tracking.d_party", { v: trip.party_name }));
  if (trip.material_name) l1.push(t("trip_tracking.d_material", { v: trip.material_name }));
  const l2 = [];
  if (trip.driver_name) l2.push(t("trip_tracking.d_driver", { v: trip.driver_name }));
  if (trip.qty != null) l2.push(t("trip_tracking.d_qty", { v: fmtKm(trip.qty) + (trip.qty_unit ? " " + trip.qty_unit : "") }));
  if (trip.challan_no) l2.push(t("trip_tracking.d_slip", { v: trip.challan_no }));
  const hasKm = trip.km_actual != null || trip.km_billed != null;
  const src = KM_SRC[trip.km_source];
  const bill = BILLING[trip.billing_snap];
  return (
    <>
      {l1.length > 0 && <div>{l1.join(" · ")}</div>}
      {l2.length > 0 && <div>{l2.join(" · ")}</div>}
      {(hasKm || bill) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {hasKm && <span>{t("trip_tracking.d_km", { napi: trip.km_actual != null ? fmtKm(trip.km_actual) : "—", bill: trip.km_billed != null ? fmtKm(trip.km_billed) : "—" })}</span>}
          {src && <Pill label={src.label} c={src.c} bg={src.bg} />}
          {bill && <Pill label={bill.label} c={bill.c} bg={bill.bg} />}
        </div>
      )}
    </>
  );
}
// ── "Rate badlo" — ek trip ka rate (4 Oct 2026) ──────────────────
// Prafull (pakka): card badalne se sirf aage ki trip badalti hai; bani hui
// trip ka paisa yahin, trip-wise, note ke saath. Server POST
// /trips/:id/rate-override { amount, km_billed?, note } — sirf ye trip
// badalti hai. (Machinery → Trip vehicles me bhi yahi — apni copy, module
// independence.)
const overrideLine = (o) => t("trip_tracking.ro_tip", { from: amtOrPending(o.from_amount), to: rs(o.to_amount), note: o.note || "—", by: o.by_name || "—", at: fmtDT(o.at) });
function OverrideChip({ trip }) {
  const o = overrideOf(trip);
  if (!o) return null;
  return <span title={overrideLine(o)} style={{ display: "inline-flex", cursor: "help" }}><Pill label={t("trip_tracking.ro_chip")} c={T.blu} bg={T.bluL} /></span>;
}
function RateOverrideModal({ trip, onClose, onSaved }) {
  // Km trip: billing_snap, ya (trip ki detail se aaye to) us waqt ke card ki copy me km slab.
  const snap = parseCard(trip.rate_card_snap);
  const isKm = trip.billing_snap === "km" || (!!snap && (snap.kind === "km" || (snap.kind !== "trip" && parseRates(snap.rates).length > 0)));
  const [amount, setAmount] = useState(trip.amount != null ? String(Number(trip.amount)) : "");
  const [km, setKm] = useState(trip.km_billed != null ? String(Number(trip.km_billed)) : "");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const numOk = (v) => v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;
  const err = !numOk(amount) ? t("trip_tracking.ro_err_amount")
    : note.trim().length < 3 ? t("trip_tracking.ro_err_note")
    : isKm && km !== "" && !numOk(km) ? t("trip_tracking.ro_err_km") : null;
  const save = async () => {
    setTried(true);
    if (err) return;
    setBusy(true);
    const body = { amount: Number(amount), note: note.trim() };
    // Km sirf tab jab sach me badla — warna server km_source 'edited' likh deta.
    if (isKm && km !== "" && (trip.km_billed == null || Math.abs(Number(km) - Number(trip.km_billed)) > 0.001)) body.km_billed = Number(km);
    const r = await api.post("/trips/" + trip.id + "/rate-override", body);
    setBusy(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.action_fail")); return; }
    onSaved((r.data && r.data.trip) || null, t("trip_tracking.ro_saved", { trip: tripLabel(trip), from: amtOrPending(trip.amount), to: rs(Number(amount)) }));
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: 480, maxWidth: "94vw", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", padding: "16px 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.ro_title", { trip: tripLabel(trip) })}</div>
        <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
          {t("trip_tracking.ro_abhi_line", { amt: amtOrPending(trip.amount), km: trip.km_billed != null ? fmtKm(trip.km_billed) : "—", card: (snap && snap.name) || t("trip_tracking.ro_card_nahi") })}
        </div>
        <div style={{ fontSize: 12, color: T.t2, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, padding: "8px 11px", margin: "12px 0" }}>{t("trip_tracking.ro_hint")}</div>
        <div style={{ display: "grid", gridTemplateColumns: isKm ? "1fr 1fr" : "1fr", gap: 10 }}>
          <div><div style={lblS}>{t("trip_tracking.ro_new_amount")}</div>
            <input value={amount} inputMode="decimal" autoFocus onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              style={{ ...inp, fontVariantNumeric: "tabular-nums", borderColor: tried && !numOk(amount) ? T.red : T.b1 }} /></div>
          {isKm && (
            <div><div style={lblS}>{t("trip_tracking.ro_bill_km")}</div>
              <input value={km} inputMode="decimal" onChange={(e) => setKm(e.target.value.replace(/[^0-9.]/g, ""))}
                style={{ ...inp, fontVariantNumeric: "tabular-nums", borderColor: tried && km !== "" && !numOk(km) ? T.red : T.b1 }} />
              <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{t("trip_tracking.ro_bill_km_hint")}</div></div>
          )}
        </div>
        <div style={{ marginTop: 10 }}><div style={lblS}>{t("trip_tracking.ro_note")}</div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("trip_tracking.ro_note_ph")}
            style={{ ...inp, borderColor: tried && note.trim().length < 3 ? T.red : T.b1 }} /></div>
        {tried && err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <BtnOutline label={t("common.cancel")} color={T.t3} onClick={onClose} />
          <BtnSolid label={busy ? t("common.saving") : t("common.save")} color={T.ind} busy={busy} onClick={save} />
        </div>
      </div>
    </div>
  );
}
// ── Trip hatao ──────────────────────────────────────────────────
// Trip hatane ka koi raasta tha hi nahi (sirf cancel / reject, jisme row
// list me bani rehti thi). Gaadi "hatao" karne par bhi uski trips bani
// rehti hain — isliye log samajhte the ki trip delete ho gayi aur phone par
// wahi trip dikhti rehti thi. Server: DELETE /trips/:id (Equipment Delete +
// wajah + poori row audit me; bill wali trip nahi hatti).
function DeleteTripModal({ trip, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const bad = reason.trim().length < 3;
  const go = async () => {
    setTried(true);
    if (bad) return;
    setBusy(true);
    const r = await api.del("/trips/" + trip.id, { reason: reason.trim() });
    setBusy(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.action_fail")); return; }
    onDone(t("trip_tracking.del_done", { trip: tripLabel(trip) }));
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: 440, maxWidth: "94vw", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", padding: "16px 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.del_title", { trip: tripLabel(trip) })}</div>
        <div style={{ fontSize: 12, color: T.t2, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, padding: "8px 11px", margin: "12px 0" }}>
          {t("trip_tracking.del_hint")}
        </div>
        <div style={lblS}>{t("trip_tracking.del_reason")}</div>
        <input value={reason} autoFocus onChange={(e) => setReason(e.target.value)}
          placeholder={t("trip_tracking.del_reason_ph")}
          style={{ ...inp, borderColor: tried && bad ? T.red : T.b1 }} />
        {tried && bad && <div style={{ fontSize: 11.5, color: T.red, marginTop: 5 }}>{t("trip_tracking.del_reason_min")}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <BtnOutline label={t("common.cancel")} color={T.t3} onClick={onClose} />
          <BtnSolid label={busy ? t("trip_tracking.del_busy") : t("trip_tracking.del_confirm")} color={T.red} busy={busy} onClick={go} />
        </div>
      </div>
    </div>
  );
}
function BtnOutline({ label, color, busy, onClick }) {
  return <button onClick={onClick} disabled={busy} type="button" style={{ padding: "8px 16px", borderRadius: 7, border: `1.5px solid ${color}`, background: T.surface, color, fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{label}</button>;
}
function BtnSolid({ label, color, busy, onClick }) {
  return <button onClick={onClick} disabled={busy} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: color, color: "white", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{label}</button>;
}

// ════════════════════════════════════════════════════════════════
// TRIP BILLING v2 — office screens (7 Oct 2026)
//
// Server: GET /trips/office/*, /trips/:id/detail, /trips/bills*. Trip ka
// "bill_state" server nikalta hai (in_transit · cancelled · rejected ·
// flagged · own · monthly · rate_pending · ready · billed) — screen sirf
// dikhati hai, khud kuch tay nahi karti.
// Ye hissa (Tb…) har module me apni alag copy hai — module independence:
// koi shared component nahi. Paisa (amount) jise Finance VIEW nahi usko
// server null bhejta hai — null "—" dikhta hai, ₹0 nahi.
// ════════════════════════════════════════════════════════════════
const TB_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const tbParse = (raw) => {
  if (!raw) return null;
  const s = String(raw);
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00" : s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
};
const tbDate = (raw) => {
  const d = tbParse(raw);
  return d ? d.getDate() + " " + TB_MON[d.getMonth()] + " " + String(d.getFullYear()).slice(2) : (raw ? String(raw).slice(0, 10) : "—");
};
const tbDT = (raw) => {
  const d = tbParse(raw);
  if (!d) return "—";
  let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return tbDate(raw) + ", " + h + ":" + String(m).padStart(2, "0") + " " + ap;
};
const tbYmd = (raw) => { const d = tbParse(raw); return d ? d.toLocaleDateString("en-CA") : ""; };
const tbToday = () => new Date().toLocaleDateString("en-CA");
const tbMoney = (v) => (v == null || v === "" ? "—" : "₹" + (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const tbNum = (v) => (v == null || v === "" ? "—" : (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
// Naye endpoint ka jawab { success, data } ya seedha body — dono chalte hain.
const tbBody = (r) => (r && r.success !== false ? (r.data !== undefined ? r.data : r) : null);
const tbEsc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const tbFlags = (v) => { try { const a = Array.isArray(v) ? v : (v ? JSON.parse(v) : []); return Array.isArray(a) ? a : []; } catch { return []; } };
const tbLbl = { fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 };

function TbPill({ label, c, bg }) {
  return <span style={{ display: "inline-block", background: bg, color: c, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, border: `1px solid ${c}33`, whiteSpace: "nowrap" }}>{label}</span>;
}
// Bill ka haal: unpaid (normal) · partial · paid; due nikal gayi aur paid nahi = laal.
function TbBillStatus({ status, due }) {
  const over = !!due && status !== "paid" && tbYmd(due) !== "" && tbYmd(due) < tbToday();
  const m = status === "paid" ? { l: t("tripbill.bs_paid"), c: T.grn, bg: T.grnL }
    : status === "partial" ? { l: t("tripbill.bs_partial"), c: T.amb, bg: T.ambL }
    : { l: t("tripbill.bs_unpaid"), c: T.slt, bg: T.sltL };
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
      <TbPill label={m.l} c={m.c} bg={m.bg} />
      {over && <TbPill label={t("tripbill.bs_overdue")} c={T.red} bg={T.redL} />}
    </span>
  );
}

function TbModal({ title, sub, width = 760, onClose, footer, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <BackClose onClose={onClose} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "96vw", maxHeight: "92vh", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1 }}>{title}</div>
            {sub && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} type="button" aria-label={t("common.close")} style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: "4px 9px", cursor: "pointer", fontSize: 16, lineHeight: 1, color: T.t3 }}>×</button>
        </div>
        <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "11px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
}
const tbBtn = (primary) => ({ padding: "7px 14px", borderRadius: 8, border: primary ? "none" : `1.5px solid ${T.b1}`, background: primary ? T.ind : T.surface,
  color: primary ? "#fff" : T.t2, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" });

// Photo bade size me — kahin bhi click par band.
function TbZoom({ photo, onClose }) {
  if (!photo || !photo.url) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, cursor: "zoom-out" }}>
      <img src={cld(photo.url, "view")} alt={photo.label || ""} style={{ maxWidth: "96vw", maxHeight: "82vh", objectFit: "contain", borderRadius: 8 }} />
      {photo.label && <div style={{ color: "#fff", fontSize: 12.5, marginTop: 10, fontWeight: 600 }}>{photo.label}</div>}
      <a href={photo.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "#C7D2FE", fontSize: 11.5, marginTop: 6 }}>{t("tripbill.open_original")}</a>
    </div>
  );
}
function TbThumb({ url, label, size = 34, onZoom }) {
  if (!url) return <span style={{ width: size, height: size, borderRadius: 6, border: `1px dashed ${T.b1}`, display: "inline-block" }} />;
  return (
    <img src={cld(url, "thumb")} alt={label || ""} title={label || ""}
      onClick={onZoom ? (e) => { e.stopPropagation(); onZoom({ url, label }); } : undefined}
      style={{ width: size, height: size, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}`, cursor: onZoom ? "zoom-in" : "inherit", display: "block" }} />
  );
}

// Bill ka print — naya window, browser ka print.
function tbPrint(title, body) {
  const w = window.open("", "_blank");
  if (!w) { window.alert(t("tripbill.print_blocked")); return; }
  w.document.write(`<html><head><title>${tbEsc(title)}</title><style>
    *{font-family:Arial,sans-serif;font-size:12px;margin:0;padding:0}
    body{padding:22px;color:#111827}h2{font-size:17px;margin-bottom:4px}p{color:#4B5563;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#EEEDFB;color:#3B369E;padding:7px 9px;text-align:left;border:1px solid #D1D5DB;font-size:10.5px;text-transform:uppercase;letter-spacing:.4px}
    td{padding:6px 9px;border:1px solid #E5E7EB;vertical-align:top}.r{text-align:right}h3{font-size:13px;margin-top:16px}
    .tot td{font-weight:700;background:#F8F9FB}
  </style></head><body>${body}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

// ── Trip ka bill_state chip ─────────────────────────────────────────
const tbStateMeta = (s) => ({
  in_transit:   { l: t("tripbill.st_in_transit"),   c: T.amb, bg: T.ambL },
  cancelled:    { l: t("tripbill.st_cancelled"),    c: T.t3,  bg: T.sltL },
  rejected:     { l: t("tripbill.st_rejected"),     c: T.red, bg: T.redL },
  flagged:      { l: t("tripbill.st_flagged"),      c: T.red, bg: T.redL },
  own:          { l: t("tripbill.st_own"),          c: T.t3,  bg: T.sltL },
  monthly:      { l: t("tripbill.st_monthly"),      c: T.t3,  bg: T.sltL },
  rate_pending: { l: t("tripbill.st_rate_pending"), c: T.amb, bg: T.ambL },
  ready:        { l: t("tripbill.st_ready"),        c: T.ind, bg: T.indL },
  billed:       { l: t("tripbill.st_billed"),       c: T.grn, bg: T.grnL },
}[s] || null);
function TbChip({ trip }) {
  const m = tbStateMeta(trip.bill_state);
  if (!m) return null;
  return <TbPill c={m.c} bg={m.bg} label={trip.bill_state === "billed" && trip.bill_no ? t("tripbill.st_billed_no", { no: trip.bill_no }) : m.l} />;
}
// Flag ka naam: purane Trip Tracking wale keys (trip_tracking.<flag>); na mile to flag ka code.
const tbFlagLabel = (f) => { const k = "trip_tracking." + f; const v = t(k); return v === k ? String(f || "").toUpperCase() : v; };
const tbVerifyLabel = (v) => (v === "auto_verified" ? t("trip_tracking.auto_verified") : v === "approved" ? t("common.approved")
  : v === "flagged" ? t("trip_tracking.flagged") : v === "rejected" ? t("common.rejected") : t("common.pending"));
// Photo ka naam: key se (load_/unload_ + bucket / slip / plate); na pehchane to server ka label.
function tbPhotoLabel(p) {
  const k = String(p.key || "").toLowerCase();
  const un = k.includes("unload");
  const kind = k.includes("plate") ? t("trip_tracking.ph_plate")
    : (k.includes("sign") || (un && k.includes("slip"))) ? t("trip_tracking.ph_sign_slip")
    : k.includes("slip") ? t("trip_tracking.ph_slip")
    : k.includes("bucket") ? t("trip_tracking.ph_bucket") : "";
  if (!kind) { const lk = p.label_key ? t(p.label_key) : ""; return lk && lk !== p.label_key ? lk : String(p.key || ""); }
  return (un ? t("trip_tracking.unloading") : t("trip_tracking.loading")) + " — " + kind;
}
// Slip / plate se padhi hui cheezein — jo mili wahi, ek line me.
function tbReadLines(reads) {
  if (!reads || typeof reads !== "object") return [];
  const out = [];
  Object.keys(reads).forEach((k) => {
    const v = reads[k];
    if (!v || typeof v !== "object") return;
    const bits = [];
    if (v.vehicle_no) bits.push(t("tripbill.rd_vehicle", { v: v.vehicle_no }));
    if (v.challan_no) bits.push(t("tripbill.rd_challan", { v: v.challan_no }));
    if (v.material) bits.push(t("tripbill.rd_material", { v: v.material }));
    if (v.qty != null && v.qty !== "") bits.push(t("tripbill.rd_qty", { v: v.qty + (v.qty_unit ? " " + v.qty_unit : "") }));
    if (!bits.length) return;
    const kk = k.toLowerCase();
    const name = (kk.includes("unload") ? t("trip_tracking.unloading") : kk.includes("load") ? t("trip_tracking.loading") : "")
      + (kk.includes("plate") ? " " + t("trip_tracking.ph_plate") : kk.includes("slip") ? " " + t("trip_tracking.ph_slip") : "");
    out.push([name.trim() || k, bits.join(" · ")]);
  });
  return out;
}

// ── Trip ki poori detail (GET /trips/:id/detail) ────────────────────
// Saari photo bade, flag + review ki ek line ("Flagged: … · Approved: naam,
// tareekh (note)"), km, ₹, bill. Rate badlo / bill kholna caller deta hai.
function TbTripDetail({ id, onClose, onOverride, onBill }) {
  const [st, setSt] = useState({ loading: true });
  const [zoom, setZoom] = useState(null);
  useEffect(() => {
    let alive = true;
    setSt({ loading: true });
    api.get(`/trips/${id}/detail`).then((r) => {
      if (!alive) return;
      const d = tbBody(r);
      setSt(d && typeof d === "object" && d.id != null ? { d } : { err: (r && r.message) || t("tripbill.load_fail") });
    }).catch(() => { if (alive) setSt({ err: t("tripbill.load_fail") }); });
    return () => { alive = false; };
  }, [id]);
  const d = st.d;
  const flags = d ? tbFlags(d.flag_reasons) : [];
  const reviewed = d && d.review_by_name && (d.verify_status === "approved" || d.verify_status === "rejected");
  const reviewLine = d ? [
    flags.length ? t("tripbill.d_flagged", { reasons: flags.map(tbFlagLabel).join(", ") }) : "",
    reviewed ? t(d.verify_status === "approved" ? "tripbill.d_approved_by" : "tripbill.d_rejected_by", { name: d.review_by_name, date: tbDate(d.review_at) }) + (d.review_note ? " (" + d.review_note + ")" : "")
      : d.verify_status === "flagged" ? t("tripbill.d_review_baaki") : "",
  ].filter(Boolean).join(" · ") : "";
  const photos = d && Array.isArray(d.photos) ? d.photos.filter((p) => p && p.url) : [];
  const reads = d ? tbReadLines(d.reads) : [];
  const fld = (k, v) => (v == null || v === "" ? null : (
    <div key={k} style={{ minWidth: 0 }}>
      <div style={tbLbl}>{k}</div>
      <div style={{ fontSize: 12.5, color: T.t1, fontWeight: 600, wordBreak: "break-word" }}>{v}</div>
    </div>
  ));
  const srcL = d && d.km_source ? ({ gps: t("trip_tracking.km_src_gps"), route: t("trip_tracking.km_src_route"), manual: t("trip_tracking.km_src_manual"), edited: t("trip_tracking.km_src_edited") }[d.km_source] || d.km_source) : "";
  const o = d && d.rate_override ? (typeof d.rate_override === "object" ? d.rate_override : (() => { try { return JSON.parse(d.rate_override); } catch { return null; } })()) : null;
  const title = d ? (d.registration_no || d.vehicle_name || "") + " #" + d.trip_no : "…";
  return (
    <>
      <TbModal width={840} onClose={onClose} title={t("tripbill.td_title", { trip: title })}
        sub={d ? [tbDate(d.trip_date), d.project_name, d.route_name].filter(Boolean).join(" · ") : ""}
        footer={<>
          {d && onOverride && <button type="button" onClick={() => onOverride(d)} style={tbBtn(false)}>{t("tripbill.rate_badlo")}</button>}
          <button type="button" onClick={onClose} style={tbBtn(false)}>{t("common.close")}</button>
        </>}>
        {st.loading && <div style={{ textAlign: "center", padding: 30, color: T.t4, fontSize: 12.5 }}>{t("common.loading_2")}</div>}
        {st.err && <div style={{ border: `1px solid ${T.red}33`, background: T.redL, color: T.red, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600 }}>{st.err}</div>}
        {d && (
          <>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <TbChip trip={d} />
              <TbPill label={tbVerifyLabel(d.verify_status)} c={d.verify_status === "flagged" || d.verify_status === "rejected" ? T.red : d.verify_status === "pending" ? T.amb : T.grn}
                bg={d.verify_status === "flagged" || d.verify_status === "rejected" ? T.redL : d.verify_status === "pending" ? T.ambL : T.grnL} />
              {o && <span title={t("trip_tracking.ro_tip", { from: o.from_amount == null ? t("trip_tracking.rate_pending") : tbMoney(o.from_amount), to: tbMoney(o.to_amount), note: o.note || "—", by: o.by_name || "—", at: tbDT(o.at) })}
                style={{ cursor: "help" }}><TbPill label={t("trip_tracking.ro_chip")} c={T.blu} bg={T.bluL} /></span>}
            </div>
            {reviewLine && (
              <div style={{ border: `1px solid ${d.verify_status === "approved" ? T.b1 : T.red + "33"}`, background: d.verify_status === "approved" ? T.surfaceB : T.redL, color: T.t1, borderRadius: 8, padding: "8px 11px", marginBottom: 12, fontSize: 12, lineHeight: 1.55 }}>{reviewLine}</div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "12px 16px", marginBottom: 14 }}>
              {fld(t("common.vendor"), d.vendor_name)}
              {fld(t("tripbill.td_vehicle"), [d.registration_no, d.vehicle_name && d.vehicle_name !== d.registration_no ? d.vehicle_name : ""].filter(Boolean).join(" · "))}
              {fld(t("tripbill.td_material"), [d.material_name, d.qty != null ? tbNum(d.qty) + (d.qty_unit ? " " + d.qty_unit : "") : ""].filter(Boolean).join(" · "))}
              {fld(t("tripbill.td_challan"), d.challan_no)}
              {fld(t("tripbill.td_party"), d.party_name)}
              {fld(t("tripbill.td_driver"), d.driver_name)}
              {fld(t("tripbill.td_load"), d.load_at ? tbDT(d.load_at) + (d.load_by_name ? " · " + d.load_by_name : "") : "")}
              {fld(t("tripbill.td_unload"), d.unload_at ? tbDT(d.unload_at) + (d.unload_by_name ? " · " + d.unload_by_name : "") : (d.status === "completed" ? t("trip_tracking.unload_nahi") : ""))}
              {fld(t("tripbill.td_km"), d.km_actual != null || d.km_billed != null ? t("tripbill.td_km_val", { actual: d.km_actual != null ? tbNum(d.km_actual) : "—", bill: d.km_billed != null ? tbNum(d.km_billed) : "—" }) + (srcL ? " · " + srcL : "") : "")}
              {fld(t("tripbill.td_amount"), tbMoney(d.amount))}
              {d.bill_no && (
                <div style={{ minWidth: 0 }}>
                  <div style={tbLbl}>{t("tripbill.td_bill")}</div>
                  {onBill && d.bill_id != null
                    ? <button type="button" onClick={() => onBill(d.bill_id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: T.ind, textDecoration: "underline" }}>{d.bill_no}</button>
                    : <div style={{ fontSize: 12.5, color: T.t1, fontWeight: 600 }}>{d.bill_no}</div>}
                </div>
              )}
            </div>
            {reads.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={tbLbl}>{t("tripbill.td_reads")}</div>
                {reads.map(([k, v], i) => <div key={i} style={{ fontSize: 12, color: T.t2, lineHeight: 1.6 }}><b>{k}</b>: {v}</div>)}
              </div>
            )}
            <div style={tbLbl}>{t("tripbill.td_photos")}</div>
            {photos.length === 0
              ? <div style={{ fontSize: 12, color: T.t4, padding: "6px 0" }}>{t("tripbill.td_no_photo")}</div>
              : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10, marginTop: 4 }}>
                  {photos.map((p, i) => {
                    const lab = tbPhotoLabel(p);
                    return (
                      <div key={p.key || i}>
                        <div style={{ fontSize: 10.5, color: T.t3, fontWeight: 700, marginBottom: 3 }}>{lab}</div>
                        <img src={cld(p.url, "tile")} alt={lab} onClick={() => setZoom({ url: p.url, label: lab })}
                          style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, border: `1px solid ${T.b1}`, cursor: "zoom-in", display: "block" }} />
                      </div>
                    );
                  })}
                </div>
              )}
          </>
        )}
      </TbModal>
      <TbZoom photo={zoom} onClose={() => setZoom(null)} />
    </>
  );
}

// ── Bill ki poori detail (GET /trips/bills/:id) ─────────────────────
// Project-wise jod, bill ki trips photo ke saath, due aur paid. onTrip diya
// ho to trip dabane par uski detail. footerExtra = module ka apna button.
function TbBillDetail({ id, onClose, onTrip, footerExtra }) {
  const [st, setSt] = useState({ loading: true });
  const [zoom, setZoom] = useState(null);
  useEffect(() => {
    let alive = true;
    setSt({ loading: true });
    api.get(`/trips/bills/${id}`).then((r) => {
      if (!alive) return;
      const d = tbBody(r);
      setSt(d && typeof d === "object" && d.id != null ? { d } : { err: (r && r.message) || t("tripbill.load_fail") });
    }).catch(() => { if (alive) setSt({ err: t("tripbill.load_fail") }); });
    return () => { alive = false; };
  }, [id]);
  const d = st.d;
  const trips = (d && Array.isArray(d.trips)) ? d.trips : [];
  const byProject = (() => {
    if (!d) return [];
    if (Array.isArray(d.by_project) && d.by_project.length) return d.by_project;
    const m = new Map();
    trips.forEach((tr) => {
      const k = tr.project_id == null ? "0" : String(tr.project_id);
      const o = m.get(k) || { project_id: tr.project_id, project_name: tr.project_name || "—", trips: 0, amount: 0 };
      o.trips += 1; o.amount += Number(tr.amount) || 0; m.set(k, o);
    });
    return [...m.values()];
  })();
  const total = d && d.total_amount != null ? Number(d.total_amount) : null;
  const paid = d && d.paid_amount != null ? Number(d.paid_amount) : null;
  const balance = total != null && paid != null ? Math.max(0, total - paid) : null;
  const print = () => {
    if (!d) return;
    const head = `<h2>${tbEsc(d.bill_no || "#" + d.id)} · ${tbEsc(d.vendor_name || "")}</h2>`
      + `<p>${tbEsc(t("tripbill.bd_bill_date"))}: ${tbEsc(tbDate(d.bill_date))} · ${tbEsc(t("tripbill.bd_due_date"))}: ${tbEsc(tbDate(d.due_date))}</p>`
      + `<p>${tbEsc(t("tripbill.bd_total"))}: ${tbEsc(tbMoney(total))} · ${tbEsc(t("tripbill.bd_paid"))}: ${tbEsc(tbMoney(paid))} · ${tbEsc(t("tripbill.bd_balance"))}: ${tbEsc(tbMoney(balance))}</p>`
      + (d.note ? `<p>${tbEsc(d.note)}</p>` : "");
    const proj = `<h3>${tbEsc(t("tripbill.bd_by_project"))}</h3><table><tr><th>${tbEsc(t("common.project"))}</th><th class="r">${tbEsc(t("tripbill.col_trips"))}</th><th class="r">${tbEsc(t("tripbill.col_amount"))}</th></tr>`
      + byProject.map((p) => `<tr><td>${tbEsc(p.project_name || "—")}</td><td class="r">${tbEsc(p.trips)}</td><td class="r">${tbEsc(tbMoney(p.amount))}</td></tr>`).join("")
      + `<tr class="tot"><td>${tbEsc(t("tripbill.bd_total"))}</td><td class="r">${tbEsc(trips.length || d.trip_count || "")}</td><td class="r">${tbEsc(tbMoney(total))}</td></tr></table>`;
    const rows = `<h3>${tbEsc(t("tripbill.bd_trips"))}</h3><table><tr><th>${tbEsc(t("common.date"))}</th><th>${tbEsc(t("tripbill.col_vehicle"))}</th><th>${tbEsc(t("common.project"))}</th><th>${tbEsc(t("tripbill.col_route"))}</th><th class="r">${tbEsc(t("tripbill.col_km"))}</th><th class="r">${tbEsc(t("tripbill.col_amount"))}</th></tr>`
      + trips.map((tr) => `<tr><td>${tbEsc(tbDate(tr.trip_date))} #${tbEsc(tr.trip_no)}</td><td>${tbEsc(tr.registration_no || "")}</td><td>${tbEsc(tr.project_name || "")}</td><td>${tbEsc(tr.route_name || "")}</td><td class="r">${tbEsc(tr.km_billed != null ? tbNum(tr.km_billed) : "")}</td><td class="r">${tbEsc(tbMoney(tr.amount))}</td></tr>`).join("")
      + `</table>`;
    tbPrint(t("tripbill.bd_title", { no: d.bill_no || "#" + d.id }), head + proj + rows);
  };
  const tile = (label, value, tone) => (
    <div style={{ border: `1px solid ${T.b1}`, borderRadius: 9, padding: "9px 12px", background: T.surface }}>
      <div style={tbLbl}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: tone || T.t1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
  const TCOLS = "92px minmax(90px,1fr) minmax(90px,1fr) minmax(90px,1.1fr) 62px 92px 40px";
  return (
    <>
      <TbModal width={880} onClose={onClose}
        title={d ? t("tripbill.bd_title", { no: d.bill_no || "#" + d.id }) : t("tripbill.bd_title", { no: "…" })}
        sub={d ? [d.vendor_name || t("tripbill.vendor_nahi"), t("tripbill.bd_n_trips", { n: Number(d.trip_count) || trips.length })].join(" · ") : ""}
        footer={<>
          {footerExtra}
          {d && <button type="button" onClick={print} style={tbBtn(false)}>{t("tripbill.print")}</button>}
          <button type="button" onClick={onClose} style={tbBtn(false)}>{t("common.close")}</button>
        </>}>
        {st.loading && <div style={{ textAlign: "center", padding: 30, color: T.t4, fontSize: 12.5 }}>{t("common.loading_2")}</div>}
        {st.err && <div style={{ border: `1px solid ${T.red}33`, background: T.redL, color: T.red, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600 }}>{st.err}</div>}
        {d && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
              {tile(t("tripbill.bd_total"), tbMoney(total))}
              {tile(t("tripbill.bd_paid"), tbMoney(paid))}
              {tile(t("tripbill.bd_balance"), tbMoney(balance))}
              <div style={{ border: `1px solid ${T.b1}`, borderRadius: 9, padding: "9px 12px", background: T.surface }}>
                <div style={tbLbl}>{t("common.status")}</div>
                <TbBillStatus status={d.status} due={d.due_date} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.t2, marginBottom: 12 }}>
              <span>{t("tripbill.bd_bill_date")}: <b>{tbDate(d.bill_date)}</b></span>
              <span>{t("tripbill.bd_due_date")}: <b style={{ color: d.status !== "paid" && tbYmd(d.due_date) && tbYmd(d.due_date) < tbToday() ? T.red : T.t1 }}>{tbDate(d.due_date)}</b></span>
              {d.from_date && <span>{t("tripbill.bd_period")}: <b>{tbDate(d.from_date)} – {tbDate(d.to_date)}</b></span>}
              {d.created_by_name && <span>{t("tripbill.bd_made_by")}: <b>{d.created_by_name}</b></span>}
            </div>
            {d.note && <div style={{ fontSize: 12, color: T.t2, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, padding: "8px 11px", marginBottom: 12 }}>{d.note}</div>}

            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>{t("tripbill.bd_by_project")}</div>
            <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 14, overflow: "hidden" }}>
              {byProject.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 12px", borderTop: i ? `1px solid ${T.b1}` : "none", fontSize: 12.5 }}>
                  <span style={{ color: T.t1, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.project_name || "—"}</span>
                  <span style={{ color: T.t3, whiteSpace: "nowrap" }}>{t("tripbill.n_trips", { n: Number(p.trips) || 0 })}</span>
                  <span style={{ color: T.t1, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 90, textAlign: "right" }}>{tbMoney(p.amount)}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>{t("tripbill.bd_trips")}</div>
            <div style={{ overflowX: "auto", border: `1px solid ${T.b1}`, borderRadius: 8 }}>
              <div style={{ minWidth: 700 }}>
                <div style={{ display: "grid", gridTemplateColumns: TCOLS, gap: 8, padding: "7px 12px", background: T.surfaceB, fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  <span>{t("common.date")}</span><span>{t("tripbill.col_vehicle")}</span><span>{t("common.project")}</span><span>{t("tripbill.col_route")}</span>
                  <span style={{ textAlign: "right" }}>{t("tripbill.col_km")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_amount")}</span><span />
                </div>
                {trips.map((tr) => (
                  <div key={tr.id} onClick={onTrip ? () => onTrip(tr.id) : undefined}
                    style={{ display: "grid", gridTemplateColumns: TCOLS, gap: 8, padding: "8px 12px", borderTop: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2, cursor: onTrip ? "pointer" : "default" }}>
                    <span style={{ whiteSpace: "nowrap" }}>{tbDate(tr.trip_date)}<span style={{ display: "block", fontSize: 10, color: T.t4 }}>#{tr.trip_no}</span></span>
                    <span style={{ fontWeight: 700, color: T.t1 }}>{tr.registration_no || "—"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.project_name || "—"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.route_name || "—"}</span>
                    <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tr.km_billed != null ? tbNum(tr.km_billed) : "—"}</span>
                    <span style={{ textAlign: "right", fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{tbMoney(tr.amount)}</span>
                    <span><TbThumb url={tr.unload_photo_url || tr.load_photo_url} label={tr.registration_no} onZoom={setZoom} /></span>
                  </div>
                ))}
                {trips.length === 0 && <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("tripbill.bd_no_trips")}</div>}
              </div>
            </div>
          </>
        )}
      </TbModal>
      <TbZoom photo={zoom} onClose={() => setZoom(null)} />
    </>
  );
}

// ── Gaadi ka "Paisa kaise": km · trip · monthly · pending · own · unset ──
// unset = "tay nahi" (fleet ki kiraye ki gaadi, jis par abhi koi tareeka nahi).
const tbBillingMeta = (k) => ({
  km:      { l: t("trip_tracking.bill_km"),      c: T.ind, bg: T.indL },
  trip:    { l: t("trip_tracking.bill_trip"),    c: T.blu, bg: T.bluL },
  monthly: { l: t("trip_tracking.bill_monthly"), c: T.amb, bg: T.ambL },
  pending: { l: t("trip_tracking.bill_pending"), c: T.amb, bg: T.ambL },
  own:     { l: t("trip_tracking.bill_own"),     c: T.t3,  bg: T.sltL },
  unset:   { l: t("tripbill.bill_unset"),        c: T.amb, bg: T.ambL },
}[k == null ? "unset" : k] || null);
const tbNormReg = (s) => String(s == null ? "" : s).replace(/[\s.-]/g, "").toUpperCase();
// Khoj: har shabd gaadi number (space / dash / dot ke bina), naam, vendor, capacity ya card ke naam me.
const tbMatch = (v, vendorName, q) => {
  const toks = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return true;
  const hay = [v.name, v.registration_no, vendorName, v.capacity, v.rate_card_name, v.city_name].map((x) => String(x || "").toLowerCase());
  const regs = [tbNormReg(v.registration_no), tbNormReg(v.name)];
  return toks.every((tok) => hay.some((h) => h.includes(tok)) || (!!tbNormReg(tok) && regs.some((x) => x.includes(tbNormReg(tok)))));
};

// Bada drawer (dahine se) — gaadi ka poora page.
function TbDrawer({ title, sub, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={onClose}>
      <BackClose onClose={onClose} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 1040, maxWidth: "100vw", background: T.bg, boxShadow: "-8px 0 30px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "13px 16px", background: T.surface, borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>{title}{sub && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>{sub}</div>}</div>
          <button onClick={onClose} type="button" aria-label={t("common.close")} style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 18, lineHeight: 1, color: T.t3 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// ── Vehicle page — GET /trips/office/vehicles/:id ───────────────────
// Upar tiles (Trips · Bill hua · Bill ke liye taiyaar · Rate baaki · Flagged),
// trip table (project, route, material, km, ₹, bill_state, photo), "Rate badlo",
// aur is gaadi ke bills (sirf jise Finance VIEW — showBills). Trip dabao =
// poori detail. projectId diya ho to sirf us project ki trips.
const TB_TCOLS = "84px minmax(90px,1fr) minmax(90px,1fr) minmax(90px,1fr) 62px 90px 150px 40px 78px";
function TbVehiclePage({ vehicle, projectId, from: f0, to: t0, showBills, onClose, onChanged }) {
  const [from, setFrom] = useState(f0);
  const [to, setTo] = useState(t0);
  const [st, setSt] = useState({ loading: true });
  const [flash, setFlash] = useState("");
  const [detail, setDetail] = useState(null);     // trip id
  const [billId, setBillId] = useState(null);
  const [over, setOver] = useState(null);         // trip jiska "Rate badlo" khula
  const canOver = canOverrideRate();
  const load = useCallback(() => {
    let alive = true;
    setSt((p) => ({ ...p, loading: true, err: null }));
    api.get(`/trips/office/vehicles/${vehicle.id}?from=${from}&to=${to}` + (projectId ? "&project_id=" + projectId : "")).then((r) => {
      if (!alive) return;
      const d = tbBody(r);
      setSt(d && typeof d === "object" && !Array.isArray(d) ? { loading: false, d } : { loading: false, err: (r && r.message) || t("tripbill.load_fail") });
    }).catch(() => { if (alive) setSt({ loading: false, err: t("tripbill.load_fail") }); });
    return () => { alive = false; };
  }, [vehicle.id, from, to, projectId]);
  useEffect(() => load(), [load]);
  const d = st.d || {};
  const v = { ...vehicle, ...(d.vehicle || {}) };
  const tot = d.totals || {};
  const trips = Array.isArray(d.trips) ? d.trips : [];
  const bills = Array.isArray(d.bills) ? d.bills : [];
  const reg = v.registration_no || v.name || "#" + v.id;
  const bm = tbBillingMeta(v.trip_billing);
  const tile = (label, value, sub, tone) => (
    <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "10px 13px" }}>
      <div style={tbLbl}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tone || T.t1, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>{value}</div>
      {sub != null && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const dateS = { height: 30, padding: "0 8px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none" };
  return (
    <>
      <TbDrawer onClose={onClose}
        title={<div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: T.t1, letterSpacing: 0.3 }}>{reg}</span>
          {v.name && v.name !== v.registration_no && <span style={{ fontSize: 12.5, color: T.t3 }}>{v.name}</span>}
          {bm && <TbPill label={bm.l} c={bm.c} bg={bm.bg} />}
          {v.is_fleet && <TbPill label={t("tripbill.fleet_pill")} c={T.t3} bg={T.sltL} />}
        </div>}
        sub={[v.vendor_name || t("tripbill.vendor_nahi"), v.capacity, v.rate_card_name, v.city_name].filter(Boolean).join(" · ")}>
        {flash && <div style={{ border: `1px solid ${T.grn}44`, background: T.grnL, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: T.grn, fontWeight: 600 }}>{flash}</div>}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t("common.from")}</span>
          <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} style={dateS} />
          <span style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t("common.to")}</span>
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} style={dateS} />
          {projectId && <span style={{ fontSize: 11, color: T.t4 }}>{t("tripbill.vp_is_project")}</span>}
        </div>
        {st.loading && !st.d && <div style={{ textAlign: "center", padding: 30, color: T.t4, fontSize: 12.5 }}>{t("common.loading_2")}</div>}
        {st.err && <div style={{ border: `1px solid ${T.red}33`, background: T.redL, color: T.red, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600 }}>{st.err}</div>}
        {st.d && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 14 }}>
              {tile(t("tripbill.tile_trips"), Number(tot.trips) || 0, t("tripbill.tile_km", { n: tbNum(tot.km_billed || 0) }))}
              {tile(t("tripbill.tile_billed"), tbMoney(tot.billed_amount), t("tripbill.n_trips", { n: Number(tot.billed_trips) || 0 }))}
              {tile(t("tripbill.tile_ready"), tbMoney(tot.ready_amount), t("tripbill.n_trips", { n: Number(tot.ready_trips) || 0 }))}
              {tile(t("tripbill.tile_rate_baaki"), Number(tot.rate_pending_trips) || 0, null, Number(tot.rate_pending_trips) > 0 ? T.amb : null)}
              {tile(t("tripbill.tile_flagged"), Number(tot.flagged_trips) || 0, Number(tot.in_transit) > 0 ? t("tripbill.n_in_transit", { n: Number(tot.in_transit) }) : null, Number(tot.flagged_trips) > 0 ? T.red : null)}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "9px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("tripbill.vp_trips_title", { n: trips.length })}</div>
              {trips.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("tripbill.vp_no_trips")}</div>}
              {trips.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 900 }}>
                    <div style={{ display: "grid", gridTemplateColumns: TB_TCOLS, gap: 8, padding: "7px 14px", fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", borderBottom: `1px solid ${T.b1}` }}>
                      <span>{t("common.date")}</span><span>{t("common.project")}</span><span>{t("tripbill.col_route")}</span><span>{t("tripbill.col_material")}</span>
                      <span style={{ textAlign: "right" }}>{t("tripbill.col_km")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_amount")}</span><span>{t("common.status")}</span><span /><span />
                    </div>
                    {trips.map((tr) => (
                      <div key={tr.id} onClick={() => setDetail(tr.id)}
                        style={{ display: "grid", gridTemplateColumns: TB_TCOLS, gap: 8, padding: "9px 14px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2, cursor: "pointer" }}>
                        <span style={{ whiteSpace: "nowrap" }}>{tbDate(tr.trip_date)}<span style={{ display: "block", fontSize: 10, color: T.t4 }}>#{tr.trip_no}</span></span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tr.project_name || ""}>{tr.project_name || "—"}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tr.route_name || ""}>{tr.route_name || "—"}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[tr.material_name, tr.qty != null ? tbNum(tr.qty) + (tr.qty_unit ? " " + tr.qty_unit : "") : ""].filter(Boolean).join(" · ") || "—"}</span>
                        <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tr.km_billed != null ? tbNum(tr.km_billed) : "—"}</span>
                        <span style={{ textAlign: "right", fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{tr.status === "in_transit" ? "—" : tbMoney(tr.amount)}</span>
                        <span style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}><TbChip trip={tr} /><OverrideChip trip={tr} /></span>
                        <span><TbThumb url={tr.unload_photo_url || tr.load_photo_url} label={reg} /></span>
                        <span style={{ textAlign: "right" }}>
                          {canOver && canOverrideTrip(tr) && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setOver(tr); }}
                              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: T.ind }}>{t("tripbill.rate_badlo")}</button>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showBills && (
              <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "9px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("tripbill.vp_bills_title", { n: bills.length })}</div>
                {bills.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 12.5, color: T.t4 }}>{t("tripbill.vp_no_bills")}</div>}
                {bills.map((b) => (
                  <div key={b.id} onClick={() => setBillId(b.id)}
                    style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "9px 14px", borderBottom: `1px solid ${T.b1}`, fontSize: 12, cursor: "pointer" }}>
                    <span style={{ fontWeight: 800, color: T.ind, minWidth: 70 }}>{b.bill_no || "#" + b.id}</span>
                    <span style={{ color: T.t3 }}>{t("tripbill.vp_bill_on", { date: tbDate(b.bill_date) })}</span>
                    <span style={{ color: T.t3 }}>{t("tripbill.vp_due_on", { date: tbDate(b.due_date) })}</span>
                    <span style={{ color: T.t3, flex: 1 }}>{t("tripbill.n_trips", { n: Number(b.trip_count) || 0 })}</span>
                    <span style={{ fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{tbMoney(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </TbDrawer>
      {detail != null && (
        <TbTripDetail id={detail} onClose={() => setDetail(null)}
          onOverride={canOver ? (tr) => { if (canOverrideTrip(tr)) { setDetail(null); setOver(tr); } else window.alert(t("tripbill.rate_badlo_na")); } : null}
          onBill={showBills ? (bid) => { setDetail(null); setBillId(bid); } : null} />
      )}
      {billId != null && <TbBillDetail id={billId} onClose={() => setBillId(null)} onTrip={(tid) => { setBillId(null); setDetail(tid); }} />}
      {over && (
        <RateOverrideModal trip={over} onClose={() => setOver(null)}
          onSaved={(saved, msg) => { setOver(null); setFlash(msg); load(); onChanged && onChanged(); }} />
      )}
    </>
  );
}

// ── Vendor → gaadi list (API 2 + API 3) ─────────────────────────────
// Vendor ki patti dabao = uski gaadiyan khulti hain; gaadi ka number dabao =
// Vehicle page. Khoj chal rahi ho to saare vendor ki gaadiyan laa kar dhoondhta
// hai (Ctrl+K se number bhar kar aane par bhi). vendorExtra / vehicleExtra =
// module ke apne button (Bill banao, Edit, Card…).
const TB_VCOLS = "minmax(170px,1.5fr) 96px 48px 100px 100px 78px 56px 66px 74px 120px";
function TbVendorVehicles({ projectId, from, to, q, reloadKey, onVehicle, vendorExtra, vehicleExtra, emptyHint }) {
  const [vs, setVs] = useState({ loading: true, rows: [] });
  const [open, setOpen] = useState({});
  const [veh, setVeh] = useState({});
  const sig = "from=" + from + "&to=" + to + (projectId ? "&project_id=" + projectId : "") + "#" + (reloadKey || 0);
  const sigRef = useRef(sig);
  sigRef.current = sig;
  const keyOf = (v) => (v.vendor_id == null ? "none" : String(v.vendor_id));
  const searching = !!String(q || "").trim();

  useEffect(() => {
    let alive = true;
    setVs((p) => ({ ...p, loading: true }));
    setVeh({});
    api.get("/trips/office/vendors?" + sig.split("#")[0]).then((r) => {
      if (!alive) return;
      const d = tbBody(r);
      setVs(Array.isArray(d) ? { loading: false, rows: d } : { loading: false, rows: [], err: (r && r.message) || t("tripbill.load_fail") });
    }).catch(() => { if (alive) setVs({ loading: false, rows: [], err: t("tripbill.load_fail") }); });
    return () => { alive = false; };
  }, [sig]);

  const loadVeh = useCallback((k) => {
    const mine = sig;
    setVeh((p) => (p[k] ? p : { ...p, [k]: { loading: true, rows: [] } }));
    api.get(`/trips/office/vendors/${k}/vehicles?` + mine.split("#")[0]).then((r) => {
      if (sigRef.current !== mine) return;
      const d = tbBody(r);
      setVeh((p) => ({ ...p, [k]: Array.isArray(d) ? { loading: false, rows: d } : { loading: false, rows: [], err: (r && r.message) || t("tripbill.load_fail") } }));
    }).catch(() => { if (sigRef.current === mine) setVeh((p) => ({ ...p, [k]: { loading: false, rows: [], err: t("tripbill.load_fail") } })); });
  }, [sig]);
  const need = vs.rows.map(keyOf).filter((k) => (searching || open[k]) && !veh[k]);
  const needSig = need.join(",");
  useEffect(() => { if (needSig) needSig.split(",").forEach(loadVeh); }, [needSig, loadVeh]);

  const nameOf = (g) => g.vendor_name || t("tripbill.vendor_nahi");
  const shown = vs.rows.map((g) => {
    const k = keyOf(g);
    const all = (veh[k] && veh[k].rows) || [];
    if (!searching) return { g, k, list: all, show: true };
    const nameHit = tbMatch({}, nameOf(g), q);
    const hit = all.filter((v) => tbMatch(v, nameOf(g), q));
    return { g, k, list: hit.length ? hit : (nameHit ? all : []), show: nameHit || hit.length > 0 };
  }).filter((x) => x.show).sort((a, b) => nameOf(a.g).localeCompare(nameOf(b.g)));
  const searchBusy = searching && vs.rows.some((g) => !veh[keyOf(g)] || veh[keyOf(g)].loading);
  const chip = (n, label, c, bg) => (n > 0 ? <TbPill key={label} label={label} c={c} bg={bg} /> : null);

  return (
    <div>
      {vs.loading && vs.rows.length === 0 && <div style={{ textAlign: "center", padding: 30, color: T.t4, fontSize: 12.5 }}>{t("common.loading_2")}</div>}
      {vs.err && <div style={{ border: `1px solid ${T.red}33`, background: T.redL, color: T.red, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{vs.err}</div>}
      {!vs.loading && !vs.err && vs.rows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", background: T.surface, borderRadius: 8, border: `1px solid ${T.b1}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t3, marginBottom: 4 }}>{t("tripbill.vv_empty")}</div>
          {emptyHint && <div style={{ fontSize: 12, color: T.t4 }}>{emptyHint}</div>}
        </div>
      )}
      {searching && vs.rows.length > 0 && shown.length === 0 && !searchBusy && <div style={{ textAlign: "center", padding: 24, color: T.t4, fontSize: 12.5 }}>{t("tripbill.vv_khoj_nahi")}</div>}
      {searchBusy && <div style={{ fontSize: 11, color: T.t4, marginBottom: 6 }}>{t("tripbill.vv_khoj_chal")}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map(({ g, k, list }) => {
          const isOpen = searching || !!open[k];
          const vd = veh[k] || {};
          return (
            <div key={k} style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.b1}`, overflow: "hidden" }}>
              <div onClick={() => setOpen((p) => ({ ...p, [k]: !p[k] }))}
                style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: g.vendor_id == null ? T.amb : T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(g)}</div>
                  <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{t("tripbill.vv_sub", { n: Number(g.vehicles) || 0, trips: Number(g.trips) || 0, km: tbNum(g.km_billed || 0) })}</div>
                </div>
                <span style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  {chip(Number(g.flagged_trips), t("tripbill.chip_flagged", { n: Number(g.flagged_trips) }), T.red, T.redL)}
                  {chip(Number(g.in_transit), t("tripbill.chip_in_transit", { n: Number(g.in_transit) }), T.amb, T.ambL)}
                  {chip(Number(g.rate_pending_trips), t("tripbill.chip_rate_pending", { n: Number(g.rate_pending_trips) }), T.amb, T.ambL)}
                  {chip(Number(g.ready_trips), t("tripbill.chip_ready", { n: Number(g.ready_trips) }), T.ind, T.indL)}
                </span>
                <span style={{ textAlign: "right", minWidth: 120 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{tbMoney(g.ready_amount)}</span>
                  <span style={{ display: "block", fontSize: 10, color: T.t4 }}>{t("tripbill.vv_ready_lbl")}{Number(g.billed_trips) > 0 ? " · " + t("tripbill.vv_billed_lbl", { amt: tbMoney(g.billed_amount) }) : ""}</span>
                </span>
                {vendorExtra && <span onClick={(e) => e.stopPropagation()}>{vendorExtra(g)}</span>}
                <span style={{ color: T.t4, fontSize: 14, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s", display: "inline-block" }}>⌄</span>
              </div>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${T.b1}`, background: T.surfaceB, padding: "10px 14px", overflowX: "auto" }}>
                  {vd.loading && <div style={{ fontSize: 12, color: T.t4, padding: 6 }}>{t("common.loading_2")}</div>}
                  {vd.err && <div style={{ fontSize: 12, color: T.red, padding: 6 }}>{vd.err}</div>}
                  {!vd.loading && !vd.err && list.length === 0 && <div style={{ fontSize: 12, color: T.t4, padding: 6 }}>{t("tripbill.vv_no_vehicles")}</div>}
                  {list.length > 0 && (
                    <div style={{ minWidth: 930 }}>
                      <div style={{ display: "grid", gridTemplateColumns: TB_VCOLS, gap: 6, padding: "6px 8px", background: T.surface, borderRadius: 6, border: `1px solid ${T.b1}`, fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>
                        <span>{t("tripbill.col_vehicle")}</span><span>{t("tripbill.col_billing")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_trips")}</span>
                        <span style={{ textAlign: "right" }}>{t("tripbill.col_ready")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_billed")}</span>
                        <span style={{ textAlign: "right" }}>{t("tripbill.col_rate_pending")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_flagged")}</span>
                        <span style={{ textAlign: "right" }}>{t("tripbill.col_in_transit")}</span><span>{t("tripbill.col_last")}</span><span />
                      </div>
                      {list.map((v) => {
                        const bm = tbBillingMeta(v.trip_billing);
                        return (
                          <div key={v.id} style={{ display: "grid", gridTemplateColumns: TB_VCOLS, gap: 6, padding: "8px 8px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2 }}>
                            <span style={{ minWidth: 0 }}>
                              <button type="button" title={t("tripbill.vv_open_vehicle")} onClick={() => onVehicle({ ...v, vendor_id: g.vendor_id, vendor_name: g.vendor_name })}
                                style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3, color: T.ind, background: T.indL, border: `1px solid ${T.ind}22`, borderRadius: 5, padding: "1px 7px", cursor: "pointer", fontFamily: "inherit" }}>{v.registration_no || v.name || "—"}</button>
                              <span style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginTop: 3, fontSize: 10.5, color: T.t4 }}>
                                {v.capacity ? <span>{v.capacity}</span> : null}
                                {v.is_fleet && <TbPill label={t("tripbill.fleet_pill")} c={T.t3} bg={T.sltL} />}
                                {v.city_name ? <span>{v.city_name}</span> : null}
                                {v.rate_card_name ? <TbPill label={v.rate_card_name} c={T.ind} bg={T.indL} /> : null}
                              </span>
                            </span>
                            <span>{bm && <TbPill label={bm.l} c={bm.c} bg={bm.bg} />}</span>
                            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(v.trips) || 0}</span>
                            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: Number(v.ready_trips) > 0 ? 700 : 400, color: Number(v.ready_trips) > 0 ? T.ind : T.t2 }}>
                              {tbMoney(v.ready_amount)}<span style={{ display: "block", fontSize: 10, fontWeight: 500, color: T.t4 }}>{t("tripbill.n_trips", { n: Number(v.ready_trips) || 0 })}</span>
                            </span>
                            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                              {tbMoney(v.billed_amount)}<span style={{ display: "block", fontSize: 10, color: T.t4 }}>{t("tripbill.n_trips", { n: Number(v.billed_trips) || 0 })}</span>
                            </span>
                            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: Number(v.rate_pending_trips) > 0 ? T.amb : T.t2, fontWeight: Number(v.rate_pending_trips) > 0 ? 700 : 400 }}>{Number(v.rate_pending_trips) || 0}</span>
                            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: Number(v.flagged_trips) > 0 ? T.red : T.t2, fontWeight: Number(v.flagged_trips) > 0 ? 700 : 400 }}>{Number(v.flagged_trips) || 0}</span>
                            <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(v.in_transit) || 0}</span>
                            <span style={{ fontSize: 10.5, color: T.t4 }}>{tbDate(v.last_trip_at)}</span>
                            <span style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>{vehicleExtra && vehicleExtra(v, g)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TabTripTracking;
