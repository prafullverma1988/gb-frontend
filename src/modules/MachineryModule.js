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
import PickSelect from "../components/PickSelect";
import api, { API_BASE, getToken } from "../config/api";
import { t, Rich } from "../i18n";
import ImportFixPanel, { useImportFix } from "../components/ImportFix";
import { BackClose } from "../utils/backNav";
import CityPicker from "../components/CityPicker";
import { can, canAny, canEntry } from "../utils/perms";
import { canApproveAction } from "../utils/approvalAuthority";
import { cld } from "../utils/cloudinary";
// Server samay UTC me deta hai (9 Oct 2026 se fuel / sensor bhi) — dikhao
// phone/browser ki apni ghadi me. Kachcha string kaatne se UTC dikhta tha.
const localDT = (v) => {
  const d = new Date(v); if (!v || isNaN(d)) return String(v || "").replace("T", " ").slice(0, 16);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Gadi number ka milan: space/dash/dot ka farak nahi ginna — backend bhi
// theek yahi karta hai (utils/machineIdentity.js). Dono taraf ek jaisa na ho
// to screen par "mil gaya" dikhta hai aur save par "pehle se hai" aata hai.
const normReg = (s) => String(s == null ? "" : s).replace(/[\s.-]/g, "").toUpperCase();
// ── Kaun kya kare — Roles & Access ki Machinery row (5 Oct 2026) ──
// Server (routes/machinery.js, telematics.js) wahi tick maangta hai jo yahan:
//   Entry  = meter, "Kharab hai" / service darj karna, bill padhna, reminder
//            snooze (transition me Create bhi)
//   Create = nayi machine, Excel import, kaagaz, service templates, telematics
//   Edit   = machine badalna, city badalna (pehle sirf admin), service band karna
//   Delete = "Gaadi hatao" (pehle admin + Edit)
//   Export = report ka Excel / PDF / WhatsApp
// Admin / PM role ki koi alag shart ab nahi. Button wahi dikhe jo server maane.
const canMach = (action) => can("Machinery", action);
const canMachEntry = () => canEntry("Machinery");
const canShiftCity = () => canMach("edit");
const canRemoveMachine = () => canMach("delete");
// Ctrl+K (App.js) → Machinery: kaunsi gaadi kholni hai. Wahi do naam App.js me.
const MACH_OPEN_KEY = "sanchalan_machinery_open";
const MACH_OPEN_EVENT = "sanchalan:machinery-open";
// Naya endpoint purane server par 404 "Route … not found" deta hai — wo
// developer ki bhasha hai. Deploy ke beech ka chhota waqt hai, user ko seedha
// bata do ki update aana baaki hai.
// (_status yahan aksar khaali hota hai — 404 ki body me success:false hota hai
// aur api client tab body jaisi ki taisi lauta deta hai; isliye message se pehchaan.)
const ROUTE_404 = /^Route [A-Z]+ \S+ not found/;
const srvMsg = (r) => (r && ROUTE_404.test(String(r.message || ""))
  ? t("machinery.server_update_baaki")
  : (r && r.message) || t("common.something_went_wrong"));

// ── ICONS ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcTruck  = (p) => <Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a2 2 0 100-4 2 2 0 000 4zM18.5 19a2 2 0 100-4 2 2 0 000 4z" />;
const IcBell   = (p) => <Ic {...p} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />;
const IcSpark  = (p) => <Ic {...p} d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" />;
const IcSliders = (p) => <Ic {...p} d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />;
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
const IcRoute  = (p) => <Ic {...p} d="M6 21a2 2 0 100-4 2 2 0 000 4zM18 7a2 2 0 100-4 2 2 0 000 4zM6 17V9a4 4 0 014-4h6M18 7v8a4 4 0 01-4 4H8" />;

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
// Server ne mana kiya (409, 403…) — laal, taaki "jaankari" wale neele dabbe se alag dikhe.
const ErrBox = ({ children }) => (
  <div style={{ marginTop: 12, border: `1px solid ${T.red}33`, background: T.redL, color: T.red, borderRadius: 8, padding: "9px 12px", fontSize: 11.5, fontWeight: 600, lineHeight: 1.5 }}>{children}</div>
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

// ── Capacity (4 Oct 2026) ────────────────────────────────────────
// Number + unit (cft / cum / ton). Trip gaadi par zaroori (rate card isi se
// gaadi chunta hai), "+ Machine" par marzi — JCB jaisi machine me bucket hi
// nahi. Server "500 cft" text (capacity) bhi saath likhta hai.
const CAP_UNITS = ["cft", "cum", "ton"];
// → { empty } (kuch nahi bhara) · { bad } · { ok, qty, unit }
const capCheck = (qty, unit) => {
  const s = String(qty == null ? "" : qty).trim();
  if (!s && !unit) return { empty: true };
  const n = Number(s);
  if (!s || !Number.isFinite(n) || n <= 0 || !CAP_UNITS.includes(unit)) return { bad: true };
  return { ok: true, qty: n, unit };
};
const capOf = (r) => (r && (r.capacity || (r.capacity_qty != null ? (Number(r.capacity_qty) + " " + (r.capacity_unit || "")).trim() : ""))) || "";
const CapInput = ({ qty, unit, onQty, onUnit, bad }) => (
  <div style={{ display: "flex", gap: 6 }}>
    <input value={qty == null ? "" : qty} inputMode="decimal" placeholder="500" onChange={(e) => onQty(e.target.value.replace(/[^0-9.]/g, ""))}
      style={{ ...inp, flex: 1, minWidth: 0, borderColor: bad ? T.red : T.b1 }} />
    <PickSelect value={unit || ""} onChange={(e) => onUnit(e.target.value)} style={{ ...inp, width: 86, flexShrink: 0, borderColor: bad ? T.red : T.b1 }}>
      <option value="">{t("machinery.cap_unit")}</option>
      {CAP_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
    </PickSelect>
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
      <PickSelect value={value || ""} onChange={(e) => onChange(e.target.value || null)} style={inp}>
        <option value="">{placeholder || t("machinery.chuno")}</option>
        {shown.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </PickSelect>
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
      <BackClose onClose={onClose}/>{/* browser Back = band (form bhara ho to poochhe) */}
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

function MachineForm({ open, onClose, onSaved, machine, parties, seed, cities, setCities }) {
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
      // Server "Owned"/"Rented" bhejta hai, picker ke options chhote akshar
      // me hain — bina normalise kiye kiraye ki machine par bhi "Apni" ✓ dikhta tha.
      // Khaali/ajeeb value = kiraye ki — server isOwned() aur app jaisa hi niyam.
      ownership: String(machine.ownership || "").toLowerCase() === "owned" ? "owned" : "rented",
      // DECIMAL "500.00" aata hai — box me "500".
      capacity_qty: machine.capacity_qty != null && machine.capacity_qty !== "" ? String(Number(machine.capacity_qty)) : "",
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
    const cap = capCheck(f.capacity_qty, f.capacity_unit);
    if (cap.bad) { setError(t("machinery.cap_galat")); setTab("id"); return; }
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
      type: f.type || null, machine_type: f.machine_type || null,
      // Capacity number + unit; server text khud likhta hai. Number khaali
      // chhoda to purana likha text waisa hi — par jo text pehle number se hi
      // bana tha (capacity_qty tha) wo bhi saath mitao, warna "500 cft" atka rehta.
      capacity_qty: cap.ok ? cap.qty : null, capacity_unit: cap.ok ? cap.unit : null,
      capacity: cap.empty && machine && machine.capacity_qty != null ? null : (f.capacity || null),
      ownership: f.ownership || "rented", registration_no: f.registration_no || null,
      make: f.make || null, model: f.model || null, year: f.year || null,
      chassis_no: f.chassis_no || null, engine_no: f.engine_no || null,
      operator_name: f.operator_name || null,
      measurement_mode: f.measurement_mode || "hourly",
      default_rate: f.default_rate ? parseFloat(f.default_rate) : 0,
      // Kiraye ka vendor — apni machine ka koi hire vendor nahi hota.
      default_vendor_id: owned ? null : (f.default_vendor_id || null),
      meter_unit: f.meter_unit || "hours",
      fuel_responsibility: owned ? "company" : (f.fuel_responsibility || "rent_included"),
      fuel_per_hour: f.fuel_per_hour ? parseFloat(f.fuel_per_hour) : null,
      purchase_date: f.purchase_date || null,
      purchase_cost: f.purchase_cost ? parseFloat(f.purchase_cost) : null,
      telematics_enabled: f.telematics_enabled == null || f.telematics_enabled === "" ? null : Number(f.telematics_enabled),
      telematics_vendor_party_id: f.telematics_vendor_party_id || null,
      telematics_device_id: f.telematics_device_id || null,
      telematics_api_url: f.telematics_api_url || null,
      // City sirf nayi machine ke saath jaati hai. Baad me badalna = shifting,
      // wo apne raaste se hoti hai (sirf admin, aur log bhi banta hai) —
      // isliye edit par server city ko chhuta hi nahi.
      ...(editing ? {} : { city_id: f.city_id || null }),
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
          {/* Machine city me rehti hai aur us city ke saare project par chalti
              hai — isi se tay hota hai kis site wale ko ye machine dikhegi. */}
          <Field label={t("machinery.city")} hint={editing ? t("machinery.city_shift_se_badlegi") : t("machinery.is_city_ke_sab_project_par")}>
            {editing ? (
              <input value={machine.city_name || t("machinery.city_nahi")} readOnly disabled style={{ ...inp, background: T.bg, color: T.t3 }} />
            ) : (
              <CityPicker value={f.city_id || ""} onChange={(v) => upd("city_id", v)} cities={cities || []} setCities={setCities}
                placeholder={t("machinery.city_chuno")} selectStyle={inp} />
            )}
          </Field>
          <Field label={t("common.code")}>
            <input value={f.code || ""} onChange={(e) => upd("code", e.target.value)} placeholder={t("machinery.eq_jcb_01")} style={inp} />
          </Field>
          <Field label={t("common.ownership")}>
            <PickSelect value={f.ownership || "owned"} onChange={(e) => upd("ownership", e.target.value)} style={inp}>
              <option value="owned">{t("machinery.apni_owned")}</option>
              <option value="rented">{t("machinery.kiraye_ki_rented")}</option>
            </PickSelect>
          </Field>
          <Field label={t("machinery.machine_type")}>
            <input value={f.machine_type || ""} onChange={(e) => upd("machine_type", e.target.value)} placeholder={t("machinery.excavator_tipper_roller")} style={inp} />
          </Field>
          <Field label={t("machinery.capacity_opt")}
            hint={machine && machine.capacity && machine.capacity_qty == null
              ? t("machinery.cap_purana_likha", { text: machine.capacity }) : t("machinery.capacity_opt_hint")}>
            <CapInput qty={f.capacity_qty} unit={f.capacity_unit} onQty={(v) => upd("capacity_qty", v)} onUnit={(v) => upd("capacity_unit", v)}
              bad={capCheck(f.capacity_qty, f.capacity_unit).bad && String(f.capacity_qty || "") !== "" && !!f.capacity_unit} />
          </Field>
          <Field label={t("machinery.meter_kis_cheez_ka")}>
            <PickSelect value={f.meter_unit || "hours"} onChange={(e) => upd("meter_unit", e.target.value)} style={inp}>
              <option value="hours">{t("machinery.hour_meter_ghante")}</option>
              <option value="km">{t("machinery.odometer_km")}</option>
              <option value="both">{t("machinery.dono")}</option>
            </PickSelect>
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
            <PickSelect value={f.measurement_mode || "hourly"} onChange={(e) => upd("measurement_mode", e.target.value)} style={inp}>
              {MODES.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
            </PickSelect>
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
            <PickSelect value={owned ? "company" : (f.fuel_responsibility || "rent_included")}
              onChange={(e) => upd("fuel_responsibility", e.target.value)} style={inp} disabled={owned}>
              <option value="company">{t("machinery.hamara_company_deti_hai")}</option>
              <option value="rent_included">{t("machinery.kiraye_me_shaamil_vendor_ka")}</option>
            </PickSelect>
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
              <PickSelect value={f.telematics_enabled == null ? "" : String(f.telematics_enabled)}
                onChange={(e) => upd("telematics_enabled", e.target.value === "" ? null : Number(e.target.value))} style={inp}>
                <option value="">{t("machinery.abhi_tay_nahi")}</option>
                <option value="1">{t("machinery.haan_laga_hai")}</option>
                <option value="0">{t("machinery.nahi")}</option>
              </PickSelect>
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
              {/* Meter theek ho par kharcha/kiraya darj na ho to wajah cost_reason me (MCH-19) */}
              <span style={{ fontSize: 11, color: T.amb }}>{m.cost_reason || m.run.reason}</span>
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

// Galti sudhaar screen ke box. Jin column me tay shabd hote hain wahan dropdown
// (value data hai — server wahi pehchanta hai — label bhasha me), kaagaz ki date
// par date-picker, vendor/type par likhne ke saath list. Shabd pehchanna aur
// tareekh padhna ab server par hai (POST /machinery/import/rows): pehle yahan
// hota tha aur na samjha shabd chupchaap "rented"/"hourly" ban jaata tha.
const FIX_OPTS = {
  ownership: { type: "select", options: ["owned", "rented"], optionLabel: (v) => (v === "owned" ? t("machinery.apni") : t("machinery.kiraye_ki")), same: true },
  measurement_mode: { type: "select", options: MODES.map((m) => m.k), optionLabel: (v) => (MODES.find((m) => m.k === v) || {}).l || v, same: true },
  meter_unit: { type: "select", options: ["hours", "km", "both"], optionLabel: (v) => (v === "hours" ? t("machinery.hour_meter_ghante") : v === "km" ? t("machinery.odometer_km") : t("machinery.dono")), same: true },
  fuel_responsibility: { type: "select", options: ["company", "rent_included"], optionLabel: (v) => (v === "company" ? t("machinery.hamara_company_deti_hai") : t("machinery.kiraye_me_shaamil_vendor_ka")), same: true },
  telematics_enabled: { type: "select", options: ["haan", "nahi"], optionLabel: (v) => (v === "haan" ? t("machinery.haan") : t("machinery.nahi")), same: true },
  default_vendor: { type: "list", options: (L) => L.vendors, same: true },
  telematics_vendor: { type: "list", options: (L) => L.vendors, same: true },
  machine_type: { type: "list", options: (L) => L.machine_types, same: true },
  default_rate: { type: "number" },
  opening_hours: { type: "number" },
  opening_km: { type: "number" },
  fuel_per_hour: { type: "number" },
  insurance_till: { type: "date" },
  fitness_till: { type: "date" },
  puc_till: { type: "date" },
};
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
// Row ke neeche padhi hui tareekh — 06-07 ulta padha gaya ho to yahin dikhe, import ke baad nahi.
const importRowSub = (r) => [
  r.registration_no,
  r.machine_type,
  ...["insurance", "fitness", "puc"].map((d) => (ISO_DAY.test(String(r[d + "_till"] || "")) ? `${docLabel(d).slice(0, 3)} ${fmtD(r[d + "_till"])}` : null)),
].filter(Boolean).join(" · ");

function ImportWizard({ open, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [aoa, setAoa] = useState([]);
  const [firstRow, setFirstRow] = useState(1);
  const [headerRow, setHeaderRow] = useState(0);
  const [map, setMap] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const fx = useImportFix();

  useEffect(() => {
    if (!open) return;
    setStep(1); setFileName(""); setAoa([]); setFirstRow(1); setHeaderRow(0); setMap({});
    setResult(null); setBusy(""); setError(""); fx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const ws = wb.Sheets[wb.SheetNames[0]];
      // blankrows:true — row ka index sheet ki asli row se juda rahe. Khaali row
      // hata dene par row number khisak jaate the aur screen par galat row dikhti.
      const rows = ws && ws["!ref"] ? XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: "" }) : [];
      if (!rows.some((r) => (r || []).some((c) => String(c).trim()))) { setError(t("machinery.sheet_khaali_hai")); return; }
      // Header wo row hai jisme sabse zyada bhare hue cell hain — file ke upar
      // aksar title/logo ki adhoori rows hoti hain.
      let best = 0, bestN = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const n = (rows[i] || []).filter((c) => String(c).trim()).length;
        if (n > bestN) { bestN = n; best = i; }
      }
      setFileName(f.name); setAoa(rows); setFirstRow(XLSX.utils.decode_range(ws["!ref"]).s.r + 1); setHeaderRow(best);
      setMap(autoMap(rows[best] || []));
      setStep(2);
    } catch (_) { setError(t("machinery.file_padhne_me_dikkat_sahi_xlsx")); }
  };

  const header = aoa[headerRow] || [];
  // Har row ka likha hua text, bina badle — pehchanna aur padhna server karta hai.
  const fileRows = useMemo(() => {
    const out = [];
    for (let i = headerRow + 1; i < aoa.length; i++) {
      const r = aoa[i] || [];
      const raw = {};
      let any = false;
      for (const c of IMPORT_COLS) {
        if (map[c.key] == null) continue;
        const v = r[map[c.key]];
        const s = v == null ? "" : String(v).trim();
        raw[c.key] = s;
        if (s) any = true;
      }
      if (any) out.push({ row: firstRow + i, raw });
    }
    return out;
  }, [aoa, headerRow, map, firstRow]);

  const send = (rows, dryRun) => api.post("/machinery/import/rows", { rows, dry_run: dryRun }, { timeoutMs: dryRun ? 60000 : 120000 });

  const runCheck = async () => {
    setBusy("check"); setError("");
    const r = await send(fileRows, true);
    setBusy("");
    // Galti par server 422 + wahi rows bhejta hai; api() use { success:false, data } bana deta hai.
    if (r && r.data && r.data.rows) { fx.take(r.data, r.message, true); setStep(3); return; }
    setError((r && r.message) || t("import_fix.failed"));
  };

  const run = async (dryRun) => {
    const rows = fx.payload();
    if (!rows.length) { setError(t("import_fix.none_left")); return; }
    setBusy(dryRun ? "check" : "import"); setError("");
    const r = await send(rows, dryRun);
    setBusy("");
    if (!dryRun && r && r.success && r.data && r.data.committed) {
      setResult({ message: r.message, created: r.data.committed.created || [] });
      setStep(4); onDone();
      return;
    }
    if (r && r.data && r.data.rows) { fx.take(r.data, r.message, false); return; }
    setError((r && r.message) || t("import_fix.failed"));
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
  // Sudhaar screen par wahi box jinka column file me hai, ya jin par kisi row me galti hai.
  const errCols = new Set(fx.rows.flatMap((r) => r.error_fields || []));
  const fixFields = IMPORT_COLS
    .filter((c) => map[c.key] != null || errCols.has(c.key))
    .map((c) => ({ key: c.key, col: c.label.replace(/\s*\*\s*$/, ""), ...(FIX_OPTS[c.key] || {}) }));

  return (
    <Modal open={open} onClose={onClose} width={step === 3 ? 1040 : 860} title={t("machinery.excel_se_machines_import")}
      sub={fileName || t("machinery.naam_ke_alawa_sab_optional_baad")}
      footer={
        step === 1 ? <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        : step === 2 ? <><Btn ghost onClick={() => setStep(1)}>{t("common.peeche")}</Btn>
            <Btn onClick={runCheck} disabled={!!busy || !!missingReq.length || !fileRows.length}>{busy ? t("machinery.dekh_rahe_hain") : t("machinery.imp_check_n", { n: fileRows.length })}</Btn></>
        : step === 3 ? <><Btn ghost onClick={() => setStep(2)}>{t("common.peeche")}</Btn>
            {fx.stale
              ? <Btn onClick={() => run(true)} disabled={!!busy}>{busy ? t("import_fix.checking") : t("import_fix.recheck")}</Btn>
              : <Btn onClick={() => run(false)} disabled={!!busy || !fx.canImport}>{busy === "import" ? t("machinery.import_ho_raha_hai") : t("import_fix.import_go", { n: fx.counts.ok })}</Btn>}</>
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
            <PickSelect value={headerRow} onChange={(e) => { const h = Number(e.target.value); setHeaderRow(h); setMap(autoMap(aoa[h] || [])); }}
              style={{ ...inp, width: 150 }}>
              {aoa.slice(0, 10).map((r, i) => <option key={i} value={i}>{t("machinery.row_i", { i: firstRow + i })}</option>)}
            </PickSelect>
            <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.parsed_machine_mili", { parsed: fileRows.length })}</span>
          </div>
          {!!missingReq.length && (
            <div style={{ marginBottom: 12, padding: "9px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{t("machinery.missingreq_ka_column_chuno_uske_bina", { missingReq: missingReq.map((c) => c.label).join(", ") })}</div>
          )}
          {/* Ownership bahut kuch tay karti hai — kaagaz ka scope, diesel kiska,
              aur completeness ka hisaab. Column na mile to sab "rented" maani
              jaati hain; ye keh dena zaroori hai. */}
          {map.ownership == null && (
            <div style={{ marginBottom: 12, padding: "9px 12px", background: T.ambL, color: T.amb, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>
             {t("machinery.ownership_ka_column_nahi_chuna_saari")} <b>{t("machinery.rented")}</b> {t("machinery.maani_jayengi_apni_machines_baad_me")}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {IMPORT_COLS.map((c) => (
              <Field key={c.key} label={c.label + (c.required ? " *" : "")}>
                <PickSelect value={map[c.key] == null ? "" : map[c.key]}
                  onChange={(e) => setMap((p) => ({ ...p, [c.key]: e.target.value === "" ? null : Number(e.target.value) }))}
                  style={inp}>
                  <option value="">{t("machinery.nahi_hai")}</option>
                  {header.map((h, i) => <option key={i} value={i}>{String(h).trim() || `Column ${i + 1}`}</option>)}
                </PickSelect>
              </Field>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <ImportFixPanel fx={fx} fields={fixFields} title={(r) => r.name} sub={importRowSub} />
      )}

      {step === 4 && result && (
        <>
          <div style={{ padding: "13px 15px", background: T.grnL, border: `1px solid ${T.grn}33`, borderRadius: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.grn }}>{result.message}</div>
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
          <PickSelect value={f.service_type || "preventive"} onChange={(e) => upd("service_type", e.target.value)} style={inp}>
            <option value="preventive">{t("machinery.preventive_time_par")}</option>
            <option value="breakdown">{t("machinery.breakdown_kharab_hui")}</option>
            <option value="overhaul">{t("machinery.overhaul")}</option>
          </PickSelect>
        </Field>
        <Field label={t("common.payment")}>
          <PickSelect value={f.payment_mode || "cash"} onChange={(e) => upd("payment_mode", e.target.value)} style={inp}>
            <option value="cash">{t("machinery.cash_site_se_diya")}</option>
            <option value="credit">{t("machinery.udhaar_baad_me_pay")}</option>
          </PickSelect>
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
              <PickSelect value={it.part_category} onChange={(e) => updItem(i, "part_category", e.target.value)} style={inp}>
                {["oil", "filter", "tyre", "hydraulic", "electrical", "engine", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
              </PickSelect>
              <input value={it.cost} inputMode="decimal" onChange={(e) => updItem(i, "cost", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="₹" style={inp} />
              <input value={it.life_hours} inputMode="decimal" onChange={(e) => updItem(i, "life_hours", e.target.value.replace(/[^0-9.]/g, ""))} placeholder={t("machinery.life_hrs")} style={inp}
                title={t("machinery.is_part_ki_apni_life_ghante")} />
              <PickSelect value={it.template_id || ""} onChange={(e) => updItem(i, "template_id", e.target.value)} style={inp}
                title={t("machinery.kaunsa_service_task_poora_hua_uska")}>
                <option value="">{t("machinery.task")}</option>
                {(templates || []).map((t) => <option key={t.id} value={t.id}>{t.task}</option>)}
              </PickSelect>
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
          <PickSelect value={f.doc_type || "insurance"} onChange={(e) => upd("doc_type", e.target.value)} style={inp}>
            {DOC_TYPES.map((d) => <option key={d.k} value={d.k}>{d.l}</option>)}
          </PickSelect>
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
function MachineDetail({ id, onBack, onChanged, onEdit, onRemoved, canRemove, parties, cities }) {
  const [tab, setTab] = useState("ov");
  const [m, setM] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [services, setServices] = useState([]);
  const [svcDue, setSvcDue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docOpen, setDocOpen] = useState(false);
  const [meterOpen, setMeterOpen] = useState(false);
  // City badalna (shifting) — sirf admin; jawab me nayi city aur log.
  const [cityOpen, setCityOpen] = useState(false);
  const [cityLog, setCityLog] = useState([]);
  // Gaadi hatao — wahi admin, wajah zaroori. Hatne ke baad detail khulti hi
  // nahi (server sirf chalu machine deta hai), isliye seedha list par wapas.
  const [removeOpen, setRemoveOpen] = useState(false);
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
            {m.registration_no
              ? <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3, color: T.ind, background: T.indL, border: `1px solid ${T.ind}22`, borderRadius: 5, padding: "1px 7px", fontVariantNumeric: "tabular-nums" }}>{m.registration_no}</span>
              : <span style={{ color: T.amb }}>{t("machinery.registration_no_nahi_bhara")}</span>}
            <Pill label={m.city_name || t("machinery.city_nahi")} c={m.city_name ? T.t2 : T.amb} bg={m.city_name ? T.sltL : T.ambL} />
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
          {canMachEntry() && <Btn ghost icon={IcGauge} onClick={() => setMeterOpen(true)}>{t("machinery.meter")}</Btn>}
          {canShiftCity() && <Btn ghost onClick={() => setCityOpen(true)}>{t("machinery.city_badlo")}</Btn>}
          {canRemove && canRemoveMachine() && <Btn ghost onClick={() => setRemoveOpen(true)} style={{ color: T.red }}>{t("machinery.gaadi_hatao")}</Btn>}
          {onEdit && canMach("edit") && <Btn ghost onClick={() => onEdit(m)}>{t("common.edit_2")}</Btn>}
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
          {svcDue && svcDue.no_templates && canMach("create") && (
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
            action={canMachEntry() ? <Btn size="sm" icon={IcWrench} onClick={() => { setSvcEdit(null); setSvcOpen(true); }}>{t("machinery.service")}</Btn> : null}>
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
                    onClick={s.status === "open" && canMach("edit") ? () => { setSvcEdit(s); setSvcOpen(true); } : undefined}>
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
        <Panel title={t("machinery.documents_permits")} action={canMach("create") ? <Btn size="sm" icon={IcAdd} onClick={() => setDocOpen(true)}>{t("machinery.document")}</Btn> : null}>
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
                <span style={{ fontSize: 11, color: T.t3 }}>{localDT(ev.event_time)}</span>
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
      {/* Shifting — machine ek city se doosri me. Sirf admin (server par bhi
          wahi rok), aur har shift log hota hai: kahan se kahan, kisne, kab. */}
      <CityShiftModal open={cityOpen} onClose={() => setCityOpen(false)} machine={m} cities={cities || []}
        log={cityLog} onLoadLog={setCityLog}
        onSaved={() => { load(true); onChanged && onChanged(); }} />
      <RemoveMachineModal open={removeOpen} onClose={() => setRemoveOpen(false)} machine={m}
        onRemoved={() => { onRemoved ? onRemoved() : onBack(); }} />
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// CITY SHIFT — machine kis city me khadi hai
// ══════════════════════════════════════════════════════════════════
// Prafull ka niyam: shifting admin ya usse upar hi karega. City team apni
// city ki machine hi dekhti hai, isliye doosri city ki machine maangne ka
// sawaal hi nahi uthta. Har shift log hota hai — "machine kahan hai" ka
// jawab tabhi bharosemand rehta hai.
function CityShiftModal({ open, onClose, machine, cities, log, onLoadLog, onSaved }) {
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !machine) return;
    setTo(machine.city_id ? String(machine.city_id) : "");
    setNote(""); setErr("");
    api.get(`/machinery/fleet/${machine.id}/city-log`)
      .then((r) => onLoadLog(r && r.success ? r.data || [] : []))
      .catch(() => onLoadLog([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, machine && machine.id]);

  const save = async () => {
    if (!to) { setErr(t("machinery.city_chuno")); return; }
    setBusy(true); setErr("");
    const r = await api.post(`/machinery/fleet/${machine.id}/city`, { city_id: Number(to), note: note.trim() || null });
    setBusy(false);
    if (!r || r.success === false) { setErr((r && r.message) || t("common.something_went_wrong")); return; }
    onSaved(); onClose();
  };

  if (!machine) return null;
  return (
    <Modal open={open} onClose={onClose} width={520}
      title={t("machinery.city_badlo")} sub={machine.name}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : t("machinery.shift_karo")}</Btn></>}>
      <Field label={t("machinery.abhi_kahan_hai")}>
        <div style={{ fontSize: 13, fontWeight: 700, color: machine.city_name ? T.t1 : T.amb }}>
          {machine.city_name || t("machinery.city_nahi")}
        </div>
      </Field>
      <div style={{ height: 10 }} />
      <Field label={t("machinery.ab_kis_city_me")}>
        <PickSelect value={to} onChange={(e) => setTo(e.target.value)} style={inp}>
          <option value="">{t("machinery.city_chuno")}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </PickSelect>
      </Field>
      <div style={{ height: 10 }} />
      <Field label={t("machinery.wajah_optional")}>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("machinery.e_g_bhilai_site_par_kaam_shuru")} style={inp} />
      </Field>
      {err && <Notice>{err}</Notice>}
      {log && log.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${T.b1}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t2, marginBottom: 6 }}>{t("machinery.shifting_ka_itihaas")}</div>
          {log.map((l) => (
            <div key={l.id} style={{ fontSize: 11.5, color: T.t3, padding: "3px 0" }}>
              {(l.from_city_name || t("machinery.city_nahi")) + " → " + (l.to_city_name || t("machinery.city_nahi"))}
              <span style={{ color: T.t4 }}>{" · " + fmtD(l.created_at) + (l.moved_by_name ? " · " + l.moved_by_name : "")}</span>
              {l.note ? <span style={{ color: T.t4 }}>{" · " + l.note}</span> : null}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// GAADI HATAO — fleet / trip list se nikalna (3 Oct 2026)
// ══════════════════════════════════════════════════════════════════
// Prafull: alag approval nahi — admin wajah likh kar seedha hatata hai.
// Record mitta nahi (server is_active=0 karta hai): purani trips, fuel aur
// service waise hi rehte hain, aur wajah + kisne + kab darj hota hai. Gaadi
// raste me ho (trip khuli) to server 409 open_trip deta hai — uska message
// jaisa ka taisa dikhate hain, wahi batata hai ki pehle kya karna hai.
function RemoveMachineModal({ open, onClose, machine, onRemoved }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  // Gaadi hatne par uski POORI HUI trips nahi hatti — wo hisaab ka record hai.
  // Pehle ye kahin likha nahi tha, to "gaadi hata di, phir bhi trip dikh rahi
  // hai" wali galatfehmi hoti thi (6 Oct 2026). Ab ginti yahin dikha dete hain.
  const [trips, setTrips] = useState(null);

  useEffect(() => {
    if (!open) return;
    setReason(""); setErr(""); setBusy(false); setTrips(null);
    let dead = false;
    api.get("/trips?vehicle_id=" + machine.id)
      .then((r) => { if (!dead) setTrips(r && r.success && Array.isArray(r.data) ? r.data.length : 0); })
      .catch(() => { if (!dead) setTrips(0); });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, machine && machine.id]);

  const save = async () => {
    const why = reason.trim();
    if (why.length < 3) { setErr(t("machinery.hatao_wajah_min")); return; }
    setBusy(true); setErr("");
    const r = await api.post(`/machinery/fleet/${machine.id}/remove`, { reason: why });
    setBusy(false);
    if (!r || r.success === false) { setErr(srvMsg(r)); return; }
    onClose();
    if (onRemoved) onRemoved();
  };

  if (!machine) return null;
  const sub = [machine.name, machine.registration_no].filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i).join(" · ");
  return (
    <Modal open={open} onClose={onClose} width={500} title={t("machinery.gaadi_hatao")} sub={sub}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn c={T.red} onClick={save} disabled={busy}>{busy ? t("machinery.hata_rahe_hain") : t("machinery.haan_hatao")}</Btn></>}>
      <Notice>{t("machinery.hatao_note")}</Notice>
      {trips > 0 && <Notice>{t("machinery.hatao_trips_note", { n: trips })}</Notice>}
      <Field label={t("machinery.hatao_wajah")} hint={t("machinery.hatao_wajah_hint")}>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300}
          placeholder={t("machinery.hatao_wajah_ph")} style={{ ...inp, resize: "vertical" }} />
      </Field>
      {err && <ErrBox>{err}</ErrBox>}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// TRIP VEHICLES — vendor / kiraye ki trip wali gaadiyan (3 Oct 2026)
// ══════════════════════════════════════════════════════════════════
// Ye gaadiyan Fleet list me nahi aatin (server hi chhaant deta hai): Fleet
// apni machine ki list hai, aur dumper-tipper ki lambi vendor list usme
// asli machine dhak deti thi. Yahan Finance ke "Unbilled Material" jaisa —
// vendor ka dabba → uski gaadiyan → trips / km / ₹. Nayi gaadi yahin se ya
// Trip Tracking (web + app) se banti hai; apni gaadi Fleet se hi aati hai.
//
// Bill kaise banta hai (server ka trip_billing, purani gaadi ka bhi
// "effective" roop aata hai): km = vendor ka rate card, trip = route ka
// rate, monthly = mahine ka kiraya (trip sirf record), own = apni gaadi,
// pending = "Rate baaki" (4 Oct 2026 — site par phone se judi gaadi, rate
// office tay karega; card lagne tak trip RATE PENDING).
const TRIP_BILLING = {
  km:      { get l() { return t("machinery.tv_bill_km"); },      get hint() { return t("machinery.tv_bill_km_hint"); },      c: T.ind, bg: T.indL },
  trip:    { get l() { return t("machinery.tv_bill_trip"); },    get hint() { return t("machinery.tv_bill_trip_hint"); },    c: T.blu, bg: T.bluL },
  monthly: { get l() { return t("machinery.tv_bill_monthly"); }, get hint() { return t("machinery.tv_bill_monthly_hint"); }, c: T.amb, bg: T.ambL },
  pending: { get l() { return t("machinery.tv_bill_pending"); }, get hint() { return t("machinery.tv_bill_pending_hint"); }, c: T.amb, bg: T.ambL },
  own:     { get l() { return t("machinery.tv_bill_own"); },     c: T.slt, bg: T.sltL },
  // "Tay nahi" (7 Oct 2026) — fleet ki kiraye ki gaadi jis par abhi koi tareeka nahi; card lagne par card ka tareeka.
  unset:   { get l() { return t("tripbill.bill_unset"); },       get hint() { return t("tripbill.bill_unset_hint"); }, c: T.amb, bg: T.ambL },
};
// Form me chunne layak (own nahi — apni gaadi Fleet se aati hai).
const TV_BILL_CHOICES = ["km", "trip", "monthly", "pending"];
const billingMeta = (k) => TRIP_BILLING[k] || (k == null ? TRIP_BILLING.unset : TRIP_BILLING.trip);
// Trip ki gaadi ka vendor aksar "transporter" role me hota hai.
const TRIP_VENDOR_ROLES = ["transporter", ...HIRE_VENDOR_ROLES];

function TripVehicleForm({ open, onClose, onSaved, vehicle, parties, cities, setCities, defaultCity }) {
  const editing = !!(vehicle && vehicle.id);
  const [reg, setReg] = useState("");
  const [vendor, setVendor] = useState(null);
  const [billing, setBilling] = useState("");
  const [capQty, setCapQty] = useState("");
  const [capUnit, setCapUnit] = useState("");
  const [driver, setDriver] = useState("");
  // City sirf nayi gaadi par — upar city patti me jo city chuni ho wahi pehle se.
  const [cityId, setCityId] = useState("");
  useEffect(() => { if (open && !(vehicle && vehicle.id)) setCityId(defaultCity || ""); }, [open, vehicle, defaultCity]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setReg((vehicle && vehicle.registration_no) || "");
    setCapQty(vehicle && vehicle.capacity_qty != null ? String(Number(vehicle.capacity_qty)) : "");
    setCapUnit((vehicle && vehicle.capacity_unit) || "");
    setVendor(vehicle && vehicle.vendor_id ? String(vehicle.vendor_id) : null);
    // Nayi gaadi par billing jaan-boojh kar khaali — km aur per-trip ka farak
    // paisa badal deta hai, ye aadmi khud soch kar chune.
    setBilling(vehicle && TV_BILL_CHOICES.includes(vehicle.trip_billing) ? vehicle.trip_billing : "");
    setDriver(""); setErr(""); setBusy(false);
  }, [open, vehicle]);

  const save = async () => {
    if (!reg.trim()) { setErr(t("machinery.tv_err_reg")); return; }
    if (!vendor) { setErr(t("machinery.tv_err_vendor")); return; }
    if (!billing) { setErr(t("machinery.tv_err_billing")); return; }
    // Capacity zaroori (4 Oct 2026) — rate card isi se gaadi chunta hai.
    const cap = capCheck(capQty, capUnit);
    if (!cap.ok) { setErr(t("machinery.tv_err_capacity")); return; }
    setBusy(true); setErr("");
    const body = { registration_no: reg.trim(), vendor_id: Number(vendor), trip_billing: billing,
      capacity_qty: cap.qty, capacity_unit: cap.unit };
    const r = editing
      ? await api.put(`/trips/trucks/${vehicle.id}`, body)
      : await api.post("/trips/trucks", { ...body, ...(driver.trim() ? { driver_name: driver.trim() } : {}), ...(cityId ? { city_id: Number(cityId) } : {}) });
    setBusy(false);
    if (!r || r.success === false) { setErr(srvMsg(r)); return; }
    onClose();
    // Billing / vendor badalne se card gaadi ka nahi raha — server ne hata diya.
    if (r.data && r.data.rate_card_cleared) window.alert(t("machinery.tv_card_hat_gaya"));
    if (onSaved) onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} width={560}
      title={editing ? t("machinery.tv_edit_title") : t("machinery.tv_add_title")}
      sub={editing ? vehicle.registration_no : t("machinery.tv_add_sub")}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Btn></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label={t("machinery.tv_f_reg")}>
          <input value={reg} onChange={(e) => setReg(e.target.value)} placeholder={t("machinery.tv_f_reg_ph")} style={inp} />
        </Field>
        <Field label={t("machinery.tv_f_vendor")}>
          <PartyPicker value={vendor} onChange={setVendor} parties={parties || []} roles={TRIP_VENDOR_ROLES}
            placeholder={t("machinery.tv_f_vendor_ph")} />
        </Field>
        <Field label={t("machinery.tv_f_capacity")}
          hint={editing && vehicle.capacity && vehicle.capacity_qty == null ? t("machinery.cap_purana_likha", { text: vehicle.capacity }) : t("machinery.tv_f_capacity_hint")}>
          <CapInput qty={capQty} unit={capUnit} onQty={setCapQty} onUnit={setCapUnit} />
        </Field>
      </div>
      <div style={{ height: 12 }} />
      <Field label={t("machinery.tv_f_billing")}>
        <div style={{ display: "grid", gap: 7 }}>
          {TV_BILL_CHOICES.map((k) => {
            const m = TRIP_BILLING[k];
            const on = billing === k;
            return (
              <label key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface }}>
                <input type="radio" name="tv_billing" checked={on} onChange={() => setBilling(k)} style={{ marginTop: 2, accentColor: T.ind }} />
                <span>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{m.l}</span>
                  <span style={{ display: "block", fontSize: 11, color: T.t3, marginTop: 1, lineHeight: 1.45 }}>{m.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </Field>
      {!editing && (
        <>
          <div style={{ height: 12 }} />
          <Field label={t("machinery.tv_f_driver")}>
            <input value={driver} onChange={(e) => setDriver(e.target.value)} maxLength={80} style={inp} />
          </Field>
          <div style={{ height: 12 }} />
          <Field label={t("machinery.city")} hint={t("machinery.is_city_ke_sab_project_par")}>
            <CityPicker value={cityId} onChange={(v) => setCityId(v)} cities={cities || []} setCities={setCities}
              placeholder={t("machinery.city_chuno")} selectStyle={inp} />
          </Field>
        </>
      )}
      {err && <ErrBox>{err}</ErrBox>}
    </Modal>
  );
}

// Khoj (4 Oct 2026): har shabd gaadi number (space / dash / dot ke bina),
// naam, vendor, capacity ya rate card ke naam me — Trip Tracking jaisa.
const matchTv = (v, vendorName, q) => {
  const toks = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!toks.length) return true;
  const hay = [v.name, v.registration_no, vendorName, capOf(v), v.rate_card_name].map((x) => String(x || "").toLowerCase());
  const regs = [normReg(v.registration_no), normReg(v.name)];
  return toks.every((tok) => hay.some((h) => h.includes(tok)) || (!!normReg(tok) && regs.some((x) => x.includes(normReg(tok)))));
};

// ══════════════════════════════════════════════════════════════════
// RATE CARD — Trip vehicles ka "Rate card" hissa (4 Oct 2026)
//
// Prafull: rate OFFICE tay karta hai, aur office Machinery → Trip vehicles
// me kaam karta hai (company level) — Trip Tracking project ke andar hai,
// wahan ab card sirf dikhta hai. Isliye card banana / badalna / hatana,
// "Gaadi select karo" aur gaadi-wise "Card lagao" yahan hain (Trip Tracking
// se yahan laaye gaye — module independence: wahan se hataye, copy nahi).
// Naam wala card ("500 cft", "Hyva — per trip"), Kiska ("Sab vendor" ya ek
// vendor), capacity (marzi) aur tareeka: Km slab (1st km, 2nd km … isse aage
// har km) ya Per trip (fixed ₹). Ek gaadi par ek card; card lagte hi gaadi ka
// billing card ke tareeke ka — "Rate baaki" (phone se judi, rate office tay
// karega) gaadi bhi, aur uski RATE PENDING trips usi card se bharti hain. Har
// trip apne waqt ke card ki copy rakhti hai. Badalne ka haq server ke
// rateGate jaisa — 5 Oct 2026 se sirf Finance Create (strict); Equipment Edit nahi.
// ══════════════════════════════════════════════════════════════════
const canEditRates = () => canAny("Finance", "create", { strict: true });
// "Rate badlo" (ek trip ka rate, 4 Oct 2026) — server ka overrideGate: 5 Oct
// 2026 se wahi Finance Create (strict). Approver / PM role / Equipment Edit nahi.
// Asli rok server par; yahan sirf button chhupana.
const canOverrideRate = () => canEditRates();
// Trip par "Rate badlo" kab: poori hui, bill me nahi, reject nahi, aur bill
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
// Trip ka "Rate badla" JSON — TEXT (purana client / seedha DB) ya object.
const overrideOf = (tr) => {
  const v = tr && tr.rate_override;
  if (!v) return null;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return null; }
};
// Date + waqt — "4 Oct 26, 2:15 PM" (itihaas / tooltip).
const fmtDT = (raw) => {
  if (!raw) return "—";
  const d = new Date(String(raw).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(raw).slice(0, 16);
  let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return fmtD(d) + ", " + h + ":" + String(m).padStart(2, "0") + " " + ap;
};

// ── Km rate card ka ganit ───────────────────────────────────────
// Server ke utils/tripKm.js (roundKm / amountForKm) jaisa hi — yahan sirf
// DIKHANE ke liye (editor ka example, list ka "10 km = ₹"). Asli amount server
// banata hai; dono ka ganit alag hua to screen ka ₹ aur bill ka ₹ alag aayega.
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
// Server rates JSON text bhi bhej sakta hai, array bhi.
const parseRates = (v) => {
  try { const a = Array.isArray(v) ? v : JSON.parse(v || "[]"); return Array.isArray(a) ? a.map(Number) : []; }
  catch { return []; }
};
// Rate card ke rate paise me bhi ho sakte hain (₹12.50) — wahan gol nahi karte.
const rs2 = (v) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtKm = (v) => (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

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
const kindLabel = (k) => RT_KIND[k === "trip" ? "trip" : "km"].label;
// Server se aaya card — rates JSON text ho sakta hai, paisa string.
const normCard = (c) => ({ ...c, rates: parseRates(c.rates), onward_rate: Number(c.onward_rate) || 0,
  method: c.method === "cumulative" ? "cumulative" : "slab", round_mode: RC_ROUND[c.round_mode] ? c.round_mode : "nearest" });
const slabText = (c) => {
  const shown = c.rates.slice(0, 5).map((r, i) => nth(i + 1) + " " + rs2(r));
  if (c.rates.length > 5) shown.push("… +" + (c.rates.length - 5));
  shown.push(t("trip_tracking.rc_onward_short", { rate: rs2(c.onward_rate) }));
  return shown.join(" · ");
};
// Card ke rate ki ek line — Per trip ka ₹, ya km slab.
const rateLine = (c) => (c.kind === "trip" ? t("trip_tracking.rt_per_trip_amt", { amt: rs2(c.trip_rate) }) : slabText(normCard(c)));
const kiskaOf = (c, parties) => (c.vendor_id == null ? t("trip_tracking.rt_sab_vendor")
  : c.vendor_name || ((parties || []).find((p) => String(p.id) === String(c.vendor_id)) || {}).name || "#" + c.vendor_id);
// /trips/trucks ki row — naya server vendor_id, purana default_vendor_id.
const truckVendorId = (r) => (r.vendor_id != null ? r.vendor_id : (r.default_vendor_id != null ? r.default_vendor_id : null));
// "Rate tay karna baaki" wali gaadi: chalu card nahi aur billing Rate baaki / Km / Per trip / Tay nahi.
const rateBaaki = (r) => !r.rate_card_id && ["pending", "km", "trip", "unset"].includes(r.trip_billing);
const rcLbl = { fontSize: 10.5, color: T.t4, marginBottom: 4, fontWeight: 600 };
const linkBtn = (c) => ({ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, color: c });

function RupeeInput({ value, onChange, bad, autoFocus }) {
  return (
    <div style={{ position: "relative", width: 140, flexShrink: 0 }}>
      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.t3, pointerEvents: "none" }}>₹</span>
      <input value={value} inputMode="decimal" autoFocus={autoFocus} placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        style={{ ...inp, paddingLeft: 24, fontVariantNumeric: "tabular-nums", borderColor: bad ? T.red : T.b1, background: bad ? T.redL : T.surface }} />
    </div>
  );
}

// ── Card banao / badlo ───────────────────────────────────────────
// Prafull: "entry aur report non-technical aadmi ke liye aasaan ho" — rows
// waise hi bolti hain jaise vendor bolta hai, aur saath me chalta-phirta example.
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
  const [showHist, setShowHist] = useState(false);
  // Kitni gaadi par ye card laga hai (har city ki) — future-only note isi par.
  const onCardN = editing ? (card.vehicles_total != null ? Number(card.vehicles_total) : Number(card.vehicles) || 0) : 0;

  const numOk = (v) => v !== "" && v != null && Number.isFinite(Number(v)) && Number(v) >= 0;
  const cap = capCheck(capQty, capUnit);
  const badRate = rates.map((r) => !numOk(r));
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
    // Tareeka badla (Km slab ↔ Per trip) → card wali saari gaadi ka billing
    // bhi badlega (server ek saath karta hai) — pehle pooch lo.
    const onCard = editing ? (card.vehicles_total != null ? Number(card.vehicles_total) : Number(card.vehicles) || 0) : 0;
    if (editing && card.kind !== kind && onCard > 0
      && !window.confirm(t("trip_tracking.rt_kind_badal_confirm", { n: onCard, kind: RT_KIND[kind].label }))) return;
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, flex: 1, minWidth: 160 }}>
          {editing ? t("trip_tracking.rt_edit_title", { name: card.name }) : t("trip_tracking.rc_new")}
        </span>
        {editing && (
          <button type="button" onClick={() => setShowHist((v) => !v)} style={linkBtn(showHist ? T.t3 : T.ind)}>
            {t("trip_tracking.rt_itihaas")} {showHist ? "▴" : "▾"}
          </button>
        )}
      </div>
      {/* Prafull (4 Oct 2026, pakka): card badlo to naya rate SIRF aage ki trip par —
          bani hui trip apne waqt ka paisa rakhti hai. Gaadi wale card par yahi
          saaf likha rahe, taaki "rate badla par purani trip waisi hi" shikayat na aaye. */}
      {editing && onCardN > 0 && (
        <div style={{ border: `1px solid ${T.amb}55`, background: T.ambL, borderRadius: 8, padding: "8px 11px", marginBottom: 10, fontSize: 12, color: T.t2, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: T.amb }}>{t("trip_tracking.rt_future_only", { n: onCardN })}</span>
          <span style={{ display: "block", fontSize: 11, color: T.t3, marginTop: 2 }}>{t("trip_tracking.rt_future_only_hint")}</span>
        </div>
      )}
      {editing && showHist && <CardHistory tplId={card.id} parties={parties} />}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1fr", gap: 10 }}>
        <div><div style={rcLbl}>{t("trip_tracking.rt_naam_req")}</div>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t("trip_tracking.rt_naam_ph")}
            style={{ ...inp, borderColor: tried && !name.trim() ? T.red : T.b1 }} /></div>
        <div><div style={rcLbl}>{t("trip_tracking.rt_kiska")}</div>
          <PickSelect value={vendorId} onChange={(e) => setVendorId(e.target.value)} style={inp}>
            <option value="">{t("trip_tracking.rt_sab_vendor")}</option>
            {(parties || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </PickSelect></div>
        <div><div style={rcLbl}>{t("trip_tracking.rt_capacity_opt")}</div>
          <CapInput qty={capQty} unit={capUnit} onQty={setCapQty} onUnit={setCapUnit} bad={tried && cap.bad} /></div>
      </div>
      <div style={{ fontSize: 11, color: T.t4, marginTop: 5 }}>{vendorId ? t("trip_tracking.rt_kiska_vendor_hint") : t("trip_tracking.rt_kiska_sab_hint")}</div>

      <div style={secT}>{t("trip_tracking.rt_tareeka")}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["km", "trip"].map((k) => (
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
                {["slab", "cumulative"].map((k) => (
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
                        onChange={(v) => setRates((rs) => rs.map((x, j) => (j === i ? v : x)))} />
                      <span style={{ flex: 1 }} />
                      {last && rates.length > 1 && (
                        <button type="button" title={t("trip_tracking.rc_remove_km")} onClick={() => { setRates((rs) => rs.slice(0, -1)); setFocusIdx(null); }}
                          style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surface, color: T.t3, cursor: "pointer", fontSize: 13, lineHeight: 1, fontFamily: "inherit" }}>✕</button>
                      )}
                    </div>
                  );
                })}
                <div style={{ padding: "7px 12px", borderBottom: `1px solid ${T.b1}`, display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" disabled={rates.length >= RC_MAX}
                    onClick={() => { setFocusIdx(rates.length); setRates((rs) => [...rs, ""]); }}
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
                {Object.keys(RC_ROUND).map((k) => (
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
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("trip_tracking.rc_note_ph")} style={inp} />
        </div>

        {/* ── Daayan: chalta-phirta example ── */}
        <div style={{ border: `1px solid ${T.b1}`, borderRadius: 10, background: T.surface, padding: 14, position: "sticky", top: 8, marginTop: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("trip_tracking.rc_ex_title")}</div>
          <div style={{ fontSize: 11, color: T.t4, margin: "2px 0 10px", lineHeight: 1.45 }}>{kind === "trip" ? t("trip_tracking.rt_ex_trip_sub") : t("trip_tracking.rc_ex_sub")}</div>
          {kind === "trip" ? (
            <>
              <div style={rcLbl}>{t("trip_tracking.rt_ex_trips")}</div>
              <input value={exTrips} inputMode="numeric" onChange={(e) => setExTrips(e.target.value.replace(/[^0-9]/g, ""))} style={{ ...inp, width: 120, fontVariantNumeric: "tabular-nums" }} />
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
              <div style={rcLbl}>{t("trip_tracking.rc_ex_km")}</div>
              <input value={exKm} inputMode="decimal" onChange={(e) => setExKm(e.target.value.replace(/[^0-9.]/g, ""))} style={{ ...inp, width: 120, fontVariantNumeric: "tabular-nums" }} />
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
        <Btn ghost onClick={onCancel}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? t("common.saving_2") : t("trip_tracking.rc_save")}</Btn>
      </div>
    </div>
  );
}

// ── Gaadi select karo ─────────────────────────────────────────────
// Card kis gaadi par lage. Sirf chalu trip gaadi; vendor wale card par sirf
// usi vendor ki. Chhanni: vendor (Sab vendor card par), capacity (card ki
// capacity pehle se chuni), khoj, aur "Sirf rate baaki gaadi" (amber dabbe se
// aaye to pehle se on). Save se pehle server se poochte hain (preview) —
// kaunsi gaadi kis card se aa rahi hai, kiska billing badlega (Mahina wali
// gaadi bhi), kaunsi hat rahi hai — aur wahi dikha kar pakka. "Rate baaki"
// gaadi ka card ke tareeke par aana to hona hi hai — wo akela poochne ki
// wajah nahi, bas confirm khule to saath me likha aata hai.
function VehiclePicker({ tpl, trucks, parties, onlyBaaki, onCancel, onSaved, cityOk, cityName }) {
  const kindLbl = kindLabel(tpl.kind);
  // Trip gaadi + fleet ki kiraye ki gaadi (7 Oct 2026) — Owned (apni) nahi.
  const cands = (trucks || []).filter((r) => (r.is_trip_vehicle || (r.trip_billing && r.trip_billing !== "own")) && Number(r.is_active) !== 0
    && (tpl.vendor_id == null || String(truckVendorId(r)) === String(tpl.vendor_id)))
    .sort((a, b) => ((Number(b.rate_card_id) === Number(tpl.id)) - (Number(a.rate_card_id) === Number(tpl.id)))
      || String(a.registration_no || a.name || "").localeCompare(String(b.registration_no || b.name || "")));
  // Bina vendor wali gaadi par card nahi lagta (uska bill kisi ke naam nahi
  // banta — server 400 deta hai): dikhti hai par tick band, saath me wajah.
  const noVendor = (r) => truckVendorId(r) == null;
  const [sel, setSel] = useState(() => new Set(cands.filter((r) => Number(r.rate_card_id) === Number(tpl.id) && !noVendor(r)).map((r) => r.id)));
  const caps = [...new Set(cands.map(capOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const [fCap, setFCap] = useState(tpl.capacity && caps.includes(tpl.capacity) && !onlyBaaki ? tpl.capacity : "");
  const [fVendor, setFVendor] = useState("");
  const [fBaaki, setFBaaki] = useState(!!onlyBaaki);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const vName = (r) => r.vendor_name || r.default_vendor_name || "";
  const vendorOpts = tpl.vendor_id == null
    ? [...new Map(cands.filter((r) => truckVendorId(r) != null).map((r) => [String(truckVendorId(r)), vName(r) || "#" + truckVendorId(r)])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
    : [];
  const hasNoVendor = tpl.vendor_id == null && cands.some((r) => truckVendorId(r) == null);
  const shown = cands.filter((r) => (!fCap || capOf(r) === fCap)
    && (!fBaaki || rateBaaki(r))
    && (!fVendor || (fVendor === "none" ? truckVendorId(r) == null : String(truckVendorId(r)) === fVendor))
    && (!cityOk || cityOk(r))
    && matchTv(r, vName(r), q));
  const pickable = shown.filter((r) => !noVendor(r));
  const allOn = pickable.length > 0 && pickable.every((r) => sel.has(r.id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); pickable.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id))); return n; });
  const regOf = (id) => { const r = (trucks || []).find((x) => x.id === id); return r ? (r.registration_no || r.name) : "#" + id; };

  const save = async () => {
    const ids = [...sel];
    setBusy(true);
    const p = await api.put(`/trips/rate-templates/${tpl.id}/vehicles?preview=1`, { vehicle_ids: ids });
    if (!p || p.success === false) { setBusy(false); window.alert((p && p.message) || t("trip_tracking.save_fail")); return; }
    const d = p.data || {};
    const lines = [];
    (d.moved_from || []).forEach((m) => lines.push(t("trip_tracking.gs_moved_line", { reg: regOf(m.vehicle_id), name: m.from_name || "—" })));
    const bc = d.billing_changes || [];
    const mon = bc.filter((b) => b.from === "monthly");
    const otherB = bc.filter((b) => b.from !== "monthly" && b.from !== "pending");
    if (mon.length) lines.push(t("trip_tracking.gs_monthly_line", { list: mon.map((b) => regOf(b.vehicle_id)).join(", "), kind: kindLbl }));
    if (otherB.length) lines.push(t("trip_tracking.gs_billing_line", { n: otherB.length, kind: kindLbl }));
    if (d.removed) lines.push(t("trip_tracking.gs_removed_line", { n: d.removed }));
    // "Rate baaki" gaadi — card ke tareeke par aana to hona hi hai, par kitni
    // RATE PENDING trip ka paisa banne wala hai ye save se PEHLE dikhe.
    const pend = bc.filter((b) => b.from === "pending");
    if (pend.length) {
      const byV = d.trips_by_vehicle || {};
      lines.push(t("trip_tracking.gs_pending_line", { n: pend.length, kind: kindLbl,
        m: pend.reduce((a, b) => a + (Number(byV[b.vehicle_id]) || 0), 0) }));
    }
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
        {kiskaOf(tpl, parties)} · {kindLbl}{tpl.capacity ? " · " + tpl.capacity : ""}{cityName ? " · " + t("trip_tracking.tc_sirf_city", { city: cityName }) : ""} — {t("trip_tracking.gs_hint", { kind: kindLbl })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0 8px", flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("machinery.tv_khoj_ph")}
          style={{ ...fltS, flex: 1, minWidth: 200, borderColor: q ? T.ind : T.b1 }} />
        {tpl.vendor_id == null && (vendorOpts.length > 0 || hasNoVendor) && (
          <PickSelect value={fVendor} onChange={(e) => setFVendor(e.target.value)} style={{ ...fltS, borderColor: fVendor ? T.ind : T.b1 }}>
            <option value="">{t("trip_tracking.rt_sab_vendor")}</option>
            {vendorOpts.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
            {hasNoVendor && <option value="none">{t("machinery.tv_vendor_nahi")}</option>}
          </PickSelect>
        )}
        {caps.length > 0 && (
          <PickSelect value={fCap} onChange={(e) => setFCap(e.target.value)} style={{ ...fltS, borderColor: fCap ? T.ind : T.b1 }}>
            <option value="">{t("machinery.tv_sab_capacity")}</option>
            {caps.map((c) => <option key={c} value={c}>{c}</option>)}
          </PickSelect>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: fBaaki ? T.amb : T.t2, fontWeight: fBaaki ? 700 : 500, cursor: "pointer" }}>
          <input type="checkbox" checked={fBaaki} onChange={(e) => setFBaaki(e.target.checked)} style={{ accentColor: T.amb }} />
          {t("trip_tracking.gs_sirf_baaki")}
        </label>
      </div>
      <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, background: T.surface, maxHeight: 360, overflowY: "auto" }}>
        {!trucks && <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("common.loading_2")}</div>}
        {trucks && cands.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("trip_tracking.gs_koi_gaadi_nahi")}</div>}
        {trucks && cands.length > 0 && shown.length === 0 && <div style={{ padding: 18, textAlign: "center", fontSize: 12, color: T.t4 }}>{t("machinery.tv_khoj_me_nahi")}</div>}
        {pickable.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 12px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, cursor: "pointer", position: "sticky", top: 0 }}>
            <input type="checkbox" checked={allOn} onChange={toggleAll} style={{ accentColor: T.ind }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.t2 }}>{t("trip_tracking.gs_sab_dikh_rahi", { n: pickable.length })}</span>
          </label>
        )}
        {shown.map((r) => {
          const on = sel.has(r.id);
          const blocked = noVendor(r);
          const elsewhere = r.rate_card_id && Number(r.rate_card_id) !== Number(tpl.id);
          const bm = billingMeta(r.trip_billing);
          return (
            <label key={r.id} style={{ display: "grid", gridTemplateColumns: "22px minmax(110px,1.1fr) minmax(110px,1.2fr) 90px minmax(130px,1.4fr) 90px", alignItems: "center", gap: 8, padding: "9px 12px", borderBottom: `1px solid ${T.b1}`, borderLeft: `3px solid ${on && elsewhere ? T.amb : "transparent"}`, cursor: blocked ? "not-allowed" : "pointer", background: on ? T.indL + "88" : "transparent", opacity: blocked ? 0.6 : 1 }}>
              <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle(r.id)} style={{ accentColor: T.ind }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: T.t1, letterSpacing: 0.3 }}>{r.registration_no || r.name}</span>
              <span style={{ fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vName(r) || t("machinery.tv_vendor_nahi")}</span>
              <span style={{ fontSize: 11.5, color: capOf(r) ? T.t2 : T.t4 }}>{capOf(r) || "—"}</span>
              <span style={{ fontSize: 11, color: blocked || elsewhere ? T.amb : T.t4, fontWeight: blocked || elsewhere ? 700 : 500 }}>
                {blocked ? t("trip_tracking.gs_bina_vendor")
                  : elsewhere ? (on ? t("trip_tracking.tc_se_aayegi", { name: r.rate_card_name || "—" }) : t("trip_tracking.gs_pehle_par", { name: r.rate_card_name || "—" }))
                  : Number(r.rate_card_id) === Number(tpl.id) ? t("trip_tracking.gs_is_card_par") : ""}
              </span>
              <span><Pill label={bm.l} c={bm.c} bg={bm.bg} /></span>
            </label>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.t2, marginRight: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {t("trip_tracking.gs_n_select", { n: sel.size })}
          {(() => {
            const moving = cands.filter((r) => sel.has(r.id) && r.rate_card_id && Number(r.rate_card_id) !== Number(tpl.id)).length;
            const leaving = cands.filter((r) => !sel.has(r.id) && Number(r.rate_card_id) === Number(tpl.id)).length;
            return <>
              {moving > 0 && <span style={{ color: T.amb }}>{t("trip_tracking.tc_aayengi", { n: moving })}</span>}
              {leaving > 0 && <span style={{ color: T.red }}>{t("trip_tracking.tc_hategi", { n: leaving })}</span>}
            </>;
          })()}
        </span>
        <Btn ghost onClick={onCancel}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !trucks}>{busy ? t("common.saving_2") : t("trip_tracking.gs_save")}</Btn>
      </div>
    </div>
  );
}

// ── Card ka itihaas (4 Oct 2026) ─────────────────────────────────
// GET /trips/rate-templates/:id/history — har save ki row (kisne, kab, kya).
// Padhne laayak line before/after ke farak se: "Rate badla: 1st ₹100→₹120,
// aage ₹60→₹70" / "Gaadi lagi: 3" / "Card hataya"; kuch na pakda jaaye to
// "Badla". Sirf dikhane ko — server ka JSON hi sach hai.
function historyLine(h, tplId, parties) {
  const a = h.after || {}, b = h.before || {};
  if (h.action === "created") return t("trip_tracking.rt_h_created") + (a.name ? " — " + rateLine(a) : "");
  if (h.action === "deleted") return t("trip_tracking.rt_h_deleted");
  if (h.action === "vehicles") {
    if (a.vehicle_id != null) {
      const reg = a.registration_no ? " · " + a.registration_no : "";
      return (Number(a.rate_card_id) === Number(tplId) ? t("trip_tracking.rt_h_gaadi_lagi", { n: 1 }) : t("trip_tracking.rt_h_gaadi_hati", { n: 1 })) + reg;
    }
    // vehicles_changed = asli badlav (jo nayi lagi); purani row me sirf assigned (poori list) tha.
    const added = h.vehicles_changed != null ? Number(h.vehicles_changed) : (Number(a.added != null ? a.added : a.assigned) || 0);
    const parts = [];
    if (added > 0 || !(Number(a.removed) > 0)) parts.push(t("trip_tracking.rt_h_gaadi_lagi", { n: added }));
    if (Number(a.removed) > 0) parts.push(t("trip_tracking.rt_h_gaadi_hati", { n: Number(a.removed) }));
    return parts.join(" · ");
  }
  const out = [];
  const diff = (k, label, fmt = (x) => x) => { if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out.push(t(label, { from: fmt(b[k]), to: fmt(a[k]) })); };
  diff("name", "trip_tracking.rt_h_naam", (x) => x || "—");
  diff("kind", "trip_tracking.rt_h_tareeka", kindLabel);
  if (b.vendor_id !== a.vendor_id) out.push(t("trip_tracking.rt_h_kiska", { from: kiskaOf(b, parties), to: kiskaOf(a, parties) }));
  // Rate — per trip ka ₹, ya km slab ki wo rows jo badli.
  const rd = [];
  if ((a.kind || "km") === "trip" || (b.kind || "km") === "trip") {
    if (Number(b.trip_rate) !== Number(a.trip_rate) && (a.trip_rate != null || b.trip_rate != null)) rd.push(rs2(b.trip_rate) + "→" + rs2(a.trip_rate));
  }
  const ra = Array.isArray(a.rates) ? a.rates : [], rb = Array.isArray(b.rates) ? b.rates : [];
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
    if (Number(rb[i]) !== Number(ra[i])) rd.push(nth(i + 1) + " " + (rb[i] == null ? "—" : rs2(rb[i])) + "→" + (ra[i] == null ? "—" : rs2(ra[i])));
  }
  if (a.onward_rate != null && b.onward_rate != null && Number(a.onward_rate) !== Number(b.onward_rate)) rd.push(t("trip_tracking.rt_h_aage", { from: rs2(b.onward_rate), to: rs2(a.onward_rate) }));
  if (rd.length) out.push(t("trip_tracking.rt_h_rate", { diff: rd.join(", ") }));
  if (b.method !== a.method && (a.kind || "km") === "km") out.push(t("trip_tracking.rt_h_method", { from: (RC_METHOD[b.method] || RC_METHOD.slab).label, to: (RC_METHOD[a.method] || RC_METHOD.slab).label }));
  if (b.round_mode !== a.round_mode && (a.kind || "km") === "km") out.push(t("trip_tracking.rt_h_round", { from: (RC_ROUND[b.round_mode] || RC_ROUND.nearest).label, to: (RC_ROUND[a.round_mode] || RC_ROUND.nearest).label }));
  const capT = (x) => (x.capacity_qty != null ? Number(x.capacity_qty) + " " + (x.capacity_unit || "") : "—");
  if (capT(b) !== capT(a)) out.push(t("trip_tracking.rt_h_capacity", { from: capT(b), to: capT(a) }));
  if ((b.note || "") !== (a.note || "")) out.push(t("trip_tracking.rt_h_note"));
  return out.length ? out.join(" · ") : t("trip_tracking.rt_h_badla");
}
function CardHistory({ tplId, parties }) {
  const [st, setSt] = useState({ loading: true, rows: [] });
  useEffect(() => {
    let alive = true;
    api.get(`/trips/rate-templates/${tplId}/history`)
      .then((r) => { if (alive) setSt(r && r.success && Array.isArray(r.data) ? { loading: false, rows: r.data } : { loading: false, rows: [], err: true }); })
      .catch(() => { if (alive) setSt({ loading: false, rows: [], err: true }); });
    return () => { alive = false; };
  }, [tplId]);
  return (
    <div style={{ border: `1px solid ${T.b1}`, background: T.surface, borderRadius: 8, padding: "8px 11px", marginBottom: 10, fontSize: 11.5, color: T.t2, maxHeight: 220, overflowY: "auto" }}>
      {st.loading && <div style={{ color: T.t4 }}>{t("common.loading_2")}</div>}
      {!st.loading && st.err && <div style={{ color: T.red }}>{t("trip_tracking.rt_itihaas_fail")}</div>}
      {!st.loading && !st.err && st.rows.length === 0 && <div style={{ color: T.t4 }}>{t("trip_tracking.rt_itihaas_empty")}</div>}
      {st.rows.map((h) => (
        <div key={h.id} style={{ display: "flex", gap: 10, padding: "4px 0", borderTop: `1px solid ${T.b1}`, alignItems: "baseline" }}>
          <span style={{ color: T.t4, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", minWidth: 118 }}>{fmtDT(h.created_at)}</span>
          <span style={{ color: T.t3, whiteSpace: "nowrap", minWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>{h.by_name || "—"}</span>
          <span style={{ flex: 1, color: T.t1, fontWeight: 600 }}>{historyLine(h, tplId, parties)}</span>
        </div>
      ))}
    </div>
  );
}

// ── "Rate badlo" — ek trip ka rate (4 Oct 2026) ──────────────────
// Prafull (pakka): card badalne se sirf aage ki trip badalti hai; bani hui
// trip ka paisa yahin, trip-wise, note ke saath. Server POST
// /trips/:id/rate-override { amount, km_billed?, note } — sirf ye trip
// badalti hai; card aur baaki trip waise hi. Km trip par bill km bhi.
const tripLabel = (tr) => (tr.registration_no || tr.truck_name || "") + " #" + tr.trip_no;
const amtOrPending = (v) => (v == null ? t("trip_tracking.rate_pending") : rupee(v));
function RateOverrideModal({ trip, onClose, onSaved }) {
  // Km trip: billing_snap, ya (trip ki detail se aaye to) us waqt ke card ki copy me km slab.
  const snap = trip.rate_card_snap && typeof trip.rate_card_snap === "object" ? trip.rate_card_snap : null;
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
    const r = await api.post(`/trips/${trip.id}/rate-override`, body);
    setBusy(false);
    if (!r || r.success === false) { window.alert(srvMsg(r)); return; }
    onSaved((r.data && r.data.trip) || null, t("trip_tracking.ro_saved", { trip: tripLabel(trip), from: amtOrPending(trip.amount), to: rupee(Number(amount)) }));
  };
  return (
    <Modal open onClose={onClose} width={480} title={t("trip_tracking.ro_title", { trip: tripLabel(trip) })}
      sub={t("trip_tracking.ro_abhi_line", { amt: amtOrPending(trip.amount), km: trip.km_billed != null ? fmtKm(trip.km_billed) : "—", card: (snap && snap.name) || t("trip_tracking.ro_card_nahi") })}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Btn></>}>
      <Notice>{t("trip_tracking.ro_hint")}</Notice>
      <div style={{ display: "grid", gridTemplateColumns: isKm ? "1fr 1fr" : "1fr", gap: 10 }}>
        <div><div style={rcLbl}>{t("trip_tracking.ro_new_amount")}</div>
          <RupeeInput value={amount} onChange={setAmount} bad={tried && !numOk(amount)} autoFocus /></div>
        {isKm && (
          <div><div style={rcLbl}>{t("trip_tracking.ro_bill_km")}</div>
            <input value={km} inputMode="decimal" onChange={(e) => setKm(e.target.value.replace(/[^0-9.]/g, ""))}
              style={{ ...inp, width: 140, fontVariantNumeric: "tabular-nums", borderColor: tried && km !== "" && !numOk(km) ? T.red : T.b1 }} />
            <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{t("trip_tracking.ro_bill_km_hint")}</div></div>
        )}
      </div>
      <div style={{ marginTop: 10 }}><div style={rcLbl}>{t("trip_tracking.ro_note")}</div>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("trip_tracking.ro_note_ph")}
          style={{ ...inp, borderColor: tried && note.trim().length < 3 ? T.red : T.b1 }} /></div>
      {tried && err && <div style={{ marginTop: 10, fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}
    </Modal>
  );
}
// "Rate badla" ka chip — tooltip me pehle → ab, note, kisne, kab.
function OverrideChip({ trip }) {
  const o = overrideOf(trip);
  if (!o) return null;
  const tip = t("trip_tracking.ro_tip", { from: amtOrPending(o.from_amount), to: rupee(o.to_amount), note: o.note || "—", by: o.by_name || "—", at: fmtDT(o.at) });
  return <span title={tip} style={{ display: "inline-flex", cursor: "help" }}><Pill label={t("trip_tracking.ro_chip")} c={T.blu} bg={T.bluL} /></span>;
}

// ── Gaadi-wise "Card lagao" ──────────────────────────────────────
// Trip vehicles ki row par "Card nahi" ya card ka chip (ya amber dabbe ki
// gaadi) dabao. Is gaadi ke laayak chalu card (Sab vendor ya isi vendor ka)
// ya "Card hatao". Server: PATCH /trips/trucks/:id/rate-card { rate_card_id }
// — sirf YE gaadi badalti hai (poori-list wala endpoint yahan galat tha:
// screen ki purani list se beech me kisi aur ki lagayi gaadi chupchaap hat
// jaati). Card chunte hi server se preview (?preview=1): pehle kis card par
// thi, billing kya ho jaayega, aur kitni RATE PENDING trip ko paisa milega.
function CardPickModal({ vehicle, cards, parties, onClose, onSaved }) {
  const vid = vehicle.vendor_id == null ? null : Number(vehicle.vendor_id);
  const all = (cards && cards.list) || [];
  const fits = vid == null ? [] : all.filter((c) => c.vendor_id == null || Number(c.vendor_id) === vid);
  const cur = vehicle.rate_card_id ? Number(vehicle.rate_card_id) : null;
  const curCard = cur ? all.find((c) => Number(c.id) === cur) || null : null;
  const [sel, setSel] = useState(cur ? String(cur) : "");      // card id | "hatao"
  const [pv, setPv] = useState(null);                          // null | { busy } | { data } | { err }
  const [busy, setBusy] = useState(false);
  const target = sel && sel !== "hatao" ? fits.find((c) => String(c.id) === sel) || null : null;
  const reg = vehicle.registration_no || vehicle.name || "#" + vehicle.id;

  useEffect(() => {
    setPv(null);
    if (!target || Number(target.id) === cur) return undefined;
    let alive = true;
    setPv({ busy: true });
    api.patch(`/trips/trucks/${vehicle.id}/rate-card?preview=1`, { rate_card_id: target.id })
      .then((r) => { if (alive) setPv(r && r.success !== false ? { data: r.data || {} } : { err: srvMsg(r) }); })
      .catch(() => { if (alive) setPv({ err: t("common.something_went_wrong") }); });
    return () => { alive = false; };
  }, [target, cur, vehicle.id]);

  const changed = sel !== (cur ? String(cur) : "") && (sel === "hatao" ? !!curCard : !!target);
  const save = async () => {
    setBusy(true);
    const r = await api.patch(`/trips/trucks/${vehicle.id}/rate-card`, { rate_card_id: sel === "hatao" ? null : target.id });
    setBusy(false);
    if (!r || r.success === false) { window.alert(srvMsg(r)); return; }
    onSaved(sel === "hatao" ? t("machinery.cp_hataya", { reg })
      : t("machinery.cp_saved", { reg, name: target.name, trips: (r.data && r.data.trips_updated) || 0 }));
  };

  const d = pv && pv.data;
  // Server ka abhi ka sach: pehle kis card par thi (from), billing kya se kya.
  const mv = d && d.from && target && Number(d.from.id) !== Number(target.id) ? d.from : null;
  const bc = d && d.billing && d.billing.from !== d.billing.to ? d.billing : null;
  const m = d ? Number(d.trips_to_price) || 0 : 0;
  const optS = (on) => ({ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8, cursor: "pointer",
    border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface });
  const bm = billingMeta(vehicle.trip_billing);

  return (
    <Modal open onClose={onClose} width={560} title={t("machinery.cp_title", { reg })}
      sub={[vehicle.vendor_name || t("machinery.tv_vendor_nahi"), vehicle.capacity || t("machinery.tv_cap_nahi"), bm.l].join(" · ")}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy || !changed || (!!target && !!pv && (pv.busy || !!pv.err))}>{busy ? t("common.saving") : t("trip_tracking.gs_save")}</Btn></>}>
      {vid == null && <Notice>{t("trip_tracking.gs_bina_vendor")}</Notice>}
      {vid != null && fits.length === 0 && <Notice>{t("machinery.cp_koi_card_nahi")}</Notice>}
      <div style={{ display: "grid", gap: 7 }}>
        {fits.map((c) => {
          const on = sel === String(c.id);
          return (
            <label key={c.id} style={optS(on)}>
              <input type="radio" name="cp_card" checked={on} onChange={() => setSel(String(c.id))} style={{ marginTop: 2, accentColor: T.ind }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{c.name}</span>
                  <Pill label={kindLabel(c.kind)} c={T.ind} bg={T.indL} />
                  {c.capacity && <Pill label={c.capacity} c={T.t3} bg={T.sltL} />}
                  {Number(c.id) === cur && <span style={{ fontSize: 10.5, color: T.grn, fontWeight: 700 }}>{t("machinery.cp_is_par")}</span>}
                </span>
                <span style={{ display: "block", fontSize: 11, color: T.t3, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{kiskaOf(c, parties)} · {rateLine(c)}</span>
              </span>
            </label>
          );
        })}
        {curCard && (
          <label style={optS(sel === "hatao")}>
            <input type="radio" name="cp_card" checked={sel === "hatao"} onChange={() => setSel("hatao")} style={{ marginTop: 2, accentColor: T.red }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.red }}>{t("machinery.cp_card_hatao")}</span>
          </label>
        )}
      </div>
      {sel === "hatao" && curCard && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.t2, lineHeight: 1.55 }}>{t("machinery.cp_hatao_line", { name: curCard.name })}</div>
      )}
      {target && Number(target.id) !== cur && (
        <div style={{ marginTop: 12, border: `1px solid ${T.b1}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: T.t2, lineHeight: 1.7, background: T.surfaceB }}>
          {pv && pv.busy && <div style={{ color: T.t4 }}>{t("common.loading_2")}</div>}
          {pv && pv.err && <div style={{ color: T.red, fontWeight: 600 }}>{pv.err}</div>}
          {d && (
            <>
              {mv && <div>{t("machinery.cp_moved_line", { name: mv.name || "—" })}</div>}
              {bc && <div>{t("machinery.cp_billing_line", { from: billingMeta(bc.from).l, to: billingMeta(bc.to).l })}</div>}
              {m > 0
                ? <div style={{ fontWeight: 700, color: T.grn }}>{t("machinery.cp_trips_line", { m })}</div>
                : <div style={{ color: T.t4 }}>{t("machinery.cp_no_trips")}</div>}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Rate card view (Trip vehicles → "Rate card") ─────────────────
// 5 Oct 2026 (Prafull: "rate card click pe us card me jitni gaadi hai dikhe"):
// upar har card ka ek chip (naam · capacity · rate · kitni gaadi), chuna hua
// card neeche khulta hai — rate, Edit / + Gaadi jodo / Itihaas / Hatao, aur
// USI card ki gaadiyan (number, vendor, capacity, chuni tareekh me trip + ₹),
// har gaadi par "Card badlo" (CardPickModal — trip ke rate par asar ka
// preview ke saath). Pehle sirf ek table thi jisme "1 vehicles" likha aata
// tha aur dekhne ka koi raasta nahi tha ki kaunsi.
function RateCardView({ cards, trucks, tvRows, parties, canRates, edit, onEdit, pick, onPick, flash, onFlash, onChanged, onGaadi, cityOk, cityName }) {
  const [busyId, setBusyId] = useState(null);
  const [showHist, setShowHist] = useState(false);
  const list = (cards.list || []).map((c) => (c.kind === "trip" ? c : normCard(c)));
  const legacy = (cards.legacy || []).map(normCard);
  // Chuna hua card: picker/editor khula ho to wahi, warna user ka chuna, warna pehla.
  const [selId, setSelId] = useState(null);
  const pickId = pick && pick.tpl ? pick.tpl.id : null;
  const editId = edit && edit.id ? edit.id : null;
  const sel = list.find((c) => String(c.id) === String(pickId || editId || selId)) || list[0] || null;
  useEffect(() => { setShowHist(false); }, [sel && sel.id]);

  // Gaadi-wise trip / ₹ chuni tareekh ke (Gaadi wali list ka hi hisaab).
  const tripStat = useMemo(() => {
    const m = new Map();
    (tvRows || []).forEach((g) => (g.vehicles || []).forEach((v) => {
      if (v.vendor_changed) return;
      m.set(String(v.id), { trips: Number(v.trips) || 0, amount: Number(v.amount) || 0, unbilled: Number(v.unbilled) || 0 });
    }));
    return m;
  }, [tvRows]);
  const onCard = (c) => (trucks || []).filter((r) => Number(r.is_active) !== 0 && Number(r.rate_card_id) === Number(c.id) && (!cityOk || cityOk(r)))
    .sort((a, b) => String(a.registration_no || a.name || "").localeCompare(String(b.registration_no || b.name || "")));
  const vName = (r) => r.vendor_name || r.default_vendor_name || t("machinery.tv_vendor_nahi");
  const asVeh = (r) => ({
    id: r.id, name: r.name, registration_no: r.registration_no, vendor_id: truckVendorId(r), vendor_name: r.vendor_name || r.default_vendor_name || null,
    capacity: capOf(r), trip_billing: r.trip_billing, rate_card_id: r.rate_card_id || null, rate_card_name: r.rate_card_name || null,
  });

  const remove = async (c) => {
    // Ginti har city ki (vehicles_total) — server sab city ki gaadi se card hatata hai.
    const n = c.vehicles_total != null ? Number(c.vehicles_total) : Number(c.vehicles) || 0;
    if (!window.confirm(t("trip_tracking.rt_hatao_confirm", { name: c.name, n }))) return;
    setBusyId(c.id); onFlash("");
    const r = await api.del("/trips/rate-templates/" + c.id);
    setBusyId(null);
    if (!r || r.success === false) { window.alert((r && r.message) || t("trip_tracking.action_fail")); return; }
    setSelId(null);
    onChanged();
  };
  const fromLegacy = (c) => onEdit({ _seed: { name: kiskaOf(c, parties), vendor_id: c.vendor_id, kind: "km",
    method: c.method, rates: c.rates, onward_rate: c.onward_rate, round_mode: c.round_mode, note: c.note } });
  const choose = (c) => { setSelId(c.id); onEdit(null); onPick(null); onFlash(""); };

  const chipS = (on) => ({ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, textAlign: "left", minWidth: 170, maxWidth: 260,
    padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
    border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface });
  const VCOLS = "minmax(120px,1.1fr) minmax(120px,1.3fr) 90px 92px 60px 92px 110px";
  const cardTrucks = sel ? onCard(sel) : [];

  return (
    <div>
      {flash && <div style={{ border: `1px solid ${T.grn}44`, background: T.grnL, borderRadius: 8, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: T.grn, fontWeight: 600 }}>{flash}</div>}

      {legacy.length > 0 && (
        <div style={{ border: `1px solid ${T.b1}`, background: T.surface, borderRadius: 10, padding: "10px 13px", marginBottom: 12, fontSize: 12, color: T.t2, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, color: T.t1, marginBottom: 2 }}>{t("trip_tracking.rt_purane_card")}</div>
          <div style={{ color: T.t3, marginBottom: 6 }}>{t("trip_tracking.rt_purane_card_hint")}</div>
          {legacy.map((c) => (
            <div key={c.vendor_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderTop: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: T.t1, minWidth: 140 }}>{kiskaOf(c, parties)}</span>
              <span style={{ flex: 1, fontSize: 11.5, color: T.t3, fontVariantNumeric: "tabular-nums" }}>{RC_METHOD[c.method].label} · {slabText(c)}</span>
              {canRates && <Btn size="sm" ghost onClick={() => { onPick(null); fromLegacy(c); }}>{t("trip_tracking.rt_isi_se_banao")}</Btn>}
            </div>
          ))}
        </div>
      )}

      {/* Card ke chip — dabao to neeche wahi card */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {list.map((c) => {
          const on = sel && String(sel.id) === String(c.id);
          const n = Number(c.vehicles) || 0;
          return (
            <button key={c.id} type="button" onClick={() => choose(c)} style={chipS(on)} aria-pressed={on}>
              <span style={{ display: "flex", gap: 6, alignItems: "center", width: "100%" }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? T.ind : T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{c.name}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: n ? T.t1 : T.t4, background: n ? T.surfaceB : "transparent", border: `1px solid ${T.b1}`, borderRadius: 8, padding: "0 6px", fontVariantNumeric: "tabular-nums" }}>{t("trip_tracking.n_gaadi", { n })}</span>
              </span>
              <span style={{ fontSize: 10.5, color: T.t3, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                {[c.capacity, rateLine(c)].filter(Boolean).join(" · ")}
              </span>
            </button>
          );
        })}
        {canRates && (
          <Btn size="sm" icon={IcAdd} onClick={() => { onPick(null); onFlash(""); onEdit(edit && !edit.id && !edit._seed ? null : {}); }}>{t("trip_tracking.rc_new")}</Btn>
        )}
      </div>

      {/* Naya card (ya purane se) — chip ke neeche apna editor */}
      {edit && !edit.id && (
        <Panel title={t("trip_tracking.rc_new")}>
          <RateCardEditor key={edit._seed ? "s-" + edit._seed.vendor_id : "n"} card={edit} parties={parties}
            onCancel={() => onEdit(null)}
            onSaved={(saved, isNew) => {
              onEdit(null); onChanged();
              if (saved && saved.id) setSelId(saved.id);
              // Naya card bana — ab uski gaadi select karo.
              if (isNew && saved) onPick({ tpl: saved, baaki: false });
            }} />
        </Panel>
      )}

      {list.length === 0 && !edit && (
        <Empty>{canRates ? t("trip_tracking.rt_empty_can") : t("trip_tracking.rc_empty")}</Empty>
      )}

      {sel && (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          {/* Card ka sir — naam, kiska, rate, kaam ke button */}
          <div style={{ padding: "13px 15px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{sel.name}</span>
                <Pill label={kindLabel(sel.kind)} c={T.ind} bg={T.indL} />
                {sel.capacity && <Pill label={sel.capacity} c={T.t3} bg={T.sltL} />}
              </div>
              <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>{kiskaOf(sel, parties)}</div>
              <div style={{ fontSize: 12.5, color: T.t1, marginTop: 6, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                {sel.kind === "trip" ? t("trip_tracking.rt_per_trip_amt", { amt: rs2(sel.trip_rate) }) : slabText(sel)}
              </div>
              {sel.kind !== "trip" && (
                <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{RC_METHOD[sel.method].label} · {RC_ROUND[sel.round_mode].label} · {t("trip_tracking.rc_ex_10", { amt: rs2(rcAmount(sel, 10)) })}</div>
              )}
              {sel.note && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>{sel.note}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {canRates && <Btn size="sm" icon={IcAdd} disabled={!trucks} onClick={() => { onEdit(null); onFlash(""); onPick({ tpl: sel, baaki: false }); }}>{t("trip_tracking.tc_gaadi_jodo")}</Btn>}
              {canRates && <Btn size="sm" ghost onClick={() => { onPick(null); onFlash(""); onEdit(sel); }}>{t("trip_tracking.tc_rate_badlo")}</Btn>}
              <button type="button" onClick={() => setShowHist((v) => !v)} style={linkBtn(T.t3)}>{showHist ? t("trip_tracking.tc_itihaas_band") : t("trip_tracking.tc_itihaas")}</button>
              {canRates && <button type="button" disabled={busyId === sel.id} onClick={() => remove(sel)} style={linkBtn(T.red)}>{t("trip_tracking.tc_card_hatao")}</button>}
            </div>
          </div>

          {edit && edit.id && String(edit.id) === String(sel.id) && (
            <RateCardEditor key={"e-" + edit.id} card={edit} parties={parties}
              onCancel={() => onEdit(null)}
              onSaved={(saved) => {
                onEdit(null); onChanged();
                if (saved && saved.trips_updated) onFlash(t("trip_tracking.rt_saved_trips", { name: saved.name, n: saved.trips_updated }));
              }} />
          )}
          {showHist && <div style={{ padding: "8px 15px", borderBottom: `1px solid ${T.b1}` }}><CardHistory tplId={sel.id} parties={parties} /></div>}

          {/* Gaadi jodo — picker usi card ke andar */}
          {pick && !trucks && <Empty>{t("common.loading_2")}</Empty>}
          {pick && trucks && String(pick.tpl.id) === String(sel.id) && (
            <VehiclePicker key={"p-" + pick.tpl.id + (pick.baaki ? "-b" : "")} tpl={pick.tpl} trucks={trucks} parties={parties} onlyBaaki={pick.baaki} cityOk={cityOk} cityName={cityName}
              onCancel={() => onPick(null)}
              onSaved={(res) => {
                onFlash(t("trip_tracking.gs_saved", { name: pick.tpl.name, n: res.assigned || 0, trips: res.trips_updated || 0 }));
                onPick(null); onChanged();
              }} />
          )}

          {/* Is card ki gaadiyan */}
          <div style={{ padding: "10px 15px 4px", fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>
            {t("trip_tracking.tc_is_card_ki_gaadi", { n: cardTrucks.length })}{cityName ? " · " + cityName : ""}
          </div>
          {!trucks && <Empty>{t("common.loading_2")}</Empty>}
          {trucks && cardTrucks.length === 0 && (
            <div style={{ padding: "14px 15px 18px", fontSize: 12, color: T.t3 }}>
              {t("trip_tracking.tc_koi_gaadi_nahi")}
              {canRates && !pick && <> <button type="button" onClick={() => { onEdit(null); onFlash(""); onPick({ tpl: sel, baaki: false }); }} style={linkBtn(T.ind)}>{t("trip_tracking.tc_gaadi_jodo")}</button></>}
            </div>
          )}
          {trucks && cardTrucks.length > 0 && (
            <div style={{ overflowX: "auto", padding: "0 15px 12px" }}>
              <div style={{ minWidth: 720 }}>
                <div style={{ display: "grid", gridTemplateColumns: VCOLS, gap: 8, padding: "7px 8px", background: T.surfaceB, borderRadius: 6, border: `1px solid ${T.b1}` }}>
                  {[t("machinery.tv_h_vehicle"), t("common.vendor"), t("trip_tracking.tc_h_capacity"), t("machinery.tv_h_billing"), t("machinery.tv_h_trips"), t("machinery.tv_h_amount"), ""].map((h, i) => (
                    <span key={i} style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", textAlign: i === 4 || i === 5 ? "right" : "left" }}>{h}</span>
                  ))}
                </div>
                {cardTrucks.map((r) => {
                  const st = tripStat.get(String(r.id)) || { trips: 0, amount: 0 };
                  const bm = billingMeta(r.trip_billing);
                  return (
                    <div key={r.id} style={{ display: "grid", gridTemplateColumns: VCOLS, gap: 8, padding: "8px 8px", borderBottom: `1px solid ${T.b1}`, alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: T.t1, letterSpacing: 0.3 }}>{r.registration_no || r.name}</span>
                      <span style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vName(r)}</span>
                      <span style={{ fontSize: 11.5, color: capOf(r) ? T.t2 : T.t4 }}>{capOf(r) || "—"}</span>
                      <span><Pill label={bm.l} c={bm.c} bg={bm.bg} /></span>
                      <span style={{ fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums", color: T.t2 }}>{st.trips}</span>
                      <span style={{ fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: T.t1 }}>{r.trip_billing === "monthly" ? "—" : rupee(st.amount)}</span>
                      <span style={{ textAlign: "right" }}>
                        {canRates && <button type="button" onClick={() => onGaadi(asVeh(r))} style={linkBtn(T.ind)}>{t("trip_tracking.tc_card_badlo")}</button>}
                      </span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 10.5, color: T.t4, marginTop: 6 }}>{t("trip_tracking.tc_trips_note")}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── City patti (5 Oct 2026, Prafull: "trip vehicle me city wise filter") ──
// Har city ka chip gaadi ki ginti ke saath; "Sab city" = koi chhanni nahi,
// "City nahi" = jin gaadi par city nahi lagi. Gaadi aur Rate card dono view
// me wahi chhanni (card ki gaadiyan aur "+ Gaadi jodo" list bhi).
function CityBar({ opts, value, onChange }) {
  // Chuni city ho to patti tab bhi dikhe (list me na ho to bhi "Sab city" se hata sako).
  if (!opts || (!opts.list.length && !opts.none && !value)) return null;
  const chip = (k, label, n) => {
    const on = value === k;
    return (
      <button key={k || "all"} type="button" onClick={() => onChange(k)} aria-pressed={on}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
          fontSize: 12, fontWeight: on ? 700 : 500, border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, color: on ? T.ind : T.t2 }}>
        {label}
        <span style={{ fontSize: 10.5, fontWeight: 700, color: on ? T.ind : T.t4, fontVariantNumeric: "tabular-nums" }}>{n}</span>
      </button>
    );
  };
  const total = opts.list.reduce((a, c) => a + c.n, 0) + opts.none;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginRight: 4 }}>{t("machinery.city")}</span>
      {chip("", t("trip_tracking.tc_sab_city"), total)}
      {opts.list.map((c) => chip(c.id, c.name, c.n))}
      {opts.none > 0 && chip("none", t("trip_tracking.tc_city_nahi"), opts.none)}
    </div>
  );
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

// ══════════════════════════════════════════════════════════════════
// TRIPS & BILLING (Machinery) — 7 Oct 2026
//
// Sub-tab: Rate baaki · Vendor / Gaadi · Billing · Bills · Rate card · Report.
// Ek bill = ek vendor, kai project ki trip, office trip TICK karke banata hai
// (material billing jaisa); bill banate hi vendor ledger me — kharcha har
// trip ke apne project par. Bill banana = Finance Create, bill dekhna = Finance
// View (admin hamesha), baaki sab dekhna = Equipment / Machinery View.
// ══════════════════════════════════════════════════════════════════
const canMakeBill = () => canAny("Finance", "create", { strict: true });
const canSeeBills = () => canAny("Finance", "view", { strict: true });

// Sab vendor jinki trip kabhi bani — Billing / Report ke vendor select ke liye.
function useTbVendorOpts() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get("/trips/office/vendors?from=2000-01-01&to=" + tbToday())
      .then((r) => { if (alive) { const d = tbBody(r); setRows(Array.isArray(d) ? d : []); } })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);
  return rows;
}
const tbCardStyle = { background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" };
const tbSel = { ...inp, width: "auto", padding: "6px 9px", fontSize: 12 };
const tbDateS = { height: 30, padding: "0 8px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none" };
const TbFlash = ({ children, ok = true }) => (
  <div style={{ border: `1px solid ${(ok ? T.grn : T.red) + "44"}`, background: ok ? T.grnL : T.redL, borderRadius: 8, padding: "9px 13px", marginBottom: 12, fontSize: 12, color: ok ? T.grn : T.red, fontWeight: 600, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{children}</div>
);

// ── Rate baaki — GET /trips/office/rate-pending ─────────────────────
const RB_COLS = "minmax(140px,1.3fr) minmax(110px,1.1fr) 80px 96px minmax(100px,1fr) 64px 84px minmax(100px,1fr) 200px";
function RateBaakiView({ rp, cards, canRates, onVehicle, onCard, onMonthly, onPick, onNewCard }) {
  const [cardId, setCardId] = useState("");
  const all = (cards && cards.list) || [];
  const chosen = all.length === 1 ? all[0] : all.find((c) => String(c.id) === String(cardId)) || null;
  if (rp.state === "loading") return <Empty>{t("common.loading_2")}</Empty>;
  if (rp.state === "error") return <Empty>{t("tripbill.load_fail")}</Empty>;
  const list = rp.vehicles;
  if (list.length === 0) return <Empty>{t("tripbill.rb_empty")}</Empty>;
  return (
    <div>
      <Notice>{t("tripbill.rb_note", { n: list.length, trips: rp.trips })}</Notice>
      {canRates && cards && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: T.t2, fontWeight: 600 }}>{t("tripbill.rb_bulk")}</span>
          {all.length === 0
            ? <Btn size="sm" ghost onClick={onNewCard}>{t("trip_tracking.rp_pehle_card_banao")}</Btn>
            : <>
                {all.length > 1 && (
                  <PickSelect value={cardId} onChange={(e) => setCardId(e.target.value)} style={tbSel}>
                    <option value="">{t("trip_tracking.rp_card_select")}</option>
                    {all.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </PickSelect>
                )}
                <Btn size="sm" disabled={!chosen} onClick={() => chosen && onPick(chosen)}>{t("trip_tracking.gs_button")}</Btn>
              </>}
        </div>
      )}
      <div style={{ ...tbCardStyle, overflowX: "auto" }}>
        <div style={{ minWidth: 960 }}>
          <div style={{ display: "grid", gridTemplateColumns: RB_COLS, gap: 8, padding: "8px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>
            <span>{t("tripbill.col_vehicle")}</span><span>{t("common.vendor")}</span><span>{t("tripbill.col_capacity")}</span><span>{t("tripbill.col_billing")}</span><span>{t("tripbill.col_card")}</span>
            <span style={{ textAlign: "right" }}>{t("tripbill.col_trips")}</span><span>{t("tripbill.rb_oldest")}</span><span>{t("common.project")}</span><span />
          </div>
          {list.map((v) => {
            const bm = tbBillingMeta(v.trip_billing);
            const unset = v.trip_billing == null || v.trip_billing === "unset";
            return (
              <div key={v.id} style={{ display: "grid", gridTemplateColumns: RB_COLS, gap: 8, padding: "9px 14px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2 }}>
                <span style={{ minWidth: 0 }}>
                  <button type="button" title={t("tripbill.vv_open_vehicle")} onClick={() => onVehicle(v)}
                    style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3, color: T.ind, background: T.indL, border: `1px solid ${T.ind}22`, borderRadius: 5, padding: "1px 7px", cursor: "pointer", fontFamily: "inherit" }}>{v.registration_no || v.name || "—"}</button>
                  {v.is_fleet && <span style={{ marginLeft: 6 }}><TbPill label={t("tripbill.fleet_pill")} c={T.t3} bg={T.sltL} /></span>}
                  {v.name && v.name !== v.registration_no && <span style={{ display: "block", fontSize: 10.5, color: T.t4, marginTop: 2 }}>{v.name}</span>}
                </span>
                <span style={{ color: v.vendor_id == null ? T.amb : T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.vendor_name || t("tripbill.vendor_nahi")}</span>
                <span style={{ color: v.capacity ? T.t2 : T.t4 }}>{v.capacity || "—"}</span>
                <span>{bm && <TbPill label={bm.l} c={bm.c} bg={bm.bg} />}</span>
                <span style={{ color: v.rate_card_name ? T.t2 : T.t4 }}>{v.rate_card_name || "—"}</span>
                <span style={{ textAlign: "right", fontWeight: 800, color: T.amb, fontVariantNumeric: "tabular-nums" }}>{Number(v.trips_pending) || 0}</span>
                <span style={{ fontSize: 11 }}>{tbDate(v.oldest_trip_date)}</span>
                <span style={{ fontSize: 11, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={(v.projects || []).join(", ")}>{(v.projects || []).join(", ") || "—"}</span>
                <span style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  {canRates && <Btn size="sm" onClick={() => onCard(v)}>{t("tripbill.rb_card_lagao")}</Btn>}
                  {canRates && unset && v.is_fleet && <Btn size="sm" ghost onClick={() => onMonthly(v)}>{t("tripbill.rb_mahina")}</Btn>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {list.some((v) => v.trip_billing == null || v.trip_billing === "unset") && <div style={{ fontSize: 11, color: T.t4, marginTop: 8, lineHeight: 1.55 }}>{t("tripbill.rb_unset_hint")}</div>}
    </div>
  );
}

// ── Billing — trip TICK karke bill (API 7 → API 8) ──────────────────
const BF_COLS = "26px 92px minmax(90px,1fr) minmax(100px,1fr) minmax(100px,1fr) minmax(90px,1fr) 62px 96px";
function BillingView({ onBills, canSeeBillList, vendorPre }) {
  const vend = useTbVendorOpts();
  const [vid, setVid] = useState(vendorPre ? String(vendorPre) : "");
  useEffect(() => { if (vendorPre) setVid(String(vendorPre)); }, [vendorPre]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fProj, setFProj] = useState("");
  const [fVeh, setFVeh] = useState("");
  const [st, setSt] = useState({ state: "idle" });
  const [sel, setSel] = useState(() => new Set());
  const [showBlocked, setShowBlocked] = useState(false);
  const [billDate, setBillDate] = useState(tbToday());
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState("");

  const loadReady = useCallback(() => {
    if (!vid) { setSt({ state: "idle" }); return () => {}; }
    let alive = true;
    setSt({ state: "loading" });
    api.get("/trips/bills/ready?vendor_id=" + vid + (from ? "&from=" + from : "") + (to ? "&to=" + to : "")).then((r) => {
      if (!alive) return;
      const d = tbBody(r);
      if (d && typeof d === "object" && Array.isArray(d.ready)) {
        setSt({ state: "ok", ready: d.ready, blocked: Array.isArray(d.blocked) ? d.blocked : [] });
        setSel(new Set(d.ready.map((x) => x.id)));
      } else setSt({ state: "error", msg: (r && r.message) || t("tripbill.load_fail") });
    }).catch(() => { if (alive) setSt({ state: "error", msg: t("tripbill.load_fail") }); });
    return () => { alive = false; };
  }, [vid, from, to]);
  useEffect(() => loadReady(), [loadReady]);
  useEffect(() => { setFProj(""); setFVeh(""); setDone(null); setErr(""); }, [vid]);

  const ready = st.ready || [];
  const blocked = st.blocked || [];
  const projOpts = [...new Map([...ready, ...blocked].map((x) => [String(x.project_id), x.project_name || "—"])).entries()];
  const vehOpts = [...new Map([...ready, ...blocked].map((x) => [String(x.equipment_id), x.registration_no || x.vehicle_name || "#" + x.equipment_id])).entries()];
  const pass = (x) => (!fProj || String(x.project_id) === fProj) && (!fVeh || String(x.equipment_id) === fVeh);
  const visible = ready.filter(pass);
  const blockedV = blocked.filter(pass);
  const ticked = visible.filter((x) => sel.has(x.id));
  const total = ticked.reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const byProject = (() => {
    const m = new Map();
    ticked.forEach((x) => {
      const k = String(x.project_id);
      const o = m.get(k) || { name: x.project_name || "—", trips: 0, amount: 0 };
      o.trips += 1; o.amount += Number(x.amount) || 0; m.set(k, o);
    });
    return [...m.values()];
  })();
  const allOn = visible.length > 0 && visible.every((x) => sel.has(x.id));
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel((s) => { const n = new Set(s); visible.forEach((x) => (allOn ? n.delete(x.id) : n.add(x.id))); return n; });
  const vendorName = ((vend || []).find((x) => String(x.vendor_id) === String(vid)) || {}).vendor_name || "";

  const submit = async () => {
    setTried(true); setErr(""); setDone(null);
    if (!ticked.length) { setErr(t("tripbill.bf_err_none")); return; }
    if (!billDate) { setErr(t("tripbill.bf_err_bill_date")); return; }
    if (!dueDate) { setErr(t("tripbill.bf_err_due")); return; }
    if (dueDate < billDate) { setErr(t("tripbill.bf_err_due_before")); return; }
    if (!window.confirm(t("tripbill.bf_confirm", { n: ticked.length, amt: tbMoney(total), vendor: vendorName || "#" + vid, due: tbDate(dueDate) }))) return;
    setBusy(true);
    const r = await api.post("/trips/bills", { vendor_id: Number(vid), trip_ids: ticked.map((x) => x.id), bill_date: billDate, due_date: dueDate, note: note.trim() });
    setBusy(false);
    if (!r || r.success === false) { setErr(srvMsg(r)); loadReady(); return; }
    const b = tbBody(r) || {};
    setDone({ id: b.id, bill_no: b.bill_no || (b.id ? "TB-" + b.id : ""), n: b.trip_count != null ? b.trip_count : ticked.length, amt: b.total_amount != null ? b.total_amount : total });
    setDueDate(""); setNote(""); setTried(false);
    loadReady();
  };

  return (
    <div>
      <div style={{ ...tbCardStyle, padding: "11px 14px", marginBottom: 12, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 220px", minWidth: 200 }}>
          <div style={rcLbl}>{t("common.vendor")}</div>
          <PickSelect value={vid} onChange={(e) => setVid(e.target.value)} style={{ ...inp, padding: "7px 10px" }}>
            <option value="">{vend ? t("tripbill.bf_vendor_select") : t("common.loading_2")}</option>
            {(vend || []).filter((x) => x.vendor_id != null).sort((a, b) => (Number(b.ready_trips) || 0) - (Number(a.ready_trips) || 0) || String(a.vendor_name).localeCompare(String(b.vendor_name)))
              .map((x) => <option key={x.vendor_id} value={x.vendor_id}>{x.vendor_name}{Number(x.ready_trips) > 0 ? " — " + t("tripbill.n_ready", { n: Number(x.ready_trips) }) : ""}</option>)}
          </PickSelect>
        </div>
        <div><div style={rcLbl}>{t("common.from")}</div><input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} style={tbDateS} /></div>
        <div><div style={rcLbl}>{t("common.to")}</div><input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} style={tbDateS} /></div>
        {projOpts.length > 1 && (
          <div><div style={rcLbl}>{t("common.project")}</div>
            <PickSelect value={fProj} onChange={(e) => setFProj(e.target.value)} style={tbSel}>
              <option value="">{t("tripbill.all_projects")}</option>
              {projOpts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </PickSelect></div>
        )}
        {vehOpts.length > 1 && (
          <div><div style={rcLbl}>{t("tripbill.col_vehicle")}</div>
            <PickSelect value={fVeh} onChange={(e) => setFVeh(e.target.value)} style={tbSel}>
              <option value="">{t("tripbill.all_vehicles")}</option>
              {vehOpts.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </PickSelect></div>
        )}
      </div>

      {done && (
        <TbFlash>
          <span>{t("tripbill.bf_done", { no: done.bill_no, n: done.n, amt: tbMoney(done.amt) })}</span>
          {canSeeBillList && <button type="button" onClick={() => onBills(done.id)} style={{ ...linkBtn(T.grn), textDecoration: "underline" }}>{t("tripbill.bf_open_bill")}</button>}
        </TbFlash>
      )}
      {!vid && <Empty>{t("tripbill.bf_pick_vendor")}</Empty>}
      {st.state === "loading" && <Empty>{t("common.loading_2")}</Empty>}
      {st.state === "error" && <ErrBox>{st.msg}</ErrBox>}

      {st.state === "ok" && (
        <>
          {visible.length === 0 && <Empty>{t("tripbill.bf_none_ready")}</Empty>}
          {visible.length > 0 && (
            <div style={{ ...tbCardStyle, overflowX: "auto", marginBottom: 12 }}>
              <div style={{ minWidth: 820 }}>
                <div style={{ display: "grid", gridTemplateColumns: BF_COLS, gap: 8, padding: "8px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", alignItems: "center" }}>
                  <input type="checkbox" checked={allOn} onChange={toggleAll} style={{ accentColor: T.ind }} aria-label={t("tripbill.bf_select_all")} />
                  <span>{t("common.date")}</span><span>{t("tripbill.col_vehicle")}</span><span>{t("common.project")}</span><span>{t("tripbill.col_route")}</span><span>{t("tripbill.col_material")}</span>
                  <span style={{ textAlign: "right" }}>{t("tripbill.col_km")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_amount")}</span>
                </div>
                {visible.map((x) => (
                  <label key={x.id} style={{ display: "grid", gridTemplateColumns: BF_COLS, gap: 8, padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2, cursor: "pointer", background: sel.has(x.id) ? T.indL + "55" : "transparent" }}>
                    <input type="checkbox" checked={sel.has(x.id)} onChange={() => toggle(x.id)} style={{ accentColor: T.ind }} />
                    <span style={{ whiteSpace: "nowrap" }}>{tbDate(x.trip_date)}<span style={{ display: "block", fontSize: 10, color: T.t4 }}>#{x.trip_no}</span></span>
                    <span style={{ fontWeight: 700, color: T.t1 }}>{x.registration_no || x.vehicle_name || "—"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.project_name || "—"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.route_name || "—"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[x.material_name, x.qty != null ? tbNum(x.qty) + (x.qty_unit ? " " + x.qty_unit : "") : ""].filter(Boolean).join(" · ") || "—"}</span>
                    <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{x.km_billed != null ? tbNum(x.km_billed) : "—"}</span>
                    <span style={{ textAlign: "right", fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{tbMoney(x.amount)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {byProject.length > 0 && (
            <div style={{ ...tbCardStyle, marginBottom: 12 }}>
              <div style={{ padding: "8px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 12, fontWeight: 700, color: T.t1 }}>{t("tripbill.bf_by_project")}</div>
              {byProject.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 14px", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5 }}>
                  <span style={{ color: T.t1, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ color: T.t3 }}>{t("tripbill.n_trips", { n: p.trips })}</span>
                  <span style={{ fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums", minWidth: 100, textAlign: "right" }}>{tbMoney(p.amount)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 14px", fontSize: 13, fontWeight: 800, color: T.t1 }}>
                <span>{t("tripbill.bf_total_ticked", { n: ticked.length })}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{tbMoney(total)}</span>
              </div>
            </div>
          )}

          {visible.length > 0 && (
            <div style={{ ...tbCardStyle, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div><div style={rcLbl}>{t("tripbill.bf_bill_date")}</div>
                  <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} style={{ ...tbDateS, borderColor: tried && !billDate ? T.red : T.b1 }} /></div>
                <div><div style={rcLbl}>{t("tripbill.bf_due_date")} *</div>
                  <input type="date" value={dueDate} min={billDate || undefined} onChange={(e) => setDueDate(e.target.value)} style={{ ...tbDateS, borderColor: tried && !dueDate ? T.red : T.b1 }} /></div>
                <div style={{ flex: "1 1 240px" }}><div style={rcLbl}>{t("common.note")}</div>
                  <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("tripbill.bf_note_ph")} style={{ ...inp, padding: "6px 9px" }} /></div>
                <div style={{ alignSelf: "flex-end" }}>
                  <Btn onClick={submit} disabled={busy || ticked.length === 0}>{busy ? t("tripbill.bf_making") : t("tripbill.bf_make")}</Btn>
                </div>
              </div>
              <div style={{ fontSize: 11, color: T.t4, marginTop: 8, lineHeight: 1.5 }}>{t("tripbill.bf_hint")}</div>
              {err && <ErrBox>{err}</ErrBox>}
            </div>
          )}

          {blockedV.length > 0 && (
            <div style={tbCardStyle}>
              <button type="button" onClick={() => setShowBlocked((v) => !v)} aria-expanded={showBlocked}
                style={{ width: "100%", textAlign: "left", background: T.surfaceB, border: "none", padding: "9px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: T.t1, display: "flex", justifyContent: "space-between" }}>
                <span>{t("tripbill.bf_blocked", { n: blockedV.length })}</span>
                <span style={{ color: T.t4, transform: showBlocked ? "rotate(180deg)" : "none", display: "inline-block" }}>⌄</span>
              </button>
              {showBlocked && (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 760 }}>
                    {blockedV.map((x) => (
                      <div key={x.id} style={{ display: "grid", gridTemplateColumns: "92px minmax(90px,1fr) minmax(100px,1fr) minmax(100px,1fr) 200px", gap: 8, padding: "8px 14px", borderTop: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2 }}>
                        <span style={{ whiteSpace: "nowrap" }}>{tbDate(x.trip_date)}<span style={{ display: "block", fontSize: 10, color: T.t4 }}>#{x.trip_no}</span></span>
                        <span style={{ fontWeight: 700, color: T.t1 }}>{x.registration_no || x.vehicle_name || "—"}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.project_name || "—"}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.route_name || "—"}</span>
                        <span>{x.block_reason
                          ? <TbPill label={t("tripbill.blk_" + x.block_reason)} c={x.block_reason === "flagged" ? T.red : T.amb} bg={x.block_reason === "flagged" ? T.redL : T.ambL} />
                          : null}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Bills — GET /trips/bills (sirf Finance View) ────────────────────
const BL_COLS = "86px minmax(120px,1.2fr) 78px 78px minmax(110px,1.2fr) 50px 96px 96px 120px";
function BillsView({ openId, onOpened }) {
  const [st, setSt] = useState({ state: "loading", rows: [] });
  const [fVendor, setFVendor] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const load = useCallback(() => {
    let alive = true;
    api.get("/trips/bills").then((r) => {
      if (!alive) return;
      const d = tbBody(r);
      setSt(Array.isArray(d) ? { state: "ok", rows: d } : { state: "error", rows: [], msg: (r && r.message) || t("tripbill.load_fail") });
    }).catch(() => { if (alive) setSt({ state: "error", rows: [], msg: t("tripbill.load_fail") }); });
    return () => { alive = false; };
  }, []);
  useEffect(() => load(), [load]);
  // Billing se "Bill kholo" dabane par seedha wahi bill.
  useEffect(() => { if (openId != null) { setOpen(openId); onOpened && onOpened(); } }, [openId, onOpened]);
  const vendors = [...new Map(st.rows.map((b) => [String(b.vendor_id), b.vendor_name || t("tripbill.vendor_nahi")])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const s = q.trim().toLowerCase();
  const rows = st.rows.filter((b) => (!fVendor || String(b.vendor_id) === fVendor)
    && (!s || [b.bill_no, b.vendor_name, ...(Array.isArray(b.projects) ? b.projects : [])].map((x) => String(x || "").toLowerCase()).some((h) => h.includes(s))));
  const sum = rows.reduce((a, b) => ({ amt: a.amt + (Number(b.total_amount) || 0), paid: a.paid + (Number(b.paid_amount) || 0) }), { amt: 0, paid: 0 });
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("tripbill.bl_search_ph")}
          style={{ flex: 1, minWidth: 200, padding: "7px 11px", borderRadius: 7, border: `1.5px solid ${q ? T.ind : T.b1}`, fontSize: 12, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none" }} />
        <PickSelect value={fVendor} onChange={(e) => setFVendor(e.target.value)} style={{ ...tbSel, borderColor: fVendor ? T.ind : T.b1 }}>
          <option value="">{t("tripbill.all_vendors")}</option>
          {vendors.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </PickSelect>
        {(q || fVendor) && <button type="button" onClick={() => { setQ(""); setFVendor(""); }} style={linkBtn(T.ind)}>{t("common.clear")}</button>}
      </div>
      {st.state === "loading" && <Empty>{t("common.loading_2")}</Empty>}
      {st.state === "error" && <ErrBox>{st.msg}</ErrBox>}
      {st.state === "ok" && rows.length === 0 && <Empty>{st.rows.length ? t("tripbill.bl_khoj_nahi") : t("tripbill.bl_empty")}</Empty>}
      {rows.length > 0 && (
        <>
          <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 6 }}>{t("tripbill.bl_count", { n: rows.length, amt: tbMoney(sum.amt), paid: tbMoney(sum.paid) })}</div>
          <div style={{ ...tbCardStyle, overflowX: "auto" }}>
            <div style={{ minWidth: 960 }}>
              <div style={{ display: "grid", gridTemplateColumns: BL_COLS, gap: 8, padding: "8px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>
                <span>{t("tripbill.bl_bill")}</span><span>{t("common.vendor")}</span><span>{t("tripbill.bd_bill_date")}</span><span>{t("tripbill.bd_due_date")}</span><span>{t("common.project")}</span>
                <span style={{ textAlign: "right" }}>{t("tripbill.col_trips")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_amount")}</span><span style={{ textAlign: "right" }}>{t("tripbill.bd_paid")}</span><span>{t("common.status")}</span>
              </div>
              {rows.map((b) => (
                <div key={b.id} onClick={() => setOpen(b.id)}
                  style={{ display: "grid", gridTemplateColumns: BL_COLS, gap: 8, padding: "9px 14px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2, cursor: "pointer" }}>
                  <span style={{ fontWeight: 800, color: T.ind }}>{b.bill_no || "#" + b.id}</span>
                  <span style={{ color: T.t1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.vendor_name || "—"}</span>
                  <span>{tbDate(b.bill_date || b.created_at)}</span>
                  <span>{tbDate(b.due_date)}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={(b.projects || []).join(", ")}>{Array.isArray(b.projects) && b.projects.length ? b.projects.join(", ") : (b.project_name || "—")}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(b.trip_count) || 0}</span>
                  <span style={{ textAlign: "right", fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{tbMoney(b.total_amount)}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tbMoney(b.paid_amount)}</span>
                  <span><TbBillStatus status={b.status} due={b.due_date} /></span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {open != null && <BillDetailHost id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
// Bill → uski trip ki detail (ek ke upar ek modal).
function BillDetailHost({ id, onClose }) {
  const [trip, setTrip] = useState(null);
  return (
    <>
      <TbBillDetail id={id} onClose={onClose} onTrip={(tid) => setTrip(tid)} />
      {trip != null && <TbTripDetail id={trip} onClose={() => setTrip(null)} />}
    </>
  );
}

// ── Report — GET /trips/office/report ───────────────────────────────
// Chhanni (tareekh, project, vendor — server par; bill ki halat, gaadi — yahin),
// flat table ya Vendor → Gaadi → Din, aur CSV / Excel (Machinery Export tick).
const RP_COLS = "minmax(74px,.7fr) minmax(90px,.9fr) minmax(90px,1fr) minmax(90px,1fr) minmax(90px,1fr) 62px 90px 150px";
const RP_STATES = ["ready", "billed", "rate_pending", "flagged", "in_transit", "monthly", "own", "rejected", "cancelled"];
function ReportView({ projects }) {
  const vend = useTbVendorOpts();
  const m0 = new Date(); m0.setDate(1);
  const [from, setFrom] = useState(m0.toLocaleDateString("en-CA"));
  const [to, setTo] = useState(tbToday());
  const [fProj, setFProj] = useState("");
  const [fVendor, setFVendor] = useState("");
  const [fState, setFState] = useState("");
  const [qVeh, setQVeh] = useState("");
  const [group, setGroup] = useState(true);
  const [st, setSt] = useState({ state: "loading" });
  const [detail, setDetail] = useState(null);
  const [billId, setBillId] = useState(null);
  const [busy, setBusy] = useState("");
  const showBills = canSeeBills();
  useEffect(() => {
    let alive = true;
    setSt((p) => ({ ...p, state: "loading" }));
    api.get("/trips/office/report?from=" + from + "&to=" + to + (fProj ? "&project_id=" + fProj : "") + (fVendor ? "&vendor_id=" + fVendor : "")).then((r) => {
      if (!alive) return;
      const d = tbBody(r);
      setSt(d && Array.isArray(d.rows) ? { state: "ok", rows: d.rows, totals: d.totals || {}, truncated: !!d.truncated } : { state: "error", msg: (r && r.message) || t("tripbill.load_fail") });
    }).catch(() => { if (alive) setSt({ state: "error", msg: t("tripbill.load_fail") }); });
    return () => { alive = false; };
  }, [from, to, fProj, fVendor]);
  const rows = (st.rows || []).filter((x) => (!fState || x.bill_state === fState) && tbMatch({ name: x.vehicle_name, registration_no: x.registration_no }, "", qVeh));
  const tot = st.totals || {};
  const sumOf = (list) => ({
    trips: list.length, km: list.reduce((a, x) => a + (Number(x.km_billed) || 0), 0),
    amt: list.some((x) => x.amount != null) ? list.reduce((a, x) => a + (Number(x.amount) || 0), 0) : null,
  });
  const tree = (() => {
    const vm = new Map();
    rows.forEach((x) => {
      const vk = x.vendor_id == null ? "none" : String(x.vendor_id);
      const v = vm.get(vk) || { name: x.vendor_name || t("tripbill.vendor_nahi"), veh: new Map(), all: [] };
      v.all.push(x);
      const ek = String(x.equipment_id);
      const e = v.veh.get(ek) || { name: x.registration_no || x.vehicle_name || "#" + ek, days: new Map(), all: [] };
      e.all.push(x);
      const dk = tbYmd(x.trip_date);
      const dd = e.days.get(dk) || [];
      dd.push(x); e.days.set(dk, dd);
      v.veh.set(ek, e); vm.set(vk, v);
    });
    return [...vm.values()].sort((a, b) => a.name.localeCompare(b.name));
  })();
  const stateLabel = (x) => (tbStateMeta(x.bill_state) || {}).l || "";
  const COLS = [
    { label: t("common.date"), w: 12, key: "d", excel: (x) => tbYmd(x.trip_date) },
    { label: t("tripbill.rp_trip_no"), w: 8, excel: (x) => x.trip_no },
    { label: t("tripbill.col_vehicle"), w: 14, excel: (x) => x.registration_no || x.vehicle_name || "" },
    { label: t("common.vendor"), w: 22, excel: (x) => x.vendor_name || "" },
    { label: t("common.project"), w: 22, excel: (x) => x.project_name || "" },
    { label: t("tripbill.col_route"), w: 22, excel: (x) => x.route_name || "" },
    { label: t("tripbill.col_material"), w: 16, excel: (x) => x.material_name || "" },
    { label: t("tripbill.rp_qty"), w: 10, excel: (x) => (x.qty != null ? Number(x.qty) : "") },
    { label: t("tripbill.rp_unit"), w: 8, excel: (x) => x.qty_unit || "" },
    { label: t("tripbill.col_km"), w: 10, excel: (x) => (x.km_billed != null ? Number(x.km_billed) : "") },
    { label: t("tripbill.col_amount"), w: 12, excel: (x) => (x.amount != null ? Number(x.amount) : "") },
    { label: t("common.status"), w: 18, excel: stateLabel },
    { label: t("tripbill.td_bill"), w: 10, excel: (x) => x.bill_no || "" },
  ];
  const fname = "trips-" + from + "-to-" + to;
  const exportXls = async () => { setBusy("xls"); try { await exportExcel(rows, COLS, fname, t("tripbill.sub_report")); } finally { setBusy(""); } };
  const exportCsv = () => {
    const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const body = [COLS.map((c) => esc(c.label)).join(","), ...rows.map((x) => COLS.map((c) => esc(c.excel(x))).join(","))].join("\n");
    saveBlob(new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }), fname + ".csv");
  };
  const tripRow = (x) => (
    <div key={x.id} onClick={() => setDetail(x.id)}
      style={{ display: "grid", gridTemplateColumns: RP_COLS, gap: 8, padding: "7px 14px", borderTop: `1px solid ${T.b1}`, alignItems: "center", fontSize: 12, color: T.t2, cursor: "pointer" }}>
      <span style={{ whiteSpace: "nowrap" }}>{group ? "#" + x.trip_no : <>{tbDate(x.trip_date)}<span style={{ display: "block", fontSize: 10, color: T.t4 }}>#{x.trip_no}</span></>}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700, color: T.t1 }}>{x.registration_no || x.vehicle_name || "—"}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.project_name || "—"}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.route_name || "—"}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[x.material_name, x.qty != null ? tbNum(x.qty) + (x.qty_unit ? " " + x.qty_unit : "") : ""].filter(Boolean).join(" · ") || "—"}</span>
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{x.km_billed != null ? tbNum(x.km_billed) : "—"}</span>
      <span style={{ textAlign: "right", fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{x.status === "in_transit" ? "—" : tbMoney(x.amount)}</span>
      <span><TbChip trip={x} /></span>
    </div>
  );
  const head = (label, s, lvl) => (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", padding: lvl === 0 ? "9px 14px" : lvl === 1 ? "7px 14px 7px 24px" : "5px 14px 5px 34px",
      background: lvl === 0 ? T.surfaceB : "transparent", borderTop: `1px solid ${T.b1}`, fontSize: lvl === 0 ? 13 : 12, fontWeight: lvl === 2 ? 600 : 700, color: lvl === 2 ? T.t3 : T.t1 }}>
      <span style={{ flex: 1, minWidth: 120 }}>{label}</span>
      <span style={{ fontWeight: 500, color: T.t3, fontSize: 11 }}>{t("tripbill.rp_sub", { trips: s.trips, km: tbNum(s.km) })}</span>
      <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 90, textAlign: "right" }}>{tbMoney(s.amt)}</span>
    </div>
  );
  const tile = (label, value) => (
    <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "9px 13px" }}>
      <div style={tbLbl}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
  return (
    <div>
      <div style={{ ...tbCardStyle, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><div style={rcLbl}>{t("common.from")}</div><input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} style={tbDateS} /></div>
        <div><div style={rcLbl}>{t("common.to")}</div><input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} style={tbDateS} /></div>
        <div><div style={rcLbl}>{t("common.project")}</div>
          <PickSelect value={fProj} onChange={(e) => setFProj(e.target.value)} style={{ ...tbSel, borderColor: fProj ? T.ind : T.b1 }}>
            <option value="">{t("tripbill.all_projects")}</option>
            {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </PickSelect></div>
        <div><div style={rcLbl}>{t("common.vendor")}</div>
          <PickSelect value={fVendor} onChange={(e) => setFVendor(e.target.value)} style={{ ...tbSel, borderColor: fVendor ? T.ind : T.b1 }}>
            <option value="">{t("tripbill.all_vendors")}</option>
            {(vend || []).filter((x) => x.vendor_id != null).map((x) => <option key={x.vendor_id} value={x.vendor_id}>{x.vendor_name}</option>)}
          </PickSelect></div>
        <div><div style={rcLbl}>{t("common.status")}</div>
          <PickSelect value={fState} onChange={(e) => setFState(e.target.value)} style={{ ...tbSel, borderColor: fState ? T.ind : T.b1 }}>
            <option value="">{t("tripbill.all_status")}</option>
            {RP_STATES.map((s) => <option key={s} value={s}>{tbStateMeta(s).l}</option>)}
          </PickSelect></div>
        <div style={{ flex: "1 1 160px" }}><div style={rcLbl}>{t("tripbill.col_vehicle")}</div>
          <input value={qVeh} onChange={(e) => setQVeh(e.target.value)} placeholder={t("tripbill.rp_veh_ph")} style={{ ...inp, padding: "6px 9px", borderColor: qVeh ? T.ind : T.b1 }} /></div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, cursor: "pointer", paddingBottom: 6 }}>
          <input type="checkbox" checked={group} onChange={(e) => setGroup(e.target.checked)} style={{ accentColor: T.ind }} />{t("tripbill.rp_group")}
        </label>
        {canMach("export") && (
          <span style={{ display: "flex", gap: 6, paddingBottom: 1 }}>
            <Btn size="sm" ghost icon={IcSheet} disabled={!rows.length || !!busy} onClick={exportXls}>{t("common.excel")}</Btn>
            <Btn size="sm" ghost icon={IcFile} disabled={!rows.length} onClick={exportCsv}>{t("tripbill.rp_csv")}</Btn>
          </span>
        )}
      </div>

      {st.state === "loading" && <Empty>{t("common.loading_2")}</Empty>}
      {st.state === "error" && <ErrBox>{st.msg}</ErrBox>}
      {st.state === "ok" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 12 }}>
            {tile(t("tripbill.tile_trips"), Number(tot.trips) || 0)}
            {tile(t("tripbill.col_km"), tbNum(tot.km_billed || 0))}
            {tile(t("tripbill.rp_amount"), tbMoney(tot.amount))}
            {tile(t("tripbill.tile_billed"), tbMoney(tot.billed_amount))}
            {tile(t("tripbill.tile_ready"), tbMoney(tot.ready_amount))}
            {tile(t("tripbill.tile_rate_baaki"), Number(tot.rate_pending_trips) || 0)}
          </div>
          {st.truncated && <Notice>{t("tripbill.rp_truncated")}</Notice>}
          {rows.length === 0 && <Empty>{t("tripbill.rp_empty")}</Empty>}
          {rows.length > 0 && (
            <div style={{ ...tbCardStyle, overflowX: "auto" }}>
              <div style={{ minWidth: 940 }}>
                <div style={{ display: "grid", gridTemplateColumns: RP_COLS, gap: 8, padding: "7px 14px", background: T.surface, borderBottom: `1px solid ${T.b1}`, fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  <span>{group ? t("tripbill.rp_trip_no") : t("common.date")}</span><span>{t("tripbill.col_vehicle")}</span><span>{t("common.project")}</span><span>{t("tripbill.col_route")}</span><span>{t("tripbill.col_material")}</span>
                  <span style={{ textAlign: "right" }}>{t("tripbill.col_km")}</span><span style={{ textAlign: "right" }}>{t("tripbill.col_amount")}</span><span>{t("common.status")}</span>
                </div>
                {!group && rows.map(tripRow)}
                {group && tree.map((v) => (
                  <div key={v.name}>
                    {head(v.name, sumOf(v.all), 0)}
                    {[...v.veh.values()].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
                      <div key={e.name}>
                        {head(e.name, sumOf(e.all), 1)}
                        {[...e.days.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([dk, list]) => (
                          <div key={dk}>
                            {head(tbDate(dk), sumOf(list), 2)}
                            {list.map(tripRow)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {detail != null && <TbTripDetail id={detail} onClose={() => setDetail(null)} onBill={showBills ? (bid) => { setDetail(null); setBillId(bid); } : null} />}
      {billId != null && <TbBillDetail id={billId} onClose={() => setBillId(null)} onTrip={(tid) => { setBillId(null); setDetail(tid); }} />}
    </div>
  );
}

// Upar sub-tab: Rate baaki · Vendor / Gaadi · Billing · Bills · Rate card · Report.
// Billing = Finance Create, Bills = Finance View (admin hamesha); Rate card tabhi
// jab server /rate-templates deta hai (purana server / ijazat nahi = nahi).
function TripVehiclesTab({ tv, from, to, onRange, onReload, parties, projects, q, onQ, view, onView, cities, setCities }) {
  // City ki chhanni — yaad rehti hai (agli baar wahi city); sirf Rate card view me.
  const [fCity, setFCity] = useState(() => { try { return localStorage.getItem("tv_city") || ""; } catch (e) { return ""; } });
  useEffect(() => { try { localStorage.setItem("tv_city", fCity); } catch (e) { /* storage band */ } }, [fCity]);
  const cityOpts = useMemo(() => {
    const m = new Map(); let none = 0;
    (tv.rows || []).forEach((g) => (g.vehicles || []).forEach((v) => {
      if (v.vendor_changed || Number(v.is_active) === 0) return;
      if (v.city_id == null) { none += 1; return; }
      const k = String(v.city_id);
      const c = m.get(k) || { id: k, name: v.city_name || "#" + k, n: 0 };
      c.n += 1; m.set(k, c);
    }));
    return { list: [...m.values()].sort((a, b) => a.name.localeCompare(b.name)), none };
  }, [tv.rows]);
  // Chuni city (ya "City nahi") ab list me nahi (gaadi hat gayi / doosri company) → Sab city.
  // Server jawab de chuka ho tabhi — warna fail hone par yaad ki hui city mit jaati.
  useEffect(() => {
    if (!fCity || tv.state !== "ok") return;
    const gone = fCity === "none" ? cityOpts.none === 0 : !cityOpts.list.some((c) => c.id === fCity);
    if (gone) setFCity("");
  }, [cityOpts, fCity, tv.state]);
  const cityOk = useCallback((v) => !fCity || (fCity === "none" ? v.city_id == null : String(v.city_id) === fCity), [fCity]);
  const cityName = fCity === "none" ? t("trip_tracking.tc_city_nahi") : ((cityOpts.list.find((c) => c.id === fCity) || {}).name || "");
  const cityBar = <CityBar opts={cityOpts} value={fCity} onChange={setFCity} />;

  const [form, setForm] = useState(null);          // null | {} nayi | gaadi (edit)
  const [removing, setRemoving] = useState(null);
  // Server ke gate jaise (5 Oct 2026): nayi gaadi = Equipment Entry (ya Create),
  // badlo = Equipment Edit, hatao = Machinery Delete, card / rate / "Mahina" =
  // sirf Finance Create (rateGate), bill banana = Finance Create, bill dekhna = Finance View.
  const canAdd = canEntry("Equipment");
  const canEdit = can("Equipment", "edit");
  const canRemove = canRemoveMachine();
  const canRates = canEditRates();
  const canMake = canMakeBill();
  const showBills = canSeeBills();

  // Rate card + naam wale cards. null = aa rahe / purana server.
  const [cards, setCards] = useState(null);
  const loadCards = useCallback(() => {
    api.get("/trips/rate-templates")
      .then((r) => setCards(r && r.success ? {
        list: Array.isArray(r.data) ? r.data : [],
        legacy: Array.isArray(r.legacy_cards) ? r.legacy_cards : [],
      } : null))
      .catch(() => setCards(null));
  }, []);
  useEffect(() => { loadCards(); }, [loadCards]);
  // Rate baaki — GET /trips/office/rate-pending (D1 wali fleet gaadi bhi).
  const [rp, setRp] = useState({ state: "loading", trips: 0, vehicles: [] });
  const loadRp = useCallback(() => {
    api.get("/trips/office/rate-pending")
      .then((r) => {
        const d = tbBody(r);
        setRp(d && Array.isArray(d.vehicles) ? { state: "ok", trips: Number(d.trips) || 0, vehicles: d.vehicles } : { state: "error", trips: 0, vehicles: [] });
      })
      .catch(() => setRp({ state: "error", trips: 0, vehicles: [] }));
  }, []);
  useEffect(() => { loadRp(); }, [loadRp]);
  // /trips/trucks — edit ke liye poori row aur "Gaadi select karo" ki list.
  const [trucks, setTrucks] = useState(null);
  const loadTrucks = useCallback(() => {
    api.get("/trips/trucks").then((r) => setTrucks(r && r.success && Array.isArray(r.data) ? r.data : [])).catch(() => setTrucks([]));
  }, []);
  useEffect(() => { loadTrucks(); }, [loadTrucks]);
  // Picker ki list: trip gaadi + fleet ki kiraye ki gaadi (D1) — wo jo Rate baaki me hain
  // par /trips/trucks ki list me nahi aatin.
  const pickTrucks = useMemo(() => {
    if (!trucks) return null;
    const have = new Set(trucks.map((r) => r.id));
    const extra = rp.vehicles.filter((v) => !have.has(v.id)).map((v) => ({
      id: v.id, name: v.name, registration_no: v.registration_no, vendor_id: v.vendor_id, vendor_name: v.vendor_name, capacity: v.capacity,
      trip_billing: v.trip_billing == null ? "unset" : v.trip_billing, rate_card_id: v.rate_card_id || null, rate_card_name: v.rate_card_name || null,
      is_active: 1, is_trip_vehicle: true, city_id: v.city_id == null ? null : v.city_id, city_name: v.city_name || null,
    }));
    return [...trucks, ...extra];
  }, [trucks, rp.vehicles]);

  const [edit, setEdit] = useState(null);          // card editor: null | {} | card | { _seed }
  const [pick, setPick] = useState(null);          // { tpl, baaki } — "Gaadi select karo"
  const [flash, setFlash] = useState("");
  const [cardFor, setCardFor] = useState(null);    // gaadi-wise "Card lagao"
  const [page, setPage] = useState(null);          // Vehicle page: { vehicle, from, to, projectId }
  const [rk, setRk] = useState(0);                 // vendor list dobara mangane ki chaabi
  const [vProj, setVProj] = useState("");          // Vendor / Gaadi ka project chhanni
  const [billVendor, setBillVendor] = useState(null);
  const [billFocus, setBillFocus] = useState(null);
  // Save ke baad sab dobara.
  const refresh = () => { onReload(); loadCards(); loadTrucks(); loadRp(); setRk((k) => k + 1); };
  const openPick = (c) => { setEdit(null); setFlash(""); setPick({ tpl: c, baaki: true }); onView("ratecard"); };
  const openNewCard = () => { setPick(null); setFlash(""); setEdit({}); onView("ratecard"); };
  const editOf = (r) => ({ ...r, vendor_id: truckVendorId(r) });
  const openVehicle = (v, projectId, rng) => setPage({ vehicle: v, projectId: projectId || "", from: (rng && rng.from) || from, to: (rng && rng.to) || to });

  const setMonthly = async (v) => {
    const reg = v.registration_no || v.name || "#" + v.id;
    if (!window.confirm(t("tripbill.rb_mahina_confirm", { reg }))) return;
    const r = await api.patch(`/trips/vehicles/${v.id}/billing`, { trip_billing: "monthly" });
    if (!r || r.success === false) { window.alert(srvMsg(r)); return; }
    setFlash(t("tripbill.rb_mahina_done", { reg }));
    refresh();
  };
  // Card lagao ke liye gaadi ki shakal (Vendor / Gaadi ki row se).
  const cardVeh = (v, g) => {
    const tr = (trucks || []).find((x) => x.id === v.id);
    const cid = tr ? tr.rate_card_id : ((cards && cards.list.find((c) => c.name === v.rate_card_name)) || {}).id;
    return { id: v.id, name: v.name, registration_no: v.registration_no, vendor_id: g.vendor_id, vendor_name: g.vendor_name || null,
      capacity: v.capacity, trip_billing: v.trip_billing, rate_card_id: cid || null, rate_card_name: v.rate_card_name || null };
  };

  const subs = [
    { id: "ratebaaki", l: t("tripbill.sub_rate_baaki", { n: rp.state === "ok" ? rp.vehicles.length : "…" }), warn: rp.state === "ok" && rp.vehicles.length > 0 },
    { id: "vendor", l: t("tripbill.sub_vendor") },
    ...(canMake ? [{ id: "billing", l: t("tripbill.sub_billing") }] : []),
    ...(showBills ? [{ id: "bills", l: t("tripbill.sub_bills") }] : []),
    ...(cards ? [{ id: "ratecard", l: t("machinery.tv_view_ratecard") }] : []),
    { id: "report", l: t("tripbill.sub_report") },
  ];
  const curView = subs.some((s) => s.id === view) ? view : "vendor";

  const switcher = (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {subs.map((s) => {
        const on = curView === s.id;
        return (
          <button key={s.id} type="button" onClick={() => onView(s.id)} aria-pressed={on}
            style={{ padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 600,
              border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, color: on ? T.ind : (s.warn ? T.amb : T.t2) }}>{s.l}</button>
        );
      })}
    </div>
  );
  const cardModal = cardFor && cards && (
    <CardPickModal vehicle={cardFor} cards={cards} parties={parties} onClose={() => setCardFor(null)}
      onSaved={(msg) => { setCardFor(null); setFlash(msg); refresh(); }} />
  );

  return (
    <div>
      {switcher}
      {flash && curView !== "ratecard" && <TbFlash>{flash}</TbFlash>}

      {curView === "ratebaaki" && (
        <RateBaakiView rp={rp} cards={cards} canRates={canRates && !!cards}
          onVehicle={(v) => openVehicle(v, "", { from: tbYmd(v.oldest_trip_date) || from, to: tbToday() })}
          onCard={(v) => setCardFor({ id: v.id, name: v.name, registration_no: v.registration_no, vendor_id: v.vendor_id, vendor_name: v.vendor_name,
            capacity: v.capacity, trip_billing: v.trip_billing, rate_card_id: v.rate_card_id || null, rate_card_name: v.rate_card_name || null })}
          onMonthly={setMonthly} onPick={openPick} onNewCard={openNewCard} />
      )}

      {curView === "vendor" && (
        <>
          <div style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.b1}`, padding: "8px 12px", marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t("common.from")}</span>
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && onRange(e.target.value, to)} style={tbDateS} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.t2 }}>{t("common.to")}</span>
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && onRange(from, e.target.value)} style={tbDateS} />
            <PickSelect value={vProj} onChange={(e) => setVProj(e.target.value)} style={{ ...tbSel, borderColor: vProj ? T.ind : T.b1 }}>
              <option value="">{t("tripbill.all_projects")}</option>
              {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </PickSelect>
            <span style={{ flex: 1 }} />
            {canAdd && <Btn size="sm" icon={IcAdd} onClick={() => setForm({})}>{t("machinery.tv_add")}</Btn>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <input value={q || ""} onChange={(e) => onQ(e.target.value)} placeholder={t("machinery.tv_khoj_ph")}
              style={{ flex: 1, minWidth: 220, padding: "7px 11px", borderRadius: 7, border: `1.5px solid ${q ? T.ind : T.b1}`, fontSize: 12, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none" }} />
            {(q || vProj) && <button type="button" onClick={() => { onQ(""); setVProj(""); }} style={linkBtn(T.ind)}>{t("common.clear")}</button>}
          </div>
          <TbVendorVehicles projectId={vProj} from={from} to={to} q={q} reloadKey={rk}
            emptyHint={t("machinery.tv_empty_hint")}
            onVehicle={(v) => openVehicle(v, vProj)}
            vendorExtra={(g) => (canMake && g.vendor_id != null && Number(g.ready_trips) > 0
              ? <Btn size="sm" ghost onClick={() => { setBillVendor(g.vendor_id); onView("billing"); }}>{t("tripbill.vv_bill_banao")}</Btn> : null)}
            vehicleExtra={(v, g) => {
              const tr = !v.is_fleet ? (trucks || []).find((x) => x.id === v.id) : null;
              const cardable = canRates && !!cards && v.trip_billing !== "own" && v.trip_billing !== "monthly";
              return (
                <>
                  {cardable && <button type="button" onClick={() => setCardFor(cardVeh(v, g))} style={linkBtn(T.ind)}>{v.rate_card_name ? t("trip_tracking.tc_card_badlo") : t("tripbill.rb_card_lagao")}</button>}
                  {tr && canEdit && <Btn size="sm" ghost onClick={() => setForm(editOf(tr))}>{t("common.edit_2")}</Btn>}
                  {tr && canRemove && <Btn size="sm" ghost style={{ color: T.red }} onClick={() => setRemoving(tr)}>{t("machinery.tv_hatao")}</Btn>}
                </>
              );
            }} />
        </>
      )}

      {curView === "billing" && canMake && (
        <BillingView vendorPre={billVendor} canSeeBillList={showBills}
          onBills={(id) => { setBillFocus(id); onView("bills"); }} />
      )}

      {curView === "bills" && showBills && <BillsView openId={billFocus} onOpened={() => setBillFocus(null)} />}

      {curView === "ratecard" && cards && (
        <>
          {cityBar}
          <RateCardView cards={cards} trucks={pickTrucks} tvRows={tv.rows} parties={parties} canRates={canRates} cityOk={cityOk} cityName={fCity ? cityName : ""}
            edit={edit} onEdit={setEdit} pick={pick} onPick={setPick} flash={flash} onFlash={setFlash}
            onChanged={refresh} onGaadi={(r) => setCardFor(r)} />
        </>
      )}

      {curView === "report" && <ReportView projects={projects} />}

      <TripVehicleForm open={!!form} vehicle={form} parties={parties} onClose={() => setForm(null)} onSaved={refresh}
        cities={cities} setCities={setCities} defaultCity={fCity && fCity !== "none" ? fCity : ""} />
      <RemoveMachineModal open={!!removing} onClose={() => setRemoving(null)}
        machine={removing ? { id: removing.id, name: removing.registration_no } : null} onRemoved={refresh} />
      {cardModal}
      {page && (
        <TbVehiclePage key={page.vehicle.id} vehicle={page.vehicle} projectId={page.projectId} from={page.from} to={page.to} showBills={showBills}
          onClose={() => setPage(null)} onChanged={() => { onReload(); loadRp(); setRk((k) => k + 1); }} />
      )}
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
    <PickSelect value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, width: w, padding: "6px 8px", fontSize: 11.5 }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </PickSelect>
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
  // Excel / PDF / WhatsApp = Machinery ka EXPORT tick (5 Oct 2026) — server ki
  // report PDF bhi wahi maangti hai. Bina tick ke report screen par dikhti hai,
  // bahar nahi jaati.
  const mayExport = canMach("export");

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

  if (!mayExport) return null;
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
              <span style={{ fontSize: 11, color: T.t3 }}>{localDT(d.event_time).slice(5)}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{d.machine_name || d.unit_name}<span style={{ fontWeight: 400, color: T.t4, fontSize: 10.5 }}> {t("machinery.fuel_drop")}</span></span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: T.red, fontWeight: 700 }}>−{fmtN(d.litres)} L</span>
              <span style={{ fontSize: 11, color: T.t3 }}>{d.location_text || "—"}</span>
              <span style={{ textAlign: "right" }}>{canMach("create") && <Btn size="sm" ghost onClick={() => review(d.id)}>{t("fuel.theek_tha")}</Btn>}</span>
            </Row>
          ))}
          {dash.flags.fills_no_entry.map((f) => (
            <Row key={"f" + f.id} cols="110px 1.4fr 90px 1fr 100px">
              <span style={{ fontSize: 11, color: T.t3 }}>{localDT(f.event_time).slice(5)}</span>
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
          {canMach("create")
            ? <TeleConfigForm existing={null} onSaved={() => onReload && onReload(true)} />
            : <Empty>{t("machinery.tele_setup_create_chahiye")}</Empty>}
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
        {/* Telematics ka setup / sync / jod = Machinery Create (server: routes/telematics.js) */}
        {canMach("create") && (
          <div style={{ display: "flex", gap: 7 }}>
            <Btn size="sm" ghost onClick={() => setConfigOpen(true)}>{t("common.settings")}</Btn>
            <Btn size="sm" onClick={doSync} disabled={syncing}>{syncing ? t("machinery.sync_chal_raha_hai") : t("machinery.sync_now")}</Btn>
          </div>
        )}
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

              {canMach("create") && <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                <PickSelect value={selId} onChange={(e) => setChoice((p) => ({ ...p, [u.id]: e.target.value }))}
                  style={{ ...inp, width: 320 }}>
                  <option value="">{t("machinery.machine_chuno")}</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.registration_no ? ` (${m.registration_no})` : ""}
                    </option>
                  ))}
                </PickSelect>
                <Btn size="sm" onClick={() => link(u)} disabled={busyId === u.id || !selId}>
                  {busyId === u.id ? "..." : t("machinery.jodo")}
                </Btn>
                <Btn size="sm" ghost onClick={() => onNewMachine && onNewMachine(u)}>{t("machinery.nayi_machine_banao")}</Btn>
                <Btn size="sm" ghost onClick={() => act(u, "ignore")} disabled={busyId === u.id}>{t("machinery.hamari_nahi_hai")}</Btn>
              </div>}

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
                  {canMach("create") && <Btn size="sm" ghost onClick={() => unlink(u)} disabled={busyId === u.id}>{t("machinery.kholo")}</Btn>}
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
                {canMach("create") && <Btn size="sm" ghost onClick={() => act(u, "restore")}>{t("machinery.wapas_lao")}</Btn>}
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

// ══════════════════════════════════════════════════════════════════
// MACHINE REQUESTS (5 Oct 2026, Prafull)
// Site ki "Request equipment" (mobile + project ka Equipment tab) yahan ek
// jagah: kab, kisne, kis project ke liye, kaun si machine recommend ki, task /
// note aur priority. City / project / machine / date ki chhanni server par
// (GET /equipment/request), status ki ginti yahin. Admin / PM yahin se
// Fulfill (kaun si machine bheji) ya Reject (wajah) karte hain — server par
// bhi wahi rok (requireRole) aur ek baar faisla = dobara nahi (409).
// ══════════════════════════════════════════════════════════════════
const IcInbox = (p) => <Ic {...p} d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />;
const MR_PRIO = [
  { k: "urgent", get l() { return t("machinery.mr_p_urgent"); }, c: T.red, bg: T.redL, rank: 0 },
  { k: "high",   get l() { return t("machinery.mr_p_high"); },   c: T.amb, bg: T.ambL, rank: 1 },
  { k: "normal", get l() { return t("machinery.mr_p_normal"); }, c: T.t3,  bg: T.sltL, rank: 2 },
];
const mrPrio = (k) => MR_PRIO.find((p) => p.k === k) || MR_PRIO[2];
// ══════════════════════════════════════════════════════════════════
// MACHINERY SETTINGS (7 Oct 2026) — company ki machine wali setting ek jagah.
// Photo kab zaroori hai wo yahan nahi — Settings → Photo (wahi ek jagah).
// ══════════════════════════════════════════════════════════════════
function MachinerySettingsTab() {
  const [st, setSt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [hours, setHours] = useState("");
  useEffect(() => {
    api.get("/equipment/settings").then((r) => {
      const d = r && r.success ? r.data : null;
      setSt(d); setHours(d ? String(d.run_remind_hours) : "");
    }).catch(() => setSt(null));
  }, []);
  const save = async (patch) => {
    setBusy(true); setMsg("");
    const r = await api.put("/equipment/settings", { ...st, ...patch }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r || r.success === false) { setMsg(srvMsg(r)); return; }
    setSt(r.data); setHours(String(r.data.run_remind_hours)); setMsg(t("machinery.ms_saved"));
  };
  if (!st) return <div style={{ padding: 30, textAlign: "center", color: T.t4, fontSize: 13 }}>{t("common.loading")}</div>;
  const row = (k, title, hint) => (
    <label key={k} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderBottom: `1px solid ${T.b1}`, cursor: busy ? "wait" : "pointer" }}>
      <input type="checkbox" checked={!!st[k]} disabled={busy} onChange={(e) => save({ [k]: e.target.checked })} style={{ marginTop: 3 }} />
      <span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.t1 }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: T.t3, marginTop: 3, lineHeight: 1.5 }}>{hint}</span>
      </span>
    </label>
  );
  return (
    <div style={{ maxWidth: 720, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10 }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.b1}`, fontSize: 14, fontWeight: 800, color: T.t1 }}>{t("machinery.ms_title")}</div>
      {row("site_rate", t("machinery.ms_site_rate"), t("machinery.ms_site_rate_hint"))}
      {row("start_stop", t("machinery.ms_start_stop"), t("machinery.ms_start_stop_hint"))}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 220 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.t1 }}>{t("machinery.ms_remind")}</span>
          <span style={{ display: "block", fontSize: 11.5, color: T.t3, marginTop: 3 }}>{t("machinery.ms_remind_hint")}</span>
        </span>
        <input value={hours} inputMode="numeric" disabled={busy}
          onChange={(e) => setHours(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => { if (hours && Number(hours) !== Number(st.run_remind_hours)) save({ run_remind_hours: Number(hours) }); }}
          style={{ width: 80, padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 13, fontFamily: "inherit" }} />
      </div>
      <div style={{ padding: "12px 16px", fontSize: 11.5, color: T.t3, lineHeight: 1.5 }}>{t("machinery.ms_photo_note")}</div>
      {msg && <div style={{ padding: "0 16px 12px", fontSize: 12, fontWeight: 600, color: T.grn }}>{msg}</div>}
    </div>
  );
}

const MR_STATUS = [
  { k: "pending",   get l() { return t("machinery.mr_st_pending"); },   c: T.amb, bg: T.ambL },
  { k: "fulfilled", get l() { return t("machinery.mr_st_fulfilled"); }, c: T.grn, bg: T.grnL },
  { k: "rejected",  get l() { return t("machinery.mr_st_rejected"); },  c: T.red, bg: T.redL },
];
const mrStatus = (k) => MR_STATUS.find((s) => s.k === String(k || "pending").toLowerCase()) || MR_STATUS[0];
const MrReg = ({ v }) => (v ? (
  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.3, color: T.ind, background: T.indL, border: `1px solid ${T.ind}22`, borderRadius: 5, padding: "0 5px", whiteSpace: "nowrap" }}>{v}</span>
) : null);
const MR_COLS = "118px 1fr 1.05fr 1.2fr 1.25fr 84px 168px";

function MachineRequestsTab({ fleet, projects, cities, onChanged }) {
  const [status, setStatus] = useState("pending");
  const [fCity, setFCity] = useState("");
  const [fProj, setFProj] = useState("");
  const [fMach, setFMach] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [data, setData] = useState({ loading: true, failed: false, rows: [] });
  const [act, setAct] = useState(null);   // { id, kind: "fulfill" | "reject", eq, note, busy, err }
  // Server (routes/equipment.js requestApprover): Admin / PM, ya Equipment ka
  // APPROVE tick (strict — row na ho to nahi). Wahi yahan.
  const canDecide = canApproveAction({ roles: ["admin", "super_admin", "project_manager"] })
    || canAny("Equipment", "approve", { strict: true });

  const load = useCallback(async () => {
    setData((d) => ({ ...d, loading: true }));
    const qs = new URLSearchParams();
    if (fCity) qs.set("city_id", fCity);
    if (fProj) qs.set("project_id", fProj);
    if (fMach) qs.set("equipment_id", fMach);
    if (fFrom) qs.set("from", fFrom);
    if (fTo) qs.set("to", fTo);
    const r = await api.get("/equipment/request" + (qs.toString() ? "?" + qs : "")).catch(() => null);
    if (r && r.success) setData({ loading: false, failed: false, rows: Array.isArray(r.data) ? r.data : [] });
    else setData({ loading: false, failed: true, rows: [] });
  }, [fCity, fProj, fMach, fFrom, fTo]);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { all: data.rows.length, pending: 0, fulfilled: 0, rejected: 0, urgent: 0 };
    for (const r of data.rows) {
      const s = mrStatus(r.status).k; c[s] += 1;
      if (s === "pending" && r.priority === "urgent") c.urgent += 1;
    }
    return c;
  }, [data.rows]);
  // Pending pehle (urgent → high → normal), fir naye se purane
  const shown = useMemo(() => data.rows
    .filter((r) => status === "all" || mrStatus(r.status).k === status)
    .slice()
    .sort((a, b) => {
      const pa = mrStatus(a.status).k === "pending" ? 0 : 1, pb = mrStatus(b.status).k === "pending" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (pa === 0) { const d = mrPrio(a.priority).rank - mrPrio(b.priority).rank; if (d) return d; }
      return new Date(b.created_at) - new Date(a.created_at);
    }), [data.rows, status]);

  const projOpts = projects.filter((p) => !fCity || String(p.city_id || "") === String(fCity));
  const machOpts = fleet.filter((m) => !fCity || String(m.city_id || "") === String(fCity));
  const anyFilter = fCity || fProj || fMach || fFrom || fTo;
  const clearAll = () => { setFCity(""); setFProj(""); setFMach(""); setFFrom(""); setFTo(""); };

  // Fulfill: machine pehle se recommend wali; list me us project ki city ki pehle
  const openFulfill = (r) => setAct({ id: r.id, kind: "fulfill", eq: r.preferred_equipment_id ? String(r.preferred_equipment_id) : "", note: "", busy: false, err: "" });
  const openReject = (r) => setAct({ id: r.id, kind: "reject", eq: "", note: "", busy: false, err: "" });
  const decide = async () => {
    if (!act) return;
    if (act.kind === "reject" && !act.note.trim()) { setAct((a) => ({ ...a, err: t("machinery.mr_reason_zaroori") })); return; }
    setAct((a) => ({ ...a, busy: true, err: "" }));
    const body = act.kind === "fulfill"
      ? { equipment_id: act.eq ? Number(act.eq) : null, admin_note: act.note.trim() || null }
      : { admin_note: act.note.trim() };
    const r = await api.post(`/equipment/request/${act.id}/${act.kind}`, body).catch((e) => ({ success: false, message: e.message }));
    // Machine doosri site (A) par chal rahi hai → A se maango; A ki site
    // "bhej do" ya "abhi kaam chal raha hai" (wajah + photo) se jawab degi.
    if (r && r.success === false && r.code === "machine_on_site" && act.kind === "fulfill") {
      if (!window.confirm(t("machinery.mr_a_se_maango_q", { project: r.holder_project_name || "—" }))) { setAct((a) => ({ ...a, busy: false })); return; }
      const r2 = await api.post(`/equipment/request/${act.id}/fulfill`, { ...body, ask_holder: true }).catch((e) => ({ success: false, message: e.message }));
      if (!r2 || r2.success === false) { setAct((a) => ({ ...a, busy: false, err: srvMsg(r2) })); return; }
    } else if (!r || r.success === false) { setAct((a) => ({ ...a, busy: false, err: srvMsg(r) })); return; }
    setAct(null);
    await load();
    if (onChanged) onChanged();
  };
  // A ne offer kiya / A busy par phir bhi chahiye → bhejo (A par Returned, yahan raste me)
  const confirmHolder = async (r) => {
    if (!window.confirm(t("machinery.mr_phir_bhi_bhejo_q", { project: r.holder_project_name || "—" }))) return;
    const x = await api.post(`/equipment/request/${r.id}/holder-confirm`, {}).catch((e) => ({ success: false, message: e.message }));
    if (!x || x.success === false) { window.alert(srvMsg(x)); return; }
    await load();
    if (onChanged) onChanged();
  };

  const sel = (active) => ({ padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${active ? T.ind : T.b1}`, fontSize: 12, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none", minWidth: 0 });
  const dayBit = (r) => {
    const parts = [];
    if (r.from_date && r.to_date) parts.push(`${fmtD(r.from_date)} – ${fmtD(r.to_date)}`);
    else if (r.from_date) parts.push(t("machinery.mr_from_only", { d: fmtD(r.from_date) }));
    else if (r.to_date) parts.push(t("machinery.mr_to_only", { d: fmtD(r.to_date) }));
    if (r.duration_approx) parts.push(r.duration_approx);
    return parts.join(" · ");
  };

  return (
    <Panel title={t("machinery.mr_tab")} action={
      counts.urgent > 0 ? <Pill label={t("machinery.mr_urgent_n", { n: counts.urgent })} c={T.red} bg={T.redL} /> : null}>
      {/* Status + chhanni */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "10px 14px 0", flexWrap: "wrap" }}>
        {[...MR_STATUS, { k: "all", get l() { return t("machinery.mr_st_all"); } }].map((s) => {
          const on = status === s.k;
          return (
            <button key={s.k} type="button" onClick={() => setStatus(s.k)}
              style={{ padding: "6px 12px", borderRadius: 16, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: on ? 700 : 600,
                border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, color: on ? T.ind : T.t3 }}>
              {s.l} <span style={{ fontWeight: 700, color: on ? T.ind : T.t4 }}>{counts[s.k] || 0}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
        <PickSelect value={fCity} onChange={(e) => { setFCity(e.target.value); setFProj(""); setFMach(""); }} style={sel(fCity)}>
          <option value="">{t("machinery.sab_city")}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </PickSelect>
        <PickSelect value={fProj} onChange={(e) => setFProj(e.target.value)} style={{ ...sel(fProj), maxWidth: 220 }}>
          <option value="">{t("machinery.mr_all_projects")}</option>
          {projOpts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </PickSelect>
        <PickSelect value={fMach} onChange={(e) => setFMach(e.target.value)} style={{ ...sel(fMach), maxWidth: 240 }}>
          <option value="">{t("machinery.mr_all_machines")}</option>
          {machOpts.map((m) => <option key={m.id} value={m.id}>{m.name}{m.registration_no ? " · " + m.registration_no : ""}</option>)}
        </PickSelect>
        <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.mr_request_date")}</span>
        <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={sel(fFrom)} />
        <span style={{ fontSize: 11.5, color: T.t4 }}>–</span>
        <input type="date" value={fTo} min={fFrom || undefined} onChange={(e) => setFTo(e.target.value)} style={sel(fTo)} />
        {anyFilter && (
          <button type="button" onClick={clearAll}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: T.ind }}>
            {t("common.clear")}
          </button>
        )}
      </div>

      <Row head cols={MR_COLS}>
        <span>{t("machinery.mr_col_when")}</span><span>{t("machinery.mr_col_project")}</span><span>{t("machinery.mr_col_need")}</span>
        <span>{t("machinery.mr_col_machine")}</span><span>{t("machinery.mr_col_work")}</span><span>{t("machinery.mr_col_priority")}</span><span>{t("machinery.mr_col_status")}</span>
      </Row>
      {data.loading && data.rows.length === 0 && <Empty>{t("common.loading")}</Empty>}
      {!data.loading && data.failed && <Empty>{t("machinery.mr_load_fail")}</Empty>}
      {!data.loading && !data.failed && shown.length === 0 && (
        <Empty>{data.rows.length === 0 && !anyFilter ? t("machinery.mr_empty_all") : t("machinery.mr_empty_filter")}</Empty>
      )}
      {shown.map((r) => {
        const st = mrStatus(r.status);
        const pr = mrPrio(r.priority);
        const pending = st.k === "pending";
        const open = act && act.id === r.id;
        const reqCity = projects.find((p) => p.id === r.project_id);
        const cityId = r.project_city_id || (reqCity && reqCity.city_id);
        const fleetSorted = open && act.kind === "fulfill"
          ? [...fleet].sort((a, b) => ((String(b.city_id) === String(cityId)) - (String(a.city_id) === String(cityId))) || String(a.name).localeCompare(String(b.name)))
          : [];
        return (
          <div key={r.id} style={{ borderBottom: `1px solid ${T.b1}`, background: pending && pr.k === "urgent" ? T.redL + "55" : "transparent" }}>
            <div style={{ display: "grid", gridTemplateColumns: MR_COLS, gap: 8, alignItems: "start", padding: "11px 14px", fontSize: 12.5, color: T.t2 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{fmtDT(r.created_at)}</div>
                <div style={{ fontSize: 11, color: T.t3 }}>{r.requested_by_name || "—"}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.project_name || "—"}</div>
                <div style={{ fontSize: 11, color: r.city_name ? T.t3 : T.t4 }}>{r.city_name || t("machinery.city_nahi")}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{r.equipment_type}{r.capacity ? " · " + r.capacity : ""}</div>
                {dayBit(r) && <div style={{ fontSize: 11, color: T.t3 }}>{dayBit(r)}</div>}
              </div>
              <div style={{ minWidth: 0 }}>
                {r.preferred_equipment_name ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{r.preferred_equipment_name}</span>
                    <MrReg v={r.preferred_registration_no} />
                  </div>
                ) : <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.mr_koi_bhi")}</span>}
                {st.k === "fulfilled" && r.fulfilled_equipment_name && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: T.grn }}>{t("machinery.mr_sent", { name: r.fulfilled_equipment_name })}</span>
                    <MrReg v={r.fulfilled_registration_no} />
                  </div>
                )}
                {st.k === "fulfilled" && r.fulfilled_equipment_name && (
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: r.received_at ? T.grn : T.amb, marginTop: 2 }}>
                    {r.received_at ? t("machinery.mr_site_par_mili", { date: fmtD(r.received_at) }) : t("machinery.mr_raaste_me")}
                  </div>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                {r.task_name && <div style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{t("machinery.mr_task", { name: r.task_name })}</div>}
                {r.reason && <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.45, marginTop: r.task_name ? 2 : 0 }}>{r.reason}</div>}
                {!r.task_name && !r.reason && <span style={{ fontSize: 11.5, color: T.t4 }}>—</span>}
              </div>
              <span><Pill label={pr.l} c={pr.c} bg={pr.bg} /></span>
              <div>
                <Pill label={st.l} c={st.c} bg={st.bg} />
                {!pending && (r.decided_by_name || r.decided_at) && (
                  <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>
                    {[r.decided_by_name, r.decided_at ? fmtD(r.decided_at) : null].filter(Boolean).join(" · ")}
                  </div>
                )}
                {!pending && r.admin_note && <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2, lineHeight: 1.4 }}>{r.admin_note}</div>}
                {/* A se maangi gayi — site A ka jawab (7 Oct 2026) */}
                {r.status === "holder" && (
                  <div style={{ marginTop: 6, padding: "6px 9px", borderRadius: 7, background: T.ambL, border: `1px solid ${T.amb}33` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.amb }}>
                      {r.holder_status === "busy" ? t("machinery.mr_holder_busy", { project: r.holder_project_name || "—" })
                        : r.holder_status === "offered" ? t("machinery.mr_holder_offered", { project: r.holder_project_name || "—" })
                        : t("machinery.mr_holder_asked", { project: r.holder_project_name || "—" })}
                    </div>
                    {r.holder_status === "busy" && r.holder_note && (
                      <div style={{ fontSize: 10.5, color: T.t2, marginTop: 2 }}>
                        {r.holder_note}{r.holder_free_by ? " · " + t("machinery.mr_free_by", { date: fmtD(r.holder_free_by) }) : ""}{r.holder_by_name ? " · " + r.holder_by_name : ""}
                      </div>
                    )}
                    {(r.holder_status === "busy" || r.holder_status === "offered") && (
                      <button type="button" onClick={() => confirmHolder(r)}
                        style={{ marginTop: 6, padding: "5px 12px", borderRadius: 7, border: "none", background: T.grn, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        {r.holder_status === "offered" ? t("machinery.mr_haan_bhejo") : t("machinery.mr_phir_bhi_bhejo")}
                      </button>
                    )}
                  </div>
                )}
                {pending && canDecide && !open && (
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <Btn size="sm" c={T.grn} onClick={() => openFulfill(r)}>{t("machinery.mr_fulfill")}</Btn>
                    <Btn size="sm" ghost onClick={() => openReject(r)}>{t("machinery.mr_reject")}</Btn>
                  </div>
                )}
              </div>
            </div>

            {open && (
              <div style={{ margin: "0 14px 12px", padding: "11px 12px", borderRadius: 9, border: `1.5px solid ${act.kind === "fulfill" ? T.grn : T.red}55`, background: T.surfaceB }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t1, marginBottom: 8 }}>
                  {act.kind === "fulfill" ? t("machinery.mr_fulfill_q") : t("machinery.mr_reject_q")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: act.kind === "fulfill" ? "1.3fr 1fr auto" : "1fr auto", gap: 8, alignItems: "center" }}>
                  {act.kind === "fulfill" && (
                    <PickSelect value={act.eq} onChange={(e) => setAct((a) => ({ ...a, eq: e.target.value }))} style={inp}>
                      <option value="">{t("machinery.mr_machine_none")}</option>
                      {fleetSorted.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name}{m.registration_no ? " · " + m.registration_no : ""}{m.city_name ? " — " + m.city_name : ""}
                        </option>
                      ))}
                    </PickSelect>
                  )}
                  <input value={act.note} onChange={(e) => setAct((a) => ({ ...a, note: e.target.value, err: "" }))}
                    placeholder={act.kind === "fulfill" ? t("machinery.mr_note_ph") : t("machinery.mr_reject_ph")} style={inp} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" ghost onClick={() => setAct(null)} disabled={act.busy}>{t("common.cancel")}</Btn>
                    <Btn size="sm" c={act.kind === "fulfill" ? T.grn : T.red} onClick={decide} disabled={act.busy}>
                      {act.busy ? t("common.saving") : act.kind === "fulfill" ? t("machinery.mr_fulfill_do") : t("machinery.mr_reject_do")}
                    </Btn>
                  </div>
                </div>
                {act.err && <ErrBox>{act.err}</ErrBox>}
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

function MachineryModule() {
  const [tab, setTab] = useState("fleet");
  // Machine Requests tab ka badge — kitni request abhi faisle ka intezaar kar rahi
  const [reqPending, setReqPending] = useState(0);
  const loadReqCount = useCallback(async () => {
    const r = await api.get("/equipment/request?status=pending").catch(() => null);
    if (r && r.success) setReqPending(Array.isArray(r.data) ? r.data.length : 0);
  }, []);
  useEffect(() => { loadReqCount(); }, [loadReqCount]);
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
  // City: filter ki list + fleet ki chhanni (naam / gadi no.)
  const [cities, setCities] = useState([]);
  const [fCity, setFCity] = useState("");
  const [fQ, setFQ] = useState("");

  // Reports ka apna date range — Fleet/Reminders par date ka koi matlab nahi,
  // aur report kholte hi poora itihaas maangna bhaari padta hai.
  const repMonthStart = new Date(); repMonthStart.setDate(1);
  const [repFrom, setRepFrom] = useState(repMonthStart.toLocaleDateString("en-CA"));
  const [repTo, setRepTo] = useState(new Date().toLocaleDateString("en-CA"));

  // Trip vehicles tab — apna date range (mahine ki shuruaat se aaj tak).
  // state: loading → ok | missing | error. "missing" = purana server (404) ya
  // ijazat nahi (403) — tab tab dikhta hi nahi, baaki screen pehle jaisi.
  const [tvFrom, setTvFrom] = useState(repMonthStart.toLocaleDateString("en-CA"));
  const [tvTo, setTvTo] = useState(new Date().toLocaleDateString("en-CA"));
  const [tv, setTv] = useState({ state: "loading", rows: [] });
  // Trip vehicles ki khoj — yahan isliye ki Ctrl+K (App.js) number bhar kar
  // seedha is tab par la sake.
  const [tvQ, setTvQ] = useState("");
  // Trips & Billing ka sub-tab (7 Oct 2026): ratebaaki | vendor | billing | bills | ratecard | report.
  // Yahan isliye ki Ctrl+K hamesha Vendor / Gaadi par laaye.
  const [tvView, setTvView] = useState("vendor");
  const loadTv = useCallback(async () => {
    const r = await api.get(`/trips/vehicles-summary?from=${tvFrom}&to=${tvTo}`).catch(() => null);
    setTv((p) => {
      if (r && r.success) return { state: "ok", rows: Array.isArray(r.data) ? r.data : [] };
      return p.state === "ok" || p.state === "error" ? { state: "error", rows: [] } : { state: "missing", rows: [] };
    });
  }, [tvFrom, tvTo]);
  useEffect(() => { loadTv(); }, [loadTv]);

  // silent = background refresh. Spinner sirf pehli baar; warna machine detail
  // khuli ho to wo unmount ho kar apna tab bhool jaata hai.
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const [f, d, g, p, ec, pr, te, ct] = await Promise.all([
      api.get("/machinery/fleet").catch(() => null),
      api.get("/machinery/due").catch(() => null),
      api.get("/machinery/reports/gaps").catch(() => null),
      api.get("/finance/parties").catch(() => null),
      api.get("/machinery/reports/cost").catch(() => null),
      // Sirf Reports ke project filter ke liye — baaki tab ko iski zaroorat nahi.
      api.get("/projects").catch(() => null),
      api.get("/telematics/overview").catch(() => null),
      api.get("/library/cities").catch(() => null),
    ]);
    // Preventive vs breakdown ab cost ke jawab me hi aata hai (MCH-24) — pehle alag
    // /reports/health call wahi hisaab dobara ginta tha. Purana backend ho (health
    // nahi bheja) tabhi alag call.
    const he = ec?.success && ec.data && ec.data.health
      ? { success: true, data: ec.data.health }
      : await api.get("/machinery/reports/health").catch(() => null);
    setFleet(f?.success ? f.data || [] : []);
    setDue(d?.success ? d.data || [] : []);
    setGaps(g?.success ? g.data || { gaps: [], counts: {} } : { gaps: [], counts: {} });
    setParties(p?.success ? p.data || [] : []);
    setEcon(ec?.success ? ec.data : null);
    setHealth(he?.success ? he.data : null);
    setProjects(pr?.success ? pr.data || [] : []);
    setTele(te?.success ? te.data : null);
    setCities(ct?.success ? ct.data || [] : []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Ctrl+K se gaadi chuni (4 Oct 2026): shell (App.js) sessionStorage me
  // { kind, id, q } likh kar Machinery kholta hai aur event bhejta hai —
  // module pehle se khula ho to bhi pakad le. Fleet machine → uski detail;
  // trip gaadi → Trip vehicles tab, khoj me number bhara.
  useEffect(() => {
    const take = () => {
      let h = null;
      try { h = JSON.parse(sessionStorage.getItem(MACH_OPEN_KEY) || "null"); sessionStorage.removeItem(MACH_OPEN_KEY); } catch (_) { h = null; }
      // Purana (15 s se zyada) hand-off nahi — kabhi navigation ruk gaya ho to
      // baad me Machinery kholne par achanak koi aur machine na khule.
      if (!h || !h.id || !(Date.now() - Number(h.at || 0) < 15000)) return;
      if (h.kind === "trip") { setOpenId(null); setTvQ(String(h.q || "")); setTvView("vendor"); setTab("tripv"); }
      else { setTab("fleet"); setOpenId(Number(h.id)); }
    };
    take();
    window.addEventListener(MACH_OPEN_EVENT, take);
    return () => window.removeEventListener(MACH_OPEN_EVENT, take);
  }, []);

  const snooze = async (row) => {
    const till = new Date(); till.setDate(till.getDate() + 7);
    const r = await api.post("/machinery/due/snooze", {
      ref_type: row.ref_type, ref_id: row.ref_id, till: till.toLocaleDateString("en-CA"),
    });
    if (r && r.success === false) { window.alert(r.message || "Snooze failed"); return; }
    load(true);
  };

  const owned = fleet.filter((m) => m.owned);
  // Fleet ki chhanni: city + naam/gadi no. Number ki khoj me space/dash/dot
  // ka farak nahi padta — site par log "CG04AB1234" bhi likhte hain aur
  // "CG 04 AB 1234" bhi.
  const fleetShown = useMemo(() => {
    const q = fQ.trim().toLowerCase();
    const qReg = normReg(fQ);
    return fleet.filter((m) => {
      if (fCity && String(m.city_id || "") !== String(fCity)) return false;
      if (!q) return true;
      if (String(m.name || "").toLowerCase().includes(q)) return true;
      if (String(m.code || "").toLowerCase().includes(q)) return true;
      if (capOf(m).toLowerCase().includes(q)) return true;    // "500 cft" se bhi (4 Oct 2026)
      return !!qReg && normReg(m.registration_no).includes(qReg);
    });
  }, [fleet, fCity, fQ]);
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
    // Vendor / kiraye ki trip gaadiyan — server naya ho tabhi.
    ...(tv.state === "ok" || tv.state === "error" ? [{ id: "tripv", l: t("machinery.tv_tab"), I: IcRoute }] : []),
    // Site se aayi machine ki maang (mobile + project Equipment tab)
    { id: "requests", l: t("machinery.mr_tab"), I: IcInbox, badge: reqPending || null },
    { id: "due", l: t("machinery.reminders"), I: IcBell, badge: active.length || null },
    // Badge = kitni vendor units abhi kisi machine se judi nahi — wahi is
    // tab ka asli kaam hai. Account hi na ho to badge ka koi matlab nahi.
    { id: "gps", l: "GPS", I: IcSignal, badge: (tele && tele.account && tele.pending.length) || null },
    { id: "insights", l: t("machinery.insights"), I: IcSpark },
    { id: "reports", l: t("common.reports"), I: IcChart },
    // Company ki machine wali setting (site rate, Start/Stop) — Settings ka Edit
    ...(canAny("Settings", "edit", { strict: true }) ? [{ id: "msettings", l: t("machinery.ms_tab"), I: IcSliders }] : []),
  ];
  // Chuna hua tab list se gayab ho jaaye (trip vehicles ka server jawab na de)
  // to khaali screen nahi — Fleet.
  const curTab = TABS.some((x) => x.id === tab) ? tab : "fleet";

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
          <MachineDetail id={openId} onBack={() => setOpenId(null)} onChanged={() => load(true)} parties={parties} cities={cities}
            onEdit={(m) => { setEditMachine(m); setFormOpen(true); }}
            // Hatane ka endpoint naye server ke saath aata hai — trip vehicles ka
            // jawab aaya matlab server naya hai; purane par button hi nahi.
            canRemove={tv.state === "ok" || tv.state === "error"}
            onRemoved={() => { setOpenId(null); load(true); }} />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 14 }}>
              {TILES.map((s, i) => <StatCard key={i} label={s.l} value={s.v} sub={s.sub} color={s.c} icon={s.I} />)}
            </div>

            <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 16 }}>
              {TABS.map((x) => (
                <button key={x.id} type="button" onClick={() => setTab(x.id)}
                  style={{ padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", marginBottom: "-1.5px", display: "flex", alignItems: "center", gap: 6, color: curTab === x.id ? T.ind : T.t3, borderBottom: `2px solid ${curTab === x.id ? T.ind : "transparent"}` }}>
                  <x.I size={13} color="currentColor" />{x.l}
                  {x.badge > 0 && <span style={{ fontSize: 10, background: T.redL, color: T.red, borderRadius: 8, padding: "1px 6px", fontWeight: 700 }}>{x.badge}</span>}
                </button>
              ))}
            </div>

            {curTab === "tripv" && (
              <TripVehiclesTab tv={tv} from={tvFrom} to={tvTo} parties={parties} projects={projects} onReload={loadTv} q={tvQ} onQ={setTvQ} cities={cities} setCities={setCities}
                view={tvView} onView={setTvView}
                onRange={(f, t2) => { setTvFrom(f); setTvTo(t2); }} />
            )}

            {curTab === "requests" && (
              <MachineRequestsTab fleet={fleet} projects={projects} cities={cities} onChanged={loadReqCount} />
            )}
            {curTab === "msettings" && <MachinerySettingsTab />}

            {curTab === "reports" && (
              <ReportsTab fleet={fleet} projects={projects} from={repFrom} to={repTo}
                onRange={(f, t2) => { setRepFrom(f); setRepTo(t2); }} />
            )}

            {curTab === "gps" && (
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

            {curTab === "fleet" && (
              <Panel title={t("machinery.fleet")} action={canMach("create") ? (
                <div style={{ display: "flex", gap: 7 }}>
                  <Btn size="sm" ghost onClick={() => setImportOpen(true)}>{t("machinery.excel_import")}</Btn>
                  <Btn size="sm" icon={IcAdd} onClick={() => { setEditMachine(null); setFormOpen(true); }}>{t("fuel.machine")}</Btn>
                </div>) : null}>
                {fleet.length === 0 && (
                  <Empty>
                   {t("machinery.koi_machine_register_nahi")}<br />
                    <span style={{ fontSize: 11.5 }}>{t("machinery.upar_machine_se_add_karein_gadi")}</span>
                  </Empty>
                )}
                {fleet.length > 0 && (
                  <>
                    {/* City + naam/gadi no. ki chhanni — poori list rozana dekhne
                        layak nahi rehti jab har city ki machine ek saath ho. */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
                      <PickSelect value={fCity} onChange={(e) => setFCity(e.target.value)}
                        style={{ padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${fCity ? T.ind : T.b1}`, fontSize: 12, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none" }}>
                        <option value="">{t("machinery.sab_city")}</option>
                        {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </PickSelect>
                      <input value={fQ} onChange={(e) => setFQ(e.target.value)} placeholder={t("machinery.naam_ya_gadi_no_se_khojo")}
                        style={{ flex: 1, minWidth: 190, padding: "7px 11px", borderRadius: 7, border: `1.5px solid ${fQ ? T.ind : T.b1}`, fontSize: 12, fontFamily: "inherit", color: T.t1, background: T.surface, outline: "none" }} />
                      <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.n_machine", { n: fleetShown.length })}</span>
                      {(fCity || fQ) && (
                        <button type="button" onClick={() => { setFCity(""); setFQ(""); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: T.ind }}>
                          {t("common.clear")}
                        </button>
                      )}
                    </div>
                    <Row head cols="1.6fr 100px 140px 88px 0.9fr 1fr 106px 96px">
                      <span>{t("fuel.machine")}</span><span>{t("machinery.city")}</span><span>{t("machinery.where_now")}</span><span>{t("common.ownership")}</span><span>{t("machinery.current_meter")}</span><span>{t("common.documents")}</span><span>{t("machinery.health")}</span><span>{t("machinery.detail_poora")}</span>
                    </Row>
                    {fleetShown.length === 0 && (
                      <Empty>{t("machinery.is_chhanni_me_koi_machine_nahi")}</Empty>
                    )}
                    {fleetShown.map((m) => {
                      const tone = m.doc_status ? expiryTone(m.doc_status.days) : null;
                      const bad = m.doc_status && m.doc_status.days < 0;
                      const soon = m.doc_status && m.doc_status.days >= 0 && m.doc_status.days <= 30;
                      return (
                        <Row key={m.id} cols="1.6fr 100px 140px 88px 0.9fr 1fr 106px 96px" onClick={() => setOpenId(m.id)}>
                          <div>
                            {/* Gadi number naam ke saath hi, alag rang me — fuel ki
                                parchi number se milti hai, naam se nahi. */}
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                              <span>{m.name}{m.code ? ` — ${m.code}` : ""}</span>
                              {m.registration_no
                                ? <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, color: T.ind, background: T.indL, border: `1px solid ${T.ind}22`, borderRadius: 5, padding: "1px 6px", fontVariantNumeric: "tabular-nums" }}>{m.registration_no}</span>
                                : <span style={{ fontSize: 10, fontWeight: 700, color: T.amb, background: T.ambL, borderRadius: 5, padding: "1px 6px" }}>{t("machinery.gadi_no_nahi")}</span>}
                            </div>
                            <div style={{ fontSize: 10.5, color: T.t4 }}>
                              {m.owned ? t("machinery.owned") : (m.default_vendor_name || t("machinery.rented"))}
                              {capOf(m) ? " · " + capOf(m) : ""}
                            </div>
                          </div>
                          <span style={{ fontSize: 11.5, color: m.city_name ? T.t2 : T.amb }}>
                            {m.city_name || t("machinery.city_nahi")}
                          </span>
                          {/* Abhi kahan hai (6 Oct 2026) — site ke Receive se project par,
                              Fulfill ke baad receive tak raaste me, warna free */}
                          <span style={{ minWidth: 0 }}>
                            {m.location && m.location.state === "site" ? (
                              <span title={m.location.project_name || ""} style={{ fontSize: 11.5, fontWeight: 600, color: T.grn, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.location.project_name || "—"}</span>
                            ) : m.location && m.location.state === "transit" ? (
                              <span title={m.location.project_name || ""} style={{ fontSize: 11, fontWeight: 700, color: T.amb, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("machinery.where_transit", { name: m.location.project_name || "—" })}</span>
                            ) : (
                              <span style={{ fontSize: 11.5, color: T.t4 }}>{t("machinery.where_free")}</span>
                            )}
                          </span>
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

            {curTab === "due" && (
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
                              {canMachEntry() && <Btn size="sm" ghost onClick={() => snooze(d)}>{t("machinery.snooze_7d")}</Btn>}
                            </span>
                          </Row>
                        );
                      })}
                    </>
                  )}
                </Panel>
              </>
            )}

            {curTab === "insights" && (
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

      <MachineForm open={formOpen} machine={editMachine} parties={parties} seed={formSeed} cities={cities} setCities={setCities}
        onClose={() => { setFormOpen(false); setEditMachine(null); setFormSeed(null); }}
        onSaved={() => load(true)} />
    </div>
  );
}

export default MachineryModule;
