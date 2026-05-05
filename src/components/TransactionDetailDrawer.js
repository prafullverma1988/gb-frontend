// ── TRANSACTION DETAIL DRAWER ────────────────────────────────────────
// Slide-in drawer showing full details of a single transaction (bill,
// payment, transfer, etc.) with inline Edit + Delete.
//
// Used from:
//   • Finance → Fin Activity tab (row click)
//   • Finance → Party Ledger tab (row click on a party's transaction)
//
// Props:
//   txn       — transaction object (or null = drawer closed)
//   onClose   — close drawer
//   onChanged — called after a successful edit / delete so the parent
//               can refresh its lists
//
// Inline edit covers the most common fields:
//   amount, date, due_date, status, note, party_name, project_name
// Anything more (line items, account changes) — user should delete + recreate.

import { useState, useEffect } from "react";
import api from "../config/api";
import ActivityLog from "./ActivityLog";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF", bluM: "#BFDBFE",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  pur: "#7C3AED", purL: "#F5F3FF",
};

const TYPE_META = {
  receipt:           { label: "Payment In",     c: T.grn, bg: T.grnL, in: true  },
  payment:           { label: "Payment Out",    c: T.red, bg: T.redL, in: false },
  material_purchase: { label: "Material Bill",  c: T.red, bg: T.redL, in: false },
  site_expense:      { label: "Site Expense",   c: T.red, bg: T.redL, in: false },
  party_payment:     { label: "Party Payment",  c: T.red, bg: T.redL, in: false },
  subcon_expense:    { label: "Sub-Con Bill",   c: T.red, bg: T.redL, in: false },
  bank_transfer:     { label: "Bank Transfer",  c: T.t3,  bg: T.b1,   in: null  },
  sales_invoice:     { label: "Sales Invoice",  c: T.grn, bg: T.grnL, in: true  },
  material_return:   { label: "Material Return", c: T.grn, bg: T.grnL, in: true },
  unbilled_material: { label: "Unbilled",       c: T.pur, bg: T.purL, in: false },
  wallet_payment:    { label: "Wallet Out",     c: T.red, bg: T.redL, in: false },
  wallet_topup:      { label: "Wallet Top-up",  c: T.t3,  bg: T.b1,   in: null  },
};

const fmtN = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return (v / 10000000).toFixed(2) + "Cr";
  if (v >= 100000)  return (v / 100000).toFixed(2) + "L";
  if (v >= 1000)    return (v / 1000).toFixed(1) + "K";
  return Math.round(v).toLocaleString("en-IN");
};

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
};

const isoDate = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch { return ""; }
};

export default function TransactionDetailDrawer({ txn, onClose, onChanged }) {
  const open = !!txn;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  // Reset state whenever a different txn is opened
  useEffect(() => {
    if (txn) {
      setEditing(false); setSaving(false); setDeleting(false); setErr("");
      setForm({
        amount:       txn.amount ?? "",
        date:         isoDate(txn.date_iso || txn.dateRaw || txn.date),
        due_date:     isoDate(txn.due_date || txn.dueDateRaw),
        status:       txn.status || "paid",
        note:         txn.note || "",
        party_name:   txn.party_name || txn.party || "",
        project_name: txn.project_name || txn.project || "",
        reference_no: txn.reference_no || "",
      });
    }
  }, [txn]);

  if (!open) return null;

  const backendType = txn.txnType || txn.type_back || txn.type || "";
  const meta = TYPE_META[backendType] || { label: txn.type || "Transaction", c: T.t3, bg: T.b1, in: null };
  const isBill = ["material_purchase", "subcon_expense", "site_expense", "sales_invoice"].includes(backendType);
  const items = Array.isArray(txn.items) ? txn.items : (Array.isArray(txn.line_items) ? txn.line_items : []);
  const amtSign = meta.in === true ? "+" : meta.in === false ? "−" : "";
  const amtColor = meta.in === true ? T.grn : meta.in === false ? T.red : T.t2;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true); setErr("");
    try {
      const payload = {
        amount: parseFloat(form.amount) || 0,
        date: form.date || undefined,
        due_date: form.due_date || null,
        status: form.status,
        note: form.note,
        party_name: form.party_name,
        project_name: form.project_name,
        reference_no: form.reference_no,
      };
      const res = await api.put("/finance/transactions/" + txn.id, payload);
      if (res?.success === false) {
        setErr(res.message || "Save failed"); setSaving(false); return;
      }
      setEditing(false);
      onChanged && onChanged();
    } catch (e) {
      setErr(e?.message || "Network error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm(`Delete this ${meta.label} of ₹${fmtN(txn.amount)}? Yeh undo nahi hoga.`)) return;
    setDeleting(true); setErr("");
    try {
      const res = await api.del("/finance/transactions/" + txn.id);
      if (res?.success === false) {
        setErr(res.message || "Delete failed"); setDeleting(false); return;
      }
      onChanged && onChanged();
      onClose && onClose();
    } catch (e) {
      setErr(e?.message || "Network error");
      setDeleting(false);
    }
  };

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1500, backdropFilter: "blur(2px)" }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "min(540px, 100vw)",
        background: T.surface, zIndex: 1501, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", animation: "txnSlideIn .25s ease",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ background: "#0D1B2A", padding: "16px 20px", color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 3, fontWeight: 600, letterSpacing: ".4px", textTransform: "uppercase" }}>
                {meta.label} · TXN-{txn.id}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: amtColor, letterSpacing: "-.5px" }}>
                {amtSign}₹{Math.round(txn.amount).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
                {fmtDate(txn.date)} · {txn.status || "—"}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {err && (
            <div style={{ padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 12 }}>
              {err}
            </div>
          )}

          {/* Top tile: amount status, dates */}
          {!editing && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <Tile label="Date"     value={fmtDate(txn.date)}/>
              <Tile label="Status"   value={txn.status || "—"} c={txn.status === "paid" ? T.grn : T.amb}/>
              <Tile label="Party"    value={txn.party_name || txn.party || "—"}/>
              <Tile label="Project"  value={txn.project_name || txn.project || "—"}/>
              {txn.due_date && <Tile label="Payment Due" value={fmtDate(txn.due_date)} c={T.amb}/>}
              {txn.reference_no && <Tile label="Reference" value={txn.reference_no}/>}
              {txn.account_name && <Tile label="Account" value={txn.account_name}/>}
              {txn.to_account_name && <Tile label="To Account" value={txn.to_account_name}/>}
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              <Field label="Amount *" type="number" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))}/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Bill Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))}/>
                <Field label="Payment Due Date" type="date" value={form.due_date} onChange={v => setForm(p => ({ ...p, due_date: v }))}/>
              </div>
              <Field label="Party" value={form.party_name} onChange={v => setForm(p => ({ ...p, party_name: v }))}/>
              <Field label="Project" value={form.project_name} onChange={v => setForm(p => ({ ...p, project_name: v }))}/>
              <Field label="Reference No." value={form.reference_no} onChange={v => setForm(p => ({ ...p, reference_no: v }))}/>
              <div>
                <label style={lblStyle}>Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} style={inpStyle}>
                  <option value="paid">paid</option>
                  <option value="unpaid">unpaid</option>
                  <option value="approved">approved</option>
                  <option value="pending">pending</option>
                </select>
              </div>
              <Field label="Note" value={form.note} onChange={v => setForm(p => ({ ...p, note: v }))}/>
            </div>
          )}

          {/* Note (read-only mode) */}
          {!editing && (txn.note || txn.description) && (
            <div style={{ padding: "10px 12px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>Note / Description</div>
              <div style={{ fontSize: 12.5, color: T.t1, lineHeight: 1.5 }}>{txn.note || txn.description}</div>
            </div>
          )}

          {/* Line items */}
          {!editing && isBill && items.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Line Items</div>
              <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 60px 80px 90px", padding: "7px 10px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, gap: 5 }}>
                  {["Material", "Qty", "Unit", "Rate", "Amount"].map((h, i) => (
                    <span key={i} style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", textAlign: i >= 1 ? "right" : "left" }}>{h}</span>
                  ))}
                </div>
                {items.map((it, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 60px 80px 90px", padding: "7px 10px", borderBottom: i < items.length - 1 ? `1px solid ${T.b1}` : "none", gap: 5, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: T.t1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.item_name || it.item || it.name || it.description || "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t2, textAlign: "right" }}>{it.qty || it.quantity || "—"}</span>
                    <span style={{ fontSize: 11, color: T.t3, textAlign: "right" }}>{it.unit || "—"}</span>
                    <span style={{ fontSize: 11.5, color: T.t2, textAlign: "right" }}>₹{fmtN(it.rate)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t1, textAlign: "right" }}>₹{fmtN(it.amount)}</span>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 60px 80px 90px", padding: "8px 10px", background: T.bluL, borderTop: `2px solid ${T.bluM}`, gap: 5 }}>
                  <span style={{ gridColumn: "1 / 5", fontSize: 12, fontWeight: 700, color: T.t1 }}>TOTAL</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.blu, textAlign: "right" }}>₹{fmtN(txn.amount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Activity Log — full kisne kya kab kiya trail from audit_logs */}
          {txn.id && (
            <div style={{ marginTop: 12 }}>
              <ActivityLog entity_type="transaction" entity_id={txn.id}/>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0, display: "flex", gap: 8 }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} disabled={saving}
                style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 2, padding: "9px", borderRadius: 7, background: saving ? "#9CA3AF" : T.blu, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : "✓ Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: "9px 14px", borderRadius: 7, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                {deleting ? "Deleting..." : "🗑 Delete"}
              </button>
              <div style={{ flex: 1 }}/>
              <button onClick={() => setEditing(true)}
                style={{ padding: "9px 18px", borderRadius: 7, background: T.blu, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                ✏ Edit
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes txnSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
const lblStyle = { fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 4 };
const inpStyle = { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

function Tile({ label, value, c }) {
  return (
    <div style={{ padding: "8px 10px", background: T.surfaceB, borderRadius: 7, border: `1px solid ${T.b1}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: c || T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "—"}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={lblStyle}>{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} style={inpStyle}/>
    </div>
  );
}
