// ── MATERIAL LEDGER DRAWER ────────────────────────────────────────
// Slide-in drawer opened from the project's Material Inventory tab when
// a material row is clicked. Shows that one material's full history in
// three tabs — GRN (receipts) / Used (consumption) / MR (requests) —
// each independently sortable. Also hosts the inline Mark-Used form.
//
// Props:
//   material   — { material_name, unit, total_received, total_used,
//                  balance, receipts:[], usage:[] }  (null = closed)
//   projectId  — for the MR fetch + mark-used POST
//   onClose    — close the drawer
//   onChanged  — called after mark-used / used-delete so parent reloads
//   canDeleteUsed — fn(created_by_id, created_at) => bool (apni aaj ki = Material
//                   Entry, warna Material Delete — Roles & Access, 5 Oct 2026)
//   onGrnClick — optional fn(grn_id) — opens the material flow drawer

import { useState, useEffect, useMemo } from "react";
import api from "../config/api";
import { t } from "../i18n";
import { todayISO } from "../utils/today";
import { BackClose } from "../utils/backNav";
import { canEntry, currentUser } from "../utils/perms";
import { loadLibUnits, unitOptions, sameStockUnit, kgPerUnit } from "./grn/weigh";
import PickSelect from "./PickSelect";
import { UsedUnitRow, stockQtyOf, factorOf } from "./UnitConv";
import { askCustodyApproval } from "../modules/tabs/MaterialCustodyTab";

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

const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); } catch { return d; }
};
const ts = (d) => { try { return new Date(d).getTime() || 0; } catch { return 0; } };

const MR_STAGE = {
  Requested: { c: T.amb, bg: T.ambL }, Pending: { c: T.amb, bg: T.ambL },
  Approved:  { c: T.blu, bg: T.bluL }, Ordered: { c: T.pur, bg: T.purL },
  Received:  { c: T.grn, bg: T.grnL }, PartialReceived: { c: T.amb, bg: T.ambL },
  Used:      { c: T.t3, bg: T.b1 },    Rejected: { c: T.red, bg: T.redL },
  Closed:    { c: T.t3, bg: T.b1 },
};

export default function MaterialLedgerDrawer({ material, projectId, onClose, onChanged, canDeleteUsed, onGrnClick }) {
  const open = !!material;
  const [tab, setTab]       = useState("all");          // all | grn | used | mr
  const [sortNew, setSortNew] = useState(true);          // true = newest first
  const [mrs, setMrs]       = useState(null);            // null = not loaded
  const [markUsed, setMarkUsed] = useState(false);
  const [uForm, setUForm]   = useState({ qty: "", remark: "", used_date: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const [unitFix, setUnitFix] = useState(false);   // "Stock ki unit theek karo" (Admin, 13 Oct 2026)
  // Mark used me card ki doosri unit (45 Mtr, 2 Bundle) — 19 Oct 2026.
  const [usedSt, setUsedSt] = useState(null);
  useEffect(() => {
    if (!markUsed || !material || !projectId) return undefined;
    let alive = true;
    api.get(`/tasks/project/${projectId}/stock-units?names=` + encodeURIComponent(material.material_name))
      .then(r => { if (alive && r?.success) setUsedSt((r.data || {})[String(material.material_name || "").trim().toLowerCase()] || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [markUsed, material, projectId]);
  const isAdmin = ["admin", "super_admin"].includes(String(currentUser().role || "").toLowerCase());

  // Reset on material change
  useEffect(() => {
    if (material) {
      setTab("all"); setSortNew(true); setMrs(null); setMarkUsed(false); setErr(""); setUnitFix(false);
      setUForm({ qty: "", remark: "", used_date: todayISO() });
    }
  }, [material]);

  // Lazy-fetch MRs the first time the MR tab is opened
  useEffect(() => {
    if (open && tab === "mr" && mrs === null) {
      api.get(`/procurement/mrs?project_id=${projectId}`)
        .then(r => {
          const name = (material.material_name || "").trim().toLowerCase();
          const list = (r?.data || []).filter(m =>
            (m.item_name || "").trim().toLowerCase() === name);
          setMrs(list);
        })
        .catch(() => setMrs([]));
    }
  }, [open, tab, mrs, projectId, material]);

  const receipts = useMemo(() => {
    const arr = [...(material?.receipts || [])];
    arr.sort((a, b) => sortNew ? ts(b.received_date) - ts(a.received_date) : ts(a.received_date) - ts(b.received_date));
    return arr;
  }, [material, sortNew]);

  const usage = useMemo(() => {
    const arr = [...(material?.usage || [])];
    arr.sort((a, b) => sortNew ? ts(b.used_date) - ts(a.used_date) : ts(a.used_date) - ts(b.used_date));
    return arr;
  }, [material, sortNew]);

  const mrSorted = useMemo(() => {
    const arr = [...(mrs || [])];
    arr.sort((a, b) => sortNew ? ts(b.created_at) - ts(a.created_at) : ts(a.created_at) - ts(b.created_at));
    return arr;
  }, [mrs, sortNew]);

  // Trip receipt ki chhoti line: "Trip bhada ₹650 — Machinery bill me" / "Rate baaki" (₹ sirf Finance VIEW ko).
  const tripSub = (tr) => tr.cancelled ? t("material_ledger.trip_hata") : [tr.use === "auto" ? t("material_ledger.trip_auto") : tr.use === "mark" ? t("material_ledger.trip_mark") : "",
    tr.bhada != null ? t("material_ledger.trip_bhada", { amt: "₹" + Number(tr.bhada).toLocaleString("en-IN") })
      : tr.rate_pending && !tr.money_hidden ? t("material_ledger.trip_rate_baaki") : ""].filter(Boolean).join(" · ");

  // Unified credit/debit ledger — GRN = Cr (in), Used = Dr (out).
  // Running balance is always computed oldest-first; display order then
  // follows the sort toggle.
  const ledgerRows = useMemo(() => {
    const entries = [
      ...(material?.receipts || []).map(r => ({
        _t: "grn", date: r.received_date, ref: r.grn_number || "GRN",
        // Trip se aaya (15 Oct 2026): vendor nahi — trip no. + gaadi, aur trip ka
        // bhada sirf jaankari (paisa Machinery ke trip bill se, yahan nahi judta).
        party: r.trip ? (r.trip.reg ? t("material_ledger.trip_party", { no: r.trip.trip_no || "", reg: r.trip.reg }) : t("material_ledger.trip_party_noreg", { no: r.trip.trip_no || "" }))
          : (r.vendor_name || "—"),
        // Tolai wali gadi bhi (28 Sep 2026) — "kaunsi gadi se kitna aaya"
        sub: r.trip ? tripSub(r.trip)
          // Hatayi gayi site GRN (16 Oct 2026) — "Cancelled · wajah", qty jod me nahi
          : r.cancelled ? [t("site_grnc.cancelled_tag"), t("site_grnc.cancelled_line", { reason: r.cancel_reason || "—" })].join(" · ")
          : [r.challan_no ? `Challan ${r.challan_no}` : "", r.vehicle_no ? "⚖️ " + r.vehicle_no : ""].filter(Boolean).join(" · "),
        by: r.received_by || "", qty: Number(r.qty) || 0, grn_id: r.grn_id,
        cancelled: !!r.cancelled, cqty: Number(r.cancelled_qty) || 0,
        open_issues: Number(r.open_issues) || 0,
      })),
      ...(material?.usage || []).map(u => ({
        _t: "used", date: u.used_date, ref: u.task_no || "USE",
        party: u.task_name || "Project level", sub: u.remark || "",
        by: u.used_by || u.user_name || "", qty: Number(u.qty) || 0,
        used_log_id: u.used_log_id, task_id: u.task_id, created_by_id: u.created_by_id,
        created_at: u.created_at, unit: u.unit,
      })),
    ];
    entries.sort((a, b) => ts(a.date) - ts(b.date));   // oldest-first for running bal
    let bal = 0;
    // 3 decimal par round — float jod "1003.0999999999999" dikhata tha (MAT-04)
    entries.forEach(e => { bal = Math.round((bal + (e._t === "grn" ? e.qty : -e.qty)) * 1000) / 1000; e.bal = bal; });
    return sortNew ? entries.reverse() : entries;
  }, [material, sortNew]);

  if (!open) return null;

  const handleMarkUsed = async () => {
    if (saving) return;
    const q = parseFloat(uForm.qty);
    if (!q || q <= 0) { setErr(t("material_ledger.qty_daalo")); return; }
    const uu = uForm.unit || material.unit;
    const sq = stockQtyOf(usedSt, uu, q, uForm.stock_factor);
    if (sq == null) { setErr(t("unitcard.need_number", { unit: uu })); return; }
    if (sq > Number(material.balance)) { setErr(t("material_ledger.balance_sirf_balance_unit_hai", { balance: material.balance, unit: material.unit })); return; }
    setSaving(true); setErr("");
    try {
      const sf = factorOf(usedSt, uu, q, uForm.stock_factor);
      const res = await api.post(`/tasks/project/${projectId}/mark-used`, {
        material_name: material.material_name,
        used_qty: q, unit: uu, ...(sf ? { stock_factor: sf } : {}),
        remark: uForm.remark || null, used_date: uForm.used_date,
      });
      if (res?.success === false) {
        // Hissa B: rakhi zimmedari tak pahuncha — manzoori maango.
        const asked = await askCustodyApproval(res, { task_id: null, qty: q, unit: uu, ...(sf ? { stock_factor: sf } : {}),
          remark: uForm.remark || null, used_date: uForm.used_date, via: "mark_used" });
        if (asked && asked.asked) { if (asked.ok) { setMarkUsed(false); window.alert(asked.message); } else setErr(asked.message); }
        else if (!asked) setErr(res.message || "Failed");
        setSaving(false); return;
      }
      setMarkUsed(false);
      onChanged && onChanged();
      onClose && onClose();
    } catch (e) { setErr(e?.message || "Network error"); }
    setSaving(false);
  };

  const handleDeleteUsed = async (row) => {
    // Wajah zaroori (server: kam se kam 3 akshar, audit me jaati hai).
    const reason = await window.promptAsync(t("material.used_delete_reason_ask", { qty: row.qty, unit: row.unit || material.unit || "" }));
    if (reason == null) return;
    if (reason.trim().length < 3) { setErr(t("material.used_delete_reason_short")); return; }
    try {
      const r = await api.del(`/tasks/${row.task_id}/used-log/${row.used_log_id}`, { reason: reason.trim() });
      if (r?.success) { onChanged && onChanged(); onClose && onClose(); }
      else setErr(r?.message || "Delete failed");
    } catch (e) { setErr(e?.message || "Network error"); }
  };

  const balColor = material.balance <= 0 ? T.red : material.balance < material.total_received * 0.2 ? T.amb : T.grn;
  const TABS = [
    { id: "all",  l: t("common.all"),  n: receipts.length + usage.length },
    { id: "grn",  l: "GRN",  n: receipts.length },
    { id: "used", l: t("common.used"), n: usage.length },
    { id: "mr",   l: "MR",   n: mrs === null ? "·" : mrs.length },
  ];
  // Ledger rows filtered for the active tab (running balance stays intact)
  const visibleLedger = tab === "grn"  ? ledgerRows.filter(e => e._t === "grn")
                      : tab === "used" ? ledgerRows.filter(e => e._t === "used")
                      : ledgerRows;

  return (
    <>
      <BackClose onClose={onClose}/>
      <div 
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1400, backdropFilter: "blur(2px)" }}/>
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: "min(620px,100vw)",
        background: T.surface, zIndex: 1401, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", animation: "mlSlideIn .25s ease",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}>
        {/* Header — slim */}
        <div style={{ background: "#0D1B2A", padding: "14px 20px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{material.material_name}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: ".3px", textTransform: "uppercase", marginTop: 2 }}>{t("material_ledger.material_ledger_unit", { unit: material.unit })}</div>
          </div>
          <button onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>
        {/* Purple accent bar */}
        <div style={{ height: 3, background: T.pur, flexShrink: 0 }}/>

        {/* Hero — remaining balance on site */}
        <div style={{ padding: "18px 20px 12px", textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 10.5, color: T.t3, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px" }}>
           {t("material_ledger.remaining_on_site")}
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: balColor, lineHeight: 1.05, marginTop: 3 }}>
            {material.balance}
            <span style={{ fontSize: 15, fontWeight: 600, color: T.t4, marginLeft: 5 }}>{material.unit}</span>
          </div>
        </div>

        {/* 3-stat card */}
        <div style={{ margin: "0 20px 14px", display: "flex", border: `1px solid ${T.b1}`, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
          {[["Received", material.total_received, T.grn],
            ["Used", material.total_used, T.red],
            ["Balance", material.balance, balColor]].map(([l, v, c], i) => (
            <div key={l} style={{ flex: 1, padding: "10px 8px", textAlign: "center", borderLeft: i ? `1px solid ${T.b1}` : "none", background: T.surfaceB }}>
              <div style={{ fontSize: 9.5, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Trip se aaya — ginti (15 Oct 2026) */}
        {material.trip_summary && material.trip_summary.trips > 0 && (
          <div style={{ margin: "-6px 20px 12px", fontSize: 11.5, color: T.t3, textAlign: "center" }}>
            {material.trip_summary.qty == null ? t("material_ledger.trip_summary_n", { n: material.trip_summary.trips })
              : t("material_ledger.trip_summary", { n: material.trip_summary.trips, qty: Number(material.trip_summary.qty).toLocaleString("en-IN"), unit: material.trip_summary.unit || material.unit || "" })}
          </div>
        )}

        {/* Tabs + sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", borderBottom: `1px solid ${T.b1}`, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "6px 13px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: tab === t.id ? T.blu : "transparent", color: tab === t.id ? "#fff" : T.t3 }}>
              {t.l} <span style={{ opacity: 0.7, fontSize: 10.5 }}>{t.n}</span>
            </button>
          ))}
          <div style={{ flex: 1 }}/>
          <button onClick={() => setSortNew(s => !s)}
            style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${T.b1}`, background: T.surfaceB, color: T.t2, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
            {sortNew ? t("material_ledger.newest") : t("material_ledger.oldest")}
          </button>
        </div>

        {err && (
          <div style={{ margin: "10px 14px 0", padding: "8px 11px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12 }}>{err}</div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Credit / Debit ledger — All / GRN / Used with running balance */}
          {tab !== "mr" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 58px 22px", gap: 5, padding: "7px 16px", background: "#1E293B", position: "sticky", top: 0, zIndex: 1 }}>
                {[["Date", 0], ["Details", 0], ["In", 1], ["Out", 1], ["Bal", 1], ["", 1]].map(([h, r], i) => (
                  <div key={i} style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px", textAlign: r ? "right" : "left" }}>{h}</div>
                ))}
              </div>
              {visibleLedger.length === 0
                ? <Empty text={tab === "grn" ? t("material_ledger.koi_grn_receipt_nahi") : tab === "used" ? t("material_ledger.koi_usage_entry_nahi") : t("material_ledger.koi_entry_nahi")}/>
                : visibleLedger.map((e, i) => {
                  const isGRN = e._t === "grn";
                  const balNeg = e.bal < 0;
                  const showDel = !isGRN && e.used_log_id && e.task_id && canDeleteUsed && canDeleteUsed(e.created_by_id, e.created_at);
                  return (
                    <div key={i}
                      onClick={() => isGRN && e.grn_id && onGrnClick && onGrnClick(e.grn_id)}
                      style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 58px 22px", gap: 5, padding: "8px 16px", borderBottom: `1px solid ${T.b1}`, alignItems: "center", borderLeft: `3px solid ${isGRN ? T.grn : T.amb}`, cursor: isGRN && e.grn_id ? "pointer" : "default", background: i % 2 ? T.surfaceB : T.surface, transition: "background .1s" }}
                      onMouseEnter={ev => { if (isGRN && e.grn_id) ev.currentTarget.style.background = T.bluL + "55"; }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = i % 2 ? T.surfaceB : T.surface; }}>
                      <div style={{ fontSize: 10.5, color: T.t3 }}>{fmtDate(e.date)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.party}</div>
                        <div style={{ fontSize: 9.5, color: T.t4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ fontFamily: "monospace", color: isGRN ? T.grn : T.amb, fontWeight: 700 }}>{e.ref}</span>
                          {e.sub ? ` · ${e.sub}` : ""}{e.by ? ` · ${e.by}` : ""}
                          {e.open_issues > 0 && (
                            <span title={t("material_ledger.is_delivery_me_open_issue_hai")}
                              style={{ marginLeft: 5, fontSize: 9, fontWeight: 700, color: T.red, background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 8, padding: "0 5px" }}>
                              ⚠ {e.open_issues}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: isGRN && !e.cancelled ? T.grn : T.b2, textAlign: "right", textDecoration: e.cancelled ? "line-through" : "none" }}>{isGRN ? (e.cancelled ? e.cqty : e.qty) : "—"}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: !isGRN ? T.red : T.b2, textAlign: "right" }}>{!isGRN ? e.qty : "—"}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: balNeg ? T.red : T.t1, textAlign: "right" }}>{e.bal}</div>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        {showDel && (
                          <button title={t("material_ledger.delete_usage_entry")} onClick={ev => { ev.stopPropagation(); handleDeleteUsed(e); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: T.red, lineHeight: 0 }}>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              {visibleLedger.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 48px 48px 58px 22px", gap: 5, padding: "9px 16px", background: "#0F172A" }}>
                  <div style={{ gridColumn: "1 / 3", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("common.total")}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#4ADE80", textAlign: "right" }}>{material.total_received}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#F87171", textAlign: "right" }}>{material.total_used}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", textAlign: "right" }}>{material.balance}</div>
                  <div/>
                </div>
              )}
            </>
          )}

          {/* MR tab — request cards */}
          {tab === "mr" && (
            <div style={{ padding: "12px 14px" }}>
              {mrs === null
                ? <div style={{ textAlign: "center", padding: 30, color: T.t4, fontSize: 12 }}>{t("common.loading_2")}</div>
                : mrSorted.length === 0
                  ? <Empty text={t("material_ledger.is_material_ki_koi_mr_nahi")}/>
                  : mrSorted.map((m, i) => {
                    const st = m.stage || (m.mr_status === "Closed" ? "Closed" : m.mat_status === "Used" ? "Used" : m.mat_status === "Received" || m.mat_status === "PartialReceived" ? "Received" : m.mat_status === "Ordered" ? "Ordered" : m.mr_status === "Approved" ? "Approved" : m.mr_status === "Rejected" ? "Rejected" : "Requested");
                    const sm = MR_STAGE[st] || MR_STAGE.Requested;
                    return (
                      <Row key={i} accent={sm.c}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, fontFamily: "monospace" }}>{m.mr_number || `MR-${m.id}`}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{m.quantity} {m.unit}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: sm.bg, color: sm.c }}>{st}</span>
                          <span style={{ fontSize: 10.5, color: T.t4 }}>{fmtDate(m.created_at)}{m.requested_by ? ` · ${m.requested_by}` : ""}</span>
                        </div>
                      </Row>
                    );
                  })}
            </div>
          )}
        </div>

        {/* Footer — Mark Used */}
        <div style={{ borderTop: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0 }}>
          {markUsed && material.balance > 0 && (
            <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={lbl}>{t("material_ledger.qty_used")}</label>
                  <input type="number" value={uForm.qty} autoFocus
                    onChange={e => setUForm(p => ({ ...p, qty: e.target.value }))}
                    placeholder={`max ${material.balance}`} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>{t("common.date")}</label>
                  <input type="date" value={uForm.used_date}
                    onChange={e => setUForm(p => ({ ...p, used_date: e.target.value }))} style={inp}/>
                </div>
              </div>
              <input value={uForm.remark} onChange={e => setUForm(p => ({ ...p, remark: e.target.value }))}
                placeholder={t("common.remark_optional")} style={{ ...inp, marginBottom: 8 }}/>
              <UsedUnitRow st={usedSt} unit={uForm.unit || material.unit} qty={uForm.qty} factor={uForm.stock_factor}
                onUnit={u => setUForm(p => ({ ...p, unit: u, stock_factor: "" }))}
                onFactor={v => setUForm(p => ({ ...p, stock_factor: v }))}/>
            </div>
          )}
          <div style={{ padding: "11px 14px", display: "flex", gap: 8 }}>
            {material.balance > 0 ? (
              !canEntry("Material") ? null : !markUsed ? (
                <button onClick={() => setMarkUsed(true)}
                  style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.grnL, border: `1px solid ${T.grnM}`, color: T.grn, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                 {t("material_ledger.mark_used")}
                </button>
              ) : (
                <>
                  <button onClick={() => { setMarkUsed(false); setErr(""); }} disabled={saving}
                    style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                   {t("common.cancel")}
                  </button>
                  <button onClick={handleMarkUsed} disabled={saving}
                    style={{ flex: 2, padding: "9px", borderRadius: 7, background: saving ? "#9CA3AF" : T.grn, border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? t("common.saving_2") : t("material_ledger.save_used_entry")}
                  </button>
                </>
              )
            ) : (
              <div style={{ flex: 1, textAlign: "center", fontSize: 11.5, color: T.t4, padding: "9px" }}>
               {t("material_ledger.balance_0_kuch_use_nahi_kar")}
              </div>
            )}
            {isAdmin && !markUsed && (
              <button onClick={() => setUnitFix(true)}
                style={{ padding: "9px 12px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b2}`, color: T.pur, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {t("unit_fix.btn")}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Unit badli to drawer ka data purana — band karke ledger taaza */}
      {unitFix && <SiteUnitFixModal projectId={projectId} name={material.material_name}
        onClose={() => setUnitFix(false)} onDone={() => { onChanged && onChanged(); onClose && onClose(); }}/>}
      <style>{`@keyframes mlSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// "Stock ki unit theek karo" (13 Oct 2026) — sirf Admin. Is site par material
// ki stock unit galat lagi ho (pehli GRN Nos me, asal me Kg) to nayi unit +
// factor ("1 {purani} = [__] {nayi}"). Hamnaam (Bag/Bags) par factor 1, wazan
// se wazan apne aap — khaana nahi. "Aage" = server dry_run (kya badlega +
// chetavni), phir note + Admin password se "Unit badlo". Abhi ki unit server
// se (stock-units — pehli GRN line ki unit). Server: POST
// /tasks/project/:projectId/stock-unit-fix (utils/stockUnitFix.js).
// ════════════════════════════════════════════════════════════════
const fmtF = (n) => String(Math.round(Number(n || 0) * 1e6) / 1e6);
function SiteUnitFixModal({ projectId, name, onClose, onDone }) {
  const [uoms, setUoms] = useState([]);
  const [old, setOld] = useState(null);          // null = aa raha
  const [nu, setNu] = useState("");
  const [factor, setFactor] = useState("");
  const [plan, setPlan] = useState(null);
  const [note, setNote] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  useEffect(() => {
    let alive = true;
    loadLibUnits().then(u => { if (alive) setUoms(u || []); });
    api.get(`/tasks/project/${projectId}/stock-units?names=${encodeURIComponent(name)}`).then(r => {
      const hit = r && r.success && r.data ? r.data[String(name || "").trim().toLowerCase()] : null;
      if (alive) setOld(hit && hit.unit ? String(hit.unit) : "");
    }).catch(() => { if (alive) setOld(""); });
    return () => { alive = false; };
  }, [projectId, name]);
  const o = String(old || "").trim();
  const opts = unitOptions(uoms, []).filter(x => String(x.value).trim() !== o);
  const kind = !nu || !o ? null : sameStockUnit(o, nu) ? "alias" : (kgPerUnit(o) && kgPerUnit(nu)) ? "weight" : "factor";
  const autoF = kind === "alias" ? 1 : kind === "weight" ? kgPerUnit(o) / kgPerUnit(nu) : null;
  const body = () => ({ material_name: name, new_unit: nu, factor: kind === "factor" ? Number(factor) : undefined, old_unit: o });
  const url = `/tasks/project/${projectId}/stock-unit-fix`;

  const check = async () => {
    if (busy) return;
    if (!nu) { setErr(t("unit_fix.need_unit")); return; }
    if (kind === "factor" && !(Number(factor) > 0)) { setErr(t("unit_fix.need_factor", { old: o, new: nu })); return; }
    setBusy(true); setErr("");
    const r = await api.post(url, { ...body(), dry_run: true }).catch(() => null);
    setBusy(false);
    if (r && r.success) setPlan(r.data); else setErr((r && r.message) || t("unit_fix.fail"));
  };
  const save = async () => {
    if (busy) return;
    if (!note.trim()) { setErr(t("unit_fix.need_note")); return; }
    if (!pw) { setErr(t("unit_fix.need_pw")); return; }
    setBusy(true); setErr("");
    const r = await api.post(url, { ...body(), note: note.trim(), password: pw }).catch(() => null);
    setBusy(false);
    if (r && r.success) { setPw(""); setDone(r.message || ""); }
    else setErr((r && r.message) || t("unit_fix.fail"));
  };
  const close = () => { if (busy) return; if (done) { onDone && onDone(); } onClose && onClose(); };

  const lb = { ...lbl, fontSize: 10, margin: "10px 0 4px" };
  const warn = (txt, k) => <div key={k} style={{ fontSize: 11.5, color: "#92400E", background: T.ambL, borderRadius: 7, padding: "7px 10px", marginTop: 6, lineHeight: 1.45 }}>{txt}</div>;
  const warns = [];
  if (plan) {
    if (plan.third_unit && plan.third_unit.rows > 0) warns.push(warn(t("unit_fix.warn_third", { n: plan.third_unit.rows, units: (plan.third_unit.units || []).join(", ") }), "th"));
    if (plan.billed && plan.billed.lines > 0) warns.push(warn(t("unit_fix.warn_billed", { n: plan.billed.lines }), "bl"));
    if (plan.po_lines > 0) warns.push(warn(t("unit_fix.warn_po", { n: plan.po_lines }), "po"));
    if (plan.pending_in > 0) warns.push(warn(t("unit_fix.warn_pending_in", { n: plan.pending_in, old: plan.old_unit }), "pi"));
  }
  const btnS = (bg, c, b) => ({ padding: "8px 16px", borderRadius: 7, border: b ? `1px solid ${b}` : "none", background: bg, color: c, fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 });

  return (
    <>
      <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1500 }}/>
      <div role="dialog" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(460px,94vw)", maxHeight: "90vh", overflowY: "auto",
        background: T.surface, borderRadius: 12, zIndex: 1501, boxShadow: "0 20px 50px rgba(0,0,0,0.25)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: T.t1 }}>{t("unit_fix.title")}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("unit_fix.sub_site", { material: name })}</div>
          </div>
          <button onClick={close} aria-label={t("common.close")} style={{ border: "none", background: "none", fontSize: 18, color: T.t3, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "12px 18px 16px" }}>
          {done ? (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.grn, padding: "10px 0" }}>{done}</div>
          ) : !plan ? (<>
            <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.5 }}>{t("unit_fix.what")}</div>
            <div style={lb}>{t("unit_fix.current")}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.t1 }}>{old === null ? t("common.loading_2") : (o || "—")}</div>
            <div style={lb}>{t("unit_fix.new_unit")}</div>
            <PickSelect value={nu} onChange={e => { setNu(e.target.value); setFactor(""); setErr(""); }} style={inp}>
              <option value="">{t("unit_fix.new_unit_ph")}</option>
              {opts.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
            </PickSelect>
            {kind === "factor" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{t("unit_fix.factor_eq", { old: o })}</span>
                <input type="number" min="0" step="any" value={factor} onChange={e => setFactor(e.target.value)} aria-label={t("unit_fix.factor_aria", { old: o, new: nu })}
                  style={{ ...inp, width: 110, textAlign: "right", fontWeight: 700 }}/>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.t2 }}>{nu}</span>
              </div>
            )}
            {kind === "alias" && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 8 }}>{t("unit_fix.alias", { old: o, new: nu })}</div>}
            {kind === "weight" && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 8 }}>{t("unit_fix.weight", { old: o, new: nu, f: fmtF(autoF) })}</div>}
          </>) : (<>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, lineHeight: 1.5 }}>{t("unit_fix.will_change", { n: plan.total, old: plan.old_unit, new: plan.new_unit, f: fmtF(plan.factor) })}</div>
            {warns}
            <div style={lb}>{t("unit_fix.note")}</div>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t("unit_fix.note_ph")} style={{ ...inp, resize: "vertical" }}/>
            <div style={lb}>{t("unit_fix.pw")}</div>
            <input type="password" autoComplete="new-password" aria-label={t("unit_fix.pw")} value={pw} onChange={e => setPw(e.target.value)} style={inp}/>
          </>)}
          {err && <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 600, color: T.red }}>{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            {done ? <button onClick={close} style={btnS(T.blu, "#fff")}>{t("common.close")}</button>
              : !plan ? <button onClick={check} disabled={busy || old === null || !o} style={btnS(T.blu, "#fff")}>{busy ? t("unit_fix.checking") : t("unit_fix.check")}</button>
              : (<>
                <button onClick={() => { setPlan(null); setErr(""); }} disabled={busy} style={btnS(T.surface, T.t2, T.b1)}>{t("unit_fix.back")}</button>
                <button onClick={save} disabled={busy} style={btnS(T.red, "#fff")}>{busy ? t("common.saving") : t("unit_fix.save")}</button>
              </>)}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ children, accent, onClick, clickable }) {
  return (
    <div onClick={clickable ? onClick : undefined}
      style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${accent}`,
        borderRadius: 8, padding: "9px 11px", marginBottom: 7, cursor: clickable ? "pointer" : "default",
        transition: "background .1s" }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = T.bluL + "55"; }}
      onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ textAlign: "center", padding: "40px 20px", color: T.t4, fontSize: 12.5 }}>{text}</div>;
}

const lbl = { fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 3 };
const inp = { width: "100%", padding: "7px 9px", borderRadius: 6, border: `1.5px solid ${T.b1}`, fontSize: 12.5, color: T.t1, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
