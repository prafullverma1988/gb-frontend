// ── DESIGN OVERVIEW DRAWER ──────────────────────────────────────────
// Company-wide view of ALL lead-linked design requests across CRM.
// Shows status buckets: Awaiting Drawing | Awaiting Approval | Approved
//                       | Needs Revision | Rejected
// Filterable via top chips + searchable by lead name / title.
//
// Usage:
//   <DesignOverviewDrawer open={open} onClose={()=>setOpen(false)}
//      onOpenLead={(leadId)=>...}  // optional — jump to lead
//      onShareClick={(target)=>...}/>

import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../config/api";
import { Credit, fmtTimeAgo } from "./Credit";
import RevisionNoteModal from "./RevisionNoteModal";
import { t } from "../i18n";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  blu: "#2563EB", bluL: "#EFF6FF", bluM: "#BFDBFE",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  amb: "#D97706", ambL: "#FFFBEB", ambM: "#FDE68A",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  pur: "#7C3AED", purL: "#F5F3FF", purM: "#DDD6FE",
};

const BUCKETS = [
  { id: "awaiting_drawing",  get label() { return t("design_overview.awaiting_drawing"); },  short: "Pending Upload",  c: T.amb, bg: T.ambL, brd: T.ambM, ic: "⏳" },
  { id: "awaiting_approval", get label() { return t("design_overview.awaiting_approval"); }, short: "For Approval",    c: T.blu, bg: T.bluL, brd: T.bluM, ic: "👀" },
  { id: "approved",          get label() { return t("common.approved"); },          short: "Approved",        c: T.grn, bg: T.grnL, brd: T.grnM, ic: "✓" },
  { id: "revision",          get label() { return t("design_overview.needs_revision"); },    short: "Revision",        c: T.pur, bg: T.purL, brd: T.purM, ic: "↻" },
  { id: "rejected",          get label() { return t("common.rejected"); },          short: "Rejected",        c: T.red, bg: T.redL, brd: T.redM, ic: "✕" },
];

export default function DesignOverviewDrawer({ open, onClose, onOpenLead, onShareClick }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/design/leads-overview");
      if (r.success && Array.isArray(r.data)) setRows(r.data);
    } catch (e) { console.error("Design overview load:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Counts per bucket
  const counts = useMemo(() => {
    const c = { all: rows.length };
    BUCKETS.forEach(b => { c[b.id] = rows.filter(r => r.bucket === b.id).length; });
    return c;
  }, [rows]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filter !== "all" && r.bucket !== filter) return false;
      if (!q) return true;
      return (r.lead_name || "").toLowerCase().includes(q)
          || (r.title || "").toLowerCase().includes(q)
          || (r.lead_phone || "").includes(q);
    });
  }, [rows, filter, search]);

  if (!open) return null;

  return (
    <>
      <div 
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 600, backdropFilter: "blur(2px)" }}/>
      <div style={{ position: "fixed", top: 0, right: 0, height: "100vh", width: "min(560px, 100vw)",
        background: T.surface, zIndex: 601, display: "flex", flexDirection: "column",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.18)", animation: "slideL .25s ease",
        fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* Header */}
        <div style={{ background: "#0D1B2A", padding: "16px 20px", color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                {t("design_overview.design_status")}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
                {t("design_overview.all_lead_design_requests_across_crm")}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>

          {/* Search */}
          <div style={{ marginTop: 12, position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("design_overview.search_lead_name_phone_or_title")}
              style={{ width: "100%", height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.1)", fontSize: 12, color: "#fff", outline: "none", boxSizing: "border-box" }}/>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, flexShrink: 0,
          display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          <Chip active={filter === "all"} onClick={() => setFilter("all")}
            label={t("common.all")} count={counts.all} c={T.t2} bg={T.surface} brd={T.b1}/>
          {BUCKETS.map(b => (
            <Chip key={b.id} active={filter === b.id} onClick={() => setFilter(b.id)}
              label={b.short} count={counts[b.id] || 0}
              c={b.c} bg={b.bg} brd={b.brd}/>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 18px" }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: T.t3, fontSize: 12.5 }}>
              <div style={{ width: 28, height: 28, border: "3px solid #E2E8F0", borderTopColor: T.blu,
                borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 10px" }}/>
              {t("common.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: T.t4, fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
              <div style={{ fontWeight: 600, color: T.t2, marginBottom: 4 }}>
                {filter === "all" ? t("common.no_design_requests_yet") : t("design_overview.nothing_in_this_bucket")}
              </div>
              <div style={{ fontSize: 11.5 }}>
                {t("design_overview.open_any_lead_design_plan_to")}
              </div>
            </div>
          ) : (
            filtered.map(r => (
              <RequestCard key={r.id} r={r}
                onOpenLead={onOpenLead}
                onShareClick={onShareClick}
                onClose={onClose}/>
            ))
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideL { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

function Chip({ active, onClick, label, count, c, bg, brd }) {
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px",
        borderRadius: 999, border: `1.5px solid ${active ? c : brd}`, background: active ? bg : T.surface,
        color: active ? c : T.t3, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
        whiteSpace: "nowrap", flexShrink: 0 }}>
      {label}
      <span style={{ background: active ? c : T.b1, color: active ? "#fff" : T.t3,
        fontSize: 9.5, fontWeight: 800, padding: "1px 6px", borderRadius: 999, minWidth: 16, textAlign: "center" }}>
        {count}
      </span>
    </button>
  );
}

function RequestCard({ r: initial, onOpenLead, onShareClick, onClose }) {
  const [r, setR] = useState(initial);
  useEffect(() => { setR(initial); }, [initial]);
  const meta = BUCKETS.find(b => b.id === r.bucket) || BUCKETS[0];
  const hasDrawing = !!r.drawing_id;
  const [acting, setActing] = useState(null);
  const [revModalStatus, setRevModalStatus] = useState(null); // 'Revision' | 'Rejected'

  // Drawing client-status actions (same flow as Design module + CRM Lead drawer)
  // Approved fires immediately; Revision/Rejected opens RevisionNoteModal.
  const sendClientStatus = async (status, payload = {}) => {
    if (!r.drawing_id) return;
    setActing(status);
    try {
      const res = await api.patch(`/design/drawings/${r.drawing_id}/client-status`, {
        client_status: status,
        client_note: payload.note || null,
        attachments: payload.attachments || [],
      });
      if (res?.success) {
        setR(p => ({
          ...p,
          client_status: status === "Revision" ? null : status,
          client_note: payload.note || p.client_note,
          drawing_status: status === "Revision" ? "Revision" : p.drawing_status,
          bucket: status === "Revision" ? "revision" : (status === "Rejected" ? "rejected" : p.bucket),
        }));
      }
    } catch (_) {}
    setActing(null);
    setRevModalStatus(null);
  };
  const patchClientStatus = (status) => {
    if (!r.drawing_id) return;
    if (status === "Approved") return sendClientStatus(status);
    setRevModalStatus(status);
  };
  const markShared = async () => {
    if (!r.drawing_id) return;
    setActing("marking");
    try {
      const res = await api.patch(`/design/drawings/${r.drawing_id}/mark-shared`, {});
      if (res?.success) setR(p => ({ ...p, client_status: "SharedWithClient", client_shared_at: new Date().toISOString() }));
    } catch (_) {}
    setActing(null);
  };

  // Stage progression (1-5)
  const ds = r.drawing_status || "Pending";
  const cs = r.client_status;
  let stage = 1;
  if (hasDrawing) {
    stage = 2;
    if (ds === "Approved" && (!cs || cs === "PendingShare")) stage = 3;
    if (cs === "SharedWithClient") stage = 4;
    if (cs === "Approved" || cs === "Rejected") stage = 5;
  }
  const stageLbl = ["", "Requested", "Internal Review", "Ready to Share", "Awaiting Reply", "Client Decided"][stage] || "";
  const isAdminApproved = ds === "Approved";
  const isApproved  = cs === "Approved";
  const isRejected  = cs === "Rejected";
  const isShared    = cs === "SharedWithClient";
  const isReadyToShare = isAdminApproved && (cs === "PendingShare" || !cs);
  const stageColor = isRejected ? T.red : isApproved ? T.grn : T.blu;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10,
      padding: "12px 14px", marginBottom: 9, borderLeft: `3px solid ${meta.c}` }}>

      {/* Top row: status pill + lead name */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t1, marginBottom: 2,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.title || t("design_overview.untitled")}
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, color: T.t2 }}>👤 {r.lead_name || t("design_overview.unknown_lead")}</span>
            {r.lead_city && <span>· {r.lead_city}</span>}
            {r.category && <span>· {r.category}</span>}
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
          borderRadius: 999, background: meta.bg, border: `1px solid ${meta.brd}`,
          color: meta.c, fontSize: 9.5, fontWeight: 800, letterSpacing: ".4px",
          whiteSpace: "nowrap", flexShrink: 0 }}>
          <span>{meta.ic}</span>{meta.label.toUpperCase()}
        </span>
      </div>

      {/* 5-step stage strip */}
      {hasDrawing && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          {[1,2,3,4,5].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= stage ? stageColor : T.b1 }} />
          ))}
          <span style={{ fontSize: 9.5, fontWeight: 700, color: stageColor, marginLeft: 6, letterSpacing: ".3px", whiteSpace: "nowrap" }}>
            {stage}/5 · {stageLbl}
          </span>
        </div>
      )}

      {/* Drawing thumbnail row (if uploaded) */}
      {hasDrawing && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
          background: T.surfaceB, borderRadius: 8, marginBottom: 8 }}>
          <DrawingThumb url={r.drawing_url}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.t2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {r.drawing_title || r.title}
            </div>
            <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>
              v{r.current_version || 1} · {r.drawing_size || "—"}
            </div>
          </div>
          {r.drawing_url && (
            <a href={r.drawing_url} target="_blank" rel="noreferrer"
              style={{ padding: "4px 9px", borderRadius: 5, background: T.surface, border: `1px solid ${T.b1}`, color: T.blu, fontSize: 10.5, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
              {t("common.view")}
            </a>
          )}
        </div>
      )}

      {/* Stage-specific info banner */}
      {hasDrawing && !isAdminApproved && ds === "Pending" && (
        <div style={{ padding: "5px 9px", background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 5, fontSize: 10.5, color: T.t3, marginBottom: 8 }}>
          🔒 <b style={{ color: T.t2 }}>{t("common.awaiting_admin_approval")}</b> {t("design_overview.internal_review_pending")}
        </div>
      )}
      {hasDrawing && ds === "Revision" && (
        <div style={{ padding: "5px 9px", background: T.ambL, borderLeft: `3px solid ${T.amb}`, borderRadius: 4, fontSize: 10.5, color: T.amb, marginBottom: 8 }}>
          ↻ <b>{t("design_overview.revision_requested")}</b>{r.drawing_note ? ` — "${r.drawing_note}"` : ""}
        </div>
      )}
      {hasDrawing && isAdminApproved && (() => {
        const csMeta = cs === "Approved" ? { label: t("design_overview.client_approved"), c: T.grn, bg: T.grnL, brd: T.grnM }
                    : cs === "Rejected" ? { label: t("design_overview.client_rejected"), c: T.red, bg: T.redL, brd: T.redM }
                    : cs === "SharedWithClient" ? { label: t("design_overview.shared_awaiting_reply"), c: T.blu, bg: T.bluL, brd: T.bluM }
                    : { label: t("design_overview.ready_to_share_with_client"), c: T.grn, bg: T.grnL, brd: T.grnM };
        return <div style={{ display: "inline-flex", padding: "3px 9px", borderRadius: 11, background: csMeta.bg, color: csMeta.c, border: `1px solid ${csMeta.brd}`, fontSize: 9.5, fontWeight: 700, letterSpacing: ".3px", marginBottom: 7 }}>{csMeta.label}</div>;
      })()}
      {r.client_note && (cs === "Rejected" || cs === "SharedWithClient") && (
        <div style={{ fontSize: 10.5, color: T.t2, padding: "5px 9px", background: T.surfaceB, borderRadius: 5, marginBottom: 7, fontStyle: "italic", borderLeft: `3px solid ${cs === "Rejected" ? T.red : T.amb}` }}>
          "{r.client_note}"
        </div>
      )}

      {/* Client approval action buttons (only after admin approval) */}
      {isAdminApproved && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {isReadyToShare && (<>
            <button onClick={() => onShareClick && onShareClick({ drawing_id: r.drawing_id, drawing_title: r.drawing_title || r.title, drawing_url: r.drawing_url, current_version: r.current_version, lead_id: r.lead_id, lead_name: r.lead_name, lead_phone: r.lead_phone })}
              style={{ padding: "5px 10px", borderRadius: 5, background: "#25D366", color: "white", border: "none", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
              {t("common.share_on_whatsapp")}
            </button>
            <button onClick={markShared} disabled={acting==="marking"}
              style={{ padding: "5px 10px", borderRadius: 5, background: T.bluL, color: T.blu, border: `1px solid ${T.bluM}`, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
              {acting==="marking" ? "…" : t("common.mark_as_shared")}
            </button>
          </>)}
          {isShared && (<>
            <button onClick={() => patchClientStatus("Approved")} disabled={!!acting}
              style={{ padding: "5px 10px", borderRadius: 5, background: T.grn, border: "none", color: "white", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
              {acting==="Approved" ? "…" : t("common.client_approved")}
            </button>
            <button onClick={() => patchClientStatus("Revision")} disabled={!!acting}
              style={{ padding: "5px 10px", borderRadius: 5, background: T.ambL, border: `1px solid ${T.ambM}`, color: T.amb, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
              {t("design_overview.revision")}
            </button>
            <button onClick={() => patchClientStatus("Rejected")} disabled={!!acting}
              style={{ padding: "5px 10px", borderRadius: 5, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>
              {t("common.rejected_2")}
            </button>
            <button onClick={() => onShareClick && onShareClick({ drawing_id: r.drawing_id, drawing_title: r.drawing_title || r.title, drawing_url: r.drawing_url, current_version: r.current_version, lead_id: r.lead_id, lead_name: r.lead_name, lead_phone: r.lead_phone })}
              style={{ padding: "5px 10px", borderRadius: 5, background: T.surface, border: `1px solid ${T.b2}`, color: T.t3, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
              {t("common.re_share")}
            </button>
          </>)}
          {(isApproved || isRejected) && (
            <button onClick={() => onShareClick && onShareClick({ drawing_id: r.drawing_id, drawing_title: r.drawing_title || r.title, drawing_url: r.drawing_url, current_version: r.current_version, lead_id: r.lead_id, lead_name: r.lead_name, lead_phone: r.lead_phone })}
              style={{ padding: "5px 10px", borderRadius: 5, background: T.surface, border: `1px solid ${T.b1}`, color: T.t3, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}>
              {t("common.re_share")}
            </button>
          )}
        </div>
      )}

      {/* Footer row: requested by + view lead */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Credit name={r.requested_by} ts={r.created_at} verb="Requested by" size={18}/>
        </div>
        {onOpenLead && r.lead_id && (
          <button onClick={() => { onOpenLead(r.lead_id); onClose && onClose(); }}
            style={{ padding: "5px 11px", borderRadius: 6, background: T.surfaceB, color: T.t2,
              border: `1px solid ${T.b1}`, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            {t("design_overview.view_lead")}
          </button>
        )}
      </div>
      {revModalStatus && <RevisionNoteModal
        mode={revModalStatus}
        drawingTitle={r.drawing_title || r.title}
        onCancel={()=>setRevModalStatus(null)}
        onSubmit={({note, attachments})=>sendClientStatus(revModalStatus, {note, attachments})}/>}
    </div>
  );
}

function DrawingThumb({ url }) {
  const isImage = url && /\.(jpe?g|png|gif|webp|svg)$/i.test(url);
  if (isImage) {
    return <img src={url} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: `1px solid ${T.b1}` }}/>;
  }
  return (
    <div style={{ width: 44, height: 44, borderRadius: 6, background: T.bluL, display: "flex",
      alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18, border: `1px solid ${T.bluM}` }}>📄</div>
  );
}
