// ══════════════════════════════════════════════════════════════════════
// MACHINERY MODULE — fleet 360° over the equipment_master spine
//
// This module keeps no register of its own. equipment_master is the one
// register; everything here is what a machine ACCUMULATES: meter readings,
// papers, services, fuel. A parallel register is the mistake this codebase
// already made once with project_equipment.
//
// Owned machines get the full treatment. Rented ones deliberately get less —
// we do not track a hired machine's servicing (vendor's scope), but its papers
// still get an expiry watch, because an unfit machine on our site is our
// liability.
//
// Fuel here is READ-ONLY. Entry lives in the Fuel module; two doors to the same
// litres is how two ledgers stop agreeing.
//
// Self-contained (own theme/icons/helpers), same as WarehouseModule/FuelModule.
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api, { API_BASE, getToken } from "../config/api";
import { t, Rich } from "../i18n";

// ── ICONS ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcTruck  = (p) => <Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a2 2 0 100-4 2 2 0 000 4zM18.5 19a2 2 0 100-4 2 2 0 000 4z" />;
const IcBell   = (p) => <Ic {...p} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />;
const IcSpark  = (p) => <Ic {...p} d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" />;
const IcChart  = (p) => <Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />;
const IcDoc    = (p) => <Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6" />;
const IcGauge  = (p) => <Ic {...p} d="M12 20a8 8 0 100-16 8 8 0 000 16zM12 12l3.5-3.5M12 20v2M4 12H2M22 12h-2" />;
const IcDrop   = (p) => <Ic {...p} d="M12 2.7s6 6.3 6 10.3a6 6 0 01-12 0c0-4 6-10.3 6-10.3z" />;
const IcWrench = (p) => <Ic {...p} d="M14.7 6.3a4 4 0 01-5 5L4 17v3h3l5.7-5.7a4 4 0 015-5l2.6-2.6-3-3z" />;
const IcClock  = (p) => <Ic {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 7v5l3 2" />;
const IcAdd    = (p) => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX      = (p) => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcAlert  = (p) => <Ic {...p} d="M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" />;
const IcSignal = (p) => <Ic {...p} d="M5 12.55a11 11 0 0114.08 0M8.53 15.5a6 6 0 016.95 0M12 19h.01" />;

// ── THEME ─────────────────────────────────────────────────────────
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA1B0",
  b1: "#E4E6EE", b2: "#D1D5DB", sb: "#0D1B2A",
  ind: "#4B45C4", indL: "#EEEDFB", indM: "#C7D2FE",
  blu: "#2563AC", bluL: "#E7F0FA",
  grn: "#1E8E5A", grnL: "#E4F5EC",
  amb: "#B27A0A", ambL: "#FBF3DF",
  red: "#C43A45", redL: "#FBE9EA",
  slt: "#64748B", sltL: "#F1F5F9",
};

const fmtN = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const fmtC = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtD = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
};
const todayStr = () => new Date().toLocaleDateString("en-CA");

const DOC_TYPES = [
  { k: "insurance", get l() { return t("machinery.insurance"); } }, { k: "rc", l: "RC" },
  { k: "fitness", get l() { return t("machinery.fitness_certificate"); } }, { k: "puc", l: "PUC" },
  { k: "road_tax", get l() { return t("machinery.road_tax"); } }, { k: "permit", get l() { return t("machinery.permit"); } },
  { k: "other", get l() { return t("common.other"); } },
];
const docLabel = (k) => (DOC_TYPES.find((d) => d.k === k) || {}).l || k;

// Days-left decides the colour everywhere — one rule, so the fleet list and the
// detail page can never disagree about whether a paper is a problem.
const expiryTone = (days) => {
  if (days == null) return { c: T.t3, bg: T.sltL, label: "—" };
  if (days < 0) return { c: T.red, bg: T.redL, label: `${Math.abs(days)} din pehle khatam` };
  if (days === 0) return { c: T.red, bg: T.redL, label: t("machinery.aaj_khatam") };
  if (days <= 30) return { c: T.amb, bg: T.ambL, label: t("machinery.days_din", { days }) };
  return { c: T.grn, bg: T.grnL, label: t("machinery.valid") };
};

// Meter kitni purani hai — ek hi jumla teeno jagah (fleet list, header,
// meter form) taaki "0 din purani" jaisa ajeeb text kahin na dikhe.
const meterAge = (days) =>
  days == null ? "tareekh nahi" : days === 0 ? "aaj" : days === 1 ? "kal" : `${days} din purani`;

// Kiraye ka basis. 'km' tipper/trailer ke liye — ganit wahi (qty × rate) hai,
// sirf quantity ka naam badalta hai.
const MODES = [
  { k: "hourly", get l() { return t("machinery.per_hour"); }, unit: "₹/hr" },
  { k: "daily", get l() { return t("machinery.per_day"); }, unit: "₹/day" },
  { k: "monthly", get l() { return t("machinery.per_month"); }, unit: "₹/month" },
  { k: "km", get l() { return t("machinery.per_km"); }, unit: "₹/km" },
  { k: "trip", get l() { return t("machinery.per_trip"); }, unit: "₹/trip" },
  { k: "fixed", get l() { return t("machinery.fixed_lump"); }, unit: "₹ lump" },
];
const modeUnit = (k) => (MODES.find((m) => m.k === k) || MODES[0]).unit;

// Ek party ke kai role ho sakte hain: `roles` canonical comma list hai, `type`
// sirf primary. Dono padhe jaate hain taaki pehle se bane vendor kaam karte
// rahein, koi unhe dobara tag kare ya na kare.
const hasRole = (p, wanted) => {
  const bag = (String(p.roles || "") + "," + String(p.type || ""))
    .toLowerCase().split(",").map((s) => s.trim());
  return wanted.some((r) => bag.includes(r));
};
const HIRE_VENDOR_ROLES = ["equipment_vendor", "equipment", "machinery", "vendor", "supplier", "subcontractor"];

// Wahi Cloudinary preset jo baaki app use karta hai, par yahan module ke andar
// rakha gaya (WarehouseModule/FuelModule jaisa) — module apni dependency khud
// rakhta hai. /auto/ isliye ki insurance ki copy aksar PDF hoti hai; /image/
// par wo upload hi nahi hoti.
const uploadDoc = (file) => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/machinery");
  const xhr = new XMLHttpRequest();
  xhr.onload = () => {
    try {
      const d = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && d.secure_url) resolve(d.secure_url);
      else reject(new Error((d.error && d.error.message) || "Upload failed"));
    } catch (_) { reject(new Error("Upload ka jawab samajh nahi aaya")); }
  };
  xhr.onerror = () => reject(new Error("Network error — upload nahi hua"));
  xhr.open("POST", "https://api.cloudinary.com/v1_1/dd632nqfm/auto/upload");
  xhr.send(fd);
});

// ── SHARED BITS ───────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <div style={{ padding: "13px 15px", background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12, borderTop: `3px solid ${color}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={16} color={color} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.t1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{sub}</div>}
    </div>
  </div>
);

const Pill = ({ label, c, bg }) => (
  <span style={{ display: "inline-block", background: bg, color: c, fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>{label}</span>
);

const Btn = ({ children, onClick, c = T.ind, disabled, icon: Icon, size = "md", ghost, style = {} }) => (
  <button onClick={onClick} disabled={disabled} type="button"
    style={{
      padding: size === "sm" ? "5px 10px" : "8px 14px", borderRadius: size === "sm" ? 7 : 9,
      border: ghost ? `1.5px solid ${T.b1}` : "none",
      background: disabled ? T.b1 : ghost ? T.surface : c,
      color: disabled ? T.t4 : ghost ? T.t2 : "#fff",
      fontSize: size === "sm" ? 11 : 12, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...style,
    }}>{Icon && <Icon size={13} color="currentColor" />}{children}</button>
);

const Panel = ({ title, action, children, style }) => (
  <div style={{ background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12, overflow: "hidden", ...style }}>
    {(title || action) && (
      <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

const Row = ({ cols, children, head, onClick }) => (
  <div onClick={onClick}
    style={{
      display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center",
      padding: head ? "9px 14px" : "11px 14px",
      borderBottom: `1px solid ${T.b1}`,
      background: head ? T.surface : "transparent",
      fontSize: head ? 10.5 : 12.5,
      fontWeight: head ? 700 : 400,
      color: head ? T.t3 : T.t2,
      textTransform: head ? "uppercase" : "none",
      letterSpacing: head ? ".4px" : "normal",
      cursor: onClick ? "pointer" : "default",
    }}>{children}</div>
);

const Empty = ({ children }) => (
  <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 12.5, lineHeight: 1.6 }}>{children}</div>
);

const Notice = ({ children }) => (
  <div style={{ border: `1px solid ${T.indM}`, background: T.indL, borderRadius: 10, padding: "10px 13px", fontSize: 11.5, color: "#3B369E", lineHeight: 1.55, marginBottom: 14 }}>{children}</div>
);

const inp = {
  width: "100%", padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${T.b1}`,
  fontSize: 12.5, outline: "none", fontFamily: "inherit", color: T.t1,
  background: T.surface, boxSizing: "border-box",
};
const Field = ({ label, children, hint, span }) => (
  <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
    <div style={{ fontSize: 11, color: T.t3, marginBottom: 5, fontWeight: 600 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{hint}</div>}
  </div>
);

// Kaagaz ki copy. Upload turant hota hai aur URL state me aa jaata hai, isliye
// machine save karte waqt file pehle se chadhi hoti hai — background queue par
// bharosa karke save karne se aadhi machines bina copy ke reh jaati.
const FileField = ({ value, onChange, label = "Copy (photo / PDF)" }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError(t("machinery.file_10mb_se_badi_hai")); return; }
    setError(""); setBusy(true);
    try { onChange(await uploadDoc(f)); }
    catch (ex) { setError(ex.message || "Upload nahi hua"); }
    setBusy(false);
  };
  return (
    <Field label={label}>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href={value} target="_blank" rel="noreferrer"
            style={{ fontSize: 11.5, color: T.ind, fontWeight: 700, textDecoration: "none" }}>{t("machinery.chadhi_hui_copy_dekho")}</a>
          <button type="button" onClick={() => onChange(null)}
            style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>hatao</button>
        </div>
      ) : (
        <label style={{ ...inp, display: "flex", alignItems: "center", cursor: busy ? "wait" : "pointer", color: busy ? T.t4 : T.t3 }}>
          {busy ? t("machinery.chadh_rahi_hai") : t("machinery.file_chuno")}
          <input type="file" accept="image/*,.pdf" onChange={pick} disabled={busy} style={{ display: "none" }} />
        </label>
      )}
      {error && <div style={{ fontSize: 10.5, color: T.red, marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </Field>
  );
};

// Kitna record poora hai. Number akela bekaar hai — kami ka naam saath hona
// chahiye, warna user ko pata hi nahi chalta ki bhare kya.
const CompletenessBar = ({ c, compact }) => {
  if (!c) return <span style={{ fontSize: 11.5, color: T.t4 }}>—</span>;
  const col = c.pct >= 90 ? T.grn : c.pct >= 60 ? T.amb : T.red;
  return (
    <div title={c.missing.length ? "Baaki: " + c.missing.map((m) => m.label).join(", ") : t("machinery.poora_record")}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{ flex: 1, height: 6, background: T.sltL, borderRadius: 4, overflow: "hidden", minWidth: 52 }}>
          <div style={{ width: c.pct + "%", height: "100%", background: col, borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: col, minWidth: 30, textAlign: "right" }}>{c.pct}%</span>
      </div>
      {!compact && (
        <div style={{ fontSize: 10, color: T.t4, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {c.missing.length ? c.missing.slice(0, 2).map((m) => m.label).join(" · ") + (c.missing.length > 2 ? ` +${c.missing.length - 2}` : "") : t("machinery.poora")}
        </div>
      )}
    </div>
  );
};

// Party dropdown. Role ke hisaab se chhanti hai par "sab dikhao" ka raasta
// khula rehta hai — warna jis pump ko kisi ne tag nahi kiya wo list se gayab
// rehta hai aur user ko lagta hai party bani hi nahi.
const PartyPicker = ({ value, onChange, parties, roles, placeholder }) => {
  const [all, setAll] = useState(false);
  const list = all ? parties : parties.filter((p) => hasRole(p, roles));
  const selectedMissing = value && !list.some((p) => String(p.id) === String(value));
  const shown = selectedMissing ? [...list, ...parties.filter((p) => String(p.id) === String(value))] : list;
  return (
    <>
      <select value={value || ""} onChange={(e) => onChange(e.target.value || null)} style={inp}>
        <option value="">{placeholder || t("machinery.chuno")}</option>
        {shown.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <button type="button" onClick={() => setAll((v) => !v)}
        style={{ background: "none", border: "none", color: T.t3, fontSize: 10.5, cursor: "pointer", padding: "4px 0 0", fontFamily: "inherit" }}>
        {all ? `sirf sahi role wale (${parties.filter((p) => hasRole(p, roles)).length})` : `saari parties dikhao (${parties.length})`}
      </button>
    </>
  );
};

const Modal = ({ open, onClose, title, sub, width = 620, children, footer }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "94vw", maxHeight: "92vh", background: T.surface, borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1 }}>{title}</div>
            {sub && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} type="button" style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex" }}>
            <IcX size={15} color={T.t3} />
          </button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
};

// Meter is shown WITH where it came from and how old it is. A bare number
// invites trust that a three-week-old reading has not earned.
const MeterCell = ({ meter, unit }) => {
  if (!meter || (meter.hours == null && meter.km == null)) {
    return <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.reading_nahi")}</span>;
  }
  const val = unit === "km"
    ? (meter.km != null ? fmtN(meter.km) + " km" : fmtN(meter.hours) + " hrs")
    : (meter.hours != null ? fmtN(meter.hours) + " hrs" : fmtN(meter.km) + " km");
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: meter.is_stale ? T.amb : T.t1 }}>{val}</div>
      <div style={{ fontSize: 10, color: T.t4 }}>{t("machinery.source_se_meterage", { source: meter.source, meterAge: meterAge(meter.days_old) })}</div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════
// MACHINE MASTER FORM
//
// Machine yahin banti hai — Library me ab uska section nahi hai, taaki ek
// gaadi do jagah edit na ho.
//
// Naya banate waqt teen kaagaz (insurance / fitness / PUC) form ke andar hi
// bhare jaate hain. Alag se "pehle machine banao, phir document add karo" ka
// matlab hota hai ki zyadatar log doosra step kabhi karte hi nahi — aur expiry
// ki bell, jo is poore module ki jaan hai, kabhi bajti hi nahi.
// ══════════════════════════════════════════════════════════════════
const KEY_DOCS = [
  { k: "insurance", get l() { return t("machinery.insurance"); } },
  { k: "fitness", get l() { return t("machinery.fitness_certificate"); } },
  { k: "puc", l: "PUC" },
];

function MachineForm({ open, onClose, onSaved, machine, parties, seed }) {
  const editing = !!machine;
  const [f, setF] = useState({});
  const [docs, setDocs] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("id");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const updDoc = (t, k, v) => setDocs((p) => ({ ...p, [t]: { ...(p[t] || {}), [k]: v } }));

  useEffect(() => {
    if (!open) return;
    setError(""); setTab("id"); setDocs({});
    setF(machine ? {
      ...machine,
      // Masked key wapas bhejna asli key ko mita dega — isliye box khaali
      // shuru hota hai aur "set hai" alag se dikhaya jaata hai.
      telematics_api_key: "",
    } : {
      ownership: "owned", measurement_mode: "hourly", meter_unit: "hours",
      fuel_responsibility: "rent_included", opening_read_at: todayStr(),
      // GPS tab ke "Nayi machine banao" se aaya hua naam/gadi no. — sirf
      // pehle se bhara hua, aadmi badal sakta hai.
      ...(seed || {}),
    });
  }, [open, machine, seed]);

  const owned = String(f.ownership || "").toLowerCase() === "owned";
  const fuelOurs = owned || f.fuel_responsibility === "company";

  const save = async () => {
    setError("");
    if (!String(f.name || "").trim()) { setError(t("machinery.machine_ka_naam_zaroori_hai")); setTab("id"); return; }
    // Jis kaagaz ki koi bhi detail bhari hai par valid-till nahi, wo chup-chaap
    // girne se accha hai ki abhi rok diya jaye.
    const docList = [];
    for (const d of KEY_DOCS) {
      const v = docs[d.k];
      if (!v) continue;
      const touched = v.doc_no || v.valid_till || v.provider_name || v.photo_url || v.amount;
      if (!touched) continue;
      if (!v.valid_till) { setError(t("machinery.l_ki_valid_till_date_daalein", { l: d.l })); setTab("docs"); return; }
      docList.push({ doc_type: d.k, ...v, amount: v.amount ? parseFloat(v.amount) : null });
    }

    const body = {
      name: String(f.name).trim(), code: f.code || null,
      type: f.type || null, machine_type: f.machine_type || null, capacity: f.capacity || null,
      ownership: f.ownership || "rented", registration_no: f.registration_no || null,
      make: f.make || null, model: f.model || null, year: f.year || null,
      chassis_no: f.chassis_no || null, engine_no: f.engine_no || null,
      operator_name: f.operator_name || null,
      measurement_mode: f.measurement_mode || "hourly",
      default_rate: f.default_rate ? parseFloat(f.default_rate) : 0,
      meter_unit: f.meter_unit || "hours",
      fuel_responsibility: owned ? "company" : (f.fuel_responsibility || "rent_included"),
      fuel_per_hour: f.fuel_per_hour ? parseFloat(f.fuel_per_hour) : null,
      purchase_date: f.purchase_date || null,
      purchase_cost: f.purchase_cost ? parseFloat(f.purchase_cost) : null,
      telematics_enabled: f.telematics_enabled == null || f.telematics_enabled === "" ? null : Number(f.telematics_enabled),
      telematics_vendor_party_id: f.telematics_vendor_party_id || null,
      telematics_device_id: f.telematics_device_id || null,
      telematics_api_url: f.telematics_api_url || null,
    };
    if (f.telematics_api_key) body.telematics_api_key = f.telematics_api_key;
    if (!editing) {
      body.documents = docList;
      body.opening_hours = f.opening_hours || null;
      body.opening_km = f.opening_km || null;
      body.opening_read_at = f.opening_read_at || todayStr();
    }

    setBusy(true);
    try {
      const r = editing
        ? await api.put(`/machinery/fleet/${machine.id}`, body)
        : await api.post("/machinery/fleet", body);
      if (r && r.success) { onSaved(); onClose(); }
      else setError((r && r.message) || "Save failed");
    } catch (e) { setError((e && e.message) || "Network error"); }
    setBusy(false);
  };

  const TABS = [
    { id: "id", l: t("machinery.pehchaan") },
    { id: "rate", l: t("machinery.rate_fuel") },
    { id: "tele", l: t("machinery.telematics") },
    ...(editing ? [] : [{ id: "docs", l: t("machinery.kaagaz_meter") }]),
  ];

  return (
    <Modal open={open} onClose={onClose} width={720}
      title={editing ? t("machinery.machine_edit_karein") : t("machinery.nayi_machine")}
      sub={editing ? machine.name : t("machinery.register_wahi_ek_hai_library_me")}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn><Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : editing ? t("machinery.update") : t("machinery.machine_banao")}</Btn></>}>

      <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 16 }}>
        {TABS.map((x) => (
          <button key={x.id} type="button" onClick={() => setTab(x.id)}
            style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", marginBottom: "-1.5px", color: tab === x.id ? T.ind : T.t3, borderBottom: `2px solid ${tab === x.id ? T.ind : "transparent"}` }}>
            {x.l}
          </button>
        ))}
      </div>

      {tab === "id" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t("machinery.machine_ka_naam")} span={2}>
            <input value={f.name || ""} onChange={(e) => upd("name", e.target.value)} placeholder={t("machinery.e_g_jcb_3dx_backhoe_loader")} style={inp} />
          </Field>
          <Field label={t("machinery.gadi_no_registration")} hint={t("machinery.yahi_do_machine_ko_sach_me")}>
            <input value={f.registration_no || ""} onChange={(e) => upd("registration_no", e.target.value)} placeholder={t("machinery.mp09_ab_1234")} style={inp} />
          </Field>
          <Field label={t("common.code")}>
            <input value={f.code || ""} onChange={(e) => upd("code", e.target.value)} placeholder={t("machinery.eq_jcb_01")} style={inp} />
          </Field>
          <Field label={t("common.ownership")}>
            <select value={f.ownership || "owned"} onChange={(e) => upd("ownership", e.target.value)} style={inp}>
              <option value="owned">{t("machinery.apni_owned")}</option>
              <option value="rented">{t("machinery.kiraye_ki_rented")}</option>
            </select>
          </Field>
          <Field label={t("machinery.machine_type")}>
            <input value={f.machine_type || ""} onChange={(e) => upd("machine_type", e.target.value)} placeholder={t("machinery.excavator_tipper_roller")} style={inp} />
          </Field>
          <Field label={t("machinery.meter_kis_cheez_ka")}>
            <select value={f.meter_unit || "hours"} onChange={(e) => upd("meter_unit", e.target.value)} style={inp}>
              <option value="hours">{t("machinery.hour_meter_ghante")}</option>
              <option value="km">{t("machinery.odometer_km")}</option>
              <option value="both">{t("machinery.dono")}</option>
            </select>
          </Field>
          <Field label={t("machinery.operator")}>
            <input value={f.operator_name || ""} onChange={(e) => upd("operator_name", e.target.value)} style={inp} />
          </Field>
          <Field label={t("machinery.make")}><input value={f.make || ""} onChange={(e) => upd("make", e.target.value)} style={inp} /></Field>
          <Field label={t("machinery.model")}><input value={f.model || ""} onChange={(e) => upd("model", e.target.value)} style={inp} /></Field>
          <Field label={t("machinery.chassis_no")}><input value={f.chassis_no || ""} onChange={(e) => upd("chassis_no", e.target.value)} style={inp} /></Field>
          <Field label={t("machinery.engine_no")}><input value={f.engine_no || ""} onChange={(e) => upd("engine_no", e.target.value)} style={inp} /></Field>
          {owned && (
            <>
              <Field label={t("machinery.purchase_date")}>
                <input type="date" value={f.purchase_date ? String(f.purchase_date).slice(0, 10) : ""} onChange={(e) => upd("purchase_date", e.target.value)} style={inp} />
              </Field>
              <Field label={t("machinery.purchase_cost")}>
                <input value={f.purchase_cost || ""} inputMode="decimal" onChange={(e) => upd("purchase_cost", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
              </Field>
            </>
          )}
        </div>
      )}

      {tab === "rate" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t("machinery.rate_type")}>
            <select value={f.measurement_mode || "hourly"} onChange={(e) => upd("measurement_mode", e.target.value)} style={inp}>
              {MODES.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
            </select>
          </Field>
          <Field label={`Rate (${modeUnit(f.measurement_mode)})`}>
            <input value={f.default_rate || ""} inputMode="decimal" onChange={(e) => upd("default_rate", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={inp} />
          </Field>
          {!owned && (
            <Field label={t("machinery.kiraye_ka_vendor")} span={2}>
              <PartyPicker value={f.default_vendor_id} onChange={(v) => upd("default_vendor_id", v)}
                parties={parties} roles={HIRE_VENDOR_ROLES} placeholder={t("machinery.kis_se_kiraye_par_li_hai")} />
            </Field>
          )}
          <Field label={t("machinery.diesel_kiska")} span={2}
            hint={t("machinery.rent_me_shaamil_hai_to_hum")}>
            {/* Apni machine ka diesel hamesha hamara hi hai — wahan ye box
                disabled hai, par tab bhi "company" hi padhna chahiye. Pehle
                yahan default 'rent_included' dikh jaata tha, jo owned machine
                par seedha ulta padhta hai. */}
            <select value={owned ? "company" : (f.fuel_responsibility || "rent_included")}
              onChange={(e) => upd("fuel_responsibility", e.target.value)} style={inp} disabled={owned}>
              <option value="company">{t("machinery.hamara_company_deti_hai")}</option>
              <option value="rent_included">{t("machinery.kiraye_me_shaamil_vendor_ka")}</option>
            </select>
          </Field>
          {/* "Fuel vendor (pump)" yahan se HATA diya gaya. Machine ka pump fix
              hota hi nahi — diesel jahan se mile wahan se aata hai, aur pump
              har entry par Fuel module me chuna jaata hai. Ise master par
              poochna ek jhoothi pakkai thi: bharne wala kuch bhar deta, aur
              wo kahin lagta bhi nahi tha. */}
          {fuelOurs && (
            <Field label={t("machinery.fuel_norm_l_hr")} hint={t("machinery.isse_zyada_kharcha_hone_par_fuel")}>
              <input value={f.fuel_per_hour || ""} inputMode="decimal" onChange={(e) => upd("fuel_per_hour", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g. 8" style={inp} />
            </Field>
          )}
        </div>
      )}

      {tab === "tele" && (
        <>
          <Notice><Rich k="machinery.ye_machine_ka_apna_record_hai" params={{ v: " " }} /></Notice>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("machinery.gps_telematics_laga_hai")} span={2}>
              <select value={f.telematics_enabled == null ? "" : String(f.telematics_enabled)}
                onChange={(e) => upd("telematics_enabled", e.target.value === "" ? null : Number(e.target.value))} style={inp}>
                <option value="">{t("machinery.abhi_tay_nahi")}</option>
                <option value="1">{t("machinery.haan_laga_hai")}</option>
                <option value="0">{t("machinery.nahi")}</option>
              </select>
            </Field>
            {Number(f.telematics_enabled) === 1 && (
              <>
                <Field label={t("machinery.telematics_vendor")} span={2}>
                  <PartyPicker value={f.telematics_vendor_party_id} onChange={(v) => upd("telematics_vendor_party_id", v)}
                    parties={parties} roles={["vendor", "supplier", "consultant", "material_vendor"]} placeholder={t("machinery.vendor_chuno")} />
                </Field>
                <Field label={t("machinery.device_imei_no")}>
                  <input value={f.telematics_device_id || ""} onChange={(e) => upd("telematics_device_id", e.target.value)} style={inp} />
                </Field>
                <Field label={t("machinery.api_url")}>
                  <input value={f.telematics_api_url || ""} onChange={(e) => upd("telematics_api_url", e.target.value)} placeholder="https://..." style={inp} />
                </Field>
                <Field label={t("machinery.api_key")} span={2}
                  hint={f.telematics_api_key_set
                    ? `Abhi set hai (${f.telematics_api_key_masked}). Badalni ho tabhi nayi type karein — khaali chhodne par purani bani rahegi.`
                    : t("machinery.ye_key_kabhi_wapas_screen_par")}>
                  <input type="password" autoComplete="new-password" value={f.telematics_api_key || ""}
                    onChange={(e) => upd("telematics_api_key", e.target.value)}
                    placeholder={f.telematics_api_key_set ? t("machinery.badalni_ho_to_nayi_key") : ""} style={inp} />
                </Field>
              </>
            )}
          </div>
        </>
      )}

      {tab === "docs" && !editing && (
        <>
          <Notice>
            {owned
              ? <>{t("machinery.teen_kaagaz_jo_aksar_chuk_jaate")} <b>{t("machinery.valid_till")}</b> {t("machinery.zaroori_hai_usi_par_reminder_chalta")}</>
              : <>{t("machinery.kiraye_ki_machine_par_hum_vendor")} <b>{t("machinery.sirf_expiry_ke_liye")}</b> {t("machinery.dekhte_hain_unfit_machine_aapki_site")}</>}
          </Notice>
          {KEY_DOCS.map((d) => (
            <div key={d.k} style={{ border: `1px solid ${T.b1}`, borderRadius: 10, padding: "11px 13px", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 9 }}>{d.l}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <Field label={t("machinery.number")}>
                  <input value={(docs[d.k] || {}).doc_no || ""} onChange={(e) => updDoc(d.k, "doc_no", e.target.value)} style={inp} />
                </Field>
                <Field label={t("machinery.valid_till_2")}>
                  <input type="date" value={(docs[d.k] || {}).valid_till || ""} onChange={(e) => updDoc(d.k, "valid_till", e.target.value)} style={inp} />
                </Field>
                <FileField value={(docs[d.k] || {}).photo_url} onChange={(u) => updDoc(d.k, "photo_url", u)} />
              </div>
            </div>
          ))}
          <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, padding: "11px 13px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, marginBottom: 3 }}>{t("machinery.aaj_ka_meter")}</div>
            <div style={{ fontSize: 10.5, color: T.t4, marginBottom: 9 }}>
             {t("machinery.iske_bina_koi_bhi_service_due")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {(f.meter_unit === "hours" || f.meter_unit === "both") && (
                <Field label={t("machinery.hour_meter_hrs")}>
                  <input value={f.opening_hours || ""} inputMode="decimal" onChange={(e) => upd("opening_hours", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
                </Field>
              )}
              {(f.meter_unit === "km" || f.meter_unit === "both") && (
                <Field label={t("machinery.odometer_km")}>
                  <input value={f.opening_km || ""} inputMode="decimal" onChange={(e) => upd("opening_km", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
                </Field>
              )}
              <Field label={t("machinery.kis_din_ki")}>
                <input type="date" value={f.opening_read_at || todayStr()} onChange={(e) => upd("opening_read_at", e.target.value)} style={inp} />
              </Field>
            </div>
          </div>
        </>
      )}

      {error && <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{error}</div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// COST REPORT (M3.1)
//
// Do sawal ka jawab: apni machine ghante ka kitna padti hai, aur jo rate hum
// project se le rahe hain wo us lagat ko cover karta hai ya nahi.
//
// Poora ankda likha jaata hai (₹84,000), fmtC ka chhota roop (₹84.0K) nahi —
// accounts isi se milaan karta hai aur gol kiya hua number milaan me kaam
// nahi aata.
//
// Jis machine ka hisaab nahi ban saka wo CHHUPTI nahi — uski wajah usi row me
// likhi hoti hai. Khaali table se accha hai ye batana ki bharna kya baaki hai.
// ══════════════════════════════════════════════════════════════════
const rupee = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

function CostReport({ econ, health }) {
  if (!econ) return <Empty>{t("machinery.report_load_ho_rahi_hai")}</Empty>;
  const rows = econ.machines || [];
  const f = econ.fleet || {};
  const okRows = rows.filter((m) => m.cost_per_unit != null);
  const blocked = rows.filter((m) => m.cost_per_unit == null);
  const ovr = f.own_vs_rent || {};

  return (
    <>
      {econ.note && <Notice>{econ.note}</Notice>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
        <StatCard label={t("machinery.kul_kharcha")} value={rupee(f.cost_total)} sub={econ.window.from + " se " + econ.window.to} color={T.ind} icon={IcWrench} />
        <StatCard label={t("machinery.apni_machine_se_recovery")} value={rupee(f.recovery_total)} sub={t("machinery.project_se_liya_gaya")} color={T.grn} icon={IcTruck} />
        <StatCard label={t("machinery.hisaab_ban_saka")} value={f.with_cost_per_unit + "/" + rows.length} sub={blocked.length ? blocked.length + " par data kam" : t("machinery.sab_par")} color={blocked.length ? T.amb : T.grn} icon={IcGauge} />
        <StatCard label={t("machinery.breakdown")} value={f.breakdown_count || 0} sub={f.preventive_pct != null ? f.preventive_pct + "% preventive" : (f.service_count ? t("machinery.ratio_abhi_nahi") : t("machinery.koi_service_nahi"))} color={f.breakdown_count ? T.red : T.grn} icon={IcAlert} />
      </div>

      <Panel title={t("machinery.machine_ka_hisaab")} style={{ marginBottom: 12 }}>
        {okRows.length === 0 && (
          <Empty>
           {t("machinery.abhi_kisi_machine_ka_hr_nahi")}<br />
            <span style={{ fontSize: 11.5 }}>{t("machinery.neeche_har_machine_par_wajah_likhi")}</span>
          </Empty>
        )}
        {okRows.length > 0 && (
          <>
            <Row head cols="1.5fr 78px 1fr 1.1fr 1fr 110px">
              <span>{t("fuel.machine")}</span><span>{t("machinery.kiski")}</span><span>{t("machinery.chali")}</span><span>{t("machinery.kharcha")}</span><span>{t("machinery.per_unit")}</span><span>{t("machinery.rate_cover")}</span>
            </Row>
            {okRows.map((m) => (
              <Row key={m.equipment_id} cols="1.5fr 78px 1fr 1.1fr 1fr 110px">
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: T.t4 }}>{m.registration_no || t("machinery.reg_no_nahi")}</div>
                </div>
                <span><Pill label={m.owned ? t("machinery.apni") : t("machinery.kiraye")} c={m.owned ? T.ind : T.t3} bg={m.owned ? T.indL : T.sltL} /></span>
                {/* Numerator aur denominator dono dikhte hain — akela "₹420/hr"
                    par koi bharosa nahi kar sakta, na use jaanch sakta hai. */}
                <div>
                  <div style={{ fontSize: 12 }}>{fmtN(m.run.value)} {m.unit === "km" ? "km" : "hrs"}</div>
                  <div style={{ fontSize: 9.5, color: T.t4 }}>{fmtD(m.run.from_at)} → {fmtD(m.run.to_at)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{rupee(m.cost.total)}</div>
                  <div style={{ fontSize: 9.5, color: T.t4 }}>
                    {[m.cost.fuel ? "diesel " + rupee(m.cost.fuel) : null,
                      m.cost.service ? "service " + rupee(m.cost.service) : null,
                      m.cost.documents ? "kaagaz " + rupee(m.cost.documents) : null,
                      m.cost.hire_paid ? "kiraya " + rupee(m.cost.hire_paid) : null].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>
                    {rupee(m.cost_per_unit)}<span style={{ fontSize: 10, fontWeight: 500, color: T.t4 }}>/{m.unit === "km" ? "km" : "hr"}</span>
                  </div>
                  {m.recovery_per_unit != null && (
                    <div style={{ fontSize: 9.5, color: T.t4 }}>liya {rupee(m.recovery_per_unit)}</div>
                  )}
                </div>
                <span>
                  {m.covers_cost === null ? <span style={{ fontSize: 11, color: T.t4 }}>—</span>
                    : m.covers_cost ? <Pill label={t("machinery.haan")} c={T.grn} bg={T.grnL} />
                    : <Pill label={t("machinery.nahi_rate_kam")} c={T.red} bg={T.redL} />}
                </span>
              </Row>
            ))}
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4, lineHeight: 1.55 }}>
             {t("machinery.isme")} <b>{t("machinery.depreciation_aur_operator_ki_salary_shaamil")}</b> {t("machinery.hai_kiraye_ki_machine_par_service")}
            </div>
          </>
        )}
      </Panel>

      {blocked.length > 0 && (
        <Panel title={blocked.length + " machine ka hisaab abhi nahi ban saka"} style={{ marginBottom: 12 }}>
          {blocked.map((m) => (
            <Row key={m.equipment_id} cols="1.5fr 78px 1fr 1.6fr">
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{m.name}</span>
              <span><Pill label={m.owned ? t("machinery.apni") : t("machinery.kiraye")} c={m.owned ? T.ind : T.t3} bg={m.owned ? T.indL : T.sltL} /></span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>kharcha {rupee(m.cost.total)}</span>
              <span style={{ fontSize: 11, color: T.amb }}>{m.run.reason}</span>
            </Row>
          ))}
        </Panel>
      )}

      {ovr.owned && (ovr.owned.machines > 0 || ovr.rented.machines > 0) && (
        <Panel title={t("machinery.apni_vs_kiraye_ki")} style={{ marginBottom: 12 }}>
          <Row head cols="1fr 1fr 1fr"><span>{t("machinery.kiski")}</span><span>{t("machinery.machines")}</span><span>{t("machinery.aausat_per_unit")}</span></Row>
          <Row cols="1fr 1fr 1fr">
            <span style={{ fontSize: 12.5, color: T.t1 }}>{t("machinery.apni")}</span>
            <span style={{ fontSize: 12 }}>{ovr.owned.machines}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{ovr.owned.avg_cost_per_unit != null ? rupee(ovr.owned.avg_cost_per_unit) : "—"}</span>
          </Row>
          <Row cols="1fr 1fr 1fr">
            <span style={{ fontSize: 12.5, color: T.t1 }}>{t("machinery.kiraye_ki")}</span>
            <span style={{ fontSize: 12 }}>{ovr.rented.machines}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{ovr.rented.avg_cost_per_unit != null ? rupee(ovr.rented.avg_cost_per_unit) : "—"}</span>
          </Row>
          <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.amb, lineHeight: 1.55 }}>{ovr.warning}</div>
        </Panel>
      )}

      {health && (health.machines || []).length > 0 && (
        <Panel title={t("machinery.preventive_vs_breakdown")} style={{ marginBottom: 12 }}>
          <Row head cols="1.6fr 1.2fr 1fr 1fr"><span>{t("fuel.machine")}</span><span>{t("machinery.service")}</span><span>{t("machinery.breakdown")}</span><span>{t("machinery.downtime")}</span></Row>
          {health.machines.map((m) => (
            <Row key={m.equipment_id} cols="1.6fr 1.2fr 1fr 1fr">
              <span style={{ fontSize: 12.5, color: T.t1 }}>{m.name}</span>
              <span style={{ fontSize: 12 }}>{m.service_count}{m.preventive_pct != null ? " (" + m.preventive_pct + "% preventive)" : ""}</span>
              <span style={{ fontSize: 12, color: m.breakdowns ? T.red : T.t3 }}>{m.breakdowns}</span>
              <span style={{ fontSize: 12, color: T.t3 }}>
                {m.downtime_hours != null ? fmtN(m.downtime_hours) + " hrs" : <span style={{ color: T.t4 }}>{t("machinery.darj_nahi")}</span>}
              </span>
            </Row>
          ))}
          {health.downtime_coverage && (
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>{health.downtime_coverage}</div>
          )}
        </Panel>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// IMPORT WIZARD
//
// Library ka purana CSV import 7 column padhta tha aur har fail hui row ko
// chup-chaap gira deta tha. Yahan teen cheezein alag hain: Excel bhi chalti
// hai, column khud match hote hain (par badle ja sakte hain), aur commit se
// pehle har row ka faisla dikh jaata hai.
// ══════════════════════════════════════════════════════════════════
const IMPORT_COLS = [
  { key: "name", get label() { return t("machinery.machine_ka_naam"); }, required: true, aliases: ["machine", "equipment name", "equipment", "naam", "machine name"] },
  { key: "registration_no", get label() { return t("machinery.gadi_no"); }, aliases: ["registration", "reg no", "reg", "vehicle no", "number plate", "gadi"] },
  { key: "code", get label() { return t("machinery.code"); }, aliases: ["equipment code", "asset code"] },
  { key: "machine_type", get label() { return t("machinery.machine_type"); }, aliases: ["type", "category", "prakar", "equipment type", "machine category"] },
  { key: "ownership", get label() { return t("machinery.ownership"); }, aliases: ["owned rented", "own rented", "own", "owned", "rented", "hire type", "malikana", "apni kiraye"] },
  { key: "measurement_mode", get label() { return t("machinery.rate_type"); }, aliases: ["mode", "measurement", "basis", "rate basis"] },
  { key: "default_rate", get label() { return t("common.rate"); }, aliases: ["rate", "default rate", "kiraya", "hire rate", "rent", "amount", "rate per unit"] },
  { key: "meter_unit", get label() { return t("machinery.meter_unit"); }, aliases: ["meter", "meter type"] },
  { key: "opening_hours", get label() { return t("machinery.opening_hours"); }, aliases: ["hour meter", "hours", "hmr"] },
  { key: "opening_km", get label() { return t("machinery.opening_km"); }, aliases: ["odometer", "km", "kms"] },
  // Kiraye ki machine ka malik. Form me ye hamesha se tha, import me chhoot
  // gaya tha — matlab 20 rented machine import karke phir ek-ek kholkar vendor
  // bharna padta tha, aur uske bina kiraye ka paisa kisi ke naam nahi baithta.
  { key: "default_vendor", get label() { return t("machinery.kiraye_ka_vendor_malik"); }, aliases: ["vendor", "owner", "malik", "hire vendor", "kiraya vendor", "rented from", "supplier", "party"] },
  // "Diesel kiska" — apni machine par hamesha company, kiraye wali par asli
  // sawaal. Ye tay karta hai ki machine Fuel module me aayegi bhi ya nahi.
  { key: "fuel_responsibility", get label() { return t("machinery.diesel_kiska_hamara_kiraye_me"); }, aliases: ["diesel", "fuel", "diesel kiska", "fuel responsibility", "fuel kiska", "diesel kaun dega"] },
  { key: "fuel_per_hour", get label() { return t("machinery.fuel_norm_l_hr"); }, aliases: ["fuel norm", "l/hr", "lph", "mileage"] },
  { key: "make", get label() { return t("machinery.make"); }, aliases: ["brand", "company"] },
  { key: "model", get label() { return t("machinery.model"); }, aliases: [] },
  { key: "chassis_no", get label() { return t("machinery.chassis_no"); }, aliases: ["chassis"] },
  { key: "engine_no", get label() { return t("machinery.engine_no"); }, aliases: ["engine"] },
  { key: "operator_name", get label() { return t("machinery.operator"); }, aliases: ["driver", "chalak"] },
  // Kaagaz ki expiry import me hona hi chahiye. 40 machine import karke phir
  // 120 document haath se bharna — import ka matlab hi khatam ho jaata, aur
  // expiry hi is module ki jaan hai.
  { key: "insurance_no", get label() { return t("machinery.insurance_no"); }, aliases: ["policy no", "insurance policy"] },
  { key: "insurance_till", get label() { return t("machinery.insurance_valid_till"); }, aliases: ["insurance expiry", "insurance", "policy expiry", "bima"] },
  { key: "fitness_no", get label() { return t("machinery.fitness_no"); }, aliases: ["fitness certificate no"] },
  { key: "fitness_till", get label() { return t("machinery.fitness_valid_till"); }, aliases: ["fitness expiry", "fitness", "fc expiry", "fc"] },
  { key: "puc_no", get label() { return t("machinery.puc_no"); }, aliases: ["puc certificate no"] },
  { key: "puc_till", get label() { return t("machinery.puc_valid_till"); }, aliases: ["puc expiry", "puc", "pollution", "pollution expiry"] },
  // Telematics. Device/IMEI har machine ka alag hota hai, isliye bulk me isi
  // ka sabse zyada matlab hai. API key yahan JAAN-BUJH KAR nahi hai — wo ek
  // secret hai, aur Excel file WhatsApp/email par ghumti hai. Key machine
  // kholkar bhari jaati hai, jahan wo masked rehti hai aur kabhi wapas nahi
  // dikhti.
  { key: "telematics_enabled", get label() { return t("machinery.gps_laga_hai_haan_nahi"); }, aliases: ["gps", "telematics", "tracker", "gps hai"] },
  { key: "telematics_device_id", get label() { return t("machinery.device_imei_no"); }, aliases: ["imei", "device id", "device", "gps device", "tracker id"] },
  { key: "telematics_vendor", get label() { return t("machinery.telematics_vendor"); }, aliases: ["gps vendor", "tracker vendor", "gps company"] },
  { key: "telematics_api_url", get label() { return t("machinery.telematics_api_url"); }, aliases: ["gps api", "api url"] },
];

// "haan/nahi" ke wo saare roop jo log sach me likhte hain.
const YESNO = { haan: 1, ha: 1, hai: 1, yes: 1, y: 1, true: 1, "1": 1, laga: 1, lga: 1, on: 1,
                nahi: 0, nhi: 0, no: 0, n: 0, false: 0, "0": 0, off: 0 };

const DOC_IMPORT = [
  { type: "insurance", no: "insurance_no", till: "insurance_till", get label() { return t("machinery.insurance"); } },
  { type: "fitness", no: "fitness_no", till: "fitness_till", get label() { return t("machinery.fitness"); } },
  { type: "puc", no: "puc_no", till: "puc_till", label: "PUC" },
];

// Excel se date teen shakl me aati hai: serial number (date-formatted cell),
// JS Date, ya plain text. Text me Bharat ka riwaaj dd/mm/yyyy hai — us par
// hi chalte hain, par parse ki hui date preview me dikhayi jaati hai taaki
// galat padhi gayi date chhupe nahi.
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);   // 1900 leap-year bug samet
function parseSheetDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v)) {
    const p = (n) => String(n).padStart(2, "0");
    return v.getFullYear() + "-" + p(v.getMonth() + 1) + "-" + p(v.getDate());
  }
  const s = String(v).trim();
  if (!s) return null;
  // Serial number — 1990 se 2100 tak ka hi maano, warna "42" jaisa koi number
  // bhi date ban jayega.
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n < 32874 || n > 73415) return null;
    const d = new Date(EXCEL_EPOCH + Math.round(n) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);          // yyyy-mm-dd
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);          // dd/mm/yyyy
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (Number(y) > 70 ? "19" : "20") + y;
    if (Number(mo) > 12) return null;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(s);                                       // "15 Aug 2027"
  if (!isNaN(parsed)) {
    const p = (n) => String(n).padStart(2, "0");
    return parsed.getFullYear() + "-" + p(parsed.getMonth() + 1) + "-" + p(parsed.getDate());
  }
  return null;
}

const norm = (s) => String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Header ka naam target column se milao. Exact match pehle, phir alias, phir
// "isme wo shabd hai" — is order me, warna "Rate type" ko "Rate" utha leta hai.
function autoMap(header) {
  const used = new Set();
  const map = {};
  for (const c of IMPORT_COLS) {
    const want = [norm(c.label), norm(c.key), ...c.aliases.map(norm)];
    let idx = header.findIndex((h, i) => !used.has(i) && want.includes(norm(h)));
    if (idx < 0) idx = header.findIndex((h, i) => !used.has(i) && norm(h) && want.some((w) => norm(h) === w));
    if (idx >= 0) { map[c.key] = idx; used.add(idx); }
  }
  return map;
}

const OWNERSHIP_WORDS = { owned: "owned", own: "owned", apni: "owned", self: "owned", company: "owned", rented: "rented", rent: "rented", hired: "rented", kiraya: "rented", kiraye: "rented", leased: "rented" };
const MODE_WORDS = { hourly: "hourly", hour: "hourly", hr: "hourly", ghanta: "hourly", daily: "daily", day: "daily", din: "daily", monthly: "monthly", month: "monthly", mahina: "monthly", maheena: "monthly", mah: "monthly", km: "km", kilometer: "km", kms: "km", trip: "trip", trips: "trip", fera: "trip", fixed: "fixed", lump: "fixed", lumpsum: "fixed" };
const UNIT_WORDS = { hours: "hours", hour: "hours", hr: "hours", hmr: "hours", km: "km", odometer: "km", both: "both", dono: "both" };
// "Diesel kiska" — Excel me log ye poora vaakya likhte hain, ek shabd nahi.
// Isliye pehla shabd nahi, poora text dekha jaata hai.
const FUEL_RESP_WORDS = [
  [/rent|kiray|kiraye|vendor|shaamil|shamil|included|malik/i, "rent_included"],
  [/company|hamara|humara|apna|apni|self|own|hum/i, "company"],
];
const fuelRespOf = (raw) => {
  const s = String(raw || "").trim();
  if (!s) return null;                       // column khaali = kuch mat kaho
  for (const [re, val] of FUEL_RESP_WORDS) if (re.test(s)) return val;
  return null;
};

function ImportWizard({ open, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [aoa, setAoa] = useState([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [map, setMap] = useState({});
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1); setFileName(""); setAoa([]); setHeaderRow(0); setMap({});
    setPreview(null); setResult(null); setError("");
  }, [open]);

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    try {
      const XLSX = await import("xlsx");
      const buf = await f.arrayBuffer();
      // cellFormula:false → formula load hi nahi hota, sirf cached value.
      const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellFormula: false, cellText: true, cellDates: false });
      if (!wb.SheetNames.length) { setError(t("machinery.file_me_koi_sheet_nahi_mili")); return; }
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false, defval: "" });
      if (!rows.length) { setError(t("machinery.sheet_khaali_hai")); return; }
      // Header wo row hai jisme sabse zyada bhare hue khaane hain — file ke
      // upar aksar title/logo ki adhoori rows hoti hain.
      let best = 0, bestN = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const n = (rows[i] || []).filter((c) => String(c).trim()).length;
        if (n > bestN) { bestN = n; best = i; }
      }
      setFileName(f.name); setAoa(rows); setHeaderRow(best);
      setMap(autoMap(rows[best] || []));
      setStep(2);
    } catch (_) { setError(t("machinery.file_padhne_me_dikkat_sahi_xlsx")); }
  };

  const header = aoa[headerRow] || [];
  const parsed = useMemo(() => {
    if (map.name == null) return [];
    const out = [];
    for (let i = headerRow + 1; i < aoa.length; i++) {
      const r = aoa[i] || [];
      const cell = (k) => (map[k] == null ? "" : String(r[map[k]] == null ? "" : r[map[k]]).trim());
      const rawCell = (k) => (map[k] == null ? null : r[map[k]]);
      const name = cell("name");
      if (!name) continue;
      const numOf = (k) => { const v = cell(k).replace(/[^0-9.-]/g, ""); return v === "" ? null : Number(v); };

      // Kaagaz: date parse ho gayi to document banega. Jo date padhi na ja
      // sake wo chup-chaap girni nahi chahiye — use badDates me rakh kar
      // preview me naam le kar dikhate hain.
      const documents = [];
      const badDates = [];
      for (const d of DOC_IMPORT) {
        const rawTill = rawCell(d.till);
        const no = cell(d.no) || null;
        const till = parseSheetDate(rawTill);
        if (till) documents.push({ doc_type: d.type, doc_no: no, valid_till: till });
        else if (String(rawTill == null ? "" : rawTill).trim()) badDates.push(`${d.label}: "${String(rawTill).trim()}"`);
        else if (no) badDates.push(`${d.label} ka number hai par date nahi`);
      }

      out.push({
        documents,
        _bad_dates: badDates,
        _row: i + 1,
        name,
        registration_no: cell("registration_no") || null,
        code: cell("code") || null,
        machine_type: cell("machine_type") || null,
        type: cell("machine_type") || null,
        ownership: OWNERSHIP_WORDS[norm(cell("ownership")).split(" ")[0]] || "rented",
        measurement_mode: MODE_WORDS[norm(cell("measurement_mode")).split(" ")[0]] || "hourly",
        default_rate: numOf("default_rate") || 0,
        meter_unit: UNIT_WORDS[norm(cell("meter_unit")).split(" ")[0]] || null,
        opening_hours: numOf("opening_hours"),
        opening_km: numOf("opening_km"),
        // Vendor Excel me NAAM se aata hai (id kaun likhega) — server use party
        // master se milata hai, aur na mile to chup-chaap null nahi karta,
        // preview me likh kar batata hai.
        _default_vendor_name: cell("default_vendor") || null,
        fuel_responsibility: fuelRespOf(cell("fuel_responsibility")),
        fuel_per_hour: numOf("fuel_per_hour"),
        make: cell("make") || null, model: cell("model") || null,
        chassis_no: cell("chassis_no") || null, engine_no: cell("engine_no") || null,
        operator_name: cell("operator_name") || null,
        // NULL = column hi nahi tha (poocha hi nahi gaya). 0 = "nahi" — wo
        // poora jawab hai aur completeness me ginta hai.
        telematics_enabled: (() => {
          const raw = cell("telematics_enabled");
          if (!raw) return null;
          const v = YESNO[norm(raw)];
          return v == null ? null : v;
        })(),
        telematics_device_id: cell("telematics_device_id") || null,
        telematics_api_url: cell("telematics_api_url") || null,
        _telematics_vendor_name: cell("telematics_vendor") || null,
      });
    }
    return out;
  }, [aoa, headerRow, map]);

  const runPreview = async () => {
    setBusy(true); setError("");
    const r = await api.post("/machinery/import", { rows: parsed, dry_run: true });
    setBusy(false);
    if (!r || !r.success) { setError((r && r.message) || "Preview nahi ban paya"); return; }
    setPreview(r.data); setStep(3);
  };

  const commit = async () => {
    setBusy(true); setError("");
    const r = await api.post("/machinery/import", { rows: parsed, dry_run: false });
    setBusy(false);
    if (!r || !r.success) { setError((r && r.message) || "Import fail hua — kuch bhi save nahi hua"); return; }
    setResult(r.data); setStep(4); onDone();
  };

  const template = async () => {
    const XLSX = await import("xlsx");
    // Sample rows column ke naam se banti hain, position se nahi — pehle ye
    // haath se likhi thi aur naya column judte hi saari values khisak jaati.
    const sample = (o) => IMPORT_COLS.map((c) => (o[c.key] == null ? "" : o[c.key]));
    const rows = [
      IMPORT_COLS.map((c) => c.label),
      sample({
        name: "JCB 3DX Backhoe Loader", registration_no: "MP09 AB 1234", code: "EQ-JCB-01",
        machine_type: "excavator", ownership: "owned", measurement_mode: "hourly",
        default_rate: 0, meter_unit: "hours", opening_hours: 4318, fuel_per_hour: 8,
        make: "JCB", model: "3DX", operator_name: "Ram Singh",
        telematics_enabled: "haan", telematics_device_id: "868120050012345",
        telematics_vendor: "Trakzee", telematics_api_url: "https://api.trakzee.example/v1",
        insurance_no: "UII/2026/8891", insurance_till: "30-06-2027",
        fitness_no: "FIT-2201", fitness_till: "28-02-2027",
        puc_no: "PUC-44120", puc_till: "15-11-2026",
      }),
      sample({
        name: "Tipper 10 wheel", registration_no: "MP09 CD 5678", code: "EQ-TIP-01",
        machine_type: "tipper", ownership: "rented", measurement_mode: "km",
        default_rate: 42, meter_unit: "km", opening_km: 128400,
        make: "Tata", model: "Signa",
        telematics_enabled: "nahi",
        insurance_till: "31-03-2027",
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Date columns ko text rakho — warna Excel "30-06-2027" ko apne local
    // format me badal deta hai aur wapas import karte waqt mahina/din palat
    // sakte hain.
    ws["!cols"] = IMPORT_COLS.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Machines");
    XLSX.writeFile(wb, "sanchalan_machinery_template.xlsx");
  };

  const missingReq = IMPORT_COLS.filter((c) => c.required && map[c.key] == null);

  return (
    <Modal open={open} onClose={onClose} width={860} title={t("machinery.excel_se_machines_import")}
      sub={fileName || t("machinery.naam_ke_alawa_sab_optional_baad")}
      footer={
        step === 1 ? <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        : step === 2 ? <><Btn ghost onClick={() => setStep(1)}>{t("common.peeche")}</Btn>
            <Btn onClick={runPreview} disabled={busy || !!missingReq.length || !parsed.length}>{busy ? t("machinery.dekh_rahe_hain") : `Jaanch karo (${parsed.length})`}</Btn></>
        : step === 3 ? <><Btn ghost onClick={() => setStep(2)}>{t("common.peeche")}</Btn>
            <Btn onClick={commit} disabled={busy || !preview || !preview.summary.ok}>{busy ? t("machinery.import_ho_raha_hai") : `${preview ? preview.summary.ok : 0} machine import karo`}</Btn></>
        : <Btn onClick={onClose}>{t("machinery.theek_hai")}</Btn>
      }>

      {step === 1 && (
        <>
          <Notice>
           {t("machinery.jis_machine_ka")} <b>{t("machinery.naam_ya_gadi_no")}</b> {t("machinery.pehle_se_register_me_hai_wo")}
          </Notice>
          <label style={{ display: "block", border: `2px dashed ${T.b2}`, borderRadius: 12, padding: "34px 20px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{t("machinery.excel_csv_file_chuno")}</div>
            <div style={{ fontSize: 11.5, color: T.t4, marginTop: 5 }}>{t("machinery.xlsx_xls_csv")}</div>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} style={{ display: "none" }} />
          </label>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button type="button" onClick={template}
              style={{ background: "none", border: "none", color: T.ind, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
             {t("machinery.template_download_karo")}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 11.5, color: T.t3 }}>{t("common.header_row")}</span>
            <select value={headerRow} onChange={(e) => { const h = Number(e.target.value); setHeaderRow(h); setMap(autoMap(aoa[h] || [])); }}
              style={{ ...inp, width: 150 }}>
              {aoa.slice(0, 10).map((r, i) => <option key={i} value={i}>{t("machinery.row_i", { i: i + 1 })}</option>)}
            </select>
            <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.parsed_machine_mili", { parsed: parsed.length })}</span>
          </div>
          {!!missingReq.length && (
            <div style={{ marginBottom: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{t("machinery.missingreq_ka_column_chuno_uske_bina", { missingReq: missingReq.map((c) => c.label).join(", ") })}</div>
          )}
          {/* Ownership bahut kuch tay karti hai — kaagaz ka scope, diesel kiska,
              aur completeness ka hisaab. Column na mile to sab chup-chaap
              "rented" ban jaate; ye keh dena zaroori hai. */}
          {map.ownership == null && (
            <div style={{ marginBottom: 12, padding: "9px 12px", background: T.ambL, color: T.amb, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>
             {t("machinery.ownership_ka_column_nahi_chuna_saari")} <b>{t("machinery.rented")}</b> {t("machinery.maani_jayengi_apni_machines_baad_me")}
            </div>
          )}
          {map.measurement_mode != null && (() => {
            // Jo shabd hum pehchante hi nahi wo chup-chaap 'hourly' ban jaate
            // hain — ek tipper ka km rate ghante ka ban jana mehanga padta hai.
            const bad = [...new Set(parsed.map((p, i) => {
              const raw = String((aoa[headerRow + 1 + i] || [])[map.measurement_mode] || "").trim();
              return raw && !MODE_WORDS[norm(raw).split(" ")[0]] ? raw : null;
            }).filter(Boolean))];
            return bad.length ? (
              <div style={{ marginBottom: 12, padding: "9px 12px", background: T.ambL, color: T.amb, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{t("machinery.rate_type_me_ye_shabd_samajh", { bad: bad.slice(0, 5).join(", ") })}</div>
            ) : null;
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {IMPORT_COLS.map((c) => (
              <Field key={c.key} label={c.label + (c.required ? " *" : "")}>
                <select value={map[c.key] == null ? "" : map[c.key]}
                  onChange={(e) => setMap((p) => ({ ...p, [c.key]: e.target.value === "" ? null : Number(e.target.value) }))}
                  style={inp}>
                  <option value="">{t("machinery.nahi_hai")}</option>
                  {header.map((h, i) => <option key={i} value={i}>{String(h).trim() || `Column ${i + 1}`}</option>)}
                </select>
              </Field>
            ))}
          </div>
        </>
      )}

      {step === 3 && preview && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {[
              { l: t("machinery.banengi"), v: preview.summary.ok, c: T.grn },
              { l: t("machinery.skip_pehle_se_hai"), v: preview.summary.skip, c: T.amb },
              { l: t("machinery.galti"), v: preview.summary.error, c: T.red },
              { l: t("machinery.kaagaz_banenge"), v: preview.summary.documents || 0, c: T.ind },
            ].map((x) => (
              <div key={x.l} style={{ flex: 1, border: `1.5px solid ${T.b1}`, borderTop: `3px solid ${x.c}`, borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: x.c }}>{x.v}</div>
                <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>{x.l}</div>
              </div>
            ))}
          </div>
          {/* Jo date padhi hi na ja saki wo chup-chaap girni nahi chahiye —
              us machine ka kaagaz banega hi nahi aur bell kabhi bajegi nahi. */}
          {(() => {
            const bad = parsed.filter((p) => p._bad_dates && p._bad_dates.length);
            if (!bad.length) return null;
            return (
              <div style={{ marginBottom: 12, padding: "9px 12px", background: T.ambL, color: T.amb, fontSize: 11.5, borderRadius: 7, fontWeight: 600, lineHeight: 1.5 }}>
                {t("machinery.rows_date_samajh_nahi_aayi")}
                {bad.slice(0, 4).map((p) => (
                  <div key={p._row} style={{ fontWeight: 500 }}>row {p._row} · {p.name} — {p._bad_dates.join(", ")}</div>
                ))}
                {bad.length > 4 && <div style={{ fontWeight: 500 }}>{t("machinery.aur_bad_row", { bad: bad.length - 4 })}</div>}
                <div style={{ fontWeight: 500, marginTop: 4 }}>{t("machinery.date_ka_format")} <b>{t("machinery.dd_mm_yyyy")}</b> {t("machinery.rakhein_jaise_30_06_2027")}</div>
              </div>
            );
          })()}
          <div style={{ maxHeight: 320, overflowY: "auto", border: `1px solid ${T.b1}`, borderRadius: 10 }}>
            <Row head cols="46px 1.4fr 0.9fr 78px 1.1fr 1.2fr">
              <span>{t("machinery.row")}</span><span>{t("fuel.machine")}</span><span>{t("machinery.gadi_no")}</span><span>{t("machinery.faisla")}</span><span>{t("machinery.kaagaz")}</span><span>{t("machinery.wajah")}</span>
            </Row>
            {preview.verdicts.map((v) => {
              const src = parsed.find((p) => p._row === v.row);
              const docs = (src && src.documents) || [];
              return (
                <Row key={v.row} cols="46px 1.4fr 0.9fr 78px 1.1fr 1.2fr">
                  <span style={{ fontSize: 11.5, color: T.t4 }}>{v.row}</span>
                  <span style={{ fontSize: 12, color: T.t1 }}>{v.name || "—"}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{v.registration_no || "—"}</span>
                  <span>
                    {v.status === "ok" ? <Pill label={t("machinery.banegi")} c={T.grn} bg={T.grnL} />
                      : v.status === "skip" ? <Pill label={t("crm.skip")} c={T.amb} bg={T.ambL} />
                      : <Pill label={t("machinery.galti")} c={T.red} bg={T.redL} />}
                  </span>
                  {/* Parse ki hui date dikhana zaroori hai — 06-07 ulta padha
                      gaya ho to yahin pakda jayega, import ke baad nahi. */}
                  <span style={{ fontSize: 10.5, color: T.t3, lineHeight: 1.45 }}>
                    {docs.length
                      ? docs.map((d) => `${docLabel(d.doc_type).slice(0, 3)} ${fmtD(d.valid_till)}`).join(" · ")
                      : <span style={{ color: T.t4 }}>—</span>}
                  </span>
                  <span style={{ fontSize: 11, color: v.note ? T.amb : T.t3 }}>{v.reason || v.note || "—"}</span>
                </Row>
              );
            })}
          </div>
        </>
      )}

      {step === 4 && result && (
        <>
          <div style={{ padding: "13px 15px", background: T.grnL, border: `1px solid ${T.grn}33`, borderRadius: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.grn }}>{t("machinery.result_machine_ban_gayi", { result: result.created.length })}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>{t("machinery.skip_skip_pehle_se_thi_error", { skip: result.summary.skip, error: result.summary.error })}{result.documents_created > 0
                ? <>{t("machinery.documents_created_kaagaz_bhi_darj_ho", { documents_created: result.documents_created })}</>
                : <> {t("machinery.kaagaz_kisi_row_me_nahi_mile")}</>}
            </div>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${T.b1}`, borderRadius: 10 }}>
            {result.created.map((c) => (
              <Row key={c.id} cols="52px 1fr">
                <span style={{ fontSize: 11.5, color: T.t4 }}>{c.row}</span>
                <span style={{ fontSize: 12, color: T.t1 }}>{c.name}</span>
              </Row>
            ))}
          </div>
        </>
      )}

      {error && <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{error}</div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// SERVICE FORM (M2)
//
// Ek hi form dono kaam karta hai: nayi service (turant band ya khuli chhodo)
// aur khuli service ko band karna. Parts ki grid me har line apni cost aur
// (chaahe to) apni life rakhti hai — wahi life us part ka agla due banati hai,
// template ke aam niyam se upar.
//
// Udhaar par party lazmi (payable kisi ke naam hona chahiye); cash par
// highway ka mechanic free-text naam se chal jaata hai — ye Fuel ke "hamesha
// party" se jaan-bujh kar dheela hai.
// ══════════════════════════════════════════════════════════════════
const SERVICE_VENDOR_ROLES = ["equipment_vendor", "material_vendor", "vendor", "supplier", "subcontractor"];

function ServiceForm({ open, onClose, onSaved, machine, parties, existing, templates }) {
  const closing = !!existing;                    // khuli service band ho rahi hai
  const [f, setF] = useState({});
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);   // M4 — bill padha ja raha hai
  const [bill, setBill] = useState(null);          // padhne ka natija + warnings
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const updItem = (i, k, v) => setItems((p) => p.map((it, n) => (n === i ? { ...it, [k]: v } : it)));

  // ── M4: bill ki photo se khaane bharna ────────────────────────
  // Ye SIRF form bharta hai. Save aadmi hi dabata hai, aur wahi zimmedar hai —
  // isliye jo padha gaya wo dikhta bhi hai (warnings ke saath), chhupta nahi.
  const readBill = async () => {
    if (!f.photo_url) return;
    setReading(true); setBill(null); setError("");
    try {
      const r = await api.post("/machinery/service/parse-bill",
        { photo_url: f.photo_url, equipment_id: machine && machine.id });
      if (!r || !r.success) { setBill({ failed: true, message: (r && r.message) || "Bill padha nahi ja saka" }); }
      else {
        const d = r.data.draft || {};
        // Jo aadmi ne khud likh diya hai use mat chheddo — sirf khaali khaane
        // bharo. Bharay hue khaane par likh dena wo galti hai jo dikhti bhi
        // nahi.
        setF((p) => ({
          ...p,
          invoice_no: p.invoice_no || d.invoice_no || "",
          labour_cost: (p.labour_cost === "" || p.labour_cost == null) && d.labour_cost != null
            ? String(d.labour_cost) : p.labour_cost,
          service_date: d.service_date && !closing ? (p.service_date === todayStr() ? d.service_date : p.service_date) : p.service_date,
          // Vendor ka naam tabhi jab koi party na chuni ho — party hamesha
          // free-text se upar hai.
          vendor_name: p.vendor_party_id ? p.vendor_name : (p.vendor_name || d.vendor_name || ""),
        }));
        const parsed = (d.items || []).map((it) => ({
          item: it.item, part_category: it.part_category || "other",
          cost: it.cost != null ? String(it.cost) : "", life_hours: "", template_id: "",
        }));
        if (parsed.length) {
          setItems((p) => {
            const typed = p.filter((it) => String(it.item || "").trim());
            // Khaali lines ki jagah parsed lines; aadmi ne kuch likha ho to
            // uske neeche jodo, mitao mat.
            return typed.length ? [...typed, ...parsed] : parsed;
          });
        }
        setBill({ ...r.data, added: parsed.length });
      }
    } catch (e) { setBill({ failed: true, message: (e && e.message) || "Network error" }); }
    setReading(false);
  };

  useEffect(() => {
    if (!open) return;
    setError(""); setBill(null);
    setF(existing ? {
      service_date: existing.service_date, service_type: existing.service_type || "preventive",
      payment_mode: existing.payment_mode || "cash",
      vendor_party_id: existing.vendor_party_id, vendor_name: existing.vendor_name,
      labour_cost: "", invoice_no: existing.invoice_no || "", note: existing.note || "",
      keep_open: false,
    } : {
      service_date: todayStr(), service_type: "preventive", payment_mode: "cash", keep_open: false,
    });
    setItems([{ item: "", part_category: "other", cost: "", life_hours: "", template_id: "" }]);
  }, [open, existing]);

  const partsTotal = items.reduce((a, it) => a + (parseFloat(it.cost) || 0), 0);
  const total = partsTotal + (parseFloat(f.labour_cost) || 0);

  const save = async () => {
    setError("");
    const liveItems = items
      .filter((it) => String(it.item || "").trim())
      .map((it) => ({
        item: it.item.trim(), part_category: it.part_category || "other",
        cost: parseFloat(it.cost) || 0,
        life_hours: it.life_hours ? parseFloat(it.life_hours) : null,
        template_id: it.template_id ? Number(it.template_id) : null,
      }));
    if (f.payment_mode === "credit" && total > 0 && !f.vendor_party_id) {
      setError(t("machinery.udhaar_par_party_chunna_zaroori_hai")); return;
    }
    const body = {
      equipment_id: machine.id,
      service_date: f.service_date, service_type: f.service_type,
      payment_mode: f.payment_mode,
      vendor_party_id: f.vendor_party_id || null,
      vendor_name: f.vendor_name || null,
      labour_cost: parseFloat(f.labour_cost) || 0,
      invoice_no: f.invoice_no || null, note: f.note || null,
      photo_url: f.photo_url || null,
      items: liveItems,
    };
    setBusy(true);
    try {
      let r;
      if (closing) r = await api.put("/machinery/service/" + existing.id, body);
      else if (f.keep_open) r = await api.post("/machinery/service", { ...body, close_now: false });
      else r = await api.post("/machinery/service", { ...body, close_now: true });
      if (r && r.success) { onSaved(); onClose(); }
      else setError((r && r.message) || "Save failed");
    } catch (e) { setError((e && e.message) || "Network error"); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose} width={760}
      title={closing ? t("machinery.service_band_karein") : t("machinery.service_darj_karein")}
      sub={machine ? machine.name + (machine.registration_no ? ` · ${machine.registration_no}` : "") : ""}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : closing ? t("machinery.band_karo") : f.keep_open ? t("machinery.kholo_machine_under_repair") : t("machinery.darj_karo")}</Btn></>}>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label={t("common.date")}>
          <input type="date" value={f.service_date || ""} onChange={(e) => upd("service_date", e.target.value)} style={inp} />
        </Field>
        <Field label={t("common.type")}>
          <select value={f.service_type || "preventive"} onChange={(e) => upd("service_type", e.target.value)} style={inp}>
            <option value="preventive">{t("machinery.preventive_time_par")}</option>
            <option value="breakdown">{t("machinery.breakdown_kharab_hui")}</option>
            <option value="overhaul">{t("machinery.overhaul")}</option>
          </select>
        </Field>
        <Field label={t("common.payment")}>
          <select value={f.payment_mode || "cash"} onChange={(e) => upd("payment_mode", e.target.value)} style={inp}>
            <option value="cash">{t("machinery.cash_site_se_diya")}</option>
            <option value="credit">{t("machinery.udhaar_baad_me_pay")}</option>
          </select>
        </Field>
        <Field label={f.payment_mode === "credit" ? t("machinery.vendor_party") : t("machinery.vendor_party_2")} span={2}>
          <PartyPicker value={f.vendor_party_id} onChange={(v) => upd("vendor_party_id", v)}
            parties={parties || []} roles={SERVICE_VENDOR_ROLES} placeholder={t("machinery.workshop_mechanic_chuno")} />
        </Field>
        {!f.vendor_party_id && (
          <Field label={t("machinery.ya_naam_likho_sirf_cash")} hint={t("machinery.highway_ka_mechanic_ek_baar_ka")}>
            <input value={f.vendor_name || ""} onChange={(e) => upd("vendor_name", e.target.value)} style={inp}
              disabled={f.payment_mode === "credit"} placeholder={f.payment_mode === "credit" ? t("machinery.udhaar_par_party_zaroori") : ""} />
          </Field>
        )}
      </div>

      {!closing && (
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "12px 0 2px", cursor: "pointer" }}>
          <input type="checkbox" checked={!!f.keep_open} onChange={(e) => upd("keep_open", e.target.checked)} style={{ marginTop: 2 }} />
          <span style={{ fontSize: 11.5, color: T.t2 }}>
            <b>{t("machinery.machine_abhi_workshop_me_hai")}</b> {t("machinery.service_khuli_rahegi_machine_under_repair")}
          </span>
        </label>
      )}

      {(closing || !f.keep_open) && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t1, margin: "14px 0 8px" }}>{t("machinery.kya_kya_hua_badla")}</div>
          {items.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 110px 90px 90px 130px 26px", gap: 8, marginBottom: 7, alignItems: "center" }}>
              <input value={it.item} onChange={(e) => updItem(i, "item", e.target.value)} placeholder={t("machinery.e_g_engine_oil_15w40")} style={inp} />
              <select value={it.part_category} onChange={(e) => updItem(i, "part_category", e.target.value)} style={inp}>
                {["oil", "filter", "tyre", "hydraulic", "electrical", "engine", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={it.cost} inputMode="decimal" onChange={(e) => updItem(i, "cost", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="₹" style={inp} />
              <input value={it.life_hours} inputMode="decimal" onChange={(e) => updItem(i, "life_hours", e.target.value.replace(/[^0-9.]/g, ""))} placeholder={t("machinery.life_hrs")} style={inp}
                title={t("machinery.is_part_ki_apni_life_ghante")} />
              <select value={it.template_id || ""} onChange={(e) => updItem(i, "template_id", e.target.value)} style={inp}
                title={t("machinery.kaunsa_service_task_poora_hua_uska")}>
                <option value="">{t("machinery.task")}</option>
                {(templates || []).map((t) => <option key={t.id} value={t.id}>{t.task}</option>)}
              </select>
              <button type="button" onClick={() => setItems((p) => p.filter((_, n) => n !== i))}
                style={{ background: "none", border: "none", color: T.t4, cursor: "pointer", fontSize: 14 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => setItems((p) => [...p, { item: "", part_category: "other", cost: "", life_hours: "", template_id: "" }])}
            style={{ background: "none", border: "none", color: T.ind, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: "2px 0 10px" }}>
           {t("machinery.line")}
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label={t("machinery.labour_mechanic")}>
              <input value={f.labour_cost || ""} inputMode="decimal" onChange={(e) => upd("labour_cost", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
            </Field>
            <Field label={t("machinery.bill_no")}>
              <input value={f.invoice_no || ""} onChange={(e) => upd("invoice_no", e.target.value)} style={inp} />
            </Field>
            <FileField value={f.photo_url} onChange={(u) => { upd("photo_url", u); setBill(null); }} label={t("machinery.bill_photo_pdf")} />
          </div>

          {/* M4 — bill se bharo. Button photo lagne ke BAAD hi aata hai, aur
              apne aap nahi chalta: har baar padhne ka paisa lagta hai. */}
          {f.photo_url && (
            <div style={{ marginTop: 10 }}>
              <button type="button" onClick={readBill} disabled={reading}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid " + T.ind,
                         background: reading ? T.surfaceB : T.surface, color: T.ind,
                         fontSize: 12, fontWeight: 700, cursor: reading ? "default" : "pointer", fontFamily: "inherit" }}>
                {reading ? t("machinery.bill_padha_ja_raha_hai") : t("machinery.bill_se_khaane_bharein")}
              </button>
              <span style={{ fontSize: 10.5, color: T.t4, marginLeft: 10 }}>
               {t("machinery.bhare_hue_khaane_nahi_badlenge_sirf")}
              </span>
            </div>
          )}

          {bill && (
            <div style={{ marginTop: 10, padding: "10px 13px", borderRadius: 8, fontSize: 11.5,
                          background: bill.failed ? T.redL : bill.confidence === "high" ? T.grnL : T.ambL,
                          border: "1px solid " + (bill.failed ? T.red : bill.confidence === "high" ? T.grn : T.amb),
                          color: T.t1 }}>
              {bill.failed ? (
                <b>{bill.message}</b>
              ) : (
                <>
                  <b>{t("machinery.bill_padh_liya_added_linebill_bhari", { added: bill.added, bill: bill.added === 1 ? "" : "en", bill2: bill.read && bill.read.total_on_bill != null
                      ? `, bill par total ₹${Number(bill.read.total_on_bill).toLocaleString("en-IN")}`
                      : ", bill par total nahi mila" })}</b>
                  <div style={{ marginTop: 3 }}>{t("machinery.ye_ai_ne_padha_hai_save", { bill: bill.confidence !== "high" ? " (bharosa: " + bill.confidence + ")" : "" })}</div>
                  {(bill.warnings || []).map((w, i) => (
                    <div key={i} style={{ marginTop: 4, color: T.t2 }}>• {w}</div>
                  ))}
                </>
              )}
            </div>
          )}
          {/* Total poora likha jaata hai, fmtC ka chhota roop nahi — accounts
              isi ankde se milaan karega. */}
          <div style={{ marginTop: 10, padding: "9px 13px", background: T.surfaceB, borderRadius: 8, fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("machinery.total_total", { total: total.toLocaleString("en-IN") })}<span style={{ fontWeight: 500, color: T.t4 }}>{t("machinery.parts_partstotal_labour", { partsTotal: partsTotal.toLocaleString("en-IN") })}</span>
          </div>
        </>
      )}

      <Field label={t("common.note")}>
        <input value={f.note || ""} onChange={(e) => upd("note", e.target.value)} style={{ ...inp, marginTop: 10 }} />
      </Field>

      {error && <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{error}</div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// DOCUMENT FORM
// ══════════════════════════════════════════════════════════════════
function DocForm({ open, onClose, onSaved, machine }) {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF({ doc_type: "insurance", reminder_days: "30,15,7" });
    setError("");
  }, [open]);

  const save = async () => {
    setError("");
    if (!f.valid_till) { setError(t("machinery.valid_till_zaroori_hai")); return; }
    setBusy(true);
    try {
      const r = await api.post("/machinery/documents", {
        equipment_id: machine.id,
        doc_type: f.doc_type, doc_no: f.doc_no || null,
        provider_name: f.provider_name || null,
        valid_from: f.valid_from || null, valid_till: f.valid_till,
        amount: f.amount ? parseFloat(f.amount) : null,
        reminder_days: f.reminder_days || "30,15,7",
        photo_url: f.photo_url || null,
        note: f.note || null,
      });
      if (r && r.success) { onSaved(); onClose(); }
      else setError((r && r.message) || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  const owned = machine && String(machine.ownership || "").toLowerCase() === "owned";

  return (
    <Modal open={open} onClose={onClose} title={t("machinery.document_add_karein")}
      sub={machine ? machine.name + (machine.registration_no ? ` · ${machine.registration_no}` : "") : ""}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn><Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Btn></>}>
      {!owned && (
        <Notice>
         {t("machinery.ye_kiraye_ki_machine_hai_hum")} <b>{t("machinery.expiry_ke_liye")}</b> {t("machinery.dekhte_hain_unfit_machine_aapki_site_2")}
        </Notice>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("machinery.document")}>
          <select value={f.doc_type || "insurance"} onChange={(e) => upd("doc_type", e.target.value)} style={inp}>
            {DOC_TYPES.map((d) => <option key={d.k} value={d.k}>{d.l}</option>)}
          </select>
        </Field>
        <Field label={t("machinery.number")}>
          <input value={f.doc_no || ""} onChange={(e) => upd("doc_no", e.target.value)} placeholder={t("machinery.policy_certificate_no")} style={inp} />
        </Field>
        <Field label={t("machinery.issuer_company")}>
          <input value={f.provider_name || ""} onChange={(e) => upd("provider_name", e.target.value)} placeholder={t("machinery.e_g_bajaj_allianz")} style={inp} />
        </Field>
        <Field label={t("machinery.premium_fee")}>
          <input value={f.amount || ""} inputMode="decimal" onChange={(e) => upd("amount", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>
        <Field label={t("machinery.valid_from")}>
          <input type="date" value={f.valid_from || ""} onChange={(e) => upd("valid_from", e.target.value)} style={inp} />
        </Field>
        <Field label={t("machinery.valid_till_3")}>
          <input type="date" value={f.valid_till || ""} onChange={(e) => upd("valid_till", e.target.value)} style={inp} />
        </Field>
        <Field label={t("machinery.reminder_din_pehle")}
          hint={t("machinery.aakhri_din_aur_uska_ek_din")}>
          <input value={f.reminder_days || ""} onChange={(e) => upd("reminder_days", e.target.value)} placeholder="30,15,7" style={inp} />
        </Field>
        <FileField value={f.photo_url} onChange={(u) => upd("photo_url", u)} />
        <Field label={t("common.note")} span={2}>
          <input value={f.note || ""} onChange={(e) => upd("note", e.target.value)} style={inp} />
        </Field>
      </div>
      {error && <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{error}</div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// METER FORM
// ══════════════════════════════════════════════════════════════════
function MeterForm({ open, onClose, onSaved, machine, current }) {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF({ read_at: todayStr(), is_meter_reset: false });
    setError("");
  }, [open]);

  const save = async () => {
    setError("");
    if (!f.hours && !f.km) { setError(t("machinery.hours_ya_km_ek_to_bharein")); return; }
    setBusy(true);
    try {
      const r = await api.post("/machinery/meter", {
        equipment_id: machine.id,
        hours: f.hours ? parseFloat(f.hours) : null,
        km: f.km ? parseFloat(f.km) : null,
        read_at: f.read_at + " 12:00:00",
        is_meter_reset: f.is_meter_reset ? 1 : 0,
        meter_offset: f.is_meter_reset && current ? (current.hours ?? current.km ?? null) : null,
        note: f.note || null,
      });
      if (r && r.success) { onSaved(); onClose(); }
      else setError((r && r.message) || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("machinery.meter_reading")} width={520}
      sub={machine ? machine.name : ""}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn><Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Btn></>}>
      {current && (current.hours != null || current.km != null) && (
        <div style={{ marginBottom: 12, fontSize: 11.5, color: T.t3 }}><Rich k="machinery.abhi_ka_record_current_v_source" params={{ current: current.hours != null ? fmtN(current.hours) + " hrs" : fmtN(current.km) + " km", v: " ", source: current.source, meterAge: meterAge(current.days_old) }} /></div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("machinery.hour_meter_hrs")}>
          <input value={f.hours || ""} inputMode="decimal" onChange={(e) => upd("hours", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>
        <Field label={t("machinery.odometer_km")}>
          <input value={f.km || ""} inputMode="decimal" onChange={(e) => upd("km", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>
        <Field label={t("machinery.kis_din_ki_reading")} span={2}>
          <input type="date" value={f.read_at || ""} onChange={(e) => upd("read_at", e.target.value)} style={inp} />
        </Field>
        <div style={{ gridColumn: "span 2" }}>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={!!f.is_meter_reset} onChange={(e) => upd("is_meter_reset", e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, cursor: "pointer" }} />
            <span style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>
              <b>{t("machinery.meter_badla_reset_hua_hai")}</b>
              <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>
               {t("machinery.isse_naya_baseline_shuru_hota_hai")}
              </div>
            </span>
          </label>
        </div>
        <Field label={t("common.note")} span={2}>
          <input value={f.note || ""} onChange={(e) => upd("note", e.target.value)} style={inp} />
        </Field>
      </div>
      {error && <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{error}</div>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// MACHINE DETAIL
// ══════════════════════════════════════════════════════════════════
function MachineDetail({ id, onBack, onChanged, onEdit, parties }) {
  const [tab, setTab] = useState("ov");
  const [m, setM] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [services, setServices] = useState([]);
  const [svcDue, setSvcDue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docOpen, setDocOpen] = useState(false);
  const [meterOpen, setMeterOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcEdit, setSvcEdit] = useState(null);   // khuli service jise band karna hai
  const [svcTemplates, setSvcTemplates] = useState([]);
  const [gps, setGps] = useState(null);

  // silent = form-save ke baad ka refresh. Spinner sirf pehli baar — warna har
  // save par poori detail blank ho kar apna tab bhool jaati hai.
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const [a, b, c, d, e, g] = await Promise.all([
      api.get("/machinery/fleet/" + id).catch(() => null),
      api.get("/machinery/fleet/" + id + "/timeline").catch(() => null),
      api.get("/machinery/service?equipment_id=" + id).catch(() => null),
      api.get("/machinery/fleet/" + id + "/service-due").catch(() => null),
      api.get("/machinery/templates?equipment_id=" + id).catch(() => null),
      api.get("/telematics/machine/" + id).catch(() => null),
    ]);
    setM(a?.success ? a.data : null);
    setTimeline(b?.success ? b.data || [] : []);
    setServices(c?.success ? c.data || [] : []);
    setSvcDue(d?.success ? d.data : null);
    setSvcTemplates(e?.success ? e.data || [] : []);
    setGps(g?.success ? g.data : null);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Empty>{t("common.loading")}</Empty>;
  if (!m) return <Empty>{t("machinery.machine_nahi_mili")}</Empty>;

  const owned = m.owned;
  const docs = m.documents || [];
  // Only the longest-valid paper of each type is "current"; renewals leave the
  // older rows behind as history.
  const currentDocs = Object.values(docs.reduce((acc, d) => {
    if (!acc[d.doc_type] || new Date(d.valid_till) > new Date(acc[d.doc_type].valid_till)) acc[d.doc_type] = d;
    return acc;
  }, {}));
  const worst = currentDocs.reduce((w, d) => (w === null || d.days < w.days ? d : w), null);
  // Table me pehle wo kaagaz jo abhi chal rahe hain, sabse jaldi khatam hone
  // wala sabse upar — dekhte hi pata chale kya karna hai. History neeche.
  const curIds = new Set(currentDocs.map((d) => d.id));
  const docRows = [...docs].sort((a, b) => {
    const ac = curIds.has(a.id), bc = curIds.has(b.id);
    if (ac !== bc) return ac ? -1 : 1;
    return ac ? a.days - b.days : new Date(b.valid_till) - new Date(a.valid_till);
  });

  // Kiraye ki machine ka service vendor karta hai — uska tab dikhana matlab
  // ek khaali khaana dena jo kabhi bharega nahi. Kaagaz phir bhi dikhte hain,
  // kyunki unfit machine site par chale to zimmedari hamari hai.
  const TABS = [
    { id: "ov", l: t("common.overview") },
    ...(owned ? [{ id: "svc", l: t("machinery.service_log") }] : []),
    { id: "fuel", l: t("app.fuel") },
    { id: "usage", l: t("machinery.usage") },
    { id: "docs", l: t("common.documents") },
    // GPS tab sirf judi hui machine par — bina jod ke dikha kar "khaali
    // khaana jo kabhi nahi bharega" nahi dena (wahi niyam jo rented ke
    // service tab par laga hai). Jodna Machinery ke GPS tab se hota hai.
    ...(gps && gps.linked ? [{ id: "gps", l: "GPS" }] : []),
  ];

  // Owned se rented par jaate waqt purana tab gayab ho sakta hai — tab khaali
  // screen na dikhe.
  const activeTab = TABS.some((x) => x.id === tab) ? tab : "ov";

  const fuelRows = timeline.filter((x) => x.kind === "fuel");
  const usageRows = timeline.filter((x) => x.kind === "usage");

  return (
    <div>
      <button onClick={onBack} type="button"
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, color: T.t3, marginBottom: 10, padding: 0 }}>
       {t("machinery.fleet_par_wapas")}
      </button>

      <div style={{ background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.t1 }}>{m.name}{m.code ? ` — ${m.code}` : ""}</div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 4, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            {m.registration_no || <span style={{ color: T.amb }}>{t("machinery.registration_no_nahi_bhara")}</span>}
            <Pill label={owned ? t("machinery.owned") : t("machinery.rented")} c={owned ? T.ind : T.t3} bg={owned ? T.indL : T.sltL} />
            {/* Workshop me padi machine ka status dikhna zaroori hai — warna
                service kholne se jo badla, wo kahin dikhta hi nahi aur log
                maanenge ki kuch hua hi nahi. */}
            {m.status === "Under Repair" && <Pill label={t("machinery.under_repair")} c={T.red} bg={T.redL} />}
            {m.operator_name && <span>{t("machinery.operator_operator_name", { operator_name: m.operator_name })}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 7 }}><Rich k="machinery.meter_m" params={{ m: m.meter?.hours != null ? fmtN(m.meter.hours) + " hrs" : m.meter?.km != null ? fmtN(m.meter.km) + " km" : "—" }} />{m.meter && <span style={{ color: T.t4 }}>{t("machinery.source_se_meterage", { source: m.meter.source, meterAge: meterAge(m.meter.days_old) })}</span>}
            {m.purchase_cost ? <span>{t("machinery.purchase_fmtc", { fmtC: fmtC(m.purchase_cost) })}</span> : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          {worst && (
            <div style={{ border: `1.5px solid ${T.b1}`, borderRadius: 10, padding: "8px 12px", minWidth: 170 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.t2 }}>{docLabel(worst.doc_type)}</div>
              <div style={{ fontSize: 10, color: T.t4 }}>{expiryTone(worst.days).label} · {fmtD(worst.valid_till)}</div>
            </div>
          )}
          <Btn ghost icon={IcGauge} onClick={() => setMeterOpen(true)}>{t("machinery.meter")}</Btn>
          {onEdit && <Btn ghost onClick={() => onEdit(m)}>{t("common.edit_2")}</Btn>}
        </div>
      </div>

      {/* Record kitna poora hai — detail me kami ka poora naam dikhta hai,
          list ke chhote bar ke ulat. */}
      {m.completeness && m.completeness.missing.length > 0 && (
        <div style={{ background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 10, padding: "11px 14px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t1, marginBottom: 5 }}>{t("machinery.record_adhoora_hai")}</div>
              <div style={{ fontSize: 11, color: T.t3 }}>{t("machinery.baaki_m", { m: m.completeness.missing.map((x) => x.label).join(" · ") })}</div>
            </div>
            <div style={{ width: 130 }}><CompletenessBar c={m.completeness} compact /></div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 16, overflowX: "auto" }}>
        {TABS.map((x) => (
          <button key={x.id} type="button" onClick={() => setTab(x.id)}
            style={{ padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", whiteSpace: "nowrap", marginBottom: "-1.5px", color: activeTab === x.id ? T.ind : T.t3, borderBottom: `2px solid ${activeTab === x.id ? T.ind : "transparent"}` }}>
            {x.l}
          </button>
        ))}
      </div>

      {activeTab === "ov" && (
        <Panel title={t("machinery.timeline_fuel_usage_service_kaagaz_ek")}>
          {timeline.length === 0 && <Empty>{t("machinery.is_machine_par_abhi_koi_record")}</Empty>}
          {timeline.map((r, i) => {
            const tone = r.kind === "fuel" ? { c: T.ind, bg: T.indL, l: t("app.fuel") }
              : r.kind === "usage" ? { c: T.blu, bg: T.bluL, l: t("machinery.usage") }
              : r.kind === "service" ? { c: T.grn, bg: T.grnL, l: t("machinery.service") }
              : { c: T.slt, bg: T.sltL, l: t("machinery.document") };
            return (
              <Row key={i} cols="90px 90px 1.6fr 1fr 100px">
                <span style={{ fontSize: 11, color: T.t3 }}>{fmtD(r.at)}</span>
                <span><Pill label={tone.l} c={tone.c} bg={tone.bg} /></span>
                <span style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.who || "—"}{r.sub ? ` · ${r.sub}` : ""}
                </span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>
                  {r.litres != null ? `${fmtN(r.litres)} L` : ""}
                  {r.meter != null ? `${r.litres != null ? " · " : ""}meter ${fmtN(r.meter)}` : ""}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, textAlign: "right" }}>{r.amount != null ? fmtC(r.amount) : "—"}</span>
              </Row>
            );
          })}
        </Panel>
      )}

      {activeTab === "svc" && (
        <>
          {/* Agli service kab — task-wise. Andaza alert nahi banta: meter
              purana ho to wahi likha aata hai. */}
          {svcDue && svcDue.tasks && svcDue.tasks.length > 0 && (
            <Panel title={t("machinery.agli_service_kab")} style={{ marginBottom: 14 }}>
              <Row head cols="1.5fr 90px 1fr 1fr">
                <span>{t("machinery.task_2")}</span><span>{t("machinery.haalat")}</span><span>{t("machinery.kitna_baaki")}</span><span>{t("machinery.aakhri_baar")}</span>
              </Row>
              {svcDue.tasks.map((tk) => {
                const tone = tk.status === "overdue" ? { c: T.red, bg: T.redL, l: t("common.overdue") }
                  : tk.status === "due" ? { c: T.amb, bg: T.ambL, l: t("common.due") }
                  : tk.status === "soon" ? { c: T.amb, bg: T.ambL, l: t("machinery.jaldi") }
                  : tk.status === "unknown" ? { c: T.t3, bg: T.sltL, l: t("machinery.pata_nahi") }
                  : { c: T.grn, bg: T.grnL, l: "OK" };
                return (
                  <Row key={tk.template_id} cols="1.5fr 90px 1fr 1fr">
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>
                      {tk.task}{tk.from_part && <span style={{ fontSize: 9.5, color: T.ind, fontWeight: 700 }}> {t("machinery.part_ki_life_se")}</span>}
                    </span>
                    <span><Pill label={tone.l} c={tone.c} bg={tone.bg} /></span>
                    <span style={{ fontSize: 11.5, color: tk.remaining != null && tk.remaining < 0 ? T.red : T.t3 }}>
                      {tk.remaining == null ? (tk.reason || "—")
                        : `${tk.remaining < 0 ? Math.abs(tk.remaining) + " " : tk.remaining + " "}${tk.basis === "km" ? "km" : tk.basis === "days" ? "din" : "hrs"}${tk.remaining < 0 ? " upar" : " baaki"}`}
                      {tk.meter_stale && <span style={{ color: T.amb }}> {t("machinery.meter_purana_andaza")}</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{tk.last_service ? fmtD(tk.last_service) : t("fuel.kabhi_nahi")}</span>
                  </Row>
                );
              })}
            </Panel>
          )}
          {svcDue && svcDue.no_templates && (
            <Notice>{t("machinery.is_machine_ke_liye_koi_service", { v: " " })}<button type="button" onClick={async () => {
                const r = await api.post("/machinery/templates/seed", {}).catch(() => null);
                if (r && r.success) load(true);
                else window.alert((r && r.message) || "Seed nahi chala");
              }}
                style={{ background: "none", border: "none", color: T.ind, fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}>
               {t("machinery.aam_service_tasks_bhar_do")}
              </button>{t("machinery.v_jcb_tipper_roller_ke_standard", { v: " " })}</Notice>
          )}

          <Panel title={t("machinery.service_log")}
            action={<Btn size="sm" icon={IcWrench} onClick={() => { setSvcEdit(null); setSvcOpen(true); }}>{t("machinery.service")}</Btn>}>
            {services.length === 0 && (
              <Empty>
               {t("machinery.koi_service_darj_nahi")}<br />
                <span style={{ fontSize: 11.5 }}>{t("machinery.kaunsa_part_kab_badla_kitne_ka")}</span>
              </Empty>
            )}
            {services.length > 0 && (
              <>
                <Row head cols="92px 1.2fr 1.2fr 90px 100px 110px">
                  <span>{t("common.date")}</span><span>{t("fuel.kya_hua")}</span><span>{t("common.vendor")}</span><span>{t("common.type")}</span><span style={{ textAlign: "right" }}>{t("machinery.kharcha")}</span><span>{t("common.payment")}</span>
                </Row>
                {services.map((s) => (
                  <Row key={s.id} cols="92px 1.2fr 1.2fr 90px 100px 110px"
                    onClick={s.status === "open" ? () => { setSvcEdit(s); setSvcOpen(true); } : undefined}>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(s.service_date)}</span>
                    <span style={{ fontSize: 12, color: T.t1 }}>
                      {s.status === "open"
                        ? <Pill label={t("machinery.khuli_hai_band_karne_ko_click")} c={T.amb} bg={T.ambL} />
                        : (s.items || []).map((i) => i.item).join(", ") || s.note || "—"}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{s.vendor || "—"}</span>
                    <span style={{ fontSize: 11, color: s.service_type === "breakdown" ? T.red : T.t3 }}>{s.service_type}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, textAlign: "right" }}>{s.total_cost > 0 ? fmtC(s.total_cost) : "—"}</span>
                    <span>
                      {s.status === "open" ? <span style={{ fontSize: 11, color: T.t4 }}>—</span>
                        : s.payment_mode === "credit"
                          ? <Pill label={s.settlement_status === "paid" ? t("common.paid") : t("common.baaki")} c={s.settlement_status === "paid" ? T.grn : T.amb} bg={s.settlement_status === "paid" ? T.grnL : T.ambL} />
                          : <Pill label={t("common.cash")} c={T.slt} bg={T.sltL} />}
                    </span>
                  </Row>
                ))}
              </>
            )}
          </Panel>
        </>
      )}

      {activeTab === "fuel" && (
        <>
          <Notice>{t("machinery.ye_fuel_module_ka_hi_data")}</Notice>
          <Panel title={t("app.fuel")}>
            {fuelRows.length === 0 && <Empty>{t("machinery.is_machine_par_koi_diesel_record")}</Empty>}
            {fuelRows.length > 0 && (
              <>
                <Row head cols="100px 1.4fr 100px 110px 100px">
                  <span>{t("common.date")}</span><span>{t("fuel.kahan_se")}</span><span>{t("fuel.litres")}</span><span>{t("machinery.meter")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span>
                </Row>
                {fuelRows.map((r, i) => (
                  <Row key={i} cols="100px 1.4fr 100px 110px 100px">
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(r.at)}</span>
                    <span style={{ fontSize: 12 }}>{r.who || "—"}{r.sub ? ` (${r.sub})` : ""}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtN(r.litres)} L</span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{r.meter != null ? fmtN(r.meter) : "—"}</span>
                    <span style={{ fontSize: 12, textAlign: "right" }}>{fmtC(r.amount)}</span>
                  </Row>
                ))}
              </>
            )}
          </Panel>
        </>
      )}

      {activeTab === "usage" && (
        <Panel title={t("machinery.usage")}>
          {usageRows.length === 0 && <Empty>{t("machinery.koi_usage_entry_nahi")}</Empty>}
          {usageRows.map((r, i) => (
            <Row key={i} cols="100px 1.6fr 100px 110px">
              <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(r.at)}</span>
              <span style={{ fontSize: 12 }}>{r.who || "—"}</span>
              <span style={{ fontSize: 12 }}>{r.sub != null ? fmtN(r.sub) : "—"}</span>
              <span style={{ fontSize: 12, textAlign: "right" }}>{fmtC(r.amount)}</span>
            </Row>
          ))}
        </Panel>
      )}

      {activeTab === "docs" && (
        <Panel title={t("machinery.documents_permits")} action={<Btn size="sm" icon={IcAdd} onClick={() => setDocOpen(true)}>{t("machinery.document")}</Btn>}>
          {docs.length === 0 && (
            <Empty>
             {t("machinery.koi_kaagaz_darj_nahi")}<br />
              <span style={{ fontSize: 11.5 }}>{t("machinery.insurance_fitness_puc_permit_expiry_yahin")}</span>
            </Empty>
          )}
          {docs.length > 0 && (
            <>
              <Row head cols="1.2fr 1.3fr 110px 100px 130px">
                <span>{t("machinery.document")}</span><span>{t("machinery.number_issuer")}</span><span>{t("machinery.valid_till_2")}</span><span>{t("machinery.fee")}</span><span>{t("common.status")}</span>
              </Row>
              {docRows.map((d) => {
                const isCurrent = curIds.has(d.id);
                const tone = expiryTone(d.days);
                return (
                  <Row key={d.id} cols="1.2fr 1.3fr 110px 100px 130px">
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>
                      {docLabel(d.doc_type)}
                      {!isCurrent && <span style={{ fontSize: 10, color: T.t4, fontWeight: 500 }}> {t("machinery.purana")}</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{[d.doc_no, d.provider_name].filter(Boolean).join(" · ") || "—"}</span>
                    <span style={{ fontSize: 12 }}>{fmtD(d.valid_till)}</span>
                    <span style={{ fontSize: 12 }}>{d.amount ? fmtC(d.amount) : "—"}</span>
                    <span>{isCurrent ? <Pill label={tone.label} c={tone.c} bg={tone.bg} /> : <Pill label={t("common.history")} c={T.t3} bg={T.sltL} />}</span>
                  </Row>
                );
              })}
              <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
               {t("machinery.renewal_par_nayi_row_banti_hai")}
              </div>
            </>
          )}
        </Panel>
      )}

      {activeTab === "gps" && gps && gps.linked && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 10, padding: "9px 13px", fontSize: 11.5, color: T.t2, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: gps.unit.health === "green" ? T.grn : gps.unit.health === "amber" ? T.amb : T.red, display: "inline-block" }} />
              <b>{gps.unit.unit_name}</b>
              <span style={{ color: T.t4 }}>{t("machinery.aakhri_data_gps", { gps: gps.unit.last_data_at ? fmtD(gps.unit.last_data_at) : "kabhi nahi" })}</span>
            </div>
            {gps.unit.has_fls ? (
              <div style={{ background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 10, padding: "9px 13px", fontSize: 11.5 }}><Rich k="machinery.sensor_kharcha_gps" params={{ gps: gps.lph != null ? `${fmtN(gps.lph)} L/hr` : "—" }} />{gps.norm_lph != null && gps.lph != null && (
                  <span style={{ marginLeft: 6, color: gps.lph > gps.norm_lph * 1.15 ? T.red : T.grn, fontWeight: 700 }}>{t("machinery.norm_fmtn", { fmtN: fmtN(gps.norm_lph) })}</span>
                )}
              </div>
            ) : (
              <div style={{ background: T.sltL, borderRadius: 10, padding: "9px 13px", fontSize: 11.5, color: T.t3 }}>
               {t("machinery.is_unit_par_fuel_sensor_nahi")}
              </div>
            )}
          </div>

          <Panel title={t("machinery.roz_ka_sensor_data_pichhle_14")} style={{ marginBottom: 14 }}>
            {gps.daily.length === 0 && <Empty>{t("machinery.abhi_koi_din_ka_data_nahi")}</Empty>}
            {gps.daily.length > 0 && (
              <>
                <Row head cols="100px 1fr 1fr 1fr 1fr 1fr 1.4fr">
                  <span>{t("fuel.din")}</span><span>{t("machinery.engine")}</span><span>{t("machinery.chali_km")}</span><span>{t("machinery.diesel_piya")}</span><span>{t("fuel.bhara_2")}</span><span>{t("machinery.drop")}</span><span>{t("fuel.kahan")}</span>
                </Row>
                {gps.daily.map((d) => (
                  <Row key={d.day} cols="100px 1fr 1fr 1fr 1fr 1fr 1.4fr">
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(d.day)}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{d.engine_sec > 0 ? `${Math.floor(d.engine_sec / 3600)}:${String(Math.floor((d.engine_sec % 3600) / 60)).padStart(2, "0")} hrs` : "—"}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{Number(d.mileage_km) > 0 ? fmtN(d.mileage_km) : "—"}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{Number(d.consumed_l) > 0 ? fmtN(d.consumed_l) + " L" : "—"}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: Number(d.filled_l) > 0 ? T.grn : T.t2 }}>{Number(d.filled_l) > 0 ? "+" + fmtN(d.filled_l) + " L" : "—"}</span>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: Number(d.theft_l) > 0 ? T.red : T.t2 }}>{Number(d.theft_l) > 0 ? "−" + fmtN(d.theft_l) + " L" : "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={d.trip_from && d.trip_to && d.trip_from !== d.trip_to ? `${d.trip_from} → ${d.trip_to}` : undefined}>
                      {d.park_location || d.trip_to || "—"}
                      {d.trip_from && d.trip_to && d.trip_from !== d.trip_to && <span style={{ color: T.t4 }}>{t("machinery.chali_trip_from_trip_to", { trip_from: d.trip_from, trip_to: d.trip_to })}</span>}
                    </span>
                  </Row>
                ))}
              </>
            )}
          </Panel>

          <Panel title={t("machinery.fuel_events_bharna_aur_drop")}>
            {gps.events.length === 0 && <Empty>{t("machinery.is_duration_me_koi_fill_drop")}</Empty>}
            {gps.events.map((ev) => (
              <Row key={ev.id} cols="130px 90px 1fr 1.2fr">
                <span style={{ fontSize: 11, color: T.t3 }}>{String(ev.event_time).replace("T", " ").slice(0, 16)}</span>
                <span>{ev.event_type === "fill"
                  ? <Pill label={"+" + fmtN(ev.litres) + " L"} c={T.grn} bg={T.grnL} />
                  : <Pill label={"−" + fmtN(ev.litres) + " L"} c={T.red} bg={T.redL} />}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{ev.location_text || "—"}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>
                  {ev.event_type === "fill"
                    ? (ev.matched_fuel_entry_id ? t("machinery.fuel_entry_se_mila") : t("machinery.entry_nahi_mili_cross_check_me"))
                    : ev.review_status === "ok" ? t("machinery.jaanch_ho_chuki_theek_tha") : t("machinery.jaanch_baaki_fuel_cross_check")}
                </span>
              </Row>
            ))}
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
             {t("machinery.drop_engine_band_tha_aur_tank")}
            </div>
          </Panel>
        </>
      )}

      <DocForm open={docOpen} onClose={() => setDocOpen(false)} machine={m}
        onSaved={() => { load(true); onChanged && onChanged(); }} />
      <MeterForm open={meterOpen} onClose={() => setMeterOpen(false)} machine={m} current={m.meter}
        onSaved={() => { load(true); onChanged && onChanged(); }} />
      <ServiceForm open={svcOpen} onClose={() => { setSvcOpen(false); setSvcEdit(null); }}
        machine={m} parties={parties} existing={svcEdit} templates={svcTemplates}
        onSaved={() => { load(true); onChanged && onChanged(); }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODULE
// ══════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// REPORTS — Usage Register aur Log Sheet
//
// Har report ki ek hi shakl: upar filter, neeche table, aur export ke teen
// button. Button WAHI filter bhejte hain jo screen par lage hain, isliye
// download hamesha utna hi hota hai jitna user dekh raha tha.
//
// Ye helpers is module ke apne hain (Fuel ke apne alag) — module
// independence ka wahi niyam jo baaki module follow karte hain.
// ══════════════════════════════════════════════════════════════════

const qs = (params) => Object.entries(params || {})
  .filter(([, v]) => v !== "" && v != null)
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

// Filter ka naam file ke naam me — Downloads me teen "report.pdf" padi hon to
// koi nahi bata sakta kaunsi kis cheez ki hai.
const slug = (s) => String(s || "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);

async function fetchReportPdf(path, params) {
  const res = await fetch(`${API_BASE}${path}?${qs(params)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    let msg = `PDF nahi bana (${res.status})`;
    try { const j = await res.json(); if (j?.message) msg = j.message; } catch (e) { /* binary/HTML */ }
    throw new Error(msg);
  }
  return res.blob();
}

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

const exportExcel = async (rows, columns, filename, sheet = "Report") => {
  // Lazy import — xlsx bhaari hai aur Machinery khulte hi iski zaroorat nahi
  // (yahi tarika import wizard bhi use karta hai).
  const XLSX = await import("xlsx");
  const aoa = [columns.map((c) => c.label),
    ...rows.map((r) => columns.map((c) => (c.excel ? c.excel(r) : r[c.key] ?? "")))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = columns.map((c) => ({ wch: c.w || 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename.replace(/\.pdf$/, "") + ".xlsx");
};

// WhatsApp par PDF: jahan browser file share kar sakta hai (mobile) wahan wahi
// file jaati hai. Desktop Chrome file share nahi karta — wahan PDF download
// hoti hai aur WhatsApp khul jaata hai, taaki user khud attach kar le.
// Chup-chaap sirf link bhejna galat hota: link kholne ke liye login chahiye.
async function sharePdf(blob, filename, caption) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename, text: caption }); return "shared"; }
    catch (e) { if (e?.name === "AbortError") return "cancelled"; }
  }
  saveBlob(blob, filename);
  window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, "_blank", "noopener");
  return "downloaded";
}

const IcSheet = (p) => <Ic {...p} d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />;
const IcFile  = (p) => <Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" />;
const IcWa    = (p) => <Ic {...p} d="M21 11.5a8.4 8.4 0 01-12.5 7.3L3 20.5l1.8-5.3A8.4 8.4 0 1121 11.5z" />;

const RFilterBar = ({ children, chips, onClear }) => (
  <div style={{ background: T.surfaceB || "#F8F9FB", border: `1px solid ${T.b1}`, borderRadius: 9, padding: "10px 12px", display: "grid", gap: 9 }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>{children}</div>
    {chips.length > 0 && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", borderTop: `1px solid ${T.b1}`, paddingTop: 8 }}>
        <span style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("fuel.lage_hue_filter")}</span>
        {chips.map((c, i) => (
          <span key={i} style={{ background: T.indL, color: T.ind, border: `1px solid ${T.indM || T.b1}`, borderRadius: 20, padding: "2px 9px", fontSize: 10.5, fontWeight: 600 }}>
            {c.k}: {c.v}
          </span>
        ))}
        <span onClick={onClear} style={{ fontSize: 10.5, color: T.t3, cursor: "pointer", textDecoration: "underline", marginLeft: 4 }}>{t("fuel.sab_hatao")}</span>
      </div>
    )}
  </div>
);

const RLbl = ({ children }) => (
  <div style={{ fontSize: 9.5, color: T.t4, marginBottom: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>{children}</div>
);

const RSel = ({ label, value, onChange, options, w = 150, placeholder = "Sab" }) => (
  <div>
    <RLbl>{label}</RLbl>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, width: w, padding: "6px 8px", fontSize: 11.5 }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const RInp = ({ label, value, onChange, w = 130, type = "text", ph }) => (
  <div>
    <RLbl>{label}</RLbl>
    <input type={type} value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, width: w, padding: "6px 8px", fontSize: 11.5 }} />
  </div>
);

// PDF server par banti hai aur usme 2-3 second lagte hain — isliye button chup
// nahi rehta, "ban rahi..." dikhata hai.
function ExportBar({ rows, columns, pdfPath, params, baseName, caption, disabled, disabledWhy }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const empty = disabled || !rows || rows.length === 0;
  const fname = [baseName, slug(params.from), params.to ? "to-" + slug(params.to) : "",
    slug(params.sector)].filter(Boolean).join("-");

  const run = async (kind) => {
    setBusy(kind); setMsg(null);
    try {
      if (kind === "xls") {
        await exportExcel(rows, columns, fname, baseName);
        setMsg({ ok: true, t: t("fuel.excel_ban_gayi") });
      } else {
        const blob = await fetchReportPdf(pdfPath, params);
        if (kind === "pdf") { saveBlob(blob, fname + ".pdf"); setMsg({ ok: true, t: t("fuel.pdf_ban_gayi") }); }
        else {
          const how = await sharePdf(blob, fname + ".pdf", caption);
          if (how === "downloaded") setMsg({ ok: true, t: t("fuel.pdf_download_ho_gayi_whatsapp_me") });
          else if (how === "shared") setMsg({ ok: true, t: t("fuel.bhej_di") });
        }
      }
    } catch (e) { setMsg({ ok: false, t: e.message || "Nahi ho paya" }); }
    setBusy("");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
      {empty && disabledWhy && <span style={{ fontSize: 10.5, color: T.t4 }}>{disabledWhy}</span>}
      {msg && <span style={{ fontSize: 10.5, fontWeight: 600, color: msg.ok ? T.grn : T.red }}>{msg.t}</span>}
      <Btn size="sm" ghost icon={IcSheet} disabled={empty || !!busy} onClick={() => run("xls")}>{t("common.excel")}</Btn>
      <Btn size="sm" ghost icon={IcFile} disabled={empty || !!busy} onClick={() => run("pdf")}>
        {busy === "pdf" ? t("fuel.ban_rahi") : "PDF"}
      </Btn>
      <Btn size="sm" c={T.grn} icon={IcWa} disabled={empty || !!busy} onClick={() => run("wa")}>
        {busy === "wa" ? "..." : t("common.whatsapp")}
      </Btn>
    </div>
  );
}

// ── Report 1: USAGE REGISTER ──────────────────────────────────────
const EMPTY_UF = { project_id: "", equipment_id: "", ownership: "", measurement_mode: "", sector: "" };
const MODE_OPTS = [
  { v: "hourly", get l() { return t("machinery.ghante"); } }, { v: "daily", get l() { return t("machinery.din"); } }, { v: "monthly", get l() { return t("machinery.mahina"); } },
  { v: "km", l: "KM" }, { v: "trip", get l() { return t("machinery.trip"); } }, { v: "fixed", get l() { return t("machinery.lump_sum"); } },
];

function UsageRegister({ fleet, projects, from, to, onRange }) {
  const [f, setF] = useState(EMPTY_UF);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const params = useMemo(() => ({ from, to, ...f }), [from, to, f]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/machinery/reports/usage-register?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};
  const COLS = [
    { key: "date", label: t("common.date"), w: 11 },
    { key: "machine", label: t("fuel.machine"), w: 22 },
    { key: "registration_no", label: t("machinery.gadi_no"), w: 14 },
    { key: "ownership", label: t("common.ownership"), w: 11 },
    { key: "project", label: t("common.project"), w: 20 },
    { key: "sector", label: t("common.sector"), w: 10 },
    { key: "qty", label: t("common.qty"), w: 9 },
    { key: "qty_unit", label: t("common.unit"), w: 8 },
    { key: "meter", label: t("machinery.meter"), w: 16 },
    { key: "rate", label: t("common.rate"), w: 10 },
    { key: "amount", label: t("common.amount_2"), w: 12, excel: (r) => (r.amount == null ? "" : Math.round(r.amount)) },
    { key: "vendor", label: t("common.vendor"), w: 20 },
    { key: "operator", label: t("machinery.operator"), w: 16 },
    { key: "entered_by", label: t("fuel.kisne_bhara"), w: 16 },
    { key: "remark", label: t("common.remark"), w: 30 },
  ];
  const cols = "76px 1.5fr 1fr 78px 1.1fr 66px 84px 108px 74px 92px 1fr";

  return (
    <div style={{ display: "grid", gap: 11 }}>
      <RFilterBar chips={data?.applied || []} onClear={() => setF(EMPTY_UF)}>
        <div>
          <RLbl>{t("fuel.se_tak")}</RLbl>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="date" value={from} onChange={(e) => onRange(e.target.value, to)}
              style={{ ...inp, width: 136, padding: "6px 9px", fontSize: 11.5 }} />
            <span style={{ fontSize: 11, color: T.t4 }}>se</span>
            <input type="date" value={to} onChange={(e) => onRange(from, e.target.value)}
              style={{ ...inp, width: 136, padding: "6px 9px", fontSize: 11.5 }} />
          </div>
        </div>
        <RSel label={t("common.project")} value={f.project_id} onChange={(v) => set("project_id", v)}
          options={projects.map((x) => ({ v: x.id, l: x.name }))} />
        <RSel label={t("fuel.machine")} value={f.equipment_id} onChange={(v) => set("equipment_id", v)}
          options={fleet.map((x) => ({ v: x.id, l: x.name }))} />
        <RSel label={t("common.ownership")} value={f.ownership} onChange={(v) => set("ownership", v)}
          options={[{ v: "owned", l: t("machinery.apni") }, { v: "rented", l: t("machinery.kiraye_ki") }]} w={120} />
        <RSel label={t("machinery.rate_type")} value={f.measurement_mode} onChange={(v) => set("measurement_mode", v)}
          options={MODE_OPTS} w={120} />
        <RInp label={t("common.sector")} value={f.sector} onChange={(v) => set("sector", v)} w={95} ph="15" />
      </RFilterBar>

      <Panel title={loading ? t("machinery.usage_register_laa_rahe_hain") : `Usage Register — ${rows.length} entry`}
        action={<ExportBar rows={rows} columns={COLS} pdfPath="/machinery/reports/usage-register.pdf"
          params={params} baseName="usage-register"
          caption={`Machine Usage Register${from ? ` ${from} se ${to}` : ""} — Sanchalan`} />}>
        {!loading && rows.length === 0 && <Empty>{t("fuel.is_filter_par_koi_entry_nahi")}</Empty>}
        {rows.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{tot.entries} entry</span>
              {/* Ghante sirf ghante wali machine ke, din sirf din wali ke —
                  alag unit ka jod ek jhooth hota. */}
              {tot.hours > 0 && <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.ghante")} <b style={{ color: T.t1 }}>{fmtN(tot.hours)}</b></span>}
              {tot.days > 0 && <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.din")} <b style={{ color: T.t1 }}>{fmtN(tot.days)}</b></span>}
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.kul")} <b style={{ color: T.t1 }}>{fmtC(tot.amount)}</b></span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1140 }}>
                <Row head cols={cols}>
                  <span>{t("common.date")}</span><span>{t("fuel.machine")}</span><span>{t("common.project")}</span><span>{t("fuel.own")}</span>
                  <span>{t("common.vendor")}</span><span>{t("common.sector")}</span>
                  <span style={{ textAlign: "right" }}>{t("common.qty")}</span><span style={{ textAlign: "right" }}>{t("machinery.meter")}</span>
                  <span style={{ textAlign: "right" }}>{t("common.rate")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span>
                  <span>{t("common.remark")}</span>
                </Row>
                {rows.map((r, i) => (
                  <Row key={i} cols={cols}>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{r.date}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{r.machine}</div>
                      {r.registration_no && <div style={{ fontSize: 10, color: T.t4 }}>{r.registration_no}</div>}
                    </div>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{r.project || "—"}</span>
                    <span>{r.ownership
                      ? <Pill label={r.ownership === "Owned" ? t("machinery.apni") : t("machinery.kiraye")} c={r.ownership === "Owned" ? T.ind : T.t3} bg={r.ownership === "Owned" ? T.indL : T.sltL} />
                      : <span style={{ fontSize: 11, color: T.t4 }}>—</span>}</span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{r.vendor || "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{r.sector || "—"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>
                      {r.qty != null ? `${fmtN(r.qty)} ${r.qty_unit}` : "—"}
                    </span>
                    <span style={{ fontSize: 11, color: T.t4, textAlign: "right" }}>{r.meter || "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{r.rate != null ? fmtN(r.rate) : "—"}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, textAlign: "right" }}>{r.amount != null ? fmtC(r.amount) : "—"}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{r.remark || "—"}</span>
                  </Row>
                ))}
              </div>
            </div>
            {tot.truncated && (
              <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.amb, background: T.ambL }}>
               {t("fuel.bahut_zyada_entry_hain_sirf_pehli")}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

// ── Report 2: LOG SHEET (kaagaz wali sheet) ───────────────────────
function LogSheetReport({ fleet, from, to, onRange }) {
  const [machineId, setMachineId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const params = useMemo(() => ({ equipment_id: machineId, from, to }), [machineId, from, to]);

  useEffect(() => {
    if (!machineId) { setData(null); return; }
    let dead = false;
    setLoading(true);
    api.get(`/machinery/reports/log-sheet?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params, machineId]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};
  const COLS = [
    { key: "date", label: t("common.date"), w: 12 },
    { key: "party_name", label: t("machinery.party_name"), w: 22 },
    { key: "start_reading", label: t("common.start"), w: 10 },
    { key: "stop_reading", label: t("machinery.stop"), w: 10 },
    { key: "hours", label: t("machinery.hours"), w: 9 },
    { key: "diesel", label: t("machinery.diesel"), w: 9 },
    { key: "pump_name", label: t("machinery.pump_name"), w: 18 },
    { key: "sector", label: t("common.sector"), w: 10 },
    { key: "remark", label: t("common.remark"), w: 34 },
  ];
  const cols = "82px 1.2fr 74px 74px 66px 70px 1fr 74px 1.5fr";
  const machine = fleet.find((m) => String(m.id) === String(machineId));

  return (
    <div style={{ display: "grid", gap: 11 }}>
      <RFilterBar chips={machine ? [{ k: "Machine", v: machine.name }, { k: "Se–Tak", v: `${from} → ${to}` }] : []}
        onClear={() => setMachineId("")}>
        <RSel label={t("fuel.machine")} value={machineId} onChange={setMachineId}
          options={fleet.map((x) => ({ v: x.id, l: x.name }))} w={230} placeholder={t("machinery.machine_chuniye")} />
        <div>
          <RLbl>{t("fuel.se_tak")}</RLbl>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="date" value={from} onChange={(e) => onRange(e.target.value, to)}
              style={{ ...inp, width: 136, padding: "6px 9px", fontSize: 11.5 }} />
            <span style={{ fontSize: 11, color: T.t4 }}>se</span>
            <input type="date" value={to} onChange={(e) => onRange(from, e.target.value)}
              style={{ ...inp, width: 136, padding: "6px 9px", fontSize: 11.5 }} />
          </div>
        </div>
      </RFilterBar>

      <Panel
        title={machine ? `${machine.name} — Log Sheet` : t("machinery.log_sheet")}
        action={<ExportBar rows={rows} columns={COLS} pdfPath="/machinery/reports/log-sheet.pdf"
          params={params} baseName={`log-sheet-${slug(machine?.name)}`}
          disabled={!machineId} disabledWhy={!machineId ? "Pehle machine chuniye" : ""}
          caption={`${machine?.name || "Machine"} log sheet ${from} se ${to} — Sanchalan`} />}>

        {!machineId && <Empty>{t("machinery.upar_se_ek_machine_chuniye_us")}</Empty>}
        {machineId && loading && <Empty>{t("fuel.laa_rahe_hain")}</Empty>}
        {machineId && !loading && rows.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t("machinery.kaam_ke_din")} <b style={{ color: T.t1 }}>{tot.work_days} / {tot.total_days}</b></span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.ghante")} <b style={{ color: T.t1 }}>{fmtN(tot.hours)}</b></span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t("machinery.diesel")} <b style={{ color: T.t1 }}>{fmtN(tot.diesel)} L</b></span>
              <span style={{ fontSize: 11.5, color: T.t2 }}><Rich k="machinery.l_hr_litres_per_hour" params={{ litres_per_hour: tot.litres_per_hour == null ? "—" : tot.litres_per_hour }} /></span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 980 }}>
                <Row head cols={cols}>
                  <span>{t("common.date")}</span><span>{t("machinery.party_name")}</span>
                  <span style={{ textAlign: "right" }}>{t("common.start")}</span><span style={{ textAlign: "right" }}>{t("machinery.stop")}</span>
                  <span style={{ textAlign: "right" }}>{t("machinery.hours")}</span><span style={{ textAlign: "right" }}>{t("machinery.diesel")}</span>
                  <span>{t("machinery.pump_name")}</span><span>{t("common.sector")}</span><span>{t("common.remark")}</span>
                </Row>
                {rows.map((r, i) => (
                  <Row key={i} cols={cols}>
                    <span style={{ fontSize: 11.5, color: r.worked ? T.t2 : T.t4 }}>{r.date}</span>
                    <span style={{ fontSize: 11.5, color: r.worked ? T.t2 : T.t4 }}>{r.party_name || "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{r.start_reading ?? "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{r.stop_reading ?? "—"}</span>
                    <span style={{ fontSize: 12, fontWeight: r.hours ? 700 : 400, color: r.hours ? T.t1 : T.t4, textAlign: "right" }}>{r.hours || 0}</span>
                    <span style={{ fontSize: 12, fontWeight: r.diesel ? 600 : 400, color: r.diesel ? T.t1 : T.t4, textAlign: "right" }}>{r.diesel || 0}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{r.pump_name || "—"}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>{r.sector || "—"}</span>
                    <span style={{ fontSize: 11, color: r.worked ? T.t3 : T.t4 }}>{r.remark || (r.worked ? "—" : t("machinery.no_work"))}</span>
                  </Row>
                ))}
              </div>
            </div>
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
             {t("machinery.har_din_ki_row_hai_kaam")}
            </div>
          </>
        )}
        {machineId && !loading && rows.length === 0 && (
          <Empty>{t("machinery.is_duration_me_is_machine_ka")}</Empty>
        )}
      </Panel>
    </div>
  );
}

// ── Report 3: FLEET SUMMARY ───────────────────────────────────────
// "Kaunsi machine par dhyan dena hai" ka jawab ek row me. Ye jawab aaj Fleet
// tab (kaagaz + meter), Insights (Rs/hr) aur Reminders me bata hua hai —
// yahan sab ek saath aata hai, aur wahi PDF/Excel me jaata hai.
const EMPTY_FS = { ownership: "", status: "", attention: "" };
const STATUS_OPTS = [
  { v: "Available", get l() { return t("machinery.available"); } },
  { v: "In Use", get l() { return t("machinery.in_use"); } },
  { v: "Under Repair", get l() { return t("machinery.under_repair"); } },
  { v: "Idle", get l() { return t("machinery.idle"); } },
];

function FleetSummary({ from, to, onRange }) {
  const [f, setF] = useState(EMPTY_FS);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const params = useMemo(() => ({ from, to, ...f }), [from, to, f]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/machinery/reports/fleet-summary?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};

  const COLS = [
    { key: "machine", label: t("fuel.machine"), w: 22 },
    { key: "registration_no", label: t("machinery.gadi_no"), w: 14 },
    { key: "ownership", label: t("common.ownership"), w: 11 },
    { key: "vendor", label: t("common.vendor"), w: 20 },
    { key: "status", label: t("common.status"), w: 13 },
    { key: "meter_value", label: t("machinery.meter"), w: 11, excel: (r) => r.meter_value ?? "" },
    { key: "meter_unit", label: t("common.unit"), w: 8 },
    { key: "run", label: t("machinery.chali"), w: 10, excel: (r) => r.run ?? "" },
    { key: "litres", label: t("machinery.diesel_l"), w: 10 },
    { key: "fuel_amount", label: t("fuel.diesel_rs"), w: 12, excel: (r) => Math.round(r.fuel_amount) },
    { key: "service_amount", label: t("machinery.service_rs"), w: 12, excel: (r) => Math.round(r.service_amount) },
    { key: "hire_paid", label: t("machinery.kiraya_rs"), w: 12, excel: (r) => Math.round(r.hire_paid) },
    { key: "total_cost", label: t("fuel.kul_rs"), w: 12, excel: (r) => Math.round(r.total_cost) },
    { key: "cost_per_unit", label: t("machinery.rs_unit"), w: 11, excel: (r) => r.cost_per_unit ?? "" },
    { key: "recovery", label: t("machinery.recovery_rs"), w: 12, excel: (r) => (r.recovery == null ? "" : Math.round(r.recovery)) },
    { key: "breakdowns", label: t("machinery.breakdown"), w: 10 },
    { key: "doc_text", label: t("machinery.kaagaz"), w: 26 },
    { key: "why", label: t("common.note"), w: 30,
      excel: (r) => (r.cost_per_unit == null ? (r.run_reason || "Rs/unit nikal nahi saka") : "") },
  ];
  const cols = "1.5fr 84px 1fr 88px 78px 80px 84px 84px 86px 1.1fr";

  return (
    <div style={{ display: "grid", gap: 11 }}>
      <RFilterBar chips={data?.applied || []} onClear={() => setF(EMPTY_FS)}>
        <div>
          <RLbl>{t("fuel.se_tak")}</RLbl>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="date" value={from} onChange={(e) => onRange(e.target.value, to)}
              style={{ ...inp, width: 136, padding: "6px 9px", fontSize: 11.5 }} />
            <span style={{ fontSize: 11, color: T.t4 }}>se</span>
            <input type="date" value={to} onChange={(e) => onRange(from, e.target.value)}
              style={{ ...inp, width: 136, padding: "6px 9px", fontSize: 11.5 }} />
          </div>
        </div>
        <RSel label={t("common.ownership")} value={f.ownership} onChange={(v) => set("ownership", v)}
          options={[{ v: "owned", l: t("machinery.apni") }, { v: "rented", l: t("machinery.kiraye_ki") }]} w={120} />
        <RSel label={t("common.status")} value={f.status} onChange={(v) => set("status", v)} options={STATUS_OPTS} w={140} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.t2, cursor: "pointer", paddingBottom: 6 }}>
          <input type="checkbox" checked={f.attention === "1"}
            onChange={(e) => set("attention", e.target.checked ? "1" : "")} />
         {t("machinery.sirf_dhyan_dene_layak")}
        </label>
      </RFilterBar>

      <Panel title={loading ? t("machinery.fleet_summary_laa_rahe_hain") : `Fleet Summary — ${rows.length} machine`}
        action={<ExportBar rows={rows} columns={COLS} pdfPath="/machinery/reports/fleet-summary.pdf"
          params={params} baseName="fleet-summary"
          caption={`Fleet Summary${from ? ` ${from} se ${to}` : ""} — Sanchalan`} />}>
        {!loading && rows.length === 0 && <Empty>{t("machinery.is_filter_par_koi_machine_nahi")}</Empty>}
        {rows.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.t2 }}>
                {tot.machines} machine <span style={{ color: T.t4 }}>{t("machinery.apni_owned_kiraye_rented", { owned: tot.owned, rented: tot.rented })}</span>
              </span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t("machinery.kul_kharcha")} <b style={{ color: T.t1 }}>{fmtC(tot.total_cost)}</b></span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t("machinery.diesel_fmtn_l", { fmtN: fmtN(tot.litres) })}</span>
              {tot.docs_due > 0 && (
                <span style={{ fontSize: 11.5, color: T.amb, fontWeight: 600 }}>{t("machinery.docs_due_ka_kaagaz_30_din", { docs_due: tot.docs_due })}</span>
              )}
              {/* Adhoorapan chhupana nahi — report kis had tak bharosemand hai
                  ye padhne wale ko pata hona chahiye. */}
              {tot.no_rate > 0 && (
                <span style={{ fontSize: 11.5, color: T.t3 }}>{t("machinery.no_rate_ka_rs_unit_nikal", { no_rate: tot.no_rate })}</span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1120 }}>
                <Row head cols={cols}>
                  <span>{t("fuel.machine")}</span><span>{t("fuel.own")}</span><span>{t("machinery.status_vendor")}</span>
                  <span style={{ textAlign: "right" }}>{t("machinery.meter")}</span><span style={{ textAlign: "right" }}>{t("machinery.chali")}</span>
                  <span style={{ textAlign: "right" }}>{t("machinery.diesel")}</span><span style={{ textAlign: "right" }}>{t("machinery.service")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.kul")}</span><span style={{ textAlign: "right" }}>{t("machinery.rs_unit")}</span>
                  <span>{t("machinery.kaagaz")}</span>
                </Row>
                {rows.map((r) => {
                  const docBad = r.doc_days != null && r.doc_days < 0;
                  const docSoon = r.doc_days != null && r.doc_days >= 0 && r.doc_days <= 30;
                  return (
                    <Row key={r.equipment_id} cols={cols}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{r.machine}</div>
                        <div style={{ fontSize: 10.5, color: T.t4 }}>
                          {r.registration_no || r.machine_type || "—"}
                          {r.breakdowns > 0 && <span style={{ color: T.red }}> · {r.breakdowns} breakdown</span>}
                        </div>
                      </div>
                      <span><Pill label={r.owned ? t("machinery.apni") : t("machinery.kiraye")} c={r.owned ? T.ind : T.t3} bg={r.owned ? T.indL : T.sltL} /></span>
                      <span style={{ fontSize: 11, color: T.t3 }}>
                        {r.status === "Under Repair"
                          ? <Pill label={t("machinery.under_repair")} c={T.red} bg={T.redL} />
                          : (r.status || "—")}
                        {r.vendor && <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>{r.vendor}</div>}
                      </span>
                      <span style={{ fontSize: 11.5, textAlign: "right", color: r.meter_age_days > 30 ? T.amb : T.t3 }}>
                        {r.meter_value != null ? fmtN(r.meter_value) : "—"}
                        {r.meter_age_days != null && r.meter_age_days > 30 && (
                          <div style={{ fontSize: 9.5 }}>{t("machinery.meter_age_days_din_purani", { meter_age_days: r.meter_age_days })}</div>
                        )}
                      </span>
                      <span style={{ fontSize: 11.5, color: T.t2, textAlign: "right" }}>
                        {r.run != null ? fmtN(r.run) + (r.run_unit ? " " + r.run_unit : "") : "—"}
                      </span>
                      <span style={{ fontSize: 11.5, color: T.t2, textAlign: "right" }}>
                        {r.litres ? fmtN(r.litres) + " L" : "—"}
                        {r.fuel_amount ? <div style={{ fontSize: 10, color: T.t4 }}>{fmtC(r.fuel_amount)}</div> : null}
                      </span>
                      <span style={{ fontSize: 11.5, color: T.t2, textAlign: "right" }}>
                        {r.service_amount ? fmtC(r.service_amount) : "—"}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtC(r.total_cost)}</span>
                      <span style={{ textAlign: "right" }}>
                        {r.cost_per_unit == null
                          ? <span title={r.run_reason || ""} style={{ fontSize: 10, color: T.t4 }}>{t("machinery.nikla_nahi")}</span>
                          : <>
                              <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{fmtN(r.cost_per_unit)}</div>
                              {r.recovery_per_unit != null && (
                                <div style={{ fontSize: 9.5, color: r.covers_cost ? T.grn : T.red }}>
                                  vasooli {fmtN(r.recovery_per_unit)}
                                </div>
                              )}
                            </>}
                      </span>
                      <span style={{ fontSize: 11 }}>
                        {docBad ? <Pill label={r.doc_text} c={T.red} bg={T.redL} />
                          : docSoon ? <Pill label={r.doc_text} c={T.amb} bg={T.ambL} />
                          : <span style={{ color: T.t3 }}>{r.doc_text}</span>}
                      </span>
                    </Row>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
             {t("machinery.kharcha_apni_machine_par_diesel_service")}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

function ReportsTab({ fleet, projects, from, to, onRange }) {
  const [sub, setSub] = useState("summary");
  const SUBS = [
    { id: "summary", l: t("machinery.fleet_summary") },
    { id: "usage", l: t("machinery.usage_register") },
    { id: "log", l: t("machinery.log_sheet") },
  ];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SUBS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSub(s.id)}
            style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${sub === s.id ? T.ind : T.b1}`, background: sub === s.id ? T.ind : T.surface, color: sub === s.id ? "white" : T.t2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {s.l}
          </button>
        ))}
      </div>
      {sub === "summary" && <FleetSummary from={from} to={to} onRange={onRange} />}
      {sub === "usage" && <UsageRegister fleet={fleet} projects={projects} from={from} to={to} onRange={onRange} />}
      {sub === "log" && <LogSheetReport fleet={fleet} from={from} to={to} onRange={onRange} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// GPS TAB — telematics register aur machine se jod
//
// Do register hain: equipment_master (aadmi bharta hai) aur telematics_unit
// (vendor sync khud bharta hai). Ye tab dono ko MILATA hai — jod kabhi apne
// aap nahi hoti, har jod ka button aadmi dabata hai. Matcher sirf sujhav
// deta hai; Ratna ke asli data me number-same-naam-alag (KRISHNA HYDRA =
// "Thakur Crane5578") aur naam-same-number-alag (VIRENDRA JCB3DX vs 4536)
// dono nikle the — isliye bharosa button par nahi, aadmi par hai.
// ══════════════════════════════════════════════════════════════════

function TeleConfigForm({ existing, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    base_url: existing?.base_url || "https://",
    resource_id: existing?.resource_id || "",
    api_token: "",
    groups: existing?.groups?.length ? existing.groups : [{ objectId: "", label: "" }],
  }));
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState("");
  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const updGroup = (i, k, v) => setF((p) => {
    const groups = p.groups.map((g, j) => (j === i ? { ...g, [k]: v } : g));
    return { ...p, groups };
  });

  const body = () => ({
    base_url: f.base_url.trim(),
    resource_id: f.resource_id.trim(),
    api_token: f.api_token.trim() || undefined,
    groups: f.groups.filter((g) => String(g.objectId).trim()),
  });

  const test = async () => {
    setTesting(true); setError(""); setTestResult(null);
    const r = await api.post("/telematics/config/test", body());
    setTesting(false);
    if (!r || r.success === false) { setError(r?.message || "Vendor se jawab nahi mila"); return; }
    setTestResult(r.data);
  };

  const save = async () => {
    setBusy(true); setError("");
    const r = await api.post("/telematics/config", body());
    setBusy(false);
    if (!r || r.success === false) { setError(r?.message || "Save nahi hua"); return; }
    onSaved();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("machinery.api_base_url")} span={2} hint={t("machinery.vendor_ke_diye_url_ka_shuru")}>
          <input value={f.base_url} onChange={(e) => upd("base_url", e.target.value)} placeholder="https://api.vendor.in:5000" style={inp} />
        </Field>
        <Field label={t("machinery.api_token")} span={2}
          hint={existing?.api_token_set
            ? `Abhi set hai (${existing.api_token_masked}). Badalna ho tabhi naya daalein — khaali chhodne par purana bana rahega.`
            : t("machinery.vendor_ke_url_me_token_wala")}>
          <input type="password" autoComplete="new-password" value={f.api_token}
            onChange={(e) => upd("api_token", e.target.value)}
            placeholder={existing?.api_token_set ? t("machinery.badalna_ho_to_naya_token") : ""} style={inp} />
        </Field>
        <Field label={t("machinery.resource_id")} hint={t("machinery.url_me_resourceid_wala_number")}>
          <input value={f.resource_id} onChange={(e) => upd("resource_id", e.target.value)} style={inp} />
        </Field>
      </div>

      <Field label={t("machinery.groups_vendor_panel_ke_unit_group")}
        hint={t("machinery.har_group_ka_objectid_aur_apna")}>
        <div style={{ display: "grid", gap: 7 }}>
          {f.groups.map((g, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 34px", gap: 7 }}>
              <input value={g.objectId} onChange={(e) => updGroup(i, "objectId", e.target.value)} placeholder="objectId" style={inp} />
              <input value={g.label || ""} onChange={(e) => updGroup(i, "label", e.target.value)} placeholder={t("machinery.naam_truck_machine")} style={inp} />
              <button type="button" onClick={() => upd("groups", f.groups.filter((_, j) => j !== i))}
                disabled={f.groups.length <= 1}
                style={{ border: `1.5px solid ${T.b1}`, background: T.surface, borderRadius: 8, cursor: f.groups.length <= 1 ? "not-allowed" : "pointer", color: T.t3 }}>×</button>
            </div>
          ))}
          <div><Btn size="sm" ghost icon={IcAdd} onClick={() => upd("groups", [...f.groups, { objectId: "", label: "" }])}>{t("machinery.group")}</Btn></div>
        </div>
      </Field>

      {error && <div style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>{error}</div>}

      {testResult && (
        <div style={{ border: `1px solid ${T.grnL}`, background: T.grnL, borderRadius: 10, padding: "10px 13px", fontSize: 11.5, color: T.grn }}>
          <b>{t("machinery.vendor_se_jawab_mila_day_ka", { day: testResult.day })}</b>
          {testResult.groups.map((g) => (
            <div key={g.group} style={{ marginTop: 5, color: T.t2 }}><Rich k="machinery.group_g_unit_g2" params={{ group: g.group, g: g.units.length, g2: g.units.map((u) => u.name).join(", ") || "koi nahi" }} /></div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onCancel && <Btn ghost onClick={onCancel}>{t("common.cancel")}</Btn>}
        <Btn ghost onClick={test} disabled={testing}>{testing ? t("machinery.pooch_rahe_hain") : t("machinery.test_karo")}</Btn>
        <Btn onClick={save} disabled={busy}>{busy ? t("machinery.save") : t("common.save")}</Btn>
      </div>
    </div>
  );
}

// ── Google Maps loader (module ki apni copy — self-contained convention).
// window.google pehle se ho (LiveTeamView ne load kiya ho) to wahi use hota
// hai; do baar script kabhi nahi judti.
let _gmapsTeleP = null;
function loadGmapsTele(apiKey) {
  if (window.google && window.google.maps) return Promise.resolve(window.google);
  if (_gmapsTeleP) return _gmapsTeleP;
  _gmapsTeleP = new Promise((resolve, reject) => {
    const cb = "__gmapsTele_" + Math.random().toString(36).slice(2);
    window[cb] = () => { delete window[cb]; resolve(window.google); };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${cb}`;
    s.async = true; s.defer = true;
    s.onerror = () => { _gmapsTeleP = null; reject(new Error("Maps load nahi hua")); };
    document.head.appendChild(s);
  });
  return _gmapsTeleP;
}

const TELE_PIN = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z";

// Fleet ka naksha — har machine ka AAKHRI SYNC TAK ka parking coordinate.
// "Live" ka dawa jaan-bujh kar nahi: vendor ke paas live-position endpoint
// hai hi nahi (docs/integrations/technoton-telematics-api.md), aur jhootha
// "live" label pehli hi baar galat jagah dikhne par poore map ka bharosa
// kha jaata. Machine par click → uska 14-din ka raasta (din-ba-din parking).
function TeleMap({ dash, height = 540 }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const infoRef = useRef(null);
  const trailRef = useRef(null);
  const didFitRef = useRef(false);
  const [status, setStatus] = useState("loading");
  const [selId, setSelId] = useState(null);
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;

  const points = ((dash && dash.machines) || []).filter((m) => m.last && m.last.lat != null);

  useEffect(() => {
    if (!apiKey) { setStatus("nokey"); return; }
    let dead = false;
    loadGmapsTele(apiKey).then((g) => {
      if (dead || !boxRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(boxRef.current, {
          center: { lat: 21.2, lng: 81.6 }, zoom: 9,
          mapTypeControl: true, streetViewControl: false, fullscreenControl: true,
        });
        infoRef.current = new g.maps.InfoWindow();
      }
      setStatus("ok");
    }).catch(() => { if (!dead) setStatus("err"); });
    return () => { dead = true; };
  }, [apiKey]);

  // Markers — machines badalne par naye sire se. Ek hi site par khadi 6-7
  // machines ke pin ek doosre par na gir jayein isliye ~8m ka deterministic
  // pankha (fan-out) — sirf dikhane ke liye, asli coordinate info me hai.
  useEffect(() => {
    if (status !== "ok" || !mapRef.current) return;
    const g = window.google;
    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];

    points.forEach((m, i) => {
      const color = m.health === "green" ? "#1E8E5A" : m.health === "amber" ? "#B27A0A" : "#C43A45";
      const marker = new g.maps.Marker({
        map: mapRef.current,
        position: { lat: Number(m.last.lat) + (i % 4) * 0.00008, lng: Number(m.last.lng) + Math.floor(i / 4) * 0.00008 },
        title: m.machine_name || m.unit_name,
        icon: {
          path: TELE_PIN, fillColor: color, fillOpacity: 1,
          strokeColor: "#FFFFFF", strokeWeight: 2, scale: 1.6,
          anchor: new g.maps.Point(12, 22),
        },
      });
      marker.addListener("click", () => {
        const y = m.yday;
        infoRef.current.setContent(
          `<div style="font:12px 'Segoe UI',sans-serif;min-width:190px">
             <div style="font-weight:700">${m.machine_name || m.unit_name}</div>
             ${m.machine_reg ? `<div style="color:#6B7280">${m.machine_reg}</div>` : ""}
             <div style="margin-top:4px">${m.last.location || "—"}</div>
             <div style="color:#6B7280">${m.last.data_at ? "data " + String(m.last.data_at).slice(0, 10) + " tak" : "data nahi aaya"}</div>
             ${y ? `<div style="margin-top:4px">Kal: ${Math.floor(y.engine_sec / 3600)}:${String(Math.floor((y.engine_sec % 3600) / 60)).padStart(2, "0")} hrs · ${Math.round(y.consumed_l * 10) / 10} L</div>` : ""}
             ${m.linked ? "" : `<div style="margin-top:4px;color:#B27A0A;font-weight:600">Machine se judi nahi — GPS → Jodna baaki</div>`}
           </div>`);
        infoRef.current.open(mapRef.current, marker);
        setSelId(m.linked && m.equipment_id ? m.equipment_id : null);
      });
      markersRef.current.push(marker);
    });

    if (!didFitRef.current && points.length) {
      const b = new g.maps.LatLngBounds();
      points.forEach((m) => b.extend({ lat: Number(m.last.lat), lng: Number(m.last.lng) }));
      mapRef.current.fitBounds(b, 60);
      didFitRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dash]);

  // Chuni hui machine ka 14-din ka raasta — din-ba-din parking points ki line.
  useEffect(() => {
    if (status !== "ok" || !mapRef.current) return;
    if (trailRef.current) { trailRef.current.setMap(null); trailRef.current = null; }
    if (!selId) return;
    let dead = false;
    api.get(`/telematics/machine/${selId}?days=14`).then((r) => {
      if (dead || !r || !r.success || !r.data.linked) return;
      const pts = (r.data.daily || [])
        .filter((d) => d.park_lat != null)
        .map((d) => ({ lat: Number(d.park_lat), lng: Number(d.park_lng) }))
        .reverse();
      if (pts.length < 2) return;
      const g = window.google;
      trailRef.current = new g.maps.Polyline({
        map: mapRef.current, path: pts,
        strokeColor: "#4B45C4", strokeOpacity: 0.75, strokeWeight: 3,
        icons: [{ icon: { path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.2, strokeColor: "#4B45C4" }, offset: "100%" }],
      });
    }).catch(() => {});
    return () => { dead = true; };
  }, [selId, status]);

  if (status === "nokey") return <Empty>{t("machinery.map_ke_liye_react_app_google")}</Empty>;
  if (status === "err") return <Empty>{t("machinery.google_maps_load_nahi_hua_internet")}</Empty>;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", fontSize: 11, color: T.t3, marginBottom: 8 }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: T.grn, marginRight: 4 }} />{t("machinery.24_ghante_me_data")}</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: T.amb, marginRight: 4 }} />{t("machinery.2_3_din_purana")}</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: T.red, marginRight: 4 }} />{t("machinery.sensor_chup")}</span>
        <span style={{ color: T.t4 }}>{t("machinery.jagah_aakhri_sync_tak_ki_parking")}</span>
      </div>
      <div ref={boxRef} style={{ height, borderRadius: 12, border: `1.5px solid ${T.b1}`, overflow: "hidden" }} />
      {points.length === 0 && <Empty>{t("machinery.abhi_kisi_unit_ke_coordinates_nahi")}</Empty>}
    </div>
  );
}

// Dashboard — fleet ka roz ka saar + flags. Ankde /telematics/dashboard se,
// wahi jo Sahayak ka machine_gps tool padhta hai — screen aur bot kabhi alag
// number nahi bolenge.
function TeleDash({ dash, onAction }) {
  if (!dash) return <Empty>{t("common.loading")}</Empty>;
  const tiles = dash.tiles || {};
  const machines = (dash.machines || []).slice().sort((a, b) => {
    if (a.linked !== b.linked) return a.linked ? -1 : 1;
    return ((b.yday && b.yday.engine_sec) || 0) - ((a.yday && a.yday.engine_sec) || 0);
  });
  const hhmm = (sec) => {
    const s = Number(sec) || 0;
    return s ? Math.floor(s / 3600) + ":" + String(Math.floor((s % 3600) / 60)).padStart(2, "0") : "—";
  };
  const review = async (id) => {
    const r = await api.post(`/telematics/events/${id}/review`, { status: "ok" });
    if (r && r.success === false) { window.alert(r.message || "Nahi hua"); return; }
    onAction && onAction();
  };
  const dot = (h) => (
    <span style={{ width: 8, height: 8, borderRadius: 4, display: "inline-block", background: h === "green" ? T.grn : h === "amber" ? T.amb : T.red }} />
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <StatCard label={t("machinery.kal_ka_kaam")} value={hhmm(tiles.engine_sec_yday) + " hrs"}
          sub={`${fmtN(tiles.diesel_yday)} L diesel (sensor)`} color={T.ind} icon={IcClock} />
        <StatCard label={t("machinery.sensors")} value={`${tiles.online || 0}/${tiles.units || 0} online`}
          sub={tiles.silent ? `${tiles.silent} chup — dekhna padega` : `${tiles.linked || 0} machine se jude`}
          color={tiles.silent ? T.red : T.grn} icon={IcSignal} />
        <StatCard label={t("machinery.fuel_drop_bina_jaanch")} value={tiles.drops_pending || 0}
          sub={t("machinery.engine_band_tha_level_gira")} color={tiles.drops_pending ? T.red : T.grn} icon={IcDrop} />
        <StatCard label={t("machinery.fill_bina_entry")} value={tiles.fills_no_entry || 0}
          sub={t("machinery.36_ghante_nikal_gaye_entry_nahi")} color={tiles.fills_no_entry ? T.amb : T.grn} icon={IcAlert} />
      </div>

      <Panel title={t("machinery.fleet_kal_ka_kaam_aur_7")}>
        <Row head cols="16px 1.5fr 90px 90px 110px 90px 1.3fr">
          <span></span><span>{t("fuel.machine")}</span><span>{t("machinery.kal_chali")}</span><span>{t("machinery.diesel_kal")}</span>
          <span>{t("machinery.l_hr_7d")}</span><span>{t("machinery.fill_drop")}</span><span>{t("fuel.jagah")}</span>
        </Row>
        {machines.map((m) => {
          const over = m.lph7 != null && m.norm_lph != null && m.lph7 > m.norm_lph * 1.15;
          return (
            <Row key={m.unit_id} cols="16px 1.5fr 90px 90px 110px 90px 1.3fr">
              {dot(m.health)}
              <span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: m.linked ? T.t1 : T.t3 }}>
                  {m.machine_name || m.unit_name}
                </span>
                {!m.linked && <span style={{ fontSize: 10, color: T.amb, fontWeight: 700 }}> {t("machinery.judi_nahi")}</span>}
                {!!m.has_fls && m.linked && <span style={{ fontSize: 10, color: T.t4 }}> {t("machinery.fuel_sensor")}</span>}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{m.yday ? hhmm(m.yday.engine_sec) : "—"}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{m.yday && m.yday.consumed_l > 0 ? fmtN(m.yday.consumed_l) + " L" : "—"}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: over ? T.red : T.t2 }}>
                {m.lph7 != null ? fmtN(m.lph7) : "—"}{m.norm_lph != null ? ` / ${fmtN(m.norm_lph)}` : ""}
                {over && " ⚠"}
              </span>
              <span style={{ fontSize: 11.5 }}>{m.fills7 || 0} / <span style={{ color: m.drops7 ? T.red : T.t2 }}>{m.drops7 || 0}</span></span>
              <span style={{ fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.last.location || "—"}
                {m.last.data_at && <span style={{ color: T.t4 }}> · {fmtD(m.last.data_at)}</span>}
              </span>
            </Row>
          );
        })}
        <div style={{ padding: "8px 15px", fontSize: 10.5, color: T.t4 }}>
         {t("machinery.l_hr_sirf_un_dinon_se")}
        </div>
      </Panel>

      {(dash.flags.drops.length > 0 || dash.flags.fills_no_entry.length > 0 || dash.flags.silent.length > 0) && (
        <Panel title={t("fuel.dhyan_dene_layak")}>
          {dash.flags.drops.map((d) => (
            <Row key={"d" + d.id} cols="110px 1.4fr 90px 1fr 100px">
              <span style={{ fontSize: 11, color: T.t3 }}>{String(d.event_time).replace("T", " ").slice(5, 16)}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{d.machine_name || d.unit_name}<span style={{ fontWeight: 400, color: T.t4, fontSize: 10.5 }}> {t("machinery.fuel_drop")}</span></span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: T.red, fontWeight: 700 }}>−{fmtN(d.litres)} L</span>
              <span style={{ fontSize: 11, color: T.t3 }}>{d.location_text || "—"}</span>
              <span style={{ textAlign: "right" }}><Btn size="sm" ghost onClick={() => review(d.id)}>{t("fuel.theek_tha")}</Btn></span>
            </Row>
          ))}
          {dash.flags.fills_no_entry.map((f) => (
            <Row key={"f" + f.id} cols="110px 1.4fr 90px 1fr 100px">
              <span style={{ fontSize: 11, color: T.t3 }}>{String(f.event_time).replace("T", " ").slice(5, 16)}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{f.machine_name || f.unit_name}<span style={{ fontWeight: 400, color: T.amb, fontSize: 10.5 }}> {t("machinery.diesel_bhara_entry_nahi")}</span></span>
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{fmtN(f.litres)} L</span>
              <span style={{ fontSize: 11, color: T.t3 }}>{t("machinery.fuel_module_me_entry_karwao")}</span>
              <span></span>
            </Row>
          ))}
          {dash.flags.silent.map((s, i) => (
            <Row key={"s" + i} cols="110px 1.4fr 90px 1fr 100px">
              <span></span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{s.machine_name || s.unit_name}<span style={{ fontWeight: 400, color: T.red, fontSize: 10.5 }}> {t("machinery.sensor_chup_hai")}</span></span>
              <span></span>
              <span style={{ fontSize: 11, color: T.t3 }}>{t("machinery.aakhri_data_s_vendor_se_poochho", { s: s.last_data_at ? fmtD(s.last_data_at) : "kabhi nahi" })}</span>
              <span></span>
            </Row>
          ))}
        </Panel>
      )}
    </div>
  );
}

function TelematicsTab({ data, onReload, onNewMachine }) {
  const [configOpen, setConfigOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  // Har pending unit ke liye chuni hui machine + "gadi no. bhar do" ka tick.
  const [choice, setChoice] = useState({});
  const [fillReg, setFillReg] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [sub, setSub] = useState("dash");
  const [dash, setDash] = useState(null);
  const syncMarkRef = useRef(null);

  const hasAccount = !!(data && data.account);
  const loadDash = useCallback(async () => {
    const r = await api.get("/telematics/dashboard").catch(() => null);
    setDash(r && r.success ? r.data : null);
  }, []);
  useEffect(() => { if (hasAccount) loadDash(); }, [hasAccount, loadDash]);

  // Jod/unlink/review ke baad dono taaza — parent ka overview (jod list) aur
  // apna dashboard (ankde) ek hi kadam me.
  const reloadAll = useCallback(() => { onReload && onReload(true); loadDash(); }, [onReload, loadDash]);

  // Sync khatam hone ka pata last_sync_at badalne se chalta hai — service
  // use sirf aakhri me likhti hai. Tab tak har 20 sec me chupchaap reload.
  useEffect(() => {
    if (!syncing) return;
    const mark = (data && data.account && data.account.last_sync_at) || null;
    if (mark !== syncMarkRef.current) { setSyncing(false); loadDash(); return; }
    const t = setTimeout(() => onReload && onReload(true), 20000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncing, data]);

  if (!data) return <Empty>{t("common.loading")}</Empty>;

  if (!data.account) {
    return (
      <Panel title={t("machinery.gps_telematics_vendor_jodo")}>
        <div style={{ padding: 16 }}>
          <Notice>
           {t("machinery.vendor_jaise_technoton_ka_api_yahan")}
          </Notice>
          <TeleConfigForm existing={null} onSaved={() => onReload && onReload(true)} />
        </div>
      </Panel>
    );
  }

  const acc = data.account;
  const pending = data.pending || [];
  const linked = data.linked || [];
  const ignored = data.ignored || [];
  const noUnit = (data.no_unit || []).slice().sort((a, b) => {
    const w = { red: 0, amber: 1, grey: 2 };
    return w[a.flag] - w[b.flag];
  });
  const machines = data.machines || [];
  const machineById = Object.fromEntries(machines.map((m) => [m.id, m]));

  const doSync = async () => {
    const r = await api.post("/telematics/sync", {});
    if (!r || r.success === false) { window.alert(r?.message || "Sync shuru nahi hua"); return; }
    if (r.data && r.data.started === false) { window.alert(r.data.message); return; }
    syncMarkRef.current = acc.last_sync_at || null;
    setSyncing(true);
  };

  const link = async (u) => {
    const eqId = Number(choice[u.id] != null ? choice[u.id] : (u.top ? u.top.equipment_id : 0));
    if (!eqId) { window.alert(t("machinery.pehle_machine_chuno")); return; }
    const m = machineById[eqId];
    const canFillReg = !!(u.derived_reg_no && m && !String(m.registration_no || "").trim());
    setBusyId(u.id);
    const r = await api.post(`/telematics/units/${u.id}/link`, {
      equipment_id: eqId,
      fill_registration: canFillReg && fillReg[u.id] !== false,
    });
    setBusyId(null);
    if (!r || r.success === false) { window.alert(r?.message || "Jod nahi paya"); return; }
    reloadAll();
  };

  const act = async (u, action) => {
    setBusyId(u.id);
    const r = await api.post(`/telematics/units/${u.id}/${action}`, {});
    setBusyId(null);
    if (!r || r.success === false) { window.alert(r?.message || "Nahi hua"); return; }
    reloadAll();
  };

  const unlink = async (u) => {
    if (!window.confirm(t("machinery.unit_name_ko_machine_name_se", { unit_name: u.unit_name, machine_name: u.machine_name }))) return;
    await act(u, "unlink");
  };

  const healthDot = (h) => (
    <span style={{ width: 8, height: 8, borderRadius: 4, display: "inline-block", flexShrink: 0, background: h === "green" ? T.grn : h === "amber" ? T.amb : T.red }} />
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* ── header: sync ka haal ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11.5, color: T.t3, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill label={acc.vendor || "vendor"} c={T.ind} bg={T.indL} />
          {acc.last_sync_status === "error"
            ? <span style={{ color: T.red, fontWeight: 600 }}>{t("machinery.aakhri_sync_fail_acc", { acc: acc.last_error || "vendor se jawab nahi" })}</span>
            : acc.last_sync_at
              ? <span>{t("machinery.aakhri_sync_fmtd_har_raat_apne", { fmtD: fmtD(acc.last_sync_at) })}</span>
              : <span>{t("machinery.abhi_pehla_sync_hona_baaki_hai")}</span>}
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <Btn size="sm" ghost onClick={() => setConfigOpen(true)}>{t("common.settings")}</Btn>
          <Btn size="sm" onClick={doSync} disabled={syncing}>{syncing ? t("machinery.sync_chal_raha_hai") : t("machinery.sync_now")}</Btn>
        </div>
      </div>
      {syncing && (
        <Notice>{t("machinery.vendor_se_data_aa_raha_hai")}</Notice>
      )}

      {/* ── sub-views: Dashboard | Map | Jod ── */}
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { id: "dash", l: t("common.dashboard") },
          { id: "map", l: t("machinery.map") },
          { id: "jod", l: t("machinery.jodna_baaki"), badge: pending.length || null },
        ].map((x) => (
          <button key={x.id} type="button" onClick={() => setSub(x.id)}
            style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              border: `1.5px solid ${sub === x.id ? T.ind : T.b1}`, borderRadius: 8,
              background: sub === x.id ? T.indL : T.surface, color: sub === x.id ? T.ind : T.t3,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
            {x.l}
            {x.badge > 0 && <span style={{ fontSize: 10, background: T.redL, color: T.red, borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>{x.badge}</span>}
          </button>
        ))}
      </div>

      {sub === "dash" && <TeleDash dash={dash} onAction={reloadAll} />}
      {sub === "map" && <TeleMap dash={dash} />}

      {sub === "jod" && (<>
      {/* ── jodna baaki ── */}
      <Panel title={`Jodna baaki — vendor ki ${pending.length} unit kisi machine se judi nahi`}>
        {pending.length === 0 && <Empty>{t("machinery.sab_units_judi_hui_hain_nayi")}</Empty>}
        {pending.map((u) => {
          const selId = choice[u.id] != null ? choice[u.id] : (u.top ? u.top.equipment_id : "");
          const selMachine = machineById[Number(selId)];
          const canFillReg = !!(u.derived_reg_no && selMachine && !String(selMachine.registration_no || "").trim());
          return (
            <div key={u.id} style={{ padding: "12px 15px", borderBottom: `1px solid ${T.b1}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                  {u.unit_name}
                  {u.group_label && <Pill label={u.group_label} c={T.slt} bg={T.sltL} />}
                  {!!u.has_fls && <Pill label={t("machinery.fuel_sensor_2")} c={T.ind} bg={T.indL} />}
                </div>
                <div style={{ fontSize: 10.5, color: T.t4 }}>
                  {u.last_data_at ? `aakhri data ${fmtD(u.last_data_at)}` : t("machinery.data_abhi_nahi_aaya")}
                </div>
              </div>

              {u.top ? (
                <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 8 }}><Rich k="machinery.sujhav_name_u_why_bharosa_confidence" params={{ name: u.top.name, u: u.top.registration_no ? ` (${u.top.registration_no})` : "", why: u.top.why, confidence: u.top.confidence }} />{u.top.conflict && <span style={{ color: T.amb, fontWeight: 600 }}> · ⚠ {u.top.conflict}</span>}
                  {u.ambiguous && <span style={{ color: T.amb, fontWeight: 600 }}> {t("machinery.do_machine_barabar_milti_hain_khud")}</span>}
                </div>
              ) : (
                <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 8 }}>
                 {t("machinery.koi_milti_julti_machine_nahi_mili")}
                </div>
              )}

              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                <select value={selId} onChange={(e) => setChoice((p) => ({ ...p, [u.id]: e.target.value }))}
                  style={{ ...inp, width: 320 }}>
                  <option value="">{t("machinery.machine_chuno")}</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.registration_no ? ` (${m.registration_no})` : ""}
                    </option>
                  ))}
                </select>
                <Btn size="sm" onClick={() => link(u)} disabled={busyId === u.id || !selId}>
                  {busyId === u.id ? "..." : t("machinery.jodo")}
                </Btn>
                <Btn size="sm" ghost onClick={() => onNewMachine && onNewMachine(u)}>{t("machinery.nayi_machine_banao")}</Btn>
                <Btn size="sm" ghost onClick={() => act(u, "ignore")} disabled={busyId === u.id}>{t("machinery.hamari_nahi_hai")}</Btn>
              </div>

              {canFillReg && (
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: T.t2, marginTop: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={fillReg[u.id] !== false}
                    onChange={(e) => setFillReg((p) => ({ ...p, [u.id]: e.target.checked }))} />
                 {t("machinery.machine_ka_gadi_no_khaali_hai")} <b>{u.derived_reg_no}</b> {t("machinery.bhar_do")}
                </label>
              )}
            </div>
          );
        })}
      </Panel>

      {/* ── jude hue ── */}
      <Panel title={`Jude hue (${linked.length})`}>
        {linked.length === 0 && <Empty>{t("machinery.abhi_koi_unit_judi_nahi_upar")}</Empty>}
        {linked.length > 0 && (
          <>
            <Row head cols="16px 1.4fr 1.4fr 130px 90px">
              <span></span><span>{t("machinery.vendor_unit")}</span><span>{t("fuel.machine")}</span><span>{t("machinery.aakhri_data")}</span><span></span>
            </Row>
            {linked.map((u) => (
              <Row key={u.id} cols="16px 1.4fr 1.4fr 130px 90px">
                {healthDot(u.health)}
                <span style={{ fontSize: 12, color: T.t2 }}>{u.unit_name}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{u.machine_name}
                  {u.machine_reg ? <span style={{ fontWeight: 400, color: T.t4, fontSize: 10.5 }}> · {u.machine_reg}</span> : null}</span>
                <span style={{ fontSize: 11.5, color: u.health === "red" ? T.red : T.t3 }}>
                  {u.last_data_at ? fmtD(u.last_data_at) : t("fuel.kabhi_nahi")}
                  {u.health === "red" && t("machinery.sensor_chup_hai")}
                </span>
                <span style={{ textAlign: "right" }}>
                  <Btn size="sm" ghost onClick={() => unlink(u)} disabled={busyId === u.id}>{t("machinery.kholo")}</Btn>
                </span>
              </Row>
            ))}
          </>
        )}
      </Panel>

      {/* ── GPS nahi hai ── */}
      <Panel title={`Machines bina GPS unit ke (${noUnit.length})`}>
        {noUnit.length === 0 && <Empty>{t("machinery.har_machine_kisi_na_kisi_unit")}</Empty>}
        {noUnit.map((m) => (
          <Row key={m.id} cols="1.6fr 1fr 1.4fr">
            <span style={{ fontSize: 12.5, fontWeight: 600, color: m.flag === "grey" ? T.t3 : T.t1 }}>
              {m.name}{m.registration_no ? <span style={{ fontWeight: 400, color: T.t4, fontSize: 10.5 }}> · {m.registration_no}</span> : null}
            </span>
            <span>
              {m.flag === "red" && <Pill label={t("machinery.gps_haan_unit_nahi")} c={T.red} bg={T.redL} />}
              {m.flag === "amber" && <Pill label={t("machinery.gps_ka_jawab_nahi_bhara")} c={T.amb} bg={T.ambL} />}
              {m.flag === "grey" && <Pill label={t("machinery.gps_nahi_hai")} c={T.t3} bg={T.sltL} />}
            </span>
            <span style={{ fontSize: 11, color: T.t4 }}>
              {m.flag === "red" && t("machinery.master_kehta_hai_gps_laga_hai")}
              {m.flag === "amber" && t("machinery.machine_kholkar_telematics_me_haan_nahi")}
              {m.flag === "grey" && t("machinery.theek_hai_is_machine_par_gps")}
            </span>
          </Row>
        ))}
      </Panel>

      {ignored.length > 0 && (
        <Panel title={`Hamari nahi (${ignored.length})`}>
          {ignored.map((u) => (
            <Row key={u.id} cols="1.6fr 130px">
              <span style={{ fontSize: 12, color: T.t3 }}>{u.unit_name}</span>
              <span style={{ textAlign: "right" }}>
                <Btn size="sm" ghost onClick={() => act(u, "restore")}>{t("machinery.wapas_lao")}</Btn>
              </span>
            </Row>
          ))}
        </Panel>
      )}
      </>)}

      <Modal open={configOpen} onClose={() => setConfigOpen(false)} title={t("machinery.telematics_settings")} width={640}>
        <TeleConfigForm existing={acc}
          onSaved={() => { setConfigOpen(false); onReload && onReload(true); }}
          onCancel={() => setConfigOpen(false)} />
      </Modal>
    </div>
  );
}

function MachineryModule() {
  const [tab, setTab] = useState("fleet");
  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState([]);
  const [due, setDue] = useState([]);
  const [gaps, setGaps] = useState({ gaps: [], counts: {} });
  const [openId, setOpenId] = useState(null);
  const [parties, setParties] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editMachine, setEditMachine] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [econ, setEcon] = useState(null);
  const [health, setHealth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tele, setTele] = useState(null);
  // "Nayi machine banao" (GPS tab) se aaya naam/gadi no. — form me pehle se bhara.
  const [formSeed, setFormSeed] = useState(null);

  // Reports ka apna date range — Fleet/Reminders par date ka koi matlab nahi,
  // aur report kholte hi poora itihaas maangna bhaari padta hai.
  const repMonthStart = new Date(); repMonthStart.setDate(1);
  const [repFrom, setRepFrom] = useState(repMonthStart.toLocaleDateString("en-CA"));
  const [repTo, setRepTo] = useState(new Date().toLocaleDateString("en-CA"));

  // silent = background refresh. Spinner sirf pehli baar; warna machine detail
  // khuli ho to wo unmount ho kar apna tab bhool jaata hai.
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const [f, d, g, p, ec, he, pr, te] = await Promise.all([
      api.get("/machinery/fleet").catch(() => null),
      api.get("/machinery/due").catch(() => null),
      api.get("/machinery/reports/gaps").catch(() => null),
      api.get("/finance/parties").catch(() => null),
      api.get("/machinery/reports/cost").catch(() => null),
      api.get("/machinery/reports/health").catch(() => null),
      // Sirf Reports ke project filter ke liye — baaki tab ko iski zaroorat nahi.
      api.get("/projects").catch(() => null),
      api.get("/telematics/overview").catch(() => null),
    ]);
    setFleet(f?.success ? f.data || [] : []);
    setDue(d?.success ? d.data || [] : []);
    setGaps(g?.success ? g.data || { gaps: [], counts: {} } : { gaps: [], counts: {} });
    setParties(p?.success ? p.data || [] : []);
    setEcon(ec?.success ? ec.data : null);
    setHealth(he?.success ? he.data : null);
    setProjects(pr?.success ? pr.data || [] : []);
    setTele(te?.success ? te.data : null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const snooze = async (row) => {
    const till = new Date(); till.setDate(till.getDate() + 7);
    const r = await api.post("/machinery/due/snooze", {
      ref_type: row.ref_type, ref_id: row.ref_id, till: till.toLocaleDateString("en-CA"),
    });
    if (r && r.success === false) { window.alert(r.message || "Snooze failed"); return; }
    load(true);
  };

  const owned = fleet.filter((m) => m.owned);
  const active = due.filter((d) => !d.snoozed);
  const expired = active.filter((d) => d.days < 0);

  const TILES = useMemo(() => ([
    { l: t("machinery.machines"), v: fleet.length, sub: `${owned.length} owned · ${fleet.length - owned.length} rented`, c: T.ind, I: IcTruck },
    { l: t("machinery.kaagaz_khatam_paas"), v: active.length, sub: expired.length ? `${expired.length} nikal chuke` : "30 din ke andar", c: active.length ? T.red : T.grn, I: IcDoc },
    { l: t("machinery.meter_purani_nahi"), v: (gaps.counts.meter || 0), sub: t("machinery.iske_bina_service_due_nahi_nikalti"), c: (gaps.counts.meter ? T.amb : T.grn), I: IcGauge },
    // Chautha tile ab poore record ka haal batata hai. Sirf "reg. no. missing"
    // se kaam nahi chalta — jis machine ka rate ya kaagaz nahi, wo bhi utni hi
    // adhoori hai, aur wo tile me kahin dikhta hi nahi tha.
    { l: t("machinery.record_poora"), v: (gaps.avg_pct != null ? gaps.avg_pct : 100) + "%",
      sub: gaps.gaps && gaps.gaps.length ? `${gaps.gaps.length} machine adhoori` : "sab poori",
      c: (gaps.avg_pct >= 90 ? T.grn : gaps.avg_pct >= 60 ? T.amb : T.red), I: IcAlert },
  ]), [fleet, owned, active, expired, gaps]);

  const TABS = [
    { id: "fleet", l: t("machinery.fleet"), I: IcTruck },
    { id: "due", l: t("machinery.reminders"), I: IcBell, badge: active.length || null },
    // Badge = kitni vendor units abhi kisi machine se judi nahi — wahi is
    // tab ka asli kaam hai. Account hi na ho to badge ka koi matlab nahi.
    { id: "gps", l: "GPS", I: IcSignal, badge: (tele && tele.account && tele.pending.length) || null },
    { id: "insights", l: t("machinery.insights"), I: IcSpark },
    { id: "reports", l: t("common.reports"), I: IcChart },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: T.ind, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#8896A6" }}>{t("machinery.loading_machinery")}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: T.bg, height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 20px" }}>
        {openId ? (
          <MachineDetail id={openId} onBack={() => setOpenId(null)} onChanged={() => load(true)} parties={parties}
            onEdit={(m) => { setEditMachine(m); setFormOpen(true); }} />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
              {TILES.map((s, i) => <StatCard key={i} label={s.l} value={s.v} sub={s.sub} color={s.c} icon={s.I} />)}
            </div>

            <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 16 }}>
              {TABS.map((x) => (
                <button key={x.id} type="button" onClick={() => setTab(x.id)}
                  style={{ padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", marginBottom: "-1.5px", display: "flex", alignItems: "center", gap: 6, color: tab === x.id ? T.ind : T.t3, borderBottom: `2px solid ${tab === x.id ? T.ind : "transparent"}` }}>
                  <x.I size={13} color="currentColor" />{x.l}
                  {x.badge > 0 && <span style={{ fontSize: 10, background: T.redL, color: T.red, borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>{x.badge}</span>}
                </button>
              ))}
            </div>

            {tab === "reports" && (
              <ReportsTab fleet={fleet} projects={projects} from={repFrom} to={repTo}
                onRange={(f, t2) => { setRepFrom(f); setRepTo(t2); }} />
            )}

            {tab === "gps" && (
              <TelematicsTab data={tele} onReload={load}
                onNewMachine={(u) => {
                  // Naam me se vendor ka tenant-prefix (RKU_ jaisa) hata kar
                  // seed banta hai — baaki form aadmi khud bharega.
                  setEditMachine(null);
                  setFormSeed({
                    name: String(u.unit_name || "").replace(/^[A-Z]{2,5}[_\-\s]+/i, "").replace(/_/g, " ").trim(),
                    registration_no: u.derived_reg_no || "",
                    telematics_enabled: 1,
                  });
                  setFormOpen(true);
                }} />
            )}

            {tab === "fleet" && (
              <Panel title={t("machinery.fleet")} action={
                <div style={{ display: "flex", gap: 7 }}>
                  <Btn size="sm" ghost onClick={() => setImportOpen(true)}>{t("machinery.excel_import")}</Btn>
                  <Btn size="sm" icon={IcAdd} onClick={() => { setEditMachine(null); setFormOpen(true); }}>{t("fuel.machine")}</Btn>
                </div>}>
                {fleet.length === 0 && (
                  <Empty>
                   {t("machinery.koi_machine_register_nahi")}<br />
                    <span style={{ fontSize: 11.5 }}>{t("machinery.upar_machine_se_add_karein_gadi")}</span>
                  </Empty>
                )}
                {fleet.length > 0 && (
                  <>
                    <Row head cols="1.7fr 92px 1fr 1.1fr 120px 110px">
                      <span>{t("fuel.machine")}</span><span>{t("common.ownership")}</span><span>{t("machinery.current_meter")}</span><span>{t("common.documents")}</span><span>{t("machinery.health")}</span><span>{t("machinery.detail_poora")}</span>
                    </Row>
                    {fleet.map((m) => {
                      const tone = m.doc_status ? expiryTone(m.doc_status.days) : null;
                      const bad = m.doc_status && m.doc_status.days < 0;
                      const soon = m.doc_status && m.doc_status.days >= 0 && m.doc_status.days <= 30;
                      return (
                        <Row key={m.id} cols="1.7fr 92px 1fr 1.1fr 120px 110px" onClick={() => setOpenId(m.id)}>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{m.name}{m.code ? ` — ${m.code}` : ""}</div>
                            <div style={{ fontSize: 10.5, color: T.t4 }}>
                              {m.registration_no || (m.owned ? t("machinery.reg_no_nahi") : m.default_vendor_name || "—")}
                            </div>
                          </div>
                          <span><Pill label={m.owned ? t("machinery.owned") : t("machinery.rented")} c={m.owned ? T.ind : T.t3} bg={m.owned ? T.indL : T.sltL} /></span>
                          <span>{m.owned ? <MeterCell meter={m.meter} unit={m.meter_unit} /> : <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.vendor_scope")}</span>}</span>
                          <span>
                            {m.doc_status
                              ? <Pill label={`${docLabel(m.doc_status.type)} · ${tone.label}`} c={tone.c} bg={tone.bg} />
                              : <span style={{ fontSize: 11, color: T.t4 }}>{m.owned ? t("machinery.koi_kaagaz_nahi") : t("machinery.verify_baaki")}</span>}
                          </span>
                          <span>
                            {/* Workshop me padi machine kaagaz ke rang se chhup jaati thi —
                                repair sab par bhaari hai. */}
                            {m.status === "Under Repair" ? <Pill label={t("machinery.under_repair")} c={T.red} bg={T.redL} />
                              : bad ? <Pill label={t("machinery.action_needed")} c={T.red} bg={T.redL} />
                              : soon ? <Pill label={t("machinery.dhyan_dein")} c={T.amb} bg={T.ambL} />
                              : <Pill label="OK" c={T.grn} bg={T.grnL} />}
                          </span>
                          <span><CompletenessBar c={m.completeness} /></span>
                        </Row>
                      );
                    })}
                  </>
                )}
              </Panel>
            )}

            {tab === "due" && (
              <>
                <Notice>
                 {t("machinery.kaagaz_ki_expiry_par_bell_apne")}
                </Notice>
                <Panel title={t("machinery.reminders")}>
                  {due.length === 0 && <Empty>{t("machinery.agle_45_din_me_kuch_due")}</Empty>}
                  {due.length > 0 && (
                    <>
                      <Row head cols="110px 1.5fr 1.4fr 110px 110px">
                        <span>{t("common.due")}</span><span>{t("fuel.machine")}</span><span>{t("fuel.kya")}</span><span>{t("common.date")}</span><span></span>
                      </Row>
                      {due.map((d) => {
                        const tone = expiryTone(d.days);
                        return (
                          <Row key={d.ref_type + d.ref_id} cols="110px 1.5fr 1.4fr 110px 110px">
                            <span><Pill label={d.snoozed ? t("machinery.snoozed") : tone.label} c={d.snoozed ? T.t3 : tone.c} bg={d.snoozed ? T.sltL : tone.bg} /></span>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{d.machine_name}</div>
                              <div style={{ fontSize: 10.5, color: T.t4 }}>{d.registration_no || (d.scope === "vendor" ? t("machinery.kiraye_ki_2") : "—")}</div>
                            </div>
                            <span style={{ fontSize: 12, color: T.t2 }}>
                              {d.label}{d.provider ? ` — ${d.provider}` : ""}{d.amount ? ` · ${fmtC(d.amount)}` : ""}
                            </span>
                            <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(d.valid_till)}</span>
                            <span style={{ textAlign: "right" }}>
                              <Btn size="sm" ghost onClick={() => snooze(d)}>{t("machinery.snooze_7d")}</Btn>
                            </span>
                          </Row>
                        );
                      })}
                    </>
                  )}
                </Panel>
              </>
            )}

            {tab === "insights" && (
              <div style={{ display: "grid", gap: 12 }}>
                <CostReport econ={econ} health={health} />
                <Panel title={t("machinery.abhi_kya_kami_hai")} style={{ marginTop: 2 }}>
                  {(gaps.gaps || []).length === 0 && <Empty>{t("machinery.koi_kami_nahi_insights_m2_m3")}</Empty>}
                  {(gaps.gaps || []).map((g) => (
                    <Row key={g.id} cols="1.6fr 1fr 1.4fr">
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{g.name}</span>
                      <span><Pill label={g.owned ? t("machinery.owned") : t("machinery.rented")} c={g.owned ? T.ind : T.t3} bg={g.owned ? T.indL : T.sltL} /></span>
                      {/* Labels ab backend ke completeness se aate hain —
                          pehle yahan apni alag list thi jo fleet ke bar se
                          alag hi bolti thi. */}
                      <span style={{ fontSize: 11.5, color: T.t3 }}>
                        {(g.missing_labels || g.missing).join(" · ")}
                      </span>
                    </Row>
                  ))}
                </Panel>
              </div>
            )}
          </>
        )}
      </div>

      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onDone={() => load(true)} />

      <MachineForm open={formOpen} machine={editMachine} parties={parties} seed={formSeed}
        onClose={() => { setFormOpen(false); setEditMachine(null); setFormSeed(null); }}
        onSaved={() => load(true)} />
    </div>
  );
}

export default MachineryModule;
