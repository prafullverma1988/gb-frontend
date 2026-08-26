// ── ACTIVITY LOG ─────────────────────────────────────────────────
// Mounts at the bottom of any detail drawer (MR / GRN / Transaction
// / Task / Lead / Issue / Party). Pulls the audit_logs trail for that
// specific (entity_type, entity_id) pair so the user can see kisne
// kya kab kiya — without leaving the drawer.
//
// Backend: GET /api/audit/:entity_type/:entity_id
//
// Props:
//   entity_type  — must match what backend uses in logAudit calls
//                  (e.g. "material_request", "grn", "transaction",
//                   "task", "lead", "party", "purchase_order").
//   entity_id    — the row id
//   compact      — bool; smaller header + tighter spacing
//   defaultOpen  — bool; expand on first render (default false — collapsed)

import { useEffect, useState } from "react";
import api from "../config/api";
import { t } from "../i18n";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF",
  grn: "#059669", grnL: "#ECFDF5",
  red: "#DC2626", redL: "#FEF2F2",
  amb: "#D97706", ambL: "#FFFBEB",
  pur: "#7C3AED", purL: "#F5F3FF",
};

// Action → icon + color mapping. Keep this lean; add as needed.
const ACTION_META = {
  CREATE:        { icon: "✨", color: T.grn,  bg: T.grnL,  get label() { return t("activity_log.created"); } },
  UPDATE:        { icon: "✏️", color: T.blu,  bg: T.bluL,  get label() { return t("activity_log.updated"); } },
  DELETE:        { icon: "🗑", color: T.red,  bg: T.redL,  get label() { return t("activity_log.deleted"); } },
  APPROVE:       { icon: "✓",  color: T.blu,  bg: T.bluL,  get label() { return t("common.approved"); } },
  REJECT:        { icon: "✕",  color: T.red,  bg: T.redL,  get label() { return t("common.rejected"); } },
  "MARK-ORDERED":  { icon: "🚚", color: T.pur,  bg: T.purL,  get label() { return t("common.ordered"); } },
  "MARK-RECEIVED": { icon: "📦", color: T.grn,  bg: T.grnL,  get label() { return t("common.received"); } },
  "ISSUE-RAISED":  { icon: "⚠️", color: T.red,  bg: T.redL,  get label() { return t("activity_log.issue_raised"); } },
  "ISSUE-RESOLVED":{ icon: "✓",  color: T.grn,  bg: T.grnL,  get label() { return t("activity_log.issue_resolved"); } },
  PAYMENT:       { icon: "💰", color: T.grn,  bg: T.grnL,  get label() { return t("activity_log.payment"); } },
  CLOSE:         { icon: "⊘",  color: T.amb,  bg: T.ambL,  get label() { return t("common.closed"); } },
  REOPEN:        { icon: "↺",  color: T.blu,  bg: T.bluL,  get label() { return t("activity_log.reopened"); } },
};

const fmtDateTime = (d) => {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return d; }
};

const summariseDetails = (action, details) => {
  if (!details || typeof details !== "object") return null;
  const bits = [];
  // Common fields we want to surface inline
  if (details.mr_number)       bits.push(details.mr_number);
  if (details.grn_number)      bits.push(details.grn_number);
  if (details.po_number)       bits.push(details.po_number);
  if (details.amount != null)  bits.push(`₹${Number(details.amount).toLocaleString("en-IN")}`);
  if (details.approved_qty != null)  bits.push(`Qty: ${details.approved_qty}`);
  if (details.received_qty != null)  bits.push(`Received: ${details.received_qty}`);
  if (details.order_type)      bits.push(`via ${details.order_type}`);
  if (details.vendor)          bits.push(`→ ${details.vendor}`);
  if (details.issue_type)      bits.push(details.issue_type);
  if (details.edit_note)       bits.push(`📝 ${details.edit_note}`);
  if (details.note && !details.edit_note) bits.push(`📝 ${details.note}`);
  if (details.rejected_reason) bits.push(`Reason: ${details.rejected_reason}`);
  if (details.closed_reason)   bits.push(`Reason: ${details.closed_reason}`);
  if (details.resolution_note) bits.push(`Resolution: ${details.resolution_note}`);
  if (details.cascaded?.grns)  bits.push(`Cascaded ${details.cascaded.grns} GRN(s)`);
  return bits.length ? bits.join(" · ") : null;
};

export default function ActivityLog({ entity_type, entity_id, compact = false, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [rows, setRows] = useState(null);
  const [err, setErr]   = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entity_type || !entity_id || rows !== null) return;
    setLoading(true); setErr("");
    api.get(`/audit/${entity_type}/${entity_id}`)
      .then(r => {
        if (r?.success) setRows(r.data || []);
        else setErr(r?.message || "Failed to load activity");
      })
      .catch(e => setErr(e?.message || "Network error"))
      .finally(() => setLoading(false));
  }, [open, entity_type, entity_id, rows]);

  if (!entity_type || !entity_id) return null;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${T.t3}`, borderRadius: 8 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: compact ? "8px 11px" : "10px 13px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: T.b1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📜</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.t2 }}>{t("activity_log.activity_log")}</span>
        {rows != null && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: T.t3, background: T.b1, padding: "1px 6px", borderRadius: 8 }}>
            {rows.length}
          </span>
        )}
        <div style={{ flex: 1 }}/>
        <span style={{ fontSize: 11, color: T.t4 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 13px 11px 13px" }}>
          {loading && <div style={{ padding: "10px 0", fontSize: 11, color: T.t4 }}>{t("activity_log.loading_activity")}</div>}
          {err && <div style={{ padding: "8px 10px", background: T.redL, border: `1px solid #FECACA`, borderRadius: 6, fontSize: 11, color: T.red }}>{err}</div>}
          {!loading && !err && rows && rows.length === 0 && (
            <div style={{ padding: "10px 0", fontSize: 11, color: T.t4, fontStyle: "italic" }}>{t("activity_log.no_activity_recorded_yet")}</div>
          )}
          {!loading && rows && rows.length > 0 && (
            <div style={{ position: "relative", paddingLeft: 22 }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 9, top: 4, bottom: 4, width: 2, background: T.b1 }}/>
              {rows.map((r, i) => {
                const meta = ACTION_META[r.action] || { icon: "•", color: T.t3, bg: T.b1, label: r.action };
                const summary = summariseDetails(r.action, r.details);
                return (
                  <div key={r.id || i} style={{ position: "relative", marginBottom: i === rows.length - 1 ? 0 : 9 }}>
                    <div style={{
                      position: "absolute", left: -19, top: 1, width: 18, height: 18, borderRadius: "50%",
                      background: meta.bg, border: `1.5px solid ${meta.color}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
                      boxShadow: `0 0 0 3px ${T.surface}`,
                    }}>
                      {meta.icon}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                      <span style={{ fontSize: 11, color: T.t2 }}>by <strong style={{ color: T.t1 }}>{r.user_name || "—"}</strong></span>
                      <span style={{ fontSize: 10.5, color: T.t4 }}>· {fmtDateTime(r.created_at)}</span>
                    </div>
                    {summary && (
                      <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2, lineHeight: 1.45 }}>
                        {summary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
