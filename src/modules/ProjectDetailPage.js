import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import api, { API_BASE } from "../config/api";
import apiCache from "../utils/apiCache";
import { Avatar, Credit } from "../components/Credit";
import PaymentRequestDrawer from "../components/PaymentRequestDrawer";
import SearchSelect from "../components/SearchSelect";
import LibrarySelect from "../components/LibrarySelect";
import MaterialFlowDrawer from "../components/MaterialFlowDrawer";
import MRDetailDrawer from "../components/MRDetailDrawer";
import MaterialTransferTab from "../components/MaterialTransferTab";
import MaterialLedgerDrawer from "../components/MaterialLedgerDrawer";
import uploadManager from "../utils/uploadManager";
import EstimateBuilderModal from "./EstimateBuilderModal";
import MOMModule from "./MOMModule";
import MapPicker from "../components/MapPicker";
import { T, fmt, fmtN, localYMD, PROJ, STATUS_S, STAGES, STAGE_S } from "./shared/tokens";
import { Pill, PBar, Stat, Panel, PHead, THead, AddBtn, SecBtn, FilterTabs, TabIc } from "./shared/ui";

// ── "Waiting on" label ─────────────────────────────────────────────────────
// Backend /approvals/pending bhejta hai: _waitingOn (role label, escalation ke
// BAAD), _waitingOnName (pehla approver), _waitingOnMore (+N), aur
// _escalated/_escalatedFrom (level apne-aap upar gaya kyunki project me wo role
// hai hi nahi). Pehle sirf role dikhta tha — "Waiting on approver" — jisse
// admin ko na ye pata chalta tha ki kis par ruka hai, na kyun uske paas aaya.
// Jaan-boojh kar yahan ki apni copy hai: modules self-contained rehte hain
// (CLAUDE.md), isliye ProjectsModule se import NAHI karte.
const waitingText = (it) => {
  if (!it) return null;
  const role = it._waitingOn || it.pending_role || "";
  if (!role) return null;
  const nm = it._waitingOnName;
  const more = Number(it._waitingOnMore) || 0;
  return nm ? `${role}: ${nm}${more > 0 ? ` +${more}` : ""}` : role;
};
const escalationNote = (it) =>
  it && it._escalated && it._escalatedFrom
    ? `is project me koi ${it._escalatedFrom} nahi — isliye ${it._waitingOn || "Admin"} ke paas`
    : null;

// ── TAB CODE-SPLITTING — each tab chunk loads on first open ──────────
const TabEstimate    = lazy(() => import("./tabs/TabEstimate"));
const TabBudget      = lazy(() => import("./tabs/TabBudget"));
const TabTasks       = lazy(() => import("./tabs/TabTasks"));
const TabSubcon      = lazy(() => import("./tabs/TabSubcon"));
const TabMaterial    = lazy(() => import("./tabs/TabMaterial"));
const TabAttendance  = lazy(() => import("./tabs/TabAttendance"));
const TabOverview    = lazy(() => import("./tabs/TabOverview"));
const TabDesign      = lazy(() => import("./tabs/TabDesign"));
const TabParty       = lazy(() => import("./tabs/TabParty"));
const TabTransaction = lazy(() => import("./tabs/TabTransaction"));
const TabTodo        = lazy(() => import("./tabs/TabTodo"));
const TabEquipment   = lazy(() => import("./tabs/TabEquipment"));
const TabFiles       = lazy(() => import("./tabs/TabFiles"));
// Solar ka Files tab (Aadhaar/PAN/ITR ka checklist) construction site par
// bekaar hai — wahan site ke apne kaagaz aur photo dikhne chahiye.
const TabProjectFiles= lazy(() => import("./tabs/TabProjectFiles"));
const TabSite        = lazy(() => import("./tabs/TabSite"));
const TabMOM         = lazy(() => import("./tabs/TabMOM"));
const TabSuryaGhar   = lazy(() => import("./tabs/TabSolar").then(m => ({ default: m.TabSuryaGhar })));
const TabSolarBOQ    = lazy(() => import("./tabs/TabSolar").then(m => ({ default: m.TabSolarBOQ })));
const TabSolarDocs   = lazy(() => import("./tabs/TabSolar").then(m => ({ default: m.TabSolarDocs })));
const TabSolarInstall= lazy(() => import("./tabs/TabSolar").then(m => ({ default: m.TabSolarInstall })));
const TabSolarSubsidy= lazy(() => import("./tabs/TabSolar").then(m => ({ default: m.TabSolarSubsidy })));

// ── DATA ──────────────────────────────────────────────────────────────
const D = {
  milestones:[],
  expBreakdown:[],
  drawings:[],
  boqSections:[],
  invoices:[],
  parties:[],
  partyTxns:{},
  transactions:[],
  todos:[],
  tasks:[],
  attendance:[],
  materials:[],
  subcons:[],
  equipment:[],
  folders:[],
  dpr:[],
  moms:[],
};

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — OVERVIEW
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — DESIGN
// ═══════════════════════════════════════════════════════════════════
// ── DESIGN REQUEST MODAL — outside TabDesign to prevent cursor jump ──────

// ── TitleDropdown — select title from library, auto-fills category+type ──

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — ESTIMATE
// ═══════════════════════════════════════════════════════════════════

// TAB 4 — PARTY
// ═══════════════════════════════════════════════════════════════════

// Reuse the full-featured Create Transaction modal from FinanceModule
// (with bank account, MOP, duplicate-payment guard, GRN-link logic).
// ═══════════════════════════════════════════════════════════════════
// TAB 5 — TRANSACTION
// ═══════════════════════════════════════════════════════════════════

// TAB 6 — TO-DO
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// TAB 7 — TASKS  (3-level hierarchy, dependencies, DHYAN RAKHEN, filters)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// TAB 8 — ATTENDANCE
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// TAB 9 — MATERIAL (Site Stock)
// ═══════════════════════════════════════════════════════════════════




// Project-level equipment deployment tracking — period (from/to dates)
// + status (On Site / Returned). Matches the mobile EquipmentTab UX.
// Backed by /library/project-equipment.

// ═══════════════════════════════════════════════════════════════════
// TAB 12 — FILES
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// TAB 13 — SITE / DPR
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// TAB 14 — MOM
// ═══════════════════════════════════════════════════════════════════
// TAB 14 — MOM  (wired to /api/mom?project_id=...)
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// TAB 14 — MOM
// ═══════════════════════════════════════════════════════════════════
// PROJECT DETAIL PAGE — SHELL
// ═══════════════════════════════════════════════════════════════════

const IcOverview  = (p) => <TabIc {...p} d="M3 12l2-2 4 4 6-6 6 6M3 21h18"/>;
const IcDesign    = (p) => <TabIc {...p} d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"/>;
const IcEstimate  = (p) => <TabIc {...p} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM16 8H8m0 4h8m-8 4h5"/>;
const IcParty     = (p) => <TabIc {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>;
const IcTrans     = (p) => <TabIc {...p} d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>;
const IcTodo      = (p) => <TabIc {...p} d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>;
const IcTask      = (p) => <TabIc {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>;
const IcAttend    = (p) => <TabIc {...p} d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18m-9 4l2 2 4-4"/>;
const IcMaterial  = (p) => <TabIc {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12l8.73-5.04M12 22V12"/>;
const IcSubcon    = (p) => <TabIc {...p} d="M2 18h20M4 18v-6a8 8 0 0116 0v6M12 4v2M9 5l1 2M15 5l-1 2"/>;
const IcEquip     = (p) => <TabIc {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>;
const IcFiles     = (p) => <TabIc {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>;
const IcSite      = (p) => <TabIc {...p} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0"/>;
const IcMOM       = (p) => <TabIc {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>;
const IcSolar     = (p) => <TabIc {...p} d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 7a5 5 0 100 10 5 5 0 000-10z"/>;
const IcSolarInst = (p) => <TabIc {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>;
const IcSubsidy   = (p) => <TabIc {...p} d="M19 5L5 19M6.5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM17.5 14.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>;

const TABS = [
  {id:"overview",   label:"Overview",    key:"o", Icon:IcOverview},
  {id:"design",     label:"Design",      key:"d", Icon:IcDesign},
  {id:"estimate",   label:"Estimate",    key:"e", Icon:IcEstimate},
  {id:"budget",     label:"Budget",      key:"g", Icon:IcEstimate},
  {id:"party",      label:"Party",       key:"p", Icon:IcParty},
  {id:"transaction",label:"Fin Activity", key:"t", Icon:IcTrans},
  {id:"todo",       label:"To Do",       key:"k", Icon:IcTodo},
  {id:"task",       label:"Tasks",       key:"j", Icon:IcTask},
  {id:"attendance", label:"Attendance",  key:"a", Icon:IcAttend},
  {id:"material",   label:"Material",    key:"m", Icon:IcMaterial},
  {id:"subcon",     label:"Subcon",      key:"b", Icon:IcSubcon},
  {id:"equipment",  label:"Equipment",   key:"q", Icon:IcEquip},
  {id:"files",      label:"Files",       key:"i", Icon:IcFiles},
  {id:"site",       label:"Site / DPR",  key:"y", Icon:IcSite},
  {id:"mom",        label:"MOM",         key:"n", Icon:IcMOM},
];

// ── SOLAR EPC TABS (only for project_type = 'solar_epc') ──────────
const SOLAR_TABS = [
  {id:"overview",      label:"Overview",        key:"o", Icon:IcOverview},
  {id:"solar_stages",  label:"Surya Ghar",      key:"s", Icon:IcSolar},
  {id:"solar_boq",     label:"BOQ / Quotation", key:"e", Icon:IcEstimate},
  {id:"solar_install", label:"Installation",    key:"i", Icon:IcSolarInst},
  {id:"solar_subsidy", label:"Subsidy",         key:"u", Icon:IcSubsidy},
  {id:"material",      label:"Material",        key:"m", Icon:IcMaterial},
  {id:"transaction",   label:"Finance",         key:"t", Icon:IcTrans},
  {id:"design",        label:"Design",          key:"d", Icon:IcDesign},
  {id:"party",         label:"Party",           key:"p", Icon:IcParty},
  {id:"todo",          label:"To Do",           key:"k", Icon:IcTodo},
  {id:"task",          label:"Tasks",           key:"j", Icon:IcTask},
  {id:"files",         label:"Files",           key:"f", Icon:IcFiles},
];

// ── ProjectSwitcher — clickable project name in the top breadcrumb ──
// Dropdown uses position:fixed (anchored to the trigger via getBoundingClientRect)
// so it escapes the breadcrumb's overflow:hidden — earlier the popup got clipped
// and the user just saw a sliver of the search input.
function ProjectSwitcher({ current, onSwitch }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // Close on outside click + recompute position on resize/scroll
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const updatePos = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left });
    };
    updatePos();
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  const loadProjects = async () => {
    if (list.length) return;
    setLoading(true);
    try {
      const r = await api.get("/projects");
      const arr = Array.isArray(r?.data) ? r.data : [];
      setList(arr);
    } catch (_) {}
    setLoading(false);
  };

  const filtered = list
    .filter(p => String(p.id) !== String(current?.id))
    .filter(p => !search || String(p.name||"").toLowerCase().includes(search.toLowerCase())
                          || String(p.client||p.client_name||"").toLowerCase().includes(search.toLowerCase()));

  const onPick = (p) => {
    if (typeof onSwitch === "function") onSwitch(p);
    setOpen(false);
    setSearch("");
  };

  const onToggle = () => {
    if (!open) {
      loadProjects();
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={btnRef} onClick={onToggle} title="Switch project"
        style={{
          display:"inline-flex", alignItems:"center", gap:5, flexShrink:0,
          padding:"4px 9px 4px 10px", borderRadius:7, border:"1px solid rgba(255,255,255,.12)",
          background: open ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
          color:"#fff", cursor:"pointer", fontFamily:"inherit", maxWidth:260,
          transition:"background .12s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,.1)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}>
        <span title={current?.name} style={{fontSize:13.5, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200}}>{current?.name}</span>
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{opacity:.7, transform: open ? "rotate(180deg)" : "none", transition:"transform .15s"}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div ref={popRef} style={{
          position:"fixed", top:pos.top, left:pos.left, zIndex:9999,
          minWidth:320, maxWidth:380, maxHeight:440, overflowY:"auto",
          background:"#fff", borderRadius:9, boxShadow:"0 14px 36px rgba(0,0,0,.22)",
          border:"1px solid #E5E7EB", display:"flex", flexDirection:"column",
        }}>
          <div style={{padding:"9px 11px", borderBottom:"1px solid #F1F5F9", position:"sticky", top:0, background:"#fff"}}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search project or client..."
              style={{width:"100%", padding:"7px 10px", borderRadius:6, border:"1.5px solid #E5E7EB", fontSize:12.5, outline:"none", boxSizing:"border-box", fontFamily:"inherit"}}/>
          </div>
          {loading && <div style={{padding:"18px 14px", textAlign:"center", fontSize:12, color:"#94A3B8"}}>Loading projects...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{padding:"22px 14px", textAlign:"center", fontSize:12.5, color:"#64748B"}}>
              {search ? "No projects match." : "No other projects."}
            </div>
          )}
          {!loading && filtered.map(p => (
            <button key={p.id} onClick={() => onPick(p)}
              style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                border:"none", borderTop:"1px solid #F1F5F9", background:"#fff", cursor:"pointer",
                textAlign:"left", fontFamily:"inherit", transition:"background .1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F0F9FF"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
              <div style={{width:30, height:30, borderRadius:7, background:"#EEF2FF", color:"#4338CA", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, flexShrink:0}}>
                {String(p.name||"?").charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:700, color:"#0F172A", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{p.name}</div>
                <div style={{fontSize:10.5, color:"#94A3B8", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {p.client_name || p.client || "—"}{p.city ? ` · ${p.city}` : ""}{p.status ? ` · ${p.status}` : ""}
                </div>
              </div>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2.4} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PROJECT SETTINGS FORM — all per-project config in one drawer:
// details (name/status/dates/PM/client/BOQ) + per-project geo-location.
// ═══════════════════════════════════════════════════════════════════
function ProjectSettingsForm({ project, isAdmin, onClose }) {
  const STATUS_OPTS = ["Not Started","Ongoing","Hold","Completed"];
  const [form, setForm] = useState({
    name:           project.name || "",
    status:         project.status || "Not Started",
    cityId:         project.city_id || "",
    start_date:     project.start_date ? String(project.start_date).split("T")[0] : "",
    end_date:       project.end_date ? String(project.end_date).split("T")[0] : "",
    pm_name:        project.pm_name || "",
    site_supervisor:project.site_supervisor || "",
    boq_value:      project.boq_value ?? "",
    contract_value: project.contract_value ?? "",
    client_name:    project.client_name || "",
    client_phone:   project.client_phone || "",
    client_email:   project.client_email || "",
    site_address:   project.site_address || "",
    description:    project.description || "",
  });
  const [cities, setCities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Geo-location (per project) — backed by a single admin geofence row.
  const [geo, setGeo] = useState({ id:null, lat:"", lng:"", radius:80, label:"" });
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [showMap, setShowMap] = useState(false);
  const savingRef = useRef(false);

  // Same section split as the Projects-list settings modal, so both places
  // look and read the same. Tabs run across the top rather than down the side
  // because this one lives in a narrow right-hand drawer.
  const [sec, setSec] = useState("basic");
  const SECS = [
    { id:"basic",   label:"Basic Info" },
    { id:"team",    label:"Team & Roles" },
    { id:"client",  label:"Client Access" },
    { id:"status",  label:"Status & Dates" },
    { id:"geo",     label:"Geo-Location" },
  ];

  // ── Client Access ────────────────────────────────────────────
  // NOTE: the "Client" card above is only project metadata (who the customer
  // is). This is different — it creates an actual LOGIN so the customer can
  // open the app and see this project's progress, photos and their billing.
  const [clients, setClients] = useState([]);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [cErr, setCErr] = useState("");
  const [newPw, setNewPw] = useState(null);   // {phone, password} — shown once
  const [copied, setCopied] = useState(false);
  const loadClients = useCallback(() => {
    if (!project?.id) return;
    api.get("/client/projects/" + project.id + "/clients")
      .then(r => setClients(r && r.success && Array.isArray(r.data) ? r.data : []))
      .catch(()=>{});
  }, [project?.id]);
  useEffect(() => { if (isAdmin) loadClients(); }, [isAdmin, loadClients]);
  const addClient = async () => {
    setCErr("");
    const phone = cPhone.replace(/\D/g, "").slice(-10);
    if (!cName.trim()) { setCErr("Client ka naam likhein"); return; }
    if (phone.length !== 10) { setCErr("10 digit ka mobile number daalein"); return; }
    setCBusy(true);
    const r = await api.post("/client/projects/" + project.id + "/clients", { name: cName.trim(), phone });
    setCBusy(false);
    if (r && r.success) {
      // A password comes back only when a NEW login was created; linking an
      // existing client to another project returns none.
      setNewPw(r.password ? { phone, password: r.password } : null);
      setCName(""); setCPhone(""); loadClients();
    }
    else setCErr((r && r.message) || "Add nahi hua");
  };
  const removeClient = async (uid) => {
    if (!window.confirm("Is client ka access hata dein?")) return;
    await api.del("/client/projects/" + project.id + "/clients/" + uid);
    loadClients();
  };
  // The old password cannot be looked up — it was never stored readably — so
  // "forgot it" is only ever solved by issuing a new one.
  const resetPw = async (uid) => {
    if (!window.confirm("Naya password banayein? Purana password band ho jayega.")) return;
    setCErr("");
    const r = await api.post("/client/projects/" + project.id + "/clients/" + uid + "/reset-password", {});
    if (r && r.success) setNewPw({ phone: r.data.phone, password: r.password });
    else setCErr((r && r.message) || "Reset nahi hua");
  };

  useEffect(() => {
    api.get("/library/cities").then(r => { if (r.success) setCities(r.data || []); }).catch(()=>{});
    // Load existing admin geofence for this project
    api.get("/geofences?project_id=" + project.id).then(r => {
      const f = (r.success && Array.isArray(r.data)) ? r.data.find(g => g.source === "admin") || r.data[0] : null;
      if (f) setGeo({ id:f.id, lat:String(f.center_lat), lng:String(f.center_lng), radius:f.radius_m || 80, label:f.label || "" });
    }).catch(()=>{}).finally(()=>setGeoLoading(false));
  }, [project.id]);

  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Save project details ──
  const saveDetails = async () => {
    if (savingRef.current) return;
    if (!form.name.trim()) { setMsg("Project name required"); return; }
    savingRef.current = true; setSaving(true); setMsg("");
    try {
      const body = {
        name: form.name.trim(), status: form.status,
        start_date: form.start_date || null, end_date: form.end_date || null,
        pm_name: form.pm_name || null, site_supervisor: form.site_supervisor || null,
        boq_value: form.boq_value === "" ? null : Number(form.boq_value),
        contract_value: form.contract_value === "" ? null : Number(form.contract_value),
        client_name: form.client_name || null, client_phone: form.client_phone || null,
        client_email: form.client_email || null, site_address: form.site_address || null,
        description: form.description || null,
      };
      if (form.cityId) body.cityId = Number(form.cityId);
      const r = await api.put("/projects/" + project.id, body);
      if (r.success) { setMsg("✓ Project details saved"); setTimeout(()=>setMsg(""), 3500); }
      else setMsg(r.message || "Save failed");
    } catch (e) { setMsg(e.message || "Network error"); }
    savingRef.current = false; setSaving(false);
  };

  // ── Capture current GPS into geo lat/lng ──
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setGeoMsg("GPS not available in this browser"); return; }
    setGeoMsg("📍 Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo(g => ({ ...g, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        setGeoMsg("✓ Location captured — Save to apply");
      },
      () => setGeoMsg("GPS denied/timeout — enter coordinates manually"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // ── Save / update the project geofence ──
  const saveGeo = async () => {
    const lat = parseFloat(geo.lat), lng = parseFloat(geo.lng);
    if (isNaN(lat) || isNaN(lng)) { setGeoMsg("Valid lat/lng required (or use current location)"); return; }
    setGeoBusy(true); setGeoMsg("");
    try {
      const body = {
        project_id: project.id,
        label: geo.label || (project.name + " — Site"),
        center_lat: lat, center_lng: lng, radius_m: Number(geo.radius) || 80,
      };
      const r = geo.id
        ? await api.put("/geofences/" + geo.id, body)
        : await api.post("/geofences", body);
      if (r.success) {
        if (r.data?.id) setGeo(g => ({ ...g, id: r.data.id }));
        setGeoMsg("✓ Geo-location saved — punch-in is now geofenced to this site");
        setTimeout(()=>setGeoMsg(""), 4000);
      } else setGeoMsg(r.message || "Geo save failed");
    } catch (e) { setGeoMsg(e.message || "Network error"); }
    setGeoBusy(false);
  };

  const L = { fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase", letterSpacing:".4px", display:"block", marginBottom:4 };
  const I = { width:"100%", padding:"8px 10px", borderRadius:7, border:`1.5px solid ${T.b1}`, fontSize:12.5, color:T.t1, background:T.surface, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };
  const card = { background:T.surface, border:`1px solid ${T.b1}`, borderRadius:10, padding:"14px 16px", marginBottom:12 };
  const sectionTitle = { fontSize:12.5, fontWeight:800, color:T.t1, marginBottom:10, display:"flex", alignItems:"center", gap:6 };

  return (
    <div style={{ padding:"4px 2px 20px" }}>
      {/* section tabs — wrap so every section is reachable without scrolling sideways */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
        {SECS.map(s => (
          <button key={s.id} onClick={()=>setSec(s.id)}
            style={{ padding:"7px 12px", borderRadius:7, border:"1px solid "+(sec===s.id?T.blu:T.b1),
              background:sec===s.id?T.blu:T.surface, color:sec===s.id?"white":T.t3,
              fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── BASIC INFO ── */}
      {sec==="basic"&&(
      <div style={card}>
        <div style={sectionTitle}>📋 Project Details</div>
        <div style={{ marginBottom:10 }}><label style={L}>Project Name *</label><input value={form.name} onChange={upd("name")} style={I}/></div>
        <div style={{ marginBottom:10 }}><label style={L}>City</label>
          <select value={form.cityId} onChange={upd("cityId")} style={{ ...I, cursor:"pointer" }}>
            <option value="">{project.city || "Select city…"}</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><label style={L}>BOQ Value (₹)</label><input type="number" value={form.boq_value} onChange={upd("boq_value")} placeholder="0" style={I}/></div>
          <div><label style={L}>Contract Value (₹)</label><input type="number" value={form.contract_value} onChange={upd("contract_value")} placeholder="0" style={I}/></div>
        </div>
      </div>
      )}

      {/* ── STATUS & DATES ── */}
      {sec==="status"&&(
      <div style={card}>
        <div style={sectionTitle}>📅 Status & Dates</div>
        <div style={{ marginBottom:10 }}><label style={L}>Status</label>
          <select value={form.status} onChange={upd("status")} style={{ ...I, cursor:"pointer" }}>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><label style={L}>Start Date</label><input type="date" value={form.start_date} onChange={upd("start_date")} style={I}/></div>
          <div><label style={L}>End Date</label><input type="date" value={form.end_date} onChange={upd("end_date")} style={I}/></div>
        </div>
      </div>
      )}

      {/* ── TEAM & ROLES ── */}
      {sec==="team"&&(
      <div style={card}>
        <div style={sectionTitle}>👷 Team & Roles</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><label style={L}>Project Manager</label><input value={form.pm_name} onChange={upd("pm_name")} placeholder="PM name" style={I}/></div>
          <div><label style={L}>Site Supervisor</label><input value={form.site_supervisor} onChange={upd("site_supervisor")} placeholder="Supervisor" style={I}/></div>
        </div>
      </div>
      )}

      {/* ── CLIENT (metadata + login live in the same tab) ── */}
      {sec==="client"&&(<>
      <div style={card}>
        <div style={sectionTitle}>👤 Client</div>
        <div style={{ marginBottom:10 }}><label style={L}>Client Name</label><input value={form.client_name} onChange={upd("client_name")} style={I}/></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <div><label style={L}>Phone</label><input value={form.client_phone} onChange={upd("client_phone")} style={I}/></div>
          <div><label style={L}>Email</label><input value={form.client_email} onChange={upd("client_email")} style={I}/></div>
        </div>
        <div style={{ marginBottom:10 }}><label style={L}>Site Address</label><input value={form.site_address} onChange={upd("site_address")} placeholder="Full site address" style={I}/></div>
        <div><label style={L}>Notes / Description</label><textarea value={form.description} onChange={upd("description")} rows={2} style={{ ...I, resize:"vertical" }}/></div>
      </div>

      {/* ── CLIENT ACCESS (login, not just metadata) ── */}
      {isAdmin && (
        <div style={{ ...card, borderColor:T.bluM, background:T.bluL }}>
          <div style={sectionTitle}>🔑 Client Access (app login)</div>
          <div style={{ fontSize:11, color:T.t3, marginBottom:12, lineHeight:1.5 }}>
            Upar wala "Client" sirf record hai. Yahan jode gaye client <b>mobile app me apne number se login</b> karke
            <b> sirf</b> is project ka progress, site photos aur apni billing dekh sakte hain. Cost, budget, staff,
            procurement — kuch bhi unhe nahi dikhta. Ek client ko kai projects se joda ja sakta hai.
          </div>

          {clients.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
              {clients.map(c => (
                <div key={c.user_id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", borderRadius:8, border:"1px solid "+T.b1, background:T.surface }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:600, color:T.t1 }}>{c.name}</div>
                    <div style={{ fontSize:10.5, color:T.t4 }}>{c.phone}{c.is_active===0?" · inactive":""}</div>
                  </div>
                  <button onClick={()=>resetPw(c.user_id)}
                    style={{ background:"none", border:"none", color:T.blu, fontSize:11.5, fontWeight:600, cursor:"pointer" }}>
                    Naya password
                  </button>
                  <button onClick={()=>removeClient(c.user_id)}
                    style={{ background:"none", border:"none", color:T.red, fontSize:11.5, fontWeight:600, cursor:"pointer" }}>
                    Hatao
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 150px", gap:10, marginBottom:8 }}>
            <div><label style={L}>Client Name</label><input value={cName} onChange={e=>setCName(e.target.value)} placeholder="Client ka naam" style={I}/></div>
            <div><label style={L}>Mobile</label><input value={cPhone} onChange={e=>setCPhone(e.target.value)} placeholder="10 digit" inputMode="numeric" style={I}/></div>
          </div>
          {cErr && <div style={{ fontSize:11.5, color:T.red, fontWeight:600, marginBottom:8 }}>{cErr}</div>}
          <button onClick={addClient} disabled={cBusy}
            style={{ padding:"9px 16px", borderRadius:8, background:cBusy?T.b2:T.blu, color:"white", border:"none", fontSize:12.5, fontWeight:700, cursor:cBusy?"not-allowed":"pointer" }}>
            {cBusy ? "Jod rahe hain…" : "+ Client jodein"}
          </button>

          {/* Shown once, right after creation — the password is not stored in
              readable form, so this is the only chance to pass it on. */}
          {newPw && (
            <div style={{ marginTop:12, padding:"12px 14px", borderRadius:9, background:T.grnL, border:"1px solid "+T.grn }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:T.grn, marginBottom:6 }}>
                ✓ Client jud gaya — ye login details client ko bhej dein
              </div>
              <div style={{ fontSize:12.5, color:T.t1, lineHeight:1.7 }}>
                Mobile: <b>{newPw.phone}</b><br/>
                Password: <b style={{ fontFamily:"monospace", fontSize:14, letterSpacing:".5px" }}>{newPw.password}</b>
              </div>
              <div style={{ fontSize:10.5, color:T.t3, marginTop:7, lineHeight:1.45 }}>
                Client OTP se bhi login kar sakta hai — ye password sirf tab kaam aata hai jab OTP na aaye.
                <b> Ye password dobara nahi dikhega</b>, isliye abhi copy kar lein.
              </div>
              <button onClick={()=>{ try{ navigator.clipboard.writeText(`Sanchalan app\nMobile: ${newPw.phone}\nPassword: ${newPw.password}`); setCopied(true); setTimeout(()=>setCopied(false),2000);}catch(e){} }}
                style={{ marginTop:9, padding:"7px 13px", borderRadius:7, border:"1px solid "+T.grn, background:T.surface, color:T.grn, fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {copied ? "✓ Copy ho gaya" : "Copy karein"}
              </button>
            </div>
          )}

          <div style={{ fontSize:10.5, color:T.t4, marginTop:8, lineHeight:1.45 }}>
            Client isi number se app me login karega. <b>Number kisi staff ka nahi hona chahiye</b> — staff ka number
            dene par system rok dega (client ke liye alag number lein).
          </div>
        </div>
      )}
      </>)}

      {/* Save covers every project-detail field, whichever tab it sits on.
          Geo-Location has its own save, so the button is hidden there. */}
      {msg && sec!=="geo" && <div style={{ fontSize:12, fontWeight:600, color:msg.startsWith("✓")?T.grn:T.red, marginBottom:8 }}>{msg}</div>}
      {isAdmin && sec!=="geo" && (
        <button onClick={saveDetails} disabled={saving}
          style={{ width:"100%", padding:"11px", borderRadius:8, background:saving?T.b2:T.blu, color:"white", border:"none", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", marginBottom:18 }}>
          {saving ? "Saving…" : "💾 Save Project Details"}
        </button>
      )}

      {/* ── GEO-LOCATION ── */}
      {sec==="geo"&&(
      <div style={{ ...card, borderColor:T.bluM, background:T.bluL }}>
        <div style={sectionTitle}>📍 Site Geo-Location (Geofence)</div>
        <div style={{ fontSize:11, color:T.t3, marginBottom:12, lineHeight:1.5 }}>
          Is project ke site ki location set karo. Mobile punch-in is fence ke andar count hoga.
          Har project ki apni alag location hoti hai.
        </div>
        {geoLoading ? (
          <div style={{ fontSize:12, color:T.t4, padding:"8px 0" }}>Loading…</div>
        ) : (<>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <button onClick={useCurrentLocation}
              style={{ flex:1, padding:"9px", borderRadius:7, background:T.surface, border:`1.5px solid ${T.blu}`, color:T.blu, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
              📍 Current Location
            </button>
            <button onClick={()=>setShowMap(true)}
              style={{ flex:1, padding:"9px", borderRadius:7, background:T.surface, border:`1.5px solid ${T.grn}`, color:T.grn, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
              🗺️ Pick from Map
            </button>
          </div>
          {showMap && <MapPicker initial={{lat:geo.lat, lng:geo.lng}} onClose={()=>setShowMap(false)}
            onPick={({lat,lng})=>{ setGeo(g=>({...g,lat:String(lat),lng:String(lng)})); setGeoMsg("✓ Location captured from map — Save to apply"); }}/>}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={L}>Latitude</label><input value={geo.lat} onChange={e=>setGeo(g=>({...g,lat:e.target.value}))} placeholder="e.g. 21.250000" style={I}/></div>
            <div><label style={L}>Longitude</label><input value={geo.lng} onChange={e=>setGeo(g=>({...g,lng:e.target.value}))} placeholder="e.g. 81.630000" style={I}/></div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            <div><label style={L}>Radius (meters)</label><input type="number" value={geo.radius} onChange={e=>setGeo(g=>({...g,radius:e.target.value}))} placeholder="80" style={I}/></div>
            <div><label style={L}>Label</label><input value={geo.label} onChange={e=>setGeo(g=>({...g,label:e.target.value}))} placeholder={project.name + " — Site"} style={I}/></div>
          </div>
          {geo.id && <div style={{ fontSize:10.5, color:T.grn, marginBottom:8 }}>✓ Existing fence #{geo.id} — editing</div>}
          {geoMsg && <div style={{ fontSize:11.5, fontWeight:600, color:geoMsg.startsWith("✓")?T.grn:geoMsg.startsWith("📍")?T.blu:T.amb, marginBottom:8 }}>{geoMsg}</div>}
          {isAdmin && (
            <button onClick={saveGeo} disabled={geoBusy}
              style={{ width:"100%", padding:"10px", borderRadius:8, background:geoBusy?T.b2:T.grn, color:"white", border:"none", fontSize:12.5, fontWeight:700, cursor:geoBusy?"not-allowed":"pointer" }}>
              {geoBusy ? "Saving…" : (geo.id ? "💾 Update Geo-Location" : "💾 Set Geo-Location")}
            </button>
          )}
          {!isAdmin && <div style={{ fontSize:11, color:T.t4, fontStyle:"italic" }}>Admin/PM only — set location.</div>}
        </>)}
      </div>
      )}
    </div>
  );
}

function ProjectDetailPage({project=PROJ, onBack, onSwitchProject}) {
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const isAdmin = ["admin","super_admin","project_manager"].includes(currentUser.role);
  if(!document.getElementById("gb-spin-css")){const s=document.createElement("style");s.id="gb-spin-css";s.textContent="@keyframes spin{to{transform:rotate(360deg)}}";document.head.appendChild(s);}
  // Optional initial tab from parent (e.g. todo drawer → Todo tab)
  const [tab, setTab] = useState(project.initialTab || "overview");

  // ── Solar EPC detection — construction tabs untouched ──────────
  const isSolar = project._raw?.project_type === "solar_epc" || project.project_type === "solar_epc";
  const _allTabs = isSolar ? SOLAR_TABS : TABS;

  // ── Role-based tab gating (Settings → Roles & Access → Project Tabs) ──
  // Tabs without a permission key (party/todo/task/files/site/solar_*) stay always-on.
  const TAB_PERM = {
    overview:"Overview", design:"Design", estimate:"Estimate",
    transaction:"Transaction", material:"Material", subcon:"Subcon",
    attendance:"Attendance", equipment:"Equipment", mom:"MOM",
  };
  const _perms = currentUser?.module_permissions;
  const _isAdminRole = ["admin","super_admin"].includes(currentUser?.role);
  const canSeeTab = (id) => {
    if(_isAdminRole) return true;          // admins bypass
    const mod = TAB_PERM[id];
    if(_perms && mod) return !!(_perms[mod]?.view);  // explicit grant required
    return true;                            // no perm key, or no perms loaded → show
  };
  const activeTabs = _allTabs.filter(t => canSeeTab(t.id));
  // If current tab got hidden by permissions, fall back to the first visible tab.
  useEffect(() => {
    if(activeTabs.length && !activeTabs.some(t => t.id === tab)){
      setTab(activeTabs[0].id);
    }
  }, [activeTabs, tab]);

  const sm = STATUS_S[project.status]||{c:T.slt, bg:T.sltL};
  const margin = project.boq - project.expense;

  // Approval counts for this project
  const [approvalCount, setApprovalCount] = useState(0);
  const [showApprovalDrawer, setShowApprovalDrawer] = useState(false);
  const [showSitePulse, setShowSitePulse] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showProjectNotifs, setShowProjectNotifs] = useState(false);
  // Payment Request: { type, party } when triggered with prefill
  const [paymentReq, setPaymentReq] = useState(null);
  const loadApprovalCounts=()=>{
    if(!project?.id) return;
    // Badge = items where it's THIS user's turn (scope=my). An item waiting on
    // someone else (e.g. the PM) must NOT light up the admin's badge — this keeps
    // the header count in sync with the drawer's "My approvals" view. (Was
    // /approvals/counts total, which disagreed with the scope=my list.)
    api.get("/approvals/pending?project_id="+project.id+"&scope=my").then(r=>{
      if(r.success) setApprovalCount((r.data||[]).length);
    }).catch(()=>{});
  };
  useEffect(()=>{ loadApprovalCounts(); },[project?.id]);

  // ── Layout mode (horizontal tabs vs sidebar) — synced with Settings ──
  const [layoutMode, setLayoutMode] = useState(() => {
    try { return localStorage.getItem("gb_project_layout") || "horizontal"; }
    catch { return "horizontal"; }
  });
  // Default: sidebar open. Auto-fold only on Task tab (needs more space).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (project.initialTab || "overview") === "task");
  useEffect(() => {
    const onLayoutChange = (e) => setLayoutMode(e.detail || "horizontal");
    const onStorageChange = (e) => {
      if (e.key === "gb_project_layout") setLayoutMode(e.newValue || "horizontal");
    };
    window.addEventListener("gb-layout-change", onLayoutChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener("gb-layout-change", onLayoutChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);
  // Auto-fold sidebar on Task tab; expand on every other tab.
  useEffect(() => {
    setSidebarCollapsed(tab === "task");
  }, [tab]);
  const toggleSidebar = () => setSidebarCollapsed(c => !c);

  // ── Broadcast "inside a project" so App shell can collapse its chrome in sidebar mode ──
  useEffect(() => {
    window.__gbInProject = true;
    window.dispatchEvent(new Event("gb-project-state-change"));
    return () => {
      window.__gbInProject = false;
      window.dispatchEvent(new Event("gb-project-state-change"));
    };
  }, []);

  const switchTab = (t) => setTab(t);

  // ── Ctrl+key tab shortcuts ──────────────────────────────────────
  useEffect(()=>{
    const handler=(e)=>{
      const tag=document.activeElement?.tagName;
      if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT") return;
      if(!e.ctrlKey) return;
      const match=activeTabs.find(t=>t.key===e.key.toLowerCase());
      if(match){e.preventDefault();setTab(match.id);}
    };
    const escHandler=(e)=>{
      if(e.key==="Escape"&&onBack) onBack();
    };
    window.addEventListener("keydown",handler);
    window.addEventListener("keydown",escHandler);
    return()=>{
      window.removeEventListener("keydown",handler);
      window.removeEventListener("keydown",escHandler);
    };
  },[onBack, activeTabs]);

  const TabLoading = () => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",color:T.t3,fontSize:13}}>
      Loading…
    </div>
  );

  const tabContent = {
    // ── Construction tabs (unchanged) ──
    overview:    <TabOverview    proj={project} onRequestPayment={()=>setPaymentReq({})}/>,
    design:      <TabDesign project={project} isAdmin={isAdmin}/>,
    estimate:    <TabEstimate project={project}/>,
    budget:      <TabBudget project={project}/>,
    party:       <TabParty projectId={project.id} projectName={project.name}/>,
    transaction: <TabTransaction projectId={project.id} projectName={project.name}/>,
    todo:        <TabTodo projectId={project.id}/>,
    task:        <TabTasks projectId={project.id} isAdmin={isAdmin}/>,
    attendance:  <TabAttendance project={project} onRequestPayment={(p)=>setPaymentReq(p||{})}/>,
    material:    <TabMaterial project={project}/>,
    subcon:      <TabSubcon projectId={project.id} project={project}/>,
    equipment:   <TabEquipment projectId={project.id}/>,
    files:       isSolar ? <TabFiles projectId={project.id}/> : <TabProjectFiles projectId={project.id}/>,
    site:        <TabSite project={project} isAdmin={isAdmin}/>,
    mom:         <TabMOM project={project}/>,
    // ── Solar EPC tabs ──
    solar_stages:  <TabSuryaGhar  projectId={project.id}/>,
    solar_boq:     <TabSolarBOQ   projectId={project.id}/>,
    solar_docs:    <TabSolarDocs  projectId={project.id}/>,
    solar_install: <TabSolarInstall projectId={project.id}/>,
    solar_subsidy: <TabSolarSubsidy projectId={project.id}/>,
  };

  // ── Sidebar layout (Layout B) ──
  const sidebarWidth = sidebarCollapsed ? 60 : 220;
  const currentTabLabel = activeTabs.find(t => t.id === tab)?.label || "";
  const Chip = ({label, value, color, bg, border}) => (
    <div style={{display:"flex", alignItems:"baseline", gap:5, padding:"4px 10px", borderRadius:14, border:`1px solid ${border||T.b1}`, background:bg||T.surfaceB, fontSize:11, fontWeight:600, color:color||T.t2, whiteSpace:"nowrap", flexShrink:0}}>
      <span style={{fontSize:9.5, textTransform:"uppercase", letterSpacing:".4px", opacity:.7}}>{label}</span>
      <span style={{fontVariantNumeric:"tabular-nums"}}>{value}</span>
    </div>
  );
  const sidebarLayout = (
    <div style={{display:"flex", height:"100vh", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif", background:T.bg}}>
      <style>{`.gb-sb-scroll::-webkit-scrollbar{width:4px}.gb-sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:2px}`}</style>

      {/* ── PROJECT SIDEBAR ── */}
      <aside style={{width:sidebarWidth, background:"#1E293B", color:"#fff", display:"flex", flexDirection:"column", flexShrink:0, transition:"width .2s ease", overflow:"hidden"}}>

        {/* Header — hamburger toggle + company name */}
        <div style={{padding: sidebarCollapsed?"10px 0":"10px 12px", borderBottom:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent: sidebarCollapsed?"center":"flex-start", gap:10, minHeight:48}}>
          <button onClick={toggleSidebar} title={sidebarCollapsed?"Open sidebar":"Close sidebar"}
            style={{width:32, height:32, borderRadius:6, border:"none", background:"rgba(255,255,255,.06)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.14)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          {!sidebarCollapsed && (
            <div title={currentUser.company_name||"Company"} style={{flex:1, minWidth:0, display:"flex", flexDirection:"column", overflow:"hidden"}}>
              <span style={{fontSize:13.5, fontWeight:700, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-.1px"}}>{currentUser.company_name||"Company"}</span>
              <span style={{fontSize:9.5, fontWeight:600, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".5px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{currentUser.role||"User"}</span>
            </div>
          )}
        </div>

        {/* Back to projects */}
        <div style={{padding: sidebarCollapsed?"6px 0":"8px 10px"}}>
          {onBack&&(
            <button onClick={onBack} title="All Projects (Esc)"
              style={{width:"100%", display:"inline-flex", alignItems:"center", justifyContent: sidebarCollapsed?"center":"flex-start", gap:6, padding: sidebarCollapsed?"6px 0":"6px 10px", border:"1px solid rgba(255,255,255,.1)", borderRadius:6, background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.7)", fontSize:11.5, fontWeight:500, cursor:"pointer", transition:"background .15s", height:30}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              {!sidebarCollapsed && <span>Projects</span>}
            </button>
          )}
        </div>

        {/* Tab list */}
        <nav className="gb-sb-scroll" style={{flex:1, overflowY:"auto", padding:"6px 0", borderTop:"1px solid rgba(255,255,255,.06)", marginTop:4}}>
          {activeTabs.map(t=>{
            const active = tab===t.id;
            const Icon = t.Icon;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                title={`${t.label}  (Ctrl+${t.key.toUpperCase()})`}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:11,
                  padding: sidebarCollapsed ? "10px 0" : "8px 12px",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  border:"none",
                  background: active ? "rgba(37,99,235,.18)" : "transparent",
                  borderLeft: active ? "3px solid #3B82F6" : "3px solid transparent",
                  color: active ? "#fff" : "rgba(255,255,255,.65)",
                  fontSize:12.5, fontWeight: active?600:450, cursor:"pointer", textAlign:"left",
                  transition:"all .12s", fontFamily:"inherit",
                }}
                onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="rgba(255,255,255,.05)"; }}
                onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
                {Icon && <Icon size={16} color={active?"#fff":"rgba(255,255,255,.6)"}/>}
                {!sidebarCollapsed && (
                  <>
                    <span style={{flex:1, whiteSpace:"nowrap"}}>{t.label}</span>
                    <span style={{fontSize:9.5, color:"rgba(255,255,255,.3)", fontWeight:500}}>^{t.key.toUpperCase()}</span>
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── RIGHT: top strip + content ── */}
      <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden", background:T.bg}}>
        {/* Dark top bar — floating card with rounded edges */}
        <div style={{margin:"10px 12px 0", padding:"8px 14px", background:"#1E293B", borderRadius:10, boxShadow:"0 2px 10px rgba(15,23,42,0.18)", display:"flex", alignItems:"center", gap:12, flexShrink:0, minHeight:48}}>
          {/* Left: breadcrumb — project name is a switcher dropdown */}
          <div style={{flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8, overflow:"hidden"}}>
            <ProjectSwitcher current={project} onSwitch={onSwitchProject}/>
            <span style={{fontSize:12, color:"rgba(255,255,255,.35)", fontWeight:400}}>/</span>
            <span style={{fontSize:12.5, fontWeight:600, color:"rgba(255,255,255,.85)", whiteSpace:"nowrap"}}>{currentTabLabel}</span>
            <Pill label={project.status} c={sm.c} bg="rgba(255,255,255,.1)"/>
            {isSolar && <span style={{fontSize:9.5,fontWeight:800,color:"#FBBF24",background:"rgba(251,191,36,.12)",border:"1px solid rgba(251,191,36,.3)",borderRadius:4,padding:"2px 7px",letterSpacing:".3px"}}>☀ SOLAR</span>}
          </div>

          {/* Right: action icon buttons */}
          <div style={{display:"flex", alignItems:"center", gap:2, flexShrink:0}}>
            {(() => {
              const IconBtn = ({title, onClick, badge, badgeColor, children}) => (
                <button onClick={onClick} title={title}
                  style={{position:"relative", width:34, height:34, borderRadius:7, border:"none", background:"transparent", color:"rgba(255,255,255,.7)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"background .12s, color .12s", flexShrink:0}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="#fff";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent"; e.currentTarget.style.color="rgba(255,255,255,.7)";}}>
                  {children}
                  {badge>0 && (
                    <span style={{position:"absolute", top:4, right:4, minWidth:14, height:14, padding:"0 3px", borderRadius:8, background:badgeColor||"#F59E0B", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #1E293B", fontVariantNumeric:"tabular-nums", lineHeight:1}}>{badge>9?"9+":badge}</span>
                  )}
                </button>
              );
              return (<>
                {/* Request Payment */}
                <IconBtn title="Request Payment — for subcon, labour or expense" onClick={()=>setPaymentReq({})}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                </IconBtn>
                {/* Site Pulse */}
                <IconBtn title="Site Pulse — live activity feed" onClick={()=>setShowSitePulse(true)}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </IconBtn>
                {/* Approvals */}
                <IconBtn title={`Pending Approvals${approvalCount>0?` (${approvalCount})`:""}`} onClick={()=>setShowApprovalDrawer(true)} badge={approvalCount} badgeColor="#F59E0B">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </IconBtn>
                {/* Notifications */}
                <IconBtn title="Project Notifications" onClick={()=>setShowProjectNotifs(true)}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                </IconBtn>
                {/* Project Settings */}
                <IconBtn title="Project Settings" onClick={()=>setShowProjectSettings(true)}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </IconBtn>
              </>);
            })()}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1, overflowY:"auto", background:T.bg, marginTop:10}}>
          <Suspense fallback={<TabLoading/>}>{tabContent[tab]}</Suspense>
        </div>
      </div>
    </div>
  );

  // ── Horizontal layout (Layout A — default) ──
  const horizontalLayout = (
    <div style={{display:"flex", flexDirection:"column", height:"100vh", overflow:"hidden", fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif", background:T.bg}}>

      {/* ── HEADER ── */}
      <div style={{background:"#1E293B", flexShrink:0}}>
        <div style={{padding:"13px 20px 11px"}}>
          <div style={{display:"flex", alignItems:"flex-start", gap:14}}>
            {onBack&&(
              <button onClick={onBack} style={{display:"inline-flex", alignItems:"center", gap:5, padding:"5px 11px", border:"1px solid rgba(255,255,255,.15)", borderRadius:6, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.7)", fontSize:11.5, fontWeight:500, cursor:"pointer", flexShrink:0, marginTop:3, transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                All Projects
              </button>
            )}
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap"}}>
                <span style={{fontSize:17, fontWeight:700, color:"#FFFFFF", letterSpacing:"-.3px", lineHeight:1.2}}>{project.name}</span>
                <Pill label={project.status} c={sm.c} bg={`rgba(255,255,255,.1)`}/>
              </div>
              <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
                {[[project.client,"Client"],[project.city,"City"],[project.type,"Type"],[`PM: ${project.pm}`,"PM"],[`${project.start} – ${project.end}`,""]].map(([v,l],i)=>(
                  <span key={i} style={{fontSize:11.5, color:"rgba(255,255,255,.45)"}}>{v}</span>
                ))}
              </div>
            </div>
            {/* Financial chips */}
            <div style={{display:"flex", gap:12, flexShrink:0}}>
              {approvalCount>0&&(
                <div onClick={()=>setShowApprovalDrawer(true)} style={{background:"rgba(217,119,6,0.15)",border:"1px solid rgba(217,119,6,0.3)",borderRadius:8,padding:"7px 13px",textAlign:"right",cursor:"pointer",transition:"background .15s"}} title="Click to view pending approvals"
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(217,119,6,0.28)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(217,119,6,0.15)"}>
                  <div style={{fontSize:9.5,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:3}}>Approvals</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#FBBF24",fontVariantNumeric:"tabular-nums"}}>{approvalCount} pending</div>
                </div>
              )}
              {[["BOQ",`₹${fmt(project.boq)}`,T.sltL,T.t4],["Spent",`₹${fmt(project.expense)}`,"#FFF7ED","#D97706"],["Margin",`₹${fmt(Math.abs(margin))}`,margin>0?"#F0FDF4":"#FEF2F2",margin>0?"#059669":"#DC2626"]].map(([l,v,bg,vc])=>(
                <div key={l} style={{background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"7px 13px", textAlign:"right"}}>
                  <div style={{fontSize:9.5, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".5px", marginBottom:3}}>{l}</div>
                  <div style={{fontSize:14, fontWeight:700, color:"rgba(255,255,255,.9)", fontVariantNumeric:"tabular-nums"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Progress bar */}
          <div style={{marginTop:11, display:"flex", alignItems:"center", gap:10}}>
            <span style={{fontSize:10.5, color:"rgba(255,255,255,.3)", width:60}}>Progress</span>
            <div style={{flex:1, height:4, background:"rgba(255,255,255,.1)", borderRadius:3, overflow:"hidden"}}>
              <div style={{height:"100%", width:`${project.progress}%`, background:T.blu, borderRadius:3, transition:"width .6s"}}/>
            </div>
            <span style={{fontSize:11, fontWeight:700, color:"rgba(255,255,255,.7)", fontVariantNumeric:"tabular-nums", width:32, textAlign:"right"}}>{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{background:T.surface, borderBottom:`1px solid ${T.b1}`, display:"flex", overflowX:"auto", flexShrink:0}}>
        <style>{`* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }`}</style>
        {isSolar&&<div style={{display:"flex",alignItems:"center",padding:"0 12px",borderRight:`1px solid ${T.b1}`,flexShrink:0}}><span style={{fontSize:9.5,fontWeight:800,color:"#E65100",background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:4,padding:"2px 7px",letterSpacing:".3px",whiteSpace:"nowrap"}}>☀ Solar EPC</span></div>}
        {activeTabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            title={`${t.label}  (Ctrl+${t.key.toUpperCase()})`}
            style={{padding:"10px 16px 8px", border:"none", background:"none", cursor:"pointer", color:tab===t.id?T.blu:T.t3, fontWeight:tab===t.id?700:400, fontSize:12.5, whiteSpace:"nowrap", borderBottom:tab===t.id?`2.5px solid ${T.blu}`:"2.5px solid transparent", transition:"all .15s", flexShrink:0, fontFamily:"inherit", letterSpacing:0, display:"flex", flexDirection:"column", alignItems:"center", gap:1}}>
            {t.label}
            <span style={{fontSize:8, color:tab===t.id?T.blu:T.t4, opacity:tab===t.id?0.6:0.35, fontWeight:400, lineHeight:1}}>^{t.key.toUpperCase()}</span>
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{flex:1, overflowY:"auto", background:T.bg}}>
        <Suspense fallback={<TabLoading/>}>{tabContent[tab]}</Suspense>
      </div>
    </div>
  );

  // Reusable simple side drawer (right slide-in)
  const SimpleDrawer = ({title, subtitle, onClose, children}) => (
    <>
      <style>{`@keyframes gbSlideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200}}/>
      <div style={{position:"fixed",top:0,right:0,height:"100vh",width:520,maxWidth:"95vw",background:T.surface,boxShadow:"-8px 0 30px rgba(0,0,0,0.15)",zIndex:201,display:"flex",flexDirection:"column",animation:"gbSlideInRight .25s ease-out",fontFamily:"'Segoe UI',system-ui,-apple-system,sans-serif"}}>
        <div style={{padding:"12px 16px",background:"#0D1B2A",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:13.5,fontWeight:700,color:"white"}}>{title}</div>
            {subtitle && <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{subtitle}</div>}
          </div>
          <button onClick={onClose} title="Close"
            style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",padding:6,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .12s"}}
            onMouseEnter={el=>el.currentTarget.style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={el=>el.currentTarget.style.background="none"}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>{children}</div>
      </div>
    </>
  );

  const PlaceholderEmpty = ({icon, title, desc}) => (
    <div style={{padding:"60px 30px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
      <div style={{width:56,height:56,borderRadius:"50%",border:`1.5px dashed ${T.b2}`,display:"flex",alignItems:"center",justifyContent:"center",color:T.t4}}>{icon}</div>
      <div style={{fontSize:14,fontWeight:700,color:T.t1}}>{title}</div>
      <div style={{fontSize:12,color:T.t3,maxWidth:340,lineHeight:1.5}}>{desc}</div>
    </div>
  );

  return (
    <>
      {layoutMode === "sidebar" ? sidebarLayout : horizontalLayout}
      {/* ── PROJECT APPROVAL DRAWER ── */}
      {showApprovalDrawer&&(
        <ProjectApprovalDrawer projectId={project.id} projectName={project.name} onClose={()=>{setShowApprovalDrawer(false);loadApprovalCounts();}}/>
      )}
      {/* ── SITE PULSE DRAWER ── */}
      {showSitePulse && (
        <SimpleDrawer title="Site Pulse" subtitle={`${project.name} · live activity feed`} onClose={()=>setShowSitePulse(false)}>
          <PlaceholderEmpty
            icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
            title="Live activity feed coming soon"
            desc="Real-time updates from the site — attendance check-ins, material movements, transactions, photos uploaded by team members will stream here."
          />
        </SimpleDrawer>
      )}
      {/* ── PROJECT NOTIFICATIONS DRAWER ── */}
      {showProjectNotifs && (
        <SimpleDrawer title="Notifications" subtitle={`${project.name}`} onClose={()=>setShowProjectNotifs(false)}>
          <PlaceholderEmpty
            icon={<svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
            title="No notifications yet"
            desc="Project-specific notifications — overdue tasks, low stock alerts, pending approvals updates, mentions in chats — will appear here."
          />
        </SimpleDrawer>
      )}
      {/* ── PROJECT SETTINGS DRAWER ── */}
      {showProjectSettings && (
        <SimpleDrawer title="Project Settings" subtitle={`${project.name}`} onClose={()=>setShowProjectSettings(false)}>
          <ProjectSettingsForm project={project} isAdmin={isAdmin} onClose={()=>setShowProjectSettings(false)}/>
        </SimpleDrawer>
      )}
      {/* ── PAYMENT REQUEST DRAWER ── */}
      <PaymentRequestDrawer
        open={!!paymentReq}
        onClose={()=>setPaymentReq(null)}
        project={{id:project.id, name:project.name}}
        prefillType={paymentReq?.type}
        prefillParty={paymentReq?.party}
        onSaved={()=>{ loadApprovalCounts(); }}
      />
      {/* (MaterialFlowDrawer + MRDetailDrawer mounted inside TabMaterial — they
           depend on flowGrnId / flowEditMR state declared in that component.) */}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PROJECT-LEVEL APPROVAL DRAWER — self-contained, no shared imports
   ═══════════════════════════════════════════════════════════════════ */
function ProjectApprovalDrawer({projectId, projectName, onClose}){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState({});
  const [errMsg, setErrMsg] = useState("");
  const [scope, setScope] = useState("my");   // my (actionable now) | all (whole project queue)
  // Only admin / super_admin / PM may switch to the "All" view (matches the
  // backend scope gate). Read the cached user the same way the parent page does.
  const _cu = (() => { try { return JSON.parse(localStorage.getItem("gb_user")) || {}; } catch { return {}; } })();
  const canSeeAll = ["admin","super_admin","project_manager"].includes(_cu.role);

  const load = async () => {
    setLoading(true); setErrMsg("");
    try {
      // Fetch the "all" queue (backend downgrades to "my" for non-admins) so every
      // item carries a _canActNow flag. The My/All toggle then filters client-side:
      // an item waiting on someone else (e.g. the PM) shows ONLY under "All",
      // read-only — it never inflates the actionable "My" count or the badge.
      const res = await api.get("/approvals/pending?project_id=" + projectId + "&scope=all");
      setItems(res.success ? res.data || [] : []);
    } catch (e) { setErrMsg("Failed to load approvals"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [projectId]);

  const inScope = (i) => scope === "all" ? true : (i._canActNow !== false);
  const myCount  = items.filter(i => i._canActNow !== false).length;
  const allCount = items.length;
  const visible  = items.filter(inScope);

  const fmtAmt = n => n >= 100000 ? "₹" + (n / 100000).toFixed(1) + "L" : n >= 1000 ? "₹" + (n / 1000).toFixed(0) + "K" : "₹" + n;

  // Universal action handler for all source types
  const handleAction = async (item, actionType) => {
    const key = item.id;
    const src = item._source;
    const isRej = actionType === "reject" || actionType === "Rejected";
    setErrMsg(""); setActing(p => ({ ...p, [key]: isRej ? "rejecting" : "approving" }));
    try {
      let res;
      const isRevise = actionType === "Revision" || actionType === "revise";
      if (item._request_id) {
        // UNIFIED ENGINE: enrolled item — act through the engine so multi-level
        // hierarchy is enforced (same as the main Pending Approvals drawer).
        const centralAction = isRevise ? "revise" : isRej ? "reject" : "approve";
        res = await api.patch("/approvals/" + item._request_id + "/action", { action: centralAction, remarks: isRevise ? "Revision requested" : undefined });
      } else if (src === "design") {
        const status = actionType === "Revision" ? "Revision" : isRej ? "Rejected" : "Approved";
        res = await api.patch("/design/drawings/" + item._source_id + "/status", { status, note: status === "Revision" ? "Revision requested" : undefined });
      } else if (src === "material_request") {
        res = await api.patch("/procurement/mrs/" + item._source_id + "/approve", { action: isRej ? "Rejected" : "Approved", approved_qty: item.quantity || null });
      } else if (src === "payment_request") {
        res = await api.put("/finance/payment-requests/" + item._source_id + "/approve", { action: isRej ? "reject" : "approve" });
      } else if (src === "purchase_order") {
        res = await api.patch("/procurement/pos/" + item._source_id + "/approve", { approved_by: "" });
      } else if (src === "ra_bill") {
        res = await api.patch("/subcon/ra-bills/" + item._source_id + "/status", { status: isRej ? "Rejected" : "Approved" });
      } else if (src === "wo_amendment") {
        res = await api.patch("/subcon/amendments/" + item._source_id + "/action", { status: isRej ? "Rejected" : "Approved" });
      } else {
        res = await api.patch("/approvals/" + item.id + "/action", { action: isRej ? "reject" : "approve" });
      }
      if (res && res.success !== false) setItems(p => p.filter(i => i.id !== item.id));
      else setErrMsg((res && res.message) || "Failed");
    } catch (e) { setErrMsg(e.message); }
    setActing(p => ({ ...p, [key]: null }));
  };

  const MOD_COLORS = { "Material Request": T.amb, "Design Approval": "#7C3AED", "Purchase Order (PO)": T.blu, "RA Bill": "#0891B2", "Subcon WO Amendment": "#EA580C", "Customer Estimate Amendment": "#DB2777", "Customer Invoice Draft": "#6D28D9", "Payment Request": T.blu, "Material Site Transfer": "#059669", "Material Issue": "#059669" };

  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.38)", zIndex: 300, backdropFilter: "blur(2px)" }} />
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 420, background: T.bg, zIndex: 301, boxShadow: "-4px 0 28px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0D1B2A", padding: "14px 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Pending Approvals</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: 18, padding: 4 }}>✕</button>
        </div>
        {/* My Approvals / All toggle — only admin/super_admin/PM (mirrors the
            global Pending Approvals drawer). "My" = items it's my turn to act on;
            "All" = whole project queue (items waiting on others are read-only). */}
        {canSeeAll && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: 3, gap: 3, marginBottom: 8 }}>
            {[{v:"my",label:"My approvals",n:myCount},{v:"all",label:"All",n:allCount}].map(o=>(
              <button key={o.v} onClick={()=>setScope(o.v)}
                style={{ flex: 1, padding: "6px", border: "none", borderRadius: 20, cursor: "pointer", fontSize: 11.5, fontWeight: scope===o.v?700:500, background: scope===o.v?T.amb:"transparent", color: scope===o.v?"white":"rgba(255,255,255,0.55)", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                {o.label}
                <span style={{ background: scope===o.v?"rgba(255,255,255,0.28)":"rgba(255,255,255,0.12)", color:"white", fontSize:9.5, fontWeight:700, padding:"1px 6px", borderRadius:10 }}>{o.n}</span>
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: T.amb, color: "white", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>{visible.length} pending</span>
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>{projectName}</span>
          <button onClick={load} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontSize: 10.5, padding: "3px 9px", borderRadius: 5 }}>↻ Refresh</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px" }}>
        {errMsg && <div style={{ margin: "4px 0 8px", padding: "8px 12px", background: T.redL, border: "1px solid " + T.redM, borderRadius: 7, fontSize: 12, color: T.red }}>{errMsg}</div>}
        {loading && <div style={{ textAlign: "center", padding: "40px", color: T.t4, fontSize: 13 }}>Loading approvals...</div>}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t2 }}>{scope==="my" ? "No pending approvals!" : "Nothing pending"}</div>
            <div style={{ fontSize: 12, color: T.t4, marginTop: 4 }}>{scope==="my" ? "All approval requests are clear" : "This project's approval queue is empty"}</div>
          </div>
        )}
        {!loading && visible.map(item => {
          const mc = MOD_COLORS[item.module] || T.slt;
          const act = acting[item.id];
          const src = item._source;
          return (
            <div key={item.id} style={{ background: T.surface, borderRadius: 8, border: "1px solid " + T.b1, padding: "11px 13px", borderLeft: "3px solid " + mc, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: mc, background: mc + "18", padding: "1px 7px", borderRadius: 10, textTransform: "uppercase" }}>{item.module}</span>
                    <span style={{ fontSize: 9.5, color: T.t4 }}>{item.ref_no}</span>
                    {src === "design" && item.category && <span style={{ fontSize: 9, color: T.t4 }}>{item.category} · {item.drawing_type || "2D"}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{item.title}</div>
                  <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{item.project_name || "—"} · by {item.submitted_by_name}{(!src || item._request_id) ? " · L" + item.current_level + "/" + item.max_level : ""}</div>
                </div>
                {item.amount > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: mc, flexShrink: 0 }}>{fmtAmt(item.amount)}</span>}
              </div>
              {/* Level progress for engine-tracked items */}
              {(!src || item._request_id) && item.max_level > 0 && (
                <div style={{ display: "flex", gap: 4, margin: "6px 0", alignItems: "center" }}>
                  {Array.from({ length: item.max_level }, (_, i) => {
                    const lvl = i + 1; const done = lvl < item.current_level; const pending = lvl === item.current_level;
                    return <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: done ? "#059669" : pending ? mc : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: done || pending ? "white" : "#9CA3AF" }}>{done ? "✓" : "L" + lvl}</div>
                      {i < item.max_level - 1 && <div style={{ width: 16, height: 2, background: done ? "#059669" : "#E5E7EB" }} />}
                    </div>;
                  })}
                  <span style={{ fontSize: 9.5, color: T.t4, marginLeft: 4 }}>Pending: {item.pending_role || "—"}</span>
                </div>
              )}
              {/* Action buttons — only when it's the viewer's turn (_canActNow).
                  In the "All" view, items waiting on someone else are read-only. */}
              {item._canActNow === false ? (
                <div style={{ marginTop: 6, padding: "5px 10px", borderRadius: 6, background: T.amb + "14", border: "1px solid " + T.amb + "55", fontSize: 10.5, color: T.amb, fontWeight: 600, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>⏳ Waiting on {waitingText(item) || "approver"}</span>
                  {escalationNote(item) && (
                    <span style={{ fontWeight: 500, opacity: 0.85, paddingLeft: 15 }}>{escalationNote(item)}</span>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {src !== "purchase_order" && (
                    <button onClick={() => handleAction(item, "reject")} disabled={!!act}
                      style={{ flex: 1, padding: "6px", borderRadius: 6, background: T.redL, border: "1px solid " + T.redM, color: T.red, fontSize: 11, fontWeight: 700, cursor: act ? "not-allowed" : "pointer" }}>
                      {act === "rejecting" ? "..." : "✕ Reject"}
                    </button>
                  )}
                  {src === "design" && (
                    <button onClick={() => handleAction(item, "Revision")} disabled={!!act}
                      style={{ flex: 1, padding: "6px", borderRadius: 6, background: "#DBEAFE", border: "1px solid #93C5FD", color: "#1D4ED8", fontSize: 11, fontWeight: 700, cursor: act ? "not-allowed" : "pointer" }}>
                      ↻ Revision
                    </button>
                  )}
                  <button onClick={() => handleAction(item, "approve")} disabled={!!act}
                    style={{ flex: 2, padding: "6px", borderRadius: 6, background: act === "approving" ? T.b1 : T.grn, border: "none", color: "white", fontSize: 11, fontWeight: 700, cursor: act ? "not-allowed" : "pointer" }}>
                    {act === "approving" ? "Approving..." : "✓ Approve"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </>);
}

export default ProjectDetailPage;
