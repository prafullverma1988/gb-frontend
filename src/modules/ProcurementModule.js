import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../config/api";

// ── ICONS ─────────────────────────────────────────────────────────────
const Ic = ({ d, size = 18, color = "currentColor", sw = 1.8, fill = "none", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}><path d={d} /></svg>
);
const IcMR      = (p) => <Ic {...p} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />;
const IcPO      = (p) => <Ic {...p} d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />;
const IcGRN     = (p) => <Ic {...p} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM2 9h20M12 15a2 2 0 100-4 2 2 0 000 4" />;
const IcDirect  = (p) => <Ic {...p} d="M12 2v10m0 0l-3-3m3 3l3-3M3 17a9 9 0 0018 0" />;
const IcAlert   = (p) => <Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />;
const IcAdd     = (p) => <Ic {...p} d="M12 5v14M5 12h14" />;
const IcX       = (p) => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcChk     = (p) => <Ic {...p} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const IcWA      = (p) => <Ic {...p} fill="currentColor" sw={0} d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />;
const IcSearch  = (p) => <Ic {...p} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />;
const IcHistory = (p) => <Ic {...p} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />;
const IcEdit    = (p) => <Ic {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const IcDown    = (p) => <Ic {...p} d="M6 9l6 6 6-6" />;
const IcTruck   = (p) => <Ic {...p} d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />;
const IcBarcode = (p) => <Ic {...p} d="M3 9V5a2 2 0 012-2h2M3 15v4a2 2 0 002 2h2M15 3h4a2 2 0 012 2v4M15 21h4a2 2 0 002-2v-4M7 8v8M10 8v8M13 8v8M16 8v8" />;
const IcSend    = (p) => <Ic {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />;
const IcLedger  = (p) => <Ic {...p} d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />;

// ── COLORS ──────────────────────────────────────────────────────────────
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF", bluM: "#BFDBFE",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  slt: "#64748B", sltL: "#F1F5F9",
  pur: "#7C3AED", purL: "#F5F3FF",
};
const fmt  = (n) => n >= 10000000 ? `${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `${(n / 1000).toFixed(0)}K`;
const fmtN = (n) => Math.abs(n).toLocaleString("en-IN");

// ── STATUS CONFIG ──────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:   { c: T.amb, bg: T.ambL, b: T.ambM, label: "Pending" },
  approved:  { c: T.grn, bg: T.grnL, b: T.grnM, label: "Approved" },
  rejected:  { c: T.red, bg: T.redL, b: T.redM, label: "Rejected" },
  received:  { c: T.blu, bg: T.bluL, b: T.bluM, label: "Received" },
  partial:   { c: T.pur, bg: T.purL, b: "#DDD6FE", label: "Partial" },
  cancelled: { c: T.slt, bg: T.sltL, b: T.b2, label: "Cancelled" },
  ordered:   { c: "#0277BD", bg: "#E1F5FE", b: "#81D4FA", label: "Ordered" },
  billed:    { c: T.grn, bg: T.grnL, b: T.grnM, label: "Billed" },
  po_created:{ c: T.blu, bg: T.bluL, b: T.bluM, label: "PO Created" },
};
const StatusBadge = ({ status }) => {
  const s = STATUS_CFG[status] || { c: T.slt, bg: T.sltL, b: T.b2, label: status };
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: s.bg, color: s.c, border: `1px solid ${s.b}`, whiteSpace: "nowrap" }}>{s.label}</span>;
};

// ── SEARCHSELECT ───────────────────────────────────────────────────────
function SearchSelect({ options = [], value, onChange, placeholder = "Select...", accent = T.blu }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });
  const ref = useRef(); const listRef = useRef();
  const filtered = options.filter(o => (typeof o === "string" ? o : o.label).toLowerCase().includes(q.toLowerCase()));

  const openDrop = () => {
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 180) });
    setOpen(true); setQ("");
  };
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const sel = (v) => { onChange(v); setOpen(false); setQ(""); };
  const display = value || "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={open ? () => setOpen(false) : openDrop}
        style={{ height: 32, padding: "0 28px 0 9px", borderRadius: 7, border: `1.5px solid ${open ? accent : T.b1}`, fontSize: 12.5, background: T.surface, cursor: "pointer", display: "flex", alignItems: "center", color: display ? T.t1 : T.t4, boxSizing: "border-box", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {display || placeholder}
      </div>
      <span style={{ position: "absolute", right: 6, top: "50%", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, pointerEvents: "none", transition: "transform 0.18s", display: "flex", color: T.t4 }}>
        <IcDown size={12} color="currentColor" />
      </span>
      {open && createPortal(
        <div ref={listRef} style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width, background: T.surface, borderRadius: 8, border: `1.5px solid ${accent}`, boxShadow: "0 8px 28px rgba(0,0,0,0.18)", zIndex: 99999, maxHeight: 220, overflowY: "auto" }}>
          <div style={{ padding: "6px 8px", borderBottom: `1px solid ${T.b1}` }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." autoFocus
              style={{ width: "100%", height: 28, padding: "0 8px", borderRadius: 5, border: `1px solid ${T.b1}`, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          {filtered.length === 0 && <div style={{ padding: "10px", fontSize: 11, color: T.t4, textAlign: "center" }}>No results</div>}
          {filtered.map((o, i) => {
            const label = typeof o === "string" ? o : o.label;
            const val = typeof o === "string" ? o : o.value;
            return (
              <div key={i} onMouseDown={() => sel(val)}
                style={{ padding: "7px 10px", fontSize: 12.5, cursor: "pointer", color: val === value ? accent : T.t1, fontWeight: val === value ? 700 : 400, background: val === value ? accent + "14" : "transparent", borderBottom: i < filtered.length - 1 ? `1px solid ${T.b1}` : "none" }}>
                {label}
              </div>
            );
          })}
        </div>, document.body
      )}
    </div>
  );
}

// ── STAT TILE ──────────────────────────────────────────────────────────
const Tile = ({ label, value, sub, color, icon }) => (
  <div style={{ background: T.surface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${T.b1}`, borderLeft: `3px solid ${color}`, flex: 1, minWidth: 140 }}>
    <div style={{ fontSize: 9.5, color: T.t4, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: T.t1 }}>{value}</div>
    {sub && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 3 }}>{sub}</div>}
  </div>
);

// ── ITEM ROW BUILDER (shared across modals) ────────────────────────────
const HEADS = ["Civil", "Structural", "Electrical", "Plumbing", "Finishing", "Mechanical", "Safety", "General"];
const UNITS = ["Bag", "MT", "KG", "CFT", "CuM", "Sqft", "Nos", "Ltr", "RFt", "Set", "Box", "Lumpsum", "Day"];

const ItemRow = ({ row, idx, onChange, onRemove, showRate = true, showPoRate = false }) => {
  const inp = { height: 30, padding: "0 7px", borderRadius: 5, border: `1px solid ${T.b1}`, fontSize: 11.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: T.surfaceB, color: T.t1 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: `24px 1fr ${showPoRate ? "80px " : ""}80px 70px ${showRate ? "80px 80px" : ""} 24px`, gap: 5, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.b1}` }}>
      <span style={{ fontSize: 11, color: T.t4, textAlign: "center" }}>{idx + 1}</span>
      <input value={row.item_name} onChange={e => onChange("item_name", e.target.value)} placeholder="Item name..." style={{ ...inp }} />
      {showPoRate && <input value={row.po_rate || ""} readOnly style={{ ...inp, color: T.t3, background: "#F9FAFB" }} placeholder="PO rate" />}
      <select value={row.unit} onChange={e => onChange("unit", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
        {UNITS.map(u => <option key={u}>{u}</option>)}
      </select>
      <input type="number" value={row.qty} onChange={e => onChange("qty", e.target.value)} placeholder="Qty" style={{ ...inp, textAlign: "right" }} />
      {showRate && <>
        <input type="number" value={row.rate || ""} onChange={e => onChange("rate", e.target.value)} placeholder="Rate" style={{ ...inp, textAlign: "right" }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: T.grn, textAlign: "right", minWidth: 64 }}>
          {row.qty && row.rate ? `₹${fmtN(parseFloat(row.qty) * parseFloat(row.rate))}` : "—"}
        </span>
      </>}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, display: "flex", padding: 2 }}><IcX size={14} /></button>
    </div>
  );
};

// ── MODAL SHELL ────────────────────────────────────────────────────────
const Modal = ({ title, subtitle, color = T.blu, width = 680, onClose, children, footer }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div style={{ background: T.surface, borderRadius: 14, width, maxWidth: "96vw", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.28)", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", background: color, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, cursor: "pointer", color: "white", padding: "4px 10px", fontSize: 14 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>{children}</div>
      {footer && <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>{footer}</div>}
    </div>
  </div>
);

const Btn = ({ label, onClick, color = T.blu, disabled, icon }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ padding: "8px 18px", borderRadius: 7, background: disabled ? T.b1 : color, color: disabled ? T.t4 : "white", fontSize: 12.5, fontWeight: 700, border: "none", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
    {icon}{label}
  </button>
);
const BtnOutline = ({ label, onClick, color = T.slt }) => (
  <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: 7, border: `1.5px solid ${T.b1}`, background: T.surface, fontSize: 12.5, fontWeight: 600, color, cursor: "pointer" }}>{label}</button>
);

const Field = ({ label, children, required }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}{required && " *"}</label>
    {children}
  </div>
);
const inp = (extra = {}) => ({ height: 34, padding: "0 10px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: T.surface, color: T.t1, width: "100%", ...extra });

// ── CHALLAN CHECK MODAL ────────────────────────────────────────────────
function ChallanCheckModal({ onClose }) {
  const [challan, setChallan] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!challan.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/procurement/challan-check?challan_no=${encodeURIComponent(challan)}`);
      setResult(res.data);
    } catch { setResult(null); }
    setLoading(false);
  };

  return (
    <Modal title="Challan Search" subtitle="Check if challan is already received or billed" color={T.slt} width={520} onClose={onClose}
      footer={<BtnOutline label="Close" onClick={onClose} />}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={challan} onChange={e => setChallan(e.target.value)} onKeyDown={e => e.key === "Enter" && check()}
          placeholder="Enter challan number..." style={{ ...inp(), flex: 1 }} />
        <Btn label={loading ? "Searching..." : "Search"} onClick={check} icon={<IcSearch size={14} />} />
      </div>
      {result && (
        <div style={{ background: T.surfaceB, borderRadius: 8, padding: 14, border: `1px solid ${T.b1}` }}>
          {!result.grn_exists ? (
            <div style={{ color: T.grn, fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
              <IcChk size={16} color={T.grn} /> Challan not found — safe to enter
            </div>
          ) : (
            <>
              <div style={{ color: result.billed ? T.grn : T.amb, fontWeight: 700, marginBottom: 10, display: "flex", gap: 8 }}>
                <IcAlert size={16} color={result.billed ? T.grn : T.amb} />
                {result.billed ? "✓ Already billed" : "⚠ Received but NOT yet billed"}
              </div>
              {result.grns.map((g, i) => (
                <div key={i} style={{ padding: "8px 10px", background: T.surface, borderRadius: 6, border: `1px solid ${T.b1}`, marginBottom: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: T.t1 }}>{g.grn_number} — {g.vendor_name}</div>
                  <div style={{ color: T.t3, marginTop: 2 }}>{g.project_name} · {g.received_date?.slice(0, 10)}</div>
                  <StatusBadge status={g.status} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── NEW MR MODAL ───────────────────────────────────────────────────────
function NewMRModal({ onClose, onSave, projects, parties }) {
  const blank = () => ({ item_name: "", unit: UNITS[0], qty: "", specification: "", head: HEADS[0] });
  const [projectId, setProjectId] = useState("");
  const [note, setNote] = useState("");
  const [reqDate, setReqDate] = useState("");
  const [rows, setRows] = useState([blank()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!projectId || rows.every(r => !r.item_name)) { setErr("Project and at least one item required"); return; }
    setSaving(true); setErr("");
    try {
      const res = await api.post("/procurement/material-requests", {
        project_id: projects.find(p => p.name === projectId)?.id || null,
        items: rows.filter(r => r.item_name).map(r => ({ ...r, qty: parseFloat(r.qty) || 0 })),
        note, required_date: reqDate || null
      });
      if (res?.success === false) { setErr(res.message || "Failed"); setSaving(false); return; }
      onSave(); onClose();
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  };

  return (
    <Modal title="New Material Request" subtitle="Site team raises request for approval" color="#0277BD" width={720} onClose={onClose}
      footer={<><BtnOutline label="Cancel" onClick={onClose} /><Btn label={saving ? "Submitting..." : "Submit MR"} onClick={save} disabled={saving} icon={<IcMR size={14} />} /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Field label="Project / Site" required>
          <SearchSelect options={projects.map(p => p.name)} value={projectId} onChange={setProjectId} placeholder="Select project..." accent="#0277BD" />
        </Field>
        <Field label="Required By Date">
          <input type="date" value={reqDate} onChange={e => setReqDate(e.target.value)} style={inp()} />
        </Field>
        <Field label="Note">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Any note..." style={inp()} />
        </Field>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>Items *</div>
      <div style={{ background: T.surfaceB, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.b1}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 70px 24px", gap: 5, marginBottom: 4 }}>
          {["#", "Item Name", "Unit", "Qty", ""].map((h, i) => <span key={i} style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase" }}>{h}</span>)}
        </div>
        {rows.map((r, i) => (
          <ItemRow key={i} row={r} idx={i} showRate={false}
            onChange={(k, v) => setRows(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x))}
            onRemove={() => rows.length > 1 && setRows(p => p.filter((_, j) => j !== i))} />
        ))}
        <button onClick={() => setRows(p => [...p, blank()])}
          style={{ marginTop: 8, padding: "5px 12px", borderRadius: 6, border: `1px dashed ${T.b2}`, background: "none", color: T.t3, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <IcAdd size={13} /> Add Item
        </button>
      </div>
      {err && <div style={{ marginTop: 10, padding: "8px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, color: T.red, fontSize: 12 }}>{err}</div>}
    </Modal>
  );
}

// ── NEW PO MODAL ───────────────────────────────────────────────────────
function NewPOModal({ onClose, onSave, projects, parties }) {
  const blank = () => ({ item_name: "", unit: UNITS[0], qty: "", rate: "", hsn_code: "", head: HEADS[0] });
  const [projectId, setProjectId] = useState("");
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [delivDate, setDelivDate] = useState("");
  const [rows, setRows] = useState([blank()]);
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");

  const grandTotal = rows.reduce((s, r) => s + (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0), 0);

  const save = async () => {
    if (!projectId || !vendor || rows.every(r => !r.item_name)) { setErr("Project, vendor & items required"); return; }
    setSaving(true); setErr("");
    try {
      const proj = projects.find(p => p.name === projectId);
      const party = parties.find(p => p.name === vendor);
      const res = await api.post("/procurement/purchase-orders", {
        project_id: proj?.id, party_id: party?.id,
        items: rows.filter(r => r.item_name).map(r => ({ ...r, qty: parseFloat(r.qty) || 0, rate: parseFloat(r.rate) || 0 })),
        note, expected_delivery: delivDate || null
      });
      if (res?.success === false) { setErr(res.message || "Failed"); setSaving(false); return; }
      onSave(); onClose();
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  };

  return (
    <Modal title="Create Purchase Order" subtitle="Formal PO with HSN & rate — auto payable on approval" color={T.blu} width={800} onClose={onClose}
      footer={<><BtnOutline label="Cancel" onClick={onClose} /><Btn label={saving ? "Creating..." : `Create PO — ₹${fmtN(grandTotal)}`} onClick={save} disabled={saving} icon={<IcPO size={14} />} /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <Field label="Project / Site" required>
          <SearchSelect options={projects.map(p => p.name)} value={projectId} onChange={setProjectId} placeholder="Select project..." />
        </Field>
        <Field label="Vendor / Supplier" required>
          <SearchSelect options={parties.filter(p => ["Material Supplier", "Sub-Con", "Other Vendor"].includes(p.type)).map(p => p.name)} value={vendor} onChange={setVendor} placeholder="Select vendor..." />
        </Field>
        <Field label="Expected Delivery">
          <input type="date" value={delivDate} onChange={e => setDelivDate(e.target.value)} style={inp()} />
        </Field>
      </div>
      <Field label="Note / Terms">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Payment terms, delivery instructions..." style={{ ...inp(), marginBottom: 12 }} />
      </Field>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>Line Items *</div>
      <div style={{ background: T.surfaceB, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.b1}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 70px 80px 80px 24px", gap: 5, marginBottom: 4 }}>
          {["#", "Item Name", "Unit", "Qty", "Rate", "Amount", ""].map((h, i) => <span key={i} style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", textAlign: i >= 3 ? "right" : "left" }}>{h}</span>)}
        </div>
        {rows.map((r, i) => (
          <ItemRow key={i} row={r} idx={i} showRate
            onChange={(k, v) => setRows(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x))}
            onRemove={() => rows.length > 1 && setRows(p => p.filter((_, j) => j !== i))} />
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
          <button onClick={() => setRows(p => [...p, blank()])}
            style={{ padding: "5px 12px", borderRadius: 6, border: `1px dashed ${T.b2}`, background: "none", color: T.t3, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <IcAdd size={13} /> Add Item
          </button>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.blu }}>TOTAL: ₹{fmtN(grandTotal)}</div>
        </div>
      </div>
      {err && <div style={{ marginTop: 10, padding: "8px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, color: T.red, fontSize: 12 }}>{err}</div>}
    </Modal>
  );
}

// ── GRN MODAL ─────────────────────────────────────────────────────────
function GRNModal({ onClose, onSave, projects, parties, pos }) {
  const blank = () => ({ item_name: "", unit: UNITS[0], qty_ordered: "", qty_received: "", rate: "", head: HEADS[0] });
  const [projectId, setProjectId] = useState("");
  const [vendor, setVendor] = useState("");
  const [selectedPO, setSelectedPO] = useState("");
  const [challan, setChallan] = useState("");
  const [rcvDate, setRcvDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPartial, setIsPartial] = useState(false);
  const [rows, setRows] = useState([blank()]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const [challanWarn, setChallanWarn] = useState(false);

  const checkChallan = async () => {
    if (!challan.trim()) return;
    try {
      const res = await api.get(`/procurement/challan-check?challan_no=${encodeURIComponent(challan)}`);
      setChallanWarn(res.data?.grn_exists);
    } catch { }
  };

  const save = async () => {
    if (!vendor || !rows.every(r => r.item_name)) { setErr("Vendor and all item names required"); return; }
    setSaving(true); setErr("");
    try {
      const proj = projects.find(p => p.name === projectId);
      const party = parties.find(p => p.name === vendor);
      const po = pos.find(p => p.po_number === selectedPO);
      const res = await api.post("/procurement/grn", {
        po_id: po?.id, project_id: proj?.id || po?.project_id,
        party_id: party?.id, party_name: vendor,
        challan_no: challan || null, received_date: rcvDate,
        is_partial: isPartial, note: note || null,
        items: rows.filter(r => r.item_name).map(r => ({ ...r, qty_ordered: parseFloat(r.qty_ordered) || 0, qty_received: parseFloat(r.qty_received) || parseFloat(r.qty_ordered) || 0, rate: parseFloat(r.rate) || 0 }))
      });
      if (res?.success === false) { setErr(res.message || "Failed"); setSaving(false); return; }
      if (res?.rate_alerts?.length) alert(`⚠ Rate variance detected on: ${res.rate_alerts.map(a => a.item).join(", ")}`);
      onSave(); onClose();
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  };

  return (
    <Modal title="Record GRN" subtitle="Goods Received Note — partial or full delivery" color="#00695C" width={800} onClose={onClose}
      footer={<><BtnOutline label="Cancel" onClick={onClose} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.t2, cursor: "pointer", marginRight: 8 }}>
          <input type="checkbox" checked={isPartial} onChange={e => setIsPartial(e.target.checked)} /> Partial delivery
        </label>
        <Btn label={saving ? "Saving..." : "Record GRN"} onClick={save} disabled={saving} color="#00695C" icon={<IcTruck size={14} />} /></>}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Field label="Link PO (optional)">
          <SearchSelect options={pos.map(p => p.po_number)} value={selectedPO} onChange={v => { setSelectedPO(v); const po = pos.find(p => p.po_number === v); if (po) setVendor(po.vendor_name || ""); }} placeholder="Select PO..." accent="#00695C" />
        </Field>
        <Field label="Vendor" required>
          <SearchSelect options={parties.filter(p => ["Material Supplier", "Sub-Con", "Other Vendor"].includes(p.type)).map(p => p.name)} value={vendor} onChange={setVendor} placeholder="Select vendor..." accent="#00695C" />
        </Field>
        <Field label="Project">
          <SearchSelect options={projects.map(p => p.name)} value={projectId} onChange={setProjectId} placeholder="Select project..." accent="#00695C" />
        </Field>
        <Field label="Received Date">
          <input type="date" value={rcvDate} onChange={e => setRcvDate(e.target.value)} style={inp()} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Field label="Challan Number">
          <input value={challan} onChange={e => { setChallan(e.target.value); setChallanWarn(false); }} onBlur={checkChallan}
            placeholder="Vendor challan / delivery note no." style={{ ...inp(), borderColor: challanWarn ? T.amb : T.b1 }} />
          {challanWarn && <div style={{ fontSize: 10.5, color: T.amb, marginTop: 2 }}>⚠ This challan may already exist!</div>}
        </Field>
        <Field label="Note">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Condition of goods, driver name..." style={inp()} />
        </Field>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", marginBottom: 6 }}>Items Received *</div>
      <div style={{ background: T.surfaceB, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.b1}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 70px 70px 80px 80px 24px", gap: 5, marginBottom: 4 }}>
          {["#", "Item", "Unit", "Ordered", "Received", "Rate", "Amount", ""].map((h, i) => <span key={i} style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", textAlign: i >= 3 ? "right" : "left" }}>{h}</span>)}
        </div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 70px 70px 80px 80px 24px", gap: 5, alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${T.b1}` }}>
            <span style={{ fontSize: 11, color: T.t4, textAlign: "center" }}>{i + 1}</span>
            <input value={r.item_name} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, item_name: e.target.value } : x))} placeholder="Item name..." style={{ ...inp({ height: 30, fontSize: 11.5 }) }} />
            <select value={r.unit} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} style={{ ...inp({ height: 30, fontSize: 11, cursor: "pointer" }) }}>
              {UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
            <input type="number" value={r.qty_ordered} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, qty_ordered: e.target.value } : x))} placeholder="0" style={{ ...inp({ height: 30, fontSize: 11.5, textAlign: "right" }) }} />
            <input type="number" value={r.qty_received} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, qty_received: e.target.value } : x))} placeholder="0" style={{ ...inp({ height: 30, fontSize: 11.5, textAlign: "right", borderColor: r.qty_received && r.qty_ordered && parseFloat(r.qty_received) < parseFloat(r.qty_ordered) ? T.amb : T.b1 }) }} />
            <input type="number" value={r.rate} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, rate: e.target.value } : x))} placeholder="₹" style={{ ...inp({ height: 30, fontSize: 11.5, textAlign: "right" }) }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: T.grn, textAlign: "right" }}>
              {r.qty_received && r.rate ? `₹${fmtN((parseFloat(r.qty_received) || 0) * (parseFloat(r.rate) || 0))}` : "—"}
            </span>
            <button onClick={() => rows.length > 1 && setRows(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, display: "flex" }}><IcX size={14} /></button>
          </div>
        ))}
        <button onClick={() => setRows(p => [...p, blank()])} style={{ marginTop: 8, padding: "5px 12px", borderRadius: 6, border: `1px dashed ${T.b2}`, background: "none", color: T.t3, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <IcAdd size={13} /> Add Item
        </button>
      </div>
      {err && <div style={{ marginTop: 10, padding: "8px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, color: T.red, fontSize: 12 }}>{err}</div>}
    </Modal>
  );
}

// ── DIRECT RECEIPT MODAL ───────────────────────────────────────────────
function DirectReceiptModal({ onClose, onSave, projects, parties }) {
  const blank = () => ({ item_name: "", unit: UNITS[0], qty_received: "", rate: "", head: HEADS[0] });
  const [projectId, setProjectId] = useState("");
  const [vendor, setVendor] = useState("");
  const [challan, setChallan] = useState("");
  const [rcvDate, setRcvDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([blank()]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");

  const save = async () => {
    if (!vendor || rows.every(r => !r.item_name)) { setErr("Vendor and items required"); return; }
    setSaving(true); setErr("");
    try {
      const proj = projects.find(p => p.name === projectId);
      const party = parties.find(p => p.name === vendor);
      const res = await api.post("/procurement/direct-receipt", {
        project_id: proj?.id, party_id: party?.id, party_name: vendor,
        challan_no: challan || null, received_date: rcvDate, note: note || null,
        items: rows.filter(r => r.item_name).map(r => ({ ...r, qty_received: parseFloat(r.qty_received) || 0, rate: parseFloat(r.rate) || 0 }))
      });
      if (res?.success === false) { setErr(res.message || "Failed"); setSaving(false); return; }
      onSave(); onClose();
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  };

  return (
    <Modal title="Direct Receipt" subtitle="Case 3 — No MR/PO. Auto-adds to Finance unbilled section" color={T.amb} width={720} onClose={onClose}
      footer={<><BtnOutline label="Cancel" onClick={onClose} /><Btn label={saving ? "Saving..." : "Log Receipt"} onClick={save} disabled={saving} color={T.amb} icon={<IcDirect size={14} />} /></>}>
      <div style={{ background: T.ambL, border: `1px solid ${T.ambM}`, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 11.5, color: T.amb, fontWeight: 600 }}>
        ⚡ This receipt will auto-appear in Finance → Unbilled section for billing
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Field label="Vendor" required>
          <SearchSelect options={parties.map(p => p.name)} value={vendor} onChange={setVendor} placeholder="Select vendor..." accent={T.amb} />
        </Field>
        <Field label="Project">
          <SearchSelect options={projects.map(p => p.name)} value={projectId} onChange={setProjectId} placeholder="Select project..." accent={T.amb} />
        </Field>
        <Field label="Challan No.">
          <input value={challan} onChange={e => setChallan(e.target.value)} placeholder="Vendor challan no." style={inp()} />
        </Field>
        <Field label="Date">
          <input type="date" value={rcvDate} onChange={e => setRcvDate(e.target.value)} style={inp()} />
        </Field>
      </div>
      <div style={{ background: T.surfaceB, borderRadius: 8, padding: "8px 10px", border: `1px solid ${T.b1}`, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 80px 70px 80px 80px 24px", gap: 5, marginBottom: 4 }}>
          {["#", "Item", "Unit", "Qty", "Rate", "Amount", ""].map((h, i) => <span key={i} style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", textAlign: i >= 3 ? "right" : "left" }}>{h}</span>)}
        </div>
        {rows.map((r, i) => (
          <ItemRow key={i} row={r} idx={i} showRate
            onChange={(k, v) => setRows(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x))}
            onRemove={() => rows.length > 1 && setRows(p => p.filter((_, j) => j !== i))} />
        ))}
        <button onClick={() => setRows(p => [...p, blank()])} style={{ marginTop: 8, padding: "5px 12px", borderRadius: 6, border: `1px dashed ${T.b2}`, background: "none", color: T.t3, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <IcAdd size={13} /> Add Item
        </button>
      </div>
      <Field label="Note">
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for direct receipt, urgency..." style={inp()} />
      </Field>
      {err && <div style={{ marginTop: 10, padding: "8px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, color: T.red, fontSize: 12 }}>{err}</div>}
    </Modal>
  );
}

// ── RATE HISTORY MODAL ─────────────────────────────────────────────────
function RateHistoryModal({ onClose }) {
  const [item, setItem] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!item.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/procurement/rate-history?item_name=${encodeURIComponent(item)}`);
      setData(res.data || []);
    } catch { }
    setLoading(false);
  };

  return (
    <Modal title="Material Rate History" subtitle="Track price trends across vendors and dates" color={T.pur} width={640} onClose={onClose}
      footer={<BtnOutline label="Close" onClick={onClose} />}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input value={item} onChange={e => setItem(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
          placeholder="Search item... e.g. Cement, TMT Steel" style={{ ...inp(), flex: 1 }} />
        <Btn label={loading ? "..." : "Search"} onClick={search} color={T.pur} icon={<IcHistory size={14} />} />
      </div>
      {data.length > 0 && (
        <div style={{ background: T.surfaceB, borderRadius: 8, border: `1px solid ${T.b1}`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 100px 90px", padding: "7px 12px", background: T.purL, borderBottom: `1px solid ${T.b1}` }}>
            {["Item", "Rate/Unit", "Qty", "Vendor", "Date"].map((h, i) => <span key={i} style={{ fontSize: 9, fontWeight: 700, color: T.pur, textTransform: "uppercase" }}>{h}</span>)}
          </div>
          {data.map((d, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 100px 90px", padding: "8px 12px", borderBottom: `1px solid ${T.b1}`, background: i % 2 === 0 ? T.surface : T.surfaceB, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{d.item_name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.grn }}>₹{fmtN(d.rate)}</span>
              <span style={{ fontSize: 11.5, color: T.t3 }}>{d.received_qty} {d.unit}</span>
              <span style={{ fontSize: 11, color: T.t2 }}>{d.vendor_name}</span>
              <span style={{ fontSize: 11, color: T.t4 }}>{d.received_date?.slice(0, 10)}</span>
            </div>
          ))}
        </div>
      )}
      {data.length === 0 && item && !loading && <div style={{ textAlign: "center", padding: 30, color: T.t4 }}>No rate history found for "{item}"</div>}
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN PROCUREMENT MODULE
// ════════════════════════════════════════════════════════════════
export default function ProcurementModule() {
  const [tab, setTab] = useState("mr");
  const [mrs, setMRs] = useState([]);
  const [pos, setPOs] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [rateAlerts, setRateAlerts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modal states
  const [showNewMR, setShowNewMR] = useState(false);
  const [showNewPO, setShowNewPO] = useState(false);
  const [showGRN, setShowGRN] = useState(false);
  const [showDirect, setShowDirect] = useState(false);
  const [showChallan, setShowChallan] = useState(false);
  const [showRateHistory, setShowRateHistory] = useState(false);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [mrRes, poRes, grnRes, alertRes, projRes, partyRes] = await Promise.allSettled([
        api.get("/procurement/material-requests"),
        api.get("/procurement/purchase-orders"),
        api.get("/procurement/grn"),
        api.get("/procurement/rate-alerts"),
        api.get("/projects"),
        api.get("/finance/parties"),
      ]);
      if (mrRes.value?.success)     setMRs(mrRes.value.data || []);
      if (poRes.value?.success)     setPOs(poRes.value.data || []);
      if (grnRes.value?.success)    setGRNs(grnRes.value.data || []);
      if (alertRes.value?.success)  setRateAlerts(alertRes.value.data || []);
      if (projRes.value?.success)   setProjects(projRes.value.data || []);
      if (partyRes.value?.success)  setParties(partyRes.value.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { refreshAll(); }, []);

  // Approve MR
  const approveMR = async (id) => {
    await api.put(`/procurement/material-requests/${id}/approve`, {}).catch(() => {});
    setMRs(p => p.map(r => r.id === id ? { ...r, status: "approved" } : r));
    refreshAll();
  };

  // Approve PO
  const approvePO = async (id) => {
    const res = await api.put(`/procurement/purchase-orders/${id}/approve`, {}).catch(() => null);
    if (res?.success !== false) {
      setPOs(p => p.map(r => r.id === id ? { ...r, status: "approved" } : r));
      alert(res?.message || "PO approved — auto payable created");
    }
  };

  // Approve rate alert
  const approveAlert = async (id) => {
    await api.put(`/procurement/rate-alerts/${id}/approve`, {}).catch(() => {});
    setRateAlerts(p => p.filter(a => a.id !== id));
  };

  // WhatsApp template
  const whatsappOrder = async (po) => {
    try {
      const items = po.items || [{ item_name: "As per PO " + po.po_number, qty: "", unit: "" }];
      const res = await api.post("/procurement/whatsapp-template", {
        vendor_name: po.vendor_name,
        items,
        project_name: po.project_name,
        delivery_date: po.expected_delivery || "ASAP",
        sender_name: "Prafull"
      });
      if (res?.data?.whatsapp_link) window.open(res.data.whatsapp_link, "_blank");
    } catch { }
  };

  // Tabs
  const TABS = [
    { id: "mr",     label: "Material Requests", count: mrs.filter(m => m.status === "pending").length },
    { id: "po",     label: "Purchase Orders",   count: pos.filter(p => p.status === "pending").length },
    { id: "grn",    label: "GRN / Receipts",    count: 0 },
    { id: "alerts", label: "Rate Alerts",        count: rateAlerts.length },
  ];

  const filterRows = (rows) => rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r).some(v => v && String(v).toLowerCase().includes(s));
  });

  // Summary counts
  const pendingMRs = mrs.filter(m => m.status === "pending").length;
  const pendingPOs = pos.filter(p => p.status === "pending").length;
  const poValue = pos.filter(p => ["approved", "partial", "received"].includes(p.status)).reduce((s, p) => s + parseFloat(p.po_value || 0), 0);
  const alertCount = rateAlerts.length;

  const COL_HDR = { fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: "0.3px" };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.b1}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>Procurement</div>
          <div style={{ fontSize: 11, color: T.t4 }}>MR → PO → GRN → Finance</div>
        </div>
        {/* Quick action buttons */}
        <button onClick={() => setShowChallan(true)} style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 11.5, fontWeight: 600, color: T.slt, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcBarcode size={14} /> Challan Check
        </button>
        <button onClick={() => setShowRateHistory(true)} style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 11.5, fontWeight: 600, color: T.pur, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcHistory size={14} /> Rate History
        </button>
        <button onClick={() => setShowDirect(true)} style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1px solid ${T.ambM}`, background: T.ambL, fontSize: 11.5, fontWeight: 700, color: T.amb, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcDirect size={14} /> Direct Receipt
        </button>
        <button onClick={() => setShowGRN(true)} style={{ height: 32, padding: "0 12px", borderRadius: 7, border: `1px solid ${T.grnM}`, background: T.grnL, fontSize: 11.5, fontWeight: 700, color: T.grn, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <IcTruck size={14} /> Record GRN
        </button>
        <button onClick={() => setShowNewPO(true)} style={{ height: 32, padding: "0 12px", borderRadius: 7, background: T.blu, color: "white", fontSize: 11.5, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: `0 2px 8px ${T.blu}44` }}>
          <IcPO size={14} /> New PO
        </button>
        <button onClick={() => setShowNewMR(true)} style={{ height: 32, padding: "0 12px", borderRadius: 7, background: "#0277BD", color: "white", fontSize: 11.5, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px #0277BD44" }}>
          <IcMR size={14} /> New MR
        </button>
      </div>

      {/* ── Summary tiles ── */}
      <div style={{ display: "flex", gap: 10, padding: "10px 20px 0", flexShrink: 0 }}>
        <Tile label="Pending MRs" value={pendingMRs} sub="Awaiting approval" color="#0277BD" />
        <Tile label="Pending POs" value={pendingPOs} sub="Awaiting approval" color={T.blu} />
        <Tile label="Active PO Value" value={`₹${fmt(poValue)}`} sub="Approved + partial" color={T.grn} />
        <Tile label="GRNs This Month" value={grns.length} sub="All receipts" color="#00695C" />
        <Tile label="Rate Alerts" value={alertCount} sub={alertCount > 0 ? "Needs approval" : "All clear"} color={alertCount > 0 ? T.red : T.t4} />
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 2, padding: "10px 20px 0", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "8px 16px", borderRadius: "8px 8px 0 0", border: `1px solid ${t.id === tab ? T.b1 : "transparent"}`, borderBottom: t.id === tab ? `1px solid ${T.surface}` : "none", background: t.id === tab ? T.surface : "none", fontSize: 12.5, fontWeight: t.id === tab ? 700 : 500, color: t.id === tab ? T.blu : T.t3, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {t.label}
            {t.count > 0 && <span style={{ fontSize: 10, fontWeight: 800, background: t.id === tab ? T.blu : T.slt, color: "white", padding: "1px 6px", borderRadius: 10 }}>{t.count}</span>}
          </button>
        ))}
        {/* Search + refresh on right */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, paddingBottom: 2 }}>
          <div style={{ position: "relative" }}>
            <IcSearch size={13} color={T.t4} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ height: 30, padding: "0 10px 0 28px", borderRadius: 7, border: `1px solid ${T.b1}`, fontSize: 11.5, outline: "none", background: T.surface, width: 180 }} />
          </div>
          <button onClick={refreshAll} style={{ height: 30, padding: "0 10px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, fontSize: 11, color: T.slt, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ animation: loading ? "spin 1s linear infinite" : "none" }}><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: "hidden", margin: "0 20px 20px", background: T.surface, borderRadius: "0 8px 8px 8px", border: `1px solid ${T.b1}`, display: "flex", flexDirection: "column" }}>

        {/* ── MR TAB ── */}
        {tab === "mr" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "90px 80px 1fr 120px 100px 90px 140px", padding: "7px 14px", background: T.surfaceB, borderBottom: `2px solid ${T.b1}`, flexShrink: 0, gap: 6 }}>
              {["MR No.", "Date", "Project", "Req By", "Items", "Status", "Action"].map((h, i) => <span key={i} style={COL_HDR}>{h}</span>)}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filterRows(mrs).map((mr, i) => (
                <div key={mr.id} style={{ display: "grid", gridTemplateColumns: "90px 80px 1fr 120px 100px 90px 140px", padding: "10px 14px", gap: 6, borderBottom: `1px solid ${T.b1}`, alignItems: "center", background: i % 2 === 0 ? T.surface : T.surfaceB }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0277BD", background: "#E1F5FE", padding: "2px 7px", borderRadius: 5, display: "inline-block" }}>{mr.mr_number}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{mr.created_at?.slice(0, 10)}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: T.t1 }}>{mr.project_name}</div>
                    {mr.note && <div style={{ fontSize: 10.5, color: T.t4 }}>{mr.note}</div>}
                  </div>
                  <span style={{ fontSize: 12, color: T.t2 }}>{mr.requested_by_name || "—"}</span>
                  <span style={{ fontSize: 12, color: T.t3 }}>{mr.item_count || 0} items</span>
                  <StatusBadge status={mr.status} />
                  <div style={{ display: "flex", gap: 5 }}>
                    {mr.status === "pending" && (
                      <>
                        <button onClick={() => approveMR(mr.id)} style={{ padding: "4px 10px", borderRadius: 6, background: T.grnL, border: `1px solid ${T.grnM}`, color: T.grn, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>
                        <button onClick={() => setShowNewPO(true)} style={{ padding: "4px 9px", borderRadius: 6, background: T.bluL, border: `1px solid ${T.bluM}`, color: T.blu, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>→ PO</button>
                      </>
                    )}
                    {mr.status === "approved" && (
                      <button onClick={() => setShowNewPO(true)} style={{ padding: "4px 10px", borderRadius: 6, background: T.blu, color: "white", border: "none", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>Create PO</button>
                    )}
                  </div>
                </div>
              ))}
              {mrs.length === 0 && <div style={{ textAlign: "center", padding: 50, color: T.t4 }}>No material requests yet. Click "New MR" to create one.</div>}
            </div>
          </>
        )}

        {/* ── PO TAB ── */}
        {tab === "po" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "100px 80px 1fr 150px 90px 100px 90px 160px", padding: "7px 14px", background: T.surfaceB, borderBottom: `2px solid ${T.b1}`, flexShrink: 0, gap: 6 }}>
              {["PO No.", "Date", "Project", "Vendor", "Items", "PO Value", "Status", "Action"].map((h, i) => <span key={i} style={{ ...COL_HDR, textAlign: i >= 4 ? "right" : "left" }}>{h}</span>)}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filterRows(pos).map((po, i) => (
                <div key={po.id} style={{ display: "grid", gridTemplateColumns: "100px 80px 1fr 150px 90px 100px 90px 160px", padding: "10px 14px", gap: 6, borderBottom: `1px solid ${T.b1}`, alignItems: "center", background: i % 2 === 0 ? T.surface : T.surfaceB }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.blu, background: T.bluL, padding: "2px 7px", borderRadius: 5, display: "inline-block" }}>{po.po_number}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{po.created_at?.slice(0, 10)}</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: T.t1 }}>{po.project_name}</div>
                    {po.expected_delivery && <div style={{ fontSize: 10.5, color: T.t4 }}>Delivery: {po.expected_delivery}</div>}
                  </div>
                  <span style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{po.vendor_name}</span>
                  <span style={{ fontSize: 12, color: T.t3, textAlign: "right" }}>{po.item_count || 0}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, textAlign: "right" }}>₹{fmtN(po.po_value || 0)}</span>
                  <StatusBadge status={po.status} />
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {po.status === "pending" && (
                      <button onClick={() => approvePO(po.id)} style={{ padding: "4px 9px", borderRadius: 6, background: T.grnL, border: `1px solid ${T.grnM}`, color: T.grn, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>✓ Approve</button>
                    )}
                    {["approved", "partial"].includes(po.status) && (
                      <>
                        <button onClick={() => setShowGRN(true)} style={{ padding: "4px 8px", borderRadius: 6, background: "#E0F2F1", border: "1px solid #80CBC4", color: "#00695C", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>GRN</button>
                        <button onClick={() => whatsappOrder(po)} style={{ padding: "4px 8px", borderRadius: 6, background: "#DCFCE7", border: "1px solid #86EFAC", color: "#16A34A", fontSize: 10.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                          <IcWA size={12} color="#16A34A" /> WA
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {pos.length === 0 && <div style={{ textAlign: "center", padding: 50, color: T.t4 }}>No purchase orders yet.</div>}
            </div>
          </>
        )}

        {/* ── GRN TAB ── */}
        {tab === "grn" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "100px 80px 1fr 150px 100px 70px 90px 100px", padding: "7px 14px", background: T.surfaceB, borderBottom: `2px solid ${T.b1}`, flexShrink: 0, gap: 6 }}>
              {["GRN No.", "Date", "Project", "Vendor", "Challan No.", "Items", "Type", "Status"].map((h, i) => <span key={i} style={COL_HDR}>{h}</span>)}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filterRows(grns).map((grn, i) => (
                <div key={grn.id} style={{ display: "grid", gridTemplateColumns: "100px 80px 1fr 150px 100px 70px 90px 100px", padding: "10px 14px", gap: 6, borderBottom: `1px solid ${T.b1}`, alignItems: "center", background: i % 2 === 0 ? T.surface : T.surfaceB }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#00695C", background: "#E0F2F1", padding: "2px 7px", borderRadius: 5, display: "inline-block" }}>{grn.grn_number}</span>
                  <span style={{ fontSize: 11.5, color: T.t3 }}>{grn.received_date}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: T.t1 }}>{grn.project_name || "—"}</span>
                  <span style={{ fontSize: 12, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{grn.vendor_name || grn.party_name}</span>
                  <span style={{ fontSize: 11.5, color: grn.challan_no ? T.t1 : T.t4, fontFamily: "monospace" }}>{grn.challan_no || "—"}</span>
                  <span style={{ fontSize: 12, color: T.t3 }}>{grn.item_count || 0}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: grn.receipt_type === "direct" ? T.amb : grn.is_partial ? T.pur : T.grn, background: grn.receipt_type === "direct" ? T.ambL : grn.is_partial ? T.purL : T.grnL, padding: "2px 6px", borderRadius: 10 }}>
                    {grn.receipt_type === "direct" ? "Direct" : grn.is_partial ? "Partial" : "Full"}
                  </span>
                  <StatusBadge status={grn.status} />
                </div>
              ))}
              {grns.length === 0 && <div style={{ textAlign: "center", padding: 50, color: T.t4 }}>No GRN entries yet.</div>}
            </div>
          </>
        )}

        {/* ── RATE ALERTS TAB ── */}
        {tab === "alerts" && (
          <>
            <div style={{ padding: "10px 14px", background: T.redL, borderBottom: `1px solid ${T.redM}`, flexShrink: 0, fontSize: 12, color: T.red, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <IcAlert size={15} color={T.red} />
              {rateAlerts.length > 0 ? `${rateAlerts.length} rate variance alert(s) need admin approval` : "No pending rate alerts — all clear!"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 90px 90px 90px 80px 120px", padding: "7px 14px", background: T.surfaceB, borderBottom: `2px solid ${T.b1}`, flexShrink: 0, gap: 6 }}>
              {["GRN No.", "Item", "PO Rate", "Bill Rate", "Variance", "Status", "Action"].map((h, i) => <span key={i} style={{ ...COL_HDR, textAlign: i >= 2 && i <= 4 ? "right" : "left" }}>{h}</span>)}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {rateAlerts.map((a, i) => {
                const vPct = parseFloat(a.variance_pct);
                const color = vPct > 10 ? T.red : vPct > 5 ? T.amb : T.t2;
                return (
                  <div key={a.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 90px 90px 90px 80px 120px", padding: "10px 14px", gap: 6, borderBottom: `1px solid ${T.b1}`, alignItems: "center", background: i % 2 === 0 ? T.surface : T.surfaceB }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#00695C", background: "#E0F2F1", padding: "2px 6px", borderRadius: 5 }}>{a.grn_number}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: T.t1 }}>{a.item_name}</div>
                      <div style={{ fontSize: 10.5, color: T.t4 }}>{a.project_name}</div>
                    </div>
                    <span style={{ fontSize: 12.5, color: T.grn, textAlign: "right", fontWeight: 600 }}>₹{fmtN(a.po_rate)}</span>
                    <span style={{ fontSize: 12.5, color: color, textAlign: "right", fontWeight: 700 }}>₹{fmtN(a.received_rate)}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color, textAlign: "right" }}>+{vPct}%</span>
                    <StatusBadge status={a.status} />
                    <button onClick={() => approveAlert(a.id)} style={{ padding: "5px 12px", borderRadius: 6, background: T.grnL, border: `1px solid ${T.grnM}`, color: T.grn, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      ✓ Accept Rate
                    </button>
                  </div>
                );
              })}
              {rateAlerts.length === 0 && <div style={{ textAlign: "center", padding: 50, color: T.t4 }}>✓ No rate variance alerts</div>}
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showNewMR    && <NewMRModal onClose={() => setShowNewMR(false)} onSave={refreshAll} projects={projects} parties={parties} />}
      {showNewPO    && <NewPOModal onClose={() => setShowNewPO(false)} onSave={refreshAll} projects={projects} parties={parties} />}
      {showGRN      && <GRNModal onClose={() => setShowGRN(false)} onSave={refreshAll} projects={projects} parties={parties} pos={pos} />}
      {showDirect   && <DirectReceiptModal onClose={() => setShowDirect(false)} onSave={refreshAll} projects={projects} parties={parties} />}
      {showChallan  && <ChallanCheckModal onClose={() => setShowChallan(false)} />}
      {showRateHistory && <RateHistoryModal onClose={() => setShowRateHistory(false)} />}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
