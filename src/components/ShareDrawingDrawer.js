// ── SHARE DRAWING DRAWER ────────────────────────────────────────────
// Generate public link + WhatsApp share for a drawing.
//
// Usage:
//   <ShareDrawingDrawer
//     target={{ drawing_id, drawing_title, lead_id, lead_name, lead_phone }}
//     onClose={...}
//   />

import { useState, useEffect, useCallback } from "react";
import api from "../config/api";
import { Credit } from "./Credit";
import { t } from "../i18n";

const T = {
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
  red: "#DC2626",
  redL: "#FEF2F2",
  redM: "#FECACA",
  wa: "#25D366",
};

const PUBLIC_BASE = (typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname))
  ? window.location.origin
  : "https://gb-frontend-xi.vercel.app"; // production base

export default function ShareDrawingDrawer({ target, onClose, onShared }) {
  const open = !!target;
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Share mode + message state (mirrors Design module's WhatsAppShareModal)
  const [shareMode, setShareMode] = useState("link"); // 'link' | 'pdf'
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState("");

  const drawingId = target?.drawing_id;
  const leadId = target?.lead_id;
  const fileUrl = target?.drawing_url || "";

  const loadShares = useCallback(async () => {
    if (!drawingId) return;
    setLoading(true);
    try {
      const r = await api.get(`/design/drawings/${drawingId}/shares`);
      if (r.success && Array.isArray(r.data)) setShares(r.data);
    } catch (e) {/* graceful */}
    setLoading(false);
  }, [drawingId]);

  // On open: build initial message + try to get-or-create the public share link
  useEffect(() => {
    if (!open) return;
    loadShares();
    // Auto-fill phone from lead
    setPhone((target?.lead_phone || "").replace(/[^\d+]/g, ""));
    // Get-or-create the public link upfront so it can be embedded in the message
    (async () => {
      try {
        const r = await api.post(`/design/drawings/${drawingId}/share`, {
          channel: "link", shared_to: null, lead_id: leadId || null,
        });
        if (r?.success && r.data?.share_token) {
          const url = `${PUBLIC_BASE}/d/${r.data.share_token}`;
          setPublicShareUrl(url);
          const name = target?.lead_name ? ` ${target.lead_name} ji` : "";
          const ttl  = target?.drawing_title || "Drawing";
          const ver  = target?.current_version || "v1";
          setMsg(
            `Namaste${name},\n\n`+
            `${ttl} (${ver}) drawing ready hai. Kripya review karke approval/changes batayein:\n\n`+
            `${url}\n\nThanks,\nGB Buildcon team`
          );
        }
      } catch (_) {}
    })();
  }, [open, drawingId, leadId, loadShares, target]);

  const buildPublicUrl = (token) => `${PUBLIC_BASE}/d/${token}`;

  // Open WhatsApp with current phone + message
  const openWhatsApp = async () => {
    // Re-log share record (for history view)
    try {
      await api.post(`/design/drawings/${drawingId}/share`, {
        channel: "whatsapp", shared_to: phone || null, lead_id: leadId || null,
      });
      loadShares();
    } catch (_) {}
    const cleaned = (phone || "").replace(/[^\d]/g, "");
    const url = cleaned
      ? `https://wa.me/${cleaned.startsWith("91")||cleaned.length>10?cleaned:"91"+cleaned}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!publicShareUrl) return;
    try {
      await navigator.clipboard.writeText(publicShareUrl);
      window.toast?.success("Link copied to clipboard");
    } catch {
      await window.promptAsync(t("share_drawing.copy_this_link"), publicShareUrl);
    }
  };

  // Download the underlying PDF (forces download via blob)
  const downloadPdf = async () => {
    if (!fileUrl) { alert(t("share_drawing.pdf_link_not_available")); return; }
    setDownloading(true);
    try {
      const r = await fetch(fileUrl);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ttl = target?.drawing_title || "drawing";
      const ver = target?.current_version || "v1";
      a.download = `${ttl} ${ver}.pdf`.replace(/[^\w\s.-]/g, "_");
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      window.open(fileUrl, "_blank", "noopener");
    }
    setDownloading(false);
  };

  // Mark the drawing as shared (flip client_status='SharedWithClient')
  const markShared = async () => {
    setGenerating(true);
    try {
      const r = await api.patch(`/design/drawings/${drawingId}/mark-shared`, {});
      if (r?.success) {
        window.toast?.success("Marked as shared");
        onShared?.();
        onClose();
      }
    } catch (_) {}
    setGenerating(false);
  };

  if (!open) return null;

  return (
    <>
      <style>{`@keyframes gbShareSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 250 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 480, maxWidth: "95vw",
        background: T.surface, boxShadow: "-8px 0 30px rgba(0,0,0,0.18)", zIndex: 251,
        display: "flex", flexDirection: "column", animation: "gbShareSlide .25s ease-out",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "13px 16px", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "white", display: "flex", alignItems: "center", gap: 6 }}>
             {t("share_drawing.share_drawing")}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {target?.drawing_title || t("common.drawing")}{target?.lead_name && ` · with ${target.lead_name}`}
            </div>
          </div>
          <button onClick={onClose} title={t("common.close")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 6, borderRadius: 6, display: "flex" }}
            onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={el => el.currentTarget.style.background = "none"}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          {/* Share Mode toggle — Link vs PDF + Link */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>{t("share_drawing.share_as")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { v: "link", l: t("share_drawing.link"), sub: t("share_drawing.public_link_in_message") },
                { v: "pdf",  l: t("share_drawing.pdf_link"), sub: t("share_drawing.download_pdf_send_link") },
              ].map(o => {
                const sel = shareMode === o.v;
                return (
                  <button key={o.v} type="button" onClick={() => setShareMode(o.v)}
                    style={{ padding: "9px 11px", borderRadius: 8, border: `1.5px solid ${sel?"#075E54":T.b1}`, background: sel?"#E8FDF1":T.surface, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: sel?"#075E54":T.t1 }}>{o.l}</div>
                    <div style={{ fontSize: 10, color: T.t4, marginTop: 2 }}>{o.sub}</div>
                  </button>
                );
              })}
            </div>
            {shareMode === "pdf" && (
              <div style={{ marginTop: 7, padding: "6px 10px", fontSize: 10.5, color: T.amb, background: T.ambL, border: `1px solid ${T.ambL}`, borderRadius: 6, lineHeight: 1.4 }}>
               {t("share_drawing.link_message_me_already_hai_pdf")}
              </div>
            )}
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 5 }}>{t("share_drawing.client_phone_target", { target: target?.lead_phone ? "(auto-filled)" : "(enter manually)" })}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder={t("share_drawing.e_g_919876543210_with_country_code")}
              style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{t("share_drawing.country_code_zaroori_e_g_91")}</div>
          </div>

          {/* Editable message */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
             {t("share_drawing.message_editable")}
            </label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={8}
              placeholder={publicShareUrl ? "" : t("share_drawing.generating_public_link")}
              style={{ width: "100%", padding: "10px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`, fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }} />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {shareMode === "pdf" && (
              <button onClick={downloadPdf} disabled={downloading || !fileUrl}
                style={{ flex: "1 1 130px", padding: "9px", borderRadius: 7, background: "#7C3AED", border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: (downloading || !fileUrl) ? "not-allowed" : "pointer", opacity: (downloading || !fileUrl) ? 0.6 : 1 }}>
                {downloading ? t("share_drawing.downloading") : t("common.download_pdf")}
              </button>
            )}
            <button onClick={openWhatsApp} disabled={!msg.trim()}
              style={{ flex: "1 1 130px", padding: "9px", borderRadius: 7, background: T.wa, border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: msg.trim() ? "pointer" : "not-allowed", opacity: msg.trim() ? 1 : 0.6 }}>
             {t("share_drawing.open_whatsapp")}
            </button>
            <button onClick={markShared} disabled={generating}
              style={{ flex: "1.4 1 140px", padding: "9px", borderRadius: 7, background: T.blu, border: "none", color: "white", fontSize: 12.5, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1 }}>
              {generating ? "…" : t("share_drawing.sent_mark_shared")}
            </button>
            <button onClick={handleCopyLink} disabled={!publicShareUrl} title={t("share_drawing.copy_public_link")}
              style={{ flex: "0 0 38px", padding: "9px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}`, fontSize: 13, fontWeight: 700, cursor: publicShareUrl ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center" }}>
              🔗
            </button>
          </div>

          {/* Share history */}
          {shares.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{t("share_drawing.share_history_shares", { shares: shares.length })}</div>
              {shares.map(s => {
                const url = buildPublicUrl(s.share_token);
                return (
                  <div key={s.id} style={{
                    background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 7,
                    padding: "9px 11px", marginBottom: 6,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                        background: s.channel === "whatsapp" ? "#DCFCE7" : T.bluL,
                        color: s.channel === "whatsapp" ? T.wa : T.blu,
                        textTransform: "uppercase", letterSpacing: ".4px",
                      }}>{s.channel}</span>
                      {s.shared_to && <span style={{ fontSize: 11, color: T.t3 }}>{s.shared_to}</span>}
                      <span style={{
                        marginLeft: "auto", fontSize: 10, fontWeight: 700,
                        padding: "1px 7px", borderRadius: 10,
                        background: s.view_count > 0 ? T.grnL : T.surfaceB,
                        color: s.view_count > 0 ? T.grn : T.t4,
                        border: `1px solid ${s.view_count > 0 ? T.grnM : T.b1}`,
                      }}>
                        {s.view_count > 0 ? `${s.view_count} view${s.view_count === 1 ? "" : "s"}` : t("share_drawing.not_viewed")}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: T.t4, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</div>
                    {(s.shared_by_name || s.shared_at) && (
                      <div style={{ marginTop: 5, paddingTop: 5, borderTop: `1px dashed ${T.b1}` }}>
                        {s.shared_by_name && <Credit label={t("share_drawing.shared_by")} name={s.shared_by_name} time={s.shared_at} />}
                      </div>
                    )}
                    {s.first_viewed_at && (
                      <div style={{ marginTop: 4, fontSize: 10.5, color: T.grn }}>{t("share_drawing.first_viewed_vnew", { vnew: new Date(s.first_viewed_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) })}</div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
