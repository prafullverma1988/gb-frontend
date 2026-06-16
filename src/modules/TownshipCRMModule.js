// ════════════════════════════════════════════════════════════════
// TOWNSHIP CRM — Brief 1 of 3 (Sales Core) — backend-wired
// ────────────────────────────────────────────────────────────────
// 9-tab module for the "Anadi Ananta" township. Brief 1 wires the
// Sales Core to the live /api/township-crm backend:
//   - Inventory tab, Prospects tab, Unit Detail Modal (Overview +
//     Interested Leads + Followup History), "+ Add unit", Seed button.
// Bookings / Customizations / Reports / Construction stay on DUMMY_*
// data — Brief 2/3 replace those.
//
// KEY DECISIONS (judgment calls where the spec was ambiguous):
//  - DECISION: `api` (config/api.js) is a custom fetch wrapper, NOT
//    axios — `api.get()` resolves to the parsed body directly. So we
//    use `res.success` / `res.data`, not the brief's `res.data.data`
//    (which assumed axios). Delete uses `api.del` (no `api.delete`).
//  - DECISION: PROSPECT_STAGES (old display-label array) is replaced
//    by STAGE_ORDER (snake_case enum order) + STAGE_DISPLAY (labels),
//    since Kanban grouping now keys off the backend stage enum.
//  - DECISION: BatchesTab is wired to real batches (forced by the
//    DUMMY_BATCHES deletion). Construction stage/progress comes from
//    Brief 3's construction sync — for Brief 1 the pill shows the
//    unit-generation count and the bar uses linked_project_progress
//    (0 until the projects table exposes it).
//  - DECISION: has_mod stays hardcoded in MOD_UNITS for Brief 1;
//    Brief 3 fetches from township_unit_customizations.
//  - DECISION: units are sorted numerically by unit_no (A-1..A-30,
//    B-1..B-50, C-1..C-22) so the master grid matches the mockup row
//    layout — the backend returns string-sorted order.
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../config/api";

// ── THEME TOKENS ──────────────────────────────────────────────
const T = {
  bg:"#F8FAFC", surface:"#FFFFFF", hdr:"#0D1B2A",
  t1:"#0F172A", t2:"#475569", t3:"#94A3B8",
  b1:"#E2E8F0", b2:"#CBD5E1",
  pri:"#2563EB", priL:"#EFF6FF", priD:"#1D4ED8",
  ambL:"#FEF3C7", grnL:"#DCFCE7", redL:"#FEE2E2",
  gryL:"#F1F5F9",
  // KPI accent colours (spec palette)
  kGrn:"#27500A", kAmb:"#854F0B", kBlu:"#0C447C", kGry:"#444441",
};

// ── UNIT STATUS COLOURS (Master Grid) ─────────────────────────
const UNIT_STATUS = {
  AVAILABLE:{ bg:"#FFFFFF", brd:"#CBD5E1", txt:"#0F172A", label:"Available" },
  FOLLOWUP :{ bg:"#FAEEDA", brd:"#EF9F27", txt:"#633806", label:"Followup" },
  HOLD     :{ bg:"#FAECE7", brd:"#D85A30", txt:"#712B13", label:"Hold" },
  BOOKED   :{ bg:"#B5D4F4", brd:"#378ADD", txt:"#0C447C", label:"Booked" },
  SOLD     :{ bg:"#0C447C", brd:"#0C447C", txt:"#FFFFFF", label:"Sold" },
  BLOCKED  :{ bg:"#D3D1C7", brd:"#888780", txt:"#444441", label:"Blocked" },
};

// ── PILL TONES ────────────────────────────────────────────────
const PILL_TONES = {
  blue  :{ bg:"#E6F1FB", c:"#0C447C", b:"#85B7EB" },
  green :{ bg:"#EAF3DE", c:"#27500A", b:"#97C459" },
  amber :{ bg:"#FAEEDA", c:"#633806", b:"#EF9F27" },
  coral :{ bg:"#FAECE7", c:"#712B13", b:"#F0997B" },
  gray  :{ bg:"#F1EFE8", c:"#444441", b:"#B4B2A9" },
  purple:{ bg:"#EEEDFE", c:"#3C3489", b:"#AFA9EC" },
  navy  :{ bg:"#0C447C", c:"#FFFFFF", b:"#0C447C" },
};
const TONE_FILL = { blue:"#378ADD", amber:"#EF9F27", coral:"#D85A30", gray:"#B4B2A9", green:"#97C459" };

// ── UTILITY ───────────────────────────────────────────────────
// Compact INR formatter — strips trailing .00 so 3400000 → "₹34L".
const inr = (n) => {
  const num = Number(n) || 0;
  if (num >= 10000000) { const v = num/10000000; return `₹${v%1===0?v:v.toFixed(2)}Cr`; }
  if (num >= 100000)   { const v = num/100000;   return `₹${v%1===0?v:v.toFixed(2)}L`; }
  if (num >= 1000)     { const v = num/1000;     return `₹${v%1===0?v:v.toFixed(1)}K`; }
  return `₹${num.toLocaleString("en-IN")}`;
};
const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
};
// Numeric sort key for unit_no like "A-15" → ["A", 15]
const unitSortKey = (uno) => {
  const m = String(uno || "").match(/^([A-Za-z]+)-?(\d+)/);
  return m ? [m[1], parseInt(m[2], 10)] : [String(uno || ""), 0];
};
// Compact INR — "₹X.XCr" / "₹X.XL"; "—" for empty (Bookings / Reports / Payments).
const formatINR = (n) => {
  if (n == null || n === 0) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};
// Activity-feed backend tone name → colour.
const ACTIVITY_TONE = { green:"#27500A", blue:"#0C447C", purple:"#3C3489", amber:"#854F0B", gray:"#64748B" };

// ── CONSTANTS ─────────────────────────────────────────────────
// has_mod is now derived from the live customizations list (Brief 3).
const FACINGS = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];

// Batch types — mirrors backend BATCH_TYPES enum (township-crm.js).
// A batch is either a row-house cluster or a flat tower (both hold units),
// or a floor group / phase grouping.
const BATCH_TYPE_OPTIONS = [
  { value: "row_house_cluster", label: "Row House Cluster" },
  { value: "tower",            label: "Tower" },
  { value: "floor_group",      label: "Floor Group" },
  { value: "phase",            label: "Phase" },
];
const BATCH_TYPE_LABEL = Object.fromEntries(BATCH_TYPE_OPTIONS.map(o => [o.value, o.label]));

// Auto-derive a unit prefix from a batch — first letter of the batch name
// (falls back to batch_no's letters). Editable by the user in the modal.
function derivePrefix(batch) {
  const src = (batch?.batch_name || batch?.batch_no || "").trim();
  const letters = (src.match(/[A-Za-z]+/) || [""])[0];
  return (letters ? letters[0] : src[0] || "A").toUpperCase();
}

// Backend stage enum → display label (Kanban grouping keys off the enum).
const STAGE_DISPLAY = {
  new_inquiry: "New inquiry",
  site_visit:  "Site visit",
  interested:  "Interested",
  hold:        "Hold",
  booked:      "Booked",
  lost:        "Lost",
};
const STAGE_ORDER = ["new_inquiry", "site_visit", "interested", "hold", "booked", "lost"];

// Followup action_type → timeline icon + colour.
const ACTION_ICON = {
  site_visit:   { icon:"check", color:T.kBlu },
  token_paid:   { icon:"rupee", color:T.kGrn },
  booking_done: { icon:"rupee", color:T.kBlu },
  negotiation:  { icon:"info",  color:T.kAmb },
  call:         { icon:"info",  color:T.t3  },
  whatsapp:     { icon:"info",  color:T.kGrn },
  lost:         { icon:"info",  color:"#B4453A" },
  note:         { icon:"info",  color:T.t3  },
};

// Bookings / Customizations / Construction / Activity feed are now all
// backend-driven (Brief 2/3). The only static list left is the report
// chip labels below — most are placeholders, "Stuck units" is live.
const REPORT_LINKS = [
  "Inventory absorption","Source ROI analysis","Revenue forecast",
  "Stuck units (30+ days)","Customer payment aging","Modification register",
];

const TABS = ["Dashboard","Inventory","Batches","Prospects","Bookings","Customizations","Construction","Reports","Settings"];

// ════════════════════════════════════════════════════════════════
// SHARED MINI-COMPONENTS
// ════════════════════════════════════════════════════════════════
const SvgIco = ({ type, color, size=14 }) => {
  const paths = {
    check :"M20 6L9 17l-5-5",
    link  :"M9.5 13.5a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14.5 10.5a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
    hammer:"M14 13l-7 7a2 2 0 01-3-3l7-7M13 7l4 4M16.5 3.5l4 4-3 3-4-4z",
    info  :"M12 16v-4M12 8h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    ext   :"M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5",
    file  :"M14 3v5h5M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5z",
  };
  if (type === "rupee" || type === "money") {
    return <span style={{ color, fontWeight:700, fontSize:size+1, lineHeight:1, width:size, textAlign:"center", flexShrink:0 }}>₹</span>;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
      <path d={paths[type] || paths.info}/>
    </svg>
  );
};

const Pill = ({ label, tone="gray", style }) => {
  const t = PILL_TONES[tone] || PILL_TONES.gray;
  return (
    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:10,
      fontWeight:600, background:t.bg, color:t.c, border:`1px solid ${t.b}`, whiteSpace:"nowrap", ...style }}>
      {label}
    </span>
  );
};

const Chip = ({ label, active, onClick, style, icon }) => (
  <span onClick={onClick} style={{
    padding:"4px 11px", fontSize:11, borderRadius:14, whiteSpace:"nowrap",
    cursor: onClick ? "pointer" : "default", userSelect:"none",
    background: active ? T.priL : T.surface,
    color: active ? T.pri : T.t2,
    border:`1px solid ${active ? T.pri : T.b1}`,
    display:"inline-flex", alignItems:"center", gap:5, ...style,
  }}>{icon}{label}</span>
);

const Btn = ({ label, primary, danger, small, onClick, icon, disabled }) => {
  const bg = primary ? T.pri : danger ? "#FFFFFF" : T.surface;
  const fg = primary ? "#FFFFFF" : danger ? "#B4453A" : T.t1;
  const bd = primary ? T.pri : danger ? "#F0997B" : T.b2;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? "5px 10px" : "7px 13px", fontSize: small ? 11.5 : 12.5, fontWeight:500,
      background:bg, color:fg, border:`1px solid ${bd}`, borderRadius:6,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
      display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap",
    }}>{icon}{label}</button>
  );
};

const KPI = ({ label, value, sub, color, title }) => (
  <div title={title} style={{ background:T.gryL, padding:"10px 12px", borderRadius:8, minWidth:0 }}>
    <div style={{ fontSize:10.5, color:T.t2, textTransform:"uppercase", letterSpacing:0.4, marginBottom:3 }}>{label}</div>
    <div style={{ fontSize:19, fontWeight:600, lineHeight:1.2, color: color || T.t1 }}>{value}</div>
    {sub && <div style={{ fontSize:10.5, color:T.t3, marginTop:2 }}>{sub}</div>}
  </div>
);

const ProgBar = ({ pct, color=T.pri }) => (
  <div style={{ height:6, background:T.gryL, borderRadius:3, overflow:"hidden", width:"100%" }}>
    <div style={{ height:"100%", width:`${Math.max(0,Math.min(100,pct))}%`, background:color, borderRadius:3 }}/>
  </div>
);

const SectionH = ({ children, style }) => (
  <div style={{ fontSize:11, fontWeight:600, color:T.t2, textTransform:"uppercase",
    letterSpacing:0.5, margin:"14px 0 7px", ...style }}>{children}</div>
);

const Note = ({ children, tone="info" }) => {
  const c = tone === "warning"
    ? { bg:T.ambL, brd:"#EF9F27", txt:"#633806" }
    : { bg:T.priL, brd:T.pri,     txt:T.priD };
  return (
    <div style={{ display:"flex", gap:7, alignItems:"flex-start", padding:"8px 12px",
      background:c.bg, borderLeft:`3px solid ${c.brd}`, fontSize:11.5, color:c.txt,
      borderRadius:"0 6px 6px 0", marginTop:12, lineHeight:1.5 }}>
      <SvgIco type="info" color={c.brd} size={13}/>
      <span>{children}</span>
    </div>
  );
};

const BarChart = ({ bars }) => (
  <div style={{ height:104, background:T.gryL, borderRadius:8, padding:10,
    display:"flex", alignItems:"flex-end", gap:5 }}>
    {bars.map((b,i) => (
      <div key={i} title={`${b.h}%`} style={{ flex:1, height:`${b.h}%`, minHeight:8,
        background: b.light ? "#85B7EB" : "#378ADD", borderRadius:"3px 3px 0 0" }}/>
    ))}
  </div>
);

// Frame = titled card matching the mockup's frame/header/body layout.
function Frame({ title, sub, right, children }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, overflow:"hidden" }}>
      <div style={{ background:T.bg, padding:"11px 16px", borderBottom:`1px solid ${T.b1}`,
        display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:600, color:T.t1 }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:T.t2, marginTop:1 }}>{sub}</div>}
        </div>
        {right}
      </div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

// ── Form-modal shell + field styles (for Add Unit / Add Prospect) ──
const inputStyle = {
  width:"100%", padding:"7px 10px", fontSize:12.5, border:`1px solid ${T.b2}`,
  borderRadius:6, outline:"none", boxSizing:"border-box", fontFamily:"inherit",
  background:T.surface, color:T.t1,
};
const labelStyle = { fontSize:11, fontWeight:600, color:T.t2, marginBottom:4, display:"block" };

function Modal({ title, onClose, children, width=480 }) {
  return createPortal(
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)",
      zIndex:9000, display:"flex", alignItems:"flex-start", justifyContent:"center",
      overflowY:"auto", padding:"40px 16px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background:T.surface, borderRadius:12,
        width:"100%", maxWidth:width, boxShadow:"0 24px 60px rgba(0,0,0,0.28)", overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b1}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:15, fontWeight:700, color:T.t1 }}>{title}</span>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            fontSize:24, lineHeight:1, color:T.t2, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ padding:18, maxHeight:"70vh", overflowY:"auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

// Window-width hook → drives responsive master-grid column count.
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ════════════════════════════════════════════════════════════════
// MAIN MODULE
// ════════════════════════════════════════════════════════════════
export default function TownshipCRMModule() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  // ── Live backend state ──────────────────────────────────────
  const [project, setProject] = useState(null);
  const [units, setUnits] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [customizations, setCustomizations] = useState([]);
  const [constructionSync, setConstructionSync] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [salesVelocity, setSalesVelocity] = useState({ months:[], max_count:0, avg_per_month:0 });
  const [typeDemand, setTypeDemand] = useState([]);
  const [revenueForecast, setRevenueForecast] = useState({ total_potential:0, booked_value:0, collected:0 });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // ── Modal / selection state ─────────────────────────────────
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitDetail, setUnitDetail] = useState(null);
  const [unitDetailLoading, setUnitDetailLoading] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [selectedProspectId, setSelectedProspectId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedCustomization, setSelectedCustomization] = useState(null);
  const [showAddCustomization, setShowAddCustomization] = useState(false);
  const [showStuckUnits, setShowStuckUnits] = useState(false);

  const PROJECT_ID = project?.id;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Get Anadi Ananta (single-project for now — multi-project comes later).
      // DECISION: /projects is ordered newest-first and other projects may
      // exist, so target "Anadi Ananta" by name rather than blindly data[0].
      const pres = await api.get("/township-crm/projects");
      const list = pres?.data || [];
      const proj = list.find(p => p.name === "Anadi Ananta") || list[0] || null;
      setProject(proj);
      if (!proj) { setLoading(false); return; }

      // 2. Get all child resources in parallel
      const base = `/township-crm/projects/${proj.id}`;
      const [unitsRes, prospectsRes, batchesRes, detailRes, bookingsRes,
             customizationsRes, constructionRes, activityRes,
             velocityRes, demandRes, revenueRes] = await Promise.all([
        api.get(`${base}/units`),
        api.get(`${base}/prospects`),
        api.get(`${base}/batches`),
        api.get(`${base}`),
        api.get(`${base}/bookings-summary`),
        api.get(`${base}/customizations`),
        api.get(`${base}/construction-sync`),
        api.get(`${base}/activity-feed?limit=4`),
        api.get(`${base}/reports/sales-velocity?days=180`),
        api.get(`${base}/reports/type-demand`),
        api.get(`${base}/reports/revenue-forecast`),
      ]);
      setUnits(unitsRes?.data || []);
      setProspects(prospectsRes?.data || []);
      setBatches(batchesRes?.data || []);
      setUnitTypes(detailRes?.data?.unit_types || []);
      setBookings(bookingsRes?.data || []);
      setCustomizations(customizationsRes?.data || []);
      setConstructionSync(constructionRes?.data || []);
      setActivityFeed(activityRes?.data || []);
      setSalesVelocity(velocityRes?.data || { months:[], max_count:0, avg_per_month:0 });
      setTypeDemand(demandRes?.data || []);
      setRevenueForecast(revenueRes?.data || { total_potential:0, booked_value:0, collected:0 });
    } catch (err) {
      console.error("loadAll failed:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── has_mod set — derived from live customizations (Brief 3) ─
  const modUnitNos = useMemo(() => {
    const set = new Set();
    for (const c of customizations) {
      if (c.kind === "modification") {
        const m = String(c.title || "").match(/^([A-Za-z]+-\d+)/);
        if (m) set.add(m[1]);
      }
    }
    return set;
  }, [customizations]);

  // ── Shape adapter — preserve the component contracts the
  //    visual layer was written against (batch label, has_mod, merge).
  const unitsViewModel = useMemo(() => {
    const vm = units.map(u => {
      const batchShort = (u.batch_no || "").replace(/^B-?0*/, "B");
      let merge = null;
      if (u.merger_group_id) {
        const partner = units.find(x => x.merger_group_id === u.merger_group_id && x.id !== u.id);
        if (partner) {
          const side = u.unit_no < partner.unit_no ? "left" : "right";
          merge = { group: u.merger_group_id, side, partner: partner.unit_no };
        }
      }
      return {
        ...u,
        batch: batchShort,
        has_mod: modUnitNos.has(u.unit_no),
        merge,
        bhk: u.bhk != null ? Number(u.bhk) : null,
        built_up_area: u.built_up_area_sqft,
        plot_area: u.plot_area_sqft,
        final_price: u.final_offered_price,
      };
    });
    // Numeric sort so the master grid matches the mockup row layout.
    vm.sort((a, b) => {
      const [pa, na] = unitSortKey(a.unit_no);
      const [pb, nb] = unitSortKey(b.unit_no);
      return pa < pb ? -1 : pa > pb ? 1 : na - nb;
    });
    return vm;
  }, [units, modUnitNos]);

  const UNIT_SUMMARY_LIVE = useMemo(() => {
    return unitsViewModel.reduce((acc, u) => {
      acc.total += 1;
      const k = String(u.status || "").toLowerCase();
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, { total:0, available:0, followup:0, hold:0, booked:0, sold:0, blocked:0 });
  }, [unitsViewModel]);

  // ── Unit detail fetch (Unit Detail Modal) ───────────────────
  const openUnitDetail = async (unit) => {
    setSelectedUnit(unit);
    setUnitDetailLoading(true);
    setUnitDetail(null);
    try {
      const res = await api.get(`/township-crm/units/${unit.id}/detail`);
      if (res?.success) setUnitDetail(res.data);
    } catch (e) { console.error("unit detail:", e); }
    setUnitDetailLoading(false);
  };
  const closeUnitDetail = () => { setSelectedUnit(null); setUnitDetail(null); };

  // "Open in Projects" — the app navigates modules via Alt+key keydown
  // (App.js maps Alt+J → projects). Dispatch a synthetic event.
  // DECISION: deep-linking to a specific construction project would need
  // App.js changes (out of scope) — this opens the Projects module list.
  const handleOpenProject = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key:"j", altKey:true, bubbles:true }));
  };

  // ── Seed Demo Data ──────────────────────────────────────────
  const handleSeed = async () => {
    if (!await window.confirmAsync("Existing units + prospects delete ho jayenge. Continue?")) return;
    setSeeding(true);
    try {
      const res = await api.post("/township-crm/seed-demo", { wipe_existing: true });
      if (res?.success) {
        const d = res.data;
        alert(`Seeded: ${d.units_created} units, ${d.prospects_created} prospects, ${d.customers_created} customers, ${d.bookings_created} bookings, ${d.payments_created} payments, ${d.customizations_created} customizations`);
        await loadAll();
      } else {
        alert("Seed failed: " + (res?.message || "unknown error"));
      }
    } catch (e) {
      alert("Seed failed: " + (e?.message || e));
    }
    setSeeding(false);
  };

  // ── Loading / empty states ──────────────────────────────────
  if (loading) {
    return <div style={{ padding:40, textAlign:"center", color:T.t2, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>Loading…</div>;
  }
  if (!project) {
    return (
      <div style={{ padding:40, textAlign:"center", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ fontSize:14, color:T.t1, marginBottom:8, fontWeight:600 }}>No township project found</div>
        <div style={{ fontSize:12, color:T.t2 }}>Backend may not be seeded. Check Settings tab for Seed Demo Data button.</div>
      </div>
    );
  }

  return (
    <div style={{ background:T.bg, minHeight:"100%", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* ── TOP HEADER (dark navy) ─────────────────────────────── */}
      <div style={{ background:T.hdr, padding:"14px 20px", display:"flex",
        justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:"#FFFFFF" }}>{project.name}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>
            {project.city || "—"}, {project.state || "—"} · {UNIT_SUMMARY_LIVE.total} units · Phase-1 · RERA: {project.rera_no || "—"}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {/* Export — visual only per spec */}
          <button style={{ padding:"7px 13px", fontSize:12.5, fontWeight:500, borderRadius:6,
            background:"rgba(255,255,255,0.08)", color:"#FFFFFF",
            border:"1px solid rgba(255,255,255,0.18)", cursor:"pointer" }}>Export</button>
          <button onClick={() => setShowAddUnit(true)} style={{ padding:"7px 13px", fontSize:12.5,
            fontWeight:500, borderRadius:6, background:T.pri, color:"#FFFFFF",
            border:`1px solid ${T.pri}`, cursor:"pointer" }}>+ Add unit</button>
        </div>
      </div>

      {/* ── TAB NAVIGATION ─────────────────────────────────────── */}
      <div style={{ display:"flex", gap:3, padding:"8px 14px", background:T.surface,
        borderBottom:`1px solid ${T.b1}`, overflowX:"auto" }}>
        {TABS.map(tab => {
          const on = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding:"7px 13px", fontSize:12, fontWeight: on ? 600 : 500, borderRadius:7,
              whiteSpace:"nowrap", cursor:"pointer",
              background: on ? T.priL : "transparent",
              color: on ? T.pri : T.t2,
              border:`1px solid ${on ? T.pri : "transparent"}`,
            }}>{tab}</button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────── */}
      <div style={{ padding:"16px 20px" }}>
        {activeTab === "Dashboard"      && <DashboardTab summary={UNIT_SUMMARY_LIVE} units={unitsViewModel}
          activityFeed={activityFeed} constructionSync={constructionSync}
          salesVelocity={salesVelocity} revenueForecast={revenueForecast}/>}
        {activeTab === "Inventory"      && <InventoryTab units={unitsViewModel} summary={UNIT_SUMMARY_LIVE} unitTypes={unitTypes} onUnitClick={openUnitDetail}/>}
        {activeTab === "Batches"        && <BatchesTab batches={batches} projectId={PROJECT_ID} unitTypes={unitTypes} onChanged={loadAll}/>}
        {activeTab === "Prospects"      && <ProspectsTab prospects={prospects} onAdd={() => setShowAddProspect(true)} onProspectClick={setSelectedProspectId}/>}
        {activeTab === "Bookings"       && <BookingsTab bookings={bookings} onRowClick={setSelectedBooking}/>}
        {activeTab === "Customizations" && <CustomizationsTab customizations={customizations}
          onAdd={() => setShowAddCustomization(true)} onCardClick={setSelectedCustomization}/>}
        {activeTab === "Construction"   && <ConstructionTab constructionSync={constructionSync} onOpenProject={handleOpenProject}/>}
        {activeTab === "Reports"        && <ReportsTab salesVelocity={salesVelocity} typeDemand={typeDemand}
          revenueForecast={revenueForecast} onStuckUnits={() => setShowStuckUnits(true)}/>}
        {activeTab === "Settings"       && <SettingsTab project={project} unitTypes={unitTypes} seeding={seeding} onSeed={handleSeed} projectId={PROJECT_ID} onChanged={loadAll}/>}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────── */}
      {selectedUnit && (
        <UnitDetailModal unit={selectedUnit} detail={unitDetail}
          loading={unitDetailLoading} onClose={closeUnitDetail}
          onRefresh={() => { loadAll(); openUnitDetail(selectedUnit); }}
          onOpenProject={handleOpenProject}/>
      )}
      {showAddUnit && (
        <AddUnitModal projectId={PROJECT_ID} unitTypes={unitTypes} batches={batches}
          onClose={() => setShowAddUnit(false)}
          onSaved={() => { setShowAddUnit(false); loadAll(); }}/>
      )}
      {showAddProspect && (
        <AddProspectModal projectId={PROJECT_ID}
          onClose={() => setShowAddProspect(false)}
          onSaved={() => { setShowAddProspect(false); loadAll(); }}/>
      )}
      {selectedProspectId && (
        <ProspectDetailModal prospectId={selectedProspectId}
          onClose={() => setSelectedProspectId(null)}
          onChanged={loadAll}/>
      )}
      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onChanged={loadAll}/>
      )}
      {selectedCustomization && (
        <CustomizationDetailModal customization={selectedCustomization}
          onClose={() => setSelectedCustomization(null)}
          onChanged={loadAll}/>
      )}
      {showAddCustomization && (
        <CustomizationFormModal projectId={PROJECT_ID} units={unitsViewModel}
          onClose={() => setShowAddCustomization(false)}
          onSaved={() => { setShowAddCustomization(false); loadAll(); }}/>
      )}
      {showStuckUnits && (
        <StuckUnitsModal projectId={PROJECT_ID} onClose={() => setShowStuckUnits(false)}/>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — DASHBOARD
// ════════════════════════════════════════════════════════════════
function DashboardTab({ summary, units, activityFeed, constructionSync, salesVelocity, revenueForecast }) {
  // KPIs — units total/value from the view-model, booked value from the API.
  const totalValue  = units.reduce((s, u) => s + Number(u.final_offered_price || 0), 0);
  const bookedValue = Number(revenueForecast?.booked_value || 0);
  const availPct  = summary.total ? Math.round((summary.available / summary.total) * 100) : 0;
  const absorbPct = totalValue ? Math.round((bookedValue / totalValue) * 100) : 0;

  const typeMix = {};
  units.forEach(u => { typeMix[u.type_code] = (typeMix[u.type_code] || 0) + 1; });
  const mixLabel = Object.keys(typeMix).sort().map(k => typeMix[k]).join(" · ") + " mix";

  const kpis = [
    { label:"Total units",  value:String(summary.total),                 sub:mixLabel,                color:T.t1   },
    { label:"Available",    value:String(summary.available),              sub:`${availPct}% of total`, color:T.kGrn },
    { label:"Followup",     value:String(summary.followup),               sub:"Active prospects",      color:T.kAmb },
    { label:"Booked",       value:String(summary.hold + summary.booked),  sub:"Hold + Booked",         color:T.kBlu },
    { label:"Sold",         value:String(summary.sold),                   sub:"Registration done",     color:T.kBlu },
    { label:"Blocked",      value:String(summary.blocked),                sub:"Promoter hold",         color:T.kGry },
    { label:"Total value",  value:inr(totalValue),                        sub:"Project potential",     color:T.t1   },
    { label:"Booked value", value:inr(bookedValue),                       sub:`${absorbPct}% absorbed`, color:T.t1  },
  ];

  // Construction overall — average % across batches linked to a project.
  const linked = (constructionSync || []).filter(b => b.linked_project_id);
  const avgProg = linked.length
    ? Math.round(linked.reduce((s, b) => s + Number(b.construction_pct || 0), 0) / linked.length) : 0;
  const topBatch = [...(constructionSync || [])]
    .sort((a, b) => Number(b.construction_pct || 0) - Number(a.construction_pct || 0))[0];

  // Sales velocity bars from real monthly bookings.
  const vMax = salesVelocity?.max_count || 1;
  const vBars = (salesVelocity?.months || []).map(m => ({
    h: Math.max(8, Math.round((m.count / vMax) * 100)), label: m.label, count: m.count,
  }));

  return (
    <Frame title="Project overview" sub="Sales aur construction ka summary"
      right={<Chip label="Anadi Ananta ▾"/>}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",
        gap:8, marginBottom:14 }}>
        {kpis.map(k => <KPI key={k.label} {...k}/>)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:12 }}>
        <div>
          <SectionH style={{ marginTop:0 }}>Construction overall</SectionH>
          <div style={{ background:T.gryL, padding:12, borderRadius:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:7 }}>
              <span style={{ color:T.t2 }}>{constructionSync?.length || 0} batches running</span>
              <span style={{ fontWeight:600, color:T.t1 }}>{avgProg}% avg</span>
            </div>
            <ProgBar pct={avgProg}/>
            <div style={{ fontSize:10.5, color:T.t3, marginTop:7 }}>
              {topBatch
                ? `${topBatch.batch_no} ahead at ${Number(topBatch.construction_pct || 0)}%`
                : "No linked construction projects yet"}
              {linked.length === 0 ? " · construction sync pending" : ""}
            </div>
          </div>
        </div>
        <div>
          <SectionH style={{ marginTop:0 }}>Sales velocity (last 180 days)</SectionH>
          {vBars.length === 0 ? (
            <div style={{ height:104, background:T.gryL, borderRadius:8, display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:11.5, color:T.t3 }}>
              No bookings in the window
            </div>
          ) : (
            <>
              <BarChart bars={vBars}/>
              <div style={{ display:"flex", gap:5, marginTop:4 }}>
                {vBars.map((b, i) => (
                  <div key={i} style={{ flex:1, textAlign:"center", fontSize:9, color:T.t3 }}>{b.label}</div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <SectionH>Recent activity</SectionH>
      {(activityFeed || []).length === 0 ? (
        <div style={{ fontSize:11.5, color:T.t3, padding:"8px 0" }}>No recent activity.</div>
      ) : (
        <div>
          {activityFeed.map((a, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              gap:10, padding:"8px 0",
              borderBottom: i < activityFeed.length-1 ? `1px solid ${T.b1}` : "none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:T.t1 }}>
                <SvgIco type={a.icon} color={ACTIVITY_TONE[a.tone] || T.t3}/>
                <span>{a.text}</span>
              </div>
              <span style={{ fontSize:11, color:T.t3, whiteSpace:"nowrap" }}>{a.when}</span>
            </div>
          ))}
        </div>
      )}
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — INVENTORY (Master Grid)
// ════════════════════════════════════════════════════════════════
function InventoryTab({ units, summary, unitTypes, onUnitClick }) {
  const [typeFilter, setTypeFilter] = useState("ALL");           // ALL | type_code
  const [attr, setAttr] = useState({ garden:false, corner:false, east:false });
  const [hoverId, setHoverId] = useState(null);
  const w = useWindowWidth();
  const cols = w >= 1000 ? 10 : w >= 640 ? 6 : 4;

  const toggleAttr = (k) => setAttr(p => ({ ...p, [k]: !p[k] }));

  const filtered = useMemo(() => units.filter(u =>
    (typeFilter === "ALL" || u.type_code === typeFilter) &&
    (!attr.garden || u.is_garden_facing) &&
    (!attr.corner || u.is_corner) &&
    (!attr.east   || u.facing === "E")
  ), [units, typeFilter, attr]);

  const typeChips = [
    { key:"ALL", label:"All" },
    ...unitTypes.map(t => ({
      key: t.type_code,
      label: `${t.bhk != null ? Number(t.bhk) : "?"}BHK (${units.filter(u => u.type_code === t.type_code).length})`,
    })),
  ];

  const legend = [
    { label:`Available ${summary.available}`, ...UNIT_STATUS.AVAILABLE },
    { label:`Followup ${summary.followup}`,   ...UNIT_STATUS.FOLLOWUP },
    { label:`Hold ${summary.hold}`,           ...UNIT_STATUS.HOLD },
    { label:`Booked ${summary.booked}`,       ...UNIT_STATUS.BOOKED },
    { label:`Sold ${summary.sold}`,           ...UNIT_STATUS.SOLD },
    { label:`Blocked ${summary.blocked}`,     ...UNIT_STATUS.BLOCKED },
  ];

  return (
    <Frame title="Master inventory grid" sub={`${summary.total} units · color = sales status`}>
      {/* Filter bar */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center",
        paddingBottom:12, borderBottom:`1px solid ${T.b1}`, marginBottom:12 }}>
        {typeChips.map(c => (
          <Chip key={c.key} label={c.label} active={typeFilter === c.key}
            onClick={() => setTypeFilter(c.key)}/>
        ))}
        <span style={{ width:1, height:20, background:T.b1, margin:"0 4px" }}/>
        <Chip label="Garden facing" active={attr.garden} onClick={() => toggleAttr("garden")}/>
        <Chip label="Corner"        active={attr.corner} onClick={() => toggleAttr("corner")}/>
        <Chip label="East facing"   active={attr.east}   onClick={() => toggleAttr("east")}/>
        <span style={{ marginLeft:"auto", fontSize:11.5, color:T.t2, fontWeight:500 }}>
          {filtered.length} units shown
        </span>
      </div>

      {/* Master grid */}
      {filtered.length === 0 ? (
        <div style={{ padding:"40px 20px", textAlign:"center", color:T.t2, fontSize:13 }}>
          In filters ke saath koi unit match nahi hui.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:5, paddingTop:8 }}>
          {filtered.map((u, i) => {
            const sc = UNIT_STATUS[u.status] || UNIT_STATUS.AVAILABLE;
            const next = filtered[i+1], prev = filtered[i-1];
            const mergeLeft  = u.merge?.side === "left"  && next?.merge?.group === u.merge.group;
            const mergeRight = u.merge?.side === "right" && prev?.merge?.group === u.merge.group;
            const merged = mergeLeft || mergeRight;
            const hov = hoverId === u.id;
            return (
              <div key={u.id} onClick={() => onUnitClick(u)}
                onMouseEnter={() => setHoverId(u.id)} onMouseLeave={() => setHoverId(null)}
                style={{
                  position:"relative", aspectRatio:"1.05", borderRadius:6, padding:5,
                  display:"flex", flexDirection:"column", justifyContent:"space-between",
                  background:sc.bg, color:sc.txt,
                  border:`1px solid ${sc.brd}`,
                  outline: merged ? "1.5px solid #534AB7" : "none", outlineOffset:-1,
                  borderTopRightRadius:    mergeLeft  ? 0 : 6,
                  borderBottomRightRadius: mergeLeft  ? 0 : 6,
                  borderTopLeftRadius:     mergeRight ? 0 : 6,
                  borderBottomLeftRadius:  mergeRight ? 0 : 6,
                  cursor:"pointer", lineHeight:1.15,
                  transform: hov ? "translateY(-2px)" : "none",
                  boxShadow: hov ? "0 4px 10px rgba(15,23,42,0.18)" : "none",
                  transition:"transform .1s, box-shadow .1s",
                  zIndex: merged ? 1 : (hov ? 2 : "auto"),
                }}>
                {/* Merger tag — floats above the gap between A-15 / A-16 */}
                {mergeLeft && (
                  <span style={{ position:"absolute", top:-7, left:"100%",
                    transform:"translateX(-50%)", fontSize:8, fontWeight:600,
                    background:"#534AB7", color:"#FFFFFF", padding:"0 4px",
                    borderRadius:3, whiteSpace:"nowrap", zIndex:3 }}>
                    {u.merge.group}
                  </span>
                )}
                {/* Modification "M" badge */}
                {u.has_mod && (
                  <span style={{ position:"absolute", top:2, right:2, fontSize:8, fontWeight:600,
                    background:"#854F0B", color:"#FFFFFF", padding:"0 3px", borderRadius:2 }}>M</span>
                )}
                <div style={{ fontWeight:600, fontSize:11 }}>{u.unit_no}</div>
                <div style={{ fontSize:9, opacity:0.7 }}>{u.bhk}BHK · {u.batch}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", fontSize:10.5,
        paddingTop:12, borderTop:`1px solid ${T.b1}`, marginTop:12, color:T.t2 }}>
        {legend.map(l => (
          <span key={l.label} style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
            <span style={{ width:11, height:11, borderRadius:3, background:l.bg, border:`1px solid ${l.brd}` }}/>
            {l.label}
          </span>
        ))}
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:9, fontWeight:600, background:"#854F0B", color:"#FFF", padding:"0 4px", borderRadius:2 }}>M</span>
          Modified
        </span>
        <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
          <span style={{ fontSize:9, fontWeight:600, background:"#534AB7", color:"#FFF", padding:"0 4px", borderRadius:2 }}>MG</span>
          Merged
        </span>
      </div>
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — BATCHES (wired to live batches; construction sync = Brief 3)
// ════════════════════════════════════════════════════════════════
function BatchesTab({ batches, projectId, unitTypes, onChanged }) {
  const [showAdd, setShowAdd]       = useState(false);
  const [editBatch, setEditBatch]   = useState(null);
  const [genBatch, setGenBatch]     = useState(null);
  const [busyId, setBusyId]         = useState(null);

  const handleDelete = async (b) => {
    if (!await window.confirmAsync(`Delete batch "${b.batch_no}"? Units isme honge to delete nahi hoga.`)) return;
    setBusyId(b.id);
    try {
      const r = await api.del(`/township-crm/batches/${b.id}`);
      if (r?.success) onChanged?.();
      else alert("Delete failed: " + (r?.message || "unknown"));
    } catch (e) { alert("Delete failed: " + (e?.message || e)); }
    setBusyId(null);
  };

  return (
    <Frame title={`${batches.length} batches`} sub="Each batch = ek row-house cluster ya tower (units inke andar)"
      right={<Btn small primary label="+ Add batch" onClick={() => setShowAdd(true)}/>}>
      {batches.length === 0 ? (
        <div style={{ padding:"36px 20px", textAlign:"center", color:T.t2, fontSize:13 }}>
          Koi batch nahi hai. "+ Add batch" se ek cluster ya tower banao.
        </div>
      ) : (
        <div style={{ display:"grid", gap:9 }}>
          {batches.map(b => {
            const prog = Number(b.linked_project_progress || 0);
            const tone = prog >= 80 ? "blue" : prog >= 50 ? "blue" : prog >= 30 ? "amber" : prog > 0 ? "coral" : "gray";
            const subBits = [BATCH_TYPE_LABEL[b.batch_type] || b.batch_name, b.subcon_name, b.contract_value ? inr(b.contract_value) : null].filter(Boolean);
            return (
              <div key={b.id} style={{ background:T.surface, border:`1px solid ${T.b1}`,
                borderRadius:9, padding:"11px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", gap:10, marginBottom:7 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.t1 }}>
                      {b.batch_no} · {b.unit_range_label || b.batch_name || ""}
                    </div>
                    <div style={{ fontSize:11, color:T.t2, marginTop:2 }}>{subBits.join(" · ") || "—"}</div>
                  </div>
                  <Pill label={prog > 0 ? `${prog}% complete` : `${b.actual_unit_count || 0} units`} tone={tone}/>
                </div>
                <ProgBar pct={prog} color={TONE_FILL[tone] || T.pri}/>
                <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6,
                  fontSize:10.5, color:T.t2, marginTop:7 }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}>
                    <SvgIco type="link" color={T.t3} size={12}/> Project: {b.linked_project_name || "Not linked"}
                  </span>
                  <span>Handover target: {fmtDate(b.target_completion_date)}</span>
                </div>
                <div style={{ display:"flex", gap:7, marginTop:10, flexWrap:"wrap" }}>
                  <Btn small primary label="⚙ Generate Units" onClick={() => setGenBatch(b)}/>
                  <Btn small label="Edit" onClick={() => setEditBatch(b)}/>
                  <Btn small danger label={busyId === b.id ? "Deleting…" : "Delete"}
                    disabled={busyId === b.id} onClick={() => handleDelete(b)}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Note>
        "Generate Units" se ek batch ke andar units auto-ban jaate hain — prefix + start number do, A-1 se A-30 tak khud generate ho jayenge.
      </Note>

      {showAdd && (
        <AddBatchModal projectId={projectId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); onChanged?.(); }}/>
      )}
      {editBatch && (
        <AddBatchModal projectId={projectId} batch={editBatch}
          onClose={() => setEditBatch(null)}
          onSaved={() => { setEditBatch(null); onChanged?.(); }}/>
      )}
      {genBatch && (
        <GenerateUnitsModal batch={genBatch} unitTypes={unitTypes}
          onClose={() => setGenBatch(null)}
          onGenerated={() => { setGenBatch(null); onChanged?.(); }}/>
      )}
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// ADD / EDIT BATCH MODAL — POST /projects/:id/batches | PUT /batches/:id
// ════════════════════════════════════════════════════════════════
function AddBatchModal({ projectId, batch, onClose, onSaved }) {
  const isEdit = !!batch;
  const [form, setForm] = useState({
    batch_no:               batch?.batch_no || "",
    batch_name:             batch?.batch_name || "",
    batch_type:             batch?.batch_type || "row_house_cluster",
    unit_range_label:       batch?.unit_range_label || "",
    subcon_name:            batch?.subcon_name || "",
    subcon_phone:           batch?.subcon_phone || "",
    contract_value:         batch?.contract_value ?? "",
    target_completion_date: batch?.target_completion_date ? String(batch.target_completion_date).slice(0,10) : "",
    notes:                  batch?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.batch_no.trim()) { alert("Batch No is required"); return; }
    setSaving(true);
    const body = {
      batch_no: form.batch_no.trim(),
      batch_name: form.batch_name.trim() || null,
      batch_type: form.batch_type,
      unit_range_label: form.unit_range_label.trim() || null,
      subcon_name: form.subcon_name.trim() || null,
      subcon_phone: form.subcon_phone.trim() || null,
      contract_value: form.contract_value !== "" ? Number(form.contract_value) : null,
      target_completion_date: form.target_completion_date || null,
      notes: form.notes.trim() || null,
    };
    try {
      const res = isEdit
        ? await api.put(`/township-crm/batches/${batch.id}`, body)
        : await api.post(`/township-crm/projects/${projectId}/batches`, body);
      if (res?.success) onSaved();
      else alert((isEdit ? "Update" : "Add") + " batch failed: " + (res?.message || "unknown error"));
    } catch (e) {
      alert((isEdit ? "Update" : "Add") + " batch failed: " + (e?.message || e));
    }
    setSaving(false);
  };

  return (
    <Modal title={isEdit ? `Edit Batch ${batch.batch_no}` : "Add Batch"} onClose={onClose} width={520}>
      <div style={{ display:"grid", gap:11 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Batch No *</label>
            <input style={inputStyle} value={form.batch_no}
              onChange={(e) => set("batch_no", e.target.value)} placeholder="e.g. B-1"/>
          </div>
          <div>
            <label style={labelStyle}>Batch Type *</label>
            <select style={inputStyle} value={form.batch_type}
              onChange={(e) => set("batch_type", e.target.value)}>
              {BATCH_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Batch Name</label>
          <input style={inputStyle} value={form.batch_name}
            onChange={(e) => set("batch_name", e.target.value)} placeholder="e.g. Tower A / Riverside Cluster"/>
        </div>
        <div>
          <label style={labelStyle}>Unit Range Label</label>
          <input style={inputStyle} value={form.unit_range_label}
            onChange={(e) => set("unit_range_label", e.target.value)} placeholder="e.g. A-1 to A-30"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Subcontractor</label>
            <input style={inputStyle} value={form.subcon_name}
              onChange={(e) => set("subcon_name", e.target.value)} placeholder="Subcon name"/>
          </div>
          <div>
            <label style={labelStyle}>Subcon Phone</label>
            <input style={inputStyle} value={form.subcon_phone}
              onChange={(e) => set("subcon_phone", e.target.value)} placeholder="10-digit mobile"/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Contract Value (₹)</label>
            <input style={inputStyle} type="number" value={form.contract_value}
              onChange={(e) => set("contract_value", e.target.value)} placeholder="e.g. 12000000"/>
          </div>
          <div>
            <label style={labelStyle}>Target Completion</label>
            <input style={inputStyle} type="date" value={form.target_completion_date}
              onChange={(e) => set("target_completion_date", e.target.value)}/>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, minHeight:60, resize:"vertical" }} value={form.notes}
            onChange={(e) => set("notes", e.target.value)} placeholder="Optional"/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Saving…" : (isEdit ? "Save Changes" : "Add Batch")}
          onClick={submit} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// GENERATE UNITS MODAL — POST /batches/:id/generate-units
// Prefix + start no + count → A-1, A-2, … auto-created in the batch.
// ════════════════════════════════════════════════════════════════
function GenerateUnitsModal({ batch, unitTypes, onClose, onGenerated }) {
  const [form, setForm] = useState({
    prefix: derivePrefix(batch),
    start_no: 1,
    count: 10,
    unit_type_id: unitTypes[0]?.id || "",
    facing: "",
    is_corner_pattern: "none",
    is_garden_facing_pattern: "none",
    block_or_tower: batch?.batch_name || "",
    phase: "",
    override_base_price: "",
    plc_corner: "",
    plc_garden: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Pre-fill corner/garden PLC from the project's saved config (per-sqft rates),
  // so the user sees real defaults instead of typing them every time.
  useEffect(() => {
    const pid = batch?.township_project_id;
    if (!pid) return;
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/township-crm/projects/${pid}/plc-config`);
        if (!alive || !r?.success) return;
        const m = Object.fromEntries((r.data || []).map(d => [d.plc_key, d]));
        setForm(p => ({
          ...p,
          plc_corner: m.corner?.charge_unit === "per_sqft" ? String(m.corner.rate) : p.plc_corner,
          plc_garden: m.garden?.charge_unit === "per_sqft" ? String(m.garden.rate) : p.plc_garden,
        }));
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, [batch]);

  const start = Number(form.start_no) || 0;
  const count = Number(form.count) || 0;
  const previewValid = form.prefix.trim() && start >= 1 && count >= 1;
  const preview = previewValid
    ? (count <= 3
        ? Array.from({ length: count }, (_, i) => `${form.prefix.trim()}-${start + i}`).join(", ")
        : `${form.prefix.trim()}-${start}, ${form.prefix.trim()}-${start + 1}, … ${form.prefix.trim()}-${start + count - 1}`)
    : "—";

  const submit = async () => {
    if (!form.prefix.trim())   { alert("Prefix is required"); return; }
    if (start < 1)             { alert("Start number must be >= 1"); return; }
    if (count < 1)             { alert("Count must be >= 1"); return; }
    if (count > 200)           { alert("Max 200 units per generation"); return; }
    if (!form.unit_type_id)    { alert("Unit Type is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/township-crm/batches/${batch.id}/generate-units`, {
        prefix: form.prefix.trim(),
        start_no: start,
        count,
        unit_type_id: Number(form.unit_type_id),
        facing: form.facing || null,
        is_corner_pattern: form.is_corner_pattern,
        is_garden_facing_pattern: form.is_garden_facing_pattern,
        use_type_base_price: form.override_base_price === "",
        override_base_price: form.override_base_price !== "" ? Number(form.override_base_price) : null,
        plc_corner: form.plc_corner !== "" ? Number(form.plc_corner) : 0,
        plc_garden: form.plc_garden !== "" ? Number(form.plc_garden) : 0,
        block_or_tower: form.block_or_tower.trim() || null,
        phase: form.phase.trim() || null,
      });
      if (res?.success) {
        alert(`✓ ${res.data?.generated_count || count} units generated. Batch total: ${res.data?.batch_total ?? "—"}`);
        onGenerated();
      } else {
        alert("Generate failed: " + (res?.message || "unknown error"));
      }
    } catch (e) {
      alert("Generate failed: " + (e?.message || e));
    }
    setSaving(false);
  };

  return (
    <Modal title={`Generate Units — ${batch.batch_no}`} onClose={onClose} width={540}>
      <div style={{ display:"grid", gap:11 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Prefix *</label>
            <input style={inputStyle} value={form.prefix}
              onChange={(e) => set("prefix", e.target.value)} placeholder="A"/>
          </div>
          <div>
            <label style={labelStyle}>Start No *</label>
            <input style={inputStyle} type="number" min={1} value={form.start_no}
              onChange={(e) => set("start_no", e.target.value)}/>
          </div>
          <div>
            <label style={labelStyle}>Count *</label>
            <input style={inputStyle} type="number" min={1} max={200} value={form.count}
              onChange={(e) => set("count", e.target.value)}/>
          </div>
        </div>

        <div style={{ padding:"8px 12px", background:T.priL, borderRadius:6, fontSize:12, color:T.priD }}>
          Banenge: <strong>{preview}</strong> {previewValid && count > 0 ? `(${count} units)` : ""}
        </div>

        <div>
          <label style={labelStyle}>Unit Type *</label>
          <select style={inputStyle} value={form.unit_type_id}
            onChange={(e) => set("unit_type_id", e.target.value)}>
            <option value="">— Select —</option>
            {unitTypes.map(t => (
              <option key={t.id} value={t.id}>{t.type_name} ({t.type_code})</option>
            ))}
          </select>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Facing</label>
            <select style={inputStyle} value={form.facing}
              onChange={(e) => set("facing", e.target.value)}>
              <option value="">— None —</option>
              {FACINGS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Block / Tower</label>
            <input style={inputStyle} value={form.block_or_tower}
              onChange={(e) => set("block_or_tower", e.target.value)} placeholder="optional"/>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Corner pattern</label>
            <select style={inputStyle} value={form.is_corner_pattern}
              onChange={(e) => set("is_corner_pattern", e.target.value)}>
              <option value="none">None</option>
              <option value="first_last">First & last unit</option>
              <option value="all">All units</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Garden pattern</label>
            <select style={inputStyle} value={form.is_garden_facing_pattern}
              onChange={(e) => set("is_garden_facing_pattern", e.target.value)}>
              <option value="none">None</option>
              <option value="first_last">First & last unit</option>
              <option value="all">All units</option>
            </select>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Base price override (₹)</label>
            <input style={inputStyle} type="number" value={form.override_base_price}
              onChange={(e) => set("override_base_price", e.target.value)} placeholder="From type"/>
          </div>
          <div>
            <label style={labelStyle}>PLC corner (₹/sqft)</label>
            <input style={inputStyle} type="number" value={form.plc_corner}
              onChange={(e) => set("plc_corner", e.target.value)} placeholder="0"/>
          </div>
          <div>
            <label style={labelStyle}>PLC garden (₹/sqft)</label>
            <input style={inputStyle} type="number" value={form.plc_garden}
              onChange={(e) => set("plc_garden", e.target.value)} placeholder="0"/>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Phase</label>
          <input style={inputStyle} value={form.phase}
            onChange={(e) => set("phase", e.target.value)} placeholder="optional"/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Generating…" : `Generate ${count > 0 ? count : ""} Units`}
          onClick={submit} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 4 — PROSPECTS (Kanban — wired to live prospects)
// ════════════════════════════════════════════════════════════════
function ProspectsTab({ prospects, onAdd, onProspectClick }) {
  const budgetLabel = (p) => {
    if (p.budget_min && p.budget_max) return `${inr(p.budget_min)}–${inr(p.budget_max)}`;
    if (p.budget_max) return `up to ${inr(p.budget_max)}`;
    return "";
  };
  return (
    <Frame title="Prospect pipeline" sub={`${prospects.length} active prospects across 6 stages`}
      right={<Btn small label="+ Add prospect" onClick={onAdd}/>}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(170px, 1fr))", gap:8 }}>
        {STAGE_ORDER.map(stage => {
          const cards = prospects.filter(p => p.stage === stage);
          return (
            <div key={stage} style={{ background:T.gryL, borderRadius:8, padding:8, minHeight:170 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                fontSize:10.5, fontWeight:600, color:T.t2, textTransform:"uppercase",
                letterSpacing:0.3, marginBottom:7 }}>
                <span>{STAGE_DISPLAY[stage]}</span><span>{cards.length}</span>
              </div>
              {cards.map(p => {
                const units = (p.interested_units || []).map(u => u.unit_no).join(", ");
                return (
                  <div key={p.id} onClick={() => onProspectClick(p.id)}
                    style={{ background:T.surface, border:`1px solid ${T.b1}`,
                      borderRadius:6, padding:7, marginBottom:5, cursor:"pointer" }}>
                    <div style={{ fontSize:11, fontWeight:600, color:T.t1, marginBottom:2 }}>{p.name}</div>
                    <div style={{ fontSize:10, color:T.t2 }}>
                      {budgetLabel(p)}{units ? ` · ${units}` : ""}
                    </div>
                    {p.notes && (
                      <div style={{ fontSize:10, marginTop:2, color:T.t3,
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.notes}</div>
                    )}
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div style={{ fontSize:10, color:T.t3, textAlign:"center", padding:"10px 0" }}>—</div>
              )}
            </div>
          );
        })}
      </div>
      <Note tone="warning">
        Prospect ek se zyada units me interested ho sakta hai · har card pe woh units listed milengi
      </Note>
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 5 — BOOKINGS (wired to live bookings-summary)
// ════════════════════════════════════════════════════════════════
function BookingsTab({ bookings, onRowClick }) {
  const [filter, setFilter] = useState("All");

  const rows = bookings.filter(b => {
    if (filter === "Pending payment") return b.due !== "—";
    if (filter === "Hold only")       return b.status === "HOLD";
    if (filter === "Sold only")       return b.status === "SOLD";
    return true;
  });

  const statusTone = (s) => s === "BOOKED" ? "blue" : s === "HOLD" ? "coral" : "navy";
  const th = { padding:"7px 10px", textAlign:"left", fontSize:10.5, fontWeight:600,
    color:T.t2, textTransform:"uppercase", letterSpacing:0.3, background:T.gryL,
    borderBottom:`1px solid ${T.b1}` };
  const td = { padding:"9px 10px", borderBottom:`1px solid ${T.b1}`, fontSize:11.5, color:T.t1 };

  return (
    <Frame title={`${bookings.length} booked customers`} sub="Hold + Booked + Sold"
      right={
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {["All","Pending payment","Hold only","Sold only"].map(f => (
            <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)}/>
          ))}
        </div>
      }>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
          <thead>
            <tr>
              {["Customer","Unit","Value","Paid","Next due","Status"].map(h => <th key={h} style={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(b => (
              <tr key={b.id} onClick={() => onRowClick(b)} style={{ cursor:"pointer" }}>
                <td style={td}>
                  <div style={{ fontWeight:600 }}>{b.name}</div>
                  <div style={{ fontSize:10.5, color:T.t3 }}>{b.phone}</div>
                </td>
                <td style={td}>
                  {b.unit}
                  {b.unitTag && <span style={{ marginLeft:6 }}><Pill label={b.unitTag.label} tone={b.unitTag.tone} style={{ fontSize:9 }}/></span>}
                </td>
                <td style={td}>{b.value}</td>
                <td style={td}>{b.paid}</td>
                <td style={{ ...td, color: b.due === "—" ? T.t3 : T.t1 }}>{b.due}</td>
                <td style={td}><Pill label={(UNIT_STATUS[b.status] || {}).label || b.status} tone={statusTone(b.status)}/></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, textAlign:"center", color:T.t3 }}>
                Is filter me koi booking nahi hai.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 6 — CUSTOMIZATIONS (wired to live customizations)
// ════════════════════════════════════════════════════════════════
function CustomizationsTab({ customizations, onAdd, onCardClick }) {
  const [filter, setFilter] = useState("All");

  const rows = customizations.filter(c => {
    if (filter === "Modifications") return c.kind === "modification";
    if (filter === "Mergers")       return c.kind === "merger";
    return true;
  });
  const modCount = customizations.filter(c => c.kind === "modification").length;
  const mgCount  = customizations.filter(c => c.kind === "merger").length;

  return (
    <Frame title={`${customizations.length} active customizations`}
      sub={`${modCount} modifications · ${mgCount} merger${mgCount === 1 ? "" : "s"}`}
      right={
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {["All","Modifications","Mergers"].map(f => (
            <Chip key={f} label={f} active={filter === f} onClick={() => setFilter(f)}/>
          ))}
          <Btn small primary label="+ New" onClick={onAdd}/>
        </div>
      }>
      {rows.length === 0 ? (
        <div style={{ padding:"36px 20px", textAlign:"center", color:T.t3, fontSize:13 }}>
          Koi customization nahi hai.
        </div>
      ) : (
        <div style={{ display:"grid", gap:8 }}>
          {rows.map(c => {
            const isMerger = c.kind === "merger";
            return (
              <div key={c.id} onClick={() => onCardClick(c)} style={{ borderRadius:8, padding:"10px 12px",
                cursor:"pointer",
                background: isMerger ? "#EEEDFE" : T.gryL, border:`1px solid ${isMerger ? "#AFA9EC" : T.b1}` }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    {isMerger
                      ? <Pill label={`MERGER · ${c.code}`} tone="purple"/>
                      : <Pill label="MODIFICATION" tone="amber"/>}
                    <span style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{c.title}</span>
                  </div>
                  <Pill label={c.status.label} tone={c.status.tone}/>
                </div>
                <div style={{ fontSize:10.5, color:T.t2 }}>Customer: {c.customer} · {c.desc}</div>
                {isMerger ? (
                  <>
                    <div style={{ fontSize:10.5, color:T.t2, marginTop:4 }}>
                      {c.pricing}
                      <strong style={{ color:T.t1, fontWeight:600 }}>{c.finalLabel}</strong>
                    </div>
                    {(c.files || []).length > 0 && (
                      <div style={{ display:"flex", gap:5, marginTop:7, flexWrap:"wrap" }}>
                        {c.files.map(f => (
                          <Chip key={f} label={f} style={{ fontSize:10 }}
                            icon={<SvgIco type="file" color={T.t3} size={11}/>}/>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize:10.5, color:T.t2, marginTop:4 }}>{c.detail}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 7 — CONSTRUCTION (read-only sync with the projects table)
// ════════════════════════════════════════════════════════════════
function ConstructionTab({ constructionSync, onOpenProject }) {
  const rows = constructionSync || [];
  const linked = rows.filter(r => r.linked_project_id);
  // "Ahead" = ≥66%, "On track" = 1-65%; both only count linked batches.
  const ahead   = linked.filter(r => Number(r.construction_pct || 0) >= 66);
  const onTrack = linked.filter(r => { const p = Number(r.construction_pct || 0); return p > 0 && p < 66; });
  const pctColor = (p) => p >= 66 ? T.kGrn : p >= 30 ? T.kBlu : p > 0 ? T.kAmb : T.kGry;

  return (
    <Frame title="Construction snapshot" sub={`${rows.length} batches · linked construction progress`}
      right={<Chip label="Open in Projects" icon={<SvgIco type="ext" color={T.t2} size={12}/>}
        onClick={onOpenProject}/>}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:8 }}>
        <KPI label="Ahead of schedule" value={String(ahead.length)}
          sub={ahead.map(r => r.batch_no).join(", ") || "—"} color={T.kGrn}/>
        <KPI label="On track" value={String(onTrack.length)}
          sub={onTrack.map(r => r.batch_no).join(", ") || "—"} color={T.kBlu}/>
      </div>
      <div style={{ marginTop:12 }}>
        {rows.length === 0 && (
          <div style={{ padding:"30px", textAlign:"center", color:T.t3, fontSize:12.5 }}>No batches.</div>
        )}
        {rows.map((r, i) => {
          const p = Number(r.construction_pct || 0);
          return (
            <div key={r.batch_id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              gap:10, padding:"9px 0",
              borderBottom: i < rows.length-1 ? `1px solid ${T.b1}` : "none" }}>
              <span style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:T.t2 }}>
                <SvgIco type="hammer" color={T.t3} size={13}/>
                {r.batch_no} · {r.subcon_name || r.batch_name || "—"}
              </span>
              <span style={{ fontSize:12, fontWeight:600, color:pctColor(p) }}>
                {r.linked_project_id ? `${p}% · ${r.construction_status || "in progress"}` : "Not linked"}
              </span>
            </div>
          );
        })}
      </div>
      <Note>
        Yahan se kuch update nahi hota · sirf linked construction project ka snapshot dikhega · "Open in Projects" se Projects module khulega
      </Note>
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 8 — REPORTS (wired to live report queries)
// ════════════════════════════════════════════════════════════════
function ReportsTab({ salesVelocity, typeDemand, revenueForecast, onStuckUnits }) {
  const vMax = salesVelocity?.max_count || 1;
  const vBars = (salesVelocity?.months || []).map(m => ({
    h: Math.max(8, Math.round((m.count / vMax) * 100)), label: m.label,
  }));
  const rf = revenueForecast || { total_potential:0, booked_value:0, collected:0 };

  return (
    <Frame title="Sales & inventory analytics" right={<Chip label="Last 180 days ▾"/>}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:12 }}>
        <div>
          <SectionH style={{ marginTop:0 }}>Sales velocity</SectionH>
          {vBars.length === 0 ? (
            <div style={{ height:104, background:T.gryL, borderRadius:8, display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:11.5, color:T.t3 }}>
              No bookings in the window
            </div>
          ) : (
            <>
              <BarChart bars={vBars}/>
              <div style={{ display:"flex", gap:5, marginTop:4 }}>
                {vBars.map((b, i) => (
                  <div key={i} style={{ flex:1, textAlign:"center", fontSize:9, color:T.t3 }}>{b.label}</div>
                ))}
              </div>
            </>
          )}
          <div style={{ fontSize:10.5, color:T.t2, marginTop:6 }}>
            Avg {salesVelocity?.avg_per_month || 0} bookings/month
          </div>
        </div>
        <div>
          <SectionH style={{ marginTop:0 }}>Type-wise demand</SectionH>
          <div style={{ background:T.gryL, padding:12, borderRadius:8,
            display:"flex", flexDirection:"column", gap:10, minHeight:104 }}>
            {(typeDemand || []).map(d => (
              <div key={d.type_code} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
                <span style={{ width:54, color:T.t2 }}>{d.label}</span>
                <div style={{ flex:1 }}><ProgBar pct={d.demand_pct}/></div>
                <span style={{ width:34, textAlign:"right", fontWeight:600, color:T.t1 }}>{d.demand_pct}%</span>
              </div>
            ))}
            {(typeDemand || []).length === 0 && (
              <div style={{ fontSize:11, color:T.t3, textAlign:"center" }}>No data</div>
            )}
          </div>
        </div>
      </div>

      {/* Revenue forecast */}
      <SectionH>Revenue forecast</SectionH>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:8 }}>
        <KPI label="Total potential" value={inr(rf.total_potential)} sub="All units" color={T.t1}/>
        <KPI label="Booked value"    value={inr(rf.booked_value)}
          sub={rf.total_potential ? `${Math.round((rf.booked_value/rf.total_potential)*100)}% absorbed` : "—"} color={T.kBlu}/>
        <KPI label="Collected"       value={inr(rf.collected)}
          sub={rf.booked_value ? `${Math.round((rf.collected/rf.booked_value)*100)}% of booked` : "—"} color={T.kGrn}/>
      </div>

      <SectionH>Available reports</SectionH>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:7 }}>
        {REPORT_LINKS.map(r => {
          const isStuck = r.startsWith("Stuck units");
          return (
            <Chip key={r} label={r} onClick={isStuck ? onStuckUnits : () => {}}
              icon={<SvgIco type="file" color={isStuck ? T.pri : T.t3} size={12}/>}
              active={isStuck}
              style={{ justifyContent:"flex-start" }}/>
          );
        })}
      </div>
    </Frame>
  );
}

// ════════════════════════════════════════════════════════════════
// TAB 9 — SETTINGS (live project + unit types + Seed Demo button)
// ════════════════════════════════════════════════════════════════
function SettingsTab({ project, unitTypes, seeding, onSeed, projectId, onChanged }) {
  const [showAddType, setShowAddType] = useState(false);
  const [editType, setEditType]       = useState(null);
  const [busyTypeId, setBusyTypeId]   = useState(null);

  const handleDeleteType = async (t) => {
    if (!await window.confirmAsync(`Delete unit type "${t.type_name}"? Units isme honge to delete nahi hoga.`)) return;
    setBusyTypeId(t.id);
    try {
      const r = await api.del(`/township-crm/unit-types/${t.id}`);
      if (r?.success) onChanged?.();
      else alert("Delete failed: " + (r?.message || "unknown"));
    } catch (e) { alert("Delete failed: " + (e?.message || e)); }
    setBusyTypeId(null);
  };

  const FormRow = ({ label, value, valueColor }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0",
      borderBottom:`1px solid ${T.b1}`, fontSize:12 }}>
      <span style={{ color:T.t2 }}>{label}</span>
      <span style={{ fontWeight:600, color: valueColor || T.t1 }}>{value}</span>
    </div>
  );
  const th = { padding:"7px 10px", textAlign:"left", fontSize:10.5, fontWeight:600,
    color:T.t2, textTransform:"uppercase", letterSpacing:0.3, background:T.gryL,
    borderBottom:`1px solid ${T.b1}` };
  const td = { padding:"9px 10px", borderBottom:`1px solid ${T.b1}`, fontSize:11.5, color:T.t1 };

  return (
    <div style={{ display:"grid", gap:14 }}>
      {/* Demo Data section */}
      <div style={{ background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:14 }}>
        <div style={{ fontSize:14, fontWeight:600, color:T.t1, marginBottom:8 }}>Demo Data</div>
        <div style={{ fontSize:12, color:T.t2, marginBottom:10 }}>
          Anadi Ananta ke liye realistic demo data load karein — 102 units, 14 prospects, with status distribution as per marketing demo.
        </div>
        <Btn primary small onClick={onSeed} disabled={seeding}
          label={seeding ? "Seeding…" : "Seed Demo Data"}/>
        <div style={{ fontSize:11, color:T.t3, marginTop:8 }}>
          ⚠️ Yeh existing units, prospects aur followup history delete karke fresh data load karega.
        </div>
      </div>

      <Frame title="Project configuration" sub="Anadi Ananta · setup details">
        {/* Section 1 — Project info */}
        <SectionH style={{ marginTop:0 }}>Project info</SectionH>
        <FormRow label="Project name" value={project?.name || "—"}/>
        <FormRow label="Project code" value={project?.project_code || "—"}/>
        <FormRow label="RERA number"  value={project?.rera_no || "—"}/>
        <FormRow label="Total units"  value={String(project?.unit_count ?? project?.total_units ?? 0)}/>

        {/* Section 2 — Unit types (editable) */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <SectionH>Unit types</SectionH>
          <Btn small primary label="+ Add type" onClick={() => setShowAddType(true)}/>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:600 }}>
            <thead>
              <tr>{["Type","Plot","Built-up","Base rate","Price","Units",""].map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {unitTypes.map(t => (
                <tr key={t.id}>
                  <td style={td}>{t.type_name} ({t.type_code})</td>
                  <td style={td}>{t.plot_area_sqft ? `${Number(t.plot_area_sqft)} sqft` : "—"}</td>
                  <td style={td}>{t.built_up_area_sqft ? `${Number(t.built_up_area_sqft)} sqft` : "—"}</td>
                  <td style={td}>{t.base_rate_per_sqft ? `₹${Number(t.base_rate_per_sqft).toLocaleString("en-IN")}/sqft` : "—"}</td>
                  <td style={{ ...td, fontWeight:600 }}>{inr(t.base_price)}</td>
                  <td style={td}>{t.unit_count ?? 0}</td>
                  <td style={{ ...td, whiteSpace:"nowrap" }}>
                    <span style={{ display:"inline-flex", gap:6 }}>
                      <Btn small label="Edit" onClick={() => setEditType(t)}/>
                      <Btn small danger label={busyTypeId === t.id ? "…" : "Delete"}
                        disabled={busyTypeId === t.id} onClick={() => handleDeleteType(t)}/>
                    </span>
                  </td>
                </tr>
              ))}
              {unitTypes.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, textAlign:"center", color:T.t3 }}>No unit types. "+ Add type" se banao.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Section 3 — PLC charges (editable, persisted per project) */}
        <PlcConfigSection projectId={projectId}/>
      </Frame>

      {showAddType && (
        <UnitTypeModal projectId={projectId}
          onClose={() => setShowAddType(false)}
          onSaved={() => { setShowAddType(false); onChanged?.(); }}/>
      )}
      {editType && (
        <UnitTypeModal projectId={projectId} unitType={editType}
          onClose={() => setEditType(null)}
          onSaved={() => { setEditType(null); onChanged?.(); }}/>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ADD / EDIT UNIT TYPE MODAL — POST /projects/:id/unit-types | PUT /unit-types/:id
// ════════════════════════════════════════════════════════════════
function UnitTypeModal({ projectId, unitType, onClose, onSaved }) {
  const isEdit = !!unitType;
  const [form, setForm] = useState({
    type_name:          unitType?.type_name || "",
    type_code:          unitType?.type_code || "",
    bhk:                unitType?.bhk ?? "",
    plot_area_sqft:     unitType?.plot_area_sqft ?? "",
    built_up_area_sqft: unitType?.built_up_area_sqft ?? "",
    carpet_area_sqft:   unitType?.carpet_area_sqft ?? "",
    super_built_up_sqft:unitType?.super_built_up_sqft ?? "",
    base_rate_per_sqft: unitType?.base_rate_per_sqft ?? "",
    base_price:         unitType?.base_price ?? "",
    description:        unitType?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Convenience: base_price = base_rate × built-up, auto-suggested when both set
  // and price is empty — user can still type an explicit override.
  const autoPrice = () => {
    const rate = Number(form.base_rate_per_sqft), area = Number(form.built_up_area_sqft);
    if (rate > 0 && area > 0) set("base_price", String(Math.round(rate * area)));
  };

  const numOrNull = (v) => v !== "" ? Number(v) : null;

  const submit = async () => {
    if (!form.type_name.trim()) { alert("Type Name is required"); return; }
    if (!form.type_code.trim()) { alert("Type Code is required"); return; }
    setSaving(true);
    const body = {
      type_name: form.type_name.trim(),
      type_code: form.type_code.trim(),
      bhk: numOrNull(form.bhk),
      plot_area_sqft: numOrNull(form.plot_area_sqft),
      built_up_area_sqft: numOrNull(form.built_up_area_sqft),
      carpet_area_sqft: numOrNull(form.carpet_area_sqft),
      super_built_up_sqft: numOrNull(form.super_built_up_sqft),
      base_rate_per_sqft: numOrNull(form.base_rate_per_sqft),
      base_price: numOrNull(form.base_price),
      description: form.description.trim() || null,
    };
    try {
      const res = isEdit
        ? await api.put(`/township-crm/unit-types/${unitType.id}`, body)
        : await api.post(`/township-crm/projects/${projectId}/unit-types`, body);
      if (res?.success) onSaved();
      else alert((isEdit ? "Update" : "Add") + " type failed: " + (res?.message || "unknown error"));
    } catch (e) {
      alert((isEdit ? "Update" : "Add") + " type failed: " + (e?.message || e));
    }
    setSaving(false);
  };

  const numField = (label, key, ph) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type="number" value={form[key]}
        onChange={(e) => set(key, e.target.value)} placeholder={ph}/>
    </div>
  );

  return (
    <Modal title={isEdit ? `Edit Unit Type ${unitType.type_code}` : "Add Unit Type"} onClose={onClose} width={540}>
      <div style={{ display:"grid", gap:11 }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Type Name *</label>
            <input style={inputStyle} value={form.type_name}
              onChange={(e) => set("type_name", e.target.value)} placeholder="e.g. 2BHK Row House"/>
          </div>
          <div>
            <label style={labelStyle}>Type Code *</label>
            <input style={inputStyle} value={form.type_code}
              onChange={(e) => set("type_code", e.target.value)} placeholder="e.g. A"/>
          </div>
          {numField("BHK", "bhk", "e.g. 2")}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          {numField("Plot area (sqft)", "plot_area_sqft", "e.g. 800")}
          {numField("Built-up (sqft)", "built_up_area_sqft", "e.g. 1200")}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          {numField("Carpet area (sqft)", "carpet_area_sqft", "optional")}
          {numField("Super built-up (sqft)", "super_built_up_sqft", "optional")}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          {numField("Base rate (₹/sqft)", "base_rate_per_sqft", "e.g. 2833")}
          <div>
            <label style={labelStyle}>Base price (₹)</label>
            <input style={inputStyle} type="number" value={form.base_price}
              onChange={(e) => set("base_price", e.target.value)} onFocus={() => { if (form.base_price === "") autoPrice(); }}
              placeholder="auto = rate × built-up"/>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight:54, resize:"vertical" }} value={form.description}
            onChange={(e) => set("description", e.target.value)} placeholder="Optional"/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Saving…" : (isEdit ? "Save Changes" : "Add Type")}
          onClick={submit} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// PLC CONFIG SECTION — editable per-project PLC rates
// GET/PUT /projects/:id/plc-config
// ════════════════════════════════════════════════════════════════
const PLC_UNIT_OPTIONS  = [{ value:"per_sqft", label:"per sqft" }, { value:"flat", label:"flat" }];
const PLC_AREA_OPTIONS  = [
  { value:"built_up", label:"Built-up" },
  { value:"plot", label:"Plot" },
  { value:"super_built_up", label:"Super built-up" },
];

function PlcConfigSection({ projectId }) {
  const [rows, setRows]   = useState([]);
  const [loading, setLd]  = useState(true);
  const [saving, setSv]   = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLd(true);
      try {
        const r = await api.get(`/township-crm/projects/${projectId}/plc-config`);
        if (alive && r?.success) setRows((r.data || []).map(d => ({ ...d, rate: String(d.rate) })));
      } catch (_) {}
      if (alive) { setLd(false); setDirty(false); }
    })();
    return () => { alive = false; };
  }, [projectId]);

  const setRow = (i, k, v) => { setRows(p => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r)); setDirty(true); };
  const addRow = () => { setRows(p => [...p, { plc_key:"", label:"", rate:"0", charge_unit:"per_sqft", applies_to:"built_up" }]); setDirty(true); };
  const delRow = (i) => { setRows(p => p.filter((_, idx) => idx !== i)); setDirty(true); };

  const save = async () => {
    for (const r of rows) {
      if (!String(r.plc_key).trim()) { alert("Har PLC row ka ek key hona chahiye (e.g. corner)"); return; }
      if (!(Number(r.rate) >= 0))    { alert(`Invalid rate for '${r.plc_key}'`); return; }
    }
    setSv(true);
    try {
      const items = rows.map((r, i) => ({
        plc_key: r.plc_key, label: r.label || r.plc_key, rate: Number(r.rate),
        charge_unit: r.charge_unit, applies_to: r.applies_to, sort_order: i + 1,
      }));
      const res = await api.put(`/township-crm/projects/${projectId}/plc-config`, { items });
      if (res?.success) {
        setRows((res.data || []).map(d => ({ ...d, rate: String(d.rate) })));
        setDirty(false);
      } else {
        alert("PLC save failed: " + (res?.message || "unknown error"));
      }
    } catch (e) { alert("PLC save failed: " + (e?.message || e)); }
    setSv(false);
  };

  const th = { padding:"6px 8px", textAlign:"left", fontSize:10, fontWeight:600, color:T.t2,
    textTransform:"uppercase", letterSpacing:0.3, background:T.gryL, borderBottom:`1px solid ${T.b1}` };
  const td = { padding:"6px 8px", borderBottom:`1px solid ${T.b1}` };
  const cell = { ...inputStyle, padding:"5px 7px", fontSize:12 };

  return (
    <>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <SectionH>PLC charges (editable)</SectionH>
        <Btn small label="+ Add charge" onClick={addRow}/>
      </div>
      {loading ? (
        <div style={{ padding:"14px 0", fontSize:12, color:T.t3 }}>Loading…</div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:560 }}>
            <thead>
              <tr>{["Key","Label","Rate (₹)","Unit","Applies to",""].map((h,i) => <th key={i} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, width:110 }}>
                    <input style={cell} value={r.plc_key}
                      onChange={(e) => setRow(i, "plc_key", e.target.value)} placeholder="corner"/>
                  </td>
                  <td style={td}>
                    <input style={cell} value={r.label}
                      onChange={(e) => setRow(i, "label", e.target.value)} placeholder="Corner unit"/>
                  </td>
                  <td style={{ ...td, width:100 }}>
                    <input style={cell} type="number" value={r.rate}
                      onChange={(e) => setRow(i, "rate", e.target.value)}/>
                  </td>
                  <td style={{ ...td, width:100 }}>
                    <select style={cell} value={r.charge_unit} onChange={(e) => setRow(i, "charge_unit", e.target.value)}>
                      {PLC_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, width:130 }}>
                    <select style={cell} value={r.applies_to} onChange={(e) => setRow(i, "applies_to", e.target.value)}>
                      {PLC_AREA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, width:40, textAlign:"center" }}>
                    <button onClick={() => delRow(i)} title="Remove" style={{ background:"transparent",
                      border:"none", color:"#B4453A", cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ ...td, textAlign:"center", color:T.t3, fontSize:12 }}>
                  No PLC charges. "+ Add charge" se banao.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
        <span style={{ fontSize:11, color:T.t3 }}>
          Per-sqft charges unit type ke area pe lagte hain · "flat" = fixed amount per unit.
        </span>
        <Btn small primary label={saving ? "Saving…" : "Save PLC"} onClick={save} disabled={saving || !dirty}/>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// UNIT DETAIL MODAL — 6 internal tabs (Overview / Interested Leads /
// Followup History wired; Construction / Payments / Documents = Brief 2/3)
// ════════════════════════════════════════════════════════════════
const MODAL_TABS = ["Overview","Interested Leads","Followup History","Construction","Payments","Documents"];

function UnitDetailModal({ unit, detail, loading, onClose, onRefresh, onOpenProject }) {
  const [tab, setTab] = useState("Overview");
  const [busy, setBusy] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [constr, setConstr] = useState(null);
  const [constrLoading, setConstrLoading] = useState(false);
  const [payments, setPayments] = useState(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [recordPaymentRow, setRecordPaymentRow] = useState(null);
  const sc = UNIT_STATUS[unit.status] || UNIT_STATUS.AVAILABLE;
  const u = detail?.unit || unit;            // live detail once loaded, clicked summary meanwhile
  const unitId = u.id;
  const statusTone = (s) => s === "AVAILABLE" ? "gray" : s === "FOLLOWUP" ? "amber"
    : s === "HOLD" ? "coral" : s === "BOOKED" ? "blue" : s === "SOLD" ? "navy" : "gray";

  // Lazy-load the Construction sub-tab
  useEffect(() => {
    if (tab === "Construction" && constr === null && !constrLoading) {
      setConstrLoading(true);
      api.get(`/township-crm/units/${unitId}/construction-status`)
        .then(r => { if (r?.success) setConstr(r.data); })
        .catch(() => {}).finally(() => setConstrLoading(false));
    }
  }, [tab]); // eslint-disable-line

  // Lazy-load the Payments sub-tab
  const loadPayments = useCallback(() => {
    setPaymentsLoading(true);
    api.get(`/township-crm/units/${unitId}/payments`)
      .then(r => { if (r?.success) setPayments(r.data); })
      .catch(() => {}).finally(() => setPaymentsLoading(false));
  }, [unitId]);
  useEffect(() => {
    if (tab === "Payments" && payments === null && !paymentsLoading) loadPayments();
  }, [tab]); // eslint-disable-line

  const markSold = async () => {
    if (!await window.confirmAsync("Mark this unit as SOLD (registration done)?")) return;
    setBusy(true);
    try {
      const r = await api.post(`/township-crm/units/${unitId}/complete-sale`, { note:"Registration done" });
      if (r?.success) onRefresh && onRefresh();
      else alert("Failed: " + (r?.message || ""));
    } catch (e) { alert("Failed: " + (e?.message || e)); }
    setBusy(false);
  };
  const cancelBooking = async () => {
    const reason = await window.promptAsync("Cancel booking — reason:");
    if (reason === null) return;
    setBusy(true);
    try {
      const r = await api.post(`/township-crm/units/${unitId}/cancel-booking`, { reason, refund_amount:0 });
      if (r?.success) onRefresh && onRefresh();
      else alert("Failed: " + (r?.message || ""));
    } catch (e) { alert("Failed: " + (e?.message || e)); }
    setBusy(false);
  };
  const addNote = async () => {
    const note = await window.promptAsync("Add a note for this unit:");
    if (!note) return;
    setBusy(true);
    try {
      const r = await api.post(`/township-crm/units/${unitId}/log-note`, { note, action_type:"note" });
      if (r?.success) onRefresh && onRefresh();
      else alert("Failed: " + (r?.message || ""));
    } catch (e) { alert("Failed: " + (e?.message || e)); }
    setBusy(false);
  };

  return createPortal(
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)",
      zIndex:9000, display:"flex", alignItems:"flex-start", justifyContent:"center",
      overflowY:"auto", padding:"40px 16px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background:T.surface, borderRadius:12,
        width:"100%", maxWidth:720, boxShadow:"0 24px 60px rgba(0,0,0,0.28)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.b1}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18, fontWeight:700, color:T.t1 }}>{u.unit_no}</span>
            <Pill label={sc.label} tone={statusTone(u.status)}/>
            {unit.has_mod && <Pill label="Modified" tone="amber"/>}
            {u.merger_group_id && <Pill label={u.merger_group_id} tone="purple"/>}
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none",
            fontSize:24, lineHeight:1, color:T.t2, cursor:"pointer" }}>×</button>
        </div>

        {/* Internal tab strip */}
        <div style={{ display:"flex", gap:2, padding:"8px 14px", borderBottom:`1px solid ${T.b1}`,
          overflowX:"auto", background:T.bg }}>
          {MODAL_TABS.map(mt => {
            const on = tab === mt;
            return (
              <button key={mt} onClick={() => setTab(mt)} style={{
                padding:"6px 11px", fontSize:11.5, fontWeight: on ? 600 : 500, borderRadius:6,
                whiteSpace:"nowrap", cursor:"pointer",
                background: on ? T.surface : "transparent",
                color: on ? T.pri : T.t2,
                border:`1px solid ${on ? T.pri : "transparent"}`,
              }}>{mt}</button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding:18, maxHeight:"60vh", overflowY:"auto" }}>
          {loading && (
            <div style={{ padding:"40px 20px", textAlign:"center", color:T.t2, fontSize:12.5 }}>Loading…</div>
          )}

          {!loading && tab === "Overview" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",
                gap:12, marginBottom:14 }}>
                <ModalInfo label="Type"        value={u.type_name || "—"}/>
                <ModalInfo label="BHK"         value={u.bhk != null ? `${Number(u.bhk)} BHK` : "—"}/>
                <ModalInfo label="Built-up"    value={u.built_up_area_sqft ? `${Number(u.built_up_area_sqft)} sqft` : "—"}/>
                <ModalInfo label="Plot area"   value={u.plot_area_sqft ? `${Number(u.plot_area_sqft)} sqft` : "—"}/>
                <ModalInfo label="Facing"      value={u.facing || "—"}/>
                <ModalInfo label="Corner"      value={u.is_corner ? "Yes" : "No"}/>
                <ModalInfo label="Garden"      value={u.is_garden_facing ? "Yes" : "No"}/>
                <ModalInfo label="Phase"       value={u.phase || "—"}/>
                <ModalInfo label="Base price"  value={inr(u.base_price)}/>
                <ModalInfo label="PLC charges" value={inr(u.plc_charges)}/>
                <ModalInfo label="Final price" value={inr(u.final_offered_price)} highlight/>
              </div>

              {/* Merger / modification alerts */}
              {detail?.merger_partner && detail.merger_partner.length > 0 && (
                <div style={{ background:"#EEEDFE", border:"1px solid #AFA9EC", borderRadius:8,
                  padding:"9px 12px", fontSize:11.5, color:"#3C3489", marginBottom:8 }}>
                  Part of <strong>{u.merger_group_id}</strong> merger group with unit{" "}
                  <strong>{detail.merger_partner.map(p => p.unit_no).join(", ")}</strong>.
                </div>
              )}
              {unit.has_mod && (
                <div style={{ background:T.ambL, border:"1px solid #EF9F27", borderRadius:8,
                  padding:"9px 12px", fontSize:11.5, color:"#633806", marginBottom:8 }}>
                  Has approved modifications — see the Customizations tab for details.
                </div>
              )}

              {/* Plan + elevation thumbnails */}
              <SectionH>Drawings</SectionH>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {["Plan","Elevation"].map(lbl => (
                  <div key={lbl} style={{ width:200, height:150, background:T.gryL,
                    border:`1px dashed ${T.b2}`, borderRadius:8, display:"flex",
                    alignItems:"center", justifyContent:"center",
                    fontSize:12, color:T.t3, fontWeight:500 }}>
                    {lbl} thumbnail
                  </div>
                ))}
              </div>

              {/* Booking lifecycle actions */}
              <SectionH>Actions</SectionH>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["HOLD","AVAILABLE","FOLLOWUP"].includes(u.status) && (
                  <Btn small primary label="Convert to Booking" disabled={busy}
                    onClick={() => setShowBookingForm(true)}/>
                )}
                {u.status === "BOOKED" && (
                  <>
                    <Btn small primary label="Mark as Sold" disabled={busy} onClick={markSold}/>
                    <Btn small danger label="Cancel Booking" disabled={busy} onClick={cancelBooking}/>
                  </>
                )}
                {u.status === "HOLD" && (
                  <Btn small danger label="Cancel Booking" disabled={busy} onClick={cancelBooking}/>
                )}
                <Btn small label="Add Note" disabled={busy} onClick={addNote}/>
              </div>
              {/* DECISION: Log Visit / Record Token are prospect-driven flows
                  handled from the Prospects tab; the Unit modal owns the
                  booking lifecycle (book / sell / cancel) + notes. */}
              <div style={{ fontSize:10, color:T.t3, marginTop:6 }}>
                Log Visit / Record Token prospect ke through Prospects tab se hote hain.
              </div>
            </>
          )}

          {!loading && tab === "Interested Leads" && (
            <div>
              {(detail?.interested_prospects || []).length === 0 ? (
                <div style={{ padding:"30px 20px", textAlign:"center", color:T.t3, fontSize:12 }}>
                  Is unit ke liye koi interested lead nahi hai.
                </div>
              ) : (
                detail.interested_prospects.map(p => (
                  <div key={p.id} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", gap:10, padding:"9px 11px", marginBottom:6,
                    background:T.gryL, borderRadius:8 }}>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{p.name}</div>
                      <div style={{ fontSize:10.5, color:T.t3 }}>{p.phone || "—"}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <Pill label={STAGE_DISPLAY[p.stage] || p.stage} tone="blue"/>
                      <div style={{ fontSize:10, color:T.t3, marginTop:3 }}>
                        {p.last_visit_date ? `Last: ${fmtDate(p.last_visit_date)}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loading && tab === "Followup History" && (
            <div>
              {(detail?.followup_history || []).length === 0 ? (
                <div style={{ padding:"30px 20px", textAlign:"center", color:T.t3, fontSize:12 }}>
                  Koi followup history nahi hai.
                </div>
              ) : (
                detail.followup_history.map(h => {
                  const ai = ACTION_ICON[h.action_type] || ACTION_ICON.note;
                  return (
                    <div key={h.id} style={{ display:"flex", gap:9, padding:"9px 0",
                      borderBottom:`1px solid ${T.b1}` }}>
                      <div style={{ marginTop:2 }}><SvgIco type={ai.icon} color={ai.color} size={14}/></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:T.t1 }}>
                          <strong style={{ fontWeight:600, textTransform:"capitalize" }}>
                            {String(h.action_type || "note").replace(/_/g," ")}
                          </strong>
                          {h.amount ? ` · ${inr(h.amount)}` : ""}
                          {h.prospect_name ? ` · ${h.prospect_name}` : ""}
                        </div>
                        {h.note && <div style={{ fontSize:11, color:T.t2, marginTop:2 }}>{h.note}</div>}
                        <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>
                          {fmtDate(h.follow_date)}
                          {h.by_user_name ? ` · by ${h.by_user_name}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {!loading && tab === "Construction" && (
            <div>
              {constrLoading && <div style={{ padding:"30px", textAlign:"center", color:T.t3, fontSize:12 }}>Loading…</div>}
              {!constrLoading && constr && (
                <>
                  {constr.batch ? (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:12, marginBottom:12 }}>
                      <ModalInfo label="Batch" value={`${constr.batch.batch_no} · ${constr.batch.batch_name || ""}`}/>
                      <ModalInfo label="Subcon" value={constr.batch.subcon_name || "—"}/>
                      <ModalInfo label="Handover target" value={fmtDate(constr.batch.target_completion_date)}/>
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:T.t3, marginBottom:10 }}>Unit kisi batch me nahi hai.</div>
                  )}
                  {constr.project ? (
                    <div style={{ background:T.gryL, borderRadius:8, padding:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:7 }}>
                        <span style={{ color:T.t2 }}>{constr.project.name}</span>
                        <span style={{ fontWeight:600, color:T.t1 }}>{constr.project.progress_pct}% · {constr.project.status || "—"}</span>
                      </div>
                      <ProgBar pct={constr.project.progress_pct}/>
                      <div style={{ marginTop:10 }}>
                        <Btn small label="Open in Projects"
                          icon={<SvgIco type="ext" color={T.t2} size={12}/>} onClick={onOpenProject}/>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:T.t3 }}>
                      Is batch ka koi linked construction project nahi hai — sync pending.
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!loading && tab === "Payments" && (
            <div>
              {paymentsLoading && <div style={{ padding:"30px", textAlign:"center", color:T.t3, fontSize:12 }}>Loading…</div>}
              {!paymentsLoading && payments && (
                (payments.milestones || []).length === 0 ? (
                  <div style={{ padding:"30px 20px", textAlign:"center", color:T.t3, fontSize:12 }}>
                    Is unit ka koi payment schedule nahi hai — pehle booking confirm karo.
                  </div>
                ) : (
                  <>
                    <div style={{ display:"flex", gap:14, marginBottom:10, fontSize:11.5 }}>
                      <span style={{ color:T.t2 }}>Total: <b style={{ color:T.t1 }}>{inr(payments.total_due)}</b></span>
                      <span style={{ color:T.t2 }}>Paid: <b style={{ color:T.kGrn }}>{inr(payments.total_paid)}</b></span>
                      <span style={{ color:T.t2 }}>Progress: <b style={{ color:T.pri }}>{payments.paid_pct}%</b></span>
                    </div>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                      <thead>
                        <tr>{["Milestone","Due date","Due","Paid","Status",""].map(h => (
                          <th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:9.5, fontWeight:600,
                            color:T.t2, textTransform:"uppercase", background:T.gryL, borderBottom:`1px solid ${T.b1}` }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {payments.milestones.map(m => {
                          const tone = m.status === "paid" ? "green" : m.status === "partial" ? "amber"
                            : m.overdue ? "coral" : "gray";
                          return (
                            <tr key={m.id}>
                              <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.t1 }}>{m.milestone_label}</td>
                              <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.t2 }}>{fmtDate(m.due_date)}</td>
                              <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.t1 }}>{inr(m.due_amount)}</td>
                              <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.kGrn }}>{inr(m.paid_amount)}</td>
                              <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}` }}>
                                <Pill label={m.overdue && m.status==="pending" ? "Overdue" : m.status} tone={tone}/>
                              </td>
                              <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}` }}>
                                {m.status !== "paid" && (
                                  <Btn small label="Record" onClick={() => setRecordPaymentRow(m)}/>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )
              )}
            </div>
          )}

          {!loading && tab === "Documents" && (
            <div style={{ padding:"40px 20px", textAlign:"center" }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.t1, marginBottom:4 }}>Documents</div>
              <div style={{ fontSize:12, color:T.t3 }}>Coming soon — Brief 4: Document Management</div>
            </div>
          )}
        </div>
      </div>

      {showBookingForm && (
        <BookingFormModal unit={u} interestedProspects={detail?.interested_prospects || []}
          onClose={() => setShowBookingForm(false)}
          onSaved={() => { setShowBookingForm(false); onRefresh && onRefresh(); }}/>
      )}
      {recordPaymentRow && (
        <PaymentRecordModal milestone={recordPaymentRow}
          onClose={() => setRecordPaymentRow(null)}
          onSaved={() => { setRecordPaymentRow(null); loadPayments(); }}/>
      )}
    </div>,
    document.body
  );
}

const ModalInfo = ({ label, value, highlight }) => (
  <div>
    <div style={{ fontSize:10, color:T.t3, textTransform:"uppercase", letterSpacing:0.3, marginBottom:2 }}>{label}</div>
    <div style={{ fontSize: highlight ? 14 : 12.5, fontWeight: highlight ? 700 : 500,
      color: highlight ? T.pri : T.t1 }}>{value}</div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// ADD UNIT MODAL — POST /projects/:id/units
// ════════════════════════════════════════════════════════════════
function AddUnitModal({ projectId, unitTypes, batches, onClose, onSaved }) {
  const [form, setForm] = useState({
    unit_no: "", unit_type_id: unitTypes[0]?.id || "", batch_id: "",
    facing: "", is_corner: false, is_garden_facing: false,
    base_price: "", plc_charges: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.unit_no.trim()) { alert("Unit No is required"); return; }
    if (!form.unit_type_id)   { alert("Unit Type is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/township-crm/projects/${projectId}/units`, {
        unit_no: form.unit_no.trim(),
        unit_type_id: Number(form.unit_type_id),
        batch_id: form.batch_id ? Number(form.batch_id) : null,
        facing: form.facing || null,
        is_corner: form.is_corner ? 1 : 0,
        is_garden_facing: form.is_garden_facing ? 1 : 0,
        base_price: form.base_price !== "" ? Number(form.base_price) : null,
        plc_charges: form.plc_charges !== "" ? Number(form.plc_charges) : null,
      });
      if (res?.success) onSaved();
      else alert("Add unit failed: " + (res?.message || "unknown error"));
    } catch (e) {
      alert("Add unit failed: " + (e?.message || e));
    }
    setSaving(false);
  };

  return (
    <Modal title="Add Unit" onClose={onClose} width={500}>
      <div style={{ display:"grid", gap:11 }}>
        <div>
          <label style={labelStyle}>Unit No *</label>
          <input style={inputStyle} value={form.unit_no}
            onChange={(e) => set("unit_no", e.target.value)} placeholder="e.g. A-103"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Unit Type *</label>
            <select style={inputStyle} value={form.unit_type_id}
              onChange={(e) => set("unit_type_id", e.target.value)}>
              <option value="">— Select —</option>
              {unitTypes.map(t => (
                <option key={t.id} value={t.id}>{t.type_name} ({t.type_code})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Batch</label>
            <select style={inputStyle} value={form.batch_id}
              onChange={(e) => set("batch_id", e.target.value)}>
              <option value="">— None —</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.batch_no} · {b.unit_range_label || b.batch_name || ""}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Facing</label>
            <select style={inputStyle} value={form.facing}
              onChange={(e) => set("facing", e.target.value)}>
              <option value="">— None —</option>
              {FACINGS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:14, alignItems:"flex-end", paddingBottom:6 }}>
            <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:T.t2, cursor:"pointer" }}>
              <input type="checkbox" checked={form.is_corner}
                onChange={(e) => set("is_corner", e.target.checked)}/> Corner
            </label>
            <label style={{ display:"flex", gap:5, alignItems:"center", fontSize:12, color:T.t2, cursor:"pointer" }}>
              <input type="checkbox" checked={form.is_garden_facing}
                onChange={(e) => set("is_garden_facing", e.target.checked)}/> Garden
            </label>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Base Price (₹)</label>
            <input style={inputStyle} type="number" value={form.base_price}
              onChange={(e) => set("base_price", e.target.value)} placeholder="Default from type"/>
          </div>
          <div>
            <label style={labelStyle}>PLC Charges (₹)</label>
            <input style={inputStyle} type="number" value={form.plc_charges}
              onChange={(e) => set("plc_charges", e.target.value)} placeholder="Default 0"/>
          </div>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Saving…" : "Add Unit"} onClick={submit} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// ADD PROSPECT MODAL — POST /projects/:id/prospects
// ════════════════════════════════════════════════════════════════
function AddProspectModal({ projectId, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:"", phone:"", email:"", stage:"new_inquiry", priority:"Medium",
    source:"", budget_min:"", budget_max:"", notes:"",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      const res = await api.post(`/township-crm/projects/${projectId}/prospects`, {
        name: form.name.trim(),
        phone: form.phone || null,
        email: form.email || null,
        stage: form.stage,
        priority: form.priority,
        source: form.source || null,
        budget_min: form.budget_min !== "" ? Number(form.budget_min) : null,
        budget_max: form.budget_max !== "" ? Number(form.budget_max) : null,
        notes: form.notes || null,
      });
      if (res?.success) onSaved();
      else alert("Add prospect failed: " + (res?.message || "unknown error"));
    } catch (e) {
      alert("Add prospect failed: " + (e?.message || e));
    }
    setSaving(false);
  };

  return (
    <Modal title="Add Prospect" onClose={onClose} width={500}>
      <div style={{ display:"grid", gap:11 }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input style={inputStyle} value={form.name}
            onChange={(e) => set("name", e.target.value)} placeholder="Prospect name"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone}
              onChange={(e) => set("phone", e.target.value)}/>
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} value={form.email}
              onChange={(e) => set("email", e.target.value)}/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Stage</label>
            <select style={inputStyle} value={form.stage}
              onChange={(e) => set("stage", e.target.value)}>
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_DISPLAY[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority}
              onChange={(e) => set("priority", e.target.value)}>
              {["High","Medium","Low"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Source</label>
          <input style={inputStyle} value={form.source}
            onChange={(e) => set("source", e.target.value)} placeholder="Just Dial / Walk-in / Reference"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Budget Min (₹)</label>
            <input style={inputStyle} type="number" value={form.budget_min}
              onChange={(e) => set("budget_min", e.target.value)}/>
          </div>
          <div>
            <label style={labelStyle}>Budget Max (₹)</label>
            <input style={inputStyle} type="number" value={form.budget_max}
              onChange={(e) => set("budget_max", e.target.value)}/>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, minHeight:54, resize:"vertical" }} value={form.notes}
            onChange={(e) => set("notes", e.target.value)}/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Saving…" : "Add Prospect"} onClick={submit} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// PROSPECT DETAIL MODAL — view / edit / delete / change-stage
// ════════════════════════════════════════════════════════════════
function ProspectDetailModal({ prospectId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/township-crm/prospects/${prospectId}`);
      if (res?.success) {
        setData(res.data);
        setForm({
          name: res.data.name || "", phone: res.data.phone || "",
          email: res.data.email || "", priority: res.data.priority || "Medium",
          source: res.data.source || "", budget_min: res.data.budget_min || "",
          budget_max: res.data.budget_max || "", notes: res.data.notes || "",
        });
      }
    } catch (e) { console.error("prospect detail:", e); }
    setLoading(false);
  }, [prospectId]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    if (!form.name.trim()) { alert("Name is required"); return; }
    setBusy(true);
    try {
      const res = await api.put(`/township-crm/prospects/${prospectId}`, {
        name: form.name.trim(), phone: form.phone || null, email: form.email || null,
        priority: form.priority, source: form.source || null,
        budget_min: form.budget_min !== "" ? Number(form.budget_min) : null,
        budget_max: form.budget_max !== "" ? Number(form.budget_max) : null,
        notes: form.notes || null,
      });
      if (res?.success) { setEditing(false); await load(); onChanged && onChanged(); }
      else alert("Update failed: " + (res?.message || "unknown error"));
    } catch (e) { alert("Update failed: " + (e?.message || e)); }
    setBusy(false);
  };

  const changeStage = async (stage) => {
    setBusy(true);
    try {
      const res = await api.put(`/township-crm/prospects/${prospectId}`, { stage });
      if (res?.success) { await load(); onChanged && onChanged(); }
      else alert("Stage change failed: " + (res?.message || "unknown error"));
    } catch (e) { alert("Stage change failed: " + (e?.message || e)); }
    setBusy(false);
  };

  const remove = async () => {
    if (!await window.confirmAsync("Is prospect ko delete karna hai?")) return;
    setBusy(true);
    try {
      const res = await api.del(`/township-crm/prospects/${prospectId}`);
      if (res?.success) { onChanged && onChanged(); onClose(); }
      else alert("Delete failed: " + (res?.message || "unknown error"));
    } catch (e) { alert("Delete failed: " + (e?.message || e)); }
    setBusy(false);
  };

  return (
    <Modal title={data ? data.name : "Prospect"} onClose={onClose} width={560}>
      {loading && <div style={{ padding:"30px 10px", textAlign:"center", color:T.t2, fontSize:12.5 }}>Loading…</div>}

      {!loading && data && !editing && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexWrap:"wrap" }}>
            <Pill label={STAGE_DISPLAY[data.stage] || data.stage} tone="blue"/>
            <Pill label={data.priority} tone={data.priority === "High" ? "coral" : data.priority === "Low" ? "gray" : "amber"}/>
            {data.source && <span style={{ fontSize:11, color:T.t3 }}>via {data.source}</span>}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px,1fr))", gap:12, marginBottom:14 }}>
            <ModalInfo label="Phone" value={data.phone || "—"}/>
            <ModalInfo label="Email" value={data.email || "—"}/>
            <ModalInfo label="Budget" value={
              data.budget_min || data.budget_max
                ? `${inr(data.budget_min)}–${inr(data.budget_max)}` : "—"
            }/>
            <ModalInfo label="Assigned to" value={data.assigned_to || "—"}/>
          </div>
          {data.notes && (
            <div style={{ fontSize:11.5, color:T.t2, background:T.gryL, padding:"8px 11px",
              borderRadius:7, marginBottom:12 }}>{data.notes}</div>
          )}

          <SectionH style={{ marginTop:0 }}>Interested units ({data.interested_unit_count || 0})</SectionH>
          {(data.interested_units || []).length === 0 ? (
            <div style={{ fontSize:11, color:T.t3, marginBottom:6 }}>Koi unit linked nahi hai.</div>
          ) : (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
              {data.interested_units.map(u => <Pill key={u.unit_id} label={u.unit_no} tone="blue"/>)}
            </div>
          )}

          <SectionH>Followup history</SectionH>
          {(data.followup_history || []).length === 0 ? (
            <div style={{ fontSize:11, color:T.t3 }}>Koi followup history nahi hai.</div>
          ) : (
            data.followup_history.map(h => {
              const ai = ACTION_ICON[h.action_type] || ACTION_ICON.note;
              return (
                <div key={h.id} style={{ display:"flex", gap:9, padding:"8px 0", borderBottom:`1px solid ${T.b1}` }}>
                  <div style={{ marginTop:2 }}><SvgIco type={ai.icon} color={ai.color} size={13}/></div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11.5, color:T.t1 }}>
                      <strong style={{ fontWeight:600, textTransform:"capitalize" }}>
                        {String(h.action_type || "note").replace(/_/g," ")}
                      </strong>
                      {h.unit_no ? ` · ${h.unit_no}` : ""}{h.amount ? ` · ${inr(h.amount)}` : ""}
                    </div>
                    {h.note && <div style={{ fontSize:10.5, color:T.t2, marginTop:1 }}>{h.note}</div>}
                    <div style={{ fontSize:10, color:T.t3, marginTop:1 }}>{fmtDate(h.follow_date)}</div>
                  </div>
                </div>
              );
            })
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:T.t2 }}>Change stage:</span>
            <select value={data.stage} disabled={busy}
              onChange={(e) => changeStage(e.target.value)}
              style={{ ...inputStyle, width:"auto", padding:"5px 8px", fontSize:11.5 }}>
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_DISPLAY[s]}</option>)}
            </select>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              <Btn small label="Edit" onClick={() => setEditing(true)}/>
              <Btn small danger label="Delete" onClick={remove} disabled={busy}/>
            </div>
          </div>
        </>
      )}

      {!loading && data && editing && (
        <>
          <div style={{ display:"grid", gap:11 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)}/>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={form.email} onChange={(e) => set("email", e.target.value)}/>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
              <div>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                  {["High","Medium","Low"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Source</label>
                <input style={inputStyle} value={form.source} onChange={(e) => set("source", e.target.value)}/>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
              <div>
                <label style={labelStyle}>Budget Min (₹)</label>
                <input style={inputStyle} type="number" value={form.budget_min} onChange={(e) => set("budget_min", e.target.value)}/>
              </div>
              <div>
                <label style={labelStyle}>Budget Max (₹)</label>
                <input style={inputStyle} type="number" value={form.budget_max} onChange={(e) => set("budget_max", e.target.value)}/>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight:54, resize:"vertical" }} value={form.notes}
                onChange={(e) => set("notes", e.target.value)}/>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
            <Btn small label="Cancel" onClick={() => setEditing(false)}/>
            <Btn small primary label={busy ? "Saving…" : "Save Changes"} onClick={saveEdit} disabled={busy}/>
          </div>
        </>
      )}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// BOOKING DETAIL MODAL — customer info + payment schedule + actions
// ════════════════════════════════════════════════════════════════
function BookingDetailModal({ booking, onClose, onChanged }) {
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recordRow, setRecordRow] = useState(null);
  const unitId = booking.unit_id;

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/township-crm/units/${unitId}/payments`)
      .then(r => { if (r?.success) setPayments(r.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [unitId]);
  useEffect(() => { load(); }, [load]);

  const markSold = async () => {
    if (!await window.confirmAsync("Mark this unit as SOLD?")) return;
    setBusy(true);
    try {
      const r = await api.post(`/township-crm/units/${unitId}/complete-sale`, { note:"Registration done" });
      if (r?.success) { onChanged && onChanged(); onClose(); }
      else alert("Failed: " + (r?.message || ""));
    } catch (e) { alert("Failed: " + (e?.message || e)); }
    setBusy(false);
  };
  const cancelBooking = async () => {
    const reason = await window.promptAsync("Cancel booking — reason:");
    if (reason === null) return;
    setBusy(true);
    try {
      const r = await api.post(`/township-crm/units/${unitId}/cancel-booking`, { reason, refund_amount:0 });
      if (r?.success) { onChanged && onChanged(); onClose(); }
      else alert("Failed: " + (r?.message || ""));
    } catch (e) { alert("Failed: " + (e?.message || e)); }
    setBusy(false);
  };

  return (
    <Modal title={`${booking.name} · ${booking.unit}`} onClose={onClose} width={620}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <Pill label={booking.status} tone={booking.status === "BOOKED" ? "blue" : booking.status === "HOLD" ? "coral" : "navy"}/>
        {booking.unitTag && <Pill label={booking.unitTag.label} tone={booking.unitTag.tone}/>}
        <span style={{ fontSize:11.5, color:T.t3 }}>{booking.phone}</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))", gap:12, marginBottom:14 }}>
        <ModalInfo label="Agreement value" value={booking.value}/>
        <ModalInfo label="Paid so far" value={booking.paid}/>
        <ModalInfo label="Next due" value={booking.due}/>
      </div>

      <SectionH style={{ marginTop:0 }}>Payment schedule</SectionH>
      {loading && <div style={{ padding:"24px", textAlign:"center", color:T.t3, fontSize:12 }}>Loading…</div>}
      {!loading && payments && (
        (payments.milestones || []).length === 0 ? (
          <div style={{ fontSize:11.5, color:T.t3, padding:"8px 0" }}>
            Koi payment schedule nahi — HOLD unit hai (sirf token recorded).
          </div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>{["Milestone","Due date","Due","Paid","Status",""].map(h => (
                <th key={h} style={{ padding:"6px 8px", textAlign:"left", fontSize:9.5, fontWeight:600,
                  color:T.t2, textTransform:"uppercase", background:T.gryL, borderBottom:`1px solid ${T.b1}` }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {payments.milestones.map(m => {
                const tone = m.status === "paid" ? "green" : m.status === "partial" ? "amber"
                  : m.overdue ? "coral" : "gray";
                return (
                  <tr key={m.id}>
                    <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.t1 }}>{m.milestone_label}</td>
                    <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.t2 }}>{fmtDate(m.due_date)}</td>
                    <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.t1 }}>{inr(m.due_amount)}</td>
                    <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}`, color:T.kGrn }}>{inr(m.paid_amount)}</td>
                    <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}` }}>
                      <Pill label={m.overdue && m.status==="pending" ? "Overdue" : m.status} tone={tone}/>
                    </td>
                    <td style={{ padding:"6px 8px", borderBottom:`1px solid ${T.b1}` }}>
                      {m.status !== "paid" && <Btn small label="Record" onClick={() => setRecordRow(m)}/>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}

      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16,
        paddingTop:12, borderTop:`1px solid ${T.b1}` }}>
        {booking.status === "BOOKED" && (
          <Btn small primary label="Mark as Sold" disabled={busy} onClick={markSold}/>
        )}
        {["HOLD","BOOKED"].includes(booking.status) && (
          <Btn small danger label="Cancel Booking" disabled={busy} onClick={cancelBooking}/>
        )}
        <Btn small label="Close" onClick={onClose}/>
      </div>

      {recordRow && (
        <PaymentRecordModal milestone={recordRow}
          onClose={() => setRecordRow(null)}
          onSaved={() => { setRecordRow(null); load(); onChanged && onChanged(); }}/>
      )}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// BOOKING FORM MODAL — convert HOLD/AVAILABLE → BOOKED
// ════════════════════════════════════════════════════════════════
function BookingFormModal({ unit, interestedProspects, onClose, onSaved }) {
  const [form, setForm] = useState({
    prospect_id: interestedProspects[0]?.id || "",
    agreement_value: unit.final_offered_price || "",
    booked_date: new Date().toISOString().slice(0, 10),
    note: "Agreement signed",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.prospect_id) { alert("Select a prospect to book against"); return; }
    setSaving(true);
    try {
      const r = await api.post(`/township-crm/units/${unit.id}/book`, {
        prospect_id: Number(form.prospect_id),
        agreement_value: form.agreement_value !== "" ? Number(form.agreement_value) : null,
        booked_date: form.booked_date,
        note: form.note || null,
      });
      if (r?.success) onSaved();
      else alert("Booking failed: " + (r?.message || ""));
    } catch (e) { alert("Booking failed: " + (e?.message || e)); }
    setSaving(false);
  };

  return (
    <Modal title={`Convert ${unit.unit_no} to Booking`} onClose={onClose} width={460}>
      {interestedProspects.length === 0 ? (
        <div style={{ fontSize:12, color:T.t2, padding:"10px 0" }}>
          Is unit ke saath koi prospect linked nahi hai. Pehle Prospects tab se ek site visit / token log karo.
        </div>
      ) : (
        <div style={{ display:"grid", gap:11 }}>
          <div>
            <label style={labelStyle}>Customer (from prospect) *</label>
            <select style={inputStyle} value={form.prospect_id}
              onChange={(e) => set("prospect_id", e.target.value)}>
              {interestedProspects.map(p => (
                <option key={p.id} value={p.id}>{p.name} · {p.phone || "—"}</option>
              ))}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
            <div>
              <label style={labelStyle}>Agreement value (₹)</label>
              <input style={inputStyle} type="number" value={form.agreement_value}
                onChange={(e) => set("agreement_value", e.target.value)}/>
            </div>
            <div>
              <label style={labelStyle}>Booked date</label>
              <input style={inputStyle} type="date" value={form.booked_date}
                onChange={(e) => set("booked_date", e.target.value)}/>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Note</label>
            <input style={inputStyle} value={form.note} onChange={(e) => set("note", e.target.value)}/>
          </div>
          <div style={{ fontSize:10.5, color:T.t3 }}>
            Booking par 10-milestone RERA payment schedule auto-generate hoga.
          </div>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Booking…" : "Confirm Booking"}
          onClick={submit} disabled={saving || interestedProspects.length === 0}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// PAYMENT RECORD MODAL — record a payment against a milestone
// ════════════════════════════════════════════════════════════════
function PaymentRecordModal({ milestone, onClose, onSaved }) {
  const remaining = Math.max(0, Number(milestone.due_amount || 0) - Number(milestone.paid_amount || 0));
  const [form, setForm] = useState({
    amount: remaining || "",
    paid_date: new Date().toISOString().slice(0, 10),
    payment_mode: "NEFT",
    txn_ref: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.amount || Number(form.amount) <= 0) { alert("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const r = await api.post(`/township-crm/payments/${milestone.id}/record`, {
        amount: Number(form.amount),
        paid_date: form.paid_date,
        payment_mode: form.payment_mode || null,
        txn_ref: form.txn_ref || null,
      });
      if (r?.success) onSaved();
      else alert("Record failed: " + (r?.message || ""));
    } catch (e) { alert("Record failed: " + (e?.message || e)); }
    setSaving(false);
  };

  return (
    <Modal title={`Record Payment — ${milestone.milestone_label}`} onClose={onClose} width={420}>
      <div style={{ fontSize:11.5, color:T.t2, marginBottom:12 }}>
        Due: <b style={{ color:T.t1 }}>{inr(milestone.due_amount)}</b> ·
        Already paid: <b style={{ color:T.kGrn }}>{inr(milestone.paid_amount)}</b>
      </div>
      <div style={{ display:"grid", gap:11 }}>
        <div>
          <label style={labelStyle}>Amount (₹) *</label>
          <input style={inputStyle} type="number" value={form.amount}
            onChange={(e) => set("amount", e.target.value)}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
          <div>
            <label style={labelStyle}>Paid date</label>
            <input style={inputStyle} type="date" value={form.paid_date}
              onChange={(e) => set("paid_date", e.target.value)}/>
          </div>
          <div>
            <label style={labelStyle}>Mode</label>
            <select style={inputStyle} value={form.payment_mode}
              onChange={(e) => set("payment_mode", e.target.value)}>
              {["NEFT","RTGS","UPI","Cheque","Cash"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Txn reference</label>
          <input style={inputStyle} value={form.txn_ref} onChange={(e) => set("txn_ref", e.target.value)}/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Saving…" : "Record Payment"} onClick={submit} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// CUSTOMIZATION DETAIL MODAL — view / change status / delete
// ════════════════════════════════════════════════════════════════
const CZ_STATUSES = ["requested","approved","sent_to_subcon","in_progress","done","cancelled"];
function CustomizationDetailModal({ customization, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const c = customization;

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const r = await api.put(`/township-crm/customizations/${c.id}`, { status });
      if (r?.success) { onChanged && onChanged(); onClose(); }
      else alert("Update failed: " + (r?.message || ""));
    } catch (e) { alert("Update failed: " + (e?.message || e)); }
    setBusy(false);
  };
  const remove = async () => {
    if (!await window.confirmAsync("Delete this customization?")) return;
    setBusy(true);
    try {
      const r = await api.del(`/township-crm/customizations/${c.id}`);
      if (r?.success) { onChanged && onChanged(); onClose(); }
      else alert("Delete failed: " + (r?.message || ""));
    } catch (e) { alert("Delete failed: " + (e?.message || e)); }
    setBusy(false);
  };

  return (
    <Modal title={c.title} onClose={onClose} width={500}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        {c.kind === "merger"
          ? <Pill label={`MERGER · ${c.code}`} tone="purple"/>
          : <Pill label="MODIFICATION" tone="amber"/>}
        <Pill label={c.status.label} tone={c.status.tone}/>
      </div>
      <div style={{ fontSize:11.5, color:T.t2, marginBottom:8 }}>Customer: {c.customer}</div>
      <div style={{ fontSize:11.5, color:T.t1, background:T.gryL, padding:"8px 11px",
        borderRadius:7, marginBottom:10 }}>{c.desc}</div>
      {c.kind === "merger" ? (
        <div style={{ fontSize:11, color:T.t2, marginBottom:10 }}>{c.pricing}<strong>{c.finalLabel}</strong></div>
      ) : (
        <div style={{ fontSize:11, color:T.t2, marginBottom:10 }}>{c.detail}</div>
      )}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:14, flexWrap:"wrap",
        paddingTop:12, borderTop:`1px solid ${T.b1}` }}>
        <span style={{ fontSize:11, color:T.t2 }}>Change status:</span>
        <select disabled={busy} defaultValue=""
          onChange={(e) => e.target.value && changeStatus(e.target.value)}
          style={{ ...inputStyle, width:"auto", padding:"5px 8px", fontSize:11.5 }}>
          <option value="">— Select —</option>
          {CZ_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
        </select>
        <div style={{ marginLeft:"auto" }}>
          <Btn small danger label="Delete" disabled={busy} onClick={remove}/>
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// CUSTOMIZATION FORM MODAL — create modification or merger
// ════════════════════════════════════════════════════════════════
function CustomizationFormModal({ projectId, units, onClose, onSaved }) {
  const [kind, setKind] = useState("plan_modification");
  const [form, setForm] = useState({
    primary_unit_id: "", partner_unit_id: "", description: "", extra_cost: "",
  });
  const [saving, setSaving] = useState(false);
  const [eligNote, setEligNote] = useState("");
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Booked units make the best modification targets; allow any for merger.
  const sortedUnits = [...units].sort((a, b) => {
    const [pa, na] = unitSortKey(a.unit_no), [pb, nb] = unitSortKey(b.unit_no);
    return pa < pb ? -1 : pa > pb ? 1 : na - nb;
  });

  const checkElig = async () => {
    if (!form.primary_unit_id || !form.partner_unit_id) { setEligNote(""); return; }
    try {
      const r = await api.post(`/township-crm/units/${form.primary_unit_id}/check-merger-eligibility`,
        { partner_unit_ids: [Number(form.partner_unit_id)] });
      if (r?.success) {
        setEligNote(r.data.eligible ? `✓ Eligible — ${r.data.all_unit_nos.join(" + ")}` : `✗ ${r.data.reason}`);
      }
    } catch (e) { setEligNote(""); }
  };

  const submit = async () => {
    if (!form.primary_unit_id) { alert("Select the primary unit"); return; }
    if (kind === "unit_merger" && !form.partner_unit_id) { alert("Select a partner unit for the merger"); return; }
    setSaving(true);
    try {
      const body = {
        customization_type: kind,
        primary_unit_id: Number(form.primary_unit_id),
        description: form.description || null,
        extra_cost: form.extra_cost !== "" ? Number(form.extra_cost) : 0,
      };
      if (kind === "unit_merger") body.linked_unit_ids = [Number(form.partner_unit_id)];
      const r = await api.post(`/township-crm/projects/${projectId}/customizations`, body);
      if (r?.success) onSaved();
      else alert("Failed: " + (r?.message || ""));
    } catch (e) { alert("Failed: " + (e?.message || e)); }
    setSaving(false);
  };

  return (
    <Modal title="New Customization" onClose={onClose} width={500}>
      <div style={{ display:"grid", gap:11 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display:"flex", gap:8 }}>
            <Chip label="Modification" active={kind === "plan_modification"}
              onClick={() => { setKind("plan_modification"); setEligNote(""); }}/>
            <Chip label="Merger" active={kind === "unit_merger"}
              onClick={() => setKind("unit_merger")}/>
          </div>
        </div>
        <div>
          <label style={labelStyle}>{kind === "unit_merger" ? "Primary unit *" : "Unit *"}</label>
          <select style={inputStyle} value={form.primary_unit_id}
            onChange={(e) => { set("primary_unit_id", e.target.value); }}
            onBlur={checkElig}>
            <option value="">— Select —</option>
            {sortedUnits.map(u => (
              <option key={u.id} value={u.id}>{u.unit_no} · {u.status}</option>
            ))}
          </select>
        </div>
        {kind === "unit_merger" && (
          <div>
            <label style={labelStyle}>Partner unit (adjacent, same batch) *</label>
            <select style={inputStyle} value={form.partner_unit_id}
              onChange={(e) => set("partner_unit_id", e.target.value)}
              onBlur={checkElig}>
              <option value="">— Select —</option>
              {sortedUnits.map(u => (
                <option key={u.id} value={u.id}>{u.unit_no} · {u.status}</option>
              ))}
            </select>
            {eligNote && (
              <div style={{ fontSize:10.5, marginTop:4,
                color: eligNote.startsWith("✓") ? T.kGrn : "#B4453A" }}>{eligNote}</div>
            )}
          </div>
        )}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight:54, resize:"vertical" }} value={form.description}
            onChange={(e) => set("description", e.target.value)}/>
        </div>
        <div>
          <label style={labelStyle}>Extra cost (₹)</label>
          <input style={inputStyle} type="number" value={form.extra_cost}
            onChange={(e) => set("extra_cost", e.target.value)}/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
        <Btn small label="Cancel" onClick={onClose}/>
        <Btn small primary label={saving ? "Saving…" : "Create"} onClick={submit} disabled={saving}/>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// STUCK UNITS MODAL — report: units idle 30+ days
// ════════════════════════════════════════════════════════════════
function StuckUnitsModal({ projectId, onClose }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api.get(`/township-crm/projects/${projectId}/reports/stuck-units?days=30`)
      .then(r => { if (r?.success) setRows(r.data || []); })
      .catch(() => setRows([]));
  }, [projectId]);

  return (
    <Modal title="Stuck units (30+ days idle)" onClose={onClose} width={520}>
      {rows === null && <div style={{ padding:"24px", textAlign:"center", color:T.t3, fontSize:12 }}>Loading…</div>}
      {rows && rows.length === 0 && (
        <div style={{ padding:"24px", textAlign:"center", color:T.t3, fontSize:12.5 }}>
          Koi stuck unit nahi — sab units pe recent activity hai.
        </div>
      )}
      {rows && rows.length > 0 && (
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11.5 }}>
          <thead>
            <tr>{["Unit","Status","Last activity"].map(h => (
              <th key={h} style={{ padding:"7px 9px", textAlign:"left", fontSize:10, fontWeight:600,
                color:T.t2, textTransform:"uppercase", background:T.gryL, borderBottom:`1px solid ${T.b1}` }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ padding:"8px 9px", borderBottom:`1px solid ${T.b1}`, fontWeight:600, color:T.t1 }}>{r.unit_no}</td>
                <td style={{ padding:"8px 9px", borderBottom:`1px solid ${T.b1}` }}>
                  <Pill label={r.status} tone={r.status === "HOLD" ? "coral" : "amber"}/>
                </td>
                <td style={{ padding:"8px 9px", borderBottom:`1px solid ${T.b1}`, color:T.t2 }}>
                  {fmtDate(r.last_activity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
