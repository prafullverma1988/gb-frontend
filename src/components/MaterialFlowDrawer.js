// ── MATERIAL TRAIL DRAWER ─────────────────────────────────────
// Project Material Ledger (GRN row) ya Store khaate ki line (In / Out) se
// khulta hai: us material ka poora raasta, ek khadi timeline me — har step
// ek chhota card:
//   MR → Manzoori → Order → Weighbridge / Trip → GRN → Store se diya →
//   Project par aaya → Use · Bill (sirf Finance VIEW ko — server tay karta hai)
// Har card (28 Oct 2026, saaf roop): icon + step + kab (IST, darj time) + kisne
// ek line me, phir 1–2 line sirf bhari hui jaankari, phir photo (naam ke saath;
// tap = bada, × / Back se band). Jis line se khola wo card highlight.
// Upar: material, maatra, project, "{n} step" + is receipt ka Aaya / Laga / Baaki.
// MR / Order na ho (trip se ya direct GRN) to khaali card nahi — ek chhoti line.
//
// Server: GET /procurement/material-trail?kind=&id=&material= (27 Oct 2026).
// kind = grn (site / store ki grn_entries) — tab GRN ke apne kaam bhi:
// shikayat (issue), sudhaar, hatana, MR sudhaar, Activity log.
//
// Props:
//   grnId       — grn_entries.id (project Material tab) — purana tareeka
//   trail       — { kind, id, material } — kisi bhi shuruaat se (Store khaata)
//   onClose
//   onChanged   — GRN sudhaar / hatane ke baad parent ledger dobara laaye
//   isAdmin     — false = sirf dekhna. Har button par wahi tick bhi lagta hai
//                 jo server maangta hai (Roles & Access, 5 Oct 2026):
//                 shikayat = Procurement/Material Entry, band karna = Procurement
//                 Approve, GRN sudhaar = Procurement/Material Edit, GRN hatana =
//                 Procurement Delete (wajah zaroori), MR sudhaar = Procurement Edit
//   onEditMR    — optional callback to open MRDetailDrawer with the linked MR

import React, { useState, useEffect } from "react";
import api from "../config/api";
import LibrarySelect from "./LibrarySelect";
import uploadManager from "../utils/uploadManager";
import ActivityLog from "./ActivityLog";
import { t } from "../i18n";
import { BackClose } from "../utils/backNav";
import { cld } from "../utils/cloudinary";
import { can, canAny, canEntry } from "../utils/perms";
import { darjWhen } from "../utils/darjTime";

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

// GRN issue ka type — wire value English hi rehti hai, dikhta bhasha me.
// "Weighbridge" (9 Oct 2026) / "Receiving" (10 Oct 2026, E) server khud banata
// hai, "+ Issue" ke chips me nahi aate.
const ISSUE_TYPES = ["Quality", "Short", "Damaged", "WrongItem", "Other"];
const ITYPE_KEY = { Quality: "material_flow.itype_quality", Short: "material_flow.itype_short", Damaged: "material_flow.itype_damaged",
  WrongItem: "material_flow.itype_wrong_item", Other: "material_flow.itype_other",
  Weighbridge: "grn_issue.type_weighbridge", Receiving: "grn_issue.type_receiving" };
const issueTypeLabel = (ty) => (ITYPE_KEY[ty] ? t(ITYPE_KEY[ty]) : ty);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Business date ("2026-10-15") — din jaisa ka waisa (timezone se khiske nahi).
const fmtDate = (d) => {
  if (!d) return "—";
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return Number(m[3]) + " " + MONTHS[Number(m[2]) - 1] + " " + m[1];
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }); } catch { return String(d); }
};
const fmtQ = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
const fmtINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Step ka rang / naam. receive: store me aaya ho (project nahi) to "Store me aaya".
const STEP = {
  mr:       { c: T.amb, bg: T.ambL, k: "mtrail.type_mr" },
  approval: { c: T.blu, bg: T.bluL, k: "mtrail.type_approval" },
  order:    { c: T.pur, bg: T.purL, k: "mtrail.type_order" },
  weigh:    { c: T.pur, bg: T.purL, k: "mtrail.type_weigh" },
  trip:     { c: T.pur, bg: T.purL, k: "mtrail.type_trip" },
  grn:      { c: T.grn, bg: T.grnL, k: "mtrail.type_grn" },
  issue:    { c: T.amb, bg: T.ambL, k: "mtrail.type_issue" },
  transfer: { c: T.blu, bg: T.bluL, k: "mtrail.type_transfer" },
  receive:  { c: T.grn, bg: T.grnL, k: "mtrail.type_receive" },
  use:      { c: T.t3,  bg: T.surfaceB, k: "mtrail.type_use" },
  bill:     { c: T.red, bg: T.redL, k: "mtrail.type_bill" },
};
// Step ka chhota icon (stroke, 24 ka box).
const ICON = {
  mr: "M9 4h6v3H9zM7 5H5v15h14V5h-2M8 11h8M8 15h5",
  approval: "M5 12l4 4 10-10",
  order: "M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M18 20h.01",
  weigh: "M12 4v16M5 20h14M6 8h12M6 8l-3 6h6zM18 8l-3 6h6z",
  trip: "M2 7h11v9H2zM13 10h4l4 3v3h-8M6 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z",
  grn: "M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9",
  issue: "M4 12h12M12 6l6 6-6 6M20 4v16",
  transfer: "M4 8h14l-4-4M20 16H6l4 4",
  receive: "M4 8l8-4 8 4v9l-8 4-8-4zM9 13l2 2 4-4",
  use: "M14 4l6 6-9 9H5v-6zM12 6l6 6",
  bill: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
};
const StepIcon = ({ type, color }) => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d={ICON[type] || ICON.use}/>
  </svg>
);
const PH_KINDS = ["challan", "rec_slip", "site", "material", "slip", "weigh_slip", "vehicle", "mr", "loading", "unloading", "used"];
const photoLabel = (k) => (PH_KINDS.includes(k) ? t("mtrail.ph_" + k) : t("mtrail.photo"));
const stepLabel = (s) => (s.type === "receive" && s.details?.store && !s.details?.project)
  ? t("mtrail.type_receive_store") : t((STEP[s.type] || STEP.use).k);
const STATUS_KEY = { approved: "mtrail.st_approved", rejected: "mtrail.st_rejected", pending: "mtrail.st_pending",
  cancelled: "mtrail.st_cancelled", received: "mtrail.st_received", completed: "mtrail.st_received", partial: "mtrail.st_partial",
  pendingapproval: "mtrail.st_pending" };
const statusText = (v) => (STATUS_KEY[String(v || "").toLowerCase()] ? t(STATUS_KEY[String(v).toLowerCase()]) : String(v || ""));

// Card ki 1–2 line: pehli = material + qty, doosri = baaki jaankari (sirf bhari
// hui), sub = trip ka unload (kab · kisne).
export function trailLines(s) {
  const d = s.details || {};
  const items = (d.items || []).map(i => [i.name, i.qty != null ? fmtQ(i.qty) + (i.unit ? " " + i.unit : "") : ""].filter(Boolean).join(" "));
  const kv = (k, v) => (v == null || v === "" ? null : t(k) + ": " + v);
  const kg = (v) => fmtQ(v) + " kg";
  const trip = s.type === "trip";
  const rest = [
    d.status ? statusText(d.status) : null,
    d.trip_no != null ? t("mtrail.d_trip_no", { n: d.trip_no }) : null, kv("mtrail.d_route", d.route),
    kv("mtrail.d_vendor", d.vendor), kv("mtrail.d_from", d.from), kv("mtrail.d_to", d.to),
    kv("mtrail.d_store", s.type === "receive" && !d.project ? null : d.store), kv("mtrail.d_project", d.project),
    kv("mtrail.d_task", d.task), kv("mtrail.d_issued_to", d.issued_to), kv("mtrail.d_custodian", d.custodian),
    kv(trip ? "mtrail.d_trip_driver" : "mtrail.d_driver", d.driver), kv("mtrail.d_po", s.type === "order" ? null : d.po_no), kv("mtrail.d_challan", d.challan),
    kv("mtrail.d_rec_slip", d.rec_slip), kv("mtrail.d_vehicle", trip && s.title === d.vehicle_no ? null : d.vehicle_no), kv("mtrail.d_weighbridge", d.weighbridge),
    d.gross_kg != null ? kv("mtrail.d_gross", kg(d.gross_kg)) : null, d.tare_kg != null ? kv("mtrail.d_tare", kg(d.tare_kg)) : null,
    d.net_kg != null ? kv("mtrail.d_net", kg(d.net_kg)) : null,
    d.expected ? kv("mtrail.d_expected", fmtDate(d.expected)) : null,
    d.amount != null ? kv("mtrail.d_amount", fmtINR(d.amount)) : null,
  ].filter(Boolean);
  const sub = d.unload_at ? t("mtrail.d_unload") + ": " + [darjWhen(d.unload_at), d.unload_by].filter(Boolean).join(" · ") : "";
  return { items: items.join(" · "), rest: rest.join(" · "), sub, note: d.note || "" };
}
// GRN sudhaar form me "Received by": purani / trip GRN me sirf user id — naam
// (server received_by_name) dikhe, id kabhi nahi.
const byShown = (g) => g.received_by_name || (/^[0-9]+$/.test(String(g.received_by ?? "").trim()) ? "" : String(g.received_by ?? ""));
// Kab: darj time (IST) — na ho to business date.
export const trailWhen = (s) => darjWhen(s.at) || (s.date ? fmtDate(s.date) : "");

export default function MaterialFlowDrawer({ grnId, trail, onClose, onChanged, isAdmin = true, onEditMR }) {
  const kind = trail?.kind || (grnId ? "grn" : null);
  const docId = trail?.id || grnId || null;
  const open = !!(kind && docId);
  const isGrn = kind === "grn";
  const mayIssue   = canEntry(["Procurement", "Material"]);
  const mayResolve = isAdmin && can("Procurement", "approve");
  const mayEditGrn = isAdmin && canAny(["Procurement", "Material"], "edit");
  const mayDelGrn  = isAdmin && can("Procurement", "delete");
  const mayEditMr  = isAdmin && can("Procurement", "edit");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(null);
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
  const [issuePhoto, setIssuePhoto] = useState("");
  const [issueSaving, setIssueSaving] = useState(false);

  const reload = () => {
    if (!open) return;
    setLoading(true); setErr("");
    const q = "kind=" + encodeURIComponent(kind) + "&id=" + encodeURIComponent(docId)
      + (trail?.material ? "&material=" + encodeURIComponent(trail.material) : "");
    api.get("/procurement/material-trail?" + q)
      .then((r) => {
        if (r?.success && r.data) setData(r.data);
        else setErr(r?.message || t("mtrail.load_fail"));
      })
      .catch((e) => setErr(e?.message || t("mtrail.load_fail")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) { setData(null); setGrnEditing(false); setGrnEditNote(""); setZoom(null); return; }
    setData(null); setZoom(null);
    reload();
  }, [kind, docId, trail?.material]); // eslint-disable-line react-hooks/exhaustive-deps

  const doc = data?.doc || null;
  // Reset edit form whenever GRN data loads
  useEffect(() => {
    if (doc?.grn) {
      const g = doc.grn;
      setGrnForm({
        vendor_name:   g.vendor_name || "",
        challan_no:    g.challan_no || "",
        received_date: g.received_date ? String(g.received_date).slice(0, 10) : "",
        // Purani / trip GRN me sirf user id — form me naam (server received_by_name);
        // na badla to wahi purana value wapas jaata hai (handleGrnSave).
        received_by:   byShown(g),
        items: (doc.items || []).map(it => ({
          id: it.id,
          description:  it.description || "",
          received_qty: it.received_qty != null ? String(it.received_qty) : "",
          unit:         it.unit || "",
        })),
      });
    }
  }, [doc]);

  const handleGrnSave = async () => {
    if (grnSaving) return;
    if (!grnEditNote.trim()) { setErr(t("material_flow.edit_reason_compulsory_hai_log_me")); return; }
    setGrnSaving(true); setErr("");
    try {
      const payload = {
        vendor_name:   grnForm.vendor_name?.trim() || null,
        challan_no:    grnForm.challan_no?.trim() || null,
        received_date: grnForm.received_date || null,
        received_by:   (() => {
          const v = grnForm.received_by?.trim() || "";
          const g = doc?.grn || {};
          return v === byShown(g) ? (g.received_by ?? null) : (v || null);
        })(),
        edit_note:     grnEditNote.trim(),
        items: (grnForm.items || []).map(it => ({
          id: it.id,
          description:  it.description?.trim() || null,
          received_qty: it.received_qty !== "" ? parseFloat(it.received_qty) : null,
          ordered_qty:  it.received_qty !== "" ? parseFloat(it.received_qty) : null,
          unit:         it.unit || null,
        })),
      };
      const res = await api.put("/procurement/grns/" + docId, payload);
      if (res?.success === false) { setErr(res.message || t("mtrail.save_fail")); setGrnSaving(false); return; }
      setGrnEditing(false); setGrnEditNote("");
      reload();
      onChanged && onChanged();
    } catch (e) { setErr(e?.message || t("mtrail.save_fail")); }
    setGrnSaving(false);
  };

  const handleRaiseIssue = async () => {
    if (issueSaving) return;
    if (!issueNote.trim()) { setErr(t("material_flow.issue_note_compulsory_hai")); return; }
    setIssueSaving(true); setErr("");
    try {
      const res = await api.post(`/procurement/grns/${docId}/issues`, {
        issue_type: issueType,
        note: issueNote.trim(),
        photo_url: issuePhoto || null,
      });
      if (res?.success === false) { setErr(res.message || t("mtrail.save_fail")); setIssueSaving(false); return; }
      setShowIssueForm(false); setIssueNote(""); setIssueType("Quality"); setIssuePhoto("");
      reload();
      onChanged && onChanged();
    } catch (e) { setErr(e?.message || t("mtrail.save_fail")); }
    setIssueSaving(false);
  };

  const handleResolveIssue = async (issueId) => {
    const note = await window.promptAsync(t("material_flow.resolution_note_kya_kiya_issue_solve"));
    if (note == null) return;
    try {
      const res = await api.patch(`/procurement/grns/issues/${issueId}/resolve`, { resolution_note: note });
      if (res?.success === false) { setErr(res.message || t("mtrail.save_fail")); return; }
      reload();
    } catch (e) { setErr(e?.message || t("mtrail.save_fail")); }
  };

  const handleGrnDelete = async () => {
    if (grnDeleting) return;
    const reason = await window.promptAsync(t("material_flow.delete_grn_reason_ask", { grn: doc?.grn?.grn_number || "" }));
    if (reason == null) return;
    if (reason.trim().length < 3) { setErr(t("material_flow.delete_reason_compulsory_hai")); return; }
    setGrnDeleting(true); setErr("");
    try {
      const res = await api.del("/procurement/grns/" + docId, { reason: reason.trim() });
      if (res?.success === false) { setErr(res.message || t("mtrail.save_fail")); setGrnDeleting(false); return; }
      onChanged && onChanged();
      onClose && onClose();
    } catch (e) { setErr(e?.message || t("mtrail.save_fail")); setGrnDeleting(false); }
  };

  if (!open) return null;

  const steps = data?.steps || [];
  const grn = doc?.grn || null;
  const grnGone = grn?.grn_type === "Cancelled";   // hatayi gayi site GRN — sudhaar / delete nahi
  const mr = doc?.mr || null;
  const issues = doc?.issues || [];
  const openIssueCount = issues.filter(i => i.status !== "Resolved").length;
  const hot = steps.find(s => s.highlight) || null;
  const hotItems = hot?.details?.items || [];
  const headItem = (data?.material ? hotItems.find(i => String(i.name || "").trim().toLowerCase() === data.material) : null) || hotItems[0] || null;
  const headName = headItem?.name;
  const headQty = headItem && headItem.qty != null ? fmtQ(headItem.qty) + (headItem.unit ? " " + headItem.unit : "") : "";
  const sum = data?.summary || null;

  return (
    <>
      <BackClose onClose={onClose}/>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1500, backdropFilter: "blur(2px)" }}/>
      <div data-testid="material-trail" style={{
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
                {t("mtrail.title")}{hot?.title ? " · " + hot.title : ""}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-.3px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {headName || t("common.material")}
                {headQty && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginLeft: 8, fontWeight: 600 }}>{headQty}</span>}
                {hotItems.length > 1 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginLeft: 6, fontWeight: 500 }}>{t("mtrail.more_items", { n: hotItems.length - 1 })}</span>}
              </div>
              {data && (
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {[hot?.details?.project || hot?.details?.store, t("mtrail.n_steps", { n: steps.length })].filter(Boolean).join(" · ")}
                </div>
              )}
              {/* Is receipt ka Aaya / Laga / Baaki (server summary — ek material, ek unit) */}
              {sum && (
                <div data-testid="trail-summary" style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
                  {[["mtrail.sum_in", sum.in], ["mtrail.sum_used", sum.used, sum.approx], ["mtrail.sum_left", sum.left]].map(([k, v, ap]) => (
                    <span key={k} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 12, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.7)" }}>
                      {t(k)} <b style={{ color: "#fff", fontWeight: 700 }}>{(ap ? "~" : "") + fmtQ(v)}{sum.unit ? " " + sum.unit : ""}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} aria-label={t("common.close")}
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: T.t4, fontSize: 13 }}>
              <div style={{ width: 28, height: 28, border: "3px solid #E2E8F0", borderTopColor: T.blu,
                borderRadius: "50%", animation: "matSpin 0.7s linear infinite", margin: "0 auto 10px" }}/>
             {t("mtrail.loading")}
            </div>
          )}
          {err && !loading && (
            <div style={{ padding: "10px 12px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 6, color: T.red, fontSize: 12, marginBottom: 10 }}>
              {err}
            </div>
          )}

          {/* GRN sudhaar — timeline ki jagah form */}
          {grn && grnEditing && (
            <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${T.grn}`, borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.grn }}>{t("material_flow.edit_grn_grn_number", { grn_number: grn.grn_number })}</span>
              </div>
              <div style={{ padding: "8px 10px", background: "#FFFBEB", border: `1px solid #FDE68A`, borderRadius: 7, marginBottom: 10 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 }}>
                 {t("material_flow.edit_reason")} <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>{t("material_flow.compulsory")}</span>
                </div>
                <textarea value={grnEditNote} onChange={e => setGrnEditNote(e.target.value)} rows={2}
                  placeholder={t("material_flow.e_g_vendor_naam_galat_tha")}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 5, border: `1.5px solid #FDE68A`, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", background: "#fff" }}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 3 }}>{t("material_flow.material_vendor")}</div>
                  <LibrarySelect type="supplier" value={grnForm.vendor_name}
                    onChange={v => setGrnForm(p => ({ ...p, vendor_name: v }))}/>
                </div>
                <FInput label={t("material_flow.challan_no")} value={grnForm.challan_no} onChange={v => setGrnForm(p => ({ ...p, challan_no: v }))}/>
                <FInput label={t("material_flow.received_on")} type="date" value={grnForm.received_date} onChange={v => setGrnForm(p => ({ ...p, received_date: v }))}/>
                <FInput label={t("common.received_by")} value={grnForm.received_by} onChange={v => setGrnForm(p => ({ ...p, received_by: v }))}/>
              </div>
              {(grnForm.items || []).map((it, idx) => (
                <div key={it.id || idx} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 80px 70px", gap: 6, marginBottom: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    {idx === 0 && <div style={{ fontSize: 9, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px", marginBottom: 3 }}>{t("common.material")}</div>}
                    <LibrarySelect type="material" value={it.description}
                      onChange={v => setGrnForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, description: v } : x) }))}/>
                  </div>
                  <FInput label={idx === 0 ? t("common.qty") : ""} type="number" value={it.received_qty}
                    onChange={v => setGrnForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, received_qty: v } : x) }))}/>
                  <FInput label={idx === 0 ? t("common.unit") : ""} value={it.unit}
                    onChange={v => setGrnForm(p => ({ ...p, items: p.items.map((x, i) => i === idx ? { ...x, unit: v } : x) }))}/>
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          {!loading && data && !grnEditing && (
            <>
              {steps.length === 0 && <div style={{ padding: "30px 0", textAlign: "center", color: T.t4, fontSize: 12 }}>{t("mtrail.empty")}</div>}
              {/* MR / Manzoori / Order nahi — khaali card ki jagah ek line */}
              {data.no_mr && (
                <div data-testid="trail-no-mr" style={{ fontSize: 11.5, color: T.t3, padding: "6px 10px", marginBottom: 10, background: T.surfaceB, border: `1px dashed ${T.b2}`, borderRadius: 7 }}>
                  {t(data.no_mr === "trip" ? "mtrail.no_mr_trip" : "mtrail.no_mr_direct")}
                </div>
              )}
              <div style={{ position: "relative" }}>
                {steps.map((s, i) => <TrailCard key={s.key} s={s} last={i === steps.length - 1} onZoom={setZoom}/>)}
              </div>
              {data.approx && <div style={{ fontSize: 11, color: T.t3, background: T.surfaceB, borderRadius: 7, padding: "8px 10px", marginTop: 6 }}>{t("mtrail.approx_note")}</div>}
              {!data.approx && steps.some(s => s.approx) && <div style={{ fontSize: 11, color: T.t3, background: T.surfaceB, borderRadius: 7, padding: "8px 10px", marginTop: 6 }}>{t("mtrail.approx_use_note")}</div>}
              {/* Purani GRN (MR se judi nahi) — server ka andaaza, sirf batane ko (MAT-09) */}
              {doc?.mr_guess && <div style={{ fontSize: 11, color: T.t3, background: T.ambL, borderRadius: 7, padding: "8px 10px", marginTop: 6 }}>
                {t("material_flow.possible_mr_not_linked", { mr: doc.mr_guess.mr_number || `MR-${doc.mr_guess.id}`, item: doc.mr_guess.item_name, qty: Number(doc.mr_guess.quantity), unit: doc.mr_guess.unit || "", date: fmtDate(String(doc.mr_guess.created_at || "").slice(0, 10)) })}
              </div>}
              {data.hidden > 0 && <div style={{ fontSize: 11, color: T.t3, background: T.surfaceB, borderRadius: 7, padding: "8px 10px", marginTop: 6 }}>{t("mtrail.hidden_note", { n: data.hidden })}</div>}
            </>
          )}

          {/* GRN ke apne kaam — sirf grn_entries se khola ho */}
          {!loading && isGrn && grn && !grnEditing && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Site GRN hatana (16 Oct 2026) — request + Admin password se approve */}
              <SiteGrnCancelBox grnId={grn.id} grnNo={grn.grn_number} onDone={() => { reload(); onChanged && onChanged(); }}/>

              {/* Issues Section — Quality / Short / Damaged / Wrong-Item / Other */}
              <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderLeft: `3px solid ${openIssueCount > 0 ? T.red : T.t3}`, borderRadius: 8, padding: "10px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: openIssueCount > 0 ? T.red : T.t3 }}>
                    {t("material_flow.issues_issues", { issues: issues.length > 0 ? "(" + t("mtrail.issues_count", { open: openIssueCount, total: issues.length }) + ")" : "" })}
                  </span>
                  <div style={{ flex: 1 }}/>
                  {!showIssueForm && mayIssue && (
                    <button onClick={() => setShowIssueForm(true)}
                      style={{ padding: "4px 10px", borderRadius: 5, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
                     {t("material_flow.create_issue")}
                    </button>
                  )}
                </div>

                {showIssueForm && (
                  <div style={{ padding: "10px", background: T.redL, border: `1px solid ${T.redM}`, borderRadius: 7, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
                      {ISSUE_TYPES.map(ty => (
                        <button key={ty} onClick={() => setIssueType(ty)}
                          style={{ padding: "4px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, cursor: "pointer", background: issueType === ty ? T.red : "white", color: issueType === ty ? "white" : T.red, border: `1px solid ${T.red}` }}>
                          {issueTypeLabel(ty)}
                        </button>
                      ))}
                    </div>
                    <textarea value={issueNote} onChange={e => setIssueNote(e.target.value)} autoFocus rows={2}
                      placeholder={t("material_flow.issue_describe_karo_kya_problem_hai")}
                      style={{ width: "100%", padding: "7px 9px", borderRadius: 5, border: `1.5px solid ${T.redM}`, fontSize: 11.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", marginBottom: 7, background: "white" }}/>
                    {/* Issue photo — proof of damage / quality problem */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "center" }}>
                      {issuePhoto ? (
                        <div style={{ position: "relative", width: 50, height: 50, borderRadius: 5, overflow: "hidden", border: `1px solid ${T.redM}` }}>
                          <img src={cld(issuePhoto, "thumb")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                          <button onClick={() => setIssuePhoto("")}
                            style={{ position: "absolute", top: 1, right: 1, width: 16, height: 16, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "white", border: "none", fontSize: 9, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
                        </div>
                      ) : (
                        <label style={{ width: 50, height: 50, borderRadius: 5, border: `1.5px dashed ${T.redM}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 9, color: T.red, fontWeight: 700, flexDirection: "column", gap: 1, background: "white" }}>
                          <span style={{ fontSize: 14 }}>📷</span>
                          <span>{t("common.add")}</span>
                          <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              uploadManager.add({
                                file, folder: "gb_buildcon/issues",
                                label: "Issue photo: " + file.name,
                                onDone: (url) => setIssuePhoto(url),
                              });
                              e.target.value = "";
                            }}/>
                        </label>
                      )}
                      <span style={{ fontSize: 10, color: T.t4, fontStyle: "italic" }}>
                        {issuePhoto ? t("material_flow.photo_attached_proof_of_issue") : t("material_flow.photo_lagao_optional_quality_damage_proof")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setShowIssueForm(false); setIssueNote(""); setErr(""); }} disabled={issueSaving}
                        style={{ flex: 1, padding: "6px", borderRadius: 5, background: "white", border: `1px solid ${T.b1}`, color: T.t3, fontSize: 11, fontWeight: 600, cursor: issueSaving ? "not-allowed" : "pointer" }}>
                       {t("common.cancel")}
                      </button>
                      <button onClick={handleRaiseIssue} disabled={issueSaving || !issueNote.trim()}
                        style={{ flex: 2, padding: "6px", borderRadius: 5, background: issueSaving || !issueNote.trim() ? "#9CA3AF" : T.red, border: "none", color: "white", fontSize: 11, fontWeight: 700, cursor: issueSaving || !issueNote.trim() ? "not-allowed" : "pointer" }}>
                        {issueSaving ? t("common.saving") : t("material_flow.raise_issue")}
                      </button>
                    </div>
                  </div>
                )}

                {issues.length === 0 && !showIssueForm && (
                  <div style={{ fontSize: 11, color: T.t4, fontStyle: "italic" }}>{t("material_flow.no_issues_raised_quality_ok")}</div>
                )}

                {issues.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {issues.map(iss => {
                      const resolved = iss.status === "Resolved";
                      return (
                        <div key={iss.id} style={{ padding: "7px 9px", background: resolved ? "#F1F5F9" : "#FEF2F2", borderRadius: 6, border: `1px solid ${resolved ? T.b1 : T.redM}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: resolved ? T.t3 : T.red, color: "white" }}>{issueTypeLabel(iss.issue_type)}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: resolved ? T.t3 : T.red, textTransform: "uppercase" }}>{resolved ? t("material_flow.resolved") : t("material_flow.open")}</span>
                            <div style={{ flex: 1 }}/>
                            <span style={{ fontSize: 10, color: T.t4 }}>{darjWhen(iss.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: T.t1, marginBottom: 4, wordBreak: "break-word" }}>{iss.note}</div>
                          {iss.photo_url && (
                            <img src={cld(iss.photo_url, "thumb")} alt={t("mtrail.photo")} onClick={() => setZoom(iss.photo_url)}
                              onError={e => { e.target.style.display = "none"; }}
                              style={{ display: "block", width: 80, height: 80, objectFit: "cover", borderRadius: 5, border: `1px solid ${resolved ? T.b1 : T.redM}`, marginBottom: 4, cursor: "zoom-in" }}/>
                          )}
                          {iss.raised_by_name && <div style={{ fontSize: 10.5, color: T.t3 }}>{t("material_flow.raised_by_iss", { iss: iss.raised_by_name })}</div>}
                          {resolved && (
                            <div style={{ marginTop: 4, padding: "5px 7px", background: "white", borderRadius: 4, border: `1px solid ${T.b1}` }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: T.grn, marginBottom: 2 }}>{t("material_flow.resolved_by_resolved_by_name_fmtdatetime", { resolved_by_name: iss.resolved_by_name || "—", fmtDateTime: darjWhen(iss.resolved_at) || "—" })}</div>
                              {iss.resolution_note && <div style={{ fontSize: 11, color: T.t2 }}>{iss.resolution_note}</div>}
                            </div>
                          )}
                          {!resolved && mayResolve && (
                            <button onClick={() => handleResolveIssue(iss.id)}
                              style={{ marginTop: 5, padding: "3px 9px", borderRadius: 4, background: T.grn, border: "none", color: "white", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                             {t("material_flow.mark_resolved")}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Activity Log — full kisne kya kab kiya trail */}
              {mr?.id && <ActivityLog entity_type="material_request" entity_id={mr.id} suffix={mr.mr_number || "MR"}/>}
              <ActivityLog entity_type="grn" entity_id={grn.id} suffix={grn.grn_number || "GRN"}/>
            </div>
          )}
        </div>

        {/* Footer — admin actions (sirf site / store ki grn_entries par) */}
        {!loading && isGrn && grn && ((!grnGone && (mayEditGrn || mayDelGrn)) || (mr && onEditMR && mayEditMr)) && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {grnEditing ? (
              <>
                <button onClick={() => { setGrnEditing(false); setGrnEditNote(""); setErr(""); }} disabled={grnSaving}
                  style={{ flex: 1, padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 12, fontWeight: 600, cursor: grnSaving ? "not-allowed" : "pointer" }}>
                 {t("common.cancel")}
                </button>
                <button onClick={handleGrnSave} disabled={grnSaving}
                  style={{ flex: 2, padding: "9px", borderRadius: 7, background: grnSaving ? "#9CA3AF" : T.grn, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: grnSaving ? "not-allowed" : "pointer" }}>
                  {grnSaving ? t("common.saving") : t("material_flow.save_grn")}
                </button>
              </>
            ) : (
              <>
                {mayEditGrn && !grnGone && <button onClick={() => setGrnEditing(true)}
                  style={{ padding: "9px 12px", borderRadius: 7, background: T.grnL, border: `1px solid ${T.grnM}`, color: T.grn, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                 {t("material_flow.edit_grn")}
                </button>}
                {mayDelGrn && !grnGone && <button onClick={handleGrnDelete} disabled={grnDeleting}
                  style={{ padding: "9px 12px", borderRadius: 7, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12, fontWeight: 700, cursor: grnDeleting ? "not-allowed" : "pointer" }}>
                  {grnDeleting ? t("common.deleting") : t("material_flow.delete_grn")}
                </button>}
                <div style={{ flex: 1 }}/>
                {mr && onEditMR && mayEditMr && (
                  <button onClick={() => onEditMR(mr)}
                    style={{ padding: "9px 14px", borderRadius: 7, background: T.blu, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                   {t("material_flow.edit_mr")}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {/* Photo bada — × ya Back se band (pehle band hi nahi hota tha) */}
      {zoom && <PhotoZoom url={zoom} onClose={() => setZoom(null)}/>}
      <style>{`
        @keyframes matFlowSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes matSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ── Ek step ka card (timeline par) ─────────────────────────────
// Line 1: icon + step + document no. … kab · kisne. Phir sirf bhari hui
// jaankari, phir photo (naam ke saath).
function TrailCard({ s, last, onZoom }) {
  const m = STEP[s.type] || STEP.use;
  const L = trailLines(s);
  const when = trailWhen(s);
  const meta = [when, s.by_name].filter(Boolean).join(" · ");
  return (
    <div data-testid={"trail-step-" + s.type} style={{ display: "flex", gap: 10, position: "relative" }}>
      {/* rail */}
      <div style={{ width: 14, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", marginTop: 13, background: s.highlight ? m.c : T.surface, border: `2px solid ${m.c}`, flexShrink: 0 }}/>
        {!last && <span style={{ flex: 1, width: 2, background: T.b1, marginTop: 2 }}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0, marginBottom: 10, background: s.highlight ? m.bg : T.surface, border: `1px solid ${s.highlight ? m.c : T.b1}`,
        borderRadius: 9, padding: "9px 12px", boxShadow: s.highlight ? "0 0 0 2px " + m.bg : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", rowGap: 3 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: m.bg, color: m.c, border: `1px solid ${m.c}22` }}>
            <StepIcon type={s.type} color={m.c}/>{stepLabel(s)}
          </span>
          {s.title && <span style={{ fontSize: 11, fontFamily: "monospace", color: T.t2, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>}
          {s.approx && <span title={t("mtrail.approx_use_note")} style={{ fontSize: 10, color: T.t4, fontWeight: 600 }}>{t("mtrail.approx_tag")}</span>}
          {s.highlight && <span style={{ fontSize: 10, fontWeight: 700, color: m.c }}>{t("mtrail.you_opened")}</span>}
          {meta && <span style={{ marginLeft: "auto", fontSize: 11, color: T.t3, whiteSpace: "nowrap" }}>{meta}</span>}
        </div>
        {L.items && <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1, marginTop: 5, wordBreak: "break-word" }}>{L.items}</div>}
        {L.rest && <div style={{ fontSize: 11.5, color: T.t2, marginTop: 2, wordBreak: "break-word", lineHeight: 1.45 }}>{L.rest}</div>}
        {L.sub && <div style={{ fontSize: 11.5, color: T.t2, marginTop: 2, wordBreak: "break-word" }}>{L.sub}</div>}
        {L.note && <div style={{ fontSize: 11, color: T.t3, marginTop: 2, fontStyle: "italic", wordBreak: "break-word" }}>{L.note}</div>}
        {s.photos?.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {s.photos.map((p, i) => (
              <figure key={i} style={{ margin: 0, width: 60 }}>
                <img src={cld(p.url, "thumb")} alt={photoLabel(p.kind)} onClick={() => onZoom(p.url)}
                  onError={e => { e.target.style.display = "none"; }}
                  style={{ display: "block", width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: `1px solid ${T.b1}`, cursor: "zoom-in" }}/>
                <figcaption style={{ fontSize: 9.5, color: T.t3, marginTop: 2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photoLabel(p.kind)}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoZoom({ url, onClose }) {
  return (
    <>
      <BackClose onClose={onClose}/>
      <div data-testid="trail-zoom" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={cld(url, "full")} alt={t("mtrail.photo")} style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}/>
        <button onClick={onClose} aria-label={t("common.close")}
          style={{ position: "absolute", top: 16, right: 16, width: 38, height: 38, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════
// Site GRN hatana (16 Oct 2026, Phase 2) — store wale "GRN hatao" jaisa.
// Vendor se site par aayi GRN par "GRN hatao" → wajah ke saath request (kuch
// nahi hilta); Admin / Procurement Approve tick wala Admin password se approve
// kare tabhi site stock, MR, PO wapas. Bhejne wala request wapas le sakta hai.
// Button server ke flag (GET /procurement/grns/:id/cancel-info) se.
// ════════════════════════════════════════════════════════════════
function SiteGrnCancelBox({ grnId, grnNo, onDone }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);       // request ka modal
  const [reason, setReason] = useState("");
  const [pw, setPw] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);          // { ok, txt }
  const load = () => {
    api.get(`/procurement/grns/${grnId}/cancel-info`)
      .then((r) => setInfo(r && r.success ? r.data : null))
      .catch(() => setInfo(null));
  };
  useEffect(() => { setOpen(false); setReason(""); setPw(""); setNote(""); setMsg(null); setInfo(null); if (grnId) load(); }, [grnId]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (url, body) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    const r = await api.post(url, body).catch(() => ({ success: false }));
    setBusy(false);
    if (r && r.success) { setOpen(false); setReason(""); setPw(""); setNote(""); setMsg({ ok: true, txt: r.message || "" }); load(); onDone && onDone(); }
    else setMsg({ ok: false, txt: (r && r.message) || t("site_grnc.fail") });
  };
  if (!info || (!info.cancelled && !info.cancellable)) return null;
  const rq = info.cancel_req && info.cancel_req.status === "pending" ? info.cancel_req : null;
  const last = info.cancel_req && !rq ? info.cancel_req : null;
  const send = () => {
    if (!reason.trim()) { setMsg({ ok: false, txt: t("site_grnc.need_reason") }); return; }
    run(`/procurement/grns/${grnId}/cancel-request`, { reason: reason.trim() });
  };
  const approve = () => {
    if (!pw) { setMsg({ ok: false, txt: t("site_grnc.need_pw") }); return; }
    run(`/procurement/site-grn-cancel-requests/${rq.id}/approve`, { password: pw });
  };
  const reject = () => {
    if (!note.trim()) { setMsg({ ok: false, txt: t("site_grnc.need_note") }); return; }
    run(`/procurement/site-grn-cancel-requests/${rq.id}/reject`, { note: note.trim() });
  };

  const inp = { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", fontFamily: "inherit" };
  const lbl = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", margin: "10px 0 4px" };
  const btn = (bg, fg, bd) => ({ padding: "8px 14px", borderRadius: 7, border: bd ? `1.5px solid ${bd}` : "none", background: bg, color: fg || "#fff", fontSize: 12.5, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 });
  const Msg = () => msg ? <div style={{ marginTop: 9, fontSize: 11.5, fontWeight: 600, color: msg.ok ? T.grn : T.red }}>{msg.txt}</div> : null;

  if (info.cancelled) {
    return (
      <div style={{ padding: "10px 12px", background: T.redL, borderRadius: 8, borderLeft: `3px solid ${T.red}` }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red }}>{t("site_grnc.cancelled_tag")} · {t("site_grnc.cancelled_box")}</div>
        <div style={{ fontSize: 11.5, color: T.t2, marginTop: 4 }}>{t("site_grnc.cancelled_line", { reason: info.cancel_reason || "—" })}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("site_grnc.cancelled_by", { name: info.cancelled_by || "—", date: fmtDate(info.cancelled_at) })}</div>
        {(info.cancelled_items || []).map((it, i) => (
          <div key={i} style={{ fontSize: 11, color: T.t3, marginTop: 2, textDecoration: "line-through" }}>{it.description} — {it.qty} {it.unit}</div>
        ))}
        <Msg/>
      </div>
    );
  }
  if (rq) {
    return (
      <div style={{ padding: "10px 12px", background: T.ambL, borderRadius: 8, borderLeft: `3px solid ${T.amb}` }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.amb }}>{t("site_grnc.pending_tag")}</div>
        <div style={{ fontSize: 11.5, color: T.t2, marginTop: 4 }}>{t("site_grnc.req_reason", { reason: rq.reason })}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t("site_grnc.req_by", { name: rq.by || "—", date: fmtDate(rq.at) })}</div>
        {info.can_approve && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.b2}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.t1 }}>{t("site_grnc.approve_title")}</div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 3 }}>{t("site_grnc.hint")}</div>
            <div style={lbl}>{t("site_grnc.pw")}</div>
            <input type="password" autoComplete="new-password" aria-label={t("site_grnc.pw")} value={pw} onChange={ev => setPw(ev.target.value)} style={inp}/>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}>
              <button onClick={approve} disabled={busy} style={btn(T.red)}>{t("site_grnc.approve_btn")}</button>
            </div>
            <div style={lbl}>{t("site_grnc.reject_note")}</div>
            <textarea rows={2} value={note} onChange={ev => setNote(ev.target.value)} style={{ ...inp, resize: "vertical" }}/>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}>
              <button onClick={reject} disabled={busy} style={btn(T.surface, T.t2, T.b2)}>{t("site_grnc.reject_btn")}</button>
            </div>
          </div>
        )}
        {rq.mine && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => run(`/procurement/site-grn-cancel-requests/${rq.id}/withdraw`, {})} disabled={busy} style={btn(T.surface, T.amb, T.amb)}>{t("site_grnc.withdraw")}</button>
          </div>
        )}
        <Msg/>
      </div>
    );
  }
  if (!info.can_request && !(last && last.status === "rejected") && !msg) return null;
  return (
    <div>
      {last && last.status === "rejected" && (
        <div style={{ fontSize: 11.5, color: T.t3, padding: "8px 10px", background: T.surfaceB, borderRadius: 7, marginBottom: 8 }}>
          {t("site_grnc.rejected_line", { note: last.note || "—", name: last.decided_by || "—" })}
        </div>
      )}
      {info.can_request && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => { setOpen(true); setMsg(null); }} style={btn(T.surface, T.red, T.red)}>{t("site_grnc.btn")}</button>
        </div>
      )}
      {!open && <Msg/>}
      {open && (
        <>
          <div onClick={() => !busy && setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1600 }}/>
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(420px,92vw)", background: T.surface, borderRadius: 12, zIndex: 1601, padding: "16px 18px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{t("site_grnc.title", { no: grnNo || "" })}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 5 }}>{t("site_grnc.hint")}</div>
            <div style={lbl}>{t("site_grnc.reason")}</div>
            <textarea rows={3} autoFocus value={reason} onChange={ev => setReason(ev.target.value)} placeholder={t("site_grnc.reason_ph")} style={{ ...inp, resize: "vertical" }}/>
            <Msg/>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button onClick={() => setOpen(false)} disabled={busy} style={btn(T.surface, T.t2, T.b2)}>{t("common.cancel")}</button>
              <button onClick={send} disabled={busy} style={btn(T.red)}>{t("site_grnc.send")}</button>
            </div>
          </div>
        </>
      )}
    </div>
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
