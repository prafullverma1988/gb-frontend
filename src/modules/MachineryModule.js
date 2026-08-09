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
import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../config/api";

// ── ICONS ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const IcTruck  = (p) => <Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a2 2 0 100-4 2 2 0 000 4zM18.5 19a2 2 0 100-4 2 2 0 000 4z" />;
const IcBell   = (p) => <Ic {...p} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />;
const IcSpark  = (p) => <Ic {...p} d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" />;
const IcDoc    = (p) => <Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6" />;
const IcGauge  = (p) => <Ic {...p} d="M12 20a8 8 0 100-16 8 8 0 000 16zM12 12l3.5-3.5M12 20v2M4 12H2M22 12h-2" />;
const IcDrop   = (p) => <Ic {...p} d="M12 2.7s6 6.3 6 10.3a6 6 0 01-12 0c0-4 6-10.3 6-10.3z" />;
const IcWrench = (p) => <Ic {...p} d="M14.7 6.3a4 4 0 01-5 5L4 17v3h3l5.7-5.7a4 4 0 015-5l2.6-2.6-3-3z" />;
const IcClock  = (p) => <Ic {...p} d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 7v5l3 2" />;
const IcAdd    = (p) => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX      = (p) => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcAlert  = (p) => <Ic {...p} d="M10.3 3.9L1.8 18a2 2 0 001.7 3h16.9a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" />;

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
  { k: "insurance", l: "Insurance" }, { k: "rc", l: "RC" },
  { k: "fitness", l: "Fitness certificate" }, { k: "puc", l: "PUC" },
  { k: "road_tax", l: "Road tax" }, { k: "permit", l: "Permit" },
  { k: "other", l: "Other" },
];
const docLabel = (k) => (DOC_TYPES.find((d) => d.k === k) || {}).l || k;

// Days-left decides the colour everywhere — one rule, so the fleet list and the
// detail page can never disagree about whether a paper is a problem.
const expiryTone = (days) => {
  if (days == null) return { c: T.t3, bg: T.sltL, label: "—" };
  if (days < 0) return { c: T.red, bg: T.redL, label: `${Math.abs(days)} din pehle khatam` };
  if (days === 0) return { c: T.red, bg: T.redL, label: "Aaj khatam" };
  if (days <= 30) return { c: T.amb, bg: T.ambL, label: `${days} din` };
  return { c: T.grn, bg: T.grnL, label: "Valid" };
};

// Meter kitni purani hai — ek hi jumla teeno jagah (fleet list, header,
// meter form) taaki "0 din purani" jaisa ajeeb text kahin na dikhe.
const meterAge = (days) =>
  days == null ? "tareekh nahi" : days === 0 ? "aaj" : days === 1 ? "kal" : `${days} din purani`;

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
    return <span style={{ fontSize: 11.5, color: T.t4 }}>Reading nahi</span>;
  }
  const val = unit === "km"
    ? (meter.km != null ? fmtN(meter.km) + " km" : fmtN(meter.hours) + " hrs")
    : (meter.hours != null ? fmtN(meter.hours) + " hrs" : fmtN(meter.km) + " km");
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: meter.is_stale ? T.amb : T.t1 }}>{val}</div>
      <div style={{ fontSize: 10, color: T.t4 }}>
        {meter.source} se · {meterAge(meter.days_old)}
      </div>
    </div>
  );
};

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
    if (!f.valid_till) { setError("Valid till zaroori hai"); return; }
    setBusy(true);
    try {
      const r = await api.post("/machinery/documents", {
        equipment_id: machine.id,
        doc_type: f.doc_type, doc_no: f.doc_no || null,
        provider_name: f.provider_name || null,
        valid_from: f.valid_from || null, valid_till: f.valid_till,
        amount: f.amount ? parseFloat(f.amount) : null,
        reminder_days: f.reminder_days || "30,15,7",
        note: f.note || null,
      });
      if (r && r.success) { onSaved(); onClose(); }
      else setError((r && r.message) || "Save failed");
    } catch (e) { setError(e?.message || "Network error"); }
    setBusy(false);
  };

  const owned = machine && String(machine.ownership || "").toLowerCase() === "owned";

  return (
    <Modal open={open} onClose={onClose} title="Document add karein"
      sub={machine ? machine.name + (machine.registration_no ? ` · ${machine.registration_no}` : "") : ""}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Btn></>}>
      {!owned && (
        <Notice>
          Ye kiraye ki machine hai — hum vendor ka kaagaz sirf <b>expiry ke liye</b> dekhte hain.
          Unfit machine aapki site par chale to zimmedari aapki hoti hai.
        </Notice>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Document">
          <select value={f.doc_type || "insurance"} onChange={(e) => upd("doc_type", e.target.value)} style={inp}>
            {DOC_TYPES.map((d) => <option key={d.k} value={d.k}>{d.l}</option>)}
          </select>
        </Field>
        <Field label="Number">
          <input value={f.doc_no || ""} onChange={(e) => upd("doc_no", e.target.value)} placeholder="policy / certificate no." style={inp} />
        </Field>
        <Field label="Issuer / company">
          <input value={f.provider_name || ""} onChange={(e) => upd("provider_name", e.target.value)} placeholder="e.g. Bajaj Allianz" style={inp} />
        </Field>
        <Field label="Premium / fee (₹)">
          <input value={f.amount || ""} inputMode="decimal" onChange={(e) => upd("amount", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>
        <Field label="Valid from">
          <input type="date" value={f.valid_from || ""} onChange={(e) => upd("valid_from", e.target.value)} style={inp} />
        </Field>
        <Field label="Valid till *">
          <input type="date" value={f.valid_till || ""} onChange={(e) => upd("valid_till", e.target.value)} style={inp} />
        </Field>
        <Field label="Reminder (din pehle)" span={2}
          hint="Aakhri din aur uska ek din pehle hamesha yaad dilaya jayega, chahe yahan kuch bhi ho.">
          <input value={f.reminder_days || ""} onChange={(e) => upd("reminder_days", e.target.value)} placeholder="30,15,7" style={inp} />
        </Field>
        <Field label="Note" span={2}>
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
    if (!f.hours && !f.km) { setError("Hours ya km, ek to bharein"); return; }
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
    <Modal open={open} onClose={onClose} title="Meter reading" width={520}
      sub={machine ? machine.name : ""}
      footer={<><Btn ghost onClick={onClose}>Cancel</Btn><Btn onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Btn></>}>
      {current && (current.hours != null || current.km != null) && (
        <div style={{ marginBottom: 12, fontSize: 11.5, color: T.t3 }}>
          Abhi ka record: <b style={{ color: T.t1 }}>{current.hours != null ? fmtN(current.hours) + " hrs" : fmtN(current.km) + " km"}</b>
          {" "}({current.source} se, {meterAge(current.days_old)})
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Hour-meter (hrs)">
          <input value={f.hours || ""} inputMode="decimal" onChange={(e) => upd("hours", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>
        <Field label="Odometer (km)">
          <input value={f.km || ""} inputMode="decimal" onChange={(e) => upd("km", e.target.value.replace(/[^0-9.]/g, ""))} style={inp} />
        </Field>
        <Field label="Kis din ki reading" span={2}>
          <input type="date" value={f.read_at || ""} onChange={(e) => upd("read_at", e.target.value)} style={inp} />
        </Field>
        <div style={{ gridColumn: "span 2" }}>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={!!f.is_meter_reset} onChange={(e) => upd("is_meter_reset", e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, cursor: "pointer" }} />
            <span style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>
              <b>Meter badla / reset hua hai</b>
              <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>
                Isse naya baseline shuru hota hai. Bina tick kiye purani se kam reading nahi lagegi — wo aam taur par typo hoti hai.
              </div>
            </span>
          </label>
        </div>
        <Field label="Note" span={2}>
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
function MachineDetail({ id, onBack, onChanged }) {
  const [tab, setTab] = useState("ov");
  const [m, setM] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docOpen, setDocOpen] = useState(false);
  const [meterOpen, setMeterOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      api.get("/machinery/fleet/" + id).catch(() => null),
      api.get("/machinery/fleet/" + id + "/timeline").catch(() => null),
    ]);
    setM(a?.success ? a.data : null);
    setTimeline(b?.success ? b.data || [] : []);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Empty>Loading...</Empty>;
  if (!m) return <Empty>Machine nahi mili.</Empty>;

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
    { id: "ov", l: "Overview" },
    ...(owned ? [{ id: "svc", l: "Service log" }] : []),
    { id: "fuel", l: "Fuel" },
    { id: "usage", l: "Usage" },
    { id: "docs", l: "Documents" },
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
        ‹ Fleet par wapas
      </button>

      <div style={{ background: T.surface, border: `1.5px solid ${T.b1}`, borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.t1 }}>{m.name}{m.code ? ` — ${m.code}` : ""}</div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 4, display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
            {m.registration_no || <span style={{ color: T.amb }}>Registration no. nahi bhara</span>}
            <Pill label={owned ? "Owned" : "Rented"} c={owned ? T.ind : T.t3} bg={owned ? T.indL : T.sltL} />
            {m.operator_name && <span>· Operator: {m.operator_name}</span>}
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 7 }}>
            Meter <b style={{ color: T.t1 }}>{m.meter?.hours != null ? fmtN(m.meter.hours) + " hrs" : m.meter?.km != null ? fmtN(m.meter.km) + " km" : "—"}</b>
            {m.meter && <span style={{ color: T.t4 }}> · {m.meter.source} se, {meterAge(m.meter.days_old)}</span>}
            {m.purchase_cost ? <span> · purchase {fmtC(m.purchase_cost)}</span> : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          {worst && (
            <div style={{ border: `1.5px solid ${T.b1}`, borderRadius: 10, padding: "8px 12px", minWidth: 170 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.t2 }}>{docLabel(worst.doc_type)}</div>
              <div style={{ fontSize: 10, color: T.t4 }}>{expiryTone(worst.days).label} · {fmtD(worst.valid_till)}</div>
            </div>
          )}
          <Btn ghost icon={IcGauge} onClick={() => setMeterOpen(true)}>Meter</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, borderBottom: `1.5px solid ${T.b1}`, marginBottom: 16, overflowX: "auto" }}>
        {TABS.map((x) => (
          <button key={x.id} type="button" onClick={() => setTab(x.id)}
            style={{ padding: "9px 15px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "none", background: "none", fontFamily: "inherit", whiteSpace: "nowrap", marginBottom: "-1.5px", color: activeTab === x.id ? T.ind : T.t3, borderBottom: `2px solid ${activeTab === x.id ? T.ind : "transparent"}` }}>
            {x.l}
          </button>
        ))}
      </div>

      {activeTab === "ov" && (
        <Panel title="Timeline — fuel, usage, service, kaagaz ek saath">
          {timeline.length === 0 && <Empty>Is machine par abhi koi record nahi.</Empty>}
          {timeline.map((r, i) => {
            const tone = r.kind === "fuel" ? { c: T.ind, bg: T.indL, l: "Fuel" }
              : r.kind === "usage" ? { c: T.blu, bg: T.bluL, l: "Usage" }
              : r.kind === "service" ? { c: T.grn, bg: T.grnL, l: "Service" }
              : { c: T.slt, bg: T.sltL, l: "Document" };
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
        <Panel title="Service log">
          <Empty>
            Service log agle phase (M2) me aayega.<br />
            <span style={{ fontSize: 11.5 }}>
              Tab tak kaunsa part kab badla — wo yahan nahi rakha ja sakta.
            </span>
          </Empty>
        </Panel>
      )}

      {activeTab === "fuel" && (
        <>
          <Notice>Ye Fuel module ka hi data hai, is machine par chhaan kar. Entry wahin se hoti hai — do jagah entry se hisaab kabhi milta nahi.</Notice>
          <Panel title="Fuel">
            {fuelRows.length === 0 && <Empty>Is machine par koi diesel record nahi.</Empty>}
            {fuelRows.length > 0 && (
              <>
                <Row head cols="100px 1.4fr 100px 110px 100px">
                  <span>Date</span><span>Kahan se</span><span>Litres</span><span>Meter</span><span style={{ textAlign: "right" }}>Amount</span>
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
        <Panel title="Usage">
          {usageRows.length === 0 && <Empty>Koi usage entry nahi.</Empty>}
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
        <Panel title="Documents & permits" action={<Btn size="sm" icon={IcAdd} onClick={() => setDocOpen(true)}>Document</Btn>}>
          {docs.length === 0 && (
            <Empty>
              Koi kaagaz darj nahi.<br />
              <span style={{ fontSize: 11.5 }}>Insurance, fitness, PUC, permit — expiry yahin se yaad dilayi jaati hai.</span>
            </Empty>
          )}
          {docs.length > 0 && (
            <>
              <Row head cols="1.2fr 1.3fr 110px 100px 130px">
                <span>Document</span><span>Number / issuer</span><span>Valid till</span><span>Fee</span><span>Status</span>
              </Row>
              {docRows.map((d) => {
                const isCurrent = curIds.has(d.id);
                const tone = expiryTone(d.days);
                return (
                  <Row key={d.id} cols="1.2fr 1.3fr 110px 100px 130px">
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>
                      {docLabel(d.doc_type)}
                      {!isCurrent && <span style={{ fontSize: 10, color: T.t4, fontWeight: 500 }}> · purana</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: T.t3 }}>{[d.doc_no, d.provider_name].filter(Boolean).join(" · ") || "—"}</span>
                    <span style={{ fontSize: 12 }}>{fmtD(d.valid_till)}</span>
                    <span style={{ fontSize: 12 }}>{d.amount ? fmtC(d.amount) : "—"}</span>
                    <span>{isCurrent ? <Pill label={tone.label} c={tone.c} bg={tone.bg} /> : <Pill label="History" c={T.t3} bg={T.sltL} />}</span>
                  </Row>
                );
              })}
              <div style={{ padding: "9px 15px", fontSize: 10.5, color: T.t4 }}>
                Renewal par nayi row banti hai — purani history me rehti hai. Reminder hamesha sabse nayi wali par chalta hai.
              </div>
            </>
          )}
        </Panel>
      )}

      <DocForm open={docOpen} onClose={() => setDocOpen(false)} machine={m}
        onSaved={() => { load(); onChanged && onChanged(); }} />
      <MeterForm open={meterOpen} onClose={() => setMeterOpen(false)} machine={m} current={m.meter}
        onSaved={() => { load(); onChanged && onChanged(); }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODULE
// ══════════════════════════════════════════════════════════════════
function MachineryModule() {
  const [tab, setTab] = useState("fleet");
  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState([]);
  const [due, setDue] = useState([]);
  const [gaps, setGaps] = useState({ gaps: [], counts: {} });
  const [openId, setOpenId] = useState(null);

  // silent = background refresh. Spinner sirf pehli baar; warna machine detail
  // khuli ho to wo unmount ho kar apna tab bhool jaata hai.
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const [f, d, g] = await Promise.all([
      api.get("/machinery/fleet").catch(() => null),
      api.get("/machinery/due").catch(() => null),
      api.get("/machinery/reports/gaps").catch(() => null),
    ]);
    setFleet(f?.success ? f.data || [] : []);
    setDue(d?.success ? d.data || [] : []);
    setGaps(g?.success ? g.data || { gaps: [], counts: {} } : { gaps: [], counts: {} });
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
    { l: "Machines", v: fleet.length, sub: `${owned.length} owned · ${fleet.length - owned.length} rented`, c: T.ind, I: IcTruck },
    { l: "Kaagaz khatam / paas", v: active.length, sub: expired.length ? `${expired.length} nikal chuke` : "30 din ke andar", c: active.length ? T.red : T.grn, I: IcDoc },
    { l: "Meter purani/nahi", v: (gaps.counts.meter || 0), sub: "iske bina service due nahi nikalti", c: (gaps.counts.meter ? T.amb : T.grn), I: IcGauge },
    { l: "Reg. no. missing", v: (gaps.counts.registration_no || 0), sub: "owned machines", c: (gaps.counts.registration_no ? T.amb : T.grn), I: IcAlert },
  ]), [fleet, owned, active, expired, gaps]);

  const TABS = [
    { id: "fleet", l: "Fleet", I: IcTruck },
    { id: "due", l: "Reminders", I: IcBell, badge: active.length || null },
    { id: "insights", l: "Insights", I: IcSpark },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #E2E8F0", borderTopColor: T.ind, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#8896A6" }}>Loading Machinery...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: T.bg, height: "100%", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 20px" }}>
        {openId ? (
          <MachineDetail id={openId} onBack={() => setOpenId(null)} onChanged={() => load(true)} />
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

            {tab === "fleet" && (
              <Panel title="Fleet">
                {fleet.length === 0 && <Empty>Koi machine register nahi. Library → Equipment se add karein.</Empty>}
                {fleet.length > 0 && (
                  <>
                    <Row head cols="1.8fr 100px 1.1fr 1.2fr 130px">
                      <span>Machine</span><span>Ownership</span><span>Current meter</span><span>Documents</span><span>Health</span>
                    </Row>
                    {fleet.map((m) => {
                      const tone = m.doc_status ? expiryTone(m.doc_status.days) : null;
                      const bad = m.doc_status && m.doc_status.days < 0;
                      const soon = m.doc_status && m.doc_status.days >= 0 && m.doc_status.days <= 30;
                      return (
                        <Row key={m.id} cols="1.8fr 100px 1.1fr 1.2fr 130px" onClick={() => setOpenId(m.id)}>
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{m.name}{m.code ? ` — ${m.code}` : ""}</div>
                            <div style={{ fontSize: 10.5, color: T.t4 }}>
                              {m.registration_no || (m.owned ? "reg. no. nahi" : m.default_vendor_name || "—")}
                            </div>
                          </div>
                          <span><Pill label={m.owned ? "Owned" : "Rented"} c={m.owned ? T.ind : T.t3} bg={m.owned ? T.indL : T.sltL} /></span>
                          <span>{m.owned ? <MeterCell meter={m.meter} unit={m.meter_unit} /> : <span style={{ fontSize: 11.5, color: T.t4 }}>Vendor scope</span>}</span>
                          <span>
                            {m.doc_status
                              ? <Pill label={`${docLabel(m.doc_status.type)} · ${tone.label}`} c={tone.c} bg={tone.bg} />
                              : <span style={{ fontSize: 11, color: T.t4 }}>{m.owned ? "Koi kaagaz nahi" : "Verify baaki"}</span>}
                          </span>
                          <span>
                            {bad ? <Pill label="Action needed" c={T.red} bg={T.redL} />
                              : soon ? <Pill label="Dhyan dein" c={T.amb} bg={T.ambL} />
                              : <Pill label="OK" c={T.grn} bg={T.grnL} />}
                          </span>
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
                  Kaagaz ki expiry par bell apne aap jaati hai — 30 / 15 / 7 / 1 din pehle aur khatam hone wale din, har ek baar hi.
                  Ye Sahayak ke daily digest se alag chalti hai, kyunki digest teen din me ek baar hi aata hai aur date koi intezaar nahi karti.
                </Notice>
                <Panel title="Reminders">
                  {due.length === 0 && <Empty>Agle 45 din me kuch due nahi.</Empty>}
                  {due.length > 0 && (
                    <>
                      <Row head cols="110px 1.5fr 1.4fr 110px 110px">
                        <span>Due</span><span>Machine</span><span>Kya</span><span>Date</span><span></span>
                      </Row>
                      {due.map((d) => {
                        const tone = expiryTone(d.days);
                        return (
                          <Row key={d.ref_type + d.ref_id} cols="110px 1.5fr 1.4fr 110px 110px">
                            <span><Pill label={d.snoozed ? "Snoozed" : tone.label} c={d.snoozed ? T.t3 : tone.c} bg={d.snoozed ? T.sltL : tone.bg} /></span>
                            <div>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{d.machine_name}</div>
                              <div style={{ fontSize: 10.5, color: T.t4 }}>{d.registration_no || (d.scope === "vendor" ? "kiraye ki" : "—")}</div>
                            </div>
                            <span style={{ fontSize: 12, color: T.t2 }}>
                              {d.label}{d.provider ? ` — ${d.provider}` : ""}{d.amount ? ` · ${fmtC(d.amount)}` : ""}
                            </span>
                            <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtD(d.valid_till)}</span>
                            <span style={{ textAlign: "right" }}>
                              <Btn size="sm" ghost onClick={() => snooze(d)}>Snooze 7d</Btn>
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
                <Notice>
                  Insights ko do cheezein chahiye jo abhi jam nahi rahi: <b>meter readings</b> aur <b>service history</b>.
                  Wo aate hi service ki tareekh ka anumaan, L/hr se sehat ka ishaara, aur "apni machine sasti ya kiraye ki" — teeno yahin dikhne lagenge.
                </Notice>
                <Panel title="Abhi kya kami hai">
                  {(gaps.gaps || []).length === 0 && <Empty>Koi kami nahi — Insights M2/M3 me chalu honge.</Empty>}
                  {(gaps.gaps || []).map((g) => (
                    <Row key={g.id} cols="1.6fr 1fr 1.4fr">
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{g.name}</span>
                      <span><Pill label={g.owned ? "Owned" : "Rented"} c={g.owned ? T.ind : T.t3} bg={g.owned ? T.indL : T.sltL} /></span>
                      <span style={{ fontSize: 11.5, color: T.t3 }}>
                        {g.missing.map((k) => ({
                          registration_no: "registration no.", meter: "meter reading",
                          fuel_norm: "fuel norm (L/hr)", documents: "koi kaagaz nahi",
                        }[k] || k)).join(" · ")}
                      </span>
                    </Row>
                  ))}
                </Panel>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MachineryModule;
