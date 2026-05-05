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

import React, { useState, useEffect } from "react";
import api from "../config/api";
import LibrarySelect from "./LibrarySelect";

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
  // GRN edit state
  const [grnEditing, setGrnEditing] = useState(false);
  const [grnForm, setGrnForm] = useState({});
  const [grnEditNote, setGrnEditNote] = useState("");
  const [grnSaving, setGrnSaving] = useState(false);
  const [grnDeleting, setGrnDeleting] = useState(false);
  // Issue creation state
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueType, setIssueType] = useState("Quality");
  const [issueNote, setIssueNote] = useState("");
  const [issueSaving, setIssueSaving] = useState(false);

  const reload = () => {
    if (!grnId) return;
    setLoading(true); setErr("");
    api.get(`/procurement/grns/${grnId}/flow`)
      .then((r) => {
        if (r?.success && r.data) setData(r.data);
        else setErr(r?.message || "Failed to load flow");
      })
      .catch((e) => setErr(e?.message || "Network error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!grnId) { setData(null); setGrnEditing(false); setGrnEditNote(""); return; }
    reload();
  }, [grnId]);

  // Reset edit form whenever GRN data loads
  useEffect(() => {
    if (data?.grn) {
      const g = data.grn;
      setGrnForm({
        vendor_name:   g.vendor_name || "",
        challan_no:    g.challan_no || "",
        received_date: g.received_date ? String(g.received_date).slice(0, 10) : "",
        received_by:   g.received_by || "",
        items: (data.items || []).map(it => ({
          id: it.id,
          description:  it.description || "",
          received_qty: it.received_qty != null ? String(it.received_qty) : "",
          unit:         it.unit || "",
        })),
      });
    }
  }, [data]);

  const handleGrnSave = async () => {
    if (grnSaving) return;
    if (!grnEditNote.trim()) { setErr("Edit reason compulsory hai — log me record hoga"); return; }
    setGrnSaving(true); setErr("");
    try {
      const payload = {
        vendor_name:   grnForm.vendor_name?.trim() || null,
        challan_no:    grnForm.challan_no?.trim() || null,
        received_date: grnForm.received_date || null,
        received_by:   grnForm.received_by?.trim() || null,
        edit_note:     grnEditNote.trim(),
        items: (grnForm.items || []).map(it => ({
          id: it.id,
          description:  it.description?.trim() || null,
          received_qty: it.received_qty !== "" ? parseFloat(it.received_qty) : null,
          ordered_qty:  it.received_qty !== "" ? parseFloat(it.received_qty) : null,
          unit:         it.unit || null,
        })),
      };
      const res = await api.put("/procurement/grns/" + grnId, payload);
      if (res?.success === false) { setErr(res.message || "Save failed"); setGrnSaving(false); return; }
      setGrnEditing(false); setGrnEditNote("");
      reload();
      onChanged && onChanged();
    } catch (e) { setErr(e?.message || "Network error"); }
    setGrnSaving(false);
  };

  const handleRaiseIssue = async () => {
    if (issueSaving) return;
    if (!issueNote.trim()) { setErr("Issue note compulsory hai"); return; }
    setIssueSaving(true); setErr("");
    try {
      const res = await api.post(`/procurement/grns/${grnId}/issues`, {
        issue_type: issueType,
        note: issueNote.trim(),
      });
      if (res?.success === false) { setErr(res.message || "Issue raise failed"); setIssueSaving(false); return; }
      setShowIssueForm(false); setIssueNote(""); setIssueType("Quality");
      reload();
      onChanged && onChanged();
    } catch (e) { setErr(e?.message || "Network error"); }
    setIssueSaving(false);
  };

  const handleResolveIssue = async (issueId) => {
    const note = window.prompt("Resolution note (kya kiya issue solve karne ke liye):");
    if (note == null) return;
    try {
      const res = await api.patch(`/procurement/grns/issues/${issueId}/resolve`, { resolution_note: note });
      if (res?.success === false) { setErr(res.message || "Resolve failed"); return; }
      reload();
    } catch (e) { setErr(e?.message || "Network error"); }
  };

  const handleGrnDelete = async () => {
    if (grnDeleting) return;
    const reason = window.prompt(`Delete GRN ${data?.grn?.grn_number}?\n\nYe inventory se bhi qty hata dega. Reason batao (compulsory):`);
    if (reason == null) return;
    if (!reason.trim()) { setErr("Delete reason compulsory hai"); return; }
    setGrnDeleting(true); setErr("");
    try {
      const res = await api.del("/procurement/grns/" + grnId, { reason: reason.trim() });
      if (res?.success === false) { setErr(res.message || "Delete failed"); setGrnDeleting(false); return; }
      onChanged && onChanged();
      onClose && onClose();
    } catch (e) { setErr(e?.message || "Network error"); setGrnDeleting(false); }
  };

  if (!open) return null;

  const grn = data?.grn;
  const items = data?.items || [];
  const mr = data?.mr;
  const po = data?.po;
  const audit = data?.audit || [];
  const bills = data?.bills || [];
  const usage = data?.usage || [];
  const issues = data?.issues || [];
  const openIssueCount = issues.filter(i => i.status !== "Resolved").length;

  // photo_urls is stored as a JSON array string. Parse defensively.
  const parsePhotos = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
  };
  const mrPhotos  = parsePhotos(mr?.photo_urls);
  const grnPhotos = parsePhotos(grn?.photo_urls);

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
  // (GRN intentionally NOT pushed here — it has its own dedicated section
  // card below so we don't show it twice. The timeline still shows it via
  // the audit_logs CREATE entry if present.)
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
          {/* Timeline removed — the per-stage section cards below already
              tell the full chronological story without duplicating the GRN
              card.  Keeping `events` array for any future use. */}

          {/* Stage summary cards — MR / Approval / Order / GRN */}
          {!loading && data && (() => {
            const approvalEntry = audit.find(a => /APPROV/i.test(a.action || ""));
            const rejectEntry   = audit.find(a => /REJECT/i.test(a.action || ""));
            const orderEntry    = audit.find(a => /ORDER/i.test(a.action || ""));
            const receivedEntry = audit.find(a => /RECEIV/i.test(a.action || ""));
            let approvedQty = null;
            if (approvalEntry?.details) { try { approvedQty = JSON.parse(approvalEntry.details).approved_qty; } catch {} }
            // Order type: PO if MR has linked_po_id, else from audit details, else "Manual"
            let orderType = "Manual";
            if (mr?.linked_po_id || po) orderType = "PO";
            else if (orderEntry?.details) {
              try { orderType = JSON.parse(orderEntry.details).order_type || "Manual"; } catch {}
            }
            // Receiver name — prefer audit user, then GRN.received_by
            const receivedByName = receivedEntry?.user_name || grn?.received_by || "Site";
            return (
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                {/* MR Request Summary */}
                <Section
                  color={T.amb} bg={T.ambL} icon="📝" title="Material Request"
                  empty={!mr}
                  emptyText="No MR linked — direct GRN entry"
                  rows={mr ? [
                    ["MR #",       `MR-${mr.id}`],
                    ["Material",   `${mr.item_name} · ${mr.quantity} ${mr.unit}`],
                    ["Requested By", mr.requested_by || "—"],
                    ["Requested On", fmtDateTime(mr.created_at)],
                    ["Required By", fmtDate(mr.required_date)],
                    ...(mr.approx_amount > 0 ? [["Approx. Amount", `₹${fmtN(mr.approx_amount)}`]] : []),
                    ...(mr.notes ? [["Notes", mr.notes]] : []),
                  ] : []}
                  photos={mrPhotos}
                />

                {/* Approval Summary */}
                <Section
                  color={rejectEntry ? T.red : T.blu}
                  bg={rejectEntry ? T.redL : T.bluL}
                  icon={rejectEntry ? "✕" : "✓"}
                  title={rejectEntry ? "Rejection" : "Approval"}
                  empty={!mr || (mr.mr_status !== "Approved" && mr.mr_status !== "Rejected" && !approvalEntry && !rejectEntry)}
                  emptyText={mr ? `Currently ${mr.mr_status || "Pending"}` : "—"}
                  rows={(approvalEntry || rejectEntry) ? [
                    ["Status",      rejectEntry ? "Rejected" : "Approved"],
                    ["By",          (rejectEntry || approvalEntry).user_name || "Admin"],
                    ["On",          fmtDateTime((rejectEntry || approvalEntry).created_at)],
                    ...(approvedQty != null ? [["Approved Qty", `${approvedQty} ${mr?.unit || ""}`]] : []),
                    ...(mr?.rejected_reason ? [["Reason", mr.rejected_reason]] : []),
                  ] : (mr?.mr_status === "Approved" ? [
                    // Fallback when audit log missing: show MR's current status
                    ["Status",      "Approved"],
                    ["Approved Qty", `${mr.quantity} ${mr.unit}`],
                  ] : [])}
                />

                {/* Order Summary — shows order type (Manual / PO / RFQ),
                    vendor, expected delivery, and who/when ordered. For
                    truly direct GRNs (no MR + no PO + no order audit) we
                    still surface vendor info from the GRN itself. */}
                <Section
                  color={T.pur} bg={T.purL} icon="🚚" title="Order Placed"
                  empty={!mr?.linked_vendor && !po && !orderEntry && !grn?.vendor_name}
                  emptyText="Not ordered yet"
                  rows={[
                    ["Type",            (!mr && !po && !orderEntry && grn?.vendor_name) ? "Direct GRN (no MR/PO)" : orderType],
                    ...(po ? [["PO #", po.po_number]] : []),
                    ["Vendor",          mr?.linked_vendor || po?.vendor_name || grn?.vendor_name || "—"],
                    ["Expected Delivery", fmtDate(mr?.expected_delivery || po?.expected_delivery || grn?.received_date)],
                    ...(orderEntry ? [
                      ["Ordered By", orderEntry.user_name || "Admin"],
                      ["Ordered On", fmtDateTime(orderEntry.created_at)],
                    ] : []),
                  ].filter(([_, v]) => v && v !== "—" || _ === "Vendor" || _ === "Expected Delivery" || _ === "Type")}
                />

                {/* GRN / Receipt Summary — read-only OR inline edit form */}
                {grn && !grnEditing && (
                  <Section
                    color={T.grn} bg={T.grnL} icon="📦" title="GRN Received"
                    rows={[
                      ["GRN #",          grn.grn_number],
                      ["Vendor",         grn.vendor_name],
                      ["Challan",        grn.challan_no],
                      ["Received On",    fmtDate(grn.received_date)],
                      ["Received By",    receivedByName],
                      ["Type",           grn.grn_type || "Full"],
                      ...items.map(it => [it.description || "Item", `${it.received_qty} ${it.unit}`]),
                    ]}
                    photos={grnPhotos}
                  />
                )}
                {grn && grnEditing && (
                  <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${T.grn}`, borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                      <span style={{ width: 22, height: 22, borderRadius: "50%", background: T.grnL, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📦</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.grn }}>Edit GRN — {grn.grn_number}</span>
                    </div>
                    <div style={{ padding: "8px 10px", background: "#FFFBEB", border: `1px solid #FDE68A`, borderRadius: 7, marginBottom: 10 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                        Edit Reason * <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>(compulsory)</span>
                      </div>
                      <textarea value={grnEditNote} onChange={e => setGrnEditNote(e.target.value)} rows={2}
                        placeholder="e.g. Vendor naam galat tha, theek kar raha hu"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: `1.5px solid #FDE68A`, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", background: "#fff" }}/>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 3 }}>Material Vendor</div>
                        <LibrarySelect type="supplier" value={grnForm.vendor_name}
                          onChange={v => setGrnForm(p => ({ ...p, vendor_name: v }))}/>
                      </div>
                      <FInput label="Challan No." value={grnForm.challan_no} onChange={v => setGrnForm(p => ({ ...p, challan_no: v }))}/>
                      <FInput label="Received On" type="date" value={grnForm.received_date} onChange={v => setGrnForm(p => ({ ...p, received_date: v }))}/>
                      <FInput label="Received By" value={grnForm.received_by} onChange={v => setGrnForm(p => ({ ...p, received_by: v }))}/>
                    </div>
                    {(grnForm.items || []).map((it, idx) => (
                      <div key={it.id || idx} style={{ display: "grid", gridTemplateColumns: "1.6fr 80px 70px", gap: 6, marginBottom: 6 }}>
                        <div>
                          {idx === 0 && <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 3 }}>Material</div>}
                          <LibrarySelect type="material" value={it.description}
                            onChange={v => setGrnForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, description: v } : x) }))}/>
                        </div>
                        <FInput label={idx === 0 ? "Qty" : ""} type="number" value={it.received_qty}
                          onChange={v => setGrnForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, received_qty: v } : x) }))}/>
                        <FInput label={idx === 0 ? "Unit" : ""} value={it.unit}
                          onChange={v => setGrnForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, unit: v } : x) }))}/>
                      </div>
                    ))}
                  </div>
                )}

                {/* Issues Section — Quality / Short / Damaged / Wrong-Item / Other */}
                <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${openIssueCount > 0 ? T.red : T.t3}`, borderRadius: 8, padding: "10px 13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: openIssueCount > 0 ? T.redL : T.b1, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚠️</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: openIssueCount > 0 ? T.red : T.t3 }}>
                      Issues {issues.length > 0 ? `(${openIssueCount} open / ${issues.length} total)` : ""}
                    </span>
                    <div style={{ flex: 1 }}/>
                    {!showIssueForm && grn && (
                      <button onClick={() => setShowIssueForm(true)}
                        style={{ padding: "4px 10px", borderRadius: 5, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
                        + Create Issue
                      </button>
                    )}
                  </div>

                  {showIssueForm && (
                    <div style={{ padding: "10px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
                        {["Quality", "Short", "Damaged", "WrongItem", "Other"].map(t => (
                          <button key={t} onClick={() => setIssueType(t)}
                            style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, cursor: "pointer", background: issueType === t ? T.red : "white", color: issueType === t ? "white" : T.red, border: `1px solid ${T.red}` }}>
                            {t}
                          </button>
                        ))}
                      </div>
                      <textarea value={issueNote} onChange={e => setIssueNote(e.target.value)} autoFocus rows={2}
                        placeholder="Issue describe karo — kya problem hai? (compulsory)"
                        style={{ width: "100%", padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${T.redM}`, fontSize: 11.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", marginBottom: 7, background: "white" }}/>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setShowIssueForm(false); setIssueNote(""); setErr(""); }} disabled={issueSaving}
                          style={{ flex: 1, padding: "6px", borderRadius: 5, background: "white", border: `1px solid ${T.b1}`, color: T.t3, fontSize: 11, fontWeight: 600, cursor: issueSaving ? "not-allowed" : "pointer" }}>
                          Cancel
                        </button>
                        <button onClick={handleRaiseIssue} disabled={issueSaving || !issueNote.trim()}
                          style={{ flex: 2, padding: "6px", borderRadius: 5, background: issueSaving || !issueNote.trim() ? "#9CA3AF" : T.red, border: "none", color: "white", fontSize: 11, fontWeight: 700, cursor: issueSaving || !issueNote.trim() ? "not-allowed" : "pointer" }}>
                          {issueSaving ? "Saving..." : "⚠ Raise Issue"}
                        </button>
                      </div>
                    </div>
                  )}

                  {issues.length === 0 && !showIssueForm && (
                    <div style={{ fontSize: 11, color: T.t4, fontStyle: "italic", paddingLeft: 29 }}>No issues raised — quality OK</div>
                  )}

                  {issues.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 29 }}>
                      {issues.map(iss => {
                        const resolved = iss.status === "Resolved";
                        return (
                          <div key={iss.id} style={{ padding: "7px 9px", background: resolved ? "#F1F5F9" : "#FEF2F2", borderRadius: 6, border: `1px solid ${resolved ? T.b1 : T.redM}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: resolved ? T.t3 : T.red, color: "white" }}>{iss.issue_type}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: resolved ? T.t3 : T.red, textTransform: "uppercase" }}>{resolved ? "Resolved" : "Open"}</span>
                              <div style={{ flex: 1 }}/>
                              <span style={{ fontSize: 10, color: T.t4 }}>{fmtDateTime(iss.created_at)}</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: T.t1, marginBottom: 4 }}>{iss.note}</div>
                            <div style={{ fontSize: 10.5, color: T.t3 }}>👤 Raised by {iss.raised_by_name || "—"}</div>
                            {resolved && (
                              <div style={{ marginTop: 4, padding: "5px 7px", background: "white", borderRadius: 4, border: `1px solid ${T.b1}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: T.grn, marginBottom: 2 }}>✓ Resolved by {iss.resolved_by_name} · {fmtDateTime(iss.resolved_at)}</div>
                                {iss.resolution_note && <div style={{ fontSize: 11, color: T.t2 }}>{iss.resolution_note}</div>}
                              </div>
                            )}
                            {!resolved && isAdmin && (
                              <button onClick={() => handleResolveIssue(iss.id)}
                                style={{ marginTop: 5, padding: "3px 9px", borderRadius: 4, background: T.grn, border: "none", color: "white", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                ✓ Mark Resolved
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Billing Summary */}
                {bills.length > 0 && (
                  <Section
                    color={T.red} bg={T.redL} icon="🧾" title={`Bills (${bills.length})`}
                    rows={[
                      ["Total Billed", `₹${fmtN(bills.reduce((s, b) => s + Number(b.amount || 0), 0))}`],
                      ...bills.flatMap(b => [
                        [`Bill ${fmtDate(b.date)}`, `₹${fmtN(b.amount)} · ${b.status || "—"}${b.due_date ? ` · due ${fmtDate(b.due_date)}` : ""}`],
                      ]),
                    ]}
                  />
                )}

                {/* Usage Summary */}
                {usage.length > 0 && (
                  <Section
                    color={T.t3} bg={T.b1} icon="🔧" title={`Material Used (${usage.length})`}
                    rows={[
                      ["Total Used", `${usage.reduce((s, u) => s + Number(u.used_qty || 0), 0)} ${usage[0]?.unit || ""}`],
                      ...usage.slice(0, 5).map(u => [u.task_name || "Task", `${u.used_qty} ${u.unit || ""}${u.used_by ? ` · by ${u.used_by}` : ""}`]),
                    ]}
                  />
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer — admin actions */}
        {!loading && data && isAdmin && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {grnEditing ? (
              <>
                <button onClick={() => { setGrnEditing(false); setGrnEditNote(""); setErr(""); }} disabled={grnSaving}
                  style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: grnSaving ? "not-allowed" : "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleGrnSave} disabled={grnSaving}
                  style={{ flex: 2, padding: "9px", borderRadius: 7, background: grnSaving ? "#9CA3AF" : T.grn, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: grnSaving ? "not-allowed" : "pointer" }}>
                  {grnSaving ? "Saving..." : "✓ Save GRN"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setGrnEditing(true)}
                  style={{ padding: "9px 12px", borderRadius: 7, background: T.grnL, border: `1px solid ${T.grnM}`, color: T.grn, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  ✏ Edit GRN
                </button>
                <button onClick={handleGrnDelete} disabled={grnDeleting}
                  style={{ padding: "9px 12px", borderRadius: 7, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12, fontWeight: 700, cursor: grnDeleting ? "not-allowed" : "pointer" }}>
                  {grnDeleting ? "Deleting..." : "🗑 Delete GRN"}
                </button>
                <div style={{ flex: 1 }}/>
                {mr && onEditMR && (
                  <button onClick={() => onEditMR(mr)}
                    style={{ padding: "9px 14px", borderRadius: 7, background: T.blu, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    ✏ Edit MR
                  </button>
                )}
              </>
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

function FInput({ label, value, onChange, type = "text" }) {
  return (
    <div>
      {label && <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 3 }}>{label}</div>}
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: `1.5px solid ${T.b1}`, fontSize: 11.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}/>
    </div>
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

function Section({ color, bg, icon, title, rows = [], empty = false, emptyText = "—", photos = [] }) {
  const [zoom, setZoom] = useState(null);
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "10px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: empty ? 4 : 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: bg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: color }}>{title}</span>
        {photos.length > 0 && (
          <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, color: color, background: bg, padding: "1px 6px", borderRadius: 8 }}>
            📷 {photos.length}
          </span>
        )}
      </div>
      {empty || rows.length === 0 ? (
        <div style={{ fontSize: 11, color: T.t4, fontStyle: "italic", paddingLeft: 29 }}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 12px", paddingLeft: 29 }}>
          {rows.map(([k, v], i) => (
            <React.Fragment key={i}>
              <span style={{ fontSize: 10.5, color: T.t4, fontWeight: 500, whiteSpace: "nowrap" }}>{k}</span>
              <span style={{ fontSize: 11.5, color: T.t1, fontWeight: 600, wordBreak: "break-word" }}>{v || "—"}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <div style={{ paddingLeft: 29, marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {photos.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => setZoom(url)}
              onError={e => { e.target.style.display = "none"; }}
              style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}`, cursor: "zoom-in" }}/>
          ))}
        </div>
      )}
      {zoom && (
        <div onClick={() => setZoom(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={zoom} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}/>
        </div>
      )}
    </div>
  );
}
