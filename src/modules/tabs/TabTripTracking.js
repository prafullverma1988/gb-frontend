import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "../../config/api";
import { T, fmtN, localYMD } from "../shared/tokens";
import { Pill, Stat, Panel, THead, AddBtn, FilterTabs } from "../shared/ui";
import { currentUser } from "../../utils/perms";
import { t, Rich } from "../../i18n";
import { cld } from "../../utils/cloudinary";

// ── Kaun kya kar sakta hai (is tab ka apna — module independence) ──
// 3 Oct 2026 se Trip Tracking Roles & Access ki "Equipment" row se chalta hai
// (pehle Machinery). Niyam wahi jo server routes/trips.js lagata hai — button
// sirf use dikhe jo dabaa sake, warna 403:
//   Create  = naya route / naya truck      Edit = route badalna
//   Entry   = loading / unloading (mobile) + apni trip 10 min me cancel
//   Approve = review, manual close, doosre ki trip cancel — Admin / PM role se
//             hamesha, baaki ko Equipment ka Approve tick chahiye
//   Bill    = Finance ka Create (Finance ki row hi nahi = band)
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
function canBillTrips(u = currentUser()) {
  if (isAdminU(u)) return true;
  const fin = (u?.module_permissions || {}).Finance;
  return !!fin && fin.create === true;
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

// ════════════════════════════════════════════════════════════════
// TabTripTracking — web management view for the Trip Tracking module
// (truck trips load→unload; the camera/GPS punch itself lives in the
// mobile app). Manager surface: monitor + review flagged/stuck trips,
// manage routes (leads) + trucks, run reports, and bill vendors.
// ════════════════════════════════════════════════════════════════

const FLAG_META = {
  too_fast:         { get label() { return t("trip_tracking.too_fast"); },         tone: "red" },
  impossible_cycle: { get label() { return t("trip_tracking.impossible_cycle"); }, tone: "red" },
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
// mahine ka kiraya (trip sirf record, bill nahi), own = apni gaadi.
// Trip par wahi load ke waqt billing_snap me jam jaata hai.
const BILLING = {
  km:      { get label() { return t("trip_tracking.bill_km"); },      get hint() { return t("trip_tracking.bill_km_hint"); },      c: T.ind, bg: T.indL },
  trip:    { get label() { return t("trip_tracking.bill_trip"); },    get hint() { return t("trip_tracking.bill_trip_hint"); },    c: T.blu, bg: T.bluL },
  monthly: { get label() { return t("trip_tracking.bill_monthly"); }, get hint() { return t("trip_tracking.bill_monthly_hint"); }, c: T.amb, bg: T.ambL },
  own:     { get label() { return t("trip_tracking.bill_own"); },     c: T.slt, bg: T.sltL },
};
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
// Server ke utils/tripKm.js (roundKm / amountForKm) jaisa hi — yahan sirf
// DIKHANE ke liye (editor ka example, review me naya amount). Asli amount
// server banata hai; dono ka ganit alag hua to screen ka ₹ aur bill ka ₹
// alag aayega. Contract ka udaharan dono jagah sach hona chahiye:
//   rates [100, 80, 70], aage 60, 10 km → Slab se ₹600, Jod kar ₹670.
const r2 = (n) => Math.round(n * 100) / 100;
// nearest = poora km (0.5 upar) · up = hamesha upar · none = jaisa hai (2 decimal)
function rcRoundKm(km, mode) {
  const k = Number(km);
  if (!Number.isFinite(k) || k <= 0) return 0;
  if (mode === "up") return Math.ceil(k);
  if (mode === "none") return r2(k);
  return Math.round(k);
}
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
// 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st
const nth = (n) => {
  const h = n % 100;
  if (h >= 11 && h <= 13) return n + "th";
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
};
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

const inp = { width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" };
const lblS = { fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 };

// ── Capacity aur gaadi ki khoj (4 Oct 2026) ──────────────────────
// Trip gaadi ki capacity = number + unit (cft / cum / ton); server saath me
// "500 cft" text (capacity) bhi bhejta hai. Khoj ka niyam server ke
// /trucks?all=1 jaisa: har shabd gaadi number (space / dash / dot ke bina),
// naam, vendor, capacity ya card ke naam me kahin mile ("sharma 500").
const CAP_UNITS = ["cft", "cum", "ton"];
const normReg = (v) => String(v == null ? "" : v).replace(/[\s.-]/g, "").toUpperCase();
const capOf = (r) => (r && (r.capacity || (r.capacity_qty != null ? (Number(r.capacity_qty) + " " + (r.capacity_unit || "")).trim() : ""))) || "";
function matchTruck(r, q) {
  const toks = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return true;
  const hay = [r.name, r.code, r.registration_no, r.vendor_name || r.default_vendor_name, capOf(r), r.rate_card_name]
    .map(x => String(x || "").toLowerCase());
  const regs = [normReg(r.registration_no), normReg(r.name)];
  return toks.every(tok => hay.some(h => h.includes(tok)) || (!!normReg(tok) && regs.some(x => x.includes(normReg(tok)))));
}
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
      <select value={unit} onChange={e => onUnit(e.target.value)} style={{ ...inp, width: 84, flexShrink: 0, borderColor: bad ? T.red : T.b1 }}>
        <option value="">{t("trip_tracking.cap_unit")}</option>
        {CAP_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
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

  // Naam wale rate card (4 Oct 2026) + purane vendor card (legacy, abhi bhi
  // fallback). null = server purana (404) ya ijazat nahi — tab "Rate card"
  // sub-tab dikhta hi nahi.
  const [cards, setCards] = useState(null);
  const loadCards = useCallback(() => {
    api.get("/trips/rate-templates")
      .then(r => setCards(r && r.success
        ? { list: Array.isArray(r.data) ? r.data : [], legacy: Array.isArray(r.legacy_cards) ? r.legacy_cards : [] }
        : null))
      .catch(() => setCards(null));
  }, []);
  useEffect(() => { loadCards(); }, [loadCards]);
  const curSub = sub === "ratecard" && !cards ? "monitor" : sub;

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
            { id: "trucks",  label: t("trip_tracking.trucks") },
            ...(cards ? [{ id: "ratecard", label: t("trip_tracking.rate_card") }] : []),
            { id: "reports", label: t("common.reports") },
            { id: "billing", label: t("trip_tracking.billing") },
          ]}
          active={curSub} onChange={setSub} />
      </div>

      {curSub === "monitor"  && <MonitorTab projectId={projectId} onChange={loadSummary} />}
      {curSub === "routes"   && <RoutesTab projectId={projectId} />}
      {curSub === "trucks"   && <TrucksTab />}
      {curSub === "ratecard" && <RateCardTab data={cards} onChange={loadCards} />}
      {curSub === "reports"  && <ReportsTab projectId={projectId} />}
      {curSub === "billing"  && <BillingTab projectId={projectId} />}
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
  // Review par "Bill km" — trip id → likha hua (khaali = jo hai wahi rahe).
  const [billKm, setBillKm] = useState({});
  const [busyId, setBusyId] = useState(null);
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
                          <div>{t("trip_tracking.unloaded_by_t_fmtclock", { t: item4.unload_by_name || "—", fmtClock: fmtClock(item4.unload_at) })}</div>
                          <div>{t("trip_tracking.vendor_t_rate_t2", { t: item4.vendor_name || "—", t2:
                            item4.billing_snap === "km" ? t("trip_tracking.rate_km_card")
                              : item4.billing_snap === "monthly" ? t("trip_tracking.rate_monthly")
                              : item4.billing_snap === "own" ? t("trip_tracking.rate_own")
                              : item4.rate_snap != null ? rs(item4.rate_snap) : t("trip_tracking.rate_pending") })}</div>
                          {item4.delay_reason && <div style={{ color: T.amb }}>{t("trip_tracking.delay_delay_reason", { delay_reason: delayReasonLabel(item4.delay_reason) })}</div>}
                          {item4.review_note && <div style={{ color: T.t3 }}>{t("trip_tracking.review_note_review_note", { review_note: item4.review_note })}</div>}
                        </div>
                      </div>

                      {(() => {
                        // Jo button server maanega wahi — koi na bache to remark ka dabba bhi nahi.
                        const approver = canApproveTrip();
                        const canReview = item4.verify_status === "flagged" && item4.status !== "in_transit" && approver;
                        const canCancel = item4.status === "in_transit" && canCancelTrip(item4);
                        const canClose = item4.status === "in_transit" && approver;
                        if (!canReview && !canCancel && !canClose) {
                          return item4.verify_status === "flagged" && item4.status !== "in_transit"
                            ? <div style={{ fontSize: 11.5, color: T.t4 }}>{t("trip_tracking.review_approver_karega")}</div>
                            : null;
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
                              </div>
                            )}
                            <input value={notes[item4.id] || ""} onChange={e => setNotes(n => ({ ...n, [item4.id]: e.target.value }))}
                              placeholder={item4.status === "in_transit" ? (canClose ? t("trip_tracking.remark_cancel_manual_close_ke_liye") : t("trip_tracking.remark_cancel_ke_liye")) : t("trip_tracking.note_reject_ke_liye_zaroori")}
                              style={{ ...inp, marginBottom: 8 }} />
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              {canReview && (
                                <>
                                  <BtnOutline label={t("common.reject_2")} color={T.red} busy={busyId === item4.id} onClick={() => act(item4, "reject")} />
                                  <BtnSolid label={t("common.approve_2")} color={T.grn} busy={busyId === item4.id} onClick={() => act(item4, "approve")} />
                                </>
                              )}
                              {canCancel && <BtnOutline label={t("trip_tracking.cancel_trip")} color={T.red} busy={busyId === item4.id} onClick={() => stuckAct(item4, "cancel")} />}
                              {canClose && <BtnOutline label={t("trip_tracking.manual_close_2")} color={T.amb} busy={busyId === item4.id} onClick={() => stuckAct(item4, "close")} />}
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
        {canEq("create") && <AddBtn label={t("trip_tracking.new_route")} onClick={() => setForm({})} />}
      </div>

      {form && <RouteForm projectId={projectId} tasks={tasks} route={form.id ? form : null}
        onCancel={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}

      {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>{t("common.loading_2")}</div>}
      {!loading && list.length === 0 && !form && (
        <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>{canEq("create") ? t("trip_tracking.abhi_koi_route_nahi_new_route") : t("trip_tracking.abhi_koi_route_nahi")}</div>
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
              {canEq("edit") ? <button onClick={() => setForm(r)} type="button" style={{ justifySelf: "end", fontSize: 11.5, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("common.edit_2")}</button> : <span />}
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
  });
  const [saving, setSaving] = useState(false);
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
          <select value={f.load_radius} onChange={e => upd("load_radius", Number(e.target.value))} style={inp}>
            {[50, 100, 150, 200].map(rd => <option key={rd} value={rd}>{rd} m</option>)}
          </select>
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
        <div style={lblS}>{t("trip_tracking.default_task_optional")}</div>
        <select value={f.default_task_id || ""} onChange={e => upd("default_task_id", e.target.value ? Number(e.target.value) : "")} style={inp}>
          <option value="">{t("boq_import_wizard.none")}</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.name || t.title}</option>)}
        </select>
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
const ownTruck = (r) => (r.trip_billing ? r.trip_billing === "own" : String(r.ownership || "").toLowerCase() === "owned");
const truckVendorId = (r) => (r.vendor_id != null ? r.vendor_id : (r.default_vendor_id != null ? r.default_vendor_id : null));

function TrucksTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState(null); // null | {} nayi | truck (edit)
  const [q, setQ] = useState("");
  const [fCap, setFCap] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/trips/trucks").catch(() => null),
      api.get("/trips/trucks?own=1").catch(() => null),
    ]).then(([a, b]) => {
      const rows = a && a.success && Array.isArray(a.data) ? a.data : [];
      const own = b && b.success && Array.isArray(b.data) ? b.data : null;
      // Naya server: trip gaadi pehli list se, "Apni gaadi" poori fleet (?own=1).
      // Purana server (is_trip_vehicle nahi bhejta): pehle jaisi ek list.
      if (own && rows.some(r => r && "is_trip_vehicle" in r)) {
        const seen = new Set();
        setList([...rows.filter(r => r.is_trip_vehicle), ...own].filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true))));
      } else setList(rows);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    load();
    api.get("/finance/parties").then(r => setParties(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setParties([]));
  }, [load]);

  // Naya server har row par trip_billing bhejta hai — tabhi gaadi badalne
  // (PUT) ka raasta hai. Purane par Edit dikhana = 404.
  const newApi = list.some(r => r && "trip_billing" in r);
  const caps = [...new Set(list.map(capOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const shown = list.filter(r => (!fCap || capOf(r) === fCap) && matchTruck(r, q));
  const gmap = {};
  shown.forEach(r => {
    const own = ownTruck(r);
    const vid = own ? null : truckVendorId(r);
    const key = own ? "own" : (vid != null ? "v" + vid : "none");
    if (!gmap[key]) {
      gmap[key] = { key, own, vendor_id: vid, rows: [],
        name: own ? t("trip_tracking.apni_gaadi") : (r.vendor_name || r.default_vendor_name || (vid != null ? "#" + vid : t("trip_tracking.vendor_nahi"))) };
    }
    gmap[key].rows.push(r);
  });
  // Apni gaadi upar (app me bhi pehli chip wahi), phir vendor A–Z, bina vendor wali aakhir me.
  const rank = (g) => (g.own ? 0 : g.key === "none" ? 2 : 1);
  const groups = Object.values(gmap).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const COLS = "1.2fr 90px 100px 1.1fr 1.1fr 80px 100px 64px";
  const fltS = { ...inp, width: "auto", padding: "7px 10px", fontSize: 12 };

  return (
    <Panel>
      <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.trucks_list", { list: list.length ? `(${list.length})` : "" })}</span>
        {canEq("create") && <AddBtn label={t("trip_tracking.add_truck")} onClick={() => setForm(f => (f && !f.id ? null : {}))} />}
      </div>
      {form && <TruckForm key={form.id || "new"} truck={form.id ? form : null} parties={parties}
        onCancel={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
      {!loading && list.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 15px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("trip_tracking.gaadi_khoj_ph")}
            style={{ ...fltS, flex: 1, minWidth: 220, borderColor: q ? T.ind : T.b1 }} />
          {caps.length > 0 && (
            <select value={fCap} onChange={e => setFCap(e.target.value)} style={{ ...fltS, borderColor: fCap ? T.ind : T.b1 }}>
              <option value="">{t("trip_tracking.sab_capacity")}</option>
              {caps.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <span style={{ fontSize: 11.5, color: T.t4 }}>{t("trip_tracking.n_gaadi", { n: shown.length })}</span>
          {(q || fCap) && <MiniBtn onClick={() => { setQ(""); setFCap(""); }}>{t("common.clear")}</MiniBtn>}
        </div>
      )}
      {loading && <div style={{ textAlign: "center", padding: "30px 0", color: T.t4, fontSize: 13 }}>{t("common.loading_2")}</div>}
      {!loading && list.length === 0 && <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13 }}>{t("trip_tracking.abhi_koi_truck_nahi")}</div>}
      {!loading && list.length > 0 && shown.length === 0 && <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>{t("trip_tracking.khoj_me_koi_gaadi_nahi")}</div>}
      {!loading && shown.length > 0 && (
        <>
          <THead cols={COLS} headers={[t("trip_tracking.hdr_registration"), t("trip_tracking.hdr_capacity"), t("trip_tracking.hdr_billing"), t("trip_tracking.hdr_rate_card"), t("trip_tracking.hdr_driver"), t("trip_tracking.hdr_today_trips"), t("trip_tracking.hdr_status"), ""]} />
          {groups.map(g => (
            <div key={g.key}>
              <div style={{ padding: "8px 15px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{g.name}</span>
                <span style={{ fontSize: 11, color: T.t4 }}>{t("trip_tracking.n_gaadi", { n: g.rows.length })}</span>
                {g.own && <span style={{ fontSize: 10.5, color: T.t4 }}>{t("trip_tracking.apni_gaadi_fleet_bill_nahi")}</span>}
              </div>
              {g.rows.map(item5 => {
                const own = ownTruck(item5);
                const bm = BILLING[item5.trip_billing] || BILLING[own ? "own" : "trip"];
                const canEdit = newApi && canEq("edit") && !own;
                const cap = capOf(item5);
                return (
                  <div key={item5.id} style={{ display: "grid", gridTemplateColumns: COLS, padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 6 }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.t1 }}>{item5.registration_no || item5.name}</span>
                      {item5.registration_no && item5.name && item5.name !== item5.registration_no && <span style={{ display: "block", fontSize: 10.5, color: T.t4 }}>{item5.name}</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: cap ? T.t2 : T.t4, fontVariantNumeric: "tabular-nums" }}>{cap || "—"}</span>
                    <span><Pill label={bm.label} c={bm.c} bg={bm.bg} /></span>
                    <span style={{ minWidth: 0 }}>
                      {own || item5.trip_billing === "monthly" ? <span style={{ fontSize: 11.5, color: T.t4 }}>—</span>
                        : item5.rate_card_name ? <Pill label={item5.rate_card_name} c={T.ind} bg={T.indL} />
                        : newApi && "rate_card_id" in item5 ? <Pill label={t("trip_tracking.card_nahi")} c={T.amb} bg={T.ambL} />
                        : <span style={{ fontSize: 11.5, color: T.t4 }}>—</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{item5.last_driver_name || "—"}</span>
                    <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{Number(item5.today_trip_count || 0)}</span>
                    <span>{Number(item5.open_trip_count) > 0 ? <Pill label={t("trip_tracking.in_transit")} c={T.amb} bg={T.ambL} /> : <Pill label={t("common.idle")} c={T.t3} bg={T.sltL} />}</span>
                    {canEdit
                      ? <button onClick={() => setForm(item5)} type="button" style={{ justifySelf: "end", fontSize: 11.5, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("common.edit_2")}</button>
                      : <span />}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </Panel>
  );
}

function TruckForm({ truck, parties, onCancel, onSaved }) {
  const editing = !!(truck && truck.id);
  const [reg, setReg] = useState(truck ? truck.registration_no || "" : "");
  const [vendorId, setVendorId] = useState(truck && truckVendorId(truck) != null ? truckVendorId(truck) : "");
  // Nayi gaadi par billing khaali — km aur per-trip ka farak paisa badalta hai, aadmi khud chune.
  const [billing, setBilling] = useState(truck && ["km", "trip", "monthly"].includes(truck.trip_billing) ? truck.trip_billing : "");
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
          <select value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : "")} style={inp}>
            <option value="">{t("trip_tracking.vendor_chuniye")}</option>{parties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div><div style={lblS}>{t("trip_tracking.billing_type")}</div>
          <select value={billing} onChange={e => setBilling(e.target.value)} style={inp}>
            <option value="">{t("trip_tracking.billing_select")}</option>
            {["km", "trip", "monthly"].map(k => <option key={k} value={k}>{BILLING[k].label}</option>)}
          </select>
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

// ── RATE CARD ────────────────────────────────────────────────────
// Naam wala rate card (4 Oct 2026; pehle vendor-wise ek card tha). Card ka
// naam ("500 cft", "Hyva — per trip"), Kiska ("Sab vendor" ya ek vendor),
// capacity (marzi) aur tareeka: Km slab (1st km, 2nd km … isse aage har km —
// wahi purana editor aur ganit) ya Per trip (fixed ₹). Save ke baad "Gaadi
// select karo": card kis gaadi par lage — ek gaadi par ek hi card, doosre card
// wali gaadi chuno to wo is card par aa jaati hai; card lagte hi gaadi ka
// billing card ke tareeke ka. Har trip apne waqt ke card ki copy
// (rate_card_snap) rakhti hai — card badalne se purani trip ka amount nahi
// hilta. Prafull: "entry aur report non-technical aadmi ke liye aasaan ho" —
// isliye rows waise hi bolti hain jaise vendor bolta hai, aur saath me
// chalta-phirta example. Badalne ka haq server ke rateGate jaisa — Equipment
// Edit ya Finance Create.
const canEditRates = () => canEq("edit") || canBillTrips();
const RC_MAX = 20;
const RC_ROUND = {
  nearest: { get label() { return t("trip_tracking.rc_r_nearest"); }, get hint() { return t("trip_tracking.rc_r_nearest_hint"); }, get how() { return t("trip_tracking.rc_how_nearest"); } },
  up:      { get label() { return t("trip_tracking.rc_r_up"); },      get hint() { return t("trip_tracking.rc_r_up_hint"); },      get how() { return t("trip_tracking.rc_how_up"); } },
  none:    { get label() { return t("trip_tracking.rc_r_none"); },    get hint() { return t("trip_tracking.rc_r_none_hint"); },    get how() { return t("trip_tracking.rc_how_none"); } },
};
const RC_METHOD = {
  slab:       { get label() { return t("trip_tracking.rc_m_slab"); }, get hint() { return t("trip_tracking.rc_m_slab_hint"); } },
  cumulative: { get label() { return t("trip_tracking.rc_m_cum"); },  get hint() { return t("trip_tracking.rc_m_cum_hint"); } },
};
const RT_KIND = {
  km:   { get label() { return t("trip_tracking.rt_kind_km"); },   get hint() { return t("trip_tracking.rt_kind_km_hint"); } },
  trip: { get label() { return t("trip_tracking.rt_kind_trip"); }, get hint() { return t("trip_tracking.rt_kind_trip_hint"); } },
};
// Server se aaya card — rates JSON text ho sakta hai, paisa string.
const normCard = (c) => ({ ...c, rates: parseRates(c.rates), onward_rate: Number(c.onward_rate) || 0,
  method: c.method === "cumulative" ? "cumulative" : "slab", round_mode: RC_ROUND[c.round_mode] ? c.round_mode : "nearest" });
const slabText = (c) => {
  const shown = c.rates.slice(0, 5).map((r, i) => nth(i + 1) + " " + rs2(r));
  if (c.rates.length > 5) shown.push("… +" + (c.rates.length - 5));
  shown.push(t("trip_tracking.rc_onward_short", { rate: rs2(c.onward_rate) }));
  return shown.join(" · ");
};
const kiskaOf = (c, parties) => (c.vendor_id == null ? t("trip_tracking.rt_sab_vendor")
  : c.vendor_name || ((parties || []).find(p => String(p.id) === String(c.vendor_id)) || {}).name || "#" + c.vendor_id);

function RateCardTab({ data, onChange }) {
  const [parties, setParties] = useState([]);
  const [trucks, setTrucks] = useState(null);
  const [edit, setEdit] = useState(null);   // null | {} naya | card (badlo) | { _seed } (purane vendor card se)
  const [pick, setPick] = useState(null);   // card jiski gaadi select ho rahi hain
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState("");
  const canRates = canEditRates();

  const loadTrucks = useCallback(() => {
    api.get("/trips/trucks").then(r => setTrucks(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setTrucks([]));
  }, []);
  useEffect(() => {
    api.get("/finance/parties").then(r => setParties(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setParties([]));
    loadTrucks();
  }, [loadTrucks]);

  const list = (data.list || []).map(c => (c.kind === "trip" ? c : normCard(c)));
  const legacy = (data.legacy || []).map(normCard);
  const legacyVendor = new Set(legacy.map(c => String(c.vendor_id)));
  // Trip gaadi jinpar card nahi aur billing Km / Per trip — Km ki trip RATE
  // PENDING (vendor ka purana card ho to wo lagta hai), Per trip par route ka
  // purana rate (ho to). Ye bill ke din nahi, pehle dikhna chahiye.
  const noCard = (trucks || []).filter(r => r.is_trip_vehicle && ["km", "trip"].includes(r.trip_billing) && !r.rate_card_id);

  const remove = async (c) => {
    if (!window.confirm(t("trip_tracking.rt_hatao_confirm", { name: c.name, n: c.vehicles || 0 }))) return;
    setBusyId(c.id); setFlash("");
    const r = await api.del("/trips/rate-templates/" + c.id);
    setBusyId(null);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.action_fail")); return; }
    onChange(); loadTrucks();
  };
  const fromLegacy = (c) => setEdit({ _seed: { name: kiskaOf(c, parties), vendor_id: c.vendor_id, kind: "km",
    method: c.method, rates: c.rates, onward_rate: c.onward_rate, round_mode: c.round_mode, note: c.note } });

  return (
    <div>
      {flash && <div style={{ border: `1px solid ${T.grn}44`, background: T.grnL, borderRadius: 8, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: T.grn, fontWeight: 600 }}>{flash}</div>}

      {noCard.length > 0 && (
        <div style={{ border: `1px solid ${T.ambM}`, background: T.ambL, borderRadius: 8, padding: "10px 13px", marginBottom: 12, fontSize: 12, color: T.t2, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, color: T.amb, marginBottom: 4 }}>{t("trip_tracking.rt_card_nahi_n", { n: noCard.length })}</div>
          <div>{t("trip_tracking.rt_card_nahi_hint")}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
            {noCard.slice(0, 24).map(r => (
              <span key={r.id} style={{ fontSize: 11, fontWeight: 700, color: T.t1, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 5, padding: "2px 7px" }}>
                {r.registration_no || r.name}
                <span style={{ fontWeight: 500, color: T.t4 }}> · {(BILLING[r.trip_billing] || {}).label}{r.trip_billing === "km" && legacyVendor.has(String(truckVendorId(r))) ? " · " + t("trip_tracking.rt_purana_card_lagta") : ""}</span>
              </span>
            ))}
            {noCard.length > 24 && <span style={{ fontSize: 11, color: T.t4, alignSelf: "center" }}>+{noCard.length - 24}</span>}
          </div>
        </div>
      )}

      {legacy.length > 0 && (
        <div style={{ border: `1px solid ${T.b1}`, background: T.surface, borderRadius: 8, padding: "10px 13px", marginBottom: 12, fontSize: 12, color: T.t2, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, color: T.t1, marginBottom: 2 }}>{t("trip_tracking.rt_purane_card")}</div>
          <div style={{ color: T.t3, marginBottom: 6 }}>{t("trip_tracking.rt_purane_card_hint")}</div>
          {legacy.map(c => (
            <div key={c.vendor_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderTop: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: T.t1, minWidth: 140 }}>{kiskaOf(c, parties)}</span>
              <span style={{ flex: 1, fontSize: 11.5, color: T.t3, fontVariantNumeric: "tabular-nums" }}>{RC_METHOD[c.method].label} · {slabText(c)}</span>
              {canRates && <MiniBtn onClick={() => { setPick(null); fromLegacy(c); }}>{t("trip_tracking.rt_isi_se_banao")}</MiniBtn>}
            </div>
          ))}
        </div>
      )}

      <Panel>
        <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.rc_list", { list: list.length ? `(${list.length})` : "" })}</span>
          {canRates && <AddBtn label={t("trip_tracking.rc_new")} onClick={() => { setPick(null); setFlash(""); setEdit(e => (e && !e.id && !e._seed ? null : {})); }} />}
        </div>

        {edit && (
          <RateCardEditor key={edit.id ? "e-" + edit.id : (edit._seed ? "s-" + edit._seed.vendor_id : "n")} card={edit} parties={parties}
            onCancel={() => setEdit(null)}
            onSaved={(saved, isNew) => {
              setEdit(null); onChange();
              if (saved && saved.trips_updated) setFlash(t("trip_tracking.rt_saved_trips", { name: saved.name, n: saved.trips_updated }));
              // Naya card bana — ab uski gaadi select karo.
              if (isNew && saved) setPick(saved);
            }} />
        )}
        {pick && (
          <VehiclePicker key={"p-" + pick.id} tpl={pick} trucks={trucks} parties={parties}
            onCancel={() => setPick(null)}
            onSaved={(res) => {
              setFlash(t("trip_tracking.gs_saved", { name: pick.name, n: res.assigned || 0, trips: res.trips_updated || 0 }));
              setPick(null); onChange(); loadTrucks();
            }} />
        )}

        {list.length === 0 && !edit && !pick && (
          <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 13, lineHeight: 1.6 }}>
            {canRates ? t("trip_tracking.rt_empty_can") : t("trip_tracking.rc_empty")}
          </div>
        )}
        {list.length > 0 && (
          <>
            <THead cols="1.3fr 2fr 90px 200px" headers={[t("trip_tracking.rt_hdr_card"), t("trip_tracking.rt_hdr_rate"), t("trip_tracking.rt_hdr_gaadi"), ""]} />
            {list.map(c => (
              <div key={c.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 2fr 90px 200px", padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>{kiskaOf(c, parties)}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                    <Pill label={RT_KIND[c.kind === "trip" ? "trip" : "km"].label} c={T.ind} bg={T.indL} />
                    {c.capacity && <Pill label={c.capacity} c={T.t3} bg={T.sltL} />}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: T.t2, lineHeight: 1.5, fontVariantNumeric: "tabular-nums" }}>
                  {c.kind === "trip"
                    ? <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.rt_per_trip_amt", { amt: rs2(c.trip_rate) })}</span>
                    : <>
                        {slabText(c)}
                        <div style={{ fontSize: 10.5, color: T.t4 }}>{RC_METHOD[c.method].label} · {RC_ROUND[c.round_mode].label} · {t("trip_tracking.rc_ex_10", { amt: rs2(rcAmount(c, 10)) })}</div>
                      </>}
                  {c.note && <div style={{ fontSize: 10.5, color: T.t4 }}>{c.note}</div>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: Number(c.vehicles) ? T.t1 : T.t4, fontVariantNumeric: "tabular-nums" }}>{t("trip_tracking.n_gaadi", { n: Number(c.vehicles) || 0 })}</span>
                <span style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {canRates && <button type="button" onClick={() => { setPick(null); setFlash(""); setEdit(c); }} style={{ fontSize: 11.5, color: T.blu, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("common.edit_2")}</button>}
                  {canRates && <button type="button" disabled={!trucks} onClick={() => { setEdit(null); setFlash(""); setPick(c); }} style={{ fontSize: 11.5, color: T.ind, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>{t("trip_tracking.gs_button")}</button>}
                  {canRates && <button type="button" disabled={busyId === c.id} onClick={() => remove(c)} style={{ fontSize: 11.5, color: T.red, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "inherit" }}>{t("trip_tracking.rc_hatao")}</button>}
                </span>
              </div>
            ))}
          </>
        )}
      </Panel>
    </div>
  );
}

function RupeeInput({ value, onChange, bad, autoFocus }) {
  return (
    <div style={{ position: "relative", width: 140, flexShrink: 0 }}>
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.t3, pointerEvents: "none" }}>₹</span>
      <input value={value} inputMode="decimal" autoFocus={autoFocus} placeholder="0"
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        style={{ ...inp, paddingLeft: 24, fontVariantNumeric: "tabular-nums", borderColor: bad ? T.red : T.b1, background: bad ? T.redL : T.surface }} />
    </div>
  );
}

function RateCardEditor({ card, parties, onCancel, onSaved }) {
  const editing = !!(card && card.id);
  const seed = card && card._seed ? card._seed : null;
  const from = editing ? card : seed;
  const [name, setName] = useState(from && from.name ? from.name : "");
  const [vendorId, setVendorId] = useState(from && from.vendor_id != null ? String(from.vendor_id) : "");
  const [kind, setKind] = useState(from && from.kind === "trip" ? "trip" : "km");
  const [capQty, setCapQty] = useState(editing && card.capacity_qty != null ? String(Number(card.capacity_qty)) : "");
  const [capUnit, setCapUnit] = useState(editing && card.capacity_unit ? card.capacity_unit : "");
  const kmFrom = from && from.kind !== "trip" ? from : null;
  const [method, setMethod] = useState(kmFrom ? kmFrom.method : "slab");
  const [rates, setRates] = useState(kmFrom && kmFrom.rates && kmFrom.rates.length ? kmFrom.rates.map(String) : ["", "", ""]);
  const [onward, setOnward] = useState(kmFrom && kmFrom.onward_rate != null ? String(kmFrom.onward_rate) : "");
  const [round, setRound] = useState(kmFrom && RC_ROUND[kmFrom.round_mode] ? kmFrom.round_mode : "nearest");
  const [tripRate, setTripRate] = useState(from && from.kind === "trip" && from.trip_rate != null ? String(from.trip_rate) : "");
  const [note, setNote] = useState(from ? from.note || "" : "");
  const [exKm, setExKm] = useState("9.7");
  const [exTrips, setExTrips] = useState("10");
  const [focusIdx, setFocusIdx] = useState(null);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const numOk = (v) => v !== "" && v != null && Number.isFinite(Number(v)) && Number(v) >= 0;
  const cap = capCheck(capQty, capUnit);
  const badRate = rates.map(r => !numOk(r));
  const badOnward = !numOk(onward);
  const badTrip = !numOk(tripRate);
  const firstBad = badRate.indexOf(true);
  const err = !name.trim() ? t("trip_tracking.rt_err_naam")
    : cap.bad ? t("trip_tracking.cap_galat")
    : kind === "trip" ? (badTrip ? t("trip_tracking.rt_err_trip_rate") : null)
    : firstBad >= 0 ? t("trip_tracking.rc_err_rate", { nth: nth(firstBad + 1) })
    : badOnward ? t("trip_tracking.rc_err_onward") : null;
  const complete = firstBad < 0 && !badOnward;
  const live = complete ? { method, rates: rates.map(Number), onward_rate: Number(onward) } : null;

  // ── Example: km daalo → round → ₹, aur ganit khol kar ──
  const exOk = exKm !== "" && Number.isFinite(Number(exKm)) && Number(exKm) >= 0;
  const K = exOk ? rcRoundKm(Number(exKm), round) : null;
  const amt = live && K != null ? rcAmount(live, K) : null;
  const other = live && K != null ? rcAmount({ ...live, method: method === "slab" ? "cumulative" : "slab" }, K) : null;
  let formula = "";
  if (live && K != null && K > 0) {
    const n = live.rates.length;
    if (method === "slab") {
      formula = K <= n
        ? t("trip_tracking.rc_f_slab", { k: fmtKm(K), rate: rs2(rcRateAt(live, Math.ceil(K))), nth: nth(Math.ceil(K)) })
        : t("trip_tracking.rc_f_slab_onward", { k: fmtKm(K), rate: rs2(live.onward_rate) });
    } else {
      const whole = Math.floor(K);
      const inSlab = Math.min(whole, n);
      const parts = [];
      if (inSlab > 5) {
        let sum = 0;
        for (let i = 1; i <= inSlab; i++) sum += rcRateAt(live, i);
        parts.push(t("trip_tracking.rc_f_sum", { b: nth(inSlab), amt: rs2(sum) }));
      } else {
        for (let i = 1; i <= inSlab; i++) parts.push(rs2(rcRateAt(live, i)));
      }
      if (whole > n) parts.push(rs2(live.onward_rate) + " × " + (whole - n));
      const frac = r2(K - whole);
      if (frac > 0) parts.push(rs2(rcRateAt(live, whole + 1)) + " × " + fmtKm(frac));
      formula = parts.join(" + ");
    }
  }
  const exTripN = exTrips !== "" && Number.isFinite(Number(exTrips)) && Number(exTrips) >= 0 ? Number(exTrips) : null;

  const save = async () => {
    setTried(true);
    if (err) return;
    setSaving(true);
    const body = {
      name: name.trim(), vendor_id: vendorId ? Number(vendorId) : null, kind,
      capacity_qty: cap.ok ? cap.qty : null, capacity_unit: cap.ok ? cap.unit : null, note: note.trim() || null,
      ...(kind === "km"
        ? { method, rates: rates.map(Number), onward_rate: Number(onward), round_mode: round }
        : { trip_rate: Number(tripRate) }),
    };
    const r = editing ? await api.put("/trips/rate-templates/" + card.id, body) : await api.post("/trips/rate-templates", body);
    setSaving(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.save_fail")); return; }
    onSaved(r.data, !editing);
  };

  const optCard = (on) => ({ display: "flex", gap: 9, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8, cursor: "pointer",
    border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, flex: "1 1 0", minWidth: 150 });
  const secT = { fontSize: 11.5, fontWeight: 700, color: T.t2, margin: "14px 0 6px" };

  return (
    <div style={{ padding: "14px 15px", borderBottom: `1px solid ${T.b1}`, background: T.bluL + "55" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 10 }}>
        {editing ? t("trip_tracking.rt_edit_title", { name: card.name }) : t("trip_tracking.rc_new")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1fr", gap: 10 }}>
        <div><div style={lblS}>{t("trip_tracking.rt_naam_req")}</div>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder={t("trip_tracking.rt_naam_ph")}
            style={{ ...inp, borderColor: tried && !name.trim() ? T.red : T.b1 }} /></div>
        <div><div style={lblS}>{t("trip_tracking.rt_kiska")}</div>
          <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={inp}>
            <option value="">{t("trip_tracking.rt_sab_vendor")}</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        <div><div style={lblS}>{t("trip_tracking.rt_capacity_opt")}</div>
          <CapacityInput qty={capQty} unit={capUnit} onQty={setCapQty} onUnit={setCapUnit} bad={tried && cap.bad} /></div>
      </div>
      <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{vendorId ? t("trip_tracking.rt_kiska_vendor_hint") : t("trip_tracking.rt_kiska_sab_hint")}</div>

      <div style={secT}>{t("trip_tracking.rt_tareeka")}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["km", "trip"].map(k => (
          <label key={k} style={optCard(kind === k)}>
            <input type="radio" name="rt_kind" checked={kind === k} onChange={() => setKind(k)} style={{ marginTop: 2, accentColor: T.ind }} />
            <span>
              <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{RT_KIND[k].label}</span>
              <span style={{ display: "block", fontSize: 11, color: T.t3, marginTop: 1, lineHeight: 1.45 }}>{RT_KIND[k].hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(250px, 1fr)", gap: 18, alignItems: "start", marginTop: 4 }}>
        {/* ── Baayan: card bharna ── */}
        <div>
          {kind === "trip" ? (
            <>
              <div style={secT}>{t("trip_tracking.rt_per_trip_rate")}</div>
              <RupeeInput value={tripRate} bad={tried && badTrip} onChange={setTripRate} />
              <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{t("trip_tracking.rt_per_trip_hint")}</div>
            </>
          ) : (
            <>
              <div style={secT}>{t("trip_tracking.rc_method")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["slab", "cumulative"].map(k => (
                  <label key={k} style={optCard(method === k)}>
                    <input type="radio" name="rc_method" checked={method === k} onChange={() => setMethod(k)} style={{ marginTop: 2, accentColor: T.ind }} />
                    <span>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{RC_METHOD[k].label}</span>
                      <span style={{ display: "block", fontSize: 11, color: T.t3, marginTop: 1, lineHeight: 1.45 }}>{RC_METHOD[k].hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div style={secT}>{t("trip_tracking.rc_rates")}</div>
              <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, background: T.surface, overflow: "hidden" }}>
                {rates.map((r, i) => {
                  const last = i === rates.length - 1;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderBottom: `1px solid ${T.b1}` }}>
                      <span style={{ width: 120, fontSize: 12.5, fontWeight: 600, color: T.t2 }}>{t("trip_tracking.rc_nth_km", { nth: nth(i + 1) })}</span>
                      <RupeeInput value={r} bad={tried && badRate[i]} autoFocus={i === focusIdx}
                        onChange={v => setRates(rs => rs.map((x, j) => (j === i ? v : x)))} />
                      <span style={{ flex: 1 }} />
                      {last && rates.length > 1 && (
                        <button type="button" title={t("trip_tracking.rc_remove_km")} onClick={() => { setRates(rs => rs.slice(0, -1)); setFocusIdx(null); }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, cursor: "pointer", fontSize: 13, lineHeight: 1, fontFamily: "inherit" }}>✕</button>
                      )}
                    </div>
                  );
                })}
                <div style={{ padding: "7px 12px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" disabled={rates.length >= RC_MAX}
                    onClick={() => { setFocusIdx(rates.length); setRates(rs => [...rs, ""]); }}
                    style={{ padding: "6px 12px", borderRadius: 7, border: `1.5px dashed ${rates.length >= RC_MAX ? T.b1 : T.ind}`, background: T.surface,
                      color: rates.length >= RC_MAX ? T.t4 : T.ind, fontSize: 12, fontWeight: 700, cursor: rates.length >= RC_MAX ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {t("trip_tracking.rc_add_km")}
                  </button>
                  {rates.length >= RC_MAX && <span style={{ fontSize: 11, color: T.t4 }}>{t("trip_tracking.rc_max", { n: RC_MAX })}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: T.surfaceB }}>
                  <span style={{ width: 120 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.rc_onward")}</span>
                    <span style={{ display: "block", fontSize: 10.5, color: T.t4 }}>{t("trip_tracking.rc_onward_from", { nth: nth(rates.length + 1) })}</span>
                  </span>
                  <RupeeInput value={onward} bad={tried && badOnward} onChange={setOnward} />
                </div>
              </div>

              <div style={secT}>{t("trip_tracking.rc_round")}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.keys(RC_ROUND).map(k => (
                  <label key={k} style={optCard(round === k)}>
                    <input type="radio" name="rc_round" checked={round === k} onChange={() => setRound(k)} style={{ marginTop: 2, accentColor: T.ind }} />
                    <span>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{RC_ROUND[k].label}</span>
                      <span style={{ display: "block", fontSize: 11, color: T.t3, marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{RC_ROUND[k].hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div style={secT}>{t("trip_tracking.rc_note")}</div>
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder={t("trip_tracking.rc_note_ph")} style={inp} />
        </div>

        {/* ── Daayan: chalta-phirta example ── */}
        <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, background: T.surface, padding: 14, position: "sticky", top: 8, marginTop: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.rc_ex_title")}</div>
          <div style={{ fontSize: 11, color: T.t4, margin: "2px 0 10px", lineHeight: 1.45 }}>{kind === "trip" ? t("trip_tracking.rt_ex_trip_sub") : t("trip_tracking.rc_ex_sub")}</div>
          {kind === "trip" ? (
            <>
              <div style={lblS}>{t("trip_tracking.rt_ex_trips")}</div>
              <input value={exTrips} inputMode="numeric" onChange={e => setExTrips(e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inp, width: 120, fontVariantNumeric: "tabular-nums" }} />
              <div style={{ marginTop: 12, fontSize: 12.5, color: T.t2, lineHeight: 1.7, fontVariantNumeric: "tabular-nums" }}>
                {badTrip || exTripN == null
                  ? <div style={{ color: T.amb, fontWeight: 600 }}>{t("trip_tracking.rt_ex_trip_fill")}</div>
                  : <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span>{t("trip_tracking.rt_ex_trip_line", { n: exTripN, rate: rs2(tripRate) })}</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: T.ind }}>{rs2(r2(exTripN * Number(tripRate)))}</span>
                    </div>}
              </div>
            </>
          ) : (
            <>
              <div style={lblS}>{t("trip_tracking.rc_ex_km")}</div>
              <input value={exKm} inputMode="decimal" onChange={e => setExKm(e.target.value.replace(/[^0-9.]/g, ""))} style={{ ...inp, width: 120, fontVariantNumeric: "tabular-nums" }} />
              <div style={{ marginTop: 12, fontSize: 12.5, color: T.t2, lineHeight: 1.7, fontVariantNumeric: "tabular-nums" }}>
                {!exOk && <div style={{ color: T.t4 }}>{t("trip_tracking.rc_ex_km_daalo")}</div>}
                {exOk && !complete && <div style={{ color: T.amb, fontWeight: 600 }}>{t("trip_tracking.rc_ex_fill")}</div>}
                {exOk && complete && (
                  <>
                    <div>{t("trip_tracking.rc_ex_round", { km: fmtKm(Number(exKm)), k: fmtKm(K), how: RC_ROUND[round].how })}</div>
                    {K > 0
                      ? <div style={{ color: T.t1 }}>{formula} = <b>{rs2(amt)}</b></div>
                      : <div style={{ color: T.t4 }}>{t("trip_tracking.rc_ex_zero")}</div>}
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.b1}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: T.t3, fontWeight: 600 }}>{t("trip_tracking.rc_ex_banega", { method: RC_METHOD[method].label })}</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: T.ind }}>{rs2(amt)}</span>
                    </div>
                    {K > 0 && other !== amt && (
                      <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("trip_tracking.rc_ex_other", { method: RC_METHOD[method === "slab" ? "cumulative" : "slab"].label, amt: rs2(other) })}</div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {tried && err && <div style={{ marginTop: 12, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", marginTop: 12 }}>
        {!editing && <span style={{ fontSize: 11, color: T.t4, marginRight: "auto" }}>{t("trip_tracking.rt_save_ke_baad_gaadi")}</span>}
        <button onClick={onCancel} type="button" style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
        <button onClick={save} disabled={saving} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: saving ? T.b1 : T.ind, color: saving ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{saving ? t("common.saving_2") : t("trip_tracking.rc_save")}</button>
      </div>
    </div>
  );
}

// ── Gaadi select karo ─────────────────────────────────────────────
// Card kis gaadi par lage. Sirf chalu trip gaadi; vendor wale card par sirf
// usi vendor ki. Chhanni: vendor (Sab vendor card par), capacity (card ki
// capacity pehle se chuni), aur khoj. Save se pehle server se poochte hain
// (preview) — kaunsi gaadi kis card se aa rahi hai, kiska billing badlega
// (Mahina wali gaadi bhi), kaunsi hat rahi hai — aur wahi dikha kar pakka.
function VehiclePicker({ tpl, trucks, parties, onCancel, onSaved }) {
  const kindLbl = RT_KIND[tpl.kind === "trip" ? "trip" : "km"].label;
  const cands = (trucks || []).filter(r => r.is_trip_vehicle && Number(r.is_active) !== 0
    && (tpl.vendor_id == null || String(truckVendorId(r)) === String(tpl.vendor_id)))
    .sort((a, b) => String(a.registration_no || a.name || "").localeCompare(String(b.registration_no || b.name || "")));
  const [sel, setSel] = useState(() => new Set(cands.filter(r => Number(r.rate_card_id) === Number(tpl.id)).map(r => r.id)));
  const caps = [...new Set(cands.map(capOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const [fCap, setFCap] = useState(tpl.capacity && caps.includes(tpl.capacity) ? tpl.capacity : "");
  const [fVendor, setFVendor] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const vendorOpts = tpl.vendor_id == null
    ? [...new Map(cands.filter(r => truckVendorId(r) != null).map(r => [String(truckVendorId(r)), r.vendor_name || r.default_vendor_name || "#" + truckVendorId(r)])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
    : [];
  const hasNoVendor = tpl.vendor_id == null && cands.some(r => truckVendorId(r) == null);
  const shown = cands.filter(r => (!fCap || capOf(r) === fCap)
    && (!fVendor || (fVendor === "none" ? truckVendorId(r) == null : String(truckVendorId(r)) === fVendor))
    && matchTruck(r, q));
  const allOn = shown.length > 0 && shown.every(r => sel.has(r.id));
  const toggle = (id) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel(s => { const n = new Set(s); shown.forEach(r => (allOn ? n.delete(r.id) : n.add(r.id))); return n; });
  const regOf = (id) => { const r = (trucks || []).find(x => x.id === id); return r ? (r.registration_no || r.name) : "#" + id; };

  const save = async () => {
    const ids = [...sel];
    setBusy(true);
    const p = await api.put(`/trips/rate-templates/${tpl.id}/vehicles?preview=1`, { vehicle_ids: ids });
    if (!p || p.success === false) { setBusy(false); window.alert((p && p.message) || t("trip_tracking.save_fail")); return; }
    const d = p.data || {};
    const lines = [];
    (d.moved_from || []).forEach(m => lines.push(t("trip_tracking.gs_moved_line", { reg: regOf(m.vehicle_id), name: m.from_name || "—" })));
    const mon = (d.billing_changes || []).filter(b => b.from === "monthly");
    const otherB = (d.billing_changes || []).filter(b => b.from !== "monthly");
    if (mon.length) lines.push(t("trip_tracking.gs_monthly_line", { list: mon.map(b => regOf(b.vehicle_id)).join(", "), kind: kindLbl }));
    if (otherB.length) lines.push(t("trip_tracking.gs_billing_line", { n: otherB.length, kind: kindLbl }));
    if (d.removed) lines.push(t("trip_tracking.gs_removed_line", { n: d.removed }));
    if (lines.length && !window.confirm(t("trip_tracking.gs_confirm_title", { name: tpl.name }) + "\n\n" + lines.join("\n") + "\n\n" + t("trip_tracking.gs_confirm_q"))) {
      setBusy(false); return;
    }
    const r = await api.put(`/trips/rate-templates/${tpl.id}/vehicles`, { vehicle_ids: ids });
    setBusy(false);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.save_fail")); return; }
    onSaved(r.data || {});
  };

  const fltS = { ...inp, width: "auto", padding: "7px 10px", fontSize: 12 };
  return (
    <div style={{ padding: "14px 15px", borderBottom: `1px solid ${T.b1}`, background: T.indL + "66" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.gs_title", { name: tpl.name })}</div>
      <div style={{ fontSize: 11, color: T.t3, marginTop: 2, lineHeight: 1.5 }}>
        {kiskaOf(tpl, parties)} · {kindLbl}{tpl.capacity ? " · " + tpl.capacity : ""} — {t("trip_tracking.gs_hint", { kind: kindLbl })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 8px", flexWrap: "wrap" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={t("trip_tracking.gaadi_khoj_ph")}
          style={{ ...fltS, flex: 1, minWidth: 200, borderColor: q ? T.ind : T.b1 }} />
        {tpl.vendor_id == null && (vendorOpts.length > 0 || hasNoVendor) && (
          <select value={fVendor} onChange={e => setFVendor(e.target.value)} style={{ ...fltS, borderColor: fVendor ? T.ind : T.b1 }}>
            <option value="">{t("trip_tracking.rt_sab_vendor")}</option>
            {vendorOpts.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
            {hasNoVendor && <option value="none">{t("trip_tracking.vendor_nahi")}</option>}
          </select>
        )}
        {caps.length > 0 && (
          <select value={fCap} onChange={e => setFCap(e.target.value)} style={{ ...fltS, borderColor: fCap ? T.ind : T.b1 }}>
            <option value="">{t("trip_tracking.sab_capacity")}</option>
            {caps.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, background: T.surface, maxHeight: 360, overflowY: "auto" }}>
        {!trucks && <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading_2")}</div>}
        {trucks && cands.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("trip_tracking.gs_koi_gaadi_nahi")}</div>}
        {trucks && cands.length > 0 && shown.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("trip_tracking.khoj_me_koi_gaadi_nahi")}</div>}
        {shown.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 12px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, cursor: "pointer", position: "sticky", top: 0 }}>
            <input type="checkbox" checked={allOn} onChange={toggleAll} style={{ accentColor: T.ind }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.t2 }}>{t("trip_tracking.gs_sab_dikh_rahi", { n: shown.length })}</span>
          </label>
        )}
        {shown.map(r => {
          const on = sel.has(r.id);
          const elsewhere = r.rate_card_id && Number(r.rate_card_id) !== Number(tpl.id);
          const bm = BILLING[r.trip_billing] || BILLING.trip;
          return (
            <label key={r.id} style={{ display: "grid", gridTemplateColumns: "22px 1.2fr 1.2fr 90px 1.4fr 90px", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${T.b1}`, cursor: "pointer", background: on ? T.indL + "88" : "transparent" }}>
              <input type="checkbox" checked={on} onChange={() => toggle(r.id)} style={{ accentColor: T.ind }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{r.registration_no || r.name}</span>
              <span style={{ fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.vendor_name || r.default_vendor_name || t("trip_tracking.vendor_nahi")}</span>
              <span style={{ fontSize: 11.5, color: capOf(r) ? T.t2 : T.t4 }}>{capOf(r) || "—"}</span>
              <span style={{ fontSize: 11, color: elsewhere ? T.amb : T.t4, fontWeight: elsewhere ? 700 : 500 }}>
                {elsewhere ? t("trip_tracking.gs_pehle_par", { name: r.rate_card_name || "—" })
                  : Number(r.rate_card_id) === Number(tpl.id) ? t("trip_tracking.gs_is_card_par") : ""}
              </span>
              <span><Pill label={bm.label} c={bm.c} bg={bm.bg} /></span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.t2, marginRight: "auto" }}>{t("trip_tracking.gs_n_select", { n: sel.size })}</span>
        <button onClick={onCancel} type="button" style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 12, fontWeight: 600, color: T.t3, cursor: "pointer", fontFamily: "inherit" }}>{t("common.cancel")}</button>
        <button onClick={save} disabled={busy || !trucks} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: busy ? T.b1 : T.ind, color: busy ? T.t4 : "white", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{busy ? t("common.saving_2") : t("trip_tracking.gs_save")}</button>
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
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.bill_generate_fail")); return; }
    window.alert(t("trip_tracking.bill_ban_gaya", { id: r.data.id, amount: rs(r.data.total_amount) }));
    setPreview(null); setVendorId(""); loadBills();
  };
  // Naya server breakdown ko route + billing (km / trip) se baant kar deta hai —
  // har line ka apna b.billing, b.km_billed. Purana server sirf route-wise
  // deta tha; tab preview ki trips se route ka andaza (neeche kmOfRoute).
  // kmOfRoute["route|billing"] me us line ke trip amounts bhi — per-trip line
  // me rate beech me badla ho to "N × rate" ek jhootha ausat ban jaata.
  const kmOfRoute = {};
  let totalKm = 0;
  ((preview && preview.trips) || []).forEach(tr => {
    const keys = [String(tr.route_id || 0), (tr.route_id || 0) + "|" + (tr.billing_snap === "km" ? "km" : "trip")];
    keys.forEach(k => {
      const o = kmOfRoute[k] || (kmOfRoute[k] = { km: 0, kmTrips: 0, amts: new Set() });
      if (tr.km_billed != null) o.km += Number(tr.km_billed) || 0;
      if (tr.billing_snap === "km") o.kmTrips += 1;
      o.amts.add(Number(tr.amount) || 0);
    });
    if (tr.km_billed != null) totalKm += Number(tr.km_billed) || 0;
  });
  const toggleBill = async (b) => {
    if (expanded && expanded.billId === b.id) { setExpanded(null); return; }
    const r = await api.get("/trips/bills/" + b.id);
    setExpanded({ billId: b.id, trips: r && r.success ? (r.data.trips || []) : [] });
  };

  return (
    <div>
      <Panel style={{ marginBottom: 12 }}>
        <div style={{ padding: "12px 15px", display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}><div style={lblS}>{t("common.vendor")}</div>
            <select value={vendorId} onChange={e => setVendorId(e.target.value ? Number(e.target.value) : "")} style={inp}>
              <option value="">{t("trip_tracking.vendor_chuniye")}</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div><div style={lblS}>{t("common.from")}</div><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, width: 150 }} /></div>
          <div><div style={lblS}>{t("common.to")}</div><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, width: 150 }} /></div>
        </div>

        {vendorId && (
          <div style={{ padding: "0 15px 15px" }}>
            {loadingPrev && <div style={{ color: T.t4, fontSize: 12.5, padding: "6px 0" }}>{t("trip_tracking.preview_le_raha")}</div>}
            {!loadingPrev && preview && preview.trip_count === 0 && <div style={{ color: T.t4, fontSize: 12.5, padding: "6px 0" }}>{t("trip_tracking.is_vendor_ki_is_range_me")}</div>}
            {!loadingPrev && preview && preview.trip_count > 0 && (
              <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t3, marginBottom: 8 }}>{t("trip_tracking.trip_count_verified_trips", { trip_count: preview.trip_count })}</div>
                {preview.breakdown.map((b, i) => {
                  const rate = b.trips ? Math.round(b.amount / b.trips) : 0;
                  // Km wali trips ka rate har trip par alag hota hai (doori se) —
                  // wahan "N × rate" jhooth hai, isliye "trips · km · ₹".
                  // (Har trip ka amount ek jaisa ho to "N × rate" hi sach hai.)
                  const k = b.billing ? kmOfRoute[(b.route_id || 0) + "|" + b.billing] : kmOfRoute[String(b.route_id || 0)];
                  const kmRow = b.billing
                    ? b.billing === "km"
                    : !!k && (k.kmTrips > 0 || Number(b.km_trips) > 0 || (k.km > 0 && k.amts.size > 1));
                  const mixedRate = !!k && k.amts.size > 1;
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                      <span style={{ color: T.t2 }}>
                        {kmRow
                          ? t("trip_tracking.bp_route_km", { route: b.route_name, trips: b.trips, km: fmtKm(b.km_billed != null ? b.km_billed : (k ? k.km : 0)) })
                          : mixedRate
                            ? <>{b.route_name} · {t("trip_tracking.n_trips", { n: b.trips })}</>
                            : <>{b.route_name} · {b.trips} × {rs(rate)}</>}
                      </span>
                      <span style={{ color: T.t1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{rs(b.amount)}</span>
                    </div>
                  );
                })}
                {totalKm > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12, color: T.t3 }}>
                    <span>{t("trip_tracking.bp_total_km")}</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t("trip_tracking.n_km", { n: fmtKm(totalKm) })}</span>
                  </div>
                )}
                <div style={{ height: 1, background: T.b1, margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{t("trip_tracking.total_payable")}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: T.grn, fontVariantNumeric: "tabular-nums" }}>{rs(preview.total_amount)}</span>
                </div>
                <div style={{ fontSize: 10.5, color: T.t4, marginTop: 8 }}>{t("trip_tracking.sirf_verified_approved_trips_billed_trips")}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  {canBillTrips()
                    ? <button onClick={generate} disabled={generating} type="button" style={{ padding: "9px 20px", borderRadius: 7, border: "none", background: generating ? T.b1 : T.blu, color: generating ? T.t4 : "white", fontSize: 12.5, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{generating ? t("trip_tracking.generating") : t("trip_tracking.generate_bill")}</button>
                    : <span style={{ fontSize: 11.5, color: T.t4 }}>{t("trip_tracking.bill_finance_create_chahiye")}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel>
        <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.bills_bills", { bills: bills.length ? `(${bills.length})` : "" })}</span>
        </div>
        {bills.length === 0 && <div style={{ textAlign: "center", padding: "30px 20px", color: T.t4, fontSize: 13 }}>{t("trip_tracking.abhi_koi_bill_nahi_bana")}</div>}
        {bills.map(b => (
          <div key={b.id} style={{ borderBottom: `1px solid ${T.b1}` }}>
            <div onClick={() => toggleBill(b)} style={{ display: "grid", gridTemplateColumns: "80px 1.4fr 1.4fr 100px 120px", padding: "10px 15px", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>#{b.id}</span>
              <span style={{ fontSize: 12.5, color: T.t1 }}>{b.vendor_name || "—"}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{String(b.from_date).slice(0, 10)} → {String(b.to_date).slice(0, 10)}</span>
              <span style={{ fontSize: 12, color: T.t2, fontVariantNumeric: "tabular-nums" }}>{t("trip_tracking.n_trips", { n: b.trip_count })}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums", justifySelf: "end" }}>{rs(b.total_amount)}</span>
            </div>
            {expanded && expanded.billId === b.id && (
              <div style={{ padding: "6px 15px 12px", background: T.surfaceB }}>
                {expanded.trips.length === 0 && <div style={{ fontSize: 11.5, color: T.t4, padding: "6px 0" }}>{t("trip_tracking.koi_trip_detail_nahi")}</div>}
                {expanded.trips.map(item6 => (
                  <div key={item6.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11.5 }}>
                    <span style={{ color: T.t3 }}>{(item6.registration_no || t("trip_tracking.truck"))} · #{item6.trip_no} · {item6.route_name || "—"}{item6.km_billed != null ? " · " + t("trip_tracking.n_km", { n: fmtKm(item6.km_billed) }) : ""}</span>
                    <span style={{ color: T.t1, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{rs(item6.amount)}</span>
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
function BtnOutline({ label, color, busy, onClick }) {
  return <button onClick={onClick} disabled={busy} type="button" style={{ padding: "8px 16px", borderRadius: 7, border: `1.5px solid ${color}`, background: T.surface, color, fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{label}</button>;
}
function BtnSolid({ label, color, busy, onClick }) {
  return <button onClick={onClick} disabled={busy} type="button" style={{ padding: "8px 18px", borderRadius: 7, border: "none", background: color, color: "white", fontSize: 12, fontWeight: 700, cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{label}</button>;
}

export default TabTripTracking;
