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
import { useState, useEffect, useCallback, useMemo } from "react";
import api, { API_BASE, getToken } from "../config/api";
import { t, Rich } from "../i18n";

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
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " +
         dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

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
    setF({ filled_at: nowLocal(), payment_mode: "credit" });
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

  // Barrel do jagah ho sakta hai: warehouse me, ya kisi project par. Pehle wo
  // chuna jaata hai, phir usi ka barrel — isse list chhoti aur naam saaf.
  const projectsWithStores = useMemo(() => {
    const seen = new Map();
    for (const s of stores) if (s.project_id) seen.set(s.project_id, s.project_name || ("Project #" + s.project_id));
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [stores]);

  const scopedStores = useMemo(() => {
    if (!f.store_scope) return [];
    if (f.store_scope === "warehouse") return stores.filter((s) => !s.project_id);
    const pid = String(f.store_scope).slice(1);
    return stores.filter((s) => String(s.project_id) === pid);
  }, [stores, f.store_scope]);

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
    // Warehouse ka barrel kisi ek project ka nahi hota. Diesel jis site par
    // pi liya gaya, kharcha wahin jaata hai — aur wo sirf yahin pata chalta hai.
    if (isIssue && store && !store.project_id && !f.project_id) {
      setError(t("fuel.warehouse_ke_barrel_se_nikaal_rahe")); return;
    }
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
          // Khaali chhoda to server barrel ka apna project le lega. Doosra
          // chuna to kharcha wahan transfer hoga.
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
         {t("fuel.barrel_se_nikaalne_par_koi_naya")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Barrel chunne se PEHLE ye poochte hain ki wo kahan pada hai. Ek hi
            lambi list me site aur warehouse ke drum ghul-mil jaate the, aur
            "drum 3258" jaise naam se koi nahi bata sakta ki wo kaunsa hai. */}
        {path !== "pump_machine" && (
          <>
            <Field label={t("fuel.barrel_kahan_ka")}>
              <select value={f.store_scope || ""} onChange={(e) => { upd("store_scope", e.target.value); upd("store_id", ""); }} style={inp}>
                <option value="">{t("fuel.chunein")}</option>
                <option value="warehouse">{t("fuel.warehouse_central_store")}</option>
                {projectsWithStores.map((p) => <option key={p.id} value={"p" + p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label={t("fuel.barrel_store")}>
              <select value={f.store_id || ""} onChange={(e) => upd("store_id", e.target.value)} style={inp}
                disabled={!f.store_scope}>
                <option value="">{f.store_scope ? t("fuel.chunein") : t("fuel.pehle_upar_wala_chunein")}</option>
                {scopedStores.map((s) => <option key={s.id} value={s.id}>{s.name} — {fmtL(s.litres)}</option>)}
              </select>
              {f.store_scope && scopedStores.length === 0 && (
                <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("fuel.yahan_koi_barrel_nahi_hai")}</div>
              )}
            </Field>
          </>
        )}

        {/* Warehouse ka drum kisi ek site ka nahi hota. Diesel jis project par
            pi liya gaya, kharcha wahin jaata hai — aur wo baat sirf isi pal
            pata chalti hai, isliye yahin poochi jaati hai. */}
        {isIssue && store && (
          <Field label={t("fuel.kis_project_ka_kaam")} span={2}
            hint={store.project_id
              ? t("fuel.diesel_jis_site_par_pi_liya")
              : t("fuel.warehouse_ka_diesel_hai_jitna_nikla")}>
            <select value={f.project_id || (store.project_id ? String(store.project_id) : "")}
              onChange={(e) => upd("project_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.chunein")}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        )}

        {path !== "pump_store" && (
          <Field label={t("fuel.machine")} hint={blocked > 0 ? `${blocked} machine list me nahi — unka kiraya diesel ke saath hai` : null}>
            <select value={f.equipment_id || ""} onChange={(e) => upd("equipment_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.chunein")}</option>
              {eligible.map((e) => <option key={e.id} value={e.id}>{e.name}{e.code ? ` (${e.code})` : ""}</option>)}
            </select>
          </Field>
        )}

        {!isIssue && (
          <Field label={t("fuel.pump_fuel_vendor")} hint={t("fuel.free_text_naam_nahi_chalega_party")}>
            <select value={f.vendor_party_id || ""} onChange={(e) => upd("vendor_party_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.chunein")}</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
        )}

        {path === "pump_machine" && (
          <Field label={t("common.project")}>
            <select value={f.project_id || ""} onChange={(e) => upd("project_id", e.target.value)} style={inp}>
              <option value="">{t("fuel.koi_nahi")}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
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
              <select value={f.meter_missing_reason || ""} onChange={(e) => upd("meter_missing_reason", e.target.value)}
                style={{ ...inp, marginTop: 7 }}>
                <option value="">{t("fuel.wajah_chunein")}</option>
                <option value="meter_kharab">{t("fuel.meter_kharab_hai")}</option>
                <option value="meter_nahi">{t("fuel.machine_par_meter_hai_hi_nahi")}</option>
                <option value="padha_nahi_gaya">{t("fuel.us_waqt_padha_nahi_ja_saka")}</option>
              </select>
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
                <img src={f.photo_url} alt="slip" style={{ height: 38, width: 38, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}` }} />
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
  const lowStores = stores.filter((s) => s.below_reorder);
  const overNorm = byEquipment.filter((e) => e.variance_pct != null && e.variance_pct > 15);

  const recent = useMemo(() => {
    const p = purchases.map((x) => ({ kind: "purchase", at: x.filled_at, litres: x.litres, amount: x.amount, who: x.vendor_party_name || x.vendor_name, where: x.store_name || x.equipment_name, mode: x.payment_mode }));
    const i = issues.map((x) => ({ kind: "issue", at: x.issued_at, litres: x.litres, amount: x.amount, who: x.store_name, where: x.equipment_name }));
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
        <Panel title={t("fuel.haal_ki_entries")} action={<Btn size="sm" icon={IcAdd} onClick={onRefuel}>{t("fuel.refuelling_entry")}</Btn>}>
          {recent.length === 0 && <Empty>{t("fuel.abhi_koi_diesel_entry_nahi_hui")}</Empty>}
          {recent.length > 0 && (
            <>
              <Row head cols="90px 70px 1.4fr 1fr 90px">
                <span>{t("fuel.kab")}</span><span>{t("fuel.kya")}</span><span>{t("fuel.kahan_se_kahan")}</span><span>{t("fuel.litres")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span>
              </Row>
              {recent.map((r, i) => (
                <Row key={i} cols="90px 70px 1.4fr 1fr 90px">
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
        <Btn size="sm" icon={IcAdd} onClick={onRefuel}>{t("fuel.refuelling_entry")}</Btn>
      </div>}>
      {rows.length === 0 && <Empty>{t("fuel.koi_entry_nahi_mili")}</Empty>}
      {rows.length > 0 && (
        <>
          <Row head cols="105px 80px 1.3fr 1.2fr 80px 80px 95px 90px 40px">
            <span>{t("fuel.kab")}</span><span>{t("fuel.kya")}</span><span>{t("fuel.vendor_barrel")}</span><span>{t("fuel.machine_barrel")}</span>
            <span>{t("fuel.litres")}</span><span>{t("common.rate")}</span><span style={{ textAlign: "right" }}>{t("common.amount_2")}</span><span>{t("common.status")}</span><span />
          </Row>
          {rows.map((r) => (
            <Row key={r._k + r.id} cols="105px 80px 1.3fr 1.2fr 80px 80px 95px 90px 40px">
              <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(r._at)}</span>
              <span>{r._k === "purchase"
                ? <Pill label={r.destination === "store" ? t("fuel.barrel") : t("fuel.machine_2")} c={T.blu} bg={T.bluL} />
                : <Pill label={t("fuel.barrel_se")} c={T.slt} bg={T.sltL} />}</span>
              <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r._k === "purchase" ? (r.vendor_party_name || r.vendor_name || "—") : (r.store_name || "—")}
              </span>
              <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r._k === "purchase" ? (r.store_name || r.equipment_name || "—") : (r.equipment_name || "—")}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{fmtL(r.litres)}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>₹{fmtN(r._k === "purchase" ? r.rate : r.rate_used)}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtC(r.amount)}</span>
              <span>
                {r._k === "issue"
                  ? <Pill label={t("fuel.stock_se")} c={T.slt} bg={T.sltL} />
                  : r.payment_mode === "cash"
                    ? <Pill label={t("common.cash")} c={T.grn} bg={T.grnL} />
                    : r.settlement_status === "paid"
                      ? <Pill label={t("common.paid")} c={T.grn} bg={T.grnL} />
                      : <Pill label={t("common.baaki")} c={T.amb} bg={T.ambL} />}
              </span>
              <button type="button" title={t("common.delete")}
                onClick={() => (r._k === "purchase" ? onDeletePurchase(r) : onDeleteIssue(r))}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.t4, padding: 3, display: "flex" }}>
                <IcTrash size={13} color="currentColor" />
              </button>
            </Row>
          ))}
        </>
      )}
    </Panel>
  );
}

function BarrelTab({ stores, projects, onReload, onOpenLedger, onRefuel }) {
  const [newOpen, setNewOpen] = useState(false);
  const [dipFor, setDipFor] = useState(null);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const saveStore = async () => {
    setError("");
    // Barrel do jagah ho sakta hai: kisi project par, ya central warehouse me.
    // Warehouse wale ka koi project nahi hota — uska diesel jis site par pi
    // liya jayega, kharcha wahin jayega.
    const atWarehouse = f.scope === "warehouse";
    if (!atWarehouse && !f.project_id) { setError(t("fuel.project_chunein_ya_warehouse_chunein")); return; }
    if (!f.name?.trim()) { setError(t("fuel.barrel_ka_naam_likhein")); return; }
    setBusy(true);
    try {
      const r = await api.post("/fuel/stores", {
        project_id: atWarehouse ? null : parseInt(f.project_id, 10),
        location: atWarehouse ? (f.location || "").trim() || null : null,
        name: f.name.trim(),
        capacity_l: f.capacity_l ? parseFloat(f.capacity_l) : null,
        reorder_level_l: f.reorder_level_l ? parseFloat(f.reorder_level_l) : null,
      });
      if (r?.success) { setNewOpen(false); setF({}); onReload(); }
      else setError(r?.message || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  const saveDip = async () => {
    setError("");
    if (f.physical_l === undefined || f.physical_l === "") { setError(t("fuel.naapa_hua_diesel_likhein")); return; }
    setBusy(true);
    try {
      const r = await api.post("/fuel/stock-checks", {
        store_id: dipFor.id,
        checked_at: toSqlDateTime(f.checked_at || nowLocal()),
        physical_l: parseFloat(f.physical_l),
        note: f.note || null,
      });
      if (r?.success) { setDipFor(null); setF({}); onReload(); }
      else setError(r?.message || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  const variance = dipFor && f.physical_l !== undefined && f.physical_l !== ""
    ? Math.round((parseFloat(f.physical_l) - Number(dipFor.litres)) * 100) / 100 : null;

  return (
    <>
      <Panel title={t("fuel.barrel_stock")} action={<div style={{ display: "flex", gap: 8 }}>
        <Btn size="sm" ghost icon={IcAdd} onClick={() => { setF({}); setError(""); setNewOpen(true); }}>{t("fuel.naya_barrel")}</Btn>
        <Btn size="sm" icon={IcDrop} onClick={onRefuel}>{t("fuel.refuelling_entry")}</Btn>
      </div>}>
        {stores.length === 0 && <Empty>{t("fuel.abhi_koi_barrel_nahi_bana_naya")}</Empty>}
        {stores.length > 0 && (
          <>
            <Row head cols="1.5fr 1.2fr 100px 100px 110px 150px">
              <span>{t("fuel.barrel_2")}</span><span>{t("common.project")}</span><span>{t("common.stock")}</span><span>{t("fuel.avg_rate")}</span><span>{t("fuel.value")}</span><span />
            </Row>
            {stores.map((s) => (
              <Row key={s.id} cols="1.5fr 1.2fr 100px 100px 110px 150px">
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{s.name}</div>
                  {s.capacity_l != null && (
                    <div style={{ fontSize: 10.5, color: T.t4 }}>capacity {fmtL(s.capacity_l)}</div>
                  )}
                </div>
                <span style={{ fontSize: 11.5, color: T.t3 }}>{s.project_name || "—"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.below_reorder ? T.amb : T.t1 }}>
                  {fmtL(s.litres)}
                  {s.below_reorder && <span style={{ marginLeft: 6 }}><Pill label={t("fuel.low")} c={T.amb} bg={T.ambL} /></span>}
                </span>
                <span style={{ fontSize: 12, color: T.t2 }}>₹{fmtN(s.avg_rate)}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{fmtC(s.value)}</span>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Btn size="sm" ghost icon={IcRuler} onClick={() => { setF({ checked_at: nowLocal() }); setError(""); setDipFor(s); }}>{t("fuel.dipstick")}</Btn>
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
          {/* Barrel kahan rakha hai — site par ya central store me. Warehouse
              wala har project ko diesel deta hai, isliye uska koi ek project
              nahi hota. */}
          <Field label={t("fuel.barrel_kahan_hai")}>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ k: "project", l: t("fuel.kisi_project_par") }, { k: "warehouse", l: t("fuel.warehouse_central_store") }].map((o) => {
                const on = (f.scope || "project") === o.k;
                return (
                  <button key={o.k} type="button"
                    onClick={() => setF((p) => ({ ...p, scope: o.k, project_id: o.k === "warehouse" ? "" : p.project_id }))}
                    style={{ flex: 1, padding: "9px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
                      fontSize: 12.5, fontWeight: 700,
                      border: "1.5px solid " + (on ? T.ind : T.border),
                      background: on ? T.indL || T.surfaceB : T.surface,
                      color: on ? T.ind : T.t2 }}>{o.l}</button>
                );
              })}
            </div>
          </Field>

          {(f.scope || "project") === "project" ? (
            <Field label={t("common.project")}>
              <select value={f.project_id || ""} onChange={(e) => setF((p) => ({ ...p, project_id: e.target.value }))} style={inp}>
                <option value="">{t("fuel.chunein")}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label={t("fuel.kahan_rakha_hai_optional")} hint={t("fuel.warehouse_ka_diesel_har_project_ko")}>
              <input value={f.location || ""} onChange={(e) => setF((p) => ({ ...p, location: e.target.value }))} placeholder={t("fuel.e_g_main_site_store")} style={inp} />
            </Field>
          )}
          <Field label={t("common.naam")}><input value={f.name || ""} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} placeholder={t("fuel.e_g_site_drum_1")} style={inp} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label={t("fuel.capacity_l")}><input value={f.capacity_l || ""} onChange={(e) => setF((p) => ({ ...p, capacity_l: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} /></Field>
            <Field label={t("fuel.reorder_level_l")} hint={t("fuel.isse_neeche_jaate_hi_alert_aayega")}>
              <input value={f.reorder_level_l || ""} onChange={(e) => setF((p) => ({ ...p, reorder_level_l: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} />
            </Field>
          </div>
          {error && <div style={{ padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{error}</div>}
        </div>
      </Modal>

      <Modal open={!!dipFor} onClose={() => setDipFor(null)} title={t("fuel.dipstick_check")} width={520}
        sub={dipFor ? `${dipFor.name} — kitaab ke hisaab se ${fmtL(dipFor.litres)}` : ""}
        footer={<><Btn ghost onClick={() => setDipFor(null)}>{t("common.cancel")}</Btn><Btn onClick={saveDip} disabled={busy}>{busy ? t("common.saving") : t("fuel.record_karein")}</Btn></>}>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label={t("fuel.kab_naapa")}><input type="datetime-local" value={f.checked_at || ""} onChange={(e) => setF((p) => ({ ...p, checked_at: e.target.value }))} style={inp} /></Field>
          <Field label={t("fuel.naapa_hua_diesel_l")}>
            <input value={f.physical_l ?? ""} inputMode="decimal" onChange={(e) => setF((p) => ({ ...p, physical_l: e.target.value.replace(/[^0-9.]/g, "") }))} style={inp} />
          </Field>
          {variance != null && (
            <div style={{ padding: "10px 13px", borderRadius: 7, background: variance === 0 ? T.grnL : T.ambL, border: `1px solid ${variance === 0 ? T.grnM : T.ambM}`, fontSize: 12, fontWeight: 600, color: variance === 0 ? T.grn : T.amb }}>{t("fuel.variance_variancefmtn_l", { variance: variance > 0 ? "+" : "", fmtN: fmtN(variance) })}<div style={{ fontSize: 10.5, fontWeight: 500, marginTop: 3 }}>
               {t("fuel.stock_apne_aap_adjust_nahi_hoga")}
              </div>
            </div>
          )}
          <Field label={t("common.note_optional")}><input value={f.note || ""} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} style={inp} /></Field>
          {error && <div style={{ padding: "8px 12px", background: T.redL, color: T.red, fontSize: 12, borderRadius: 6, fontWeight: 600 }}>{error}</div>}
        </div>
      </Modal>
    </>
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
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...inp, width: w, padding: "6px 8px", fontSize: 11.5 }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
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
                    <Row key={r.kind + r.source_id} cols={cols}>
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
  const noDiesel = rows.filter((e) => e.hours > 0 && e.litres === 0);

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
      : (r.hours > 0 && r.litres === 0 ? "Chali par diesel darj nahi" : "")) },
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
                        {e.hours > 0 && e.litres === 0 && <span style={{ color: T.amb }}> {t("fuel.chali_par_diesel_darj_nahi_2")}</span>}
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
  const COLS = [
    { key: "project_name", label: t("common.project"), w: 26 },
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
            <Row key={p.project_id || "none"} cols="2fr 100px 110px 120px">
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{p.project_name}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{p.entries}</span>
              <span style={{ fontSize: 12, color: T.t2 }}>{fmtL(p.litres)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtC(p.amount)}</span>
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => ({ store_id: storeId }), [storeId]);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    api.get(`/fuel/reports/barrel-ledger?${qs(params)}`)
      .then((r) => { if (!dead) setData(r?.success ? r.data : null); })
      .catch(() => { if (!dead) setData(null); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [params]);

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
    { key: "balance_l", label: t("fuel.bacha_l"), w: 10 },
    { key: "variance_l", label: t("fuel.dipstick_farq_l"), w: 14, excel: (r) => r.variance_l ?? "" },
    { key: "slip_no", label: t("fuel.parchi"), w: 12 },
    { key: "by_name", label: t("fuel.kisne"), w: 16 },
  ];
  const cols = "78px 78px 1.4fr 72px 72px 62px 92px 78px 1fr";
  const KC = { purchase: { c: T.grn, bg: T.grnL }, issue: { c: T.blu, bg: T.bluL }, check: { c: T.slt, bg: T.sltL } };

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
                  <Row key={i} cols={cols}>
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
                        : [r.slip_no ? "slip " + r.slip_no : "", r.payment !== "—" ? r.payment : "", r.by_name]
                            .filter(Boolean).join(" · ")}
                    </span>
                  </Row>
                );
              })}
            </div>
          </div>
          <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
           {t("fuel.bacha_wala_column_dipstick_par_nahi")}
          </div>
        </>
      )}
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
    { key: "status", label: t("common.status"), w: 9 },
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
                <Row key={r.purchase_id} cols={cols}>
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
                    {r.status === "Baaki" && (
                      <span style={{ fontSize: 9.5, color: T.amb, fontWeight: 700, marginLeft: 4 }}>BAAKI</span>
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
function CrossCheckTab({ stores, byEquipment, purchases, sensor, onReload }) {
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
                    <Btn size="sm" ghost onClick={() => review(d.id)}>{t("fuel.theek_tha")}</Btn>
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
                      {"  "}{String(p.filled_at || "").slice(0, 10)}{p.slip_no ? ` · slip ${p.slip_no}` : ""}
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
function LedgerModal({ store, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!store) { setData(null); return; }
    api.get(`/fuel/stores/${store.id}/ledger`)
      .then((r) => setData(r?.success ? r.data : null))
      .catch(() => setData(null));
  }, [store]);

  return (
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
          {data.rows.map((r, i) => (
            <Row key={i} cols="110px 90px 1.4fr 90px 90px 100px">
              <span style={{ fontSize: 11, color: T.t3 }}>{fmtDT(r.at)}</span>
              <span>{r.kind === "purchase" ? <Pill label={t("fuel.aaya")} c={T.grn} bg={T.grnL} />
                : r.kind === "issue" ? <Pill label={t("fuel.gaya")} c={T.slt} bg={T.sltL} />
                : <Pill label={t("fuel.dipstick")} c={T.amb} bg={T.ambL} />}</span>
              <span style={{ fontSize: 11.5, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.kind === "check"
                  ? `naapa ${fmtL(r.physical_l)} · kitaab ${fmtL(r.book_l)}`
                  : (r.party_name || "—")}
              </span>
              <span style={{ fontSize: 12, fontWeight: r.kind === "check" ? 400 : 600, color: r.kind === "check" ? (Number(r.litres) === 0 ? T.t3 : T.amb) : T.t1 }}>
                {r.kind === "check" ? `${Number(r.litres) > 0 ? "+" : ""}${fmtN(r.litres)} L` : fmtL(r.litres)}
              </span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{r.rate != null ? `₹${fmtN(r.rate)}` : "—"}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>{fmtL(r.balance_l)}</span>
            </Row>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODULE
// ══════════════════════════════════════════════════════════════════
function FuelModule() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [stores, setStores] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [issues, setIssues] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [byEquipment, setByEquipment] = useState([]);
  const [byProject, setByProject] = useState([]);
  const [byVendor, setByVendor] = useState([]);
  const [sensor, setSensor] = useState(null);

  const [refuelOpen, setRefuelOpen] = useState(false);
  const [ledgerStore, setLedgerStore] = useState(null);

  // Default window: this month to date — the span a site actually reconciles.
  const monthStart = new Date(); monthStart.setDate(1);
  const [from, setFrom] = useState(monthStart.toLocaleDateString("en-CA"));
  const [to, setTo] = useState(todayStr());

  const loadCore = useCallback(async () => {
    const [s, p, i, sc] = await Promise.all([
      api.get("/fuel/stores").catch(() => null),
      api.get("/fuel/purchases").catch(() => null),
      api.get("/fuel/issues").catch(() => null),
      api.get("/fuel/sensor-checks").catch(() => null),
    ]);
    setStores(s?.success ? s.data || [] : []);
    setPurchases(p?.success ? p.data || [] : []);
    setIssues(i?.success ? i.data || [] : []);
    setSensor(sc?.success ? sc.data : null);
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
      setProjects(pj?.success ? (pj.data || []).filter((p) => p.is_active !== 0) : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [loadCore]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const reloadAll = useCallback(async () => { await loadCore(); await loadReports(); }, [loadCore, loadReports]);

  const del = async (url, label) => {
    if (!(await window.confirmAsync(t("fuel.label_delete_karein", { label })))) return;
    try {
      const r = await api.del(url);
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
  const spendInRange = byProject.reduce((a, p) => a + Number(p.amount || 0), 0);
  const litresInRange = byProject.reduce((a, p) => a + Number(p.litres || 0), 0);
  const unpaid = byVendor.reduce((a, v) => a + Number(v.unpaid_amount || 0), 0);

  const TABS = [
    { id: "overview",  l: t("common.overview"),      I: IcGauge },
    { id: "refueling", l: t("fuel.refueling"),     I: IcDrop, badge: purchases.length + issues.length || null },
    { id: "barrel",    l: t("fuel.barrel_stock_2"),  I: IcDrum, badge: stores.filter((s) => s.below_reorder).length || null, bc: T.amb },
    { id: "vendor",    l: t("fuel.vendor_ledger_2"), I: IcTruck },
    // No badge: a count here would have to be invented until the sensor
    // checks (E3) actually run.
    { id: "cc",        l: t("fuel.cross_check"),   I: IcRuler },
    { id: "reports",   l: t("common.reports"),       I: IcChart },
  ];

  const TILES = [
    { l: t("fuel.barrel_stock_2"),  v: fmtL(totalStock), sub: `${stores.length} barrel · ${fmtC(stockValue)}`, c: T.ind, I: IcDrum },
    { l: t("fuel.diesel_kharcha"), v: fmtC(spendInRange), sub: `${fmtL(litresInRange)} is duration me`, c: T.blu, I: IcDrop },
    { l: t("fuel.vendor_baaki"),  v: fmtC(unpaid), sub: unpaid > 0 ? "Pending Payments me" : "Sab settle", c: unpaid > 0 ? T.amb : T.grn, I: IcTruck },
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
          <BarrelTab stores={stores} projects={projects} onReload={reloadAll}
            onOpenLedger={setLedgerStore} onRefuel={() => setRefuelOpen(true)} />
        )}
        {tab === "vendor" && (
          <VendorTab vendorRows={byVendor} from={from} to={to}
            onRange={(f, t2) => { setFrom(f); setTo(t2); }} />
        )}
        {tab === "cc" && (
          <CrossCheckTab stores={stores} byEquipment={byEquipment} purchases={purchases} sensor={sensor} onReload={loadCore} />
        )}
        {tab === "reports" && (
          <ReportsTab byEquipment={byEquipment} byProject={byProject} from={from} to={to}
            onRange={(f, t2) => { setFrom(f); setTo(t2); }}
            projects={projects} equipment={equipment} vendors={vendors} stores={stores} />
        )}
      </div>

      <RefuelForm open={refuelOpen} onClose={() => setRefuelOpen(false)} onSaved={reloadAll}
        stores={stores} equipment={equipment} vendors={vendors} projects={projects} />
      <LedgerModal store={ledgerStore} onClose={() => setLedgerStore(null)} />
    </div>
  );
}

export default FuelModule;
