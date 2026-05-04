// ── MATERIAL FLOW TIMELINE DRAWER ─────────────────────────────
// Click any row in the project Material Ledger and this slide-in
// drawer opens with the full audit trail of that delivery:
//   • who requested it, when, qty
//   • who approved / rejected, when
//   • who ordered, vendor, expected delivery
//   • who received, challan, when
//   • bills raised against this GRN
//   • usage entries (which task consumed it)
//
// Admin can click "Edit MR" to jump into the MRDetailDrawer for
// the underlying material request (qty / vendor / date / notes /
// status). Any change there cascades to the GRN + ledger.
//
// Props:
//   grnId       — the grn_entries.id to load (or null = drawer closed)
//   onClose
//   onChanged   — called after any edit so parent can reload ledger
//   isAdmin
//   onEditMR    — optional callback to open MRDetailDrawer with the linked MR

import { useState, useEffect } from "react";
import api from "../config/api";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF", bluM: "#BFDBFE",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  pur: "#7C3AED", purL: "#F5F3FF", purM: "#DDD6FE",
};

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
};
const fmtDateTime = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return d; }
};
const fmtN = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return (v / 10000000).toFixed(2) + "Cr";
  if (v >= 100000)  return (v / 100000).toFixed(2) + "L";
  if (v >= 1000)    return (v / 1000).toFixed(1) + "K";
  return Math.round(v).toLocaleString("en-IN");
};

export default function MaterialFlowDrawer({ grnId, onClose, onChanged, isAdmin = true, onEditMR }) {
  const open = !!grnId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!grnId) { setData(null); return; }
    setLoading(true); setErr("");
    api.get(`/procurement/grns/${grnId}/flow`)
      .then((r) => {
        if (r?.success && r.data) setData(r.data);
        else setErr(r?.message || "Failed to load flow");
      })
      .catch((e) => setErr(e?.message || "Network error"))
      .finally(() => setLoading(false));
  }, [grnId]);

  if (!open) return null;

  const grn = data?.grn;
  const items = data?.items || [];
  const mr = data?.mr;
  const po = data?.po;
  const audit = data?.audit || [];
  const bills = data?.bills || [];
  const usage = data?.usage || [];

  // Build chronological events — combines all sources into a single timeline.
  const events = [];
  if (mr?.created_at) {
    events.push({
      key: `mr-create-${mr.id}`,
      ts: mr.created_at,
      icon: "📝",
      color: T.amb,
      bg: T.ambL,
      title: "Material Requested",
      who: mr.requested_by || "Site Team",
      lines: [
        `${mr.item_name} · ${mr.quantity} ${mr.unit}`,
        mr.required_date ? `Required by ${fmtDate(mr.required_date)}` : null,
        mr.notes ? `📌 ${mr.notes}` : null,
      ].filter(Boolean),
    });
  }
  // Approve / reject from audit
  audit.forEach((a) => {
    const action = (a.action || "").toUpperCase();
    if (action === "APPROVE" || action === "APPROVED") {
      events.push({
        key: `audit-${a.created_at}-approve`,
        ts: a.created_at,
        icon: "✓",
        color: T.blu,
        bg: T.bluL,
        title: "Approved",
        who: a.user_name || "Admin",
        lines: [(() => { try { const d = JSON.parse(a.details || "{}"); return d.approved_qty ? `Approved qty: ${d.approved_qty}` : null; } catch { return null; } })()].filter(Boolean),
      });
    } else if (action === "REJECT" || action === "REJECTED") {
      events.push({
        key: `audit-${a.created_at}-reject`,
        ts: a.created_at,
        icon: "✕",
        color: T.red,
        bg: T.redL,
        title: "Rejected",
        who: a.user_name || "Admin",
        lines: [],
      });
    } else if (action === "MARK-ORDERED" || action === "ORDERED" || action === "ORDER") {
      events.push({
        key: `audit-${a.created_at}-order`,
        ts: a.created_at,
        icon: "🚚",
        color: T.pur,
        bg: T.purL,
        title: "Ordered",
        who: a.user_name || "Admin",
        lines: [],
      });
    }
  });
  // Fallback: if MR has linked_vendor but no order audit entry, infer from MR fields
  if (mr?.linked_vendor && !events.some((e) => e.title === "Ordered")) {
    events.push({
      key: `mr-order-${mr.id}`,
      ts: mr.expected_delivery || mr.updated_at || mr.created_at,
      icon: "🚚",
      color: T.pur,
      bg: T.purL,
      title: "Ordered",
      who: "Admin",
      lines: [
        `Vendor: ${mr.linked_vendor}`,
        mr.expected_delivery ? `Expected delivery ${fmtDate(mr.expected_delivery)}` : null,
      ].filter(Boolean),
    });
  }
  // GRN
  if (grn) {
    events.push({
      key: `grn-${grn.id}`,
      ts: grn.received_date || grn.created_at,
      icon: "📦",
      color: T.grn,
      bg: T.grnL,
      title: "GRN Received",
      who: grn.received_by || "Site",
      lines: [
        `Vendor: ${grn.vendor_name || "—"}`,
        grn.challan_no ? `Challan: ${grn.challan_no}` : null,
        items.map((it) => `${it.description}: ${it.received_qty} ${it.unit}`).join(" · "),
        grn.grn_type ? `Type: ${grn.grn_type}` : null,
      ].filter(Boolean),
    });
  }
  // Bills
  bills.forEach((b) => {
    events.push({
      key: `bill-${b.id}`,
      ts: b.date,
      icon: "🧾",
      color: T.red,
      bg: T.redL,
      title: "Bill Raised",
      who: b.party_name || "Vendor",
      lines: [
        `Amount: ₹${fmtN(b.amount)}`,
        b.due_date ? `Payment due ${fmtDate(b.due_date)}` : null,
        b.status ? `Status: ${b.status}` : null,
      ].filter(Boolean),
    });
  });
  // Usage
  usage.forEach((u) => {
    events.push({
      key: `use-${u.created_at}-${u.task_no}`,
      ts: u.used_date || u.created_at,
      icon: "🔧",
      color: T.t3,
      bg: T.b1,
      title: "Material Used",
      who: u.used_by || "Site",
      lines: [
        `${u.material_name}: ${u.used_qty} ${u.unit || ""}`,
        u.task_name ? `Task: ${u.task_name}` : null,
        u.remark ? `📌 ${u.remark}` : null,
      ].filter(Boolean),
    });
  });

  events.sort((a, b) => new Date(a.ts) - new Date(b.ts));

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1500, backdropFilter: "blur(2px)" }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "min(560px, 100vw)",
        background: T.surface, zIndex: 1501, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", animation: "matFlowSlide .25s ease",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ background: "#0D1B2A", padding: "16px 20px", color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 3, fontWeight: 600, letterSpacing: ".4px", textTransform: "uppercase" }}>
                Material Flow {grn?.grn_number ? `· ${grn.grn_number}` : ""}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-.3px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {items[0]?.description || mr?.item_name || "Material"}
                {items.length > 1 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginLeft: 6, fontWeight: 500 }}>+ {items.length - 1} more</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                {grn?.project_name || "—"} · {events.length} event{events.length === 1 ? "" : "s"}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: T.t4, fontSize: 13 }}>
              <div style={{ width: 28, height: 28, border: "3px solid #E2E8F0", borderTopColor: T.blu,
                borderRadius: "50%", animation: "matSpin 0.7s linear infinite", margin: "0 auto 10px" }}/>
              Loading flow...
            </div>
          )}
          {err && !loading && (
            <div style={{ padding: "10px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12 }}>
              {err}
            </div>
          )}
          {!loading && !err && events.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: T.t4, fontSize: 13 }}>
              No flow data found.
            </div>
          )}
          {!loading && events.length > 0 && (
            <div style={{ position: "relative", paddingLeft: 30 }}>
              {/* Vertical track line */}
              <div style={{ position: "absolute", left: 14, top: 0, bottom: 0, width: 2, background: T.b1 }}/>
              {events.map((ev, i) => (
                <div key={ev.key} style={{ position: "relative", marginBottom: 16 }}>
                  {/* Dot */}
                  <div style={{
                    position: "absolute", left: -23, top: 4, width: 28, height: 28, borderRadius: "50%",
                    background: ev.bg, border: `2px solid ${ev.color}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                    boxShadow: `0 0 0 4px ${T.surface}`,
                  }}>
                    {ev.icon}
                  </div>
                  {/* Card */}
                  <div style={{
                    background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${ev.color}`,
                    borderRadius: 8, padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: ev.color }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 10.5, color: T.t4, whiteSpace: "nowrap", marginLeft: 8 }}>
                        {fmtDateTime(ev.ts)}
                      </div>
                    </div>
                    {ev.who && (
                      <div style={{ fontSize: 11, color: T.t3, marginBottom: ev.lines.length > 0 ? 5 : 0, fontWeight: 500 }}>
                        👤 {ev.who}
                      </div>
                    )}
                    {ev.lines.map((line, j) => (
                      <div key={j} style={{ fontSize: 11.5, color: T.t2, lineHeight: 1.5 }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary tile */}
          {!loading && grn && (
            <div style={{ marginTop: 18, padding: "10px 12px", background: T.surfaceB, borderRadius: 8, border: `1px solid ${T.b1}` }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5 }}>
                <Cell label="GRN #" value={grn.grn_number}/>
                <Cell label="Vendor" value={grn.vendor_name}/>
                <Cell label="Challan" value={grn.challan_no}/>
                <Cell label="Received Date" value={fmtDate(grn.received_date)}/>
                {mr && <Cell label="Source MR" value={`MR-${mr.id} (${mr.requested_by || "?"})`}/>}
                {po && <Cell label="Source PO" value={po.po_number}/>}
                {bills.length > 0 && <Cell label="Billed" value={`₹${fmtN(bills.reduce((s, b) => s + Number(b.amount || 0), 0))}`} c={T.red}/>}
                {usage.length > 0 && <Cell label="Used" value={`${usage.reduce((s, u) => s + Number(u.used_qty || 0), 0)} units in ${usage.length} task(s)`} c={T.t3}/>}
              </div>
            </div>
          )}
        </div>

        {/* Footer — admin actions */}
        {!loading && data && isAdmin && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0, display: "flex", gap: 8 }}>
            <div style={{ flex: 1, fontSize: 11, color: T.t4, alignSelf: "center" }}>
              Admin can edit the source MR. Changes propagate to inventory.
            </div>
            {mr && onEditMR && (
              <button onClick={() => onEditMR(mr)}
                style={{ padding: "9px 18px", borderRadius: 7, background: T.blu, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ✏ Edit MR / Flow
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes matFlowSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes matSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

function Cell({ label, value, c }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: c || T.t1, marginTop: 2 }}>{value || "—"}</div>
    </div>
  );
}
