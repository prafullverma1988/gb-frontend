// ══════════════════════════════════════════════════════════════════════
// FUEL MODULE — diesel purchase, barrel stock, machine consumption
//
// Self-contained by design (no shared components with Warehouse/Equipment):
// its own theme, icons and helpers, same as WarehouseModule. Backed by
// /api/fuel — see gb-backend/routes/fuel.js and kb/20-fuel.md.
//
// Three refuelling paths, and the entry form is built around them because
// that is how a supervisor actually thinks about it:
//   A  pump → machine      purchase (destination='equipment')
//   B  pump → barrel       purchase (destination='store')
//   C  barrel → machine    issue    (no money moves)
//
// Cross-check tab is deliberately absent — that is E3.
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";
import PickSelect from "../components/PickSelect";
import api, { API_BASE, getToken } from "../config/api";
import { t, Rich } from "../i18n";
import { BackClose } from "../utils/backNav";
import { can, canAny, canEntry } from "../utils/perms";
import { cld } from "../utils/cloudinary";
import { loadPhotoPolicy, policyFor, fileInputProps } from "../utils/photoPolicy";

// ── ICONS ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcGauge = (p) => <Ic {...p} d="M12 20a8 8 0 100-16 8 8 0 000 16zM12 12l3.5-3.5M12 20v2M4 12H2M22 12h-2" />;
const IcDrop  = (p) => <Ic {...p} d="M12 2.7s6 6.3 6 10.3a6 6 0 01-12 0c0-4 6-10.3 6-10.3z" />;
const IcDrum  = (p) => <Ic {...p} d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3v10c0 1.7-3.1 3-7 3s-7-1.3-7-3V7zM5 7c0 1.7 3.1 3 7 3s7-1.3 7-3M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />;
const IcTruck = (p) => <Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a2 2 0 100-4 2 2 0 000 4zM18.5 19a2 2 0 100-4 2 2 0 000 4z" />;
const IcChart = (p) => <Ic {...p} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />;
const IcAdd   = (p) => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX     = (p) => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcAlert = (p) => <Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />;
const IcRuler = (p) => <Ic {...p} d="M2 12h20M6 9v6M10 9v6M14 9v6M18 9v6" />;
const IcTrash = (p) => <Ic {...p} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />;
const IcCamera = (p) => <Ic {...p} d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z" />;
const IcSheet = (p) => <Ic {...p} d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />;
const IcFile  = (p) => <Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" />;
const IcWa    = (p) => <Ic {...p} d="M21 11.5a8.4 8.4 0 01-12.5 7.3L3 20.5l1.8-5.3A8.4 8.4 0 1121 11.5z" />;

// ── THEME ─────────────────────────────────────────────────────────
// Indigo accent, hairlines and whitespace. Colour is a status signal only.
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB", sb: "#0D1B2A",
  ind: "#4B45C4", indL: "#EEF2FF", indM: "#C7D2FE",
  blu: "#2563EB", bluL: "#EFF6FF",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  slt: "#64748B", sltL: "#F1F5F9",
};

const fmtN  = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const fmtL  = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 1 }) + " L");
// Indian short-scale — a fuel bill runs to lakhs quickly on a big site.
const fmtC  = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (Math.abs(v) >= 100000)   return `₹${(v / 100000).toFixed(2)}L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};
const todayStr = () => new Date().toLocaleDateString("en-CA");
const nowLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
// <input type="datetime-local"> gives "YYYY-MM-DDTHH:mm"; MySQL wants a space.
const toSqlDateTime = (v) => (v ? String(v).replace("T", " ") + ":00" : null);
const fmtDT = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) + " " +
         dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};
// Server samay UTC me deta hai (9 Oct 2026 se fuel / sensor bhi) — dikhao
// phone/browser ki apni ghadi me. Kachcha string kaatne se UTC dikhta tha.
const localYmd = (v) => { const d = new Date(v); return v && !isNaN(d) ? d.toLocaleDateString("en-CA") : String(v || "").slice(0, 10); };

// Same Cloudinary preset/folder the rest of the app uses. Kept local rather
// than imported — this module owns its own dependencies (see WarehouseModule).
const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", "gb_buildcon_drawings");
  fd.append("folder", "gb_buildcon/fuel");
  const xhr = new XMLHttpRequest();
  xhr.onload = () => {
    try {
      const d = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && d.secure_url) resolve(d.secure_url);
      else reject(new Error(d.error?.message || "Upload failed"));
    } catch (e) { reject(new Error("Parse error")); }
  };
  xhr.onerror = () => reject(new Error("Network error"));
  xhr.open("POST", "https://api.cloudinary.com/v1_1/dd632nqfm/image/upload");
  xhr.send(fd);
});

// A party may hold several roles; `roles` is the canonical comma list and
// `type` only the primary one. Fuel accepts either role so the pumps already
// on file keep working before anyone re-tags them.
const FUEL_VENDOR_ROLES = ["fuel_vendor", "material_vendor", "fuel", "equipment", "vendor", "supplier"];
// Subcon bhi party hai — uspar "Subcontractor" role laga hota hai.
const isSubconParty = (p) => {
  const bag = (String(p.roles || "") + "," + String(p.type || ""))
    .toLowerCase().split(",").map((x) => x.trim());
  return bag.includes("subcontractor");
};
const isFuelVendor = (p) => {
  const bag = (String(p.roles || "") + "," + String(p.type || ""))
    .toLowerCase().split(",").map((s) => s.trim());
  return FUEL_VENDOR_ROLES.some((r) => bag.includes(r));
};

// ── REPORT EXPORT ─────────────────────────────────────────────────
// Teeno button (Excel / PDF / WhatsApp) WAHI filter bhejte hain jo screen par
// lage hain. Isliye download hamesha utna hi hota hai jitna user dekh raha
// tha — "poori list samajh kar bhej di" wali galti yahan ho hi nahi sakti.
//
// Excel client par banti hai (xlsx pehle se hai), par PDF hamesha SERVER par:
// WhatsApp bhejne ke liye ek asli file chahiye, aur mobile+web ko alag-alag
// banate to dono kabhi ek jaise na dikhte.
//
// Ye helpers is module ke apne hain (Machinery ke apne alag) — module
// independence ka wahi niyam jo baaki module follow karte hain.
const qs = (params) => Object.entries(params || {})
  .filter(([, v]) => v !== "" && v != null)
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

// Filter ka naam file ke naam me — Downloads folder me teen "report.pdf"
// padi hon to koi nahi bata sakta kaunsi kis cheez ki hai.
const slug = (s) => String(s || "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 28);

async function fetchReportPdf(path, params) {
  const res = await fetch(`${API_BASE}${path}?${qs(params)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    let msg = `PDF nahi bana (${res.status})`;
    try { const j = await res.json(); if (j?.message) msg = j.message; } catch (e) { /* HTML/binary error */ }
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
  // xlsx sirf export par chahiye — dynamic import se module chunk halka rehta hai
  // (MasterLibrary/Machinery wala hi pattern).
  try {
    const XLSX = await import("xlsx");
    const aoa = [columns.map((c) => c.label),
      ...rows.map((r) => columns.map((c) => (c.excel ? c.excel(r) : r[c.key] ?? "")))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = columns.map((c) => ({ wch: c.w || 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet);
    XLSX.writeFile(wb, filename.replace(/\.pdf$/, "") + ".xlsx");
  } catch (err) {
    console.warn("Excel export failed:", err?.message);
  }
};

// WhatsApp par PDF: jahan browser file share kar sakta hai (mobile) wahan wahi
// file jaati hai. Desktop Chrome file share nahi karta — wahan PDF download
// karke WhatsApp khol dete hain, taaki user use khud attach kar le. Chup-chaap
// sirf link bhej dena galat hota: link kholne ke liye login chahiye.
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

// ── SHARED BITS ───────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <div style={{ padding: "13px 15px", background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 9, borderTop: `3px solid ${color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", display: "flex", alignItems: "flex-start", gap: 12 }}>
    <div style={{ width: 36, height: 36, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={16} color={color} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.t1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{sub}</div>}
    </div>
  </div>
);

const Btn = ({ children, onClick, c = T.ind, disabled, icon: Icon, size = "md", ghost, style = {} }) => (
  <button onClick={onClick} disabled={disabled} type="button"
    style={{
      padding: size === "sm" ? "6px 12px" : "9px 15px",
      borderRadius: 7,
      border: ghost ? `1px solid ${T.b1}` : "none",
      background: disabled ? T.b1 : ghost ? T.surface : c,
      color: disabled ? T.t4 : ghost ? T.t2 : "white",
      fontSize: size === "sm" ? 11.5 : 12.5, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", ...style,
    }}>
    {Icon && <Icon size={13} color="currentColor" />}{children}
  </button>
);

const Pill = ({ label, c, bg }) => (
  <span style={{ display: "inline-block", background: bg, color: c, fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1px solid ${c}33`, whiteSpace: "nowrap" }}>{label}</span>
);

const Panel = ({ title, action, children, style }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 9, overflow: "hidden", ...style }}>
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
      padding: head ? "7px 15px" : "10px 15px",
      borderBottom: `1px solid ${T.b1}`,
      background: head ? T.surfaceB : "transparent",
      fontSize: head ? 10 : 12,
      fontWeight: head ? 700 : 400,
      color: head ? T.t3 : T.t2,
      textTransform: head ? "uppercase" : "none",
      letterSpacing: head ? ".4px" : "normal",
      cursor: onClick ? "pointer" : "default",
    }}>{children}</div>
);

const Empty = ({ children }) => (
  <div style={{ textAlign: "center", padding: "34px 20px", color: T.t4, fontSize: 12.5 }}>{children}</div>
);

const Field = ({ label, children, hint, span }) => (
  <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
    <div style={{ fontSize: 10, color: T.t4, marginBottom: 4, fontWeight: 600 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 10, color: T.t4, marginTop: 4 }}>{hint}</div>}
  </div>
);

const inp = {
  width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
  fontSize: 12.5, outline: "none", fontFamily: "inherit", color: T.t1,
  background: T.surface, boxSizing: "border-box",
};

const Modal = ({ open, onClose, title, sub, width = 700, children, footer }) => {
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

// ══════════════════════════════════════════════════════════════════
// REFUELLING ENTRY — one form, three paths
// ══════════════════════════════════════════════════════════════════
const PATHS = [
  { id: "pump_machine", get l() { return t("fuel.pump_machine"); }, get sub() { return t("fuel.tanker_pump_se_seedha_machine_me"); }, I: IcTruck },
  { id: "pump_store",   get l() { return t("fuel.pump_barrel"); },  get sub() { return t("fuel.bulk_diesel_drum_me_bhara"); },        I: IcDrum },
  { id: "store_machine",get l() { return t("fuel.barrel_machine"); }, get sub() { return t("fuel.drum_se_machine_me_paisa_nahi"); }, I: IcDrop },
];

// ── Drum kahan pada hai ──────────────────────────────────────────
// List, dropdown aur ledger me ek hi tarah likha jaaye. Project delete ho chuka
// ho ya warehouse set na ho to wahi saaf dikhe — wahi drum shift karne layak hain.
// Jagah sirf pata hai: diesel ka cost tab lagta hai jab wo drum se machine me
// jaata hai, drum kahin bhi pada ho.
const placeOf = (s) => (!s ? "" : s.project_id
  ? (s.project_name || t("fuel.project_delete_ho_chuka"))
  : (s.warehouse_name || t("fuel.warehouse_set_nahi")));
const placeKey = (s) => (s.project_id ? "p" + s.project_id : "w" + (s.warehouse_id || 0));
const placeUnclear = (s) => !!s && (s.place_kind === "project_missing" || (!s.project_id && !s.warehouse_id));
// ══════════════════════════════════════════════════════════════════
// EK ENTRY KA POORA BYORA — side drawer
// ------------------------------------------------------------------
// Fuel ki koi bhi row — Overview, Refueling, Unbilled, Subcon, Diesel/Pump/
// Barrel register, drum ka ledger — click karne par ye khulta hai: kahan se
// kahan, paisa kahan tak pahuncha (unbilled / bill / cash / kharcha /
// katauti), meter, parchi ka milaan, kisne darj ki, aur SAARI photo badi
// karke (Prafull, 30 Sep 2026: "jab bhi user ko verify karna ho").
//
// Byora ek hi jagah se aata hai (GET /fuel/entries/:kind/:id) — har list apne
// kaam ke thode khaane laati hai, drawer unpe nirbhar nahi.
// ══════════════════════════════════════════════════════════════════
const OpenEntryCtx = createContext(null);
const rsx = (v) => "₹" + (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDay = (v) => {
  if (!v) return "—";
  const dt = new Date(v);
  return isNaN(dt) ? String(v).slice(0, 10) : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const useOpenEntry = () => useContext(OpenEntryCtx) || (() => {});

const ROUTE_LABEL = {
  pump_machine: () => t("fuel.pump_machine"),
  pump_store: () => t("fuel.pump_barrel"),
  pump_subcon: () => t("fuel.pump_subcon"),
  store_machine: () => t("fuel.barrel_machine"),
  store_subcon: () => t("fuel.barrel_subcon"),
};
const PAYABLE_PILL = {
  unbilled: () => ({ l: t("fuel.payable_unbilled"), c: T.amb, bg: T.ambL }),
  unpaid: () => ({ l: t("fuel.payable_unpaid"), c: T.amb, bg: T.ambL }),
  partial: () => ({ l: t("fuel.payable_partial"), c: T.amb, bg: T.ambL }),
  paid: () => ({ l: t("fuel.payable_paid"), c: T.grn, bg: T.grnL }),
  cash: () => ({ l: t("common.cash"), c: T.grn, bg: T.grnL }),
};

function FuelEntryDrawer({ entry, onClose }) {
  const [data, setData] = useState(null);
  const [fail, setFail] = useState("");
  const [shot, setShot] = useState(null);

  useEffect(() => {
    if (!entry) return undefined;
    let dead = false;
    setData(null); setFail(""); setShot(null);
    api.get(`/fuel/entries/${entry.kind}/${entry.id}`)
      .then((r) => { if (!dead) { if (r?.success) setData(r.data); else setFail(r?.message || t("fuel.d_load_fail")); } })
      .catch((e) => { if (!dead) setFail(e?.message || t("fuel.d_load_fail")); });
    return () => { dead = true; };
  }, [entry]);

  useEffect(() => {
    if (!entry) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { if (shot) setShot(null); else onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entry, shot, onClose]);

  if (!entry) return null;
  const d = data;
  const pill = d && d.payable_status ? (PAYABLE_PILL[d.payable_status] || PAYABLE_PILL.unbilled)() : null;
  const Sec = ({ title, children }) => (
    <div style={{ padding: "12px 18px", borderBottom: `1px solid ${T.b1}` }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 7 }}>{title}</div>
      {children}
    </div>
  );
  const KV = ({ k, v, strong }) => (v == null || v === "") ? null : (
    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, fontSize: 12, padding: "3px 0" }}>
      <span style={{ color: T.t3 }}>{k}</span>
      <span style={{ color: T.t1, fontWeight: strong ? 700 : 500, wordBreak: "break-word" }}>{v}</span>
    </div>
  );
  const fromLabel = d ? (d.route.startsWith("pump") ? t("fuel.d_pump") : t("fuel.d_drum")) : "";
  const fromName = d ? (d.route.startsWith("pump") ? d.vendor_name : d.store_name) : "";
  const toName = d ? (d.route.endsWith("subcon")
    ? [d.subcon_name, d.equipment_text].filter(Boolean).join(" — ")
    : d.route === "pump_store" ? d.store_name
    : [d.equipment_name, d.equipment_code ? `(${d.equipment_code})` : null].filter(Boolean).join(" ")) : "";
  const toLabel = d ? (d.route.endsWith("subcon") ? t("fuel.d_subcon")
    : d.route === "pump_store" ? t("fuel.d_drum") : t("fuel.d_machine")) : "";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10001 }}>
      <BackClose onClose={onClose} />
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} />
      <aside style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 460, maxWidth: "100vw",
        background: T.surface, boxShadow: "-8px 0 30px rgba(0,0,0,0.16)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>{t("fuel.entry_ka_byora")}</span>
              {d && <Pill label={(ROUTE_LABEL[d.route] || ROUTE_LABEL.pump_machine)()} c={T.ind} bg={T.indL} />}
              {d && d.fuel_type === "petrol" && <Pill label={t("fuel.petrol")} c={T.amb} bg={T.ambL} />}
              {pill && <Pill label={pill.l} c={pill.c} bg={pill.bg} />}
            </div>
            {d && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>{fmtDT(d.at)}</div>}
          </div>
          <button onClick={onClose} type="button" title={t("common.close")}
            style={{ background: T.surfaceB, border: "none", borderRadius: 6, padding: 6, cursor: "pointer", display: "flex" }}>
            <IcX size={15} color={T.t3} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {!d && !fail && <Empty>{t("common.loading")}</Empty>}
          {fail && <div style={{ margin: 18, padding: "10px 12px", background: T.redL, color: T.red, borderRadius: 7, fontSize: 12, fontWeight: 600 }}>{fail}</div>}
          {d && (
            <>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}` }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.t1 }}>{rsx(d.amount)}</div>
                <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{fmtL(d.litres)} × ₹{fmtN(d.rate)}</div>
              </div>

              <Sec title={t("fuel.d_kahan_se_kahan")}>
                <KV k={fromLabel} v={fromName || "—"} strong />
                <KV k={toLabel} v={toName || "—"} strong />
                <KV k={t("common.project")} v={d.project_name || t("fuel.company_level_koi_project_nahi")} />
                <KV k={t("fuel.kis_kaam_ke_liye")} v={d.purpose} />
                <KV k={t("fuel.d_sector")} v={d.sector} />
              </Sec>

              <Sec title={t("fuel.d_paisa")}>
                {d.kind === "purchase" && (
                  <>
                    <KV k={t("common.payment")} v={d.payment_mode === "cash"
                      ? (d.cash_source === "company" ? t("fuel.cash_company") : (d.paid_via_staff_name || t("fuel.cash_wallet")))
                      : t("fuel.udhaar")} />
                    {d.bill && (
                      <>
                        <KV k={t("fuel.d_bill")} v={t("fuel.d_bill_line", {
                          id: d.bill.id, no: d.bill.no ? " · " + d.bill.no : "", date: fmtDay(d.bill.date), n: d.bill.entries })} strong />
                        <KV k={t("fuel.d_bill_amount")} v={t("fuel.d_bill_paid_due", {
                          amt: rsx(d.bill.amount), paid: rsx(Math.min(d.bill.settled, d.bill.amount)),
                          due: rsx(Math.max(0, d.bill.amount - d.bill.settled)) })} />
                      </>
                    )}
                    {!d.bill && d.payable_status === "unbilled" && <KV k={t("fuel.d_bill")} v={t("fuel.d_abhi_bill_nahi")} />}
                  </>
                )}
                {d.kind === "issue" && !d.recovery && (
                  <KV k={t("fuel.d_kharcha")} v={d.expense
                    ? t("fuel.d_kharcha_line", { id: d.expense.id, amt: rsx(d.expense.amount),
                        where: d.expense.project_name || t("fuel.company_level_koi_project_nahi") })
                    : t("fuel.d_kharcha_nahi")} />
                )}
                {d.recovery && (
                  <KV k={t("fuel.katauti")} v={t("fuel.d_katauti_line", {
                    id: d.recovery.id, amt: rsx(d.recovery.amount), adj: rsx(d.recovery.adjusted) })} strong />
                )}
              </Sec>

              {(d.route === "pump_machine" || d.route === "store_machine") && (
                <Sec title={t("fuel.d_meter")}>
                  {d.meter_reading != null
                    ? <KV k={t("fuel.d_reading")} v={`${fmtN(d.meter_reading)} ${d.meter_unit === "km" ? "km" : t("fuel.d_ghante")}`} strong />
                    : <KV k={t("fuel.d_reading")} v={t("fuel.d_meter_nahi", { why: d.meter_missing_label || "—" })} />}
                  {d.meter_flag && (
                    <div style={{ marginTop: 6, padding: "7px 10px", background: T.ambL, borderRadius: 6, fontSize: 11.5, color: T.amb, fontWeight: 700 }}>
                      {t("fuel.meter_shak")}{d.meter_note ? " — " + d.meter_note : ""}
                    </div>
                  )}
                </Sec>
              )}

              {d.kind === "purchase" && (d.slip_no || d.slip_read) && (
                <Sec title={t("fuel.parchi_ka_milaan")}>
                  <KV k={t("fuel.d_slip_no")} v={d.slip_no} />
                  {d.slip_read && (
                    <KV k={t("fuel.d_photo_se_padha")} v={[
                      d.slip_read.litres != null ? fmtL(d.slip_read.litres) : null,
                      d.slip_read.rate != null ? "₹" + fmtN(d.slip_read.rate) + "/L" : null,
                      d.slip_read.amount != null ? rsx(d.slip_read.amount) : null,
                    ].filter(Boolean).join(" · ")} />
                  )}
                  {d.slip_flag === "mismatch"
                    ? <div style={{ marginTop: 5, padding: "7px 10px", background: T.ambL, borderRadius: 6, fontSize: 11.5, color: T.amb, fontWeight: 700 }}>
                        {t("fuel.slip_se_alag")}{d.slip_note ? ` — ${d.slip_note}` : ""}
                      </div>
                    : d.slip_read && <div style={{ fontSize: 11, color: T.grn, fontWeight: 600, marginTop: 3 }}>{t("fuel.d_parchi_mil_gayi")}</div>}
                </Sec>
              )}

              <Sec title={t("fuel.kisne_darj_ki")}>
                <KV k={t("fuel.d_naam")} v={d.entered_by_name || "—"} strong />
                <KV k={t("fuel.d_darj_hui")} v={fmtDT(d.created_at)} />
                <KV k={t("common.note")} v={d.note} />
              </Sec>

              <Sec title={t("fuel.d_photos_n", { n: (d.photos || []).length })}>
                {(d.photos || []).length === 0 && !d.photos_pending && (
                  <div style={{ fontSize: 12, color: T.t4 }}>{t("fuel.d_koi_photo_nahi")}</div>
                )}
                {d.photos_pending > 0 && (
                  <div style={{ fontSize: 11.5, color: T.amb, fontWeight: 600, marginBottom: 6 }}>
                    {t("fuel.d_photos_pending", { n: d.photos_pending })}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(d.photos || []).map((u, i) => (
                    <img key={i} src={cld(u, "view")} alt="" onClick={() => { setShot(u); }}
                      style={{ width: "100%", aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 8,
                        border: `1px solid ${T.b1}`, cursor: "zoom-in", background: T.surfaceB }} />
                  ))}
                </div>
              </Sec>
            </>
          )}
        </div>
      </aside>

      {shot && (
        <div onClick={() => setShot(null)}
          style={{ position: "fixed", inset: 0, zIndex: 10002, background: "rgba(0,0,0,.85)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={cld(shot, "view")} alt="" style={{ maxWidth: "94vw", maxHeight: "94vh", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

function RefuelForm({ open, onClose, onSaved, stores, equipment, vendors, projects }) {
  const [path, setPath] = useState("pump_machine");
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [slipBusy, setSlipBusy] = useState(false);
  const [slipMsg, setSlipMsg] = useState(null);
  const [slipRead, setSlipRead] = useState(null);   // AI ne parchi se kya padha

  const upd = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setPath("pump_machine");
    // Office se cash entry aksar company ke paise ki hoti hai — default "company";
    // apne wallet se diya ho to wahi select karo (MCH-13).
    setF({ filled_at: nowLocal(), payment_mode: "credit", cash_source: "company", fuel_type: "diesel" });
    setError("");
  }, [open]);

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try { upd("photo_url", await uploadToCloudinary(file)); }
    catch (ex) { setError("Photo upload fail: " + ex.message); }
    setUploading(false);
  };

  // Only machines whose diesel is actually our cost can be selected. The
  // server enforces this too — this just avoids an error the user can't fix.
  const eligible = equipment.filter((e) => {
    const owned = String(e.ownership || "").toLowerCase() === "owned";
    return owned || String(e.fuel_responsibility || "rent_included") === "company";
  });
  const blocked = equipment.length - eligible.length;

  const litres = parseFloat(f.litres) || 0;
  const rate   = parseFloat(f.rate) || 0;
  const amount = Math.round(litres * rate * 100) / 100;

  const store = stores.find((s) => String(s.id) === String(f.store_id));
  const machine = equipment.find((e) => String(e.id) === String(f.equipment_id));
  const isIssue = path === "store_machine";

  // Barrel do jagah ho sakta hai: kisi warehouse me, ya kisi project par. Pehle
  // jagah select hoti hai, phir usi ka barrel — isse list chhoti aur naam saaf.
  // Har warehouse apni alag jagah hai (pehle saare warehouse ek "Warehouse" me
  // ghul jaate the).
  const placesWithStores = useMemo(() => {
    const seen = new Map();
    for (const s of stores) {
      const k = placeKey(s);
      if (!seen.has(k)) seen.set(k, { key: k, label: placeOf(s), wh: !s.project_id });
    }
    return [...seen.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [stores]);

  const scopedStores = useMemo(
    () => (f.store_scope ? stores.filter((s) => placeKey(s) === f.store_scope) : []),
    [stores, f.store_scope]);

  // Drum jis project par darj hai aur diesel jis project ke kaam me likha ja
  // raha hai, wo alag hon to batao — ya to galat project select hua, ya drum
  // shift ho chuka hai aur uski jagah theek karni hai.
  const drumElsewhere = isIssue && store && (placeUnclear(store) ||
    (store.project_id && f.project_id && String(store.project_id) !== String(f.project_id)));

  // ── Parchi padho (F3) ─────────────────────────────────────────
  // Ye sirf form bharta hai. Milaan SERVER par hota hai jab entry save hoti
  // hai — number ka faisla hamesha server ka, warna client jo bhej de wahi
  // "sach" ban jaata. Yahan jo dikhta hai wo bas ek jhalak hai.
  const readSlip = async () => {
    if (!f.photo_url) return;
    setSlipBusy(true); setSlipMsg(null);
    try {
      const r = await api.post("/fuel/parse-slip", { photo_url: f.photo_url });
      if (!r || !r.success) {
        setSlipMsg({ bad: true, title: (r && r.message) || "Parchi padhi nahi ja saki" });
      } else {
        const d = r.data.read || {};
        setSlipRead(d);
        // Jo aadmi ne khud likh diya hai use mat chhedo — sirf khaali bharo.
        setF((p) => ({
          ...p,
          litres: p.litres || (d.litres != null ? String(d.litres) : p.litres),
          rate: p.rate || (d.rate != null ? String(d.rate) : p.rate),
          amount: p.amount || (d.amount != null ? String(d.amount) : p.amount),
          slip_no: p.slip_no || d.slip_no || "",
        }));
        const lines = [];
        if (d.litres != null) lines.push(`Litre: ${d.litres}`);
        if (d.rate != null) lines.push(`Rate: ₹${d.rate}`);
        if (d.amount != null) lines.push(`Total: ₹${d.amount}`);
        if (d.slip_no) lines.push(`Slip no.: ${d.slip_no}`);
        if (r.data.derived && r.data.derived.length) {
          lines.push(`(${r.data.derived.join(", ")} parchi par nahi tha — baaki do se nikala gaya)`);
        }
        lines.push("Save karte waqt ye aapke type kiye hue se milaya jayega — farq hua to Cross-check me dikhega.");
        setSlipMsg({ warn: r.data.confidence !== "high", title: t("fuel.parchi_padh_li_jaanch_lein"), lines });
      }
    } catch (e) {
      setSlipMsg({ bad: true, title: (e && e.message) || "Network error" });
    }
    setSlipBusy(false);
  };

  const save = async () => {
    setError("");
    if (!litres) { setError(t("fuel.litres_bharein")); return; }
    if (!isIssue && !rate) { setError(t("fuel.rate_bharein")); return; }
    if (!isIssue && !f.vendor_party_id) { setError(t("fuel.pump_vendor_chunein")); return; }
    if (path !== "pump_store" && !f.equipment_id) { setError(t("fuel.machine_chunein")); return; }
    if (path !== "pump_machine" && !f.store_id) { setError(t("fuel.barrel_chunein")); return; }
    if (isIssue && store && litres > Number(store.litres) + 0.001) {
      setError(`${store.name} me sirf ${fmtL(store.litres)} hai`); return;
    }
    // Meter lazmi hai jab diesel machine me ja raha ho. Server bhi yahi rokta
    // hai — yahan sirf isliye ki site par error server ja kar aane se pehle hi
    // dikh jaye.
    if (path !== "pump_store") {
      if (!f.meter_missing && !f.meter_reading) {
        setError(t("fuel.machine_ka_meter_reading_daalein_meter")); return;
      }
      if (f.meter_missing && !f.meter_missing_reason) {
        setError(t("fuel.meter_na_dene_ki_wajah_chunein")); return;
      }
    }
    // Meter lazmi jab diesel machine me ja raha ho. Server par bhi yahi rok
    // hai — ye sirf site par ek round-trip bachati hai.
    if (path !== "pump_store") {
      if (!f.meter_missing && !f.meter_reading) {
        setError(t("fuel.machine_ka_meter_reading_bharein_meter")); return;
      }
      if (f.meter_missing && !f.meter_missing_reason) {
        setError(t("fuel.meter_na_dene_ki_wajah_chunein")); return;
      }
    }

    setBusy(true);
    try {
      let res;
      if (isIssue) {
        res = await api.post("/fuel/issues", {
          store_id: parseInt(f.store_id, 10),
          equipment_id: parseInt(f.equipment_id, 10),
          // Khaali = company level. Cost isi par jaata hai, drum kahin bhi pada ho.
          project_id: f.project_id ? parseInt(f.project_id, 10) : null,
          litres,
          issued_at: toSqlDateTime(f.filled_at),
          meter_reading: f.meter_reading ? parseFloat(f.meter_reading) : null,
          meter_missing_reason: f.meter_missing ? (f.meter_missing_reason || null) : null,
          photo_url: f.photo_url || null,
          note: f.note || null,
        });
      } else {
        res = await api.post("/fuel/purchases", {
          destination: path === "pump_store" ? "store" : "equipment",
          store_id: path === "pump_store" ? parseInt(f.store_id, 10) : null,
          equipment_id: path === "pump_machine" ? parseInt(f.equipment_id, 10) : null,
          project_id: f.project_id ? parseInt(f.project_id, 10) : null,
          vendor_party_id: parseInt(f.vendor_party_id, 10),
          litres, rate, amount,
          filled_at: toSqlDateTime(f.filled_at),
          slip_no: f.slip_no || null,
          slip_photo_url: f.photo_url || null,
          slip_read: slipRead || null,
          meter_reading: f.meter_reading ? parseFloat(f.meter_reading) : null,
          meter_missing_reason: f.meter_missing ? (f.meter_missing_reason || null) : null,
          payment_mode: f.payment_mode || "credit",
          // Pehle bheja hi nahi jaata tha — server wallet maan kar entry karne
          // wale admin/accountant ke wallet se kaat deta tha.
          cash_source: f.payment_mode === "cash" ? (f.cash_source || "company") : null,
          fuel_type: path === "pump_machine" ? (f.fuel_type || "diesel") : "diesel",
          note: f.note || null,
        });
      }
      if (res && res.success) { onSaved(); onClose(); }
      else setError((res && res.message) || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("fuel.refuelling_entry")}
      sub={t("fuel.diesel_kahan_se_kahan_gaya_wahi")}
      footer={<>
        <Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={save} disabled={busy}>{busy ? t("common.saving") : isIssue ? t("fuel.issue_karein") : t("fuel.purchase_save_karein")}</Btn>
      </>}>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
        {PATHS.map((p) => {
          const on = path === p.id;
          return (
            <button key={p.id} type="button" onClick={() => { setPath(p.id); setError(""); }}
              style={{
                padding: "12px 11px", borderRadius: 9, textAlign: "left", cursor: "pointer",
                border: `1.5px solid ${on ? T.ind : T.b1}`,
                background: on ? T.indL : T.surface, fontFamily: "inherit",
              }}>
              <p.I size={16} color={on ? T.ind : T.t4} />
              <div style={{ fontSize: 12.5, fontWeight: 700, color: on ? T.ind : T.t2, marginTop: 6 }}>{p.l}</div>
              <div style={{ fontSize: 10, color: T.t4, marginTop: 2, lineHeight: 1.35 }}>{p.sub}</div>
            </button>
          );
        })}
      </div>

      {isIssue && (
        <div style={{ padding: "9px 12px", background: T.indL, border: `1px solid ${T.indM}`, borderRadius: 7, fontSize: 11.5, color: T.ind, fontWeight: 600, marginBottom: 14 }}>
         {t("fuel.barrel_se_machine_cost_yahin")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {path !== "pump_machine" && (
          <>
            <Field label={t("fuel.barrel_kahan_ka")}>
              <PickSelect value={f.store_scope || ""} onChange={(e) => { upd("store_scope", e.target.value); upd("store_id", ""); }} style={inp}>
                <option value="">{t("fuel.chunein")}</option>
                {placesWithStores.some((p) => p.wh) && (
                  <optgroup label={t("fuel.warehouse_central_store")}>
                    {placesWithStores.filter((p) => p.wh).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </optgroup>
                )}
                {placesWithStores.some((p) => !p.wh) && (
                  <optgroup label={t("common.project")}>
                    {placesWithStores.filter((p) => !p.wh).map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </optgroup>
                )}
              </PickSelect>
            </Field>
            <Field label={t("fuel.barrel_store")}>
              <PickSelect value={f.store_id || ""} style={inp} disabled={!f.store_scope}
                onChange={(e) => {
                  const v = e.target.value;
                  const s = stores.find((x) => String(x.id) === String(v));
                  // Machine me daalte waqt kaam ka project pehle se drum ka project
                  // maan lo — zyadatar wahi hota hai. Badalna ho to neeche badlo.
                  setF((p) => ({ ...p, store_id: v,
                    project_id: isIssue && s && s.project_id && s.project_name ? String(s.project_id) : (p.project_id || "") }));
                }}>
                <option value="">{f.store_scope ? t("fuel.chunein") : t("fuel.pehle_upar_wala_chunein")}</option>
                {scopedStores.map((s) => <option key={s.id} value={s.id}>{s.name} — {fmtL(s.litres)}</option>)}
              </PickSelect>
              {f.store_scope && scopedStores.length === 0 && (
                <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("fuel.yahan_koi_barrel_nahi_hai")}</div>
              )}
            </Field>
          </>
        )}

        {/* Kharcha yahin banta hai: diesel jis kaam me gaya — project, ya company
            level. Drum kahan pada hai isse cost nahi badalti. */}
        {isIssue && store && (
          <Field label={t("fuel.kis_project_ka_kaam")} span={2} hint={t("fuel.cost_machine_ke_kaam_par")}>
            <PickSelect value={f.project_id || ""} onChange={(e) => upd("project_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.company_level_koi_project_nahi")}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </PickSelect>
            {drumElsewhere && (
              <div style={{ marginTop: 6, padding: "8px 11px", borderRadius: 6, background: T.ambL, border: `1px solid ${T.ambM}`, fontSize: 11.5, color: T.amb, fontWeight: 600 }}>
                {t("fuel.drum_doosri_jagah_darj", { place: placeOf(store) })}
              </div>
            )}
          </Field>
        )}

        {path !== "pump_store" && (
          <Field label={t("fuel.machine")} hint={blocked > 0 ? `${blocked} machine list me nahi — unka kiraya diesel ke saath hai` : null}>
            <PickSelect value={f.equipment_id || ""} onChange={(e) => upd("equipment_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.chunein")}</option>
              {eligible.map((e) => <option key={e.id} value={e.id}>{e.name}{e.code ? ` (${e.code})` : ""}</option>)}
            </PickSelect>
          </Field>
        )}

        {!isIssue && (
          <Field label={t("fuel.pump_fuel_vendor")} hint={t("fuel.free_text_naam_nahi_chalega_party")}>
            <PickSelect value={f.vendor_party_id || ""} onChange={(e) => upd("vendor_party_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.chunein")}</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </PickSelect>
          </Field>
        )}

        {path === "pump_machine" && (
          <Field label={t("fuel.kaunsa_fuel")}>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ k: "diesel", l: t("fuel.diesel") }, { k: "petrol", l: t("fuel.petrol") }].map((o) => {
                const on = (f.fuel_type || "diesel") === o.k;
                return (
                  <button key={o.k} type="button" onClick={() => upd("fuel_type", o.k)}
                    style={{ flex: 1, padding: "9px", borderRadius: 7, border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, color: on ? T.ind : T.t3, fontSize: 12, fontWeight: on ? 700 : 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {o.l}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
        {path === "pump_machine" && (
          <Field label={t("common.project")}>
            <PickSelect value={f.project_id || ""} onChange={(e) => upd("project_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.koi_nahi")}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </PickSelect>
          </Field>
        )}

        <Field label={t("fuel.litres")}>
          <input value={f.litres || ""} inputMode="decimal" placeholder="0"
            onChange={(e) => upd("litres", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>

        {!isIssue && (
          <Field label={t("fuel.rate_litre")}>
            <input value={f.rate || ""} inputMode="decimal" placeholder="0"
              onChange={(e) => upd("rate", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
          </Field>
        )}

        <Field label={isIssue ? t("fuel.kab_nikala") : t("fuel.kab_bhara")}>
          <input type="datetime-local" value={f.filled_at || ""} onChange={(e) => upd("filled_at", e.target.value)} style={inp} />
        </Field>

        {/* Meter tabhi maanga jaata hai jab diesel MACHINE me ja raha ho.
            Barrel bharne par koi machine hai hi nahi. Ye lazmi isliye hai ki
            ₹/hr = kharcha ÷ chali, aur "chali" ke liye do reading chahiye —
            diesel har hafte bharta hai, yahi sabse pakka mauka hai. */}
        {path !== "pump_store" && (
          <Field
            label={machine?.meter_unit === "km"
              ? t("fuel.machine_ka_apna_odometer_km") : t("fuel.machine_ka_apna_hour_meter")}
            hint={f.meter_missing ? t("fuel.wajah_ke_saath_chhoot_mil_jayegi")
              : t("fuel.machine_ke_apne_meter_ka_number")}>
            {!f.meter_missing && (
              <input value={f.meter_reading || ""} inputMode="decimal"
                placeholder={machine?.meter_unit === "km" ? t("fuel.gaadi_ka_odometer_e_g_84") : t("fuel.machine_ka_hour_meter_e_g")}
                onChange={(e) => upd("meter_reading", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: f.meter_missing ? 0 : 7, fontSize: 12, color: T.t2, cursor: "pointer" }}>
              <input type="checkbox" checked={!!f.meter_missing}
                onChange={(e) => { upd("meter_missing", e.target.checked); if (e.target.checked) upd("meter_reading", ""); }} />
             {t("fuel.meter_nahi_de_sakta")}
            </label>
            {f.meter_missing && (
              <PickSelect value={f.meter_missing_reason || ""} onChange={(e) => upd("meter_missing_reason", e.target.value)}
                style={{ ...inp, marginTop: 7 }}>
                <option value="">{t("fuel.wajah_chunein")}</option>
                <option value="meter_kharab">{t("fuel.meter_kharab_hai")}</option>
                <option value="meter_nahi">{t("fuel.machine_par_meter_hai_hi_nahi")}</option>
                <option value="padha_nahi_gaya">{t("fuel.us_waqt_padha_nahi_ja_saka")}</option>
              </PickSelect>
            )}
          </Field>
        )}

        {!isIssue && (
          <>
            <Field label={t("fuel.slip_no_optional")}>
              <input value={f.slip_no || ""} onChange={(e) => upd("slip_no", e.target.value)} placeholder={t("fuel.pump_slip")} style={inp} />
            </Field>
            <Field label={t("common.payment")}>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ k: "credit", l: t("fuel.udhaar_credit") }, { k: "cash", l: t("common.cash") }].map((o) => {
                  const on = (f.payment_mode || "credit") === o.k;
                  return (
                    <button key={o.k} type="button" onClick={() => upd("payment_mode", o.k)}
                      style={{ flex: 1, padding: "9px", borderRadius: 7, border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, color: on ? T.ind : T.t3, fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{o.l}</button>
                  );
                })}
              </div>
            </Field>
            {f.payment_mode === "cash" && (
              <Field label={t("fuel.paisa_kisne_diya")} span={2} hint={t("fuel.paisa_kisne_diya_hint")}>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ k: "company", l: t("fuel.company_ne_direct_diya") }, { k: "wallet", l: t("fuel.mere_wallet_se") }].map((o) => {
                    const on = (f.cash_source || "company") === o.k;
                    return (
                      <button key={o.k} type="button" onClick={() => upd("cash_source", o.k)}
                        style={{ flex: 1, padding: "9px", borderRadius: 7, border: `1.5px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, color: on ? T.ind : T.t3, fontSize: 12, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{o.l}</button>
                    );
                  })}
                </div>
              </Field>
            )}
          </>
        )}

        <Field label={isIssue ? t("fuel.photo_optional") : t("fuel.pump_slip_ka_photo")} span={2}
          hint={isIssue ? null : t("fuel.slip_hi_wo_saboot_hai_ki")}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <label style={{ ...inp, width: "auto", cursor: uploading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, color: T.t2, fontWeight: 600 }}>
              <IcCamera size={14} color={T.t3} />
              {uploading ? t("fuel.upload_ho_raha_hai") : f.photo_url ? t("fuel.photo_badlein") : t("fuel.photo_chunein")}
              <input type="file" accept="image/*" onChange={pickPhoto} disabled={uploading} style={{ display: "none" }} />
            </label>
            {f.photo_url && (
              <>
                <img src={cld(f.photo_url, "thumb")} alt="slip" style={{ height: 38, width: 38, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}` }} />
                <button type="button" onClick={() => upd("photo_url", "")}
                  style={{ background: "none", border: "none", color: T.t4, cursor: "pointer", fontSize: 11.5, fontFamily: "inherit" }}>{t("fuel.hatayein")}</button>
              </>
            )}
          </div>

          {/* Parchi ab sirf ek file nahi rahegi — usme se litre, rate aur total
              padh kar aapke type kiye hue se milaya jaata hai. Button ke peeche
              hai kyunki har baar padhne ka paisa lagta hai. */}
          {!isIssue && f.photo_url && (
            <div style={{ marginTop: 9 }}>
              <button type="button" onClick={readSlip} disabled={slipBusy}
                style={{ padding: "7px 13px", borderRadius: 7, cursor: slipBusy ? "default" : "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                  border: "1.5px solid " + T.ind, background: T.surface, color: T.ind }}>
                {slipBusy ? t("fuel.parchi_padhi_ja_rahi_hai") : t("fuel.parchi_padho")}
              </button>
              <span style={{ fontSize: 11, color: T.t4, marginLeft: 9 }}>
               {t("fuel.bhare_hue_fields_nahi_badlenge_sirf")}
              </span>
            </div>
          )}

          {slipMsg && (
            <div style={{ marginTop: 9, padding: "9px 12px", borderRadius: 7, fontSize: 11.5,
              background: slipMsg.bad ? T.redL : slipMsg.warn ? T.ambL : T.grnL,
              border: "1px solid " + (slipMsg.bad ? T.red : slipMsg.warn ? T.amb : T.grn) }}>
              <b style={{ color: slipMsg.bad ? T.red : slipMsg.warn ? T.amb : T.grn }}>{slipMsg.title}</b>
              {slipMsg.lines && slipMsg.lines.map((l, i) => (
                <div key={i} style={{ color: T.t2, marginTop: 3 }}>• {l}</div>
              ))}
            </div>
          )}
        </Field>

        <Field label={t("common.note_optional")} span={2}>
          <input value={f.note || ""} onChange={(e) => upd("note", e.target.value)} style={inp} />
        </Field>
      </div>

      {!isIssue && litres > 0 && rate > 0 && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtN(litres)} L × ₹{fmtN(rate)}</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: T.t1 }}>{fmtC(amount)}</span>
        </div>
      )}
      {isIssue && store && litres > 0 && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtN(litres)} L @ drum average ₹{fmtN(store.avg_rate)}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>
            {fmtC(litres * Number(store.avg_rate || 0))}
            <span style={{ fontSize: 11, fontWeight: 600, color: T.t4, marginLeft: 8 }}>{t("fuel.bacha_fmtl", { fmtL: fmtL(Number(store.litres) - litres) })}</span>
          </span>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: "9px 12px", background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12, borderRadius: 7, fontWeight: 600 }}>{error}</div>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════════
function OverviewTab({ stores, purchases, issues, byEquipment, normMissing, onRefuel }) {
  const openEntry = useOpenEntry();
  const lowStores = stores.filter((s) => s.below_reorder);
  const overNorm = byEquipment.filter((e) => e.variance_pct != null && e.variance_pct > 15);

  const recent = useMemo(() => {
    const p = purchases.map((x) => ({ id: x.id, kind: "purchase", at: x.filled_at, litres: x.litres, amount: x.amount, who: x.vendor_party_name || x.vendor_name, where: x.store_name || x.equipment_name, mode: x.payment_mode }));
    const i = issues.map((x) => ({ id: x.id, kind: "issue", at: x.issued_at, litres: x.litres, amount: x.amount, who: x.store_name, where: x.equipment_name }));
    return [...p, ...i].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12);
  }, [purchases, issues]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {lowStores.length > 0 && (
        <div style={{ padding: "9px 13px", background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 7, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <IcAlert size={13} color={T.amb} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.amb }}>{t("fuel.reorder_level_se_neeche")}</span>
          {lowStores.map((s) => (
            <span key={s.id} style={{ background: T.amb, color: "white", fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20 }}>
              {s.name} ({fmtL(s.litres)})
            </span>
          ))}
        </div>
      )}

      {/* Counted from the equipment master, not from the report — a machine
          with no norm AND no fuel yet never appears in report rows, which is
          exactly the machine whose blank variance column looks like a bug. */}
      {normMissing.length > 0 && (
        <div style={{ padding: "10px 13px", background: T.indL, border: `1px solid ${T.indM}`, borderRadius: 7, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <IcAlert size={13} color={T.ind} style={{ marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.ind }}>{t("fuel.normmissing_machine_ka_fuel_per_hour", { normMissing: normMissing.length })}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>
              {t("fuel.norm_ke_bina_variance")}
              {t("fuel.norm_kahan_bharein")}
              {normMissing.length <= 6 && (
                <span style={{ color: T.t4 }}> ({normMissing.map((m) => m.name).join(", ")})</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, alignItems: "start" }}>
        <Panel title={t("fuel.haal_ki_entries")} action={canFuelEntry() ? <Btn size="sm" icon={IcAdd} onClick={onRefuel}>{t("fuel.refuelling_entry")}</Btn> : null}>
          {recent.length === 0 && <Empty>{t("fuel.abhi_koi_diesel_entry_nahi_hui")}</Empty>}
          {recent.length > 0 && (
            <>
              <Row head cols="90px 70px 1.4fr 1fr 90px">
                <span>{t("fuel.kab")}</span><span>{t("fuel.kya")}</span><span>{t("fuel.kahan_se_kahan")}</span><span>{t("fuel.litres")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span>
              </Row>
              {recent.map((r, i) => (
                <Row key={i} cols="90px 70px 1.4fr 1fr 90px" onClick={() => openEntry({ kind: r.kind, id: r.id })}>
                  <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(r.at)}</span>
                  <span>{r.kind === "purchase"
                    ? <Pill label={t("fuel.kharida")} c={T.blu} bg={T.bluL} />
                    : <Pill label={t("fuel.nikala")} c={T.slt} bg={T.sltL} />}</span>
                  <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.who || "—"} <span style={{ color: T.t4 }}>→</span> {r.where || "—"}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{fmtL(r.litres)}</span>
                  <span style={{ fontSize: 12, textAlign: "right", color: r.kind === "purchase" ? T.t1 : T.t3, fontWeight: r.kind === "purchase" ? 700 : 400 }}>{fmtC(r.amount)}</span>
                </Row>
              ))}
            </>
          )}
        </Panel>

        <div style={{ display: "grid", gap: 12 }}>
          <Panel title={t("fuel.barrel_stock")}>
            {stores.length === 0 && <Empty>{t("fuel.koi_barrel_nahi_bana")}</Empty>}
            {stores.map((s) => (
              <Row key={s.id} cols="1.4fr 90px 80px">
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{s.name}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{s.project_name || "—"}</div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: s.below_reorder ? T.amb : T.t1 }}>{fmtL(s.litres)}</span>
                <span style={{ fontSize: 11, color: T.t3, textAlign: "right" }}>₹{fmtN(s.avg_rate)}/L</span>
              </Row>
            ))}
          </Panel>

          {overNorm.length > 0 && (
            <Panel title={t("fuel.dhyan_dene_layak")}>
              {overNorm.map((e) => (
                <Row key={"o" + e.equipment_id} cols="1fr 70px">
                  <span style={{ fontSize: 11.5, color: T.t2 }}>{e.equipment_name}</span>
                  <span style={{ textAlign: "right" }}><Pill label={`+${fmtN(e.variance_pct)}%`} c={T.red} bg={T.redL} /></span>
                </Row>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function RefuelingTab({ purchases, issues, onRefuel, onDeletePurchase, onDeleteIssue }) {
  const openEntry = useOpenEntry();
  const [kind, setKind] = useState("all");
  const rows = useMemo(() => {
    const p = purchases.map((x) => ({ ...x, _k: "purchase", _at: x.filled_at }));
    const i = issues.map((x) => ({ ...x, _k: "issue", _at: x.issued_at }));
    const all = [...p, ...i].sort((a, b) => new Date(b._at) - new Date(a._at));
    return kind === "all" ? all : all.filter((x) => x._k === kind);
  }, [purchases, issues, kind]);

  return (
    <Panel title={t("fuel.refuelling")}
      action={<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4, background: T.sltL, padding: 3, borderRadius: 7 }}>
          {[{ k: "all", l: t("fuel.sab") }, { k: "purchase", l: t("fuel.kharida") }, { k: "issue", l: t("fuel.barrel_se") }].map((o) => (
            <button key={o.k} type="button" onClick={() => setKind(o.k)}
              style={{ padding: "5px 11px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: kind === o.k ? 700 : 500, background: kind === o.k ? T.surface : "transparent", color: kind === o.k ? T.ind : T.t3 }}>{o.l}</button>
          ))}
        </div>
        {canFuelEntry() && <Btn size="sm" icon={IcAdd} onClick={onRefuel}>{t("fuel.refuelling_entry")}</Btn>}
      </div>}>
      {rows.length === 0 && <Empty>{t("fuel.koi_entry_nahi_mili")}</Empty>}
      {rows.length > 0 && (
        <>
          <Row head cols="105px 80px 1.3fr 1.2fr 80px 80px 95px 90px 40px">
            <span>{t("fuel.kab")}</span><span>{t("fuel.kya")}</span><span>{t("fuel.vendor_barrel")}</span><span>{t("fuel.machine_barrel")}</span>
            <span>{t("fuel.litres")}</span><span>{t("common.rate")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span><span>{t("common.status")}</span><span />
          </Row>
          {rows.map((r) => (
            <Row key={r._k + r.id} cols="105px 80px 1.3fr 1.2fr 80px 80px 95px 90px 40px" onClick={() => openEntry({ kind: r._k, id: r.id })}>
              <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(r._at)}</span>
              <span>{r._k === "purchase"
                ? <Pill label={r.destination === "store" ? t("fuel.barrel") : t("fuel.machine_2")} c={T.blu} bg={T.bluL} />
                : <Pill label={t("fuel.barrel_se")} c={T.slt} bg={T.sltL} />}</span>
              <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r._k === "purchase" ? (r.vendor_party_name || r.vendor_name || "—") : (r.store_name || "—")}
              </span>
              <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r._k === "purchase" ? (r.store_name || r.equipment_name || "—") : (r.equipment_name || "—")}
                {r._k === "purchase" && r.fuel_type === "petrol" && <b style={{ color: T.amb }}>{" · " + t("fuel.petrol")}</b>}
                {r.meter_flag && <b title={r.meter_note || ""} style={{ color: T.amb }}>{" · " + t("fuel.meter_shak_chhota")}</b>}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{fmtL(r.litres)}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>₹{fmtN(r._k === "purchase" ? r.rate : r.rate_used)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtC(r.amount)}</span>
              <span>
                {/* Paid/Baaki server ke EK niyam se (payable_status — bill, purana
                    settlement, ya bill bana hi nahi). Pehle sirf settlement dekhte the:
                    naye raaste ka pay ho chuka bill bhi "Baaki" dikhta tha. */}
                {r._k === "issue"
                  ? <Pill label={t("fuel.stock_se")} c={T.slt} bg={T.sltL} />
                  : r.payment_mode === "cash"
                    ? <Pill label={t("common.cash")} c={T.grn} bg={T.grnL} />
                    : r.payable_status === "paid"
                      ? <Pill label={t("fuel.payable_paid")} c={T.grn} bg={T.grnL} />
                      : r.payable_status === "unbilled"
                        ? <Pill label={t("fuel.payable_unbilled")} c={T.amb} bg={T.ambL} />
                        : <Pill label={r.payable_status === "partial" ? t("fuel.payable_partial") : t("fuel.payable_unpaid")} c={T.amb} bg={T.ambL} />}
              </span>
              {can("Fuel", "delete") ? (
                <button type="button" title={t("common.delete")}
                  onClick={(ev) => { ev.stopPropagation(); if (r._k === "purchase") onDeletePurchase(r); else onDeleteIssue(r); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.t4, padding: 3, display: "flex" }}>
                  <IcTrash size={13} color="currentColor" />
                </button>
              ) : <span />}
            </Row>
          ))}
        </>
      )}
    </Panel>
  );
}

// ══════════════════════════════════════════════════════════════════
// DIPSTICK KI REQUEST — "Stock adjust karo" / "Hatao" → admin ka faisla → log
// ------------------------------------------------------------------
// Prafull (2 Oct 2026): dipstick ke baad stock badalta hi nahi tha, aur galat
// reading hatane ka raasta nahi tha. Ab dono kaam note ke saath REQUEST se
// hote hain; admin isi module me approve/reject karta hai (approval drawer me
// nahi) aur dono taraf ghanti jaati hai. Adjust SIRF litre ka — koi paisa,
// koi expense nahi; reading ka difference register me dikhta rehta hai.
// Server: POST /fuel/stock-checks/:id/requests · GET /fuel/dip-requests ·
// POST /fuel/dip-requests/:id/decide. Asli rok server par hai — yahan sirf
// wo button chhupate hain jo dabane par mana hi hota.
// ══════════════════════════════════════════════════════════════════
const signedL = (n) => `${Number(n) > 0 ? "+" : ""}${fmtN(n)} L`;
// ── Kaun kya kare — Roles & Access ki Fuel row (5 Oct 2026) ──
// Server (routes/fuel.js) wahi tick maangta hai jo yahan:
//   Entry  = refuelling entry, subcon ko diesel, dipstick, dipstick ki request
//            (transition me Create bhi)
//   Create = naya barrel / drum          Delete = entry hatana (wajah ke saath)
//   Approve = dipstick request ka faisla (strict — pehle sirf Admin role)
//   Export = Excel / PDF / WhatsApp
const canFuelEntry = () => canEntry("Fuel");
const canRequestDip = () => canEntry("Fuel") || can("Fuel", "edit");
const canDecideDip = () => canAny("Fuel", "approve", { strict: true });

// Reading wali row ek shakl me — drum ka Ledger (storeLedger) aur Barrel
// Register ka ledger (barrelLedger) farq shakl ki row dete hain.
const dipReading = (r) => ({
  check_id: r.check_id, at: r.at,
  physical_l: r.physical_l, book_l: r.book_l,
  variance_l: r.variance_l != null ? r.variance_l : r.litres,
  is_shift: !!r.is_shift_reading, adjusted: !!r.adjusted,
  adjust_req: r.adjust_req || null, delete_req: r.delete_req || null,
});

// Reading ki row ke neeche ki patti: request ki halat + "Stock adjust karo" / "Hatao".
function DipActions({ row, onAsk }) {
  const d = dipReading(row);
  if (!d.check_id) return null;
  const may = canRequestDip();
  const adjPending = d.adjust_req && d.adjust_req.status === "submitted";
  const delPending = d.delete_req && d.delete_req.status === "submitted";
  const backAdj = d.adjust_req && d.adjust_req.status === "rejected" ? d.adjust_req : null;
  const backDel = d.delete_req && d.delete_req.status === "rejected" ? d.delete_req : null;
  // Ek reading se ek hi baar adjust; difference 0 ho to adjust karne ko kuch nahi.
  const canAdjust = may && !d.adjusted && !adjPending && Math.abs(Number(d.variance_l) || 0) >= 0.01;
  // Shift ke waqt li reading shift ka hissa hai — wo nahi hat'ti (server bhi rokta hai).
  const canDelete = may && !d.is_shift && !delPending;
  const shiftNote = may && d.is_shift;
  // Site par li dipstick ki photo (phone se, 6 Oct 2026) — farq par faisla
  // karne wala wahi dekhe jo naapa gaya. Click par badi photo naye tab me.
  const photos = row.photos || [];
  const pendingPh = Number(row.photos_pending) || 0;
  if (!d.adjusted && !adjPending && !delPending && !backAdj && !backDel && !canAdjust && !canDelete && !shiftNote
      && !photos.length && !pendingPh) return null;
  const muted = { fontSize: 10.5, color: T.t3 };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "5px 15px 7px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
      {photos.map((u, i) => (
        <a key={i} href={cld(u, "view")} target="_blank" rel="noreferrer" title={t("fuel.dip_photo_label")}>
          <img src={cld(u, "thumb")} alt="" style={{ height: 30, width: 30, objectFit: "cover", borderRadius: 5, border: `1px solid ${T.b1}`, display: "block" }} />
        </a>
      ))}
      {pendingPh > 0 && <span style={muted}>{t("fuel.d_photos_pending", { n: pendingPh })}</span>}
      {d.adjusted && <Pill label={t("fuel.dip_adjust_hua_pill", { litres: d.adjust_req && d.adjust_req.adj_litres != null ? signedL(d.adjust_req.adj_litres) : "" })} c={T.grn} bg={T.grnL} />}
      {adjPending && <Pill label={t("fuel.dip_adjust_pending")} c={T.amb} bg={T.ambL} />}
      {delPending && <Pill label={t("fuel.dip_delete_pending")} c={T.amb} bg={T.ambL} />}
      {backAdj && <span style={muted}>{t("fuel.dip_adjust_wapas", { name: backAdj.decided_by_name || "—", reason: backAdj.decision_note || "—" })}</span>}
      {backDel && <span style={muted}>{t("fuel.dip_delete_wapas", { name: backDel.decided_by_name || "—", reason: backDel.decision_note || "—" })}</span>}
      {shiftNote && <span style={{ ...muted, color: T.t4 }}>{t("fuel.dip_shift_nahi_hategi_short")}</span>}
      <span style={{ flex: 1 }} />
      {canAdjust && <Btn size="sm" ghost onClick={() => onAsk("adjust", d)}>{t("fuel.stock_adjust_karo")}</Btn>}
      {canDelete && <Btn size="sm" ghost onClick={() => onAsk("delete", d)}>{t("fuel.dip_hatao")}</Btn>}
    </div>
  );
}

// Request bhejne ka modal — note zaroori; kya hoga wo saaf likha.
function DipRequestModal({ ask, storeName, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setNote(""); setError(""); }, [ask]);
  if (!ask) return null;
  const { kind, d } = ask;
  const send = async () => {
    if (note.trim().length < 3) { setError(t("fuel.dip_note_likho")); return; }
    setBusy(true); setError("");
    try {
      const r = await api.post(`/fuel/stock-checks/${d.check_id}/requests`, { kind, note: note.trim() });
      if (r?.success) {
        if (window.toast && r.message) window.toast.success(r.message);
        onDone();
      } else setError(r?.message || t("fuel.dip_request_nahi_gayi"));
    } catch (e) { setError(e?.message || t("common.network_error")); }
    setBusy(false);
  };
  const box = (c, bg, bd) => ({ padding: "10px 13px", borderRadius: 7, background: bg, border: `1px solid ${bd}`, fontSize: 12, color: c, lineHeight: 1.5 });
  return (
    <Modal open onClose={onClose} width={540}
      title={kind === "adjust" ? t("fuel.stock_adjust_karo") : t("fuel.dip_delete_title")}
      sub={`${storeName || ""} · ${fmtDT(d.at)}`}
      footer={<><Btn ghost onClick={onClose}>{t("common.cancel")}</Btn>
        <Btn onClick={send} disabled={busy || note.trim().length < 3}>{busy ? t("common.saving") : t("fuel.dip_request_bhejo")}</Btn></>}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>
          {t("fuel.dip_reading_summary", { physical: fmtL(d.physical_l), book: fmtL(d.book_l), diff: signedL(d.variance_l) })}
        </div>
        {kind === "adjust" ? (
          <div style={box(T.ind, T.indL, T.indM)}>{t("fuel.dip_adjust_explain", { physical: fmtL(d.physical_l) })}</div>
        ) : (
          <div style={box(T.t2, T.surfaceB, T.b1)}>{t("fuel.dip_delete_explain")}</div>
        )}
        {kind === "delete" && d.adjusted && (
          <div style={box(T.amb, T.ambL, T.ambM)}>
            {t("fuel.dip_delete_adjust_warn", { litres: d.adjust_req && d.adjust_req.adj_litres != null ? signedL(d.adjust_req.adj_litres) : "" })}
          </div>
        )}
        <Field label={t("fuel.dip_note_label")}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000}
            style={{ ...inp, resize: "vertical" }} />
        </Field>
        {error && <div style={{ padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{error}</div>}
      </div>
    </Modal>
  );
}

const DIP_ST = {
  submitted: { c: T.amb, bg: T.ambL, k: "fuel.dip_st_pending" },
  approved:  { c: T.grn, bg: T.grnL, k: "fuel.dip_st_approved" },
  rejected:  { c: T.red, bg: T.redL, k: "fuel.dip_st_rejected" },
  cancelled: { c: T.slt, bg: T.sltL, k: "fuel.dip_st_cancelled" },
};

// Ek request — kisne, kab, note; faisla kisne, kab, kyun. Admin ko pending par
// yahin Approve / Reject.
function DipRequestCard({ r, canDecide, onDecided }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const st = DIP_ST[r.status] || DIP_ST.cancelled;
  const decide = async (decision) => {
    setError("");
    if (decision === "reject" && !note.trim()) { setError(t("fuel.dip_reject_wajah_likho")); return; }
    if (decision === "approve") {
      const msg = r.kind === "delete" ? t("fuel.dip_delete_confirm")
        : t("fuel.dip_adjust_confirm", { drum: r.store_name || "", litres: signedL(r.adjust_now_l != null ? r.adjust_now_l : r.variance_l) });
      if (!(await window.confirmAsync(msg))) return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/fuel/dip-requests/${r.id}/decide`, { decision, note: note.trim() || null });
      if (res?.success) {
        if (window.toast && res.message) window.toast.success(res.message);
        onDecided && onDecided();
      } else setError(res?.message || t("fuel.dip_faisla_nahi_hua"));
    } catch (e) { setError(e?.message || t("common.network_error")); }
    setBusy(false);
  };
  return (
    <div style={{ padding: "10px 15px", borderBottom: `1px solid ${T.b1}`, fontSize: 11.5, color: T.t3, lineHeight: 1.5 }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{r.store_name || "—"}</span>
        <Pill label={t(r.kind === "adjust" ? "fuel.dip_kind_adjust" : "fuel.dip_kind_delete")} c={T.ind} bg={T.indL} />
        <Pill label={t(st.k)} c={st.c} bg={st.bg} />
        <span style={{ color: T.t4, marginLeft: "auto" }}>#{r.id}</span>
      </div>
      <div>{t("fuel.dip_log_reading", { at: fmtDT(r.checked_at), physical: fmtL(r.physical_l), book: fmtL(r.book_l), diff: signedL(r.variance_l) })}</div>
      <div style={{ marginTop: 2 }}><b style={{ color: T.t2 }}>{r.requested_by_name || "—"}</b> · {fmtDT(r.requested_at)} — {r.note}</div>
      {r.decided_at && (
        <div style={{ marginTop: 2 }}>
          <b style={{ color: T.t2 }}>{r.decided_by_name || "—"}</b> · {fmtDT(r.decided_at)}{r.decision_note ? ` — ${r.decision_note}` : ""}
        </div>
      )}
      {r.status === "approved" && r.kind === "adjust" && r.adj_litres != null && (
        <div style={{ marginTop: 3, color: T.grn, fontWeight: 600 }}>{t("fuel.dip_log_adjusted", { litres: signedL(r.adj_litres), rate: fmtN(r.adj_rate) })}</div>
      )}
      {r.status === "submitted" && r.kind === "adjust" && r.adjust_now_l != null && (
        <div style={{ marginTop: 3, color: T.amb, fontWeight: 600 }}>{t("fuel.dip_log_adjust_now", { litres: signedL(r.adjust_now_l) })}</div>
      )}
      {canDecide && r.status === "submitted" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7, flexWrap: "wrap" }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
            placeholder={t("fuel.dip_decision_ph")} style={{ ...inp, flex: 1, minWidth: 220, padding: "6px 9px", fontSize: 12 }} />
          <Btn size="sm" c={T.grn} disabled={busy} onClick={() => decide("approve")}>{t("fuel.dip_approve")}</Btn>
          <Btn size="sm" c={T.red} disabled={busy} onClick={() => decide("reject")}>{t("fuel.dip_reject")}</Btn>
        </div>
      )}
      {error && <div style={{ marginTop: 5, color: T.red, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

// Dipstick log — har request, faisla hui bhi; nayi pehle.
function DipLogModal({ open, onClose, onChanged }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) { setRows(null); return undefined; }
    let dead = false;
    setError("");
    api.get("/fuel/dip-requests?limit=300")
      .then((r) => { if (!dead) { if (r?.success) setRows(r.data || []); else setError(r?.message || t("common.network_error")); } })
      .catch((e) => { if (!dead) setError(e?.message || t("common.network_error")); });
    return () => { dead = true; };
  }, [open, tick]);
  const decideOk = canDecideDip();
  return (
    <Modal open={open} onClose={onClose} width={760} title={t("fuel.dip_log")} sub={t("fuel.dip_log_sub")}>
      {error && <Empty>{error}</Empty>}
      {!error && !rows && <Empty>{t("common.loading")}</Empty>}
      {rows && rows.length === 0 && <Empty>{t("fuel.dip_log_empty")}</Empty>}
      {rows && rows.length > 0 && (
        <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
          {rows.map((r) => (
            <DipRequestCard key={r.id} r={r} canDecide={decideOk}
              onDecided={() => { setTick((x) => x + 1); onChanged && onChanged(); }} />
          ))}
        </div>
      )}
    </Modal>
  );
}

function BarrelTab({ stores, projects, onReload, onOpenLedger, onRefuel, dipPending = [] }) {
  const [newOpen, setNewOpen] = useState(false);
  const [dipFor, setDipFor] = useState(null);
  const [shiftFor, setShiftFor] = useState(null);
  const [logOpen, setLogOpen] = useState(false);
  const [places, setPlaces] = useState({ projects: [], warehouses: [], can_shift: false });
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Dipstick ki photo — Settings → Photo Settings → "Diesel stock check". Pehle
  // yahan photo ki jagah hi nahi thi, aur setting "Zaroori" hote hi web se
  // dipstick save hi nahi ho paati (server rokta hai). 6 Oct 2026.
  const [photoPol, setPhotoPol] = useState(null);
  const [dipUploading, setDipUploading] = useState(false);
  useEffect(() => { loadPhotoPolicy().then(setPhotoPol); }, []);
  const dipPol = policyFor(photoPol, "fuel_stock_check");

  // Jagah ki list server se — projects ke saath company ke warehouses (Settings →
  // Warehouse), aur ye ki is user ko drum shift karne ki permission hai ya nahi.
  useEffect(() => {
    api.get("/fuel/store-places")
      .then((r) => { if (r?.success && r.data) setPlaces(r.data); })
      .catch(() => {});
  }, []);
  const placeProjects = places.projects.length ? places.projects : projects;

  const saveStore = async () => {
    setError("");
    const atWarehouse = f.scope === "warehouse";
    if (!atWarehouse && !f.project_id) { setError(t("fuel.project_chunein_ya_warehouse_chunein")); return; }
    if (atWarehouse && !f.warehouse_id) { setError(t("fuel.warehouse_select_karo")); return; }
    if (!f.name?.trim()) { setError(t("fuel.barrel_ka_naam_likhein")); return; }
    setBusy(true);
    try {
      const r = await api.post("/fuel/stores", {
        project_id: atWarehouse ? null : parseInt(f.project_id, 10),
        warehouse_id: atWarehouse ? parseInt(f.warehouse_id, 10) : null,
        name: f.name.trim(),
        capacity_l: f.capacity_l ? parseFloat(f.capacity_l) : null,
        reorder_level_l: f.reorder_level_l ? parseFloat(f.reorder_level_l) : null,
      });
      if (r?.success) { setNewOpen(false); setF({}); onReload(); }
      else setError(r?.message || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  const pickDipPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDipUploading(true); setError("");
    try {
      const url = await uploadToCloudinary(file);
      setF((p) => ({ ...p, photo_url: url }));
    } catch (ex) { setError(t("fuel.dip_photo_upload_fail", { msg: ex.message })); }
    setDipUploading(false);
  };

  const saveDip = async () => {
    setError("");
    if (f.physical_l === undefined || f.physical_l === "") { setError(t("fuel.naapa_hua_diesel_likhein")); return; }
    if (dipUploading) return;
    if (dipPol.mode === "required" && !f.photo_url) { setError(t("fuel.dip_photo_zaroori")); return; }
    setBusy(true);
    try {
      const r = await api.post("/fuel/stock-checks", {
        store_id: dipFor.id,
        checked_at: toSqlDateTime(f.checked_at || nowLocal()),
        physical_l: parseFloat(f.physical_l),
        note: f.note || null,
        photo_url: dipPol.mode !== "off" ? (f.photo_url || null) : null,
      });
      if (r?.success) { setDipFor(null); setF({}); onReload(); }
      else setError(r?.message || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  // Drum shift — sirf jagah badalti hai, paisa nahi. Dipstick lazmi: drum uthte
  // waqt usme kitna tha, wahi nayi jagah ki shuruaat hai.
  const saveShift = async () => {
    setError("");
    const toWh = f.to_scope === "warehouse";
    if (toWh ? !f.to_warehouse_id : !f.to_project_id) { setError(t("fuel.kahan_le_ja_rahe_ho_select_karo")); return; }
    if (f.physical_l === undefined || f.physical_l === "") { setError(t("fuel.shift_se_pehle_dipstick_daalo")); return; }
    setBusy(true);
    try {
      const r = await api.post(`/fuel/stores/${shiftFor.id}/shift`, {
        to_project_id: toWh ? null : parseInt(f.to_project_id, 10),
        to_warehouse_id: toWh ? parseInt(f.to_warehouse_id, 10) : null,
        moved_at: toSqlDateTime(f.moved_at || nowLocal()),
        physical_l: parseFloat(f.physical_l),
        note: f.note || null,
      });
      if (r?.success) {
        setShiftFor(null); setF({}); onReload();
        if (window.toast && r.message) window.toast.success(r.message);
      } else setError(r?.message || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  const measuring = dipFor || shiftFor;
  // Kitaab ka stock US samay tak ka jo upar chuna hai (GET /stores/:id/stock?at=).
  // Purani tareekh ki dipstick / shift par aaj ka stock dikhana jhootha farq
  // (chori jaisa) dikhata tha — server bhi ab usi samay ki kitaab likhta hai.
  const whenPicked = dipFor ? f.checked_at : shiftFor ? f.moved_at : null;
  const [bookAt, setBookAt] = useState(null);
  useEffect(() => {
    setBookAt(null);
    if (!measuring || !whenPicked) return undefined;
    let alive = true;
    const tm = setTimeout(() => {
      api.get(`/fuel/stores/${measuring.id}/stock?at=${encodeURIComponent(toSqlDateTime(whenPicked))}`)
        .then((r) => { if (alive && r?.success && r.data) setBookAt(Number(r.data.litres)); })
        .catch(() => {});
    }, 250);
    return () => { alive = false; clearTimeout(tm); };
  }, [measuring, whenPicked]);
  const bookL = bookAt != null ? bookAt : Number(measuring ? measuring.litres : 0);
  const variance = measuring && f.physical_l !== undefined && f.physical_l !== ""
    ? Math.round((parseFloat(f.physical_l) - bookL) * 100) / 100 : null;
  const varianceBox = variance != null && (
    <div style={{ padding: "10px 13px", borderRadius: 7, background: variance === 0 ? T.grnL : T.ambL, border: `1px solid ${variance === 0 ? T.grnM : T.ambM}`, fontSize: 12, fontWeight: 600, color: variance === 0 ? T.grn : T.amb }}>{t("fuel.variance_variancefmtn_l", { variance: variance > 0 ? "+" : "", fmtN: fmtN(variance) })}<div style={{ fontSize: 10.5, fontWeight: 500, marginTop: 3 }}>
       {t("fuel.stock_apne_aap_adjust_nahi_hoga")}
      </div>
    </div>
  );
  const errorBox = error && <div style={{ padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{error}</div>;

  const scopeToggle = (value, onPick) => (
    <div style={{ display: "flex", gap: 8 }}>
      {[{ k: "project", l: t("fuel.kisi_project_par") }, { k: "warehouse", l: t("fuel.warehouse_central_store") }].map((o) => {
        const on = value === o.k;
        return (
          <button key={o.k} type="button" onClick={() => onPick(o.k)}
            style={{ flex: 1, padding: "9px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
              fontSize: 12.5, fontWeight: 700,
              border: "1.5px solid " + (on ? T.ind : T.border),
              background: on ? T.indL || T.surfaceB : T.surface,
              color: on ? T.ind : T.t2 }}>{o.l}</button>
        );
      })}
    </div>
  );
  const onlyWarehouse = places.warehouses.length === 1 ? String(places.warehouses[0].id) : "";

  const decideOk = canDecideDip();
  return (
    <>
      {/* Faisla baaki dipstick requests — admin yahin Approve / Reject karta hai
          (ghanti isi module ki taraf laati hai). Baaki sab ko sirf dikhti hain. */}
      {dipPending.length > 0 && (
        <Panel title={t("fuel.dip_pending_title", { n: dipPending.length })} style={{ marginBottom: 12, borderColor: T.ambM }}
          action={decideOk ? null : <span style={{ fontSize: 11, color: T.t4 }}>{t("fuel.dip_admin_faisla_karega")}</span>}>
          {dipPending.map((r) => <DipRequestCard key={r.id} r={r} canDecide={decideOk} onDecided={onReload} />)}
        </Panel>
      )}
      <Panel title={t("fuel.barrel_stock")} action={<div style={{ display: "flex", gap: 8 }}>
        <Btn size="sm" ghost onClick={() => setLogOpen(true)}>{t("fuel.dip_log")}</Btn>
        {can("Fuel", "create") && <Btn size="sm" ghost icon={IcAdd} onClick={() => { setF({}); setError(""); setNewOpen(true); }}>{t("fuel.naya_barrel")}</Btn>}
        {canFuelEntry() && <Btn size="sm" icon={IcDrop} onClick={onRefuel}>{t("fuel.refuelling_entry")}</Btn>}
      </div>}>
        {stores.length === 0 && <Empty>{t("fuel.abhi_koi_barrel_nahi_bana_naya")}</Empty>}
        {stores.length > 0 && (
          <>
            <Row head cols="1.4fr 1.3fr 100px 100px 110px 230px">
              <span>{t("fuel.barrel_2")}</span><span>{t("fuel.kahan_hai")}</span><span>{t("common.stock")}</span><span>{t("fuel.avg_rate")}</span><span>{t("fuel.value")}</span><span />
            </Row>
            {stores.map((s) => (
              <Row key={s.id} cols="1.4fr 1.3fr 100px 100px 110px 230px">
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{s.name}</div>
                  {s.capacity_l != null && (
                    <div style={{ fontSize: 10.5, color: T.t4 }}>capacity {fmtL(s.capacity_l)}</div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: placeUnclear(s) ? T.red : T.t2 }}>{placeOf(s)}</div>
                  <div style={{ fontSize: 10.5, color: T.t4 }}>{s.project_id ? t("common.project") : t("fuel.jagah_warehouse")}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.below_reorder ? T.amb : T.t1 }}>
                  {fmtL(s.litres)}
                  {s.below_reorder && <span style={{ marginLeft: 6 }}><Pill label={t("fuel.low")} c={T.amb} bg={T.ambL} /></span>}
                </span>
                <span style={{ fontSize: 12, color: T.t2 }}>₹{fmtN(s.avg_rate)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{fmtC(s.value)}</span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  {canFuelEntry() && <Btn size="sm" ghost icon={IcRuler} onClick={() => { setF({ checked_at: nowLocal() }); setError(""); setDipFor(s); }}>{t("fuel.dipstick")}</Btn>}
                  {places.can_shift && (
                    <Btn size="sm" ghost onClick={() => {
                      setF({ moved_at: nowLocal(), to_scope: s.project_id ? "warehouse" : "project", to_warehouse_id: s.project_id ? onlyWarehouse : "" });
                      setError(""); setShiftFor(s);
                    }}>{t("fuel.shift")}</Btn>
                  )}
                  <Btn size="sm" ghost onClick={() => onOpenLedger(s)}>{t("fuel.ledger")}</Btn>
                </div>
              </Row>
            ))}
          </>
        )}
      </Panel>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title={t("fuel.naya_barrel_store")} width={520}
        footer={<><Btn ghost onClick={() => setNewOpen(false)}>{t("common.cancel")}</Btn><Btn onClick={saveStore} disabled={busy}>{busy ? t("common.saving") : t("fuel.banayein")}</Btn></>}>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label={t("fuel.barrel_kahan_hai")}>
            {scopeToggle(f.scope || "project", (k) => setF((p) => ({ ...p, scope: k,
              project_id: k === "warehouse" ? "" : p.project_id,
              warehouse_id: k === "warehouse" ? (p.warehouse_id || onlyWarehouse) : "" })))}
          </Field>

          {(f.scope || "project") === "project" ? (
            <Field label={t("common.project")}>
              <PickSelect value={f.project_id || ""} onChange={(e) => setF((p) => ({ ...p, project_id: e.target.value }))} style={inp}>
                <option value="">{t("fuel.chunein")}</option>
                {placeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </PickSelect>
            </Field>
          ) : (
            <Field label={t("fuel.jagah_warehouse")}
              hint={places.warehouses.length ? t("fuel.warehouse_ka_diesel_har_project_ko") : t("fuel.koi_warehouse_nahi_bana")}>
              <PickSelect value={f.warehouse_id || ""} onChange={(e) => setF((p) => ({ ...p, warehouse_id: e.target.value }))} style={inp}>
                <option value="">{t("fuel.chunein")}</option>
                {places.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </PickSelect>
            </Field>
          )}
          <Field label={t("common.naam")} hint={t("fuel.drum_par_likha_naam_number")}>
            <input value={f.name || ""} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} placeholder={t("fuel.e_g_site_drum_1")} style={inp} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("fuel.capacity_l")}><input value={f.capacity_l || ""} onChange={(e) => setF((p) => ({ ...p, capacity_l: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} /></Field>
            <Field label={t("fuel.reorder_level_l")} hint={t("fuel.isse_neeche_jaate_hi_alert_aayega")}>
              <input value={f.reorder_level_l || ""} onChange={(e) => setF((p) => ({ ...p, reorder_level_l: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} />
            </Field>
          </div>
          {errorBox}
        </div>
      </Modal>

      <Modal open={!!dipFor} onClose={() => setDipFor(null)} title={t("fuel.dipstick_check")} width={520}
        sub={dipFor ? `${dipFor.name} — ${t("fuel.kitaab_ke_hisaab_se_l", { l: fmtL(bookL) })}` : ""}
        footer={<><Btn ghost onClick={() => setDipFor(null)}>{t("common.cancel")}</Btn><Btn onClick={saveDip} disabled={busy || dipUploading}>{busy ? t("common.saving") : t("fuel.record_karein")}</Btn></>}>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label={t("fuel.kab_naapa")}><input type="datetime-local" value={f.checked_at || ""} onChange={(e) => setF((p) => ({ ...p, checked_at: e.target.value }))} style={inp} /></Field>
          <Field label={t("fuel.naapa_hua_diesel_l")}>
            <input value={f.physical_l ?? ""} inputMode="decimal" onChange={(e) => setF((p) => ({ ...p, physical_l: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} />
          </Field>
          {varianceBox}
          {dipPol.mode !== "off" && (
            <Field label={dipPol.mode === "required" ? t("fuel.dip_photo_label_zaroori") : t("fuel.dip_photo_label")}
              hint={t("fuel.dip_photo_hint")}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label style={{ ...inp, width: "auto", cursor: dipUploading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 7, color: T.t2, fontWeight: 600 }}>
                  <IcCamera size={14} color={T.t3} />
                  {dipUploading ? t("fuel.upload_ho_raha_hai") : f.photo_url ? t("fuel.photo_badlein") : t("fuel.photo_chunein")}
                  <input {...fileInputProps(dipPol)} onChange={pickDipPhoto} disabled={dipUploading} style={{ display: "none" }} />
                </label>
                {f.photo_url && (
                  <>
                    <img src={cld(f.photo_url, "thumb")} alt="" style={{ height: 38, width: 38, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}` }} />
                    <button type="button" onClick={() => setF((p) => ({ ...p, photo_url: "" }))}
                      style={{ background: "none", border: "none", color: T.t4, cursor: "pointer", fontSize: 11.5, fontFamily: "inherit" }}>{t("fuel.hatayein")}</button>
                  </>
                )}
              </div>
            </Field>
          )}
          <Field label={t("common.note_optional")}><input value={f.note || ""} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} style={inp} /></Field>
          {errorBox}
        </div>
      </Modal>

      <Modal open={!!shiftFor} onClose={() => setShiftFor(null)} title={t("fuel.drum_shift_karo")} width={560}
        sub={shiftFor ? t("fuel.drum_abhi_yahan_hai", { name: shiftFor.name, place: placeOf(shiftFor) }) : ""}
        footer={<><Btn ghost onClick={() => setShiftFor(null)}>{t("common.cancel")}</Btn><Btn onClick={saveShift} disabled={busy}>{busy ? t("common.saving") : t("fuel.shift_karo")}</Btn></>}>
        {shiftFor && (
        <div style={{ display: "grid", gap: 12 }}>
          <Field label={t("fuel.kahan_le_ja_rahe_ho")}>
            {scopeToggle(f.to_scope || "project", (k) => setF((p) => ({ ...p, to_scope: k,
              to_warehouse_id: k === "warehouse" ? (p.to_warehouse_id || onlyWarehouse) : p.to_warehouse_id })))}
            <div style={{ marginTop: 8 }}>
              {f.to_scope === "warehouse" ? (
                <PickSelect value={f.to_warehouse_id || ""} onChange={(e) => setF((p) => ({ ...p, to_warehouse_id: e.target.value }))} style={inp}>
                  <option value="">{t("fuel.chunein")}</option>
                  {places.warehouses
                    .filter((w) => shiftFor.project_id || Number(shiftFor.warehouse_id) !== Number(w.id))
                    .map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </PickSelect>
              ) : (
                <PickSelect value={f.to_project_id || ""} onChange={(e) => setF((p) => ({ ...p, to_project_id: e.target.value }))} style={inp}>
                  <option value="">{t("fuel.chunein")}</option>
                  {placeProjects
                    .filter((p) => String(p.id) !== String(shiftFor.project_id))
                    .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </PickSelect>
              )}
            </div>
          </Field>
          <Field label={t("fuel.kab_shift_hua")}>
            <input type="datetime-local" value={f.moved_at || ""} onChange={(e) => setF((p) => ({ ...p, moved_at: e.target.value }))} style={inp} />
          </Field>
          <Field label={t("fuel.dipstick_drum_me_kitna_diesel")} hint={t("fuel.kitaab_ke_hisaab_se_l", { l: fmtL(bookL) })}>
            <input value={f.physical_l ?? ""} inputMode="decimal" onChange={(e) => setF((p) => ({ ...p, physical_l: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} />
          </Field>
          {varianceBox}
          <Field label={t("common.note_optional")}><input value={f.note || ""} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} style={inp} /></Field>
          <div style={{ padding: "9px 12px", background: T.indL, border: `1px solid ${T.indM}`, borderRadius: 7, fontSize: 11.5, color: T.ind, fontWeight: 600 }}>
            {t("fuel.shift_se_paisa_nahi_hilta")}
          </div>
          {errorBox}
        </div>
        )}
      </Modal>

      <DipLogModal open={logOpen} onClose={() => setLogOpen(false)} onChanged={onReload} />
    </>
  );
}
// ══════════════════════════════════════════════════════════════════
// SUBCON KO DIESEL — diya hua diesel uske ledger se kat jaata hai
// ------------------------------------------------------------------
// Company subcon ki machine / uske hisse ke kaam me bhi diesel deti hai. Wo
// humara kharcha nahi hai — uska paisa uske khaate se kat'ta hai. Entry save
// karte hi uske ledger par ek credit note ban jaati hai aur uske khule bill
// par apne aap adjust ho jaati hai (server: POST /fuel/subcon-issues).
//
// Barrel se dete waqt rate poochha hi nahi jaata — drum ka apna average rate
// lagta hai, wahi jo apni machine par lagta hai. Pump se seedha dete waqt
// parchi ka rate chahiye, kyunki wahi bill vendor ko dena hai.
// ══════════════════════════════════════════════════════════════════
function SubconTab({ subcons, stores, vendors, projects, from, to, onRange, onReload }) {
  const openEntry = useOpenEntry();
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([
      api.get(`/fuel/subcon-issues?from=${from}&to=${to}`).catch(() => null),
      api.get(`/fuel/reports/subcon?from=${from}&to=${to}`).catch(() => null),
    ]);
    setRows(l?.success ? l.data || [] : []);
    setSummary(s?.success ? s.data || [] : []);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const fromPump = f.source === "pump";
  const store = stores.find((s) => String(s.id) === String(f.store_id));
  const litres = parseFloat(f.litres) || 0;
  // Barrel ka rate drum ka average; pump ka rate parchi se.
  const rate = fromPump ? (parseFloat(f.rate) || 0) : Number(store?.avg_rate || 0);
  const amount = Math.round(litres * rate * 100) / 100;

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const url = await uploadToCloudinary(file);
      setF((p) => ({ ...p, photo_url: url }));
    }
    catch (ex) { setError("Photo upload fail: " + ex.message); }
    setUploading(false);
  };

  const save = async () => {
    setError("");
    if (!f.subcon_party_id) { setError(t("fuel.subcon_select_karo")); return; }
    if (!fromPump && !f.store_id) { setError(t("fuel.barrel_chunein")); return; }
    if (fromPump && !f.vendor_party_id) { setError(t("fuel.pump_vendor_chunein")); return; }
    if (!litres) { setError(t("fuel.litres_bharein")); return; }
    if (fromPump && !rate) { setError(t("fuel.rate_bharein")); return; }
    if (!fromPump && store && litres > Number(store.litres) + 0.001) {
      setError(`${store.name} me sirf ${fmtL(store.litres)} hai`); return;
    }
    // Photo par koi chhoot nahi — subcon ke paise ka saboot yahi hai.
    if (!f.photo_url) { setError(t("fuel.subcon_photo_lazmi")); return; }
    setBusy(true);
    try {
      const r = await api.post("/fuel/subcon-issues", {
        source: fromPump ? "pump" : "store",
        store_id: fromPump ? null : parseInt(f.store_id, 10),
        vendor_party_id: fromPump ? parseInt(f.vendor_party_id, 10) : null,
        subcon_party_id: parseInt(f.subcon_party_id, 10),
        project_id: fromPump && f.project_id ? parseInt(f.project_id, 10) : null,
        litres,
        rate: fromPump ? rate : null,
        amount: fromPump ? amount : null,
        equipment_text: f.equipment_text || null,
        purpose: f.purpose || null,
        issued_at: toSqlDateTime(f.issued_at || nowLocal()),
        payment_mode: fromPump ? (f.payment_mode || "credit") : null,
        cash_source: fromPump && f.payment_mode === "cash" ? (f.cash_source || "wallet") : null,
        slip_no: fromPump ? (f.slip_no || null) : null,
        note: f.note || null,
        photo_urls: [f.photo_url],
      });
      if (r?.success) {
        setOpen(false); setF({});
        if (window.toast && r.message) window.toast.success(r.message);
        await load(); onReload();
      } else setError(r?.message || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  // Hatana = Fuel Delete + wajah (server audit me poori entry rakhta hai).
  const remove = async (r) => {
    const why = await window.promptAsync(t("fuel.subcon_entry_hatane_ki_wajah", { name: r.subcon_name, amt: fmtC(r.amount) }), "");
    if (why == null) return;
    try {
      const res = await api.del(`/fuel/subcon-issues/${r.id}?source=${r.source}&reason=${encodeURIComponent(String(why).trim())}`);
      if (res && res.success === false) { window.alert(res.message || "Delete failed"); return; }
      await load(); onReload();
    } catch (e) { window.alert(e?.message || "Network error"); }
  };

  const totalAmt = summary.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalL = summary.reduce((s, r) => s + Number(r.litres || 0), 0);

  return (
    <>
      <Panel title={t("fuel.subcon_ko_diesel")} action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={from} onChange={(e) => onRange(e.target.value, to)} style={{ ...inp, width: 140 }} />
          <input type="date" value={to} onChange={(e) => onRange(from, e.target.value)} style={{ ...inp, width: 140 }} />
          {canFuelEntry() && (
            <Btn size="sm" icon={IcDrop} onClick={() => { setF({ source: "store", issued_at: nowLocal(), payment_mode: "credit" }); setError(""); setOpen(true); }}>
              {t("fuel.diesel_dein")}
            </Btn>
          )}
        </div>}>
        <div style={{ padding: "10px 13px", background: T.indL, border: `1px solid ${T.indM}`, borderRadius: 7, fontSize: 11.5, color: T.ind, fontWeight: 600, marginBottom: 12 }}>
          {t("fuel.subcon_diesel_ledger_hint")}
        </div>

        {summary.length > 0 && (
          <>
            <Row head cols="1.6fr 110px 130px 150px">
              <span>{t("fuel.subcon")}</span><span>{t("fuel.litres")}</span><span>{t("fuel.value")}</span><span>{t("fuel.aakhri_baar")}</span>
            </Row>
            {summary.map((s) => (
              <Row key={s.subcon_id} cols="1.6fr 110px 130px 150px">
                <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{s.subcon_name || "—"}</span>
                <span style={{ fontSize: 12, color: T.t2 }}>{fmtL(s.litres)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{fmtC(s.amount)}</span>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtDT(s.last_at)}</span>
              </Row>
            ))}
            <Row cols="1.6fr 110px 130px 150px">
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>{t("common.total")}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{fmtL(totalL)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: T.t1 }}>{fmtC(totalAmt)}</span>
              <span />
            </Row>
          </>
        )}
      </Panel>

      <Panel title={t("fuel.kab_kya_diya")}>
        {rows === null && <Empty>{t("common.loading")}</Empty>}
        {rows && rows.length === 0 && <Empty>{t("fuel.abhi_kisi_subcon_ko_diesel_nahi")}</Empty>}
        {rows && rows.length > 0 && (
          <>
            <Row head cols="110px 1.3fr 1.1fr 1.2fr 80px 80px 100px 120px 70px">
              <span>{t("fuel.kab")}</span><span>{t("fuel.subcon")}</span><span>{t("fuel.kahan_se")}</span>
              <span>{t("fuel.machine_kaam")}</span><span>{t("fuel.litres")}</span><span>{t("common.rate")}</span>
              <span>{t("fuel.value")}</span><span>{t("fuel.katauti")}</span><span />
            </Row>
            {rows.map((r) => {
              const adj = Number(r.adjusted || 0);
              const amt = Number(r.amount || 0);
              const pill = !r.recovery_txn_id
                ? { l: t("fuel.recovery_hat_gayi"), c: T.red, bg: T.redL }
                : adj >= amt - 0.005 ? { l: t("fuel.bill_me_adjust"), c: T.grn, bg: T.grnL }
                : adj > 0.005 ? { l: t("fuel.thoda_adjust"), c: T.amb, bg: T.ambL }
                : { l: t("fuel.khula_credit"), c: T.slt, bg: T.sltL };
              return (
                <Row key={r.source + r.id} cols="110px 1.3fr 1.1fr 1.2fr 80px 80px 100px 120px 70px"
                  onClick={() => openEntry({ kind: r.source === "store" ? "issue" : "purchase", id: r.id })}>
                  <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(r.at)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{r.subcon_name || "—"}</span>
                  <span style={{ fontSize: 11.5, color: T.t2 }}>
                    {r.source === "store" ? r.from_name : r.vendor_name}
                    <span style={{ fontSize: 10, color: T.t4 }}> {r.source === "store" ? t("fuel.barrel_2") : t("fuel.pump")}</span>
                  </span>
                  <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[r.equipment_text, r.purpose].filter(Boolean).join(" · ") || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: T.t2 }}>{fmtL(r.litres)}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>₹{fmtN(r.rate)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{fmtC(r.amount)}</span>
                  <span><Pill label={pill.l} c={pill.c} bg={pill.bg} /></span>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {(r.photos || []).length > 0 && (
                      <a href={r.photos[0]} target="_blank" rel="noreferrer" title={t("fuel.photo")} onClick={(ev) => ev.stopPropagation()}
                        style={{ display: "inline-flex", alignItems: "center", color: T.t3 }}>
                        <IcCamera size={15} />
                      </a>
                    )}
                    {can("Fuel", "delete") && (
                      <button type="button" onClick={(ev) => { ev.stopPropagation(); remove(r); }} title={t("common.delete")}
                        style={{ border: "none", background: "none", cursor: "pointer", color: T.t4, padding: 0 }}>
                        <IcTrash size={15} />
                      </button>
                    )}
                  </div>
                </Row>
              );
            })}
          </>
        )}
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title={t("fuel.subcon_ko_diesel_dein")} width={680}
        footer={<><Btn ghost onClick={() => setOpen(false)}>{t("common.cancel")}</Btn>
          <Btn onClick={save} disabled={busy || uploading}>{busy ? t("common.saving") : t("fuel.de_diya")}</Btn></>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={t("fuel.diesel_kahan_se")} span={2}>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ k: "store", l: t("fuel.barrel_se") }, { k: "pump", l: t("fuel.pump_se_seedha") }].map((o) => {
                const on = (f.source || "store") === o.k;
                return (
                  <button key={o.k} type="button" onClick={() => setF((p) => ({ ...p, source: o.k }))}
                    style={{ flex: 1, padding: "9px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 12.5, fontWeight: 700,
                      border: "1.5px solid " + (on ? T.ind : T.b1),
                      background: on ? T.indL : T.surface, color: on ? T.ind : T.t2 }}>{o.l}</button>
                );
              })}
            </div>
          </Field>

          <Field label={t("fuel.kis_subcon_ko")} hint={subcons.length ? null : t("fuel.koi_subcon_nahi")}>
            <PickSelect value={f.subcon_party_id || ""} onChange={(e) => setF((p) => ({ ...p, subcon_party_id: e.target.value }))} style={inp}>
              <option value="">{t("fuel.chunein")}</option>
              {subcons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </PickSelect>
          </Field>

          {fromPump ? (
            <Field label={t("fuel.pump_fuel_vendor")}>
              <PickSelect value={f.vendor_party_id || ""} onChange={(e) => setF((p) => ({ ...p, vendor_party_id: e.target.value }))} style={inp}>
                <option value="">{t("fuel.chunein")}</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </PickSelect>
            </Field>
          ) : (
            <Field label={t("fuel.barrel_store")} hint={store ? t("fuel.rate_drum_ke_average_se", { rate: fmtN(store.avg_rate) }) : null}>
              <PickSelect value={f.store_id || ""} onChange={(e) => setF((p) => ({ ...p, store_id: e.target.value }))} style={inp}>
                <option value="">{t("fuel.chunein")}</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name} — {fmtL(s.litres)} · {placeOf(s)}</option>)}
              </PickSelect>
            </Field>
          )}

          <Field label={t("fuel.litres")}>
            <input value={f.litres || ""} inputMode="decimal" placeholder="0"
              onChange={(e) => setF((p) => ({ ...p, litres: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} />
          </Field>

          {fromPump ? (
            <Field label={t("common.rate")}>
              <input value={f.rate || ""} inputMode="decimal" placeholder="0"
                onChange={(e) => setF((p) => ({ ...p, rate: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} />
            </Field>
          ) : (
            <Field label={t("common.rate")} hint={t("fuel.drum_ka_apna_rate")}>
              <input value={rate ? fmtN(rate) : ""} readOnly style={{ ...inp, background: T.surfaceB, color: T.t3 }} />
            </Field>
          )}

          <Field label={t("fuel.machine_kaam")} hint={t("fuel.subcon_ki_machine_free_text")}>
            <input value={f.equipment_text || ""} onChange={(e) => setF((p) => ({ ...p, equipment_text: e.target.value }))}
              placeholder={t("fuel.e_g_jcb_3dx")} style={inp} />
          </Field>

          <Field label={t("fuel.kis_kaam_ke_liye")}>
            <input value={f.purpose || ""} onChange={(e) => setF((p) => ({ ...p, purpose: e.target.value }))} style={inp} />
          </Field>

          {fromPump && (
            <Field label={t("common.project")} hint={t("fuel.project_pump_wali_cost")}>
              <PickSelect value={f.project_id || ""} onChange={(e) => setF((p) => ({ ...p, project_id: e.target.value }))} style={inp}>
                <option value="">{t("fuel.company_level_koi_project_nahi")}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </PickSelect>
            </Field>
          )}

          {fromPump && (
            <Field label={t("common.payment")}>
              <PickSelect value={f.payment_mode || "credit"} onChange={(e) => setF((p) => ({ ...p, payment_mode: e.target.value }))} style={inp}>
                <option value="credit">{t("fuel.udhaar_credit")}</option>
                <option value="cash">{t("common.cash")}</option>
              </PickSelect>
            </Field>
          )}

          <Field label={t("fuel.kab")}>
            <input type="datetime-local" value={f.issued_at || ""} onChange={(e) => setF((p) => ({ ...p, issued_at: e.target.value }))} style={inp} />
          </Field>

          {fromPump && (
            <Field label={t("fuel.slip_no_optional")}>
              <input value={f.slip_no || ""} onChange={(e) => setF((p) => ({ ...p, slip_no: e.target.value }))} style={inp} />
            </Field>
          )}

          <Field label={t("fuel.photo")} span={2} hint={t("fuel.subcon_photo_kyon")}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="file" accept="image/*" onChange={pickPhoto} style={{ fontSize: 12 }} />
              {uploading && <span style={{ fontSize: 11.5, color: T.t4 }}>{t("fuel.upload_ho_rahi_hai")}</span>}
              {f.photo_url && <a href={f.photo_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: T.ind, fontWeight: 600 }}>{t("fuel.photo_lag_gayi")}</a>}
            </div>
          </Field>

          <Field label={t("common.note_optional")} span={2}>
            <input value={f.note || ""} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} style={inp} />
          </Field>

          <div style={{ gridColumn: "span 2", padding: "10px 13px", borderRadius: 7, background: amount > 0 ? T.grnL : T.surfaceB,
            border: `1px solid ${amount > 0 ? T.grnM : T.b1}`, fontSize: 12.5, fontWeight: 700, color: amount > 0 ? T.grn : T.t3 }}>
            {t("fuel.subcon_ke_khaate_se_katega", { amt: fmtC(amount) })}
          </div>
          {error && <div style={{ gridColumn: "span 2", padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{error}</div>}
        </div>
      </Modal>
    </>
  );
}
// ── UNBILLED — jinka bill abhi aaya hi nahi ─────────────────────
// Wahi kaam jo Material ke Unbilled me hota hai: pump ki entries vendor
// ke hisaab se jodi hui padi hain, finance unhe dekh kar EK bill banata
// hai, aur vendor ka khaata TAB hilta hai.
//
// Har entry ke saath uski slip photo yahin dikhti hai — bill banate waqt
// finance ko yahi teen cheezein chahiye: kitna diesel, kis daam par, aur
// saboot kya hai. Photo dekhne ke liye kahin aur jaana padta to koi
// dekhta hi nahi.
//
// Cash wali entries alag patti me hain. Unka paisa nikal chuka hai,
// isliye unka bill nahi banta — unhe sirf "post" kiya jaata hai, aur tab
// wo kharche me utarti hain (wallet se di gayi ho to us aadmi ke wallet se).
function UnbilledTab({ onReload }) {
  const openEntry = useOpenEntry();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState({});      // { [vendorId]: true }
  const [ticked, setTicked] = useState({});  // { [purchaseId]: true }
  const [billFor, setBillFor] = useState(null);
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(todayStr());
  const [msg, setMsg] = useState(null);
  const [shot, setShot] = useState(null);    // poori photo dekhne ke liye

  const load = useCallback(async () => {
    const r = await api.get("/fuel/unbilled").catch(() => null);
    setData(r && r.success ? r.data : { groups: [], total_entries: 0, total_amount: 0 });
  }, []);
  useEffect(() => { load(); }, [load]);

  // Bill banne se pehle: vendor ko pehle diya paisa is bill me kitna judega
  // (GET /finance/parties/:id/advance). Bill banate hi backend khud jodta hai.
  const [adv, setAdv] = useState(null);
  const billAmt = billFor
    ? billFor.entries.filter((e) => ticked[e.id] && (e.payment_mode || "credit") === "credit")
        .reduce((a, e) => a + Number(e.amount || 0), 0)
    : 0;
  const billParty = billFor ? billFor.vendor_party_id : null;
  useEffect(() => {
    setAdv(null);
    if (!billParty || billAmt <= 0) return undefined;
    let alive = true;
    api.get(`/finance/parties/${billParty}/advance?amount=${billAmt}&date=${billDate}`)
      .then((r) => { if (alive && r && r.success) setAdv(r.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, [billParty, billAmt, billDate]);
  if (!data) return <Empty>{t("common.loading")}</Empty>;
  if (!data.total_entries) return <Empty>{t("fuel.koi_entry_bill_ke_intezaar_me")}</Empty>;

  const pickedIn = (g) => g.entries.filter((e) => ticked[e.id]);
  const toggle = (id) => setTicked((p) => ({ ...p, [id]: !p[id] }));
  const toggleAll = (g, mode) => {
    const next = { ...ticked };
    for (const e of g.entries) if ((e.payment_mode || "credit") === mode) next[e.id] = true;
    setTicked(next);
  };

  const makeBill = async (g) => {
    const picked = pickedIn(g).filter((e) => (e.payment_mode || "credit") === "credit");
    if (!picked.length) return;
    setBusy(true); setMsg(null);
    const r = await api.post("/fuel/bills", {
      purchase_ids: picked.map((e) => e.id),
      bill_no: billNo.trim() || null,
      bill_date: billDate,
    }).catch((e) => ({ success: false, message: e && e.message }));
    setBusy(false);
    const adjAmt = r && r.success && r.data ? Number(r.data.advance_adjusted) || 0 : 0;
    setMsg({ bad: !r || !r.success, text: ((r && r.message) || "Bill nahi ban paya")
      + (adjAmt > 0 ? " · " + t("finance.advance_se_adjust_hua", { amt: fmtC(adjAmt) }) : "") });
    if (r && r.success) {
      setBillFor(null); setBillNo(""); setTicked({});
      await load(); onReload && onReload();
    }
  };

  const postCash = async (g) => {
    const picked = pickedIn(g).filter((e) => e.payment_mode === "cash");
    if (!picked.length) return;
    setBusy(true); setMsg(null);
    const r = await api.post("/fuel/post-cash", { purchase_ids: picked.map((e) => e.id) })
      .catch((e) => ({ success: false, message: e && e.message }));
    setBusy(false);
    setMsg({ bad: !r || !r.success, text: (r && r.message) || "Post nahi ho paya" });
    if (r && r.success) { setTicked({}); await load(); onReload && onReload(); }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {msg && (
        <div style={{ padding: "9px 13px", borderRadius: 8, fontSize: 12,
          background: msg.bad ? T.redL : T.grnL, border: `1px solid ${msg.bad ? T.red : T.grn}`,
          color: msg.bad ? T.red : T.grn, fontWeight: 600 }}>{msg.text}</div>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
        <span style={{ fontSize: 19, fontWeight: 800, color: T.t1 }}>{fmtC(data.total_amount)}</span>
        <span style={{ fontSize: 12, color: T.t3 }}>
          {t("fuel.n_entry_bill_ke_intezaar_me", { n: data.total_entries })}
        </span>
      </div>

      {data.groups.map((g) => {
        const credit = g.entries.filter((e) => (e.payment_mode || "credit") === "credit");
        const cash = g.entries.filter((e) => e.payment_mode === "cash");
        const isOpen = open[g.vendor_party_id] !== false;
        return (
          <Panel key={g.vendor_party_id}
            title={`${g.vendor_name} · ${g.entries.length} fill · ${fmtL(g.litres)}`}
            action={
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {g.flagged > 0 && <Pill label={`${g.flagged} slip mismatch`} c={T.amb} bg={T.ambL} />}
                <b style={{ fontSize: 13, color: T.t1 }}>{fmtC(g.amount)}</b>
                <Btn ghost size="sm" onClick={() => setOpen((p) => ({ ...p, [g.vendor_party_id]: !isOpen }))}>
                  {isOpen ? t("fuel.chhupao") : t("fuel.kholo")}
                </Btn>
              </span>
            }>
            {/* Party hi mit chuki ho to bill kahin ja hi nahi sakta —
                chupchaap fail hone dene se behtar hai pehle hi bata dena. */}
            {g.vendor_missing && (
              <div style={{ padding: "9px 15px", background: T.ambL, borderBottom: `1px solid ${T.b1}`,
                fontSize: 11.5, color: T.amb, fontWeight: 600 }}>
                {t("fuel.is_vendor_ki_party_ab_maujood")}
              </div>
            )}

            {isOpen && (
              <>
                <Row head cols="28px 92px 1fr 76px 68px 92px 90px 70px">
                  <span />
                  <span>{t("common.date")}</span>
                  <span>{t("fuel.machine_barrel")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.litre")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.rate_l")}</span>
                  <span style={{ textAlign: "right" }}>{t("common.amount")}</span>
                  <span>{t("common.payment")}</span>
                  <span>{t("fuel.photo")}</span>
                </Row>
                {g.entries.map((e) => (
                  <Row key={e.id} cols="28px 92px 1fr 76px 68px 92px 90px 70px" onClick={() => openEntry({ kind: "purchase", id: e.id })}>
                    <input type="checkbox" checked={!!ticked[e.id]} onChange={() => toggle(e.id)} onClick={(ev) => ev.stopPropagation()} />
                    <span>{localYmd(e.filled_at)}</span>
                    <span>
                      {e.equipment_name || e.store_name || "—"}
                      {e.fuel_type === "petrol" && <b style={{ color: T.amb }}>{" · " + t("fuel.petrol")}</b>}
                      {e.project_name && <span style={{ color: T.t4 }}>{" · " + e.project_name}</span>}
                      {e.slip_flag === "mismatch" && (
                        <span style={{ color: T.amb, fontWeight: 700 }}>{" · " + t("fuel.slip_se_alag")}</span>
                      )}
                      {e.purpose && <div style={{ fontSize: 10.5, color: T.t4 }}>{e.purpose}</div>}
                    </span>
                    <span style={{ textAlign: "right" }}>{fmtN(e.litres)}</span>
                    <span style={{ textAlign: "right" }}>{fmtN(e.rate)}</span>
                    <span style={{ textAlign: "right", fontWeight: 600 }}>{fmtC(e.amount)}</span>
                    <span style={{ fontSize: 11 }}>
                      {e.payment_mode === "cash"
                        ? (e.cash_source === "company"
                            ? t("fuel.cash_company")
                            : (e.paid_via_staff_name || t("fuel.cash_wallet")))
                        : t("fuel.udhaar")}
                    </span>
                    <span style={{ display: "flex", gap: 3 }}>
                      {(e.photos || []).slice(0, 3).map((u, i) => (
                        <img key={i} src={cld(u, "thumb")} alt="" onClick={(ev) => { ev.stopPropagation(); setShot(u); }}
                          style={{ width: 26, height: 26, objectFit: "cover", borderRadius: 4,
                            border: `1px solid ${T.b1}`, cursor: "pointer" }} />
                      ))}
                      {!(e.photos || []).length && (
                        <span style={{ fontSize: 10.5, color: e.photos_pending ? T.amb : T.t4 }}>
                          {e.photos_pending ? t("fuel.aa_rahi_hai") : "—"}
                        </span>
                      )}
                    </span>
                  </Row>
                ))}

                {/* Bill / cash post = Finance ka Create (server: POST /fuel/bills, /post-cash) */}
                {can("Finance", "create") && <div style={{ padding: "11px 15px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {credit.length > 0 && (
                    <>
                      <Btn ghost size="sm" onClick={() => toggleAll(g, "credit")}>
                        {t("fuel.saari_udhaar_wali_select_karo")}
                      </Btn>
                      <Btn size="sm" disabled={busy || !pickedIn(g).some((e) => (e.payment_mode || "credit") === "credit")}
                        onClick={() => { setBillFor(g); setMsg(null); }}>
                        {t("fuel.bill_banao")}
                      </Btn>
                    </>
                  )}
                  {cash.length > 0 && (
                    <>
                      <Btn ghost size="sm" onClick={() => toggleAll(g, "cash")}>
                        {t("fuel.saari_cash_wali_select_karo")}
                      </Btn>
                      <Btn size="sm" c={T.grn} disabled={busy || !pickedIn(g).some((e) => e.payment_mode === "cash")}
                        onClick={() => postCash(g)}>
                        {t("fuel.cash_post_karo")}
                      </Btn>
                    </>
                  )}
                </div>}
              </>
            )}
          </Panel>
        );
      })}

      <Modal open={!!billFor} onClose={() => setBillFor(null)} width={480}
        title={t("fuel.bill_banao")}
        sub={billFor ? `${billFor.vendor_name} · ${pickedIn(billFor).filter((e) => (e.payment_mode || "credit") === "credit").length} fill` : ""}
        footer={
          <Btn onClick={() => makeBill(billFor)} disabled={busy}>
            {busy ? t("fuel.ban_raha_hai") : t("fuel.bill_banao")}
          </Btn>
        }>
        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          <Field label={t("fuel.pump_ka_bill_number")} hint={t("fuel.na_ho_to_chhod_dein")}>
            <input value={billNo} onChange={(e) => setBillNo(e.target.value)} style={inp} />
          </Field>
          <Field label={t("fuel.bill_ki_date")}>
            <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} style={inp} />
          </Field>
          {billFor && (
            <div style={{ padding: "10px 12px", background: T.surfaceB, borderRadius: 7, fontSize: 12, color: T.t2 }}>
              {t("fuel.vendor_ke_khaate_me_jayega", {
                amt: fmtC(pickedIn(billFor).filter((e) => (e.payment_mode || "credit") === "credit")
                  .reduce((a, e) => a + Number(e.amount || 0), 0)),
              })}
            </div>
          )}
          {adv && adv.on_new_bill && adv.on_new_bill.adjust > 0 && (
            <div style={{ padding: "10px 12px", background: T.grnL, border: `1px solid ${T.grn}`, borderRadius: 7,
              fontSize: 12, color: T.grn, fontWeight: 600 }}>
              {t("finance.advance_adjust_preview", {
                advance: fmtC(adv.advance), adjust: fmtC(adv.on_new_bill.adjust), pending: fmtC(adv.on_new_bill.pending),
              })}
            </div>
          )}
        </div>
      </Modal>

      {shot && (
        <div onClick={() => setShot(null)}
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.8)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={cld(shot, "view")} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

function VendorTab({ vendorRows, from, to, onRange }) {
  const tot = vendorRows.reduce((a, v) => ({
    litres: a.litres + Number(v.litres || 0),
    amount: a.amount + Number(v.amount || 0),
    unpaid: a.unpaid + Number(v.unpaid_amount || 0),
  }), { litres: 0, amount: 0, unpaid: 0 });

  return (
    <Panel title={t("fuel.vendor_ledger")} action={<DateRange from={from} to={to} onRange={onRange} />}>
      {vendorRows.length === 0 && <Empty>{t("fuel.is_duration_me_koi_diesel_kharida")}</Empty>}
      {vendorRows.length > 0 && (
        <>
          <Row head cols="1.6fr 80px 90px 100px 100px 110px 100px">
            <span>{t("fuel.pump_vendor")}</span><span>{t("fuel.fills")}</span><span>{t("fuel.litres")}</span><span>{t("fuel.avg_rate")}</span>
            <span>{t("fuel.udhaar")}</span><span>{t("common.cash")}</span><span style={{ textAlign: "right" }}>{t("common.baaki")}</span>
          </Row>
          {vendorRows.map((v) => (
            <Row key={v.vendor_party_id} cols="1.6fr 80px 90px 100px 100px 110px 100px">
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{v.vendor_name || "—"}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{v.fills}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>{fmtL(v.litres)}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>₹{fmtN(v.avg_rate)}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>{fmtC(v.credit_amount)}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>{fmtC(v.cash_amount)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right", color: Number(v.unpaid_amount) > 0 ? T.amb : T.grn }}>
                {fmtC(v.unpaid_amount)}
              </span>
            </Row>
          ))}
          <Row cols="1.6fr 80px 90px 100px 100px 110px 100px">
            <span style={{ fontSize: 12, fontWeight: 800, color: T.t1 }}>{t("common.total")}</span>
            <span /><span style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{fmtL(tot.litres)}</span>
            <span /><span /><span style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{fmtC(tot.amount)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, textAlign: "right", color: tot.unpaid > 0 ? T.amb : T.grn }}>{fmtC(tot.unpaid)}</span>
          </Row>
          <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
           {t("fuel.baaki_udhaar_ka_wo_hissa_jo")}
          </div>
        </>
      )}
    </Panel>
  );
}

// ══════════════════════════════════════════════════════════════════
// REPORTS
//
// Har report ki ek hi shakl hai: upar filter ki patti, neeche table, aur
// export ke teen button. Button WAHI filter bhejte hain jo patti par lage
// hain — screen, Excel aur PDF teeno hamesha ek hi baat kehte hain.
// ══════════════════════════════════════════════════════════════════

// Chuni hui cheezein chip ban kar dikhti hain — "kitna data dekh rahe ho" ye
// hamesha saamne rehna chahiye, warna aadhi list poori samajh li jaati hai.
const FilterBar = ({ children, chips, onClear }) => (
  <div style={{ background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 9, padding: "10px 12px", display: "grid", gap: 9 }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>{children}</div>
    {chips.length > 0 && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", borderTop: `1px solid ${T.b1}`, paddingTop: 8 }}>
        <span style={{ fontSize: 10, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("fuel.lage_hue_filter")}</span>
        {chips.map((c, i) => (
          <span key={i} style={{ background: T.indL, color: T.ind, border: `1px solid ${T.indM}`, borderRadius: 20, padding: "2px 9px", fontSize: 10.5, fontWeight: 600 }}>
            {c.k}: {c.v}
          </span>
        ))}
        <span onClick={onClear} style={{ fontSize: 10.5, color: T.t3, cursor: "pointer", textDecoration: "underline", marginLeft: 4 }}>{t("fuel.sab_hatao")}</span>
      </div>
    )}
  </div>
);

const FLbl = ({ children }) => (
  <div style={{ fontSize: 9.5, color: T.t4, marginBottom: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>{children}</div>
);

const FSel = ({ label, value, onChange, options, w = 150, placeholder = "Sab" }) => (
  <div>
    <FLbl>{label}</FLbl>
    <PickSelect value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, width: w, padding: "6px 8px", fontSize: 11.5 }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </PickSelect>
  </div>
);

const FInp = ({ label, value, onChange, w = 130, ph }) => (
  <div>
    <FLbl>{label}</FLbl>
    <input type="text" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, width: w, padding: "6px 8px", fontSize: 11.5 }} />
  </div>
);

// Export ke teen button. Busy aur error yahin dikhte hain — PDF server par
// banti hai aur usme 2-3 second lagte hain, isliye chup rehna galat hota.
function ExportBar({ rows, columns, pdfPath, params, baseName, caption, note }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const empty = !rows || rows.length === 0;
  const fname = [baseName, slug(params.from), params.to ? "to-" + slug(params.to) : "",
    slug(params.sector), slug(params.flow)].filter(Boolean).join("-");
  // Excel / PDF / WhatsApp = Fuel ka EXPORT tick (5 Oct 2026) — server ki
  // register / ledger PDF bhi wahi maangti hai.
  const mayExport = can("Fuel", "export");

  const run = async (kind) => {
    setBusy(kind); setMsg(null);
    try {
      if (kind === "xls") {
        exportExcel(rows, columns, fname, baseName);
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

  if (!mayExport) return note ? <span style={{ fontSize: 10.5, color: T.t4 }}>{note}</span> : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
      {note && <span style={{ fontSize: 10.5, color: T.t4 }}>{note}</span>}
      {msg && <span style={{ fontSize: 10.5, fontWeight: 600, color: msg.ok ? T.grn : T.red }}>{msg.t}</span>}
      <Btn size="sm" ghost icon={IcSheet} disabled={empty || !!busy} onClick={() => run("xls")}>{t("common.excel")}</Btn>
      {pdfPath && (
        <Btn size="sm" ghost icon={IcFile} disabled={empty || !!busy} onClick={() => run("pdf")}>
          {busy === "pdf" ? t("fuel.ban_rahi") : "PDF"}
        </Btn>
      )}
      {pdfPath && (
        <Btn size="sm" c={T.grn} icon={IcWa} disabled={empty || !!busy} onClick={() => run("wa")}>
          {busy === "wa" ? "..." : t("common.whatsapp")}
        </Btn>
      )}
    </div>
  );
}

// ── Report 1: DIESEL REGISTER ─────────────────────────────────────
const FLOW_OPTS = [
  { v: "pump_to_machine", get l() { return t("fuel.pump_machine"); } },
  { v: "pump_to_barrel", get l() { return t("fuel.pump_barrel"); } },
  { v: "barrel_to_machine", get l() { return t("fuel.barrel_machine"); } },
];
const KIND_STYLE = {
  pump_to_machine: { get l() { return t("fuel.pump_machine"); }, c: T.blu, bg: T.bluL },
  pump_to_barrel: { get l() { return t("fuel.pump_barrel"); }, c: T.slt, bg: T.sltL },
  barrel_to_machine: { get l() { return t("fuel.barrel_machine"); }, c: T.ind, bg: T.indL },
};
const EMPTY_REG_F = { project_id: "", equipment_id: "", vendor_id: "", store_id: "", sector: "", flow: "", flagged: "" };

function DieselRegister({ projects, equipment, vendors, stores, from, to, onRange }) {
  const openEntry = useOpenEntry();
  const [f, setF] = useState(EMPTY_REG_F);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const params = useMemo(() => ({ from, to, ...f }), [from, to, f]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/fuel/reports/diesel-register?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};
  const chips = data?.applied || [];

  const COLS = [
    { key: "date", label: t("common.date"), w: 11 },
    { key: "kind", label: t("fuel.kahan_se"), w: 16, excel: (r) => KIND_STYLE[r.kind]?.l || r.kind },
    { key: "target", label: t("fuel.machine_barrel_2"), w: 20, excel: (r) => r.machine || r.barrel || "" },
    { key: "from", label: t("fuel.pump_barrel_2"), w: 18 },
    { key: "project", label: t("common.project"), w: 18 },
    { key: "sector", label: t("common.sector"), w: 10 },
    { key: "purpose", label: t("fuel.kis_kaam_ke_liye"), w: 24 },
    { key: "litres", label: t("fuel.litre"), w: 9 },
    { key: "rate", label: t("common.rate"), w: 9 },
    { key: "amount", label: t("common.amount_2"), w: 12, excel: (r) => Math.round(r.amount) },
    { key: "slip_no", label: t("fuel.parchi"), w: 12 },
    { key: "flag", label: t("fuel.farq"), w: 14, excel: (r) => (r.flag === "mismatch" ? "PARCHI SE FARQ" : "") },
    { key: "entered_by", label: t("fuel.kisne_bhara"), w: 16 },
  ];
  const cols = "78px 110px 1.3fr 1.1fr 1fr 66px 1.2fr 62px 58px 82px 92px";

  return (
    <div style={{ display: "grid", gap: 11 }}>
      <FilterBar chips={chips} onClear={() => setF(EMPTY_REG_F)}>
        <div><FLbl>{t("fuel.se_tak")}</FLbl><DateRange from={from} to={to} onRange={onRange} /></div>
        <FSel label={t("common.project")} value={f.project_id} onChange={(v) => set("project_id", v)}
          options={projects.map((x) => ({ v: x.id, l: x.name }))} />
        <FSel label={t("fuel.machine")} value={f.equipment_id} onChange={(v) => set("equipment_id", v)}
          options={equipment.map((x) => ({ v: x.id, l: x.name }))} />
        <FSel label={t("fuel.pump")} value={f.vendor_id} onChange={(v) => set("vendor_id", v)}
          options={vendors.map((x) => ({ v: x.id, l: x.name }))} w={140} />
        <FSel label={t("fuel.barrel_2")} value={f.store_id} onChange={(v) => set("store_id", v)}
          options={stores.map((x) => ({ v: x.id, l: x.name }))} w={140} />
        <FSel label={t("fuel.kahan_se")} value={f.flow} onChange={(v) => set("flow", v)} options={FLOW_OPTS} w={145} />
        <FInp label={t("common.sector")} value={f.sector} onChange={(v) => set("sector", v)} w={95} ph="15" />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.t2, cursor: "pointer", paddingBottom: 6 }}>
          <input type="checkbox" checked={f.flagged === "1"}
            onChange={(e) => set("flagged", e.target.checked ? "1" : "")} />
         {t("fuel.sirf_parchi_farq_wali")}
        </label>
      </FilterBar>

      <Panel
        title={loading ? t("fuel.diesel_register_laa_rahe_hain") : `Diesel Register — ${rows.length} entry`}
        action={<ExportBar rows={rows} columns={COLS} pdfPath="/fuel/reports/diesel-register.pdf"
          params={params} baseName="diesel-register"
          caption={`Diesel Register${from ? ` ${from} se ${to}` : ""} — Sanchalan`} />}>

        {!loading && rows.length === 0 && <Empty>{t("fuel.is_filter_par_koi_entry_nahi")}</Empty>}
        {rows.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.t2 }}><Rich k="fuel.khareeda_fmtl_fmtc" params={{ fmtL: fmtL(tot.bought_litres), fmtC: fmtC(tot.bought_amount) }} /></span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>
               {t("fuel.machine_me_gaya")} <b style={{ color: T.t1 }}>{fmtL(tot.into_machine_litres)}</b>
              </span>
              {tot.flagged > 0 && (
                <span style={{ fontSize: 11.5, color: T.red, fontWeight: 600 }}>{t("fuel.flagged_entry_parchi_se_alag", { flagged: tot.flagged })}</span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1160 }}>
                <Row head cols={cols}>
                  <span>{t("common.date")}</span><span>{t("fuel.kahan_se")}</span><span>{t("fuel.machine_barrel_2")}</span><span>{t("fuel.pump_barrel_2")}</span>
                  <span>{t("common.project")}</span><span>{t("common.sector")}</span><span>{t("fuel.kis_kaam_ke_liye")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.litre")}</span><span style={{ textAlign: "right" }}>{t("common.rate")}</span>
                  <span style={{ textAlign: "right" }}>{t("common.amount_2")}</span><span>{t("fuel.kisne_bhara")}</span>
                </Row>
                {rows.map((r) => {
                  const k = KIND_STYLE[r.kind] || {};
                  return (
                    <Row key={r.kind + r.source_id} cols={cols}
                      onClick={() => openEntry({ kind: r.kind === "barrel_to_machine" ? "issue" : "purchase", id: r.source_id })}>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>{r.date}</span>
                      <span><Pill label={k.l} c={k.c} bg={k.bg} /></span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                        {r.machine || r.barrel}
                        {r.flag === "mismatch" && (
                          <span title={r.flag_note || ""} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: T.red, background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 4, padding: "1px 5px" }}>{t("fuel.parchi_se_farq")}</span>
                        )}
                      </span>
                      <span style={{ fontSize: 11.5, color: T.t3 }}>{r.from}</span>
                      <span style={{ fontSize: 11.5, color: T.t3 }}>{r.project || "—"}</span>
                      <span style={{ fontSize: 11.5, color: T.t3 }}>{r.sector || "—"}</span>
                      <span style={{ fontSize: 11.5, color: T.t2 }}>
                        {r.purpose || <span style={{ color: T.t4 }}>{t("fuel.likha_nahi")}</span>}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtN(r.litres)}</span>
                      <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{fmtN(r.rate)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, textAlign: "right" }}>{fmtC(r.amount)}</span>
                      <span style={{ fontSize: 11, color: T.t4 }}>{r.entered_by || "—"}</span>
                    </Row>
                  );
                })}
              </div>
            </div>
            {tot.truncated && (
              <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.amb, background: T.ambL }}>
               {t("fuel.bahut_zyada_entry_hain_sirf_pehli")}
              </div>
            )}
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
             {t("fuel.khareeda_aur_machine_me_gaya_alag")}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

// ── Report 2: FUEL EFFICIENCY ─────────────────────────────────────
function EfficiencyReport({ byEquipment, from, to, onRange, projects }) {
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState(byEquipment);
  const params = useMemo(() => ({ from, to, project_id: projectId }), [from, to, projectId]);

  useEffect(() => {
    // Bina project ke wahi data jo module pehle hi laa chuka hai — dobara
    // maangna sirf tab jab project chuna gaya ho.
    if (!projectId) { setRows(byEquipment); return; }
    let dead = false;
    api.get(`/fuel/reports/by-equipment?${qs(params)}`)
      .then((r) => { if (!dead) setRows(r?.success ? r.data || [] : []); })
      .catch(() => { if (!dead) setRows([]); });
    return () => { dead = true; };
  }, [params, projectId, byEquipment]);

  const withNorm = rows.filter((e) => e.variance_amount != null);
  const totalVar = withNorm.reduce((a, e) => a + e.variance_amount, 0);
  // Din / trip wali machine ke "ghante" nahi hote (MCH-09) — chali hui ka pata active_days se.
  const ran = (e) => e.hours > 0 || e.active_days > 0;
  const noDiesel = rows.filter((e) => ran(e) && e.litres === 0);

  const COLS = [
    { key: "equipment_name", label: t("fuel.machine"), w: 22 },
    { key: "ownership", label: t("common.ownership"), w: 11 },
    { key: "hours", label: t("fuel.ghante"), w: 9 },
    { key: "active_days", label: t("fuel.din"), w: 7 },
    { key: "norm_litres", label: t("fuel.norm_l"), w: 10, excel: (r) => (r.norm_litres == null ? "" : r.norm_litres) },
    { key: "litres", label: t("fuel.asli_l"), w: 10 },
    { key: "actual_per_hour", label: t("fuel.asli_l_hr"), w: 10, excel: (r) => r.actual_per_hour ?? "" },
    { key: "fuel_per_hour", label: t("fuel.norm_l_hr"), w: 10, excel: (r) => r.fuel_per_hour ?? "" },
    { key: "variance_litres", label: t("fuel.farq_l"), w: 9, excel: (r) => r.variance_litres ?? "" },
    { key: "variance_pct", label: t("fuel.farq_2"), w: 9, excel: (r) => r.variance_pct ?? "" },
    { key: "variance_amount", label: t("fuel.farq_rs"), w: 11, excel: (r) => (r.variance_amount == null ? "" : Math.round(r.variance_amount)) },
    { key: "amount", label: t("fuel.diesel_rs"), w: 12, excel: (r) => Math.round(r.amount) },
    { key: "note", label: t("common.note"), w: 30, excel: (r) => (r.norm_missing ? "Norm set nahi — farq nikal hi nahi sakta"
      : (ran(r) && r.litres === 0 ? "Chali par diesel darj nahi" : "")) },
  ];
  const cols = "1.5fr 74px 68px 50px 72px 72px 98px 72px 74px 100px";

  return (
    <div style={{ display: "grid", gap: 11 }}>
      <FilterBar
        chips={projectId ? [{ k: "Project", v: projects.find((p) => String(p.id) === String(projectId))?.name || projectId }] : []}
        onClear={() => setProjectId("")}>
        <div><FLbl>{t("fuel.se_tak")}</FLbl><DateRange from={from} to={to} onRange={onRange} /></div>
        <FSel label={t("common.project")} value={projectId} onChange={setProjectId}
          options={projects.map((x) => ({ v: x.id, l: x.name }))} />
      </FilterBar>

      {(withNorm.length > 0 || noDiesel.length > 0) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {withNorm.length > 0 && (
            <div style={{ flex: 1, minWidth: 250, padding: "11px 14px", background: totalVar > 0 ? T.redL : T.grnL, border: `1px solid ${totalVar > 0 ? T.redM : T.grnM}`, borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("fuel.norm_se_farq_rupaye_me")}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: totalVar > 0 ? T.red : T.grn, marginTop: 3 }}>
                {totalVar > 0 ? "+" : "−"}{fmtC(Math.abs(totalVar))}
              </div>
              <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>{t("fuel.withnorm_machine_ka_hisaab", { withNorm: withNorm.length })}</div>
            </div>
          )}
          {noDiesel.length > 0 && (
            <div style={{ flex: 1, minWidth: 250, padding: "11px 14px", background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("fuel.chali_par_diesel_darj_nahi")}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: T.amb, marginTop: 3 }}>{noDiesel.length} machine</div>
              <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>
                {noDiesel.slice(0, 3).map((m) => m.equipment_name).join(", ")}{noDiesel.length > 3 ? "…" : ""}
              </div>
            </div>
          )}
        </div>
      )}

      <Panel title={`Fuel Efficiency — ${rows.length} machine`}
        action={<ExportBar rows={rows} columns={COLS} pdfPath="/fuel/reports/efficiency.pdf"
          params={params} baseName="fuel-efficiency"
          caption={`Fuel Efficiency${from ? ` ${from} se ${to}` : ""} — Sanchalan`} />}>
        {rows.length === 0 && <Empty>{t("fuel.is_duration_me_kisi_machine_ka")}</Empty>}
        {rows.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 1010 }}>
              <Row head cols={cols}>
                <span>{t("fuel.machine")}</span><span>{t("fuel.own")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.ghante")}</span><span style={{ textAlign: "right" }}>{t("fuel.din")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.norm_l")}</span><span style={{ textAlign: "right" }}>{t("fuel.asli_l")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.l_hr_asli_norm")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.farq_l")}</span><span style={{ textAlign: "right" }}>{t("fuel.farq_2")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.farq_3")}</span>
              </Row>
              {rows.map((e) => {
                const over = e.variance_litres > 0;
                return (
                  <Row key={e.equipment_id} cols={cols}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{e.equipment_name || `#${e.equipment_id}`}</div>
                      <div style={{ fontSize: 10.5, color: T.t4 }}>
                        {fmtC(e.amount)}
                        {e.norm_missing && <span style={{ color: T.amb }}> {t("fuel.norm_set_nahi")}</span>}
                        {ran(e) && e.litres === 0 && <span style={{ color: T.amb }}> {t("fuel.chali_par_diesel_darj_nahi_2")}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: T.t3 }}>{e.ownership || "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{e.hours ? fmtN(e.hours) : "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{e.active_days || "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{e.norm_litres != null ? fmtN(e.norm_litres) : "—"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtN(e.litres)}</span>
                    <span style={{ fontSize: 11.5, color: T.t2, textAlign: "right" }}>
                      {e.actual_per_hour != null ? fmtN(e.actual_per_hour) : "—"}
                      {e.fuel_per_hour ? <span style={{ color: T.t4 }}> / {fmtN(e.fuel_per_hour)}</span> : null}
                    </span>
                    <span style={{ fontSize: 11.5, textAlign: "right", fontWeight: 600, color: e.variance_litres == null ? T.t4 : over ? T.red : T.grn }}>
                      {e.variance_litres == null ? "—" : `${over ? "+" : ""}${fmtN(e.variance_litres)}`}
                    </span>
                    <span style={{ fontSize: 11.5, textAlign: "right", fontWeight: 600, color: e.variance_pct == null ? T.t4 : over ? T.red : T.grn }}>
                      {e.variance_pct == null ? "—" : `${over ? "+" : ""}${fmtN(e.variance_pct)}%`}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {e.variance_amount == null
                        ? <span style={{ fontSize: 10.5, color: T.t4 }}>—</span>
                        : <Pill label={`${over ? "+" : "−"}${fmtC(Math.abs(e.variance_amount))}`}
                            c={over ? T.red : T.grn} bg={over ? T.redL : T.grnL} />}
                    </span>
                  </Row>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
         {t("fuel.norm_machine_ka_fuel_norm_l")}
        </div>
      </Panel>
    </div>
  );
}

// ── Report 3: PROJECT-WISE ────────────────────────────────────────
function ProjectSpend({ byProject }) {
  // Kharcha rows (pump → machine + drum → machine) aur neeche drum bharne ki
  // alag 'stock' row — wo kharcha nahi, sirf dikhane ko (13 Sep 2026 niyam).
  const nameOf = (r) => (r.kind === "stock" ? t("fuel.drum_me_stock_row")
    : r.project_id ? (r.project_name || `#${r.project_id}`) : t("fuel.company_level_koi_project_nahi"));
  const COLS = [
    { key: "project_name", label: t("common.project"), w: 26, excel: nameOf },
    { key: "entries", label: t("fuel.fills"), w: 9 },
    { key: "litres", label: t("fuel.litres"), w: 11 },
    { key: "amount", label: t("common.amount_2"), w: 13, excel: (r) => Math.round(r.amount) },
  ];
  return (
    <Panel title={t("fuel.project_wise_diesel_kharcha")}
      action={<ExportBar rows={byProject} columns={COLS} params={{}} baseName="project-diesel"
        note="PDF ke liye Diesel Register" />}>
      {byProject.length === 0 && <Empty>{t("fuel.koi_data_nahi")}</Empty>}
      {byProject.length > 0 && (
        <>
          <Row head cols="2fr 100px 110px 120px">
            <span>{t("common.project")}</span><span>{t("fuel.fills")}</span><span>{t("fuel.litres")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span>
          </Row>
          {byProject.map((p) => (
            <Row key={(p.kind || "cost") + (p.project_id || "none")} cols="2fr 100px 110px 120px">
              <span style={{ fontSize: 12.5, fontWeight: 600, color: p.kind === "stock" ? T.t4 : T.t1 }}>{nameOf(p)}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{p.entries}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>{fmtL(p.litres)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: p.kind === "stock" ? T.t4 : T.t1, textAlign: "right" }}>{fmtC(p.amount)}</span>
            </Row>
          ))}
          <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
           {t("fuel.sirf_kharid_ginti_hai_barrel_se")}
          </div>
        </>
      )}
    </Panel>
  );
}

// ── Report 4: BARREL REGISTER ─────────────────────────────────────
// Do shakl: har drum ki ek row, aur kisi ek drum ka poora aana-jaana.
// Ledger me dipstick apni alag row banti hai aur balance NAHI hilati —
// dipstick drum ko dekhta hai, diesel hilata nahi.
const EMPTY_BF = { project_id: "", location: "", low: "" };

function BarrelRegister({ projects }) {
  const [f, setF] = useState(EMPTY_BF);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const params = useMemo(() => ({ ...f }), [f]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/fuel/reports/barrel-register?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};

  const COLS = [
    { key: "barrel", label: t("fuel.barrel_2"), w: 22 },
    { key: "where", label: t("fuel.kahan"), w: 20 },
    { key: "location", label: t("fuel.jagah"), w: 18 },
    { key: "capacity_l", label: t("fuel.capacity_l_2"), w: 11 },
    { key: "litres_in", label: t("fuel.aaya_l"), w: 10 },
    { key: "litres_out", label: t("fuel.gaya_l"), w: 10 },
    { key: "litres_adj", label: t("fuel.adjust_l"), w: 10, excel: (r) => r.litres_adj || "" },
    { key: "litres", label: t("fuel.bacha_l"), w: 10 },
    { key: "fill_pct", label: t("fuel.bhara"), w: 9, excel: (r) => r.fill_pct ?? "" },
    { key: "avg_rate", label: t("fuel.avg_rate"), w: 10, excel: (r) => r.avg_rate ?? "" },
    { key: "value", label: t("fuel.value_rs"), w: 12, excel: (r) => Math.round(r.value) },
    { key: "fills", label: t("fuel.fills"), w: 8 },
    { key: "issues", label: t("common.issues"), w: 8 },
    { key: "last_move", label: t("fuel.aakhri_harkat"), w: 14 },
    { key: "last_check", label: t("fuel.aakhri_dipstick"), w: 14, excel: (r) => r.last_check || "kabhi nahi" },
    { key: "last_variance_l", label: t("fuel.dipstick_farq_l"), w: 14, excel: (r) => r.last_variance_l ?? "" },
  ];
  const cols = "1.4fr 1.2fr 84px 80px 80px 86px 74px 92px 1fr 118px";

  return (
    <div style={{ display: "grid", gap: 11 }}>
      <FilterBar chips={data?.applied || []} onClear={() => setF(EMPTY_BF)}>
        <FSel label={t("common.project")} value={f.project_id} onChange={(v) => set("project_id", v)}
          options={projects.map((x) => ({ v: x.id, l: x.name }))} />
        <FSel label={t("fuel.kahan")} value={f.location} onChange={(v) => set("location", v)}
          options={[{ v: "warehouse", l: t("fuel.sirf_warehouse") }, { v: "project", l: t("fuel.sirf_project_ke") }]} w={150} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.t2, cursor: "pointer", paddingBottom: 6 }}>
          <input type="checkbox" checked={f.low === "1"}
            onChange={(e) => set("low", e.target.checked ? "1" : "")} />
         {t("fuel.sirf_kam_stock_wale")}
        </label>
      </FilterBar>

      <Panel title={loading ? t("fuel.barrel_register_laa_rahe_hain") : `Barrel Register — ${rows.length} barrel`}
        action={<ExportBar rows={rows} columns={COLS} pdfPath="/fuel/reports/barrel-register.pdf"
          params={params} baseName="barrel-register" caption="Barrel Register — Sanchalan" />}>
        {!loading && rows.length === 0 && <Empty>{t("fuel.is_filter_par_koi_barrel_nahi")}</Empty>}
        {rows.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.t2 }}><Rich k="fuel.abhi_bacha_fmtl_fmtc" params={{ fmtL: fmtL(tot.litres), fmtC: fmtC(tot.value) }} /></span>
              <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.aaya_fmtl_gaya_fmtl2", { fmtL: fmtL(tot.litres_in), fmtL2: fmtL(tot.litres_out) })}</span>
              {tot.litres_adj ? <span style={{ fontSize: 11.5, color: T.ind }}>{t("fuel.dip_adjust_total", { litres: signedL(tot.litres_adj) })}</span> : null}
              {tot.below_reorder > 0 && (
                <span style={{ fontSize: 11.5, color: T.amb, fontWeight: 600 }}>{t("fuel.below_reorder_barrel_me_stock_kam", { below_reorder: tot.below_reorder })}</span>
              )}
              {tot.never_checked > 0 && (
                <span style={{ fontSize: 11.5, color: T.t3 }}>{t("fuel.never_checked_par_kabhi_dipstick_nahi", { never_checked: tot.never_checked })}</span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1080 }}>
                <Row head cols={cols}>
                  <span>{t("fuel.barrel_2")}</span><span>{t("fuel.kahan")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.aaya_l")}</span><span style={{ textAlign: "right" }}>{t("fuel.gaya_l")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.bacha_l")}</span><span style={{ textAlign: "right" }}>{t("fuel.bhara_2")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.value")}</span><span>{t("fuel.aakhri_harkat")}</span><span>{t("fuel.aakhri_dipstick")}</span>
                </Row>
                {rows.map((r) => (
                  <Row key={r.store_id} cols={cols} onClick={() => setOpenId(String(r.store_id))}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{r.barrel}</div>
                      {r.capacity_l ? <div style={{ fontSize: 10.5, color: T.t4 }}>{fmtL(r.capacity_l)} ka</div> : null}
                    </div>
                    <span>
                      <Pill label={r.is_warehouse ? t("common.warehouse") : r.where}
                        c={r.is_warehouse ? T.slt : T.ind} bg={r.is_warehouse ? T.sltL : T.indL} />
                      {r.location && <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>{r.location}</div>}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{fmtN(r.litres_in)}</span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{fmtN(r.litres_out)}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: "right", color: r.below_reorder ? T.amb : T.t1 }}>
                      {fmtN(r.litres)}
                      {/* Aaya − gaya ≠ bacha ho to wajah yahin: dipstick se adjust */}
                      {r.litres_adj ? <div style={{ fontSize: 10, fontWeight: 500, color: T.ind }}>{t("fuel.dip_adjust_sub", { litres: signedL(r.litres_adj) })}</div> : null}
                    </span>
                    <span style={{ fontSize: 11.5, textAlign: "right", color: r.below_reorder ? T.amb : T.t3 }}>
                      {r.fill_pct != null ? r.fill_pct + "%" : "—"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, textAlign: "right" }}>{fmtC(r.value)}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>
                      {r.last_move || t("fuel.kabhi_nahi")}
                      {r.idle_days != null && r.idle_days > 30 && (
                        <span style={{ color: T.amb }}>{t("fuel.idle_days_din_se_chhua_nahi", { idle_days: r.idle_days })}</span>
                      )}
                    </span>
                    <span style={{ fontSize: 11 }}>
                      {r.last_check
                        ? <span style={{ color: T.t3 }}><Rich k="fuel.last_check_farqv_rfmtn_l" params={{ last_check: r.last_check, v: " ", r: r.last_variance_l > 0 ? "+" : "", fmtN: fmtN(r.last_variance_l) }} /></span>
                        : <span style={{ color: T.t4 }}>{t("fuel.kabhi_nahi_hua")}</span>}
                      {/* Difference dikhta rahe, par ye bhi ki wo kitaab me utar chuka */}
                      {r.last_check_adjusted && <div style={{ fontSize: 10, color: T.grn, fontWeight: 600 }}>{t("fuel.dip_adjusted_tag")}</div>}
                    </span>
                  </Row>
                ))}
              </div>
            </div>
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
             {t("fuel.kisi_barrel_par_click_karein_uska")}
            </div>
          </>
        )}
      </Panel>

      {openId && <BarrelLedgerPanel storeId={openId} onClose={() => setOpenId("")} />}
    </div>
  );
}

function BarrelLedgerPanel({ storeId, onClose }) {
  const openEntry = useOpenEntry();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => ({ store_id: storeId }), [storeId]);
  // Dipstick reading par request — bhejne ke baad register dobara.
  const [ask, setAsk] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/fuel/reports/barrel-ledger?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params, tick]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};
  const COLS = [
    { key: "date", label: t("common.date"), w: 12 },
    { key: "kind_label", label: t("fuel.kya_hua"), w: 10 },
    { key: "party", label: t("fuel.kis_se_kisme"), w: 22 },
    { key: "in_l", label: t("fuel.aaya_l"), w: 10, excel: (r) => r.in_l ?? "" },
    { key: "out_l", label: t("fuel.gaya_l"), w: 10, excel: (r) => r.out_l ?? "" },
    { key: "rate", label: t("common.rate"), w: 9, excel: (r) => r.rate ?? "" },
    { key: "amount", label: t("common.amount_2"), w: 12, excel: (r) => (r.amount == null ? "" : Math.round(r.amount)) },
    { key: "adjust_l", label: t("fuel.adjust_l"), w: 10, excel: (r) => r.adjust_l ?? "" },
    { key: "balance_l", label: t("fuel.bacha_l"), w: 10 },
    { key: "variance_l", label: t("fuel.dipstick_farq_l"), w: 14, excel: (r) => r.variance_l ?? "" },
    { key: "slip_no", label: t("fuel.parchi"), w: 12 },
    { key: "by_name", label: t("fuel.kisne"), w: 16 },
  ];
  const cols = "78px 78px 1.4fr 72px 72px 62px 92px 78px 1fr";
  const KC = { purchase: { c: T.grn, bg: T.grnL }, issue: { c: T.blu, bg: T.bluL }, check: { c: T.slt, bg: T.sltL },
    adjust: { c: T.ind, bg: T.indL } };

  return (
    <Panel
      title={data ? `${data.store.name} — poora aana-jaana` : t("fuel.barrel_ledger")}
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportBar rows={rows} columns={COLS} pdfPath="/fuel/reports/barrel-ledger.pdf"
            params={params} baseName={`barrel-${slug(data?.store?.name)}`}
            caption={`${data?.store?.name || "Barrel"} ka register — Sanchalan`} />
          <Btn size="sm" ghost onClick={onClose}>{t("fuel.band_karein")}</Btn>
        </div>}>
      {loading && <Empty>{t("fuel.laa_rahe_hain")}</Empty>}
      {!loading && rows.length === 0 && <Empty>{t("fuel.is_barrel_me_abhi_koi_entry")}</Empty>}
      {rows.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.aaya")} <b style={{ color: T.t1 }}>{fmtL(tot.litres_in)}</b></span>
            <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.gaya")} <b style={{ color: T.t1 }}>{fmtL(tot.litres_out)}</b></span>
            <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.bacha")} <b style={{ color: T.t1 }}>{fmtL(tot.closing_l)}</b></span>
            {tot.checks > 0 && <span style={{ fontSize: 11.5, color: T.t3 }}>{tot.checks} dipstick</span>}
            {tot.adjust_l ? <span style={{ fontSize: 11.5, color: T.ind }}>{t("fuel.dip_adjust_total", { litres: signedL(tot.adjust_l) })}</span> : null}
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 940 }}>
              <Row head cols={cols}>
                <span>{t("common.date")}</span><span>{t("fuel.kya_hua")}</span><span>{t("fuel.kis_se_kisme")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.aaya")}</span><span style={{ textAlign: "right" }}>{t("fuel.gaya")}</span>
                <span style={{ textAlign: "right" }}>{t("common.rate")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.bacha")}</span><span>{t("common.note")}</span>
              </Row>
              {rows.map((r, i) => {
                const k = KC[r.kind] || {};
                return (
                  <div key={i}>
                  <Row cols={cols}
                    onClick={(r.kind === "purchase" || r.kind === "issue") && r.id ? () => openEntry({ kind: r.kind, id: r.id }) : undefined}>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{r.date}</span>
                    <span><Pill label={r.kind_label} c={k.c} bg={k.bg} /></span>
                    <span style={{ fontSize: 11.5, color: T.t2 }}>{r.party}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: r.in_l ? T.grn : T.t4, textAlign: "right" }}>
                      {r.in_l != null ? fmtN(r.in_l) : "—"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: r.out_l ? T.blu : T.t4, textAlign: "right" }}>
                      {r.out_l != null ? fmtN(r.out_l) : "—"}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{r.rate != null ? fmtN(r.rate) : "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t2, textAlign: "right" }}>{r.amount != null ? fmtC(r.amount) : "—"}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtN(r.balance_l)}</span>
                    <span style={{ fontSize: 10.5, color: T.t3 }}>
                      {r.kind === "check"
                        ? <><Rich k="fuel.physical_fmtn_vs_kitaab_fmtn2_v" params={{ fmtN: fmtN(r.physical_l), fmtN2: fmtN(r.book_l), v: " ", r: r.variance_l > 0 ? "+" : "", fmtN3: fmtN(r.variance_l) }} /></>
                        : r.kind === "adjust"
                        ? <span style={{ color: T.ind, fontWeight: 600 }}>{t("fuel.dip_adjust_note", { litres: signedL(r.adjust_l) })}</span>
                        : [r.slip_no ? "slip " + r.slip_no : "", r.payment !== "—" ? r.payment : "", r.by_name]
                            .filter(Boolean).join(" · ")}
                    </span>
                  </Row>
                  {(r.kind === "check" || r.kind === "shift") && (
                    <DipActions row={r} onAsk={(kind, d) => setAsk({ kind, d })} />
                  )}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
           {t("fuel.bacha_wala_column_dipstick_par_nahi")}
          </div>
        </>
      )}
      <DipRequestModal ask={ask} storeName={data?.store?.name} onClose={() => setAsk(null)}
        onDone={() => { setAsk(null); setTick((x) => x + 1); }} />
    </Panel>
  );
}

// ── Report 5: PUMP REGISTER ───────────────────────────────────────
// Kaagaz wala pump register. Pump par click karne se uska poora register
// khulta hai — chalte hue jod ke saath, kyunki mahine ke aakhir me pump ka
// apna bill isi ke saamne rakh kar tick kiya jaata hai.
//
// Sirf KHARID yahan aati hai — barrel se nikaasi ka pump se lena-dena nahi.
const EMPTY_PF = { project_id: "", payment_mode: "", flagged: "" };

// Fill ka paisa kis haal me — server ka payable_status (utils/fuelPayable.js).
const payableLabel = (s) => (s === "cash" ? t("common.cash")
  : s === "unbilled" ? t("fuel.payable_unbilled")
  : s === "partial" ? t("fuel.payable_partial")
  : s === "unpaid" ? t("fuel.payable_unpaid")
  : t("fuel.payable_paid"));

function PumpRegister({ projects, from, to, onRange }) {
  const [f, setF] = useState(EMPTY_PF);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const params = useMemo(() => ({ from, to, ...f }), [from, to, f]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/fuel/reports/pump-register?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};

  const COLS = [
    { key: "pump", label: t("fuel.pump"), w: 24 },
    { key: "fills", label: t("fuel.fills"), w: 8 },
    { key: "litres", label: t("fuel.litre"), w: 11 },
    { key: "avg_rate", label: t("fuel.avg_rate"), w: 10, excel: (r) => r.avg_rate ?? "" },
    { key: "rate_min", label: t("fuel.rate_kam"), w: 10 },
    { key: "rate_max", label: t("fuel.rate_zyada"), w: 10 },
    { key: "cash_amount", label: t("fuel.cash_rs"), w: 12, excel: (r) => Math.round(r.cash_amount) },
    { key: "credit_amount", label: t("fuel.udhaar_rs"), w: 12, excel: (r) => Math.round(r.credit_amount) },
    { key: "unpaid_amount", label: t("fuel.baaki_rs"), w: 12, excel: (r) => Math.round(r.unpaid_amount) },
    { key: "amount", label: t("fuel.kul_rs"), w: 13, excel: (r) => Math.round(r.amount) },
    { key: "first_at", label: t("fuel.pehli_fill"), w: 12 },
    { key: "last_at", label: t("fuel.aakhri_fill"), w: 12 },
    { key: "flagged", label: t("fuel.parchi_se_farq_2"), w: 13 },
    { key: "no_slip", label: t("fuel.bina_parchi"), w: 12 },
  ];
  const cols = "1.5fr 62px 84px 92px 110px 96px 100px 104px 1fr";

  return (
    <div style={{ display: "grid", gap: 11 }}>
      <FilterBar chips={data?.applied || []} onClear={() => setF(EMPTY_PF)}>
        <div><FLbl>{t("fuel.se_tak")}</FLbl><DateRange from={from} to={to} onRange={onRange} /></div>
        <FSel label={t("common.project")} value={f.project_id} onChange={(v) => set("project_id", v)}
          options={projects.map((x) => ({ v: x.id, l: x.name }))} />
        <FSel label={t("common.payment")} value={f.payment_mode} onChange={(v) => set("payment_mode", v)}
          options={[{ v: "cash", l: t("common.cash") }, { v: "credit", l: t("fuel.udhaar") }]} w={120} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.t2, cursor: "pointer", paddingBottom: 6 }}>
          <input type="checkbox" checked={f.flagged === "1"}
            onChange={(e) => set("flagged", e.target.checked ? "1" : "")} />
         {t("fuel.sirf_parchi_farq_wale_pump")}
        </label>
      </FilterBar>

      <Panel title={loading ? t("fuel.pump_register_laa_rahe_hain") : `Pump Register — ${rows.length} pump`}
        action={<ExportBar rows={rows} columns={COLS} pdfPath="/fuel/reports/pump-register.pdf"
          params={params} baseName="pump-register"
          caption={`Pump Register${from ? ` ${from} se ${to}` : ""} — Sanchalan`} />}>
        {!loading && rows.length === 0 && <Empty>{t("fuel.is_filter_par_kisi_pump_se")}</Empty>}
        {rows.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: T.t2 }}><Rich k="fuel.fills_fills_fmtl_fmtc" params={{ fills: tot.fills, fmtL: fmtL(tot.litres), fmtC: fmtC(tot.amount) }} /></span>
              {tot.avg_rate != null && (
                <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.average_rate")} <b style={{ color: T.t1 }}>₹{fmtN(tot.avg_rate)}</b></span>
              )}
              {tot.unpaid_amount > 0 && (
                <span style={{ fontSize: 11.5, color: T.amb, fontWeight: 600 }}>{t("fuel.baaki_fmtc", { fmtC: fmtC(tot.unpaid_amount) })}</span>
              )}
              {tot.flagged > 0 && (
                <span style={{ fontSize: 11.5, color: T.red, fontWeight: 600 }}>{t("fuel.flagged_parchi_entry_se_alag", { flagged: tot.flagged })}</span>
              )}
              {tot.no_slip > 0 && (
                <span style={{ fontSize: 11.5, color: T.t3 }}>{t("fuel.no_slip_bina_parchi", { no_slip: tot.no_slip })}</span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 1080 }}>
                <Row head cols={cols}>
                  <span>{t("fuel.pump")}</span><span style={{ textAlign: "right" }}>{t("fuel.fills")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.litre")}</span><span style={{ textAlign: "right" }}>{t("fuel.avg_rate")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.cash_udhaar")}</span><span style={{ textAlign: "right" }}>{t("common.baaki")}</span>
                  <span style={{ textAlign: "right" }}>{t("fuel.kul")}</span><span>{t("fuel.kab_se_kab_tak")}</span><span>{t("common.note")}</span>
                </Row>
                {rows.map((r) => (
                  <Row key={r.vendor_party_id} cols={cols} onClick={() => setOpenId(String(r.vendor_party_id))}>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{r.pump}</div>
                      {/* Ek hi pump ka bhaav duration me kitna hila — ye khud
                          ek sawaal hai, isliye naam ke neeche hi dikhta hai. */}
                      {r.rate_spread > 0 && (
                        <div style={{ fontSize: 10.5, color: T.t4 }}>{t("fuel.rate_fmtn_fmtn2", { fmtN: fmtN(r.rate_min), fmtN2: fmtN(r.rate_max) })}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{r.fills}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtN(r.litres)}</span>
                    <span style={{ fontSize: 12, color: T.t2, textAlign: "right" }}>
                      {r.avg_rate != null ? "₹" + fmtN(r.avg_rate) : "—"}
                    </span>
                    <span style={{ fontSize: 11, color: T.t3, textAlign: "right" }}>
                      {fmtC(r.cash_amount)} <span style={{ color: T.t4 }}>/</span> {fmtC(r.credit_amount)}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {r.unpaid_amount > 0
                        ? <Pill label={fmtC(r.unpaid_amount)} c={T.amb} bg={T.ambL} />
                        : <span style={{ fontSize: 11, color: T.grn }}>{t("fuel.sab_settle")}</span>}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtC(r.amount)}</span>
                    <span style={{ fontSize: 11, color: T.t3 }}>
                      {r.first_at}{r.last_at !== r.first_at ? ` se ${r.last_at}` : ""}
                    </span>
                    <span style={{ fontSize: 11 }}>
                      {r.flagged > 0 && <Pill label={`${r.flagged} parchi se alag`} c={T.red} bg={T.redL} />}
                      {r.no_slip > 0 && (
                        <span style={{ color: T.t4, marginLeft: r.flagged ? 6 : 0 }}>{t("fuel.no_slip_bina_parchi", { no_slip: r.no_slip })}</span>
                      )}
                      {!r.flagged && !r.no_slip && <span style={{ color: T.t4 }}>—</span>}
                    </span>
                  </Row>
                ))}
              </div>
            </div>
            <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
             {t("fuel.kisi_pump_par_click_karein_uska")}
            </div>
          </>
        )}
      </Panel>

      {openId && <PumpLedgerPanel vendorId={openId} from={from} to={to} onClose={() => setOpenId("")} />}
    </div>
  );
}

function PumpLedgerPanel({ vendorId, from, to, onClose }) {
  const openEntry = useOpenEntry();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => ({ vendor_id: vendorId, from, to }), [vendorId, from, to]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/fuel/reports/pump-ledger?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params]);

  const rows = data?.rows || [];
  const tot = data?.totals || {};
  const COLS = [
    { key: "date", label: t("common.date"), w: 12 },
    { key: "slip_no", label: t("fuel.parchi"), w: 13 },
    { key: "to", label: t("fuel.kisme_dala"), w: 22 },
    { key: "project", label: t("common.project"), w: 20 },
    { key: "litres", label: t("fuel.litre"), w: 9 },
    { key: "rate", label: t("common.rate"), w: 9 },
    { key: "amount", label: t("common.amount_2"), w: 12, excel: (r) => Math.round(r.amount) },
    { key: "payment", label: t("common.payment"), w: 10 },
    { key: "status", label: t("common.status"), w: 12, excel: (r) => payableLabel(r.payable_status) },
    { key: "run_litres", label: t("fuel.ab_tak_l"), w: 11 },
    { key: "run_amount", label: t("fuel.ab_tak_rs"), w: 13, excel: (r) => Math.round(r.run_amount) },
    { key: "flag", label: t("fuel.parchi_se_farq_2"), w: 16,
      excel: (r) => (r.flag === "mismatch" ? `parchi ${r.slip_read_litres ?? "?"} L / entry ${r.litres} L` : "") },
    { key: "entered_by", label: t("fuel.kisne_bhara"), w: 16 },
  ];
  const cols = "76px 88px 1.3fr 1fr 62px 56px 84px 76px 82px 96px";

  return (
    <Panel
      title={data ? `${data.pump.name} — poora register` : t("fuel.pump_register")}
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ExportBar rows={rows} columns={COLS} pdfPath="/fuel/reports/pump-ledger.pdf"
            params={params} baseName={`pump-${slug(data?.pump?.name)}`}
            caption={`${data?.pump?.name || "Pump"} ka register — Sanchalan`} />
          <Btn size="sm" ghost onClick={onClose}>{t("fuel.band_karein")}</Btn>
        </div>}>
      {loading && <Empty>{t("fuel.laa_rahe_hain")}</Empty>}
      {!loading && rows.length === 0 && <Empty>{t("fuel.is_duration_me_is_pump_se")}</Empty>}
      {rows.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 18, padding: "9px 15px", background: T.indL, borderBottom: `1px solid ${T.b1}`, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: T.t2 }}><Rich k="fuel.fills_fills_fmtl_fmtc" params={{ fills: tot.fills, fmtL: fmtL(tot.litres), fmtC: fmtC(tot.amount) }} /></span>
            {tot.avg_rate != null && <span style={{ fontSize: 11.5, color: T.t2 }}>{t("fuel.average_fmtn", { fmtN: fmtN(tot.avg_rate) })}</span>}
            {tot.unpaid_amount > 0 && <span style={{ fontSize: 11.5, color: T.amb, fontWeight: 600 }}>{t("fuel.baaki_fmtc", { fmtC: fmtC(tot.unpaid_amount) })}</span>}
            {tot.flagged > 0 && <span style={{ fontSize: 11.5, color: T.red, fontWeight: 600 }}>{t("fuel.flagged_parchi_se_alag", { flagged: tot.flagged })}</span>}
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 1040 }}>
              <Row head cols={cols}>
                <span>{t("common.date")}</span><span>{t("fuel.parchi")}</span><span>{t("fuel.kisme_dala")}</span><span>{t("common.project")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.litre")}</span><span style={{ textAlign: "right" }}>{t("common.rate")}</span>
                <span style={{ textAlign: "right" }}>{t("common.amount_2")}</span><span>{t("common.payment")}</span>
                <span style={{ textAlign: "right" }}>{t("fuel.ab_tak_l")}</span><span style={{ textAlign: "right" }}>{t("fuel.ab_tak")}</span>
              </Row>
              {rows.map((r) => (
                <Row key={r.purchase_id} cols={cols} onClick={() => openEntry({ kind: "purchase", id: r.purchase_id })}>
                  <span style={{ fontSize: 11.5, color: T.t2 }}>{r.date}</span>
                  <span style={{ fontSize: 11.5, color: r.slip_no ? T.t2 : T.t4 }}>
                    {r.slip_no || t("fuel.bina_parchi_2")}
                    {r.flag === "mismatch" && (
                      <div title={r.flag_note || ""} style={{ fontSize: 9, fontWeight: 800, color: T.red }}>
                        parchi {r.slip_read_litres != null ? fmtN(r.slip_read_litres) + " L" : "alag"}
                      </div>
                    )}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>
                    {r.to}
                    {r.to_kind === "barrel" && <span style={{ fontSize: 10, color: T.t4 }}> {t("fuel.barrel_3")}</span>}
                  </span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{r.project || "—"}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, textAlign: "right" }}>{fmtN(r.litres)}</span>
                  <span style={{ fontSize: 11.5, color: T.t3, textAlign: "right" }}>{fmtN(r.rate)}</span>
                  <span style={{ fontSize: 12, color: T.t1, textAlign: "right" }}>{fmtC(r.amount)}</span>
                  <span style={{ fontSize: 11 }}>
                    <Pill label={r.payment} c={r.payment === "Cash" ? T.grn : T.slt}
                      bg={r.payment === "Cash" ? T.grnL : T.sltL} />
                    {["unbilled", "unpaid", "partial"].includes(r.payable_status) && (
                      <span style={{ fontSize: 9.5, color: T.amb, fontWeight: 700, marginLeft: 4 }}>{payableLabel(r.payable_status)}</span>
                    )}
                  </span>
                  {/* Chalta hua jod — bill milaate waqt sawaal "ab tak kitna
                      hua" hota hai, "kul kitna hua" nahi. */}
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: T.t2, textAlign: "right" }}>{fmtN(r.run_litres)}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtC(r.run_amount)}</span>
                </Row>
              ))}
            </div>
          </div>
          <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
           {t("fuel.ab_tak_wale_khaane_pump_ke")}
          </div>
        </>
      )}
    </Panel>
  );
}

function ReportsTab({ byEquipment, byProject, from, to, onRange, projects, equipment, vendors, stores }) {
  const [sub, setSub] = useState("register");
  const SUBS = [
    { id: "register", l: t("fuel.diesel_register") },
    { id: "eff", l: t("fuel.fuel_efficiency") },
    { id: "barrel", l: t("fuel.barrel_register") },
    { id: "pump", l: t("fuel.pump_register_2") },
    { id: "project", l: t("fuel.project_wise") },
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
      {sub === "register" && (
        <DieselRegister projects={projects} equipment={equipment} vendors={vendors} stores={stores}
          from={from} to={to} onRange={onRange} />
      )}
      {sub === "eff" && (
        <EfficiencyReport byEquipment={byEquipment} from={from} to={to} onRange={onRange} projects={projects} />
      )}
      {sub === "barrel" && <BarrelRegister projects={projects} />}
      {sub === "pump" && <PumpRegister projects={projects} from={from} to={to} onRange={onRange} />}
      {sub === "project" && <ProjectSpend byProject={byProject} />}
    </div>
  );
}


// Cross-check compares a manual entry against a sensor reading or a physical
// dip. Sensor side telematics se aata hai (/fuel/sensor-checks) — GPS/fuel
// sensor jud'ne ke baad hi; tab tak wo checks "Baaki hai" dikhte hain aur
// khaali jagah bharne ko kuch gadha nahi jaata.
function CrossCheckTab({ stores, byEquipment, purchases, issues, sensor, onReload }) {
  const openEntry = useOpenEntry();
  // Meter reading jispar shak hai — pichhli reading se kam ya namumkin badi.
  // Entry rukti nahi (30 Sep 2026 se), isliye yahi jagah hai jahan use dekha jaata hai.
  const meterFlagged = [
    ...(purchases || []).filter((p) => p.meter_flag).map((p) => ({ ...p, _k: "purchase", _at: p.filled_at })),
    ...(issues || []).filter((i) => i.meter_flag).map((i) => ({ ...i, _k: "issue", _at: i.issued_at })),
  ].sort((a, b) => new Date(b._at) - new Date(a._at));
  // Jin entries par parchi padhi gayi thi aur ankde nahi mile — yahi wo
  // "Flagged entries" hai jo ab tak khaali rehti thi.
  const flagged = (purchases || []).filter((p) => p.slip_flag === "mismatch");
  const withStock = stores.filter((s) => Number(s.litres) > 0);
  const noNormCount = byEquipment.filter((e) => e.norm_missing).length;
  const sensorOn = !!(sensor && sensor.enabled);
  const CheckRow = ({ name, live, note }) => (
    <Row cols="1.6fr 110px 1.4fr">
      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{name}</span>
      <span>{live
        ? <Pill label={t("fuel.chaalu")} c={T.grn} bg={T.grnL} />
        : <Pill label={t("fuel.baaki_hai")} c={T.t3} bg={T.sltL} />}</span>
      <span style={{ fontSize: 11.5, color: T.t3 }}>{note}</span>
    </Row>
  );

  // Sensor fill jinme dikkat hai — entry mili hi nahi, ya litre 15% se zyada
  // alag. "ok" wali rows ginti me hain par list me nahi; theek cheez ki
  // lambi list me hi asli dikkat kho jaati hai.
  const fills = sensorOn ? sensor.fills || [] : [];
  const fillIssues = fills.filter((f) => f.status !== "ok");
  const noSensor = sensorOn ? sensor.entries_without_sensor || [] : [];
  const drops = sensorOn ? (sensor.drops || []).filter((d) => d.review_status !== "ok") : [];

  const review = async (id) => {
    const r = await api.post(`/telematics/events/${id}/review`, { status: "ok" });
    if (r && r.success === false) { window.alert(r.message || "Nahi hua"); return; }
    onReload && onReload();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: "11px 14px", background: T.indL, border: `1px solid ${T.indM}`, borderRadius: 8, fontSize: 12, color: T.ind, lineHeight: 1.55 }}>
       {t("fuel.manual_entry_vs_sensor_physical_jahan")}
      </div>

      <Panel title={t("fuel.kaunsi_jaanch_abhi_chalu_hai")}>
        <CheckRow name="Barrel ka dipstick check" live
          note={`${withStock.length} drum me stock hai — Barrel Stock tab se "Dipstick"`} />
        <CheckRow name="Norm vs actual (litre/ghanta)" live
          note={"Reports tab me variance" + (noNormCount > 0 ? ` · ${noNormCount} machine ka norm baaki` : "")} />
        <CheckRow name="Fill vs sensor (level jump)" live={sensorOn}
          note={sensorOn ? `${sensor.fls_machines} machine par fuel sensor juda hai` : "Machinery → GPS se unit jodne ke baad"} />
        <CheckRow name="Raat ka fuel drop" live={sensorOn}
          note={sensorOn ? "Sensor ke drop events neeche" : "Sensor ke bina pata nahi chalta"} />
      </Panel>

      {sensorOn && (
        <Panel title={`Sensor fill vs entry — pichhle 30 din (${fills.length} fill, ${fillIssues.length} me dikkat)`}>
          {fillIssues.length === 0 && noSensor.length === 0 ? (
            <Empty>{t("fuel.sensor_ke_har_fill_ki_entry")}<br />
              <span style={{ fontSize: 11.5 }}>{t("fuel.jaanch_chal_rahi_hai_farq_aate")}</span></Empty>
          ) : (
            <>
              {fillIssues.map((f) => (
                <Row key={f.id} cols="120px 1.4fr 1fr 1.2fr">
                  <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(f.time)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{f.machine}
                    {f.location ? <span style={{ fontWeight: 400, color: T.t4, fontSize: 10.5 }}> · {f.location}</span> : null}</span>
                  <span style={{ fontSize: 11.5, fontFamily: "monospace" }}>
                    sensor {fmtL(f.sensor_l)}{f.entry_l != null ? ` · entry ${fmtL(f.entry_l)}` : ""}
                  </span>
                  {f.status === "no_entry" ? (
                    <span style={{ fontSize: 11.5, color: T.red, fontWeight: 600 }}>{t("fuel.diesel_gaya_entry_nahi_mili")}</span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: T.amb, fontWeight: 600 }}>{t("fuel.farq_fmtl_delta_pct", { fmtL: fmtL(Math.abs((f.entry_l || 0) - (f.sensor_l || 0))), delta_pct: f.delta_pct })}</span>
                  )}
                </Row>
              ))}
              {noSensor.map((e) => (
                <Row key={e.kind + e.id} cols="120px 1.4fr 1fr 1.2fr">
                  <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(e.at)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{e.machine}</span>
                  <span style={{ fontSize: 11.5, fontFamily: "monospace" }}>entry {fmtL(e.litres)}</span>
                  <span style={{ fontSize: 11.5, color: T.amb, fontWeight: 600 }}>{t("fuel.entry_hai_sensor_ne_fill_nahi")}</span>
                </Row>
              ))}
              <div style={{ fontSize: 11, color: T.t4, padding: "9px 14px" }}>
               {t("fuel.entry_nahi_mili_ka_matlab_chori")}
              </div>
            </>
          )}
        </Panel>
      )}

      {sensorOn && (
        <Panel title={`Fuel drop — engine band tha aur level gira (${drops.length})`}>
          {drops.length === 0 ? (
            <Empty>{t("fuel.koi_bina_jaancha_drop_nahi")}</Empty>
          ) : (
            <>
              {drops.map((d) => (
                <Row key={d.id} cols="120px 1.4fr 90px 1fr 110px">
                  <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(d.time)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{d.machine}</span>
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: T.red, fontWeight: 700 }}>−{fmtL(d.litres)}</span>
                  <span style={{ fontSize: 11, color: T.t3 }}>{d.location || "—"}</span>
                  <span style={{ textAlign: "right" }}>
                    {can("Machinery", "create") && <Btn size="sm" ghost onClick={() => review(d.id)}>{t("fuel.theek_tha")}</Btn>}
                  </span>
                </Row>
              ))}
              <div style={{ fontSize: 11, color: T.t4, padding: "9px 14px" }}>
               {t("fuel.drop_sensor_ka_andaza_chori_ka")}
              </div>
            </>
          )}
        </Panel>
      )}

      <Panel title={t("fuel.meter_shak_wali_entries", { n: meterFlagged.length })}>
        {meterFlagged.length === 0 ? (
          <Empty>{t("fuel.meter_shak_koi_nahi")}</Empty>
        ) : (
          <>
            {meterFlagged.map((r) => (
              <div key={r._k + r.id} onClick={() => openEntry({ kind: r._k, id: r.id })}
                style={{ padding: "11px 0", borderBottom: "1px solid " + T.border, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {r.equipment_name || "—"}
                    <span style={{ fontWeight: 500, color: T.t4, fontSize: 11.5 }}>
                      {"  "}{fmtDT(r._at)} · {r._k === "purchase" ? (r.vendor_party_name || r.vendor_name || "") : (r.store_name || "")}
                    </span>
                  </span>
                  <span style={{ fontSize: 12.5, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {t("fuel.meter_n", { n: fmtN(r.meter_reading) })}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.amb, marginTop: 4 }}>{r.meter_note}</div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: T.t4, marginTop: 10 }}>{t("fuel.meter_shak_kaise_theek")}</div>
          </>
        )}
      </Panel>

      {/* Parchi vs entry — ab ye khaali nahi rehta. Jis entry par AI ne parchi
          padhi thi aur ankde nahi mile, wo yahan khud aa jaati hai. */}
      <Panel title={t("fuel.parchi_aur_entry_me_farq")}>
        {flagged.length === 0 ? (
          <Empty>
           {t("fuel.abhi_koi_farq_nahi_mila")}<br />
            <span style={{ fontSize: 11.5 }}>
             {t("fuel.entry_karte_waqt_parchi_ki_photo")}
            </span>
          </Empty>
        ) : (
          <>
            {flagged.map((p) => (
              <div key={p.id} style={{ padding: "11px 0", borderBottom: "1px solid " + T.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {p.vendor_party_name || p.vendor_name || "—"}
                    <span style={{ fontWeight: 500, color: T.t4, fontSize: 11.5 }}>
                      {"  "}{localYmd(p.filled_at)}{p.slip_no ? ` · slip ${p.slip_no}` : ""}
                    </span>
                  </span>
                  <span style={{ fontSize: 12.5, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {fmtL(p.litres)} · {fmtC(p.amount)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: T.red, marginTop: 4 }}>{p.slip_note}</div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: T.t4, marginTop: 10 }}>
             {t("fuel.farq_apne_aap_theek_nahi_kiya")}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}

const DateRange = ({ from, to, onRange }) => (
  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
    <input type="date" value={from} onChange={(e) => onRange(e.target.value, to)}
      style={{ ...inp, width: 140, padding: "6px 9px", fontSize: 11.5 }} />
    <span style={{ fontSize: 11, color: T.t4 }}>se</span>
    <input type="date" value={to} onChange={(e) => onRange(from, e.target.value)}
      style={{ ...inp, width: 140, padding: "6px 9px", fontSize: 11.5 }} />
  </div>
);

// ══════════════════════════════════════════════════════════════════
// LEDGER DRAWER
// ══════════════════════════════════════════════════════════════════
function LedgerModal({ store, onClose, onChanged }) {
  const openEntry = useOpenEntry();
  const [data, setData] = useState(null);
  // Dipstick reading par request ka modal + bhejne ke baad ledger dobara.
  const [ask, setAsk] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!store) { setData(null); return; }
    api.get(`/fuel/stores/${store.id}/ledger`)
      .then((r) => setData(r?.success ? r.data : null))
      .catch(() => setData(null));
  }, [store, tick]);

  return (
    <>
    <Modal open={!!store} onClose={onClose} width={860}
      title={store ? `${store.name} — ledger` : ""}
      sub={data ? `${fmtL(data.state.litres)} @ ₹${fmtN(data.state.avg_rate)}/L · value ${fmtC(data.state.value)}` : t("common.loading")}>
      {!data && <Empty>{t("common.loading")}</Empty>}
      {data && data.rows.length === 0 && <Empty>{t("fuel.is_barrel_me_abhi_koi_aana")}</Empty>}
      {data && data.rows.length > 0 && (
        <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
          <Row head cols="110px 90px 1.4fr 90px 90px 100px">
            <span>{t("fuel.kab")}</span><span>{t("fuel.kya")}</span><span>{t("fuel.kaun")}</span><span>{t("fuel.litres")}</span><span>{t("common.rate")}</span><span style={{ textAlign: "right" }}>{t("common.balance")}</span>
          </Row>
          {data.rows.map((r, i) => {
            const measured = r.kind === "check" || r.kind === "shift";
            const adjust = r.kind === "adjust";
            const fromTo = r.kind === "shift"
              ? `${r.from_project_name || r.from_warehouse_name || (r.from_project_id ? t("fuel.project_delete_ho_chuka") : t("fuel.warehouse_set_nahi"))} → ${r.to_project_name || r.to_warehouse_name || "—"}`
              : "";
            return (
            <div key={i}>
            <Row cols="110px 90px 1.4fr 90px 90px 100px"
              onClick={(r.kind === "purchase" || r.kind === "issue") ? () => openEntry({ kind: r.kind, id: r.id }) : undefined}>
              <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(r.at)}</span>
              <span>{r.kind === "purchase" ? <Pill label={t("fuel.aaya")} c={T.grn} bg={T.grnL} />
                : r.kind === "issue" ? <Pill label={t("fuel.gaya")} c={T.slt} bg={T.sltL} />
                : r.kind === "shift" ? <Pill label={t("fuel.shift")} c={T.ind} bg={T.indL} />
                : adjust ? <Pill label={t("fuel.dip_adjust_row")} c={T.ind} bg={T.indL} />
                : <Pill label={t("fuel.dipstick")} c={T.amb} bg={T.ambL} />}</span>
              <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={r.kind === "shift" ? fromTo : adjust ? (r.request_note || undefined) : undefined}>
                {r.kind === "shift"
                  ? t("fuel.shift_row_detail", { fromTo, physical: fmtL(r.physical_l), book: fmtL(r.book_l) })
                  : r.kind === "check"
                  ? `naapa ${fmtL(r.physical_l)} · kitaab ${fmtL(r.book_l)}`
                  : adjust
                  ? t("fuel.dip_adjust_kaun", { physical: fmtL(r.physical_l), name: r.by_name || "—" })
                  : (r.party_name || "—")}
              </span>
              <span style={{ fontSize: 12, fontWeight: measured ? 400 : 600, color: measured ? (Number(r.litres) === 0 ? T.t3 : T.amb) : adjust ? T.ind : T.t1 }}>
                {measured || adjust ? signedL(r.litres) : fmtL(r.litres)}
              </span>
              {/* Adjust sirf litre ka hai — rate/paisa dikhana galat sandesh deta */}
              <span style={{ fontSize: 11.5, color: T.t3 }}>{r.rate != null && !adjust ? `₹${fmtN(r.rate)}` : "—"}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtL(r.balance_l)}</span>
            </Row>
            {measured && <DipActions row={r} onAsk={(kind, d) => setAsk({ kind, d })} />}
            </div>
            );
          })}
        </div>
      )}
    </Modal>
    <DipRequestModal ask={ask} storeName={store && store.name} onClose={() => setAsk(null)}
      onDone={() => { setAsk(null); setTick((x) => x + 1); onChanged && onChanged(); }} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODULE
// ══════════════════════════════════════════════════════════════════
function FuelModule() {
  const [tab, setTab] = useState("overview");
  // Kisi bhi list ki entry par click → poora byora (FuelEntryDrawer).
  const [openEntry, setOpenEntry] = useState(null);
  const closeEntry = useCallback(() => setOpenEntry(null), []);
  const [loading, setLoading] = useState(true);

  const [stores, setStores] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [issues, setIssues] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [subcons, setSubcons] = useState([]);
  const [projects, setProjects] = useState([]);
  const [byEquipment, setByEquipment] = useState([]);
  const [byProject, setByProject] = useState([]);
  const [byVendor, setByVendor] = useState([]);
  const [sensor, setSensor] = useState(null);
  // Faisla baaki dipstick requests — Barrel Stock tab ka badge + panel.
  const [dipPending, setDipPending] = useState([]);

  const [refuelOpen, setRefuelOpen] = useState(false);
  const [ledgerStore, setLedgerStore] = useState(null);

  // Default window: this month to date — the span a site actually reconciles.
  const monthStart = new Date(); monthStart.setDate(1);
  const [from, setFrom] = useState(monthStart.toLocaleDateString("en-CA"));
  const [to, setTo] = useState(todayStr());

  const loadCore = useCallback(async () => {
    const [s, p, i, sc, dp] = await Promise.all([
      api.get("/fuel/stores").catch(() => null),
      api.get("/fuel/purchases").catch(() => null),
      api.get("/fuel/issues").catch(() => null),
      api.get("/fuel/sensor-checks").catch(() => null),
      api.get("/fuel/dip-requests?status=submitted&limit=100").catch(() => null),
    ]);
    setStores(s?.success ? s.data || [] : []);
    setPurchases(p?.success ? p.data || [] : []);
    setIssues(i?.success ? i.data || [] : []);
    setSensor(sc?.success ? sc.data : null);
    setDipPending(dp?.success ? dp.data || [] : []);
  }, []);

  const loadReports = useCallback(async () => {
    const q = `?from=${from}&to=${to}`;
    const [e, pr, v] = await Promise.all([
      api.get("/fuel/reports/by-equipment" + q).catch(() => null),
      api.get("/fuel/reports/by-project" + q).catch(() => null),
      api.get("/fuel/reports/by-vendor" + q).catch(() => null),
    ]);
    setByEquipment(e?.success ? e.data || [] : []);
    setByProject(pr?.success ? pr.data || [] : []);
    setByVendor(v?.success ? v.data || [] : []);
  }, [from, to]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await loadCore();
      const [eq, pa, pj] = await Promise.all([
        api.get("/equipment/master").catch(() => null),
        api.get("/finance/parties").catch(() => null),
        api.get("/projects").catch(() => null),
      ]);
      if (!alive) return;
      setEquipment(eq?.success ? eq.data || [] : []);
      setVendors((pa?.success ? pa.data || [] : []).filter(isFuelVendor));
      setSubcons((pa?.success ? pa.data || [] : []).filter(isSubconParty));
      setProjects(pj?.success ? (pj.data || []).filter((p) => p.is_active !== 0) : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [loadCore]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const reloadAll = useCallback(async () => { await loadCore(); await loadReports(); }, [loadCore, loadReports]);

  // Entry hatana = Fuel Delete + wajah (kam se kam 3 akshar) — server poori
  // entry audit me rakhta hai (5 Oct 2026).
  const del = async (url, label) => {
    const why = await window.promptAsync(t("fuel.hatane_ki_wajah_likho", { label }), "");
    if (why == null) return;
    try {
      const r = await api.del(url + (url.includes("?") ? "&" : "?") + "reason=" + encodeURIComponent(String(why).trim()));
      if (r && r.success === false) { window.alert(r.message || "Delete failed"); return; }
      reloadAll();
    } catch (e) { window.alert(e?.message || "Network error"); }
  };

  // Machines whose diesel is our cost but which carry no consumption norm.
  // Derived from the master, so it counts machines that have no fuel entries
  // yet — the report's own norm_missing only sees machines already in it.
  const normMissing = equipment.filter((e) => {
    const owned = String(e.ownership || "").toLowerCase() === "owned";
    const ours = owned || String(e.fuel_responsibility || "rent_included") === "company";
    return ours && !(Number(e.fuel_per_hour) > 0);
  });

  const totalStock = stores.reduce((a, s) => a + Number(s.litres || 0), 0);
  const stockValue = stores.reduce((a, s) => a + Number(s.value || 0), 0);
  // Diesel ka kharcha = jo machine me gaya (pump → machine + drum → machine).
  // Drum bharna stock hai — server use `kind:'stock'` row me alag bhejta hai,
  // wo is jod me nahi aata (13 Sep 2026 niyam).
  const costRows = byProject.filter((p) => p.kind !== "stock");
  const spendInRange = costRows.reduce((a, p) => a + Number(p.amount || 0), 0);
  const litresInRange = costRows.reduce((a, p) => a + Number(p.litres || 0), 0);
  // Baaki = pump ko abhi dena — bill bana par pay nahi hua + bill bana hi nahi
  // (server ka EK niyam, utils/fuelPayable.js). Bill na bana hissa Pending
  // Payments me hota hi nahi, isliye tile par alag se likha jaata hai.
  const unpaid = byVendor.reduce((a, v) => a + Number(v.unpaid_amount || 0), 0);
  const unbilledAmt = byVendor.reduce((a, v) => a + Number(v.unbilled_amount || 0), 0);
  // Badge ke liye alag call ki zaroorat nahi — purchases me billed_at,
  // settlement_id aur transaction_id pehle se aate hain (mit chuki cheez ki
  // link server khaali bhejta hai). Unbilled wahi jiska paisa kahin nahi laga.
  const unbilledN = purchases.filter((p) => !p.billed_at && !p.settlement_id && !p.transaction_id).length;

  const TABS = [
    { id: "overview",  l: t("common.overview"),      I: IcGauge },
    { id: "refueling", l: t("fuel.refueling"),     I: IcDrop, badge: purchases.length + issues.length || null },
    // Do alag ginti: kam stock wale drum (amber) aur faisla baaki dipstick
    // requests (indigo) — admin ki ghanti isi tab ki taraf laati hai.
    { id: "barrel",    l: t("fuel.barrel_stock_2"),  I: IcDrum, badge: stores.filter((s) => s.below_reorder).length || null, bc: T.amb,
      badge2: dipPending.length || null, bc2: T.ind },
    // Unbilled vendor ledger ke theek pehle — kaam ka kram wahi hai:
    // pehle bill banao, tabhi ledger me kuch aata hai.
    // Subcon ko diya diesel barrel ke theek baad — wo wahin se nikalta hai,
    // aur uska paisa vendor ke bill se nahi, subcon ke khaate se aata hai.
    { id: "subcon",    l: t("fuel.subcon_ko_diesel"), I: IcTruck },
    { id: "unbilled",  l: t("fuel.unbilled"),        I: IcFile, badge: unbilledN || null, bc: T.amb },
    { id: "vendor",    l: t("fuel.vendor_ledger_2"), I: IcTruck },
    // No badge: a count here would have to be invented until the sensor
    // checks (E3) actually run.
    { id: "cc",        l: t("fuel.cross_check"),   I: IcRuler },
    { id: "reports",   l: t("common.reports"),       I: IcChart },
  ];

  const TILES = [
    { l: t("fuel.barrel_stock_2"),  v: fmtL(totalStock), sub: `${stores.length} barrel · ${fmtC(stockValue)}`, c: T.ind, I: IcDrum },
    { l: t("fuel.diesel_kharcha"), v: fmtC(spendInRange), sub: t("fuel.l_is_duration_me", { l: fmtL(litresInRange) }), c: T.blu, I: IcDrop },
    { l: t("fuel.vendor_baaki"),  v: fmtC(unpaid),
      sub: unbilledAmt > 0 ? t("fuel.vendor_baaki_unbilled_sub", { amt: fmtC(unbilledAmt) })
        : unpaid > 0 ? t("fuel.vendor_baaki_pending_sub") : t("fuel.sab_settle"),
      c: unpaid > 0 ? T.amb : T.grn, I: IcTruck },
    { l: t("fuel.norm_se_zyada"), v: byEquipment.filter((e) => e.variance_pct != null && e.variance_pct > 15).length, sub: t("fuel.length_machine_ka_norm_set_nahi", { length: normMissing.length }), c: T.red, I: IcAlert },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: T.ind, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#8896A6" }}>{t("fuel.loading_fuel")}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <OpenEntryCtx.Provider value={setOpenEntry}>
    <div style={{ background: T.bg, height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ padding: "12px 18px 8px", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {TILES.map((s, i) => <StatCard key={i} label={s.l} value={s.v} sub={s.sub} color={s.c} icon={s.I} />)}
        </div>
      </div>

      <div style={{ margin: "0 18px", flexShrink: 0 }}>
        <div style={{ background: T.sb, borderRadius: 10, padding: "0 10px", display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 13px", border: "none", background: "none", fontSize: 12.5, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? "white" : "rgba(255,255,255,0.45)", cursor: "pointer", borderBottom: tab === t.id ? `2px solid ${T.ind}` : "2px solid transparent", transition: "all .15s", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              <t.I size={13} color="currentColor" />{t.l}
              {t.badge > 0 && <span style={{ background: t.bc || T.ind, color: "white", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 10, minWidth: 16, textAlign: "center" }}>{t.badge}</span>}
              {t.badge2 > 0 && <span style={{ background: t.bc2 || T.ind, color: "white", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 10, minWidth: 16, textAlign: "center" }}>{t.badge2}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 18px 16px" }}>
        {tab === "overview" && (
          <OverviewTab stores={stores} purchases={purchases} issues={issues}
            byEquipment={byEquipment} normMissing={normMissing}
            onRefuel={() => setRefuelOpen(true)} />
        )}
        {tab === "refueling" && (
          <RefuelingTab purchases={purchases} issues={issues}
            onRefuel={() => setRefuelOpen(true)}
            onDeletePurchase={(r) => del(`/fuel/purchases/${r.id}`, `${fmtL(r.litres)} ka purchase`)}
            onDeleteIssue={(r) => del(`/fuel/issues/${r.id}`, `${fmtL(r.litres)} ka issue`)} />
        )}
        {tab === "barrel" && (
          <BarrelTab stores={stores} projects={projects} onReload={reloadAll} dipPending={dipPending}
            onOpenLedger={setLedgerStore} onRefuel={() => setRefuelOpen(true)} />
        )}
        {tab === "subcon" && (
          <SubconTab subcons={subcons} stores={stores} vendors={vendors} projects={projects}
            from={from} to={to} onRange={(f2, t2) => { setFrom(f2); setTo(t2); }} onReload={reloadAll} />
        )}
        {tab === "unbilled" && (
          <UnbilledTab onReload={reloadAll} />
        )}
        {tab === "vendor" && (
          <VendorTab vendorRows={byVendor} from={from} to={to}
            onRange={(f, t2) => { setFrom(f); setTo(t2); }} />
        )}
        {tab === "cc" && (
          <CrossCheckTab stores={stores} byEquipment={byEquipment} purchases={purchases} issues={issues} sensor={sensor} onReload={loadCore} />
        )}
        {tab === "reports" && (
          <ReportsTab byEquipment={byEquipment} byProject={byProject} from={from} to={to}
            onRange={(f, t2) => { setFrom(f); setTo(t2); }}
            projects={projects} equipment={equipment} vendors={vendors} stores={stores} />
        )}
      </div>

      <RefuelForm open={refuelOpen} onClose={() => setRefuelOpen(false)} onSaved={reloadAll}
        stores={stores} equipment={equipment} vendors={vendors} projects={projects} />
      <LedgerModal store={ledgerStore} onClose={() => setLedgerStore(null)} onChanged={reloadAll} />
      <FuelEntryDrawer entry={openEntry} onClose={closeEntry} />
    </div>
    </OpenEntryCtx.Provider>
  );
}

export default FuelModule;
