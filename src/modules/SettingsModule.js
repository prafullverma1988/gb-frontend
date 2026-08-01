import { useState, useEffect, Fragment } from "react";
import api from "../config/api";
import MapPicker from "../components/MapPicker";

// ─── ICON COMPONENT ──────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", fill = "none", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

// ─── SVG ICONS ───────────────────────────────────────────────────────
const IcBuilding   = (p) => <Icon {...p} d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M12 3v18" />;
const IcShield     = (p) => <Icon {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcLayers     = (p) => <Icon {...p} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />;
const IcCalendar   = (p) => <Icon {...p} d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" />;
const IcBank       = (p) => <Icon {...p} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />;
const IcBox        = (p) => <Icon {...p} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />;
const IcDollar     = (p) => <Icon {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;
const IcBell       = (p) => <Icon {...p} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />;
const IcHash       = (p) => <Icon {...p} d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />;
const IcClipboard  = (p) => <Icon {...p} d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" />;
const IcCheck      = (p) => <Icon {...p} d="M20 6L9 17l-5-5" />;
const IcChevR      = (p) => <Icon {...p} d="M9 18l6-6-6-6" />;
const IcEdit       = (p) => <Icon {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const IcTrash      = (p) => <Icon {...p} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />;
const IcPlus       = (p) => <Icon {...p} d="M12 5v14M5 12h14" />;
const IcUsers      = (p) => <Icon {...p} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 100 8 4 4 0 000-8z" />;
const IcLock       = (p) => <Icon {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" />;
const IcGlobe      = (p) => <Icon {...p} d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" />;
const IcTool       = (p) => <Icon {...p} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />;
const IcSave       = (p) => <Icon {...p} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" />;
const IcX          = (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />;
const IcPhone      = (p) => <Icon {...p} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />;
const IcFolder     = (p) => <Icon {...p} d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />;
const IcLayout     = (p) => <Icon {...p} d="M3 3h18v18H3zM3 9h18M9 21V9" />;

// ─── BALANCED THEME TOKENS ───────────────────────────────────────────
const T = {
  bg: "#F4F6F9",
  card: "#FFFFFF",
  cardHover: "#FAFBFC",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  blueMid: "#3B82F6",
  green: "#059669",
  greenSoft: "#ECFDF5",
  amber: "#D97706",
  amberSoft: "#FFFBEB",
  red: "#DC2626",
  redSoft: "#FEF2F2",
  purple: "#7C3AED",
  purpleSoft: "#F5F3FF",
  teal: "#0D9488",
  tealSoft: "#F0FDFA",
  text: "#111827",
  textMid: "#4B5563",
  textLight: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.1)",
  shadowLg: "0 12px 40px rgba(0,0,0,0.18)",
  radius: 10,
  radiusSm: 6,
  font: "'Segoe UI', system-ui, -apple-system, sans-serif",
  whatsapp: "#25D366",
  whatsappSoft: "#E8FFF0",
};

// ─── PROJECTS DATA (for project access) ──────────────────────────────
// allProjects loaded dynamically in RolesAccess component
const allProjects = []; // fallback — real data from API

// ─── REUSABLE COMPONENTS ─────────────────────────────────────────────

function Toggle({ value, onChange, disabled = false }) {
  return (
    <button onClick={() => !disabled && onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: value ? T.blue : "#D1D5DB", position: "relative", cursor: disabled ? "not-allowed" : "pointer", transition: "background 0.2s", opacity: disabled ? 0.5 : 1, flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: value ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

function ToggleRow({ icon, label, desc, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: T.blueSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{desc}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function SectionCard({ title, desc, children, action }) {
  return (
    <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 20 }}>
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
          {desc && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{desc}</div>}
        </div>
        {action}
      </div>
      <div style={{ padding: "10px 22px 18px" }}>{children}</div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", half = false, disabled = false }) {
  return (
    <div style={{ flex: half ? 1 : undefined, minWidth: half ? 200 : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: disabled ? T.borderLight : "white", outline: "none", boxSizing: "border-box", fontFamily: T.font, transition: "border 0.2s" }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = T.blue; }}
        onBlur={e => e.target.style.borderColor = T.border}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, half = false }) {
  return (
    <div style={{ flex: half ? 1 : undefined, minWidth: half ? 200 : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, letterSpacing: "0.3px", display: "block", marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", cursor: "pointer", fontFamily: T.font, boxSizing: "border-box" }}>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}

function Badge({ text, color = T.blue, bg = T.blueSoft }) {
  return <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{text}</span>;
}

function SaveBtn({ onClick, label = "Save Changes" }) {
  return (
    <button onClick={onClick}
      style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 3px 10px ${T.blue}33`, transition: "transform 0.1s" }}
      onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
      onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>
      <IcSave size={15} color="white" /> {label}
    </button>
  );
}

// ─── MODAL OVERLAY ───────────────────────────────────────────────────
function Modal({ open, onClose, title, desc, width = 560, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
      {/* backdrop — click-to-close removed so a stray outside click can't wipe a half-filled form; use the × / Cancel button */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
      {/* panel */}
      <div style={{ position: "relative", width, maxWidth: "92vw", maxHeight: "88vh", background: T.card, borderRadius: 14, boxShadow: T.shadowLg, display: "flex", flexDirection: "column", overflow: "hidden" }}
        onClick={e => e.stopPropagation()}>
        {/* header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
            {desc && <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{desc}</div>}
          </div>
          <button onClick={onClose} style={{ background: T.borderLight, border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}>
            <IcX size={18} color={T.textMid} />
          </button>
        </div>
        {/* body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMPANY SETTINGS (unchanged from before)
// ═══════════════════════════════════════════════════════════════════════
// ─── OFFICE & WAREHOUSE LOCATIONS (company-level geofences) ──────────
// Each row is a company geofence (project_id NULL) with kind office/warehouse.
// Mobile punch-in geofence check honors these alongside project sites.
function LocationsSettings() {
  const KINDS = [
    { v: "office",    label: "🏢 Office",    c: T.blue },
    { v: "warehouse", label: "📦 Warehouse", c: T.amber },
  ];
  const blank = { id: null, kind: "office", label: "", address: "", lat: "", lng: "", radius: 100 };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showMap, setShowMap] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/geofences?include_inactive=1").then(r => {
      // Company-level locations only (no project) — offices + warehouses
      const list = (r.success ? r.data : []).filter(g => !g.project_id && (g.kind === "office" || g.kind === "warehouse"));
      setRows(list);
    }).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(load, []);

  const useCurrentLoc = () => {
    if (!navigator.geolocation) { setMsg("GPS not available"); return; }
    setMsg("📍 Getting location…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setForm(f => ({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })); setMsg("✓ Location captured"); },
      () => setMsg("GPS denied — enter manually"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const save = async () => {
    if (!form.label.trim()) { setMsg("Name required"); return; }
    const lat = parseFloat(form.lat), lng = parseFloat(form.lng);
    if (isNaN(lat) || isNaN(lng)) { setMsg("Valid lat/lng required (or use current location)"); return; }
    setBusy(true); setMsg("");
    try {
      const body = { project_id: null, kind: form.kind, label: form.label.trim(),
                     address: form.address || null, center_lat: lat, center_lng: lng, radius_m: Number(form.radius) || 100 };
      const r = form.id ? await api.put("/geofences/" + form.id, body) : await api.post("/geofences", body);
      if (r.success) { setMsg("✓ Saved"); setForm(blank); load(); setTimeout(()=>setMsg(""), 2500); }
      else setMsg(r.message || "Save failed");
    } catch (e) { setMsg(e.message || "Network error"); }
    setBusy(false);
  };

  const edit = (g) => setForm({ id: g.id, kind: g.kind || "office", label: g.label || "", address: g.address || "",
                                lat: String(g.center_lat), lng: String(g.center_lng), radius: g.radius_m || 100 });
  const del = async (g) => {
    if (!await window.confirmAsync(`Delete "${g.label}"?`)) return;
    const r = await api.del("/geofences/" + g.id + "?hard=1").catch(()=>({success:false}));
    if (r.success) load();
  };

  const L = { fontSize:10, fontWeight:700, color:T.textLight, textTransform:"uppercase", letterSpacing:".4px", display:"block", marginBottom:4 };
  const I = { width:"100%", padding:"8px 10px", borderRadius:7, border:`1.5px solid ${T.border}`, fontSize:12.5, color:T.text, background:"white", outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <SectionCard title="Office & Warehouse Locations" desc="Add company offices and warehouses with geo-location. Mobile punch-in is geofenced to these sites (alongside project locations).">
      {/* Existing list */}
      {loading ? <div style={{ padding:"14px 0", color:T.textLight, fontSize:12.5 }}>Loading…</div> :
        rows.length === 0 ? <div style={{ padding:"18px", textAlign:"center", color:T.textLight, fontSize:12.5, background:T.bg, borderRadius:9, marginBottom:16 }}>Koi office/warehouse location nahi — niche se add karo.</div> :
        <div style={{ marginBottom:18 }}>
          {rows.map(g => {
            const k = KINDS.find(x => x.v === g.kind) || KINDS[0];
            return (
              <div key={g.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 13px", border:`1px solid ${T.border}`, borderRadius:9, marginBottom:8, background:"white" }}>
                <span style={{ fontSize:11, fontWeight:700, color:k.c, background:k.c+"15", padding:"3px 9px", borderRadius:12, whiteSpace:"nowrap" }}>{k.label}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{g.label}</div>
                  <div style={{ fontSize:11, color:T.textMid, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.address || "—"}</div>
                  <div style={{ fontSize:10.5, color:T.textLight, marginTop:1 }}>📍 {Number(g.center_lat).toFixed(5)}, {Number(g.center_lng).toFixed(5)} · {g.radius_m}m</div>
                </div>
                <button onClick={()=>edit(g)} style={{ padding:"5px 11px", borderRadius:6, background:T.blueSoft, color:T.blue, border:`1px solid ${T.blue}33`, fontSize:11, fontWeight:700, cursor:"pointer" }}>Edit</button>
                <button onClick={()=>del(g)} style={{ padding:"5px 9px", borderRadius:6, background:T.redSoft, color:T.red, border:`1px solid ${T.red}33`, fontSize:11, fontWeight:700, cursor:"pointer" }}>✕</button>
              </div>
            );
          })}
        </div>
      }

      {/* Add / edit form */}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:12.5, fontWeight:800, color:T.text, marginBottom:12 }}>{form.id ? "✏️ Edit Location" : "➕ Add Office / Warehouse"}</div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {KINDS.map(k => (
            <button key={k.v} onClick={()=>setForm(f=>({...f,kind:k.v}))}
              style={{ flex:1, padding:"9px", borderRadius:8, border:`1.5px solid ${form.kind===k.v?k.c:T.border}`, background:form.kind===k.v?k.c+"12":"white", color:form.kind===k.v?k.c:T.textMid, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>
              {k.label}
            </button>
          ))}
        </div>
        <div style={{ marginBottom:10 }}><label style={L}>Name *</label><input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder={form.kind==="office"?"e.g. Head Office":"e.g. Main Warehouse"} style={I}/></div>
        <div style={{ marginBottom:10 }}><label style={L}>Address</label><input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Full address" style={I}/></div>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <button onClick={useCurrentLoc} style={{ flex:1, padding:"9px", borderRadius:7, background:"white", border:`1.5px solid ${T.blue}`, color:T.blue, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>📍 Current Location</button>
          <button onClick={()=>setShowMap(true)} style={{ flex:1, padding:"9px", borderRadius:7, background:"white", border:`1.5px solid ${T.green}`, color:T.green, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>🗺️ Pick from Map</button>
        </div>
        {showMap && <MapPicker initial={{lat:form.lat, lng:form.lng}} onClose={()=>setShowMap(false)}
          onPick={({lat,lng})=>{ setForm(f=>({...f,lat:String(lat),lng:String(lng)})); setMsg("✓ Location captured from map"); }}/>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
          <div><label style={L}>Latitude</label><input value={form.lat} onChange={e=>setForm(f=>({...f,lat:e.target.value}))} placeholder="21.25" style={I}/></div>
          <div><label style={L}>Longitude</label><input value={form.lng} onChange={e=>setForm(f=>({...f,lng:e.target.value}))} placeholder="81.63" style={I}/></div>
          <div><label style={L}>Radius (m)</label><input type="number" value={form.radius} onChange={e=>setForm(f=>({...f,radius:e.target.value}))} placeholder="100" style={I}/></div>
        </div>
        {msg && <div style={{ fontSize:12, fontWeight:600, color:msg.startsWith("✓")?T.green:msg.startsWith("📍")?T.blue:T.amber, marginBottom:10 }}>{msg}</div>}
        <div style={{ display:"flex", gap:8 }}>
          {form.id && <button onClick={()=>{setForm(blank);setMsg("");}} style={{ flex:1, padding:"10px", borderRadius:8, background:"white", border:`1px solid ${T.border}`, color:T.textMid, fontSize:12.5, fontWeight:700, cursor:"pointer" }}>Cancel</button>}
          <button onClick={save} disabled={busy} style={{ flex:2, padding:"10px", borderRadius:8, background:busy?T.textLight:T.blue, color:"white", border:"none", fontSize:12.5, fontWeight:700, cursor:busy?"not-allowed":"pointer" }}>{busy?"Saving…":(form.id?"💾 Update Location":"💾 Add Location")}</button>
        </div>
      </div>
    </SectionCard>
  );
}

function CompanySettings() {
  const [company, setCompany] = useState({
    name: "", legalName: "", gstin: "", pan: "",
    address: "", city: "", state: "", pincode: "",
    phone: "", email: "", website: "",
  });
  const [loading, setLoading] = useState(true);
  const upd = (k, v) => setCompany(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get("/settings/company").then(res => {
      if (res.success && res.data) {
        const d = res.data;
        setCompany({
          name: d.name || "", legalName: d.legal_name || "", gstin: d.gstin || "", pan: d.pan || "",
          address: d.address || "", city: d.city || "", state: d.state || "", pincode: d.pincode || "",
          phone: d.phone || "", email: d.email || "", website: d.website || "", logo_url: d.logo_url || "",
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <SectionCard title="Company Profile" desc="Basic company information visible on invoices and reports" action={<SaveBtn />}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", padding: "14px 0 20px", borderBottom: `1px solid ${T.borderLight}`, marginBottom: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: 14, background: "linear-gradient(135deg, #1565C0, #FF6F00)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(21,101,192,0.3)" }}>
            <span style={{ color: "white", fontSize: 28, fontWeight: 800 }}>{(company.name || "CO").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Company Logo</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2, marginBottom: 10 }}>PNG, JPG up to 2MB. Recommended 200x200px.</div>
            <button style={{ padding: "6px 16px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Upload New Logo</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Company Name (Display)" value={company.name} onChange={v => upd("name", v)} half />
          <FormField label="Legal Name" value={company.legalName} onChange={v => upd("legalName", v)} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="GSTIN" value={company.gstin} onChange={v => upd("gstin", v)} half />
          <FormField label="PAN" value={company.pan} onChange={v => upd("pan", v)} half />
        </div>
        <FormField label="Address" value={company.address} onChange={v => upd("address", v)} />
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="City" value={company.city} onChange={v => upd("city", v)} half />
          <FormField label="State" value={company.state} onChange={v => upd("state", v)} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="Pincode" value={company.pincode} onChange={v => upd("pincode", v)} half />
          <FormField label="Phone" value={company.phone} onChange={v => upd("phone", v)} half />
        </div>
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="Email" value={company.email} onChange={v => upd("email", v)} half />
          <FormField label="Website" value={company.website} onChange={v => upd("website", v)} half />
        </div>
      </SectionCard>
      <SectionCard title="Regional Settings" desc="Currency, date format, and locale preferences">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingTop: 8 }}>
          <FormSelect label="Currency" value="INR" onChange={() => {}} options={[{ value: "INR", label: "INR (Rs.)" }, { value: "USD", label: "USD ($)" }]} half />
          <FormSelect label="Date Format" value="DD/MM/YYYY" onChange={() => {}} options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} half />
        </div>
        <div style={{ height: 14 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormSelect label="Financial Year Start" value="April" onChange={() => {}} options={["January", "April"]} half />
          <FormSelect label="Timezone" value="IST" onChange={() => {}} options={[{ value: "IST", label: "IST (UTC+5:30)" }, { value: "UTC", label: "UTC" }]} half />
        </div>
      </SectionCard>

    </div>
  );
}

// ── Module Type Card — standalone so it has its own state + API ───


// ═══════════════════════════════════════════════════════════════════════
// ROLES & ACCESS — Full rewrite with modals, custom roles, project access
// ═══════════════════════════════════════════════════════════════════════
function RolesAccess() {
  const [allProjects, setAllProjects] = useState([]);
  useEffect(() => {
    api.get("/projects").then(r => {
      if (r.success) setAllProjects(r.data.map(p => ({
        id: p.id,
        name: p.project_name || p.name,
        city: p.city || "",
        status: p.status || ""
      })));
    }).catch(() => {});
  }, []);

  const [roles, setRoles] = useState([
    { id: "admin", name: "Admin", desc: "Full access to everything", color: T.red, colorBg: T.redSoft, isSystem: true },
    { id: "project_manager", name: "Project Manager", desc: "Manage assigned projects", color: T.blue, colorBg: T.blueSoft, isSystem: true },
    { id: "supervisor", name: "Site Supervisor", desc: "On-site task management", color: T.green, colorBg: T.greenSoft, isSystem: true },
    { id: "accountant", name: "Accountant", desc: "Finance & billing access", color: T.amber, colorBg: T.amberSoft, isSystem: true },
    { id: "viewer", name: "Viewer", desc: "Read-only access", color: T.purple, colorBg: T.purpleSoft, isSystem: true },
  ]);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.get("/settings/users");
      if (res.success) setUsers(res.data || []);
    } catch(e) {}
    setUsersLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const [selectedRole, setSelectedRole] = useState("project_manager");
  const [tab, setTab] = useState("permissions"); // permissions | users | projects
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Role form
  const [roleForm, setRoleForm] = useState({ name: "", desc: "", color: T.teal });
  const roleColors = [T.red, T.blue, T.green, T.amber, T.purple, T.teal, "#E11D48", "#DB2777", "#0891B2", "#CA8A04"];

  const openCreateRole = () => { setEditingRole(null); setRoleForm({ name: "", desc: "", color: T.teal }); setShowRoleModal(true); };
  const openEditRole = (r) => { setEditingRole(r); setRoleForm({ name: r.name, desc: r.desc, color: r.color }); setShowRoleModal(true); };
  // Custom roles persist via /settings/roles — system roles keep only
  // local desc/color edits (their names are wired into permission mapping).
  const [roleSaving, setRoleSaving] = useState(false);
  const reloadDbRoles = () => api.get("/settings/roles").then(r => { if (r.success) setDbRoles(r.data || []); }).catch(() => {});
  const saveRole = async () => {
    if (!roleForm.name.trim() || roleSaving) return;
    setRoleSaving(true);
    try {
      if (editingRole) {
        if (editingRole.isSystem) {
          // System role: naam DB/permission mapping se juda hai — sirf desc/color local.
          setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, desc: roleForm.desc, color: roleForm.color, colorBg: roleForm.color + "15" } : r));
        } else {
          const res = await api.put("/settings/roles/" + editingRole.dbId, { name: roleForm.name, description: roleForm.desc });
          if (!res?.success) { alert(res?.message || "Role update failed"); setRoleSaving(false); return; }
          const slug = res.data?.slug || editingRole.id;
          setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, id: slug, name: roleForm.name, desc: roleForm.desc, color: roleForm.color, colorBg: roleForm.color + "15" } : r));
          if (selectedRole === editingRole.id) setSelectedRole(slug);
          reloadDbRoles(); loadUsers();
        }
      } else {
        const res = await api.post("/settings/roles", { name: roleForm.name, description: roleForm.desc });
        if (!res?.success) { alert(res?.message || "Role create failed"); setRoleSaving(false); return; }
        const slug = res.data?.slug || roleForm.name.toLowerCase().replace(/\s+/g, "_");
        setRoles(prev => [...prev, { id: slug, dbId: res.data?.id, name: roleForm.name, desc: roleForm.desc, color: roleForm.color, colorBg: roleForm.color + "15", isSystem: false }]);
        setPermMatrix(prev => ({ ...prev, [slug]: prev[slug] || {} }));
        setSelectedRole(slug);
        reloadDbRoles();
      }
      setShowRoleModal(false);
    } finally { setRoleSaving(false); }
  };
  const deleteRole = async () => {
    if (!editingRole || editingRole.isSystem || roleSaving) return;
    if (!window.confirm(`"${editingRole.name}" role delete karein? (Users pe laga role pehle badalna hoga)`)) return;
    setRoleSaving(true);
    try {
      const res = await api.del("/settings/roles/" + editingRole.dbId);
      if (!res?.success) { alert(res?.message || "Role delete failed"); return; }
      setRoles(prev => prev.filter(r => r.id !== editingRole.id));
      if (selectedRole === editingRole.id) setSelectedRole("project_manager");
      reloadDbRoles();
      setShowRoleModal(false);
    } finally { setRoleSaving(false); }
  };

  // User form
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", role: "viewer", designation: "", password: "", projects: [] });
  // Reverse-flow: search + link an existing unlinked staff-party.
  const [staffSearch, setStaffSearch] = useState("");
  const [staffResults, setStaffResults] = useState([]);
  const [linkedParty, setLinkedParty] = useState(null);
  const openCreateUser = () => {
    setEditingUser(null); setLinkedParty(null); setStaffSearch(""); setStaffResults([]);
    setUserForm({ name: "", email: "", phone: "", role: selectedRole === "all" ? "viewer" : selectedRole, designation: "", password: "Welcome@123", projects: [], status: "Active" });
    setShowUserModal(true);
  };
  const openEditUser = (u) => {
    setEditingUser(u); setLinkedParty(null); setStaffSearch(""); setStaffResults([]);
    setUserForm({
      name: u.name, email: u.email, phone: u.phone || "", role: u.role,
      designation: u.designation || "", password: "", projects: u.projects || [],
      // status MUST be seeded — saveUser maps it to is_active. Without this
      // every edit silently sent is_active=0 and deactivated the user.
      status: (u.is_active === 0 || u.is_active === false) ? "Inactive" : "Active",
    });
    setShowUserModal(true);
  };

  // Debounced live search for unlinked staff-parties
  useEffect(() => {
    if (editingUser || linkedParty) { setStaffResults([]); return; }
    const q = staffSearch.trim();
    if (!q) { setStaffResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/finance/parties/staff-unlinked?q=" + encodeURIComponent(q));
        if (res.success) setStaffResults(res.data || []);
      } catch (e) { /* silent */ }
    }, 300);
    return () => clearTimeout(t);
  }, [staffSearch, editingUser, linkedParty]);

  const selectStaffToLink = (p) => {
    setLinkedParty(p);
    setUserForm(f => ({ ...f, name: p.name, designation: p.designation || "" }));
    setStaffSearch(""); setStaffResults([]);
  };
  const clearLinkedStaff = () => {
    setLinkedParty(null);
    setUserForm(f => ({ ...f, name: "", designation: "" }));
  };

  const [userSaving, setUserSaving] = useState(false);
  const saveUser = async () => {
    if (!userForm.name.trim()) return alert("Name required");
    // Mobile is the compulsory identifier now — email is optional.
    if (!editingUser && !String(userForm.phone || "").trim()) return alert("Mobile number required");
    setUserSaving(true);
    let res;
    if (editingUser) {
      res = await api.put("/settings/users/" + editingUser.id, {
        name: userForm.name, email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        designation: userForm.designation || "",
        is_active: userForm.status === "Active" ? 1 : 0,
        projects: userForm.projects || [],
      });
    } else {
      const body = {
        name: userForm.name, email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        designation: userForm.designation || "",
        password: userForm.password || "Welcome@123",
        projects: userForm.projects || [],
      };
      // Reverse-flow — link to a pre-selected staff-party
      if (linkedParty) body.linked_party_id = linkedParty.id;
      res = await api.post("/settings/users", body);
    }
    setUserSaving(false);
    if (res.success) { await loadUsers(); setShowUserModal(false); }
    else alert(res.message || "Save failed");
  };
  const toggleUserProject = (pid) => {
    setUserForm(p => ({ ...p, projects: (p.projects||[]).includes(pid) ? (p.projects||[]).filter(x => x !== pid) : [...(p.projects||[]), pid] }));
  };

  // Project Access matrix — saves whichever users are currently shown
  // (all users when the "All Users" card is selected, else just the role).
  const [accessSaving, setAccessSaving] = useState(false);
  const saveProjectAccess = async () => {
    setAccessSaving(true);
    try {
      for (const u of roleUsers) {
        await api.put("/settings/users/" + u.id, { projects: u.projects || [] });
      }
      await loadUsers();
      alert("Project access save ho gaya");
    } catch (e) {
      alert("Save failed — dobara try karein");
    }
    setAccessSaving(false);
  };

  // Permission matrix — grouped: top-level Modules + per-project Tabs.
  const MODULE_GROUPS = [
    { title: "Modules", items: ["Projects","Design","Finance","Procurement","Warehouse","Team & HR","CRM","MOM","Township CRM","Tenders","Reports","Library","Settings"] },
    { title: "Project Tabs", items: ["Overview","Estimate","Transaction","Material","Subcon","Attendance","Equipment"] },
  ];
  const modules = MODULE_GROUPS.flatMap(g => g.items.map(name => ({ name })));
  const allPerms = ["view", "create", "edit", "delete", "approve", "export"];
  const permColors = {
    view: { bg: T.blueSoft, text: T.blue }, create: { bg: T.greenSoft, text: T.green },
    edit: { bg: T.amberSoft, text: T.amber }, delete: { bg: T.redSoft, text: T.red },
    approve: { bg: T.purpleSoft, text: T.purple }, export: { bg: "#F0FDF4", text: "#166534" },
  };

  const [permMatrix, setPermMatrix] = useState({
    admin: Object.fromEntries(modules.map(m => [m.name, allPerms])),
    project_manager: {
      Projects:["view","create","edit"], Design:["view","create","edit"], Finance:["view","create"], Procurement:["view","create","edit"], Warehouse:["view","create","edit"], "Team & HR":["view"], CRM:["view","create","edit"], MOM:["view","create","edit"], "Township CRM":["view","create","edit"], Tenders:["view","create","edit"], Reports:["view"], Library:["view"], Settings:[],
      Overview:["view"], Estimate:["view","create","edit"], Transaction:["view","create"], Material:["view","create","edit"], Subcon:["view","create","edit"], Attendance:["view","create","edit"], Equipment:["view","create","edit"],
    },
    supervisor: {
      Projects:["view"], Design:["view"], Finance:["view"], Procurement:["view","create"], Warehouse:["view","create","edit"], "Team & HR":["view"], CRM:[], MOM:["view"], "Township CRM":["view"], Tenders:["view"], Reports:["view"], Library:["view"], Settings:[],
      Overview:["view"], Estimate:[], Transaction:[], Material:["view","create"], Subcon:["view"], Attendance:["view","create","edit"], Equipment:["view"],
    },
    accountant: {
      Projects:["view"], Design:[], Finance:["view","create","edit","approve"], Procurement:["view"], Warehouse:["view"], "Team & HR":["view","create","edit"], CRM:["view"], MOM:["view"], "Township CRM":["view"], Tenders:["view","create","edit"], Reports:["view"], Library:["view"], Settings:[],
      Overview:["view"], Estimate:["view"], Transaction:["view","create","edit"], Material:["view"], Subcon:[], Attendance:["view"], Equipment:[],
    },
    viewer: {
      Projects:["view"], Design:["view"], Finance:["view"], Procurement:["view"], Warehouse:["view"], "Team & HR":[], CRM:["view"], MOM:["view"], "Township CRM":["view"], Tenders:["view"], Reports:["view"], Library:["view"], Settings:[],
      Overview:["view"], Estimate:["view"], Transaction:["view"], Material:["view"], Subcon:["view"], Attendance:["view"], Equipment:["view"],
    },
  });

  // ── DB roles (numeric ids needed for PUT /roles/:id/permissions) ──────
  const [dbRoles, setDbRoles] = useState([]);
  const [permSaving, setPermSaving] = useState(false);
  // Collapsible matrix sections (Modules / Project Tabs) — fold to fit one screen.
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    api.get("/settings/roles").then(res => {
      if (!res.success || !res.data?.length) return;
      setDbRoles(res.data);
      const slugOf = (n) => (n || "").toLowerCase().replace(/[\s&]+/g, "_").replace(/_+/g, "_");
      const SYSTEM_SLUGS = ["admin", "project_manager", "supervisor", "site_supervisor", "accountant", "viewer", "super_admin", "staff"];
      // ── Custom roles → role cards (persisted via POST /settings/roles) ──
      const rolePalette = [T.teal, "#E11D48", "#DB2777", "#0891B2", "#CA8A04", T.purple];
      const customs = res.data.filter(r => !SYSTEM_SLUGS.includes(slugOf(r.name)));
      if (customs.length) {
        setRoles(prev => {
          const have = new Set(prev.map(r => r.id));
          const added = customs
            .filter(c => !have.has(slugOf(c.name)))
            .map((c, i) => {
              const col = rolePalette[i % rolePalette.length];
              return { id: slugOf(c.name), dbId: c.id, name: c.name, desc: c.description || "", color: col, colorBg: col + "15", isSystem: false };
            });
          return added.length ? [...prev, ...added] : prev;
        });
      }
      // Pre-populate permMatrix from DB — overrides hardcoded defaults.
      // Custom roles (unknown keys) start empty so the matrix is editable.
      setPermMatrix(prev => {
        const next = { ...prev };
        for (const dbRole of res.data) {
          // Match by slug: "Project Manager" → "project_manager"
          const key = slugOf(dbRole.name);
          if (next[key] === undefined) next[key] = {};
          const modMap = {};
          for (const p of (dbRole.permissions || [])) {
            const perms = [];
            if (p.can_view)    perms.push("view");
            if (p.can_create)  perms.push("create");
            if (p.can_edit)    perms.push("edit");
            if (p.can_delete)  perms.push("delete");
            if (p.can_approve) perms.push("approve");
            modMap[p.module] = perms;
          }
          if (Object.keys(modMap).length) next[key] = modMap;
        }
        return next;
      });
    }).catch(() => {});
  }, []);

  const savePermissions = async () => {
    if (selectedRole === "admin") return;
    // Find DB role by name-slug match
    const dbRole = dbRoles.find(r => {
      const slug = (r.name || "").toLowerCase().replace(/[\s&]+/g, "_").replace(/_+/g, "_");
      return slug === selectedRole || r.name === activeRole?.name;
    });
    if (!dbRole) { alert("Role DB record not found. Check /settings/roles API."); return; }
    const perms = permMatrix[selectedRole] || {};
    const permissions = modules.map(m => ({
      module: m.name,
      can_view:    (perms[m.name]||[]).includes("view")    ? 1 : 0,
      can_create:  (perms[m.name]||[]).includes("create")  ? 1 : 0,
      can_edit:    (perms[m.name]||[]).includes("edit")    ? 1 : 0,
      can_delete:  (perms[m.name]||[]).includes("delete")  ? 1 : 0,
      can_approve: (perms[m.name]||[]).includes("approve") ? 1 : 0,
    }));
    setPermSaving(true);
    const res = await api.put(`/settings/roles/${dbRole.id}/permissions`, { permissions });
    setPermSaving(false);
    if (res.success) alert("Permissions saved!");
    else alert(res.message || "Failed to save permissions");
  };

  const togglePerm = (mod, perm) => {
    if (selectedRole === "admin") return;
    setPermMatrix(prev => {
      const cur = prev[selectedRole]?.[mod] || [];
      const has = cur.includes(perm);
      let next;
      if (perm === "view") {
        // No view = no access → turning view OFF clears every permission.
        next = has ? [] : [...cur, "view"];
      } else if (has) {
        next = cur.filter(p => p !== perm);
      } else {
        // Any action (create/edit/…) needs view → auto-enable it.
        next = cur.includes("view") ? [...cur, perm] : [...cur, "view", perm];
      }
      return { ...prev, [selectedRole]: { ...prev[selectedRole], [mod]: next } };
    });
  };

  const isAllUsers = selectedRole === "all";
  const activeRole = roles.find(r => r.id === selectedRole);
  // A super_admin user is grouped under the "Admin" role card — there
  // is no separate Super Admin card, so without this they show nowhere.
  const userInRole = (u, roleId) => u.role === roleId || (roleId === "admin" && u.role === "super_admin");
  const roleUsers = isAllUsers ? users : users.filter(u => userInRole(u, selectedRole));

  const tabs = [
    { id: "permissions", label: "Permissions" },
    { id: "users", label: `Users (${roleUsers.length})` },
    { id: "projects", label: "Project Access" },
  ];

  return (
    <div>
      {/* ── Role cards ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {/* All Users — shows every user across roles (Project Access matrix) */}
        <button onClick={() => { setSelectedRole("all"); setTab("projects"); }}
          style={{
            flex: "1 1 140px", maxWidth: 200, padding: "12px 14px", borderRadius: T.radius,
            background: isAllUsers ? T.blueSoft : T.card,
            border: `2px solid ${isAllUsers ? T.blue : T.border}`,
            cursor: "pointer", textAlign: "left", transition: "all 0.15s",
            boxShadow: isAllUsers ? T.shadowMd : T.shadow,
          }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isAllUsers ? T.blue : T.text }}>All Users</div>
          <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{users.length} users</div>
        </button>
        {roles.map(r => (
          <div key={r.id} onClick={() => setSelectedRole(r.id)}
            style={{
              flex: "1 1 140px", maxWidth: 200, padding: "12px 14px", borderRadius: T.radius,
              background: selectedRole === r.id ? r.colorBg : T.card,
              border: `2px solid ${selectedRole === r.id ? r.color : T.border}`,
              cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              boxShadow: selectedRole === r.id ? T.shadowMd : T.shadow, position: "relative",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: selectedRole === r.id ? r.color : T.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: T.textLight, marginTop: 2 }}>{users.filter(u => userInRole(u, r.id)).length} users</div>
              </div>
              {(!r.isSystem || selectedRole === r.id) && (
                <button onClick={(e) => { e.stopPropagation(); openEditRole(r); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <IcEdit size={13} color={T.textLight} />
                </button>
              )}
            </div>
            {!r.isSystem && <div style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: r.color }} />}
          </div>
        ))}
        <button onClick={openCreateRole}
          style={{ flex: "0 0 56px", padding: "12px", borderRadius: T.radius, background: T.card, border: `2px dashed ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
          <IcPlus size={18} color={T.textLight} />
          <span style={{ fontSize: 10, color: T.textLight, fontWeight: 600 }}>New</span>
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "12px 16px", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? T.blue : T.textMid,
              background: tab === t.id ? T.blueSoft : "transparent",
              border: "none", cursor: "pointer", borderBottom: tab === t.id ? `2.5px solid ${T.blue}` : "2.5px solid transparent",
              transition: "all 0.15s",
            }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: Permissions ── */}
      {tab === "permissions" && isAllUsers && (
        <SectionCard title="Module Permissions" desc="Permissions har role ke liye alag hote hain">
          <div style={{ background: T.blueSoft, borderRadius: 8, padding: "12px 14px", marginTop: 8, fontSize: 12.5, color: T.blue, display: "flex", gap: 8, alignItems: "center" }}>
            <IcShield size={15} color={T.blue} /> Permissions ek specific role ke liye set hote hain. Upar se koi ek role card chunein.
          </div>
        </SectionCard>
      )}
      {tab === "permissions" && !isAllUsers && (
        <SectionCard title={`Module Permissions — ${activeRole?.name || ""}`} desc={activeRole?.desc}
          action={<SaveBtn label={permSaving ? "Saving..." : "Update Permissions"} onClick={savePermissions} />}>
          {selectedRole === "admin" && (
            <div style={{ background: T.amberSoft, borderRadius: 8, padding: "10px 14px", marginTop: 8, marginBottom: 12, fontSize: 12, color: T.amber, display: "flex", gap: 8, alignItems: "center" }}>
              <IcShield size={15} color={T.amber} /> Admin role has full access. Permissions cannot be modified.
            </div>
          )}
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, fontWeight: 600, color: T.textLight, borderBottom: `2px solid ${T.border}`, minWidth: 130 }}>Module</th>
                  {allPerms.map(p => (
                    <th key={p} style={{ textAlign: "center", padding: "10px 6px", fontSize: 10.5, fontWeight: 700, color: T.textMid, borderBottom: `2px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.5px", minWidth: 60 }}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_GROUPS.flatMap(group => {
                  const collapsed = !!collapsedGroups[group.title];
                  return [
                  <tr key={group.title + "__hdr"} onClick={() => setCollapsedGroups(p => ({ ...p, [group.title]: !p[group.title] }))} style={{ cursor: "pointer", userSelect: "none" }}>
                    <td colSpan={allPerms.length + 1} style={{ padding: "14px 12px 4px", fontSize: 11, fontWeight: 700, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.6px" }}>
                      <span style={{ display: "inline-block", width: 14, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform .15s" }}>▼</span>
                      {group.title} <span style={{ fontWeight: 500, textTransform: "none" }}>({group.items.length})</span>
                    </td>
                  </tr>,
                  ...(collapsed ? [] : group.items.map(name => {
                    const perms = permMatrix[selectedRole]?.[name] || [];
                    return (
                      <tr key={name} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                        <td style={{ padding: "12px", fontWeight: 600, color: T.text }}>{name}</td>
                        {allPerms.map(p => {
                          const has = perms.includes(p);
                          return (
                            <td key={p} style={{ textAlign: "center", padding: "8px 6px" }}>
                              <button onClick={() => togglePerm(name, p)}
                                style={{ width: 28, height: 28, borderRadius: 6, background: has ? permColors[p].bg : T.borderLight, border: `1.5px solid ${has ? permColors[p].text + "44" : "transparent"}`, cursor: selectedRole === "admin" ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                                {has && <IcCheck size={14} color={permColors[p].text} strokeWidth={2.5} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }))
                  ];
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── TAB: Users ── */}
      {tab === "users" && (
        <SectionCard title={isAllUsers ? "Users — All Users" : `Users — ${activeRole?.name || ""}`} desc={isAllUsers ? `${roleUsers.length} total users` : `${roleUsers.length} members in this role`}
          action={
            <button onClick={openCreateUser} style={{ padding: "8px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <IcPlus size={15} color="white" /> Add User
            </button>
          }>
          {usersLoading && <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: T.textLight }}>Loading...</div>}
          {!usersLoading && roleUsers.length === 0 && <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: T.textLight }}>No users in this role yet</div>}
          {roleUsers.map((u, i) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: i < roleUsers.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${activeRole?.color || T.blue}, ${activeRole?.color || T.blue}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>
                {u.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{u.name}</div>
                <div style={{ fontSize: 12, color: T.textLight, display: "flex", gap: 12 }}>
                  <span>{u.email}</span>
                  <span>{u.phone}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Badge text={`${(u.projects||[]).length} projects`} color={T.textMid} bg={T.borderLight} />
                <Badge text={u.is_active===0?"Inactive":"Active"} color={u.is_active===0?T.amber:T.green} bg={u.is_active===0?T.amberSoft:T.greenSoft} />
                <button onClick={() => openEditUser(u)} style={{ background: T.borderLight, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                  <IcEdit size={14} color={T.textMid} />
                </button>
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {/* ── TAB: Project Access ── */}
      {tab === "projects" && (() => {
        // Toggle ke hisaab se rows banao. "all" => sabhi roles ek hi
        // window me, role-category header ke saath grouped.
        const colSpan = 1 + allProjects.length;
        const renderUserRow = (u, roleColor) => (
          <tr key={u.id} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
            <td style={{ padding: "10px 8px", fontWeight: 600, color: T.text, position: "sticky", left: 0, background: T.card, zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor}, ${roleColor}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>{u.name.charAt(0)}</div>
                <span style={{ fontSize: 12 }}>{u.name}</span>
              </div>
            </td>
            {allProjects.map(p => {
              const has = (u.projects||[]).includes(p.id);
              return (
                <td key={p.id} style={{ textAlign: "center", padding: "8px 6px" }}>
                  <button onClick={() => {
                    setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, projects: has ? (usr.projects||[]).filter(x => x !== p.id) : [...(usr.projects||[]), p.id] } : usr));
                  }}
                    style={{ width: 26, height: 26, borderRadius: 6, background: has ? T.greenSoft : T.borderLight, border: `1.5px solid ${has ? T.green + "55" : "transparent"}`, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    {has && <IcCheck size={13} color={T.green} strokeWidth={2.5} />}
                  </button>
                </td>
              );
            })}
          </tr>
        );
        // "All Users" card => har role ka block; warna sirf selected role.
        const groups = isAllUsers
          ? roles.map(r => ({ role: r, list: users.filter(u => userInRole(u, r.id)) })).filter(g => g.list.length > 0)
          : [{ role: activeRole, list: roleUsers }];
        const totalShown = groups.reduce((n, g) => n + g.list.length, 0);
        return (
        <SectionCard title="Project Access Matrix"
          desc={isAllUsers ? "Which user can access which project — saare roles ek hi window me" : ("Which user can access which project — " + (activeRole?.name || "role"))}
          action={<SaveBtn label={accessSaving ? "Saving..." : "Save Access"} onClick={saveProjectAccess} />}>
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "10px 8px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, minWidth: 160, position: "sticky", left: 0, background: T.card, zIndex: 1 }}>User / Project</th>
                  {allProjects.map(p => (
                    <th key={p.id} style={{ textAlign: "center", padding: "10px 6px", fontSize: 10.5, fontWeight: 600, color: T.textMid, borderBottom: `2px solid ${T.border}`, minWidth: 90, writingMode: "vertical-rl", transform: "rotate(180deg)", height: 100 }}>
                      {p.name.length > 22 ? p.name.substring(0, 22) + ".." : p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => {
                  const rc = g.role?.color || T.blue;
                  return (
                    <Fragment key={g.role?.id || "grp"}>
                      <tr>
                        <td colSpan={colSpan} style={{ padding: "8px 10px", background: (g.role?.colorBg || T.blueSoft), borderBottom: `1.5px solid ${T.border}`, position: "sticky", left: 0 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: rc, textTransform: "uppercase", letterSpacing: 0.4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: rc }} />
                            {g.role?.name || "Role"} — {g.list.length} {g.list.length === 1 ? "user" : "users"}
                          </span>
                        </td>
                      </tr>
                      {g.list.map(u => renderUserRow(u, rc))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalShown === 0 && <div style={{ padding: "30px 0", textAlign: "center", fontSize: 13, color: T.textLight }}>No users found</div>}
        </SectionCard>
        );
      })()}

      {/* ── Modal: Create / Edit Role ── */}
      <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? "Edit Role" : "Create Custom Role"} desc="Define role name, description, and color" width={480}>
        <FormField label="Role Name" value={roleForm.name} onChange={v => setRoleForm(p => ({ ...p, name: v }))} placeholder="e.g. Site Engineer" disabled={!!(editingRole && editingRole.isSystem)} />
        <div style={{ height: 14 }} />
        <FormField label="Description" value={roleForm.desc} onChange={v => setRoleForm(p => ({ ...p, desc: v }))} placeholder="What can this role do?" />
        <div style={{ height: 16 }} />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 8 }}>Role Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {roleColors.map(c => (
              <button key={c} onClick={() => setRoleForm(p => ({ ...p, color: c }))}
                style={{ width: 32, height: 32, borderRadius: 8, background: c, border: roleForm.color === c ? "3px solid #111" : "3px solid transparent", cursor: "pointer", transition: "all 0.15s" }} />
            ))}
          </div>
        </div>
        <div style={{ height: 20 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          {editingRole && !editingRole.isSystem && (
            <button onClick={deleteRole} disabled={roleSaving}
              style={{ marginRight: "auto", padding: "10px 16px", borderRadius: 8, border: "1.5px solid #FECACA", background: "#FEF2F2", fontSize: 13, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>
              Delete Role
            </button>
          )}
          {editingRole && editingRole.isSystem && (
            <span style={{ marginRight: "auto", fontSize: 11, color: T.textLight }}>System role — naam change nahi hota</span>
          )}
          <button onClick={() => setShowRoleModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveRole} disabled={roleSaving} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: roleSaving ? "wait" : "pointer", opacity: roleSaving ? .7 : 1 }}>
            {roleSaving ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Create / Edit User ── */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? "Edit User" : "Add New User"} desc="User details and project access" width={600}>
        {/* ── Reverse-flow: search & link existing staff ── */}
        {!editingUser && (
          <div style={{ background: T.tealSoft || "#F0FDFA", border: `1px solid ${(T.teal||"#0D9488")}33`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.teal || "#0D9488", marginBottom: 4 }}>
              🔍 Existing staff se add karein? (optional)
            </div>
            {linkedParty ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "white", border: `1.5px solid ${(T.teal||"#0D9488")}`, borderRadius: 8, padding: "8px 12px", marginTop: 6 }}>
                <div style={{ flex: 1, fontSize: 12.5 }}>
                  <b>Linking to existing staff: {linkedParty.name}</b>
                  {linkedParty.designation ? <span style={{ color: T.textMid }}> — {linkedParty.designation}</span> : null}
                </div>
                <button onClick={clearLinkedStaff}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: T.textMid, lineHeight: 1, padding: 2 }}>×</button>
              </div>
            ) : (
              <>
                <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                  placeholder="Search by name or designation..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, boxSizing: "border-box", outline: "none", marginTop: 6 }} />
                {staffResults.length > 0 && (
                  <div style={{ marginTop: 6, background: "white", border: `1px solid ${T.border}`, borderRadius: 8, maxHeight: 160, overflowY: "auto" }}>
                    {staffResults.map(p => (
                      <div key={p.id} onClick={() => selectStaffToLink(p)}
                        style={{ padding: "8px 12px", cursor: "pointer", borderBottom: `1px solid ${T.borderLight}`, fontSize: 12.5 }}
                        onMouseEnter={e => e.currentTarget.style.background = T.borderLight}
                        onMouseLeave={e => e.currentTarget.style.background = "white"}>
                        <b>{p.name}</b>{p.designation ? <span style={{ color: T.textMid }}> — {p.designation}</span> : null}
                        <div style={{ fontSize: 10.5, color: T.textLight, marginTop: 1 }}>
                          {p.staff_subtype === "wages" ? "Daily wages" : "Office staff"} · Not linked yet
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 10.5, color: T.textMid, marginTop: 6 }}>
                  Agar staff Library ya Payroll me already add hai, search karke link kar dein — duplicate nahi hoga.
                </div>
              </>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Full Name *" value={userForm.name} onChange={v => setUserForm(p => ({ ...p, name: v }))} placeholder="Full name" half disabled={!!linkedParty} />
          <FormField label="Mobile Number *" value={userForm.phone} onChange={v => setUserForm(p => ({ ...p, phone: v }))} placeholder="10-digit mobile" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Email (optional)" value={userForm.email} onChange={v => setUserForm(p => ({ ...p, email: v }))} placeholder="email@company.com — optional" half />
          <FormSelect label="Role" value={userForm.role} onChange={v => setUserForm(p => ({ ...p, role: v }))} options={roles.map(r => ({ value: r.id, label: r.name }))} half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Designation" value={userForm.designation||""} onChange={v => setUserForm(p => ({ ...p, designation: v }))} placeholder="e.g. Site Engineer, PM" half disabled={!!linkedParty} />
          {!editingUser && <FormField label="Password" value={userForm.password||""} onChange={v => setUserForm(p => ({ ...p, password: v }))} placeholder="Default: Welcome@123" half />}
        </div>

        {/* Status toggle — edit mode only */}
        {editingUser && (
          <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bgSoft || "#F8FAFC" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 8 }}>User Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Active", "Inactive"].map(s => {
                const sel = (userForm.status || "Active") === s;
                const on = s === "Active";
                const accent = on ? T.green : T.red;
                const accentSoft = on ? T.greenSoft : (T.redSoft || "#FEE2E2");
                return (
                  <button key={s} type="button" onClick={() => setUserForm(p => ({ ...p, status: s }))}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: 7, border: `1.5px solid ${sel ? accent : T.border}`, background: sel ? accentSoft : "white", fontSize: 12.5, fontWeight: 600, color: sel ? accent : T.textMid, cursor: "pointer", transition: "all 0.15s" }}>
                    {s === "Active" ? "Active" : "Inactive"}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: T.textLight, marginTop: 8 }}>
              Inactive user login nahi kar sakta. Active karne par staff wallet party bhi auto-restore ho jayegi.
            </div>
          </div>
        )}

        {/* Project access */}
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 10 }}>Project Access</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button onClick={() => setUserForm(p => ({ ...p, projects: allProjects.map(pr => pr.id) }))}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${T.blue}`, background: T.blueSoft, fontSize: 11, fontWeight: 600, color: T.blue, cursor: "pointer" }}>Select All</button>
            <button onClick={() => setUserForm(p => ({ ...p, projects: [] }))}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "white", fontSize: 11, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Clear All</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {allProjects.map(p => {
              const sel = userForm.projects.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggleUserProject(p.id)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${sel ? T.green : T.border}`, background: sel ? T.greenSoft : "white", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: sel ? T.green : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {sel && <IcCheck size={12} color="white" strokeWidth={3} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{p.name.length > 28 ? p.name.substring(0, 28) + ".." : p.name}</div>
                    <div style={{ fontSize: 11, color: T.textLight }}>{p.city} — {p.status}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 20 }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowUserModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveUser} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
            {userSaving ? "Saving..." : editingUser ? "Update User" : "Add User"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MULTI-LEVEL APPROVAL — Expanded with all 12 transaction types + edit/create
// ═══════════════════════════════════════════════════════════════════════
function ApprovalSettings() {
  // Role options: value = slug (matches req.user.role), label = display name
  const ROLE_OPTIONS = [
    { value: "site_supervisor",  label: "Site Supervisor"  },
    { value: "project_manager",  label: "Project Manager"  },
    { value: "accountant",       label: "Accountant"       },
    { value: "admin",            label: "Admin"            },
  ];
  const roleLabel = (v) => ROLE_OPTIONS.find(r => r.value === v)?.label || v;

  const DEFAULTS = [
    { id: 0,  module: "Design Approval",       cat: "DESIGN",       enabled: true,  levels: [{ role: "Project Manager", limit: null }] },
    { id: 0,  module: "Material Request",      cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Project Manager", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Purchase Order (PO)",    cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Accountant", limit: 50000 }, { role: "Project Manager", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "RFQ",                    cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Project Manager", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Material Purchase",      cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Site Supervisor", limit: 30000 }, { role: "Project Manager", limit: null }] },
    { id: 0,  module: "GRN (Goods Received)",   cat: "PROCUREMENT",  enabled: true,  levels: [{ role: "Site Supervisor", limit: null }] },
    { id: 0,  module: "Material Site Transfer", cat: "WAREHOUSE",    enabled: true,  levels: [{ role: "Project Manager", limit: null }] },
    { id: 0,  module: "Material Issue",         cat: "WAREHOUSE",    enabled: true,  levels: [{ role: "Project Manager", limit: null }] },
    { id: 0,  module: "Site Expense",           cat: "FINANCE",      enabled: true,  levels: [{ role: "Site Supervisor", limit: 25000 }, { role: "Project Manager", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Subcontractor Bill",     cat: "FINANCE",      enabled: true,  levels: [{ role: "Project Manager", limit: 300000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Subcon WO Amendment",    cat: "FINANCE",      enabled: true,  levels: [{ role: "Project Manager", limit: null }, { role: "Admin", limit: null }] },
    { id: 0,  module: "RA Bill",                cat: "FINANCE",      enabled: true,  levels: [{ role: "Project Manager", limit: 500000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Customer Invoice",       cat: "FINANCE",      enabled: true,  levels: [{ role: "Accountant", limit: 500000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Retention Release",      cat: "FINANCE",      enabled: true,  levels: [{ role: "Accountant", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Detention Charges",      cat: "FINANCE",      enabled: false, levels: [{ role: "Project Manager", limit: null }] },
    { id: 0,  module: "Payment Entry",               cat: "PAYMENTS",  enabled: true,  levels: [{ role: "Accountant", limit: 100000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Payment Request",             cat: "PAYMENTS",  enabled: true,  levels: [{ role: "Project Manager", limit: 200000 }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Customer Estimate Amendment", cat: "FINANCE",   enabled: true,  levels: [{ role: "Project Manager", limit: null }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Labour Rate Change",          cat: "HR",        enabled: true,  levels: [{ role: "Project Manager", limit: null }, { role: "Admin", limit: null }] },
    { id: 0,  module: "Salary Edit",                 cat: "HR",        enabled: true,  levels: [{ role: "Admin", limit: null }] },
  ];

  const [approvals, setApprovals] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  // "ok" | "warn" | "err" — drives the message colour. Was inferred from the
  // text (`saveMsg.includes("Failed")`), which cannot express a partial save.
  const [saveTone, setSaveTone] = useState("ok");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editLevels, setEditLevels] = useState([]);
  // Company switch: auto-approve the requester's own approval level
  const [autoApproveSelf, setAutoApproveSelf] = useState(false);

  // Load from API on mount
  useEffect(() => {
    (async () => {
      try {
        api.get("/approvals/settings").then(r => {
          if (r.success && r.data) setAutoApproveSelf(!!r.data.auto_approve_self);
        }).catch(() => {});
        const res = await api.get("/approvals/workflows");
        if (res.success && res.data && res.data.length > 0) {
          const mapped = res.data.map(wf => ({
            id: wf.id,
            module: wf.module,
            cat: wf.category,
            enabled: !!wf.enabled,
            escalation_hours: wf.escalation_hours || 24,
            notify_channel: wf.notify_channel || "all",
            levels: (wf.levels || []).map(lv => {
              // New: allowed_roles JSON array; legacy: single role string
              let roles = [];
              if (lv.allowed_roles) {
                try { roles = typeof lv.allowed_roles === "string" ? JSON.parse(lv.allowed_roles) : lv.allowed_roles; } catch(_){}
              }
              if (!roles.length && lv.role) roles = [lv.role];
              // Preserve 0 distinctly (mandatory checkpoint) — only null/"" = Unlimited.
              // `amount_limit ? ... : null` would collapse 0 → null and wipe dual-control on save.
              return { roles, limit: (lv.amount_limit === null || lv.amount_limit === undefined || lv.amount_limit === "") ? null : Number(lv.amount_limit) };
            }),
          }));
          // Merge: keep API data, add any DEFAULTS not in API
          const apiModules = new Set(mapped.map(m => m.module));
          const merged = [...mapped, ...DEFAULTS.filter(d => !apiModules.has(d.module))];
          setApprovals(merged);
        }
      } catch (e) { console.error("Load approval workflows:", e); }
      setLoading(false);
    })();
  }, []);

  // Save to API
  const saveAll = async () => {
    setSaving(true); setSaveMsg(""); setSaveTone("ok");
    // Mirrors saveTone in a local, because the auto-clear decision at the end
    // of this function runs before React has committed the state update.
    let tone = "ok";
    try {
      const payload = approvals.map(a => ({
        id: a.id > 0 ? a.id : undefined,
        module: a.module,
        category: a.cat,
        enabled: a.enabled,
        escalation_hours: a.escalation_hours || 24,
        notify_channel: a.notify_channel || "all",
        levels: a.levels,
      }));
      const res = await api.put("/approvals/workflows", { workflows: payload });
      if (res.success) {
        // A 200 does NOT mean every workflow landed. The API skips ids that
        // don't belong to this company (stale ids kept across a company switch)
        // and reports them in `skipped` — announcing "Saved successfully!" there
        // left the admin believing a chain was updated when nothing was written.
        // An ABSENT `res.data` is not "saved 0" — `Number(undefined || 0)` would
        // collapse the two and report a false failure. Unknown counts stay green.
        const counts = res.data || {};
        const saved = typeof counts.saved === "number" ? counts.saved : null;
        const skipped = typeof counts.skipped === "number" ? counts.skipped : 0;
        if (payload.length > 0 && saved === 0) {
          tone = "err"; setSaveMsg("Kuch save nahi hua — page refresh karke dobara try karein");
        } else if (skipped > 0) {
          tone = "warn"; setSaveMsg(`${saved} save hue, ${skipped} nahi — page refresh karke dobara try karein`);
        } else {
          setSaveMsg("Saved successfully!");
        }
        setSaveTone(tone);
        // Reload to get IDs
        const r2 = await api.get("/approvals/workflows");
        if (r2.success && r2.data) {
          const mapped = r2.data.map(wf => ({
            id: wf.id, module: wf.module, cat: wf.category, enabled: !!wf.enabled,
            escalation_hours: wf.escalation_hours || 24, notify_channel: wf.notify_channel || "all",
            levels: (wf.levels || []).map(lv => {
              let roles = [];
              if (lv.allowed_roles) {
                try { roles = typeof lv.allowed_roles === "string" ? JSON.parse(lv.allowed_roles) : lv.allowed_roles; } catch(_){}
              }
              if (!roles.length && lv.role) roles = [lv.role];
              // Preserve 0 distinctly (mandatory checkpoint) — only null/"" = Unlimited.
              // `amount_limit ? ... : null` would collapse 0 → null and wipe dual-control on save.
              return { roles, limit: (lv.amount_limit === null || lv.amount_limit === undefined || lv.amount_limit === "") ? null : Number(lv.amount_limit) };
            }),
          }));
          const apiModules = new Set(mapped.map(m => m.module));
          setApprovals([...mapped, ...DEFAULTS.filter(d => !apiModules.has(d.module))]);
        }
      } else { tone = "err"; setSaveMsg("Failed to save: " + (res.message || "Unknown error")); setSaveTone(tone); }
    } catch (e) { console.error("Save approvals:", e); tone = "err"; setSaveMsg("Failed to save"); setSaveTone(tone); }
    setSaving(false);
    // Only a clean success auto-clears. Red and amber tell the user to reload
    // and redo the setting — 3s is not long enough to read that, and a warning
    // that vanishes is the same dishonesty as not showing one.
    if (tone === "ok") setTimeout(() => setSaveMsg(""), 3000);
  };

  const categories = ["DESIGN", "PROCUREMENT", "WAREHOUSE", "FINANCE", "PAYMENTS", "HR"];
  const catColors = { DESIGN: T.purple, PROCUREMENT: T.teal, WAREHOUSE: T.blue, FINANCE: T.amber, PAYMENTS: T.green, HR: T.red };

  const openEdit = (a) => {
    setEditItem(a);
    // Ensure every level has a `roles` array
    setEditLevels(a.levels.map(l => ({
      ...l,
      roles: Array.isArray(l.roles) && l.roles.length ? l.roles : (l.role ? [l.role] : ["admin"]),
    })));
    setShowEditModal(true);
  };

  const saveEdit = () => {
    setApprovals(prev => prev.map(a => a.id === editItem.id ? { ...a, levels: editLevels } : a));
    setShowEditModal(false);
  };

  const addLevel = () => setEditLevels(p => [...p, { roles: ["site_supervisor"], limit: null }]);
  const removeLevel = (i) => setEditLevels(p => p.filter((_, idx) => idx !== i));
  const updateLevel = (i, k, v) => setEditLevels(p => p.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  // Parallel role helpers — add/remove a role within a single level
  const addRoleToLevel = (levelIdx, role) => setEditLevels(p =>
    p.map((l, idx) => idx === levelIdx ? { ...l, roles: [...(l.roles||[]), role] } : l)
  );
  const removeRoleFromLevel = (levelIdx, roleIdx) => setEditLevels(p =>
    p.map((l, idx) => idx === levelIdx ? { ...l, roles: l.roles.filter((_, ri) => ri !== roleIdx) } : l)
  );

  const toggleApproval = (id) => setApprovals(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));

  // Persist the auto-approve-self switch immediately on toggle
  const toggleAutoApproveSelf = async (v) => {
    setAutoApproveSelf(v);
    try { await api.put("/approvals/settings", { auto_approve_self: v }); }
    catch (e) { setAutoApproveSelf(!v); }
  };

  if (loading) return <div style={{textAlign:"center",padding:"60px 0",color:T.textLight,fontSize:13}}>Loading approval workflows...</div>;

  return (
    <div>
      {/* Info banner */}
      <div style={{ background: T.blueSoft, borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start", boxShadow: T.shadow }}>
        <IcShield size={20} color={T.blue} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: T.blue, lineHeight: 1.6 }}>
          Configure multi-level approval chains for each transaction type. Transactions exceeding the set amount limit will require approval from the next level. Click edit to customize approval levels for any workflow.
        </div>
      </div>

      {/* Company switch: auto-approve the requester's own level */}
      <div style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 20, padding: "4px 22px" }}>
        <ToggleRow
          icon={<IcShield size={18} color={T.blue} />}
          label="Auto-approve requester's own level"
          desc="Jab approval chain us role tak pahunche jo request banane wale ka hai, wo level apne aap approve ho jata hai (eg: Admin ne banaya, PM check kare, fir Admin ka level auto-approve). OFF = har level pe alag click (double-check)."
          value={autoApproveSelf}
          onChange={toggleAutoApproveSelf}
        />
      </div>

      {categories.map(cat => {
        const catApprovals = approvals.filter(a => a.cat === cat);
        return (
          <SectionCard key={cat} title={cat.charAt(0) + cat.slice(1).toLowerCase() + " Approvals"}
            desc={`${catApprovals.filter(a => a.enabled).length} of ${catApprovals.length} workflows active`}
            action={<>{saveMsg&&<span style={{fontSize:12,color:saveTone==="ok"?T.green:saveTone==="warn"?T.amber:T.red,marginRight:8,maxWidth:260,textAlign:"right",lineHeight:1.4}}>{saveMsg}</span>}<SaveBtn onClick={saveAll} label={saving?"Saving...":"Save Changes"}/></>}>

            {catApprovals.map((a, ai) => (
              <div key={a.id} style={{ borderBottom: ai < catApprovals.length - 1 ? `1px solid ${T.borderLight}` : "none", padding: "14px 0" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: a.enabled ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: a.enabled ? catColors[cat] + "18" : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IcLayers size={17} color={a.enabled ? catColors[cat] : T.textLight} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{a.module}</div>
                      <div style={{ fontSize: 11.5, color: T.textLight }}>{a.levels.length} level{a.levels.length > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => openEdit(a)}
                      style={{ padding: "5px 12px", borderRadius: 6, border: `1.5px solid ${T.border}`, background: "white", fontSize: 12, fontWeight: 600, color: T.textMid, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                      <IcEdit size={13} color={T.textMid} /> Edit
                    </button>
                    <Toggle value={a.enabled} onChange={() => toggleApproval(a.id)} />
                  </div>
                </div>

                {a.enabled && (
                  <div style={{ marginLeft: 48, display: "flex", flexDirection: "column" }}>
                    {a.levels.map((l, li) => (
                      <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", paddingLeft: 24, paddingBottom: li < a.levels.length - 1 ? 10 : 0 }}>
                        {li < a.levels.length - 1 && <div style={{ position: "absolute", left: 10, top: 10, bottom: -2, width: 2, background: T.border }} />}
                        <div style={{ position: "absolute", left: 4, top: 4, width: 14, height: 14, borderRadius: "50%", background: T.card, border: `2.5px solid ${catColors[cat]}`, zIndex: 1 }} />
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, background: T.borderLight }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.textMid }}>L{li + 1}:</span>
                          <span style={{ fontSize: 12, color: T.text, flex: 1 }}>
                            {(l.roles||[l.role]).filter(Boolean).map(r => roleLabel(r)).join(" / ")}
                            {(l.roles||[]).length > 1 && <span style={{ fontSize: 10, color: T.amber, marginLeft: 4, fontWeight: 600 }}>(any)</span>}
                          </span>
                          <Badge text={l.limit === 0 ? "Always approves" : l.limit ? `Up to Rs.${l.limit >= 100000 ? (l.limit / 100000).toFixed(0) + "L" : (l.limit / 1000).toFixed(0) + "K"}` : "Unlimited"} color={l.limit === 0 ? T.purple : l.limit ? T.amber : T.green} bg={l.limit === 0 ? T.purpleSoft : l.limit ? T.amberSoft : T.greenSoft} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </SectionCard>
        );
      })}

      {/* Escalation Rules */}
      <SectionCard title="Escalation Rules" desc="Auto-escalate if approval pending beyond time limit">
        <div style={{ paddingTop: 8 }}>
          <ToggleRow icon={<IcBell size={17} color={T.blue} />} label="Auto-Escalation" desc="Escalate to next level if not approved within the set hours" value={true} onChange={() => {}} />
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
            <FormSelect label="Escalation After" value="24" onChange={() => {}} options={[{ value: "12", label: "12 hours" }, { value: "24", label: "24 hours" }, { value: "48", label: "48 hours" }, { value: "72", label: "72 hours" }]} half />
            <FormSelect label="Notify Via" value="all" onChange={() => {}} options={[{ value: "email", label: "Email only" }, { value: "push", label: "Push only" }, { value: "whatsapp", label: "WhatsApp only" }, { value: "all", label: "Email + Push + WhatsApp" }]} half />
          </div>
        </div>
      </SectionCard>

      {/* ── Edit Approval Levels Modal ── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}
        title={`Edit Approval — ${editItem?.module || ""}`}
        desc="Add, remove, or modify approval levels and their limits" width={560}>

        {editLevels.map((l, i) => {
          const lvRoles = l.roles || [];
          const isParallel = lvRoles.length > 1;
          const unusedRoles = ROLE_OPTIONS.filter(o => !lvRoles.includes(o.value));
          return (
            <div key={i} style={{ marginBottom: 14, padding: "14px", borderRadius: 10, background: T.borderLight, border: `1.5px solid ${isParallel ? T.amber : T.border}` }}>
              {/* Level header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: T.blue, background: T.blueSoft, padding: "2px 8px", borderRadius: 20 }}>L{i + 1}</span>
                  {isParallel && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: T.amber, background: "#FFF8E1", padding: "2px 8px", borderRadius: 20, border: "1px solid #FFD54F" }}>
                      ⚡ Koi bhi approve kar sakta hai
                    </span>
                  )}
                </div>
                <button onClick={() => removeLevel(i)} disabled={editLevels.length <= 1}
                  style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: editLevels.length <= 1 ? T.borderLight : T.redSoft, cursor: editLevels.length <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <IcTrash size={13} color={editLevels.length <= 1 ? T.textLight : T.red} />
                  <span style={{ fontSize: 11, color: editLevels.length <= 1 ? T.textLight : T.red }}>Remove level</span>
                </button>
              </div>

              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                {/* Role chips + add-role selector */}
                <div style={{ flex: 2, minWidth: 200 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>
                    Approver Role(s) {isParallel && <span style={{ color: T.amber, fontWeight: 700 }}>— Parallel (OR)</span>}
                  </label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {lvRoles.map((r, ri) => (
                      <span key={ri} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: T.blueSoft, border: "1.5px solid "+(T.blueMid||T.blue), fontSize: 12.5, fontWeight: 600, color: T.blue }}>
                        {roleLabel(r)}
                        {lvRoles.length > 1 && (
                          <button onClick={() => removeRoleFromLevel(i, ri)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                        )}
                      </span>
                    ))}
                    {/* Add-role dropdown (shows only roles not already in this level) */}
                    {unusedRoles.length > 0 && (
                      <select value="" onChange={e => { if(e.target.value) addRoleToLevel(i, e.target.value); e.target.value=""; }}
                        style={{ padding: "4px 8px", borderRadius: 20, border: "1.5px dashed "+T.border, fontSize: 12, color: T.textMid, background: "white", cursor: "pointer", fontFamily: "inherit" }}>
                        <option value="">+ Role add karo</option>
                        {unusedRoles.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </div>
                  {isParallel && (
                    <div style={{ fontSize: 11, color: T.amber, marginTop: 5 }}>
                      ℹ️ In me se koi bhi ek approve kare to kafi hai
                    </div>
                  )}
                </div>

                {/* Amount limit */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>Amount Limit (Rs.)</label>
                  <input type="number" min="0" value={l.limit ?? ""} onChange={e => updateLevel(i, "limit", e.target.value === "" ? null : parseInt(e.target.value))} placeholder="No limit"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "white", outline: "none", boxSizing: "border-box", fontFamily: T.font }}
                    onFocus={e => e.target.style.borderColor = T.blue}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                  <div style={{ fontSize: 10.5, color: T.textLight, marginTop: 4, lineHeight: 1.4 }}>
                    <b>0</b> = always approves (mandatory — forces dual) · <b>blank</b> = unlimited (top of chain)
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button onClick={addLevel}
          style={{ width: "100%", padding: "10px", borderRadius: 8, border: `2px dashed ${T.border}`, background: "transparent", fontSize: 13, fontWeight: 600, color: T.textLight, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          <IcPlus size={16} color={T.textLight} /> Add Approval Level
        </button>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowEditModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveEdit} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>Save Levels</button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BACK DATE CONTROL (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function BackDateControl() {
  const [settings, setSettings] = useState({
    globalRestrict: true, lockAfterApproval: true, requireReason: true, adminOverride: true, monthEndLock: true, lockDay: 5,
    modules: { expenses: { restrict: true, days: 7 }, materialIssue: { restrict: true, days: 3 }, attendance: { restrict: true, days: 2 }, purchaseOrder: { restrict: false, days: 15 }, invoice: { restrict: true, days: 7 }, cashbook: { restrict: true, days: 5 } }
  });
  const upd = (k, v) => setSettings(p => ({ ...p, [k]: v }));
  const updMod = (mod, k, v) => setSettings(p => ({ ...p, modules: { ...p.modules, [mod]: { ...p.modules[mod], [k]: v } } }));
  const moduleLabels = { expenses: "Expense Entry", materialIssue: "Material Issue / Transfer", attendance: "Attendance Marking", purchaseOrder: "Purchase Orders", invoice: "Invoice / Challan", cashbook: "Cash Book Entry" };

  return (
    <div>
      <SectionCard title="Global Back-Date Controls" desc="Prevent users from entering data for past dates beyond allowed window" action={<SaveBtn />}>
        <ToggleRow icon={<IcCalendar size={17} color={T.blue} />} label="Restrict Back-Date Entry" desc="Limit how far back users can enter transactions" value={settings.globalRestrict} onChange={v => upd("globalRestrict", v)} />
        <ToggleRow icon={<IcLock size={17} color={T.blue} />} label="Lock After Approval" desc="Approved transactions cannot have date modified" value={settings.lockAfterApproval} onChange={v => upd("lockAfterApproval", v)} />
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Require Reason for Back-Dated Entry" desc="Force reason when entering back-dated transactions" value={settings.requireReason} onChange={v => upd("requireReason", v)} />
        <ToggleRow icon={<IcShield size={17} color={T.blue} />} label="Admin Override" desc="Allow Admin to bypass restrictions" value={settings.adminOverride} onChange={v => upd("adminOverride", v)} />
      </SectionCard>
      <SectionCard title="Module-wise Back-Date Limits" desc="Different back-date windows for each module">
        <div style={{ marginTop: 8 }}>
          {Object.entries(settings.modules).map(([key, mod], i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < Object.keys(settings.modules).length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{moduleLabels[key]}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select value={mod.days} onChange={e => updMod(key, "days", parseInt(e.target.value))} disabled={!mod.restrict}
                  style={{ padding: "6px 10px", borderRadius: 6, border: `1.5px solid ${T.border}`, fontSize: 12.5, color: T.text, background: "white", cursor: "pointer", fontFamily: T.font, opacity: mod.restrict ? 1 : 0.4 }}>
                  {[1,2,3,5,7,10,15,30].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
                <Toggle value={mod.restrict} onChange={v => updMod(key, "restrict", v)} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Month-End Lock" desc="Auto-lock entries after month-end closing period">
        <ToggleRow icon={<IcLock size={17} color={T.blue} />} label="Auto-Lock Previous Month" desc={`Lock all entries after the ${settings.lockDay}th of current month`} value={settings.monthEndLock} onChange={v => upd("monthEndLock", v)} />
        {settings.monthEndLock && (
          <div style={{ marginTop: 8, marginLeft: 50 }}>
            <FormSelect label="Lock entries after day" value={String(settings.lockDay)} onChange={v => upd("lockDay", parseInt(v))} options={[{ value: "3", label: "3rd of next month" }, { value: "5", label: "5th of next month" }, { value: "7", label: "7th of next month" }, { value: "10", label: "10th of next month" }]} half />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// BANK DETAILS — Persisted via /finance/accounts. Each account is
// debited/credited by Payment Made / Payment Received transactions.
// ═══════════════════════════════════════════════════════════════════════
const BANK_SUBTYPES = ["Current", "Savings", "Escrow", "OD (Overdraft)", "CC (Cash Credit)"];
// Map from DB row → form shape
const rowToForm = (a) => ({
  id: a.id,
  bankName: a.bank_name || (String(a.type||"").toLowerCase() === "cash" ? a.name : ""),
  category: (a.type || "").toLowerCase() === "cash" ? "Cash" : "Bank",
  // Sub-type lives in either `sub_type` (post-migration) or legacy `type` field
  type: BANK_SUBTYPES.includes(a.sub_type) ? a.sub_type
      : BANK_SUBTYPES.includes(a.type) ? a.type
      : "Current",
  accNo: a.account_number || "",
  accHolder: a.account_holder || "",
  ifsc: a.ifsc || "",
  branch: a.branch || "",
  upi: a.upi_id || "",
  swiftCode: a.swift_code || "",
  isPrimary: !!a.is_primary,
  openingBalance: parseFloat(a.opening_balance) || 0,
  currentBalance: parseFloat(a.current_balance) || 0,
  label: a.name || "",
});

function BankDetails() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editBank, setEditBank] = useState(null);
  const emptyBank = { bankName: "", category: "Bank", type: "Current", accNo: "", accHolder: "", ifsc: "", branch: "", isPrimary: false, upi: "", swiftCode: "", openingBalance: 0 };
  const [bankForm, setBankForm] = useState(emptyBank);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/finance/accounts");
      if (r?.success && Array.isArray(r.data)) setBanks(r.data.map(rowToForm));
    } catch (e) { setErr(e?.message || "Failed to load accounts"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditBank(null); setBankForm(emptyBank); setErr(""); setShowModal(true); };
  const openEdit = (b) => { setEditBank(b); setBankForm({ ...b }); setErr(""); setShowModal(true); };

  const saveBank = async () => {
    const isCash = bankForm.category === "Cash";
    if (!isCash && !bankForm.bankName.trim()) { setErr("Bank name is required"); return; }
    if (!isCash && !bankForm.accNo.trim())    { setErr("Account number is required"); return; }
    setSaving(true); setErr("");
    const labelName = isCash
      ? (bankForm.bankName.trim() || "Cash on Hand")
      : `${bankForm.bankName.trim()} · ${bankForm.type}`;
    const payload = {
      name: labelName,
      type: isCash ? "Cash" : "Bank",          // top-level enum bucket
      sub_type: isCash ? null : bankForm.type, // Current/Savings/...
      bank_name: isCash ? null : bankForm.bankName.trim(),
      account_number: bankForm.accNo.trim() || null,
      ifsc: bankForm.ifsc.trim() || null,
      account_holder: bankForm.accHolder.trim() || null,
      branch: bankForm.branch.trim() || null,
      upi_id: bankForm.upi.trim() || null,
      swift_code: bankForm.swiftCode.trim() || null,
      is_primary: !!bankForm.isPrimary,
      opening_balance: parseFloat(bankForm.openingBalance) || 0,
    };
    try {
      const res = editBank
        ? await api.put("/finance/accounts/" + editBank.id, payload)
        : await api.post("/finance/accounts", payload);
      if (res?.success === false) {
        setErr(res.message || "Save failed");
        setSaving(false);
        return;
      }
      setShowModal(false);
      await load();
    } catch (e) { setErr(e?.message || "Network error"); }
    setSaving(false);
  };

  const deleteBank = async (id) => {
    if (!await window.confirmAsync("Remove this account? Transactions already posted to it stay intact.")) return;
    try {
      const res = await api.del("/finance/accounts/" + id);
      if (res?.success === false) { window.alert(res.message || "Delete failed"); return; }
      await load();
    } catch (e) { window.alert(e?.message || "Network error"); }
  };
  const updF = (k, v) => setBankForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <SectionCard title="Bank Accounts" desc="Manage company bank accounts for payments and receipts"
        action={
          <button onClick={openCreate} style={{ padding: "8px 16px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IcPlus size={15} color="white" /> Add Bank Account
          </button>
        }>
        {banks.map((b, i) => (
          <div key={b.id} style={{ padding: "16px", borderRadius: 10, border: `1.5px solid ${b.isPrimary ? T.blue + "33" : T.border}`, background: b.isPrimary ? T.blueSoft + "66" : T.card, marginTop: i > 0 ? 12 : 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: b.isPrimary ? T.blue : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IcBank size={19} color={b.isPrimary ? "white" : T.textMid} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{b.label}</div>
                  <div style={{ fontSize: 12, color: T.textLight, marginTop: 1 }}>{b.branch}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {b.isPrimary && <Badge text="Primary" color={T.blue} bg={T.blueSoft} />}
                <Badge text={b.type} color={T.textMid} bg={T.borderLight} />
                <button onClick={() => openEdit(b)} style={{ background: T.borderLight, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                  <IcEdit size={14} color={T.textMid} />
                </button>
                {!b.isPrimary && (
                  <button onClick={() => deleteBank(b.id)} style={{ background: T.redSoft, border: "none", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                    <IcTrash size={14} color={T.red} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[{ label: "Account Holder", value: b.accHolder }, { label: "Account No.", value: b.accNo }, { label: "IFSC Code", value: b.ifsc }, { label: "UPI ID", value: b.upi || "—" }].map((f, fi) => (
                <div key={fi}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: T.textLight, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: f.label !== "Account Holder" ? "monospace" : T.font }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Payment Methods" desc="Configure accepted payment methods">
        <div style={{ paddingTop: 8 }}>
          <ToggleRow icon={<IcBank size={17} color={T.blue} />} label="Bank Transfer (NEFT/RTGS/IMPS)" desc="Accept direct bank transfers" value={true} onChange={() => {}} />
          <ToggleRow icon={<IcGlobe size={17} color={T.blue} />} label="UPI Payments" desc="Accept UPI-based payments" value={true} onChange={() => {}} />
          <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="Cheque Payments" desc="Accept cheque with clearance tracking" value={true} onChange={() => {}} />
          <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="Cash Payments" desc="Accept cash with mandatory receipt generation" value={false} onChange={() => {}} />
        </div>
      </SectionCard>

      {/* ── Edit / Create Bank Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editBank ? "Edit Account" : "Add Account"} desc="Bank or Cash account — used for Payment Made / Received" width={580}>
        {/* Category — Bank vs Cash */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMid, marginBottom: 7, textTransform: "uppercase", letterSpacing: ".4px" }}>Account Category</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Bank", "Cash"].map(c => (
              <button key={c} type="button" onClick={() => updF("category", c)}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${bankForm.category === c ? T.blue : T.border}`,
                  background: bankForm.category === c ? T.blueSoft : "white", color: bankForm.category === c ? T.blue : T.textMid,
                  fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{c}</button>
            ))}
          </div>
        </div>
        {bankForm.category === "Bank" ? (<>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <FormField label="Bank Name" value={bankForm.bankName} onChange={v => updF("bankName", v)} placeholder="e.g. HDFC Bank" half />
            <FormSelect label="Account Type" value={bankForm.type} onChange={v => updF("type", v)} options={BANK_SUBTYPES} half />
          </div>
          <FormField label="Account Holder Name" value={bankForm.accHolder} onChange={v => updF("accHolder", v)} placeholder="As per bank records" />
          <div style={{ height: 14 }} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <FormField label="Account Number" value={bankForm.accNo} onChange={v => updF("accNo", v)} placeholder="Account number" half />
            <FormField label="IFSC Code" value={bankForm.ifsc} onChange={v => updF("ifsc", v)} placeholder="e.g. HDFC0001234" half />
          </div>
          <FormField label="Branch" value={bankForm.branch} onChange={v => updF("branch", v)} placeholder="Branch name and city" />
          <div style={{ height: 14 }} />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <FormField label="UPI ID (optional)" value={bankForm.upi} onChange={v => updF("upi", v)} placeholder="e.g. company@upi" half />
            <FormField label="SWIFT Code (optional)" value={bankForm.swiftCode} onChange={v => updF("swiftCode", v)} placeholder="For international" half />
          </div>
        </>) : (<>
          <FormField label="Cash Account Label" value={bankForm.bankName} onChange={v => updF("bankName", v)} placeholder="e.g. Petty Cash, Site Cash" />
          <div style={{ height: 14 }} />
        </>)}
        <FormField label="Opening Balance (₹)" value={bankForm.openingBalance} onChange={v => updF("openingBalance", v)} placeholder="0" />
        <div style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={bankForm.isPrimary} onChange={v => updF("isPrimary", v)} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Set as Primary Account</div>
            <div style={{ fontSize: 11.5, color: T.textLight }}>Used as default for payments and receipts</div>
          </div>
        </div>
        {err && <div style={{ padding: "8px 12px", background: T.redSoft, border: `1px solid ${T.red}33`, borderRadius: 7, color: T.red, fontSize: 12.5, fontWeight: 500, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={() => setShowModal(false)} disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${T.border}`, background: "white", fontSize: 13, fontWeight: 600, color: T.textMid, cursor: "pointer" }}>Cancel</button>
          <button onClick={saveBank} disabled={saving} style={{ padding: "10px 24px", borderRadius: 8, background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : editBank ? "Update Account" : "Add Account"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MATERIAL SETTINGS (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function MaterialSettings() {
  const [m, setM] = useState({ restrictUsage: true, restrictSubcontractor: true, restrictTransfer: true, restrictProduction: false, mrRestriction: false, poRestriction: false, lowStockAlert: true, lowStockThreshold: 10, requireGRN: true, trackBatches: true, wasteTracking: true, wasteThreshold: 5 });
  const upd = (k, v) => setM(p => ({ ...p, [k]: v }));
  return (
    <div>
      <SectionCard title="Negative Stock Restrictions" desc="Prevent using materials beyond available stock" action={<SaveBtn />}>
        <ToggleRow icon={<IcBox size={17} color={T.blue} />} label="Restrict Material Usage" desc="Cannot issue materials exceeding current stock" value={m.restrictUsage} onChange={v => upd("restrictUsage", v)} />
        <ToggleRow icon={<IcUsers size={17} color={T.blue} />} label="Restrict Subcontractor Material Issue" desc="Cannot issue to subcontractors beyond stock" value={m.restrictSubcontractor} onChange={v => upd("restrictSubcontractor", v)} />
        <ToggleRow icon={<IcLayers size={17} color={T.blue} />} label="Restrict Material Transfer" desc="Cannot transfer between sites if stock insufficient" value={m.restrictTransfer} onChange={v => upd("restrictTransfer", v)} />
        <ToggleRow icon={<IcTool size={17} color={T.blue} />} label="Restrict Production Material" desc="Cannot use in production beyond stock" value={m.restrictProduction} onChange={v => upd("restrictProduction", v)} />
      </SectionCard>
      <SectionCard title="Request & PO Restrictions" desc="Prevent exceeding estimated quantities">
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Material Request Restriction" desc="Cannot request more than BOQ estimated quantity" value={m.mrRestriction} onChange={v => upd("mrRestriction", v)} />
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Material PO Restriction" desc="Cannot create PO exceeding approved request quantity" value={m.poRestriction} onChange={v => upd("poRestriction", v)} />
      </SectionCard>
      <SectionCard title="Inventory Alerts & Tracking" desc="Smart stock management features">
        <ToggleRow icon={<IcBell size={17} color={T.blue} />} label="Low Stock Alerts" desc="Get notified when material stock falls below threshold" value={m.lowStockAlert} onChange={v => upd("lowStockAlert", v)} />
        {m.lowStockAlert && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Alert threshold" value={String(m.lowStockThreshold)} onChange={v => upd("lowStockThreshold", parseInt(v))} options={[{value:"5",label:"5%"},{value:"10",label:"10%"},{value:"15",label:"15%"},{value:"20",label:"20%"}]} half /></div>}
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Require GRN" desc="Mandatory GRN before stock update" value={m.requireGRN} onChange={v => upd("requireGRN", v)} />
        <ToggleRow icon={<IcHash size={17} color={T.blue} />} label="Batch/Lot Tracking" desc="Track materials by batch numbers" value={m.trackBatches} onChange={v => upd("trackBatches", v)} />
      </SectionCard>
      <SectionCard title="Waste Tracking" desc="Monitor material wastage against estimates">
        <ToggleRow icon={<IcTrash size={17} color={T.blue} />} label="Enable Waste Tracking" desc="Track and categorize material wastage" value={m.wasteTracking} onChange={v => upd("wasteTracking", v)} />
        {m.wasteTracking && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Flag when waste exceeds" value={String(m.wasteThreshold)} onChange={v => upd("wasteThreshold", parseInt(v))} options={[{value:"3",label:"3%"},{value:"5",label:"5%"},{value:"8",label:"8%"},{value:"10",label:"10%"}]} half /></div>}
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FINANCE SETTINGS (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function FinanceSettings() {
  const [f, setF] = useState({ gstEnabled: true, gstRate: "18", tdsEnabled: true, tdsRate: "2", autoInvoiceNum: true, invoicePrefix: "GB-INV", retentionEnabled: true, retentionPct: "5", advanceTracking: true, budgetWarning: true, budgetThreshold: 90, cashLimit: 10000 });
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Duplicate Payment Detection — real, company-level setting.
  const [dupEnabled, setDupEnabled] = useState(true);
  const [dupDays, setDupDays] = useState(4);
  const [dupSaving, setDupSaving] = useState(false);
  const [dupTick, setDupTick] = useState(false);
  // Negative-balance policy — OFF (default) hard-blocks any payment that
  // would push the source account below 0. ON lets it through with a
  // soft confirm on the frontend. Wallets are exempt (own overdraft).
  const [negEnabled, setNegEnabled] = useState(false);
  const [negSaving, setNegSaving] = useState(false);
  const [negTick, setNegTick] = useState(false);
  // Customer invoice over-billing policy (PS-17) — sibling of negEnabled.
  // OFF (default) = qty inputs hard-clamped to remaining qty per milestone.
  // ON = over-bill allowed; UI shows red warning chip but lets admin proceed.
  const [overbillEnabled, setOverbillEnabled] = useState(false);
  const [overbillSaving, setOverbillSaving] = useState(false);
  const [overbillTick, setOverbillTick] = useState(false);
  useEffect(() => {
    api.get("/settings/company").then(r => {
      if (r?.success && r.data) {
        setDupEnabled(r.data.dup_payment_check_enabled !== 0);
        setDupDays(parseInt(r.data.dup_payment_window_days) || 4);
        setNegEnabled(r.data.allow_negative_balance === 1);
        setOverbillEnabled(r.data.allow_overbill === 1);
      }
    }).catch(() => {});
  }, []);
  const saveDup = async () => {
    setDupSaving(true);
    try {
      await api.put("/settings/company", {
        dup_payment_check_enabled: dupEnabled,
        dup_payment_window_days: parseInt(dupDays) || 4,
      });
      setDupTick(true);
      setTimeout(() => setDupTick(false), 1800);
    } catch (e) { window.alert(e?.message || "Save failed"); }
    setDupSaving(false);
  };
  const saveNeg = async () => {
    setNegSaving(true);
    try {
      await api.put("/settings/company", { allow_negative_balance: negEnabled });
      setNegTick(true);
      setTimeout(() => setNegTick(false), 1800);
    } catch (e) { window.alert(e?.message || "Save failed"); }
    setNegSaving(false);
  };
  const saveOverbill = async () => {
    setOverbillSaving(true);
    try {
      await api.put("/settings/company", { allow_overbill: overbillEnabled });
      setOverbillTick(true);
      setTimeout(() => setOverbillTick(false), 1800);
    } catch (e) { window.alert(e?.message || "Save failed"); }
    setOverbillSaving(false);
  };

  return (
    <div>
      <SectionCard title="Duplicate Payment Detection"
        desc="Same vendor + same amount within the chosen window pe save karne se pehle confirm prompt aata hai. Genuine duplicate entries roakta hai."
        action={
          <button onClick={saveDup} disabled={dupSaving}
            style={{ padding: "8px 18px", borderRadius: 8, background: dupTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: dupSaving ? "wait" : "pointer", opacity: dupSaving ? 0.7 : 1 }}>
            {dupTick ? "✓ Saved" : dupSaving ? "Saving..." : "Save"}
          </button>
        }>
        <ToggleRow icon={<IcShield size={17} color={T.blue} />}
          label="Enable duplicate detection on payment entries"
          desc="On save, agar same vendor ko same amount ka payment hal hi me record hua hai to system warning dega"
          value={dupEnabled} onChange={setDupEnabled} />
        <div style={{ paddingTop: 6 }}>
          <FormField label="Look-back window (days, ± from entry date)"
            value={dupDays}
            onChange={v => setDupDays(v.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 4" />
          <div style={{ fontSize: 11, color: T.textLight, marginTop: 6 }}>
            Default: 4 days. Set 0 to effectively disable (or use the toggle above).
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Tax Configuration" desc="GST, TDS settings" action={<SaveBtn />}>
        <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="GST Enabled" desc="Apply GST on invoices and POs" value={f.gstEnabled} onChange={v => upd("gstEnabled", v)} />
        {f.gstEnabled && <div style={{ marginLeft: 50, marginBottom: 12, display: "flex", gap: 16 }}><FormSelect label="Default GST Rate" value={f.gstRate} onChange={v => upd("gstRate", v)} options={[{value:"5",label:"5%"},{value:"12",label:"12%"},{value:"18",label:"18%"},{value:"28",label:"28%"}]} half /></div>}
        <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="TDS Deduction" desc="Auto-calculate TDS on payments" value={f.tdsEnabled} onChange={v => upd("tdsEnabled", v)} />
        {f.tdsEnabled && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Default TDS Rate" value={f.tdsRate} onChange={v => upd("tdsRate", v)} options={[{value:"1",label:"1% (194C - Ind)"},{value:"2",label:"2% (194C - Others)"},{value:"10",label:"10% (194J - Prof)"}]} half /></div>}
      </SectionCard>
      <SectionCard title="Invoice & Billing" desc="Auto-numbering and billing preferences">
        <ToggleRow icon={<IcHash size={17} color={T.blue} />} label="Auto Invoice Numbering" desc="System-generated sequential numbers" value={f.autoInvoiceNum} onChange={v => upd("autoInvoiceNum", v)} />
        {f.autoInvoiceNum && <div style={{ marginLeft: 50, marginBottom: 12 }}><FormField label="Invoice Prefix" value={f.invoicePrefix} onChange={v => upd("invoicePrefix", v)} half /><div style={{ fontSize: 11, color: T.textLight, marginTop: 4 }}>Preview: {f.invoicePrefix}-2026-0001</div></div>}
        <ToggleRow icon={<IcDollar size={17} color={T.blue} />} label="Retention Money Tracking" desc="Auto-hold retention from running bills" value={f.retentionEnabled} onChange={v => upd("retentionEnabled", v)} />
        {f.retentionEnabled && <div style={{ marginLeft: 50, marginBottom: 8 }}><FormSelect label="Retention %" value={f.retentionPct} onChange={v => upd("retentionPct", v)} options={[{value:"3",label:"3%"},{value:"5",label:"5%"},{value:"10",label:"10%"}]} half /></div>}
      </SectionCard>
      <SectionCard title="Negative Balance Policy"
        desc="Bank / cash account negative jaane par kya ho. Default OFF — hard block (recommended). ON karne par soft warning aati hai aur admin override karke aage badh sakta hai. Wallets ka apna alag overdraft rule hai — yeh setting unko affect nahi karti."
        action={
          <button onClick={saveNeg} disabled={negSaving}
            style={{ padding: "8px 18px", borderRadius: 8, background: negTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: negSaving ? "wait" : "pointer", opacity: negSaving ? 0.7 : 1 }}>
            {negTick ? "✓ Saved" : negSaving ? "Saving..." : "Save"}
          </button>
        }>
        <ToggleRow icon={<IcShield size={17} color={T.blue} />}
          label={"Allow negative balance on accounts" + (negEnabled ? " — ON (soft warning)" : " — OFF (hard block)")}
          desc={negEnabled
            ? "Account ka balance negative ja sakta hai. Frontend confirm prompt dikhayega, admin OK karke aage badh sakta hai."
            : "Insufficient balance par payment block ho jayega. Real bank pe paisa nahi hai to entry record nahi hogi."}
          value={negEnabled} onChange={setNegEnabled} />
      </SectionCard>
      <SectionCard title="Customer Invoice — Over-billing Policy"
        desc="Jab admin manual invoice banaye via + Invoice flow, kya wo planned qty se zyada bill kar sakta hai? Default OFF — hard clamp (recommended, RA-bill discipline). ON karne par red warning ke saath allow ho jaata hai for reconciliation / claim cases."
        action={
          <button onClick={saveOverbill} disabled={overbillSaving}
            style={{ padding: "8px 18px", borderRadius: 8, background: overbillTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: overbillSaving ? "wait" : "pointer", opacity: overbillSaving ? 0.7 : 1 }}>
            {overbillTick ? "✓ Saved" : overbillSaving ? "Saving..." : "Save"}
          </button>
        }>
        <ToggleRow icon={<IcDollar size={17} color={T.blue} />}
          label={"Allow over-billing on customer invoices" + (overbillEnabled ? " — ON (red flag, allowed)" : " — OFF (hard clamp)")}
          desc={overbillEnabled
            ? "Qty input remaining se zyada accept karta hai with a red warning chip. Use case: scope-creep claims, reconciliation entries."
            : "Qty input remaining qty pe clamp ho jata hai. Over-bill block. Strict RA-bill semantics."}
          value={overbillEnabled} onChange={setOverbillEnabled} />
      </SectionCard>
      <SectionCard title="Budget & Controls" desc="Financial safeguards">
        <ToggleRow icon={<IcBell size={17} color={T.blue} />} label="Budget Overrun Warning" desc="Alert when spending approaches budget" value={f.budgetWarning} onChange={v => upd("budgetWarning", v)} />
        {f.budgetWarning && <div style={{ marginLeft: 50, marginBottom: 12 }}><FormSelect label="Warn at" value={String(f.budgetThreshold)} onChange={v => upd("budgetThreshold", parseInt(v))} options={[{value:"80",label:"80%"},{value:"85",label:"85%"},{value:"90",label:"90%"},{value:"95",label:"95%"}]} half /></div>}
        <ToggleRow icon={<IcCheck size={17} color={T.blue} />} label="Advance Payment Tracking" desc="Track advances to suppliers/contractors" value={f.advanceTracking} onChange={v => upd("advanceTracking", v)} />
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — With WhatsApp for DPR + all events
// ═══════════════════════════════════════════════════════════════════════
function NotificationSettings() {
  const [catalog, setCatalog] = useState([]);
  const [prefs, setPrefs] = useState({});       // notif_type -> bool
  const [expanded, setExpanded] = useState({}); // module key -> bool
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  // Catalog + this user's current on/off settings come in one call.
  useEffect(() => {
    api.get("/notifications/preferences")
      .then(r => {
        if (r && r.success) {
          setCatalog(r.catalog || []);
          setPrefs(r.preferences || {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setType = (type, val) => setPrefs(p => ({ ...p, [type]: val }));
  const setModule = (mod, val) => setPrefs(p => {
    const next = { ...p };
    (mod.events || []).forEach(e => { next[e.type] = val; });
    return next;
  });
  const toggleExpand = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put("/notifications/preferences", { preferences: prefs });
      if (r && r.success) { setSavedTick(true); setTimeout(() => setSavedTick(false), 2000); }
    } catch (_) {}
    setSaving(false);
  };

  if (loading) {
    return (
      <SectionCard title="Notification Preferences" desc="Loading your notification settings...">
        <div style={{ padding: 24, textAlign: "center", color: T.textLight, fontSize: 13 }}>Loading...</div>
      </SectionCard>
    );
  }

  const totalOn = Object.values(prefs).filter(Boolean).length;
  const totalAll = Object.keys(prefs).length;

  return (
    <div>
      <SectionCard
        title="Notification Preferences"
        desc="Choose which notifications you receive. Turn off anything you don't need — these settings apply to your account only."
        action={
          <button onClick={save} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 8, background: savedTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {savedTick ? "✓ Saved" : saving ? "Saving..." : "Save"}
          </button>
        }>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0 2px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: T.blueSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <IcBell size={18} color={T.blue} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.text }}>{totalOn} of {totalAll} notification types are on</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 1 }}>Expand a module below to fine-tune individual events.</div>
          </div>
        </div>
      </SectionCard>

      {catalog.map(mod => {
        const evs = mod.events || [];
        const onCount = evs.filter(e => prefs[e.type] !== false).length;
        const allOn = evs.length > 0 && onCount === evs.length;
        const isOpen = !!expanded[mod.module];
        return (
          <div key={mod.module} style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, boxShadow: T.shadow, marginBottom: 14 }}>
            {/* module header — master toggle + expand */}
            <div onClick={() => toggleExpand(mod.module)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", cursor: "pointer", borderBottom: isOpen ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "flex" }}>
                <IcChevR size={15} color={T.textLight} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{mod.label}</div>
                <div style={{ fontSize: 11.5, color: onCount ? T.textMid : T.textLight, marginTop: 1 }}>{onCount} of {evs.length} on</div>
              </div>
              <div onClick={e => e.stopPropagation()} style={{ display: "flex" }}>
                <Toggle value={allOn} onChange={v => setModule(mod, v)} />
              </div>
            </div>
            {/* per-event toggles */}
            {isOpen && (
              <div style={{ padding: "2px 20px 8px" }}>
                {evs.map((ev, i) => (
                  <div key={ev.type}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < evs.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{ev.label}</div>
                      {ev.desc && <div style={{ fontSize: 11.5, color: T.textLight, marginTop: 1 }}>{ev.desc}</div>}
                    </div>
                    <Toggle value={prefs[ev.type] !== false} onChange={v => setType(ev.type, v)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NUMBER SEQUENCES (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function NumberSequences() {
  const sequences = [
    { module: "Purchase Order", prefix: "GB-PO", year: true, digits: 4, next: "GB-PO-2026-0047", reset: "Yearly" },
    { module: "Material Request", prefix: "GB-MR", year: true, digits: 4, next: "GB-MR-2026-0112", reset: "Yearly" },
    { module: "Invoice", prefix: "GB-INV", year: true, digits: 4, next: "GB-INV-2026-0023", reset: "Yearly" },
    { module: "RFQ", prefix: "GB-RFQ", year: false, digits: 5, next: "GB-RFQ-00089", reset: "Never" },
    { module: "Expense Voucher", prefix: "GB-EXP", year: true, digits: 4, next: "GB-EXP-2026-0201", reset: "Yearly" },
    { module: "Challan", prefix: "GB-CH", year: true, digits: 4, next: "GB-CH-2026-0034", reset: "Yearly" },
    { module: "Payment Receipt", prefix: "GB-REC", year: true, digits: 4, next: "GB-REC-2026-0015", reset: "Yearly" },
  ];
  return (
    <SectionCard title="Auto Number Sequences" desc="Configure automatic numbering for all transaction types" action={<SaveBtn />}>
      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>
            {["Module","Prefix","Year","Digits","Reset","Next"].map(h => <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: 11, fontWeight: 700, color: T.textLight, borderBottom: `2px solid ${T.border}`, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>)}
            <th style={{ width: 40, borderBottom: `2px solid ${T.border}` }} />
          </tr></thead>
          <tbody>{sequences.map((s, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
              <td style={{ padding: "12px", fontWeight: 600, color: T.text }}>{s.module}</td>
              <td style={{ padding: "12px" }}><code style={{ fontSize: 12, background: T.borderLight, padding: "3px 8px", borderRadius: 4, color: T.blue, fontWeight: 600 }}>{s.prefix}</code></td>
              <td style={{ padding: "12px", textAlign: "center" }}>{s.year ? <IcCheck size={16} color={T.green} /> : <span style={{ color: T.textLight }}>—</span>}</td>
              <td style={{ padding: "12px", color: T.textMid }}>{s.digits}</td>
              <td style={{ padding: "12px" }}><Badge text={s.reset} color={s.reset === "Yearly" ? T.blue : T.textMid} bg={s.reset === "Yearly" ? T.blueSoft : T.borderLight} /></td>
              <td style={{ padding: "12px" }}><code style={{ fontSize: 12.5, fontWeight: 600, color: T.green, fontFamily: "monospace" }}>{s.next}</code></td>
              <td style={{ padding: "12px" }}><button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><IcEdit size={14} color={T.textLight} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// AUDIT SETTINGS (unchanged)
// ═══════════════════════════════════════════════════════════════════════
function AuditSettings() {
  return (
    <div>
      <SectionCard title="Audit Trail Configuration" desc="Track who did what and when" action={<SaveBtn />}>
        <ToggleRow icon={<IcClipboard size={17} color={T.blue} />} label="Enable Audit Logging" desc="Record all create, update, delete actions" value={true} onChange={() => {}} />
        <ToggleRow icon={<IcLock size={17} color={T.blue} />} label="Log Login/Logout Events" desc="Track sessions, IP, device info" value={true} onChange={() => {}} />
        <ToggleRow icon={<IcEdit size={17} color={T.blue} />} label="Track Field-Level Changes" desc="Record old→new value for every field" value={true} onChange={() => {}} />
        <ToggleRow icon={<IcTrash size={17} color={T.blue} />} label="Soft Delete Only" desc="Never permanently delete; mark deleted" value={true} onChange={() => {}} />
      </SectionCard>
      <SectionCard title="Data Retention" desc="How long to keep audit logs">
        <div style={{ paddingTop: 8 }}><FormSelect label="Retain Audit Logs For" value="365" onChange={() => {}} options={[{value:"90",label:"90 days"},{value:"180",label:"6 months"},{value:"365",label:"1 year"},{value:"730",label:"2 years"},{value:"0",label:"Forever"}]} half /></div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// FEATURE REQUESTS (Phase 3 — customer side)
// ═══════════════════════════════════════════════════════════════════════
function FeatureRequests() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:"", description:"", module:"", priority:"medium" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    api("/saas-admin/my-feature-requests").then(res => {
      if (res.success) setRows(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim()) { setToast({ msg:"Title required", ok:false }); return; }
    setSaving(true);
    const res = await api("/saas-admin/my-feature-requests", { method:"POST", body: form });
    setSaving(false);
    if (res.success) {
      setShowForm(false);
      setForm({ title:"", description:"", module:"", priority:"medium" });
      load();
      setToast({ msg:"Feature request submitted! We'll review it soon.", ok:true });
    } else {
      setToast({ msg: res.message || "Failed to submit", ok:false });
    }
  };

  const statusLabel = {
    new:"New", under_review:"Under Review", planned:"Planned",
    in_development:"In Development", shipped:"Shipped ✓", rejected:"Rejected"
  };
  const statusColor = {
    new:"#64748B", under_review:"#7C3AED", planned:"#0891B2",
    in_development:"#2563EB", shipped:"#059669", rejected:"#DC2626"
  };
  const priorityColor = { critical:"#DC2626", high:"#D97706", medium:"#2563EB", low:"#64748B" };

  return (
    <div>
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:600, padding:"12px 18px", borderRadius:10,
          background: toast.ok ? "#ECFDF5" : "#FEF2F2", border:`1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}`,
          color: toast.ok ? "#059669" : "#DC2626", fontSize:12, fontWeight:600, boxShadow:"0 8px 24px rgba(0,0,0,0.08)" }}
          onClick={() => setToast(null)}>
          {toast.msg}
        </div>
      )}

      <SectionCard
        title="Request a Feature"
        desc="Tell us what you'd like to see in Construction Manager. We review every request."
        action={
          <button onClick={() => setShowForm(true)}
            style={{ padding:"8px 14px", background: T.blue, color:"white", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:"inherit" }}>
            <IcPlus size={14} color="white"/> New Request
          </button>
        }
      >
        {loading && <div style={{ padding:30, textAlign:"center", color:T.textLight, fontSize:12 }}>Loading your requests...</div>}
        {!loading && rows.length === 0 && (
          <div style={{ padding:"40px 20px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:8 }}>💡</div>
            <div style={{ fontSize:14, fontWeight:600, color:T.text, marginBottom:4 }}>No requests yet</div>
            <div style={{ fontSize:12, color:T.textLight }}>Click "New Request" to submit your first feature idea.</div>
          </div>
        )}
        {!loading && rows.map(r => (
          <div key={r.id} style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:3 }}>{r.title}</div>
              {r.description && <div style={{ fontSize:11.5, color:T.textMid, marginBottom:6, whiteSpace:"pre-wrap" }}>{r.description}</div>}
              <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:10, color:T.textLight, flexWrap:"wrap" }}>
                <span>By {r.user_name}</span>
                <span>·</span>
                <span>{new Date(r.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</span>
                {r.module && <><span>·</span><span style={{ textTransform:"capitalize" }}>{r.module}</span></>}
              </div>
              {r.admin_notes && (
                <div style={{ marginTop:8, padding:"8px 10px", background:"#F0F9FF", border:"1px solid #BAE6FD", borderRadius:6, fontSize:11, color:"#075985" }}>
                  <strong>Admin reply:</strong> {r.admin_notes}
                </div>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5, alignItems:"flex-end", flexShrink:0 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:10, background: statusColor[r.status]+"18", color: statusColor[r.status] }}>
                {statusLabel[r.status]}
              </span>
              <span style={{ fontSize:9, fontWeight:600, padding:"2px 7px", borderRadius:8, background: priorityColor[r.priority]+"15", color: priorityColor[r.priority], textTransform:"uppercase" }}>
                {r.priority}
              </span>
            </div>
          </div>
        ))}
      </SectionCard>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Feature Request" desc="Describe what you'd like us to build" width={560}>
        <div style={{ display:"flex", flexDirection:"column", gap:14, padding:"4px 0" }}>
          <FormField label="Title *" value={form.title} onChange={v => setForm(p=>({...p, title:v}))} placeholder="e.g. Bulk import materials from Excel"/>
          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.textMid, marginBottom:6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(p=>({...p, description:e.target.value}))}
              placeholder="Explain the use case, the problem it solves, and any ideas for how it should work..."
              style={{ width:"100%", minHeight:110, padding:"10px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:12.5, color:T.text, background:T.card, outline:"none", fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <FormSelect label="Module" value={form.module} onChange={v => setForm(p=>({...p, module:v}))}
              options={[
                { value:"", label:"— Any / General —" },
                { value:"projects", label:"Projects" },
                { value:"finance", label:"Finance" },
                { value:"procurement", label:"Procurement" },
                { value:"warehouse", label:"Warehouse" },
                { value:"payroll", label:"Payroll" },
                { value:"crm", label:"CRM" },
                { value:"reports", label:"Reports" },
                { value:"mom", label:"Meetings/MOM" },
                { value:"settings", label:"Settings" },
              ]}/>
            <FormSelect label="Priority" value={form.priority} onChange={v => setForm(p=>({...p, priority:v}))}
              options={[
                { value:"low", label:"Low — nice to have" },
                { value:"medium", label:"Medium — would help" },
                { value:"high", label:"High — important" },
                { value:"critical", label:"Critical — blocker" },
              ]}/>
          </div>
          <div style={{ display:"flex", gap:10, marginTop:6 }}>
            <button onClick={() => setShowForm(false)}
              style={{ flex:1, padding:"10px", background:T.card, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12.5, fontWeight:600, color:T.textMid, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              style={{ flex:2, padding:"10px", background:T.blue, border:"none", borderRadius:8, fontSize:12.5, fontWeight:700, color:"white", cursor: saving ? "not-allowed" : "pointer", fontFamily:"inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ATTENDANCE SETTINGS
// ═══════════════════════════════════════════════════════════════════════
const ATT_KEY = "gb_att_settings";
const ATT_DEFAULT = {
  company: { mode: "name", paymentCycle: "monthly" },
  subcon:  { mode: "count" },
  vendor:  { mode: "count", trackPayment: true },
};

function AttendanceSettings() {
  const [s, setS] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(ATT_KEY)||"{}");
      return { company:{...ATT_DEFAULT.company,...(saved.company||{})}, subcon:{...ATT_DEFAULT.subcon,...(saved.subcon||{})}, vendor:{...ATT_DEFAULT.vendor,...(saved.vendor||{})} };
    } catch { return { ...ATT_DEFAULT }; }
  });
  const [saved, setSaved] = useState(false);

  const updC = (k,v) => setS(p=>({...p,company:{...p.company,[k]:v}}));
  const updS = (k,v) => setS(p=>({...p,subcon:{...p.subcon,[k]:v}}));
  const updV = (k,v) => setS(p=>({...p,vendor:{...p.vendor,[k]:v}}));

  const saveSettings = () => {
    localStorage.setItem(ATT_KEY, JSON.stringify(s));
    api.post("/settings/attendance", s).catch(()=>{});
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  };

  const ModeToggle = ({ value, onChange }) => (
    <div style={{display:"flex",gap:6}}>
      {[{v:"name",l:"👤 Name-wise"},{v:"count",l:"🔢 Count"}].map(opt=>(
        <button key={opt.v} onClick={()=>onChange(opt.v)}
          style={{padding:"9px 18px",borderRadius:8,border:`1.5px solid ${value===opt.v?T.blue:T.border}`,background:value===opt.v?T.blueSoft:"white",color:value===opt.v?T.blue:T.textMid,fontSize:13,fontWeight:value===opt.v?700:400,cursor:"pointer",fontFamily:T.font}}>
          {opt.l}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Company Labour */}
      <SectionCard title="Company Labour" desc="Workers directly employed and paid by the company">
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:8}}>Attendance Mode</div>
          <ModeToggle value={s.company.mode} onChange={v=>updC("mode",v)} />
          <div style={{fontSize:11,color:T.textLight,marginTop:6}}>
            {s.company.mode==="name" ? "Mark P / A / H for each registered worker with hours and overtime" : "Enter total count per skill type each day"}
          </div>
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:8}}>Payment Cycle</div>
          <div style={{display:"flex",gap:6}}>
            {[{v:"weekly",l:"Weekly"},{v:"15day",l:"15-Day"},{v:"monthly",l:"Monthly"}].map(opt=>(
              <button key={opt.v} onClick={()=>updC("paymentCycle",opt.v)}
                style={{padding:"9px 18px",borderRadius:8,border:`1.5px solid ${s.company.paymentCycle===opt.v?T.blue:T.border}`,background:s.company.paymentCycle===opt.v?T.blueSoft:"white",color:s.company.paymentCycle===opt.v?T.blue:T.textMid,fontSize:13,fontWeight:s.company.paymentCycle===opt.v?700:400,cursor:"pointer",fontFamily:T.font}}>
                {opt.l}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:T.textLight,marginTop:6}}>
            Payment summary will group by {s.company.paymentCycle==="weekly"?"week (Mon–Sun)":s.company.paymentCycle==="15day"?"fortnight (1–15 & 16–month-end)":"calendar month"}
          </div>
        </div>
      </SectionCard>

      {/* Subcon Labour */}
      <SectionCard title="Subcontractor Labour" desc="Workers deployed by subcontractors — no direct payment by company">
        <div>
          <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:8}}>Attendance Mode</div>
          <ModeToggle value={s.subcon.mode} onChange={v=>updS("mode",v)} />
          <div style={{fontSize:11,color:T.textLight,marginTop:6}}>
            {s.subcon.mode==="name" ? "Register workers under each subcontractor, mark P / A / H daily" : "Enter total headcount by skill type per subcontractor"}
          </div>
        </div>
        <div style={{marginTop:14,padding:"10px 14px",borderRadius:8,background:"#FFF7ED",border:"1px solid #FED7AA",fontSize:12,color:"#92400E"}}>
          💡 No payment tracking for subcon labour — subcontractor handles worker wages.
        </div>
      </SectionCard>

      {/* Labour Vendor */}
      <SectionCard title="Labour Vendor" desc="Workers supplied by a vendor — company pays vendor directly">
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:8}}>Attendance Mode</div>
          <ModeToggle value={s.vendor.mode} onChange={v=>updV("mode",v)} />
          <div style={{fontSize:11,color:T.textLight,marginTop:6}}>
            {s.vendor.mode==="name" ? "Register workers under vendor, mark attendance — rate auto-calculates payment" : "Enter count per skill × agreed rate = daily payment due to vendor"}
          </div>
        </div>
        <ToggleRow icon={<IcDollar size={17} color={T.blue}/>} label="Track Vendor Payment" desc="Record payment due and mark as paid after releasing amount" value={s.vendor.trackPayment} onChange={v=>updV("trackPayment",v)} />
      </SectionCard>

      <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:12,marginTop:4}}>
        {saved&&<span style={{fontSize:12,color:T.green,fontWeight:600}}>✓ Settings saved</span>}
        <button onClick={saveSettings}
          style={{padding:"11px 32px",borderRadius:8,background:T.blue,color:"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer",fontFamily:T.font}}>
          Save Attendance Settings
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// UI PREFERENCES (Appearance)
// ═══════════════════════════════════════════════════════════════════════
const LAYOUT_KEY = "gb_project_layout";
const LAYOUT_DEFAULT = "horizontal";

function UIPreferences() {
  const [layout, setLayout] = useState(() => {
    try { return localStorage.getItem(LAYOUT_KEY) || LAYOUT_DEFAULT; }
    catch { return LAYOUT_DEFAULT; }
  });
  const [savedFlag, setSavedFlag] = useState(false);

  const apply = (v) => {
    setLayout(v);
    try { localStorage.setItem(LAYOUT_KEY, v); } catch {}
    window.dispatchEvent(new CustomEvent("gb-layout-change", { detail: v }));
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1500);
  };

  const TopPreview = () => (
    <svg width="100%" height="84" viewBox="0 0 200 84" preserveAspectRatio="none">
      <rect x="0" y="0" width="200" height="84" fill="#FFFFFF"/>
      <rect x="0" y="0" width="200" height="22" fill="#1E293B"/>
      <rect x="6" y="7" width="40" height="3" rx="1" fill="#FFFFFF"/>
      <rect x="6" y="13" width="60" height="2" rx="1" fill="#FFFFFF" opacity="0.4"/>
      <rect x="0" y="22" width="200" height="14" fill="#F8F9FB"/>
      <rect x="6" y="27" width="20" height="4" rx="1" fill="#2563EB"/>
      <rect x="30" y="27" width="20" height="4" rx="1" fill="#9CA3AF"/>
      <rect x="54" y="27" width="20" height="4" rx="1" fill="#9CA3AF"/>
      <rect x="78" y="27" width="20" height="4" rx="1" fill="#9CA3AF"/>
      <rect x="102" y="27" width="20" height="4" rx="1" fill="#9CA3AF"/>
      <rect x="126" y="27" width="20" height="4" rx="1" fill="#9CA3AF"/>
      <rect x="150" y="27" width="20" height="4" rx="1" fill="#9CA3AF"/>
      <rect x="6" y="42" width="188" height="38" rx="2" fill="#F4F6F9"/>
    </svg>
  );

  const SidePreview = () => (
    <svg width="100%" height="84" viewBox="0 0 200 84" preserveAspectRatio="none">
      <rect x="0" y="0" width="200" height="84" fill="#FFFFFF"/>
      <rect x="0" y="0" width="56" height="84" fill="#1E293B"/>
      <rect x="6" y="6" width="44" height="4" rx="1" fill="#FFFFFF" opacity="0.85"/>
      <rect x="6" y="13" width="36" height="3" rx="1" fill="#FFFFFF" opacity="0.4"/>
      <rect x="3" y="22" width="50" height="6" rx="1" fill="#2563EB"/>
      <rect x="6" y="32" width="44" height="4" rx="1" fill="#FFFFFF" opacity="0.5"/>
      <rect x="6" y="40" width="44" height="4" rx="1" fill="#FFFFFF" opacity="0.5"/>
      <rect x="6" y="48" width="44" height="4" rx="1" fill="#FFFFFF" opacity="0.5"/>
      <rect x="6" y="56" width="44" height="4" rx="1" fill="#FFFFFF" opacity="0.5"/>
      <rect x="6" y="64" width="44" height="4" rx="1" fill="#FFFFFF" opacity="0.5"/>
      <rect x="62" y="6" width="132" height="14" rx="2" fill="#F8F9FB"/>
      <rect x="62" y="24" width="132" height="56" rx="2" fill="#F4F6F9"/>
    </svg>
  );

  const Option = ({ v, title, desc, preview }) => {
    const active = layout === v;
    return (
      <button onClick={() => apply(v)}
        style={{ flex: 1, textAlign: "left", padding: 0, border: `2px solid ${active ? T.blue : T.border}`, borderRadius: T.radius, background: T.card, cursor: "pointer", overflow: "hidden", transition: "all .15s", fontFamily: T.font, boxShadow: active ? `0 0 0 4px ${T.blue}15` : "none" }}>
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? T.blue : T.text }}>{title}</div>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${active ? T.blue : T.border}`, background: active ? T.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
          </div>
        </div>
        <div style={{ padding: 12, background: T.borderLight, lineHeight: 0 }}>{preview}</div>
        <div style={{ padding: "10px 14px 12px", fontSize: 11.5, color: T.textLight, lineHeight: 1.4 }}>{desc}</div>
      </button>
    );
  };

  return (
    <div>
      <SectionCard title="Project Page Layout" desc="Choose how project navigation tabs are displayed">
        <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
          <Option v="horizontal" title="Top Tabs" desc="Tabs appear horizontally at the top of the project page. Default for existing users." preview={<TopPreview />} />
          <Option v="sidebar" title="Side Bar" desc="Tabs appear in a collapsible left sidebar with icons. Cleaner for projects with many tabs." preview={<SidePreview />} />
        </div>
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: T.blueSoft, border: `1px solid ${T.blue}22`, fontSize: 12, color: T.textMid, display: "flex", alignItems: "center", gap: 8 }}>
          <span>💡</span>
          <span>Change applies immediately. Open any project to see the new layout. Keyboard shortcuts (Ctrl+key) work in both modes.</span>
        </div>
      </SectionCard>
      {savedFlag && <div style={{ fontSize: 12, color: T.green, fontWeight: 600, textAlign: "right", marginTop: -8 }}>✓ Saved</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN SETTINGS MODULE
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// WAREHOUSE SETTINGS — procurement mode, GRN photo policy, MR flow
// ═══════════════════════════════════════════════════════════════════════
function WarehouseSettings() {
  const [whProcMode, setWhProcMode] = useState("direct"); // direct | via_procurement
  const [grnPhotoReq, setGrnPhotoReq] = useState(false);
  const [mrFlow, setMrFlow] = useState("procurement_driven"); // procurement_driven | warehouse_driven
  const [holdTtl, setHoldTtl] = useState(2);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    api.get("/settings/company").then(r => {
      if (r?.success && r.data) {
        setWhProcMode(r.data.warehouse_procurement_mode || "direct");
        setGrnPhotoReq(r.data.grn_photo_required === 1 || r.data.grn_photo_required === true);
        setMrFlow(r.data.mr_fulfillment_mode || "procurement_driven");
        setHoldTtl(Number(r.data.mr_soft_hold_ttl_days) || 2);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings/company", {
        warehouse_procurement_mode: whProcMode,
        grn_photo_required: grnPhotoReq,
        mr_fulfillment_mode: mrFlow,
        mr_soft_hold_ttl_days: holdTtl,
      });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    } catch (e) { window.alert(e?.message || "Save failed"); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 30, fontSize: 13, color: T.textLight }}>Loading…</div>;

  return (
    <div>
      <SectionCard title="Warehouse Procurement Mode"
        desc="Warehouse MR admin se Approve hone ke baad order kaise place hoga — warehouse khud kare ya procurement team ke through."
        action={
          <button onClick={save} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 8, background: savedTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {savedTick ? "✓ Saved" : saving ? "Saving..." : "Save"}
          </button>
        }>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          {[
            { v: "direct",          label: "Direct — Warehouse khud orders place karta hai",
              sub: "Approved → Warehouse module me 'Place Order' button → Ordered → Receive (GRN) → stock update. Procurement team involve nahi hoti." },
            { v: "via_procurement", label: "Via Procurement Team",
              sub: "Approved → 'Send to Procurement' button → procurement queue me MR aata hai → procurement PO place karti hai → vendor delivery par procurement Mark Received karta hai → warehouse stock automatically update ho jaata hai." },
          ].map(opt => (
            <label key={opt.v} style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 9, border: `1.5px solid ${whProcMode===opt.v ? "#2563EB" : "#E5E7EB"}`, background: whProcMode===opt.v ? "#EFF6FF" : "white", cursor: "pointer", alignItems: "flex-start" }}>
              <input type="radio" checked={whProcMode===opt.v} onChange={() => setWhProcMode(opt.v)}
                style={{ marginTop: 3, accentColor: "#2563EB" }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: whProcMode===opt.v ? "#1D4ED8" : "#111827" }}>{opt.label}</div>
                <div style={{ fontSize: 11.5, color: "#6B7280", marginTop: 3, lineHeight: 1.5 }}>{opt.sub}</div>
              </div>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="GRN Photo Policy"
        desc="GRN (material receive) ke time challan / material / quality ki photo attach karna compulsory rakhna hai ya optional.">
        <ToggleRow icon={<IcBox size={17} color={T.blue} />}
          label="📷 Photo compulsory at GRN time"
          desc="ON: User ko kam se kam ek photo (challan ya material) attach karni hogi, warna Submit GRN block. OFF: Photo optional — attach kar sakte ho par enforcement nahi."
          value={grnPhotoReq} onChange={setGrnPhotoReq} />
      </SectionCard>

      <SectionCard title="MR Fulfillment Flow"
        desc="Project se aaye MRs ko warehouse se fulfill karne ka decision kaun lega — procurement team ya warehouse staff.">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          {[
            { v: "procurement_driven",
              label: "Procurement-driven — Procurement team decide karti hai (default)",
              sub: "Approved MR → Procurement deklhti hai warehouse stock available hai ya nahi → 'Issue from Warehouse' click karke wh_mr banata hai → warehouse issue karta hai. Net-available check + soft-hold TTL same stock ko double-allocate hone se rokte hain." },
            { v: "warehouse_driven",
              label: "Warehouse-driven — Warehouse staff decide karta hai (recommended for central godown setups)",
              sub: "Approved MR auto-route ho ke warehouse queue me aata hai → warehouse staff [Issue from Stock] OR [Pass to Procurement] decide karta hai. Single decision-maker = race conditions structurally impossible." },
          ].map(opt => (
            <label key={opt.v} style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 9, border: `1.5px solid ${mrFlow===opt.v ? "#2563EB" : "#E5E7EB"}`, background: mrFlow===opt.v ? "#EFF6FF" : "white", cursor: "pointer", alignItems: "flex-start" }}>
              <input type="radio" checked={mrFlow===opt.v} onChange={() => setMrFlow(opt.v)}
                style={{ marginTop: 3, accentColor: "#2563EB" }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: mrFlow===opt.v ? "#1D4ED8" : "#111827" }}>{opt.label}</div>
                <div style={{ fontSize: 11.5, color: "#6B7280", marginTop: 3, lineHeight: 1.5 }}>{opt.sub}</div>
              </div>
            </label>
          ))}
        </div>
        {mrFlow === "procurement_driven" && (
          <div style={{ marginTop: 12, padding: "10px 13px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 7 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Soft-Hold TTL (days)</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>Procurement ne warehouse pe stock reserve kiya — kitne din me warehouse use issue karna chahiye? TTL expire hone par reservation auto-release, stock wapas open ho jata hai.</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {[1, 2, 3, 5, 7].map(d => (
                <button key={d} onClick={() => setHoldTtl(d)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${holdTtl===d ? "#2563EB" : "#E2E8F0"}`, background: holdTtl===d ? "#EFF6FF" : "white", fontSize: 12, fontWeight: holdTtl===d ? 700 : 500, color: holdTtl===d ? "#1D4ED8" : "#6B7280", cursor: "pointer", fontFamily: "inherit" }}>
                  {d} day{d>1?"s":""}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, padding: "9px 12px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, fontSize: 11, color: "#92400E", lineHeight: 1.5 }}>
          <b>⚠ Note:</b> Mode flip karne par <b>in-flight MRs apne original mode me hi complete</b> honge (har MR pe creation-time mode snapshot hota hai). Naye MRs current mode follow karenge. Drastic break-changes nahi honge.
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// WALLET SETTINGS — staff-wallet photo policy (per category)
// ═══════════════════════════════════════════════════════════════════════
function WalletSettings() {
  const CATS = [
    { key: "site_exp",  label: "Site expense",  desc: "Site par hua kharch — receipt / material photo" },
    { key: "party_pay", label: "Party payment", desc: "Vendor / labour ko wallet se payment" },
    { key: "salary",    label: "Salary",        desc: "Staff salary wallet se" },
    { key: "petrol",    label: "Petrol",        desc: "Fuel / travel kharch" },
    { key: "transfer",  label: "Wallet transfer", desc: "Ek staff wallet se doosre wallet me" },
  ];
  const [policy, setPolicy] = useState({ site_exp: "required", party_pay: "required", salary: "optional", petrol: "optional", transfer: "optional" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  // ── Per-role × per-category auto-approve limits (mobile wallet) ──
  const LIMIT_ROLES = [
    { key: "site_supervisor", label: "Site Supervisor" },
    { key: "project_manager", label: "Project Manager" },
    { key: "accountant",      label: "Accountant" },
  ];
  const LIMIT_CATS = [
    { key: "site_exp",  label: "Site Exp" },
    { key: "party_pay", label: "Party Pay" },
    { key: "petrol",    label: "Petrol" },
    { key: "generic",   label: "Other" },
  ];
  const [limits, setLimits] = useState(null);
  const [limSaving, setLimSaving] = useState(false);
  const [limTick, setLimTick] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/wallets/photo-policy").then(r => { if (r?.success && r.data) setPolicy(p => ({ ...p, ...r.data })); }).catch(() => {}),
      api.get("/wallets/auto-limits").then(r => { if (r?.success && r.data?.limits) setLimits(r.data.limits); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const setLimit = (role, cat, val) => setLimits(p => ({ ...p, [role]: { ...(p?.[role] || {}), [cat]: val } }));
  const saveLimits = async () => {
    setLimSaving(true);
    try {
      await api.put("/wallets/auto-limits", { limits });
      setLimTick(true); setTimeout(() => setLimTick(false), 1800);
    } catch (e) { window.alert(e?.message || "Save failed"); }
    setLimSaving(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {};
      CATS.forEach(c => { body[c.key] = policy[c.key] === "required" ? "required" : "optional"; });
      await api.put("/wallets/photo-policy", body);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    } catch (e) { window.alert(e?.message || "Save failed"); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 30, fontSize: 13, color: T.textLight }}>Loading…</div>;

  return (
    <div>
      <SectionCard title="Photo required for approval"
        desc="Kis wallet category me approve karne se pehle photo zaroori hai. ON = photo upload hone tak admin approve nahi kar sakta."
        action={
          <button onClick={save} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 8, background: savedTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {savedTick ? "✓ Saved" : saving ? "Saving..." : "Save"}
          </button>
        }>
        {CATS.map(c => (
          <ToggleRow key={c.key} icon={<IcShield size={17} color={T.blue} />}
            label={c.label + (policy[c.key] === "required" ? " — Photo required" : " — Photo optional")}
            desc={c.desc}
            value={policy[c.key] === "required"}
            onChange={(v) => setPolicy(p => ({ ...p, [c.key]: v ? "required" : "optional" }))} />
        ))}
      </SectionCard>

      {/* ── Auto-approve limits matrix ── */}
      <SectionCard title="Wallet auto-approve limits"
        desc="Har role + category ke liye limit set karein. Is amount tak mobile wallet expense AUTO-approve ho jaata hai; usse zyada par approval queue me jaata hai. Khali chhodo = default."
        action={
          <button onClick={saveLimits} disabled={limSaving}
            style={{ padding: "8px 18px", borderRadius: 8, background: limTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: limSaving ? "wait" : "pointer", opacity: limSaving ? 0.7 : 1 }}>
            {limTick ? "✓ Saved" : limSaving ? "Saving..." : "Save Limits"}
          </button>
        }>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px", color: T.textLight, fontWeight: 600, borderBottom: `1px solid ${T.borderLight}` }}>Role</th>
                {LIMIT_CATS.map(c => (
                  <th key={c.key} style={{ textAlign: "right", padding: "8px 10px", color: T.textLight, fontWeight: 600, borderBottom: `1px solid ${T.borderLight}` }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIMIT_ROLES.map(r => (
                <tr key={r.key}>
                  <td style={{ padding: "8px 10px", fontWeight: 600, color: T.text, borderBottom: `1px solid ${T.borderLight}` }}>{r.label}</td>
                  {LIMIT_CATS.map(c => (
                    <td key={c.key} style={{ padding: "6px 10px", textAlign: "right", borderBottom: `1px solid ${T.borderLight}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
                        <span style={{ color: T.textLight, fontSize: 12 }}>₹</span>
                        <input type="number" min="0" value={(limits?.[r.key]?.[c.key]) ?? ""}
                          onChange={e => setLimit(r.key, c.key, e.target.value)}
                          style={{ width: 90, padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 13, textAlign: "right", fontFamily: "inherit" }} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: T.textLight, display: "flex", alignItems: "center", gap: 6 }}>
          <IcShield size={14} color={T.green} />
          Admin / Super Admin hamesha unlimited (sab auto-approve) — inhe set karne ki zaroorat nahi.
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MY PROFILE — self-service personal account (name / phone / designation
// + password). Email & role are read-only (admin-managed identity).
// ═══════════════════════════════════════════════════════════════════════
function MyProfile() {
  const [prof, setProf] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", designation: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    api.get("/auth/profile").then(r => {
      if (r.success) {
        const d = r.data;
        setProf(d);
        setForm({ name: d.name || "", phone: d.phone || "", designation: d.designation || "" });
      }
    }).catch(() => {});
  }, []);

  const ROLE_LABEL = { admin: "Admin", super_admin: "Super Admin", project_manager: "Project Manager", supervisor: "Site Supervisor", accountant: "Accountant", viewer: "Viewer" };

  const save = async () => {
    if (!form.name.trim()) { setMsg("Name required"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await api.put("/auth/profile", { name: form.name.trim(), phone: form.phone || null, designation: form.designation || null });
      if (r.success) {
        setMsg("✓ Profile updated");
        // keep the locally-cached user in sync so the sidebar reflects the new name
        try {
          const u = JSON.parse(localStorage.getItem("gb_user") || "{}");
          localStorage.setItem("gb_user", JSON.stringify({ ...u, name: form.name.trim(), phone: form.phone, designation: form.designation }));
          if (localStorage.getItem("gb_user_name") !== null) localStorage.setItem("gb_user_name", form.name.trim());
        } catch (e) { /* */ }
        setTimeout(() => setMsg(""), 2500);
      } else setMsg(r.message || "Update failed");
    } catch (e) { setMsg(e.message || "Network error"); }
    setBusy(false);
  };

  const changePw = async () => {
    if (!pw.current_password || !pw.new_password) { setPwMsg("Both fields required"); return; }
    if (pw.new_password.length < 6) { setPwMsg("New password min 6 characters"); return; }
    if (pw.new_password !== pw.confirm) { setPwMsg("New password and confirm don't match"); return; }
    setPwBusy(true); setPwMsg("");
    try {
      const r = await api.put("/auth/change-password", { current_password: pw.current_password, new_password: pw.new_password });
      if (r.success) { setPwMsg("✓ Password changed"); setPw({ current_password: "", new_password: "", confirm: "" }); setTimeout(() => setPwMsg(""), 2500); }
      else setPwMsg(r.message || "Change failed");
    } catch (e) { setPwMsg(e?.response?.data?.message || e.message || "Current password galat hai"); }
    setPwBusy(false);
  };

  if (!prof) return <div style={{ padding: "20px", color: T.textLight, fontSize: 13 }}>Loading profile…</div>;

  return (
    <div>
      <SectionCard title="My Profile" desc="Apni personal details aur password manage karein" action={<SaveBtn onClick={save} label={busy ? "Saving…" : "Save Changes"} />}>
        {/* avatar + identity strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white", flexShrink: 0 }}>{(prof.name || "U")[0].toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{prof.name}</div>
            <div style={{ fontSize: 12.5, color: T.textLight, marginTop: 2 }}>{prof.company_name || ""}</div>
            <div style={{ marginTop: 5 }}><Badge text={ROLE_LABEL[prof.role] || prof.role} /></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Your name" half />
          <FormField label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="Mobile number" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Designation" value={form.designation} onChange={v => setForm(f => ({ ...f, designation: v }))} placeholder="e.g. Project Manager" half />
          <FormField label="Email (login — admin managed)" value={prof.email || ""} onChange={() => {}} disabled half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="Role (admin managed)" value={ROLE_LABEL[prof.role] || prof.role || ""} onChange={() => {}} disabled half />
          <FormField label="Company (admin managed)" value={prof.company_name || ""} onChange={() => {}} disabled half />
        </div>
        {msg && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: msg.startsWith("✓") ? T.green : T.red }}>{msg}</div>}
      </SectionCard>

      <SectionCard title="Change Password" desc="Apna login password update karein" action={<SaveBtn onClick={changePw} label={pwBusy ? "Updating…" : "Update Password"} />}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
          <FormField label="Current Password" type="password" value={pw.current_password} onChange={v => setPw(p => ({ ...p, current_password: v }))} placeholder="••••••" half />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <FormField label="New Password" type="password" value={pw.new_password} onChange={v => setPw(p => ({ ...p, new_password: v }))} placeholder="Min 6 characters" half />
          <FormField label="Confirm New Password" type="password" value={pw.confirm} onChange={v => setPw(p => ({ ...p, confirm: v }))} placeholder="Re-type new password" half />
        </div>
        {pwMsg && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: pwMsg.startsWith("✓") ? T.green : T.red }}>{pwMsg}</div>}
      </SectionCard>
    </div>
  );
}

// ─── COMPANY PRACTICES ───────────────────────────────────────────────
// Ye company settings nahi hain — ye wo sawaal hain jinka jawab app me kahin
// set nahi hota, aur is liye Sahayak ab tak "apne admin se poochein" bolkar
// taal deta tha. Admin ek baar likh de, bot wahi jawab dene lagta hai.
// Sawaalon ki list backend (services/companyPractices.js) se aati hai, yahan
// hardcode NAHI hai — warna screen ka sawaal aur bot ka sawaal alag ho jaate.
function CompanyPractices() {
  const [fields, setFields] = useState([]);
  const [vals, setVals] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/settings/practices").then(r => {
      if (r?.success && Array.isArray(r.data)) {
        setFields(r.data);
        setVals(Object.fromEntries(r.data.map(f => [f.key, f.value || ""])));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filled = fields.filter(f => (vals[f.key] || "").trim()).length;

  const save = async () => {
    setSaving(true); setErr("");
    try {
      // Poora set bhejte hain, sirf badle hue nahi — backend khali value ko
      // "row hata do" maanta hai, to khali karna bhi save hona chahiye.
      const r = await api.put("/settings/practices", vals);
      if (r?.success === false) throw new Error(r.message || "Save failed");
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    } catch (e) { setErr(e?.message || "Save failed"); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 30, fontSize: 13, color: T.textLight }}>Loading…</div>;

  const groups = [];
  for (const f of fields) {
    const g = groups.find(x => x.name === f.group);
    if (g) g.items.push(f); else groups.push({ name: f.group, items: [f] });
  }

  const saveBtn = (
    <button onClick={save} disabled={saving}
      style={{ padding: "8px 18px", borderRadius: 8, background: savedTick ? T.green : `linear-gradient(135deg, ${T.blue}, ${T.blueMid})`, color: "white", fontSize: 13, fontWeight: 600, border: "none", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
      {savedTick ? "✓ Saved" : saving ? "Saving..." : "Save"}
    </button>
  );

  return (
    <div>
      <SectionCard
        title="Sahayak ke liye aapki practice"
        desc="Ye sawaal app ki setting se nahi nikalte — ye aapki company ka apna tareeka hai. Jo aap yahan likhenge, Sahayak (AI) wahi jawab staff ko dega. Khaali chhodna theek hai — us sawaal par bot pehle jaisa 'apne admin se poochein' hi kahega."
        action={saveBtn}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6 }}>
          <div style={{ flex: 1, height: 6, background: T.borderLight, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${fields.length ? Math.round((filled / fields.length) * 100) : 0}%`, height: "100%", background: T.blue, transition: "width 0.2s" }}/>
          </div>
          <div style={{ fontSize: 12, color: T.textMid, fontWeight: 600, whiteSpace: "nowrap" }}>{filled} / {fields.length} bhare</div>
        </div>
        {err && <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: T.red }}>{err}</div>}
      </SectionCard>

      {groups.map(g => (
        <SectionCard key={g.name} title={g.name}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 6 }}>
            {g.items.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: T.textMid, display: "block", marginBottom: 6 }}>{f.q}</label>
                {f.options ? (
                  <select value={vals[f.key] || ""} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ width: "100%", maxWidth: 420, padding: "10px 12px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", fontFamily: T.font, boxSizing: "border-box" }}>
                    <option value="">— chuna nahi —</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.long ? (
                  <textarea value={vals[f.key] || ""} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.hint || ""} rows={3} maxLength={300}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", fontFamily: T.font, boxSizing: "border-box", resize: "vertical" }}/>
                ) : (
                  <input value={vals[f.key] || ""} onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.hint || ""} maxLength={300}
                    style={{ width: "100%", maxWidth: 420, padding: "10px 12px", borderRadius: T.radiusSm, border: `1.5px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "white", outline: "none", fontFamily: T.font, boxSizing: "border-box" }}/>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>{saveBtn}</div>
    </div>
  );
}

const settingsSections = [
  { id: "profile",       label: "My Profile",           Icon: IcUsers,     Comp: MyProfile,              section: "ACCOUNT" },
  { id: "company",       label: "Company Profile",      Icon: IcBuilding,  Comp: CompanySettings,        section: "GENERAL" },
  { id: "roles",         label: "Roles & Access",       Icon: IcShield,    Comp: RolesAccess,            section: null },
  { id: "approval",      label: "Multi-Level Approval", Icon: IcLayers,    Comp: ApprovalSettings,       section: null },
  { id: "practices",     label: "Company Practices",    Icon: IcClipboard, Comp: CompanyPractices,       section: null },
  { id: "backdate",      label: "Back-Date Control",    Icon: IcCalendar,  Comp: BackDateControl,        section: null },
  { id: "attendance",    label: "Attendance Settings",  Icon: IcCalendar,  Comp: AttendanceSettings,     section: null },
  { id: "locations",     label: "Office & Warehouse",   Icon: IcBuilding,  Comp: LocationsSettings,      section: null },
  { id: "appearance",    label: "Appearance",           Icon: IcLayout,    Comp: UIPreferences,          section: "PERSONALIZATION" },
  { id: "bank",          label: "Bank Details",         Icon: IcBank,      Comp: BankDetails,            section: "FINANCE & MATERIAL" },
  { id: "material",      label: "Material Settings",    Icon: IcBox,       Comp: MaterialSettings,       section: null },
  { id: "finance",       label: "Finance Settings",     Icon: IcDollar,    Comp: FinanceSettings,        section: null },
  { id: "warehouse",     label: "Warehouse Settings",   Icon: IcBox,       Comp: WarehouseSettings,      section: null },
  { id: "wallet",        label: "Wallet Settings",      Icon: IcDollar,    Comp: WalletSettings,         section: null },
  { id: "notifications", label: "Notifications",        Icon: IcBell,      Comp: NotificationSettings,   section: "SYSTEM" },
  { id: "sequences",     label: "Number Sequences",     Icon: IcHash,      Comp: NumberSequences,        section: null },
  { id: "audit",         label: "Audit Trail",          Icon: IcClipboard, Comp: AuditSettings,          section: null },
  { id: "features",      label: "Feature Requests",     Icon: IcEdit,      Comp: FeatureRequests,        section: "FEEDBACK" },
];

export default function SettingsModule({ initialSection = "company" } = {}) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const ActiveComp = settingsSections.find(s => s.id === activeSection)?.Comp || CompanySettings;
  const activeLabel = settingsSections.find(s => s.id === activeSection)?.label || "Settings";
  const descMap = {
    profile: "Manage your personal account and password",
    company: "Manage your company profile and regional settings", roles: "Configure user roles, permissions and project access",
    approval: "Set up multi-level approval workflows", backdate: "Control back-dated entry permissions",
    practices: "Aapki company ka apna tareeka — Sahayak inhi jawabon se madad karta hai",
    attendance: "Configure attendance mode and payment cycle for each labour type",
    appearance: "Choose layout style and other visual preferences",
    bank: "Manage bank accounts and payment methods", material: "Configure material stock and inventory rules",
    finance: "Tax, invoicing, duplicate-payment guard and financial controls",
    warehouse: "Procurement mode, GRN photo policy and MR fulfillment flow",
    wallet: "Staff wallet photo policy + auto-approve limits",
    notifications: "Choose which in-app notifications you receive",
    sequences: "Configure auto-numbering for transactions", audit: "Audit trail and data retention settings",
    features: "Request new features and track their status",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.font, overflow: "hidden" }}>
      {/* Settings Sidebar */}
      <div style={{ width: 260, background: T.card, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: "-0.3px" }}>Settings</div>
          <div style={{ fontSize: 12, color: T.textLight, marginTop: 3 }}>Company Configuration</div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {settingsSections.map(item => {
            const isActive = activeSection === item.id;
            return (
              <div key={item.id}>
                {item.section && <div style={{ fontSize: 10, fontWeight: 700, color: T.textLight, letterSpacing: "1.2px", textTransform: "uppercase", padding: "16px 20px 6px" }}>{item.section}</div>}
                <button onClick={() => setActiveSection(item.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", border: "none", cursor: "pointer", background: isActive ? T.blueSoft : "transparent", borderRight: isActive ? `3px solid ${T.blue}` : "3px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.borderLight; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 30, height: 30, borderRadius: 7, background: isActive ? T.blue + "15" : T.borderLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <item.Icon size={16} color={isActive ? T.blue : T.textLight} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: isActive ? 650 : 450, color: isActive ? T.blue : T.textMid }}>{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.textLight }}>Construction Manager v2.1</div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 28px", background: T.card, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{activeLabel}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginTop: 2 }}>{descMap[activeSection]}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textLight }}>
            <span>Settings</span><IcChevR size={12} color={T.textLight} /><span style={{ color: T.blue, fontWeight: 600 }}>{activeLabel}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <ActiveComp />
        </div>
      </div>
    </div>
  );
}
