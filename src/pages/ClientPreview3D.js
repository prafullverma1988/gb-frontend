import { useState, useEffect } from "react";
import { API_BASE as DEFAULT_API_BASE } from "../config/api";
import { t } from "../i18n";

// Client 3D Preview Page — accessed via share link
// URL: /3d-preview/:id?token=xxxx
// No login required — public page

const T = {
  bg: "#0F172A", surface: "#1E293B", surfaceB: "#0F172A",
  t1: "#F1F5F9", t2: "#CBD5E1", t3: "#94A3B8", t4: "#64748B",
  b1: "#334155", grn: "#10B981", grnL: "#064E3B", grnM: "#065F46",
  amb: "#F59E0B", ambL: "#451A03", red: "#EF4444", redL: "#450A0A",
  blu: "#3B82F6", pur: "#8B5CF6",
};

export default function ClientPreview3D() {
  // Extract id and token from URL
  const pathParts = window.location.pathname.split("/");
  const drawingId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const [drawing, setDrawing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null); // "approve" | "revision"
  const [clientName, setClientName] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  // This page is opened by CLIENTS on their own networks, so it must not use
  // the raw *.up.railway.app host — some ISPs refuse that zone (config/api.js).
  const API_BASE = process.env.REACT_APP_API_URL || DEFAULT_API_BASE;

  useEffect(() => {
    if (!token) { setError(t("client_preview3_d.invalid_link_no_token")); setLoading(false); return; }
    fetch(`${API_BASE}/design/client-preview/${drawingId}?token=${token}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setDrawing(res.data);
        else setError(res.message || "Invalid or expired link");
        setLoading(false);
      })
      .catch(() => { setError(t("client_preview3_d.unable_to_load_check_your_internet")); setLoading(false); });
  }, [drawingId, token]);

  const handleSubmit = async () => {
    if (action === "revision" && !revisionNote.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/design/client-preview/${drawingId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, client_name: clientName, client_note: revisionNote || null })
      }).then(r => r.json());

      if (res.success) {
        setSubmitMsg(res.message);
        setSubmitted(true);
      } else {
        alert(res.message || "Something went wrong");
      }
    } catch { alert(t("common.network_error")); }
    setSubmitting(false);
  };

  // ── LOADING ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", color: T.t3 }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${T.b1}`, borderTop: `3px solid ${T.pur}`, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
        <div style={{ fontSize: 14 }}>{t("client_preview3_d.loading_3d_preview")}</div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // ── ERROR ──
  if (error) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#EF4444", marginBottom: 8 }}>{t("client_preview3_d.link_invalid_or_expired")}</div>
        <div style={{ fontSize: 14, color: T.t3, lineHeight: 1.6 }}>{error}<br />{t("client_preview3d.contact_team_new_link")}</div>
      </div>
    </div>
  );

  // ── SUBMITTED ──
  if (submitted) return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 440, padding: 40 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: action === "approve" ? "#064E3B" : "#451A03", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>
          {action === "approve" ? "✓" : "✎"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: action === "approve" ? T.grn : T.amb, marginBottom: 12 }}>
          {action === "approve" ? t("client_preview3_d.approved") : t("client_preview3_d.revision_requested")}
        </div>
        <div style={{ fontSize: 14, color: T.t2, lineHeight: 1.7, marginBottom: 24 }}>{submitMsg}</div>
        <div style={{ padding: "14px 20px", background: T.surface, borderRadius: 10, border: `1px solid ${T.b1}`, fontSize: 13, color: T.t3 }}>
         {t("client_preview3_d.the_team_has_been_notified_we")}
        </div>
      </div>
    </div>
  );

  const alreadyActed = drawing.client_status && drawing.client_status !== "Pending";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Segoe UI',sans-serif", color: T.t1 }}>
      {/* ── Top Bar ── */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.b1}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#2563EB)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"><path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{t("client_preview3_d.construction_manager")}</div>
            <div style={{ fontSize: 11, color: T.t4 }}>{t("client_preview3_d.3d_design_preview")}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.t4 }}>{t("client_preview3_d.confidential_for_client_review_only")}</div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        {/* ── Drawing Info ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: T.t1, margin: 0, marginBottom: 6 }}>{drawing.title}</h1>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: T.t3 }}>📁 {drawing.project_name}</span>
                <span style={{ fontSize: 12, color: T.t3 }}>🏗 {drawing.category}</span>
                <span style={{ fontSize: 12, color: T.t3 }}>📄 {drawing.current_version} · {drawing.file_size}</span>
                <span style={{ fontSize: 12, color: T.t3 }}>{t("client_preview3_d.by_uploaded_by_name", { uploaded_by_name: drawing.uploaded_by_name })}</span>
              </div>
            </div>
            {alreadyActed && (
              <div style={{ padding: "6px 14px", borderRadius: 20, background: drawing.client_status === "Approved" ? "#064E3B" : "#451A03", color: drawing.client_status === "Approved" ? T.grn : T.amb, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                {drawing.client_status === "Approved" ? t("client_preview3_d.you_approved_this") : t("client_preview3_d.revision_requested_2")}
              </div>
            )}
          </div>
          {drawing.note && (
            <div style={{ padding: "10px 14px", background: T.surface, borderRadius: 8, border: `1px solid ${T.b1}`, fontSize: 13, color: T.t2, lineHeight: 1.6 }}>
              <span style={{ color: T.t4, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: 4 }}>{t("client_preview3_d.designer_note")}</span>
              {drawing.note}
            </div>
          )}
        </div>

        {/* ── 3D Render Preview ── */}
        <div style={{ background: "linear-gradient(135deg,#0F172A 0%,#1E293B 50%,#0F2040 100%)", borderRadius: 16, border: `1px solid ${T.b1}`, overflow: "hidden", marginBottom: 24, position: "relative", minHeight: 380 }}>
          {/* Grid bg */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
          {drawing.file_url ? (
            <img src={drawing.file_url} alt={drawing.title}
              style={{ width: "100%", height: "100%", objectFit: "contain", position: "relative", zIndex: 1, minHeight: 380 }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 380, flexDirection: "column", gap: 16, position: "relative", zIndex: 1 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.8)" strokeWidth={1.2} strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>{drawing.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{t("client_preview3_d.3d_render_current_version_file_size", { current_version: drawing.current_version, file_size: drawing.file_size })}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 12, padding: "8px 16px", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
                 {t("client_preview3_d.file_preview_will_appear_here_once")}
                </div>
              </div>
            </div>
          )}
          {/* Version badge */}
          <div style={{ position: "absolute", bottom: 14, right: 14, background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600, zIndex: 2 }}>
            {drawing.current_version} · {drawing.category} 3D
          </div>
        </div>

        {/* ── Previous Response (if acted) ── */}
        {alreadyActed && drawing.client_note && (
          <div style={{ padding: "14px 16px", background: drawing.client_status === "Approved" ? T.grnL : T.ambL, borderRadius: 10, border: `1px solid ${drawing.client_status === "Approved" ? T.grnM : T.amb}30`, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: drawing.client_status === "Approved" ? T.grn : T.amb, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 5 }}>{t("client_preview3_d.your_previous_response")}</div>
            <div style={{ fontSize: 13, color: T.t2 }}>{drawing.client_note}</div>
          </div>
        )}

        {/* ── Client Name Input ── */}
        <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.b1}`, padding: "20px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>{t("client_preview3_d.your_name")}</div>
          <input value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder={t("client_preview3_d.enter_your_name_optional")}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${T.b1}`, background: T.bg, color: T.t1, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            onFocus={e => e.target.style.borderColor = T.pur}
            onBlur={e => e.target.style.borderColor = T.b1} />
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ background: T.surface, borderRadius: 12, border: `1px solid ${T.b1}`, padding: "20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 4 }}>
            {alreadyActed ? t("client_preview3_d.update_your_response") : t("client_preview3_d.your_approval_decision")}
          </div>
          <div style={{ fontSize: 12, color: T.t4, marginBottom: 16 }}>
           {t("client_preview3_d.review_the_3d_render_above_and")}
          </div>

          {/* Approve / Revision selection */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <button onClick={() => setAction(action === "approve" ? null : "approve")}
              style={{ padding: "14px", borderRadius: 10, border: `2px solid ${action === "approve" ? T.grn : T.b1}`, background: action === "approve" ? T.grnL : T.bg, color: action === "approve" ? T.grn : T.t3, cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
              <span style={{ fontSize: 20 }}>✓</span>
             {t("client_preview3_d.looks_good_approve")}
            </button>
            <button onClick={() => setAction(action === "revision" ? null : "revision")}
              style={{ padding: "14px", borderRadius: 10, border: `2px solid ${action === "revision" ? T.amb : T.b1}`, background: action === "revision" ? T.ambL : T.bg, color: action === "revision" ? T.amb : T.t3, cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
              <span style={{ fontSize: 18 }}>✎</span>
             {t("client_preview3_d.request_changes")}
            </button>
          </div>

          {/* Revision note */}
          {action === "revision" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.amb, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
               {t("client_preview3_d.what_changes_do_you_want")}
              </div>
              <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)}
                placeholder={t("client_preview3_d.e_g_please_change_the_exterior")}
                rows={4}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${T.amb}`, background: T.bg, color: T.t1, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", lineHeight: 1.6 }}
              />
              {!revisionNote.trim() && <div style={{ fontSize: 11.5, color: T.amb, marginTop: 4 }}>{t("client_preview3_d.please_describe_the_changes_you_want")}</div>}
            </div>
          )}

          {/* Approve note */}
          {action === "approve" && (
            <div style={{ padding: "12px 14px", background: "#064E3B", borderRadius: 8, border: `1px solid ${T.grnM}30`, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: T.grn, lineHeight: 1.6 }}>
               {t("client_preview3_d.you_are_approving_this_3d_render")}
              </div>
            </div>
          )}

          {/* Submit button */}
          {action && (
            <button onClick={handleSubmit} disabled={submitting || (action === "revision" && !revisionNote.trim())}
              style={{ width: "100%", padding: "14px", borderRadius: 10, background: submitting ? T.b1 : action === "approve" ? "#10B981" : T.amb, color: submitting ? T.t4 : "white", fontSize: 15, fontWeight: 800, border: "none", cursor: submitting || (action === "revision" && !revisionNote.trim()) ? "not-allowed" : "pointer", letterSpacing: "0.3px", transition: "all 0.2s" }}>
              {submitting ? t("common.submitting_2") : action === "approve" ? t("client_preview3_d.confirm_approval") : t("client_preview3_d.submit_revision_request")}
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0", color: T.t4, fontSize: 12 }}>
         {t("client_preview3_d.powered_by")} <strong style={{ color: T.t3 }}>{t("client_preview3_d.construction_manager")}</strong> {t("client_preview3_d.construction_management_platform")}
        </div>
      </div>
    </div>
  );
}
