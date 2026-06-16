// ── PAYMENT REQUEST DRAWER ──────────────────────────────────────────
// Site team raises a payment request for subcon / site labour / expense.
// Posts to /finance/payment-requests for admin approval.
//
// Usage:
//   <PaymentRequestDrawer
//     open={show}
//     onClose={()=>setShow(false)}
//     project={{ id, name }}              // auto-filled
//     prefillType="subcon"                 // optional: subcon | labour | expense | other
//     prefillParty={{ id, name }}          // optional: pre-select beneficiary
//     onSaved={()=>refresh()}
//   />

import { useState, useEffect, useCallback, useRef } from "react";
import api, { getUser } from "../config/api";
import apiCache from "../utils/apiCache";
import SearchSelect from "./SearchSelect";
import { Credit, fmtTimeAgo } from "./Credit";

const T = {
  bg: "#F4F6F9",
  surface: "#FFFFFF",
  surfaceB: "#F8F9FB",
  t1: "#111827",
  t2: "#374151",
  t3: "#6B7280",
  t4: "#9CA3AF",
  b1: "#E5E7EB",
  b2: "#D1D5DB",
  blu: "#2563EB",
  bluL: "#EFF6FF",
  bluM: "#BFDBFE",
  grn: "#059669",
  grnL: "#ECFDF5",
  grnM: "#A7F3D0",
  amb: "#D97706",
  ambL: "#FFFBEB",
  ambM: "#FDE68A",
  red: "#DC2626",
  redL: "#FEF2F2",
  redM: "#FECACA",
  pur: "#7C3AED",
  purL: "#F5F3FF",
  purM: "#DDD6FE",
};

const TYPES = [
  { id: "subcon",  label: "Subcontractor", icon: "M2 18h20M4 18v-6a8 8 0 0116 0v6", c: T.amb,  bg: T.ambL,  brd: T.ambM,  desc: "Pay a subcon for completed work" },
  { id: "labour",  label: "Site Labour",   icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z", c: T.blu, bg: T.bluL, brd: T.bluM, desc: "Daily wage / weekly worker payment" },
  { id: "expense", label: "Site Expense",  icon: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", c: T.grn, bg: T.grnL, brd: T.grnM, desc: "Material, transport, misc cash expense" },
  { id: "other",   label: "Other",         icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", c: T.pur, bg: T.purL, brd: T.purM, desc: "Other payment need" },
];

const PRIORITIES = [
  { id: "Low",    c: T.t3,  bg: T.surfaceB, brd: T.b1 },
  { id: "Medium", c: T.amb, bg: T.ambL,     brd: T.ambM },
  { id: "High",   c: T.red, bg: T.redL,     brd: T.redM },
  { id: "Urgent", c: T.pur, bg: T.purL,     brd: T.purM },
];

// Status pill meta (matches what admin approval sets)
const STATUS_META = {
  Pending:  { label: "PENDING",  c: T.amb, bg: T.ambL, brd: T.ambM },
  Approved: { label: "APPROVED", c: T.grn, bg: T.grnL, brd: T.grnM },
  Rejected: { label: "REJECTED", c: T.red, bg: T.redL, brd: T.redM },
  Paid:     { label: "PAID",     c: T.blu, bg: T.bluL, brd: T.bluM },
};

// Quick lookup of type meta by id
const TYPE_BY_ID = TYPES.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});

const fmtAmount = (n) => {
  const x = Number(n) || 0;
  return "₹" + x.toLocaleString("en-IN");
};

export default function PaymentRequestDrawer({
  open,
  onClose,
  project,
  prefillType,
  prefillParty,
  onSaved,
}) {
  // mode: "list" (browse existing requests) or "form" (create new)
  const [mode, setMode] = useState("list");
  const [type, setType] = useState(prefillType || "subcon");
  const [partyName, setPartyName] = useState(prefillParty?.name || "");
  const [partyId, setPartyId] = useState(prefillParty?.id || null);
  const [parties, setParties] = useState([]);
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [neededBy, setNeededBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // List state
  const [requests, setRequests] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await api.get("/finance/payment-requests");
      if (r.success && Array.isArray(r.data)) {
        // Filter to this project (server may not support query param)
        const all = r.data;
        const filtered = project?.id
          ? all.filter(x =>
              String(x.project_id || "") === String(project.id) ||
              (x.project_name || "") === (project?.name || "__none__")
            )
          : all;
        setRequests(filtered);
      }
    } catch (e) {
      // graceful fallback
    }
    setLoadingList(false);
  }, [project?.id, project?.name]);

  // Reset when reopened — go to list, OR straight to form if prefill given
  useEffect(() => {
    if (open) {
      const hasPrefill = !!(prefillType || prefillParty?.id || prefillParty?.name);
      setMode(hasPrefill ? "form" : "list");
      setType(prefillType || "subcon");
      setPartyName(prefillParty?.name || "");
      setPartyId(prefillParty?.id || null);
      setAmount("");
      setPurpose("");
      setNote("");
      setPriority("Medium");
      setErr("");
      setExpandedId(null);
      setStatusFilter("All");
    }
  }, [open, prefillType, prefillParty]);

  // Load list when in list mode
  useEffect(() => {
    if (open && mode === "list") loadRequests();
  }, [open, mode, loadRequests]);

  // Load parties (filtered by type)
  useEffect(() => {
    if (!open) return;
    api.get("/parties").then(r => {
      if (r.success && Array.isArray(r.data)) setParties(r.data);
    }).catch(()=>{});
  }, [open]);

  const partyOptions = (() => {
    const filterMap = {
      subcon: (p) => /subcon|contractor/i.test(p.type || ""),
      labour: () => false, // labour: free-text or different source
      expense: () => true, // any party
      other: () => true,
    };
    const filtered = parties.filter(filterMap[type] || (() => true));
    return filtered.map(p => ({ value: String(p.id), label: p.name + (p.type ? ` (${p.type})` : "") }));
  })();

  const submittingRef = useRef(false);
  const handleSave = async () => {
    // Hard guard against double-submit (network delay → double-click → duplicate request)
    if (submittingRef.current) return;
    // Resolve a usable name even if user only has partyId (looking up parties list)
    const resolvedName = (partyName || "").trim()
      || parties.find(p => String(p.id) === String(partyId))?.name
      || prefillParty?.name
      || "";
    if (!resolvedName) { setErr("Please specify the beneficiary by name"); return; }
    if (!purpose.trim()) { setErr("Purpose is required"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setErr("Enter a valid amount"); return; }

    submittingRef.current = true;
    setSaving(true);
    setErr("");
    try {
      const typeMeta = TYPES.find(t => t.id === type);
      const res = await api.post("/finance/payment-requests", {
        party_id: partyId,
        party_name: resolvedName,
        project_id: project?.id || null,
        project_name: project?.name || "",
        amount: amt,
        purpose: `[${typeMeta?.label || type}] ${purpose}`,
        description: purpose + (note ? " — " + note : ""),
        priority,
        needed_by: neededBy || null,
        note: note || null,
        request_type: type,
      });
      if (res?.success === false) {
        setErr(res.message || "Save failed");
        setSaving(false);
        return;
      }
      if (window.toast) window.toast.success("Payment request sent for approval");
      onSaved && onSaved();
      // New PR → pending approval queue. Pre-warm the badge.
      apiCache.refreshApprovals();
      // Switch back to list mode + refresh, instead of closing — user can see their submission
      setMode("list");
      setAmount(""); setPurpose(""); setNote(""); setNeededBy(""); setErr("");
      loadRequests();
    } catch (e) {
      setErr(e?.message || "Network error");
    }
    setSaving(false);
  };

  if (!open) return null;

  return (
    <>
      <style>{`@keyframes gbPRSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 540, maxWidth: "95vw",
        background: T.surface, boxShadow: "-8px 0 30px rgba(0,0,0,0.18)", zIndex: 201,
        display: "flex", flexDirection: "column", animation: "gbPRSlide .25s ease-out",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "13px 16px", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            {mode === "form" && (
              <button onClick={() => setMode("list")} title="Back to list"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", color: "rgba(255,255,255,0.7)", padding: "5px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: "inherit", flexShrink: 0, transition: "background .12s" }}
                onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                onMouseLeave={el => el.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "white" }}>{mode === "form" ? "New Payment Request" : "Payment Requests"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {project?.name || ""}
                {mode === "form" && " · Sent for admin approval"}
                {mode === "list" && requests.length > 0 && ` · ${requests.length} ${requests.length === 1 ? "request" : "requests"}`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {mode === "list" && (
              <button onClick={() => { setMode("form"); setErr(""); }} title="New request"
                style={{ padding: "6px 12px", borderRadius: 6, background: T.blu, border: "none", color: "white", fontSize: 11.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "inherit", transition: "background .12s" }}
                onMouseEnter={el => el.currentTarget.style.background = "#1D4ED8"}
                onMouseLeave={el => el.currentTarget.style.background = T.blu}>
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                New Request
              </button>
            )}
            <button onClick={onClose} title="Close"
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 6, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .12s" }}
              onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              onMouseLeave={el => el.currentTarget.style.background = "none"}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* ─── LIST MODE ─────────────────────────────────────────────── */}
        {mode === "list" && (
          <>
            {/* Status filter chips */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", gap: 6, flexShrink: 0, background: T.surfaceB, overflowX: "auto" }}>
              {["All", "Pending", "Approved", "Rejected", "Paid"].map(s => {
                const active = statusFilter === s;
                const meta = s !== "All" ? STATUS_META[s] : null;
                const count = s === "All" ? requests.length : requests.filter(r => (r.status || "Pending") === s).length;
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    style={{
                      padding: "4px 10px", borderRadius: 14,
                      border: `1px solid ${active ? (meta?.c || T.blu) : T.b1}`,
                      background: active ? (meta?.bg || T.bluL) : T.surface,
                      color: active ? (meta?.c || T.blu) : T.t3,
                      fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
                      fontFamily: "inherit", whiteSpace: "nowrap",
                      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                      transition: "all .12s",
                    }}>
                    {s}
                    {count > 0 && <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 5px", borderRadius: 8, background: active ? (meta?.c || T.blu) : T.b1, color: active ? "white" : T.t3 }}>{count}</span>}
                  </button>
                );
              })}
            </div>

            {/* List body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
              {loadingList ? (
                <div style={{ padding: "32px", textAlign: "center", color: T.t4, fontSize: 12 }}>Loading...</div>
              ) : (() => {
                const filtered = requests.filter(r => statusFilter === "All" || (r.status || "Pending") === statusFilter);
                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", border: `1.5px dashed ${T.b2}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.t4 }}>
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1 }}>
                        {statusFilter === "All" ? "No payment requests yet" : `No ${statusFilter.toLowerCase()} requests`}
                      </div>
                      <div style={{ fontSize: 11.5, color: T.t3, maxWidth: 320, lineHeight: 1.5 }}>
                        Click <b>+ New Request</b> at top right to raise a payment request for subcon, labour or expense.
                      </div>
                    </div>
                  );
                }
                const me = getUser();
                const canDelete = (r) => {
                  if (!me) return false;
                  const role = (me.role || "").toLowerCase();
                  if (role === "admin" || role === "super_admin") return true;
                  return String(r.requested_by) === String(me.id);
                };
                const onDelete = async (r) => {
                  if (!await window.confirmAsync(`Delete payment request PR-${r.id}?\n\nAmount: ${fmtAmount(r.amount)}\nThis cannot be undone.`)) return;
                  try {
                    const res = await api.del("/finance/payment-requests/" + r.id);
                    if (res?.success === false) {
                      window.alert(res.message || "Delete failed");
                      return;
                    }
                    if (window.toast) window.toast.success("Payment request deleted");
                    loadRequests();
                    onSaved && onSaved();
                  } catch (e) {
                    window.alert(e?.message || "Network error");
                  }
                };
                return filtered.map(r => {
                  // Detect type from request_type or purpose prefix [Type]
                  const detectedType = r.request_type
                    || (TYPES.find(t => (r.purpose || "").toLowerCase().includes(`[${t.label.toLowerCase()}]`))?.id)
                    || "other";
                  const tMeta = TYPE_BY_ID[detectedType] || TYPE_BY_ID.other;
                  const sMeta = STATUS_META[r.status || "Pending"] || STATUS_META.Pending;
                  const isExp = expandedId === r.id;
                  const cleanPurpose = String(r.purpose || "").replace(/^\[[^\]]+\]\s*/, "");
                  const partyDisplay = r.party_name || r.party || "—";
                  return (
                    <div key={r.id}
                      style={{ background: T.surface, border: `1px solid ${isExp ? T.b2 : T.b1}`, borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${tMeta.c}`, overflow: "hidden", transition: "border-color .12s" }}>
                      {/* Compact row */}
                      <div onClick={() => setExpandedId(isExp ? null : r.id)}
                        style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: isExp ? T.surfaceB : "transparent", transition: "background .12s" }}
                        onMouseEnter={el => { if (!isExp) el.currentTarget.style.background = T.surfaceB; }}
                        onMouseLeave={el => { if (!isExp) el.currentTarget.style.background = "transparent"; }}>
                        {/* Type icon */}
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: tMeta.bg, border: `1px solid ${tMeta.brd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={tMeta.c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d={tMeta.icon} />
                          </svg>
                        </div>
                        {/* Title + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{partyDisplay}</span>
                            <span style={{ fontSize: 9.5, color: T.t4, fontFamily: "monospace", flexShrink: 0 }}>PR-{r.id}</span>
                          </div>
                          <div style={{ fontSize: 11, color: T.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {tMeta.label} · {cleanPurpose || r.note || "—"}
                          </div>
                        </div>
                        {/* Amount + status */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: T.t1, fontVariantNumeric: "tabular-nums" }}>{fmtAmount(r.amount)}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 12, background: sMeta.bg, color: sMeta.c, border: `1px solid ${sMeta.brd}`, letterSpacing: ".4px" }}>{sMeta.label}</span>
                        </div>
                      </div>
                      {/* Expanded details */}
                      {isExp && (
                        <div style={{ padding: "10px 14px 12px", background: T.surfaceB, borderTop: `1px solid ${T.b1}`, display: "flex", flexDirection: "column", gap: 8 }}>
                          {(r.description || r.note) && (
                            <div style={{ padding: "7px 10px", borderRadius: 6, background: T.surface, border: `1px solid ${T.b1}`, fontSize: 11.5, color: T.t2, lineHeight: 1.45 }}>
                              {r.description || r.note}
                            </div>
                          )}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                            {(r.requested_by_name || r.requested_by || r.created_by_name) && (
                              <Credit label="Requested by" name={r.requested_by_name || r.requested_by || r.created_by_name} time={r.created_at || r.requested_at} />
                            )}
                            {(r.approved_by_name || r.approved_by) && (r.status === "Approved" || r.status === "Paid") && (
                              <Credit label="Approved by" name={r.approved_by_name || r.approved_by} time={r.approved_at || r.updated_at} />
                            )}
                            {r.priority && r.priority !== "Medium" && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, textTransform: "uppercase", letterSpacing: ".4px", color: PRIORITIES.find(p => p.id === r.priority)?.c || T.t3, background: PRIORITIES.find(p => p.id === r.priority)?.bg || T.surfaceB, border: `1px solid ${PRIORITIES.find(p => p.id === r.priority)?.brd || T.b1}` }}>
                                {r.priority}
                              </span>
                            )}
                            {canDelete(r) && (
                              <button onClick={(e) => { e.stopPropagation(); onDelete(r); }}
                                style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.redM}`, background: T.redL, color: T.red, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}
                                title="Delete this payment request">
                                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}

        {/* ─── FORM MODE ─────────────────────────────────────────────── */}
        {mode === "form" && (<>
        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          {/* Type — visual chip cards */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>What is this for? *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TYPES.map(t => {
                const active = type === t.id;
                return (
                  <button key={t.id} onClick={() => setType(t.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${active ? t.c : T.b1}`,
                      background: active ? t.bg : T.surface,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: "inherit",
                      transition: "all .12s",
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = T.b2; e.currentTarget.style.background = T.surfaceB; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = T.b1; e.currentTarget.style.background = T.surface; } }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 7,
                      background: active ? t.c + "22" : T.surfaceB,
                      border: `1px solid ${active ? t.c + "44" : T.b1}`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={active ? t.c : T.t3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d={t.icon} />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? t.c : T.t1 }}>{t.label}</div>
                      <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Beneficiary */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>{type === "subcon" ? "Subcontractor *" : type === "labour" ? "Worker / Group *" : type === "expense" ? "Vendor / Recipient *" : "Beneficiary *"}</label>
            {/* Prefilled party — show as locked pill (e.g. came from Subcon tab) */}
            {prefillParty?.name && partyName === prefillParty.name ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 7,
                border: `1.5px solid ${T.grnM}`, background: T.grnL,
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.grn} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span style={{flex:1,fontSize:13,fontWeight:700,color:T.grn,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{partyName}</span>
                <button type="button" onClick={()=>{ setPartyName(""); setPartyId(null); }}
                  style={{padding:"3px 8px",background:"none",border:`1px solid ${T.grnM}`,borderRadius:5,color:T.grn,fontSize:10.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                  Change
                </button>
              </div>
            ) : (type === "subcon" || type === "expense") && partyOptions.length > 0 ? (
              <SearchSelect
                value={partyId ? String(partyId) : ""}
                options={partyOptions}
                onChange={(v) => {
                  setPartyId(v);
                  const p = parties.find(x => String(x.id) === String(v));
                  setPartyName(p?.name || "");
                }}
                placeholder={type === "subcon" ? "Select subcontractor..." : "Select vendor..."}
              />
            ) : (
              <input value={partyName} onChange={e => setPartyName(e.target.value)}
                placeholder={type === "labour" ? "e.g. Mason group, Saturday wages" : "Type beneficiary name..."}
                style={inp} onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
            )}
          </div>

          {/* Amount + Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Amount (₹) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 25000"
                style={{ ...inp, fontSize: 14, fontWeight: 600 }}
                onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
            </div>
            <div>
              <label style={lbl}>Priority</label>
              <div style={{ display: "flex", gap: 4, padding: 2, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 7 }}>
                {PRIORITIES.map(p => {
                  const active = priority === p.id;
                  return (
                    <button key={p.id} onClick={() => setPriority(p.id)}
                      style={{
                        flex: 1, padding: "5px 0", borderRadius: 5, border: "none",
                        background: active ? p.c : "transparent",
                        color: active ? "#fff" : p.c,
                        fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        transition: "all .12s",
                      }}>{p.id}</button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Purpose / Reason *</label>
            <input value={purpose} onChange={e => setPurpose(e.target.value)}
              placeholder={type === "subcon" ? "e.g. Brickwork bill — Block A" : type === "labour" ? "e.g. Mason wages — week of 21 Apr" : "e.g. Cement transport"}
              style={inp} onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
          </div>

          {/* Needed By (kab tak chahiye) */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Payment Needed By</label>
            <input type="date" value={neededBy} onChange={e => setNeededBy(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              style={inp} onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
            <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>Approver ko bata do kab tak fund chahiye</div>
          </div>

          {/* Note */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Additional Notes (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Any context for the approver..."
              style={{ ...inp, padding: "9px 11px", height: "auto", resize: "vertical", lineHeight: 1.5 }}
              onFocus={e => e.target.style.borderColor = T.blu} onBlur={e => e.target.style.borderColor = T.b1} />
          </div>

          {err && (
            <div style={{ padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0, background: T.surfaceB }}>
          <button onClick={()=>setMode("list")} disabled={saving}
            style={{ padding: "9px 16px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b2}`, color: T.t2, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{
              padding: "9px 22px", borderRadius: 7,
              background: T.blu, border: "none", color: "white",
              fontSize: 12.5, fontWeight: 700, cursor: saving ? "wait" : "pointer",
              boxShadow: `0 2px 8px ${T.blu}40`, fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Sending..." : "Send Request"}
          </button>
        </div>
        </>)}
      </div>
    </>
  );
}

// ── styles ──
const lbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".5px", display: "block", marginBottom: 6 };
const inp = { width: "100%", height: 36, padding: "0 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color .12s" };
