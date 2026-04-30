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

export default function ShareDrawingDrawer({ target, onClose }) {
  const open = !!target;
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const drawingId = target?.drawing_id;
  const leadId = target?.lead_id;

  const loadShares = useCallback(async () => {
    if (!drawingId) return;
    setLoading(true);
    try {
      const r = await api.get(`/design/drawings/${drawingId}/shares`);
      if (r.success && Array.isArray(r.data)) setShares(r.data);
    } catch (e) {/* graceful */}
    setLoading(false);
  }, [drawingId]);

  useEffect(() => {
    if (open) loadShares();
  }, [open, loadShares]);

  // Get-or-create share link for a given channel + target
  const getOrCreateShare = async (channel, sharedTo) => {
    setGenerating(true);
    try {
      const r = await api.post(`/design/drawings/${drawingId}/share`, {
        channel, shared_to: sharedTo || null, lead_id: leadId || null,
      });
      setGenerating(false);
      if (r.success && r.data) {
        await loadShares();
        return r.data;
      }
    } catch (e) {/* graceful */}
    setGenerating(false);
    return null;
  };

  const buildPublicUrl = (token) => `${PUBLIC_BASE}/d/${token}`;

  const handleCopyLink = async () => {
    const share = await getOrCreateShare("link", null);
    if (!share) {
      window.toast?.error("Failed to generate link");
      return;
    }
    const url = buildPublicUrl(share.share_token);
    try {
      await navigator.clipboard.writeText(url);
      window.toast?.success("Link copied to clipboard");
    } catch {
      // Fallback: show in prompt
      window.prompt("Copy this link:", url);
    }
  };

  const handleWhatsApp = async () => {
    const phone = target?.lead_phone || "";
    const share = await getOrCreateShare("whatsapp", phone || null);
    if (!share) {
      window.toast?.error("Failed to generate link");
      return;
    }
    const url = buildPublicUrl(share.share_token);
    const msg = `Hi ${target?.lead_name || ""}, here's the design plan we prepared for you: ${url}`;
    const cleanPhone = phone.replace(/[^\d]/g, "");
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
    window.toast?.success("WhatsApp opened");
  };

  if (!open) return null;

  return (
    <>
      <style>{`@keyframes gbShareSlide{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 250 }} />
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
              📤 Share Drawing
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {target?.drawing_title || "Drawing"}{target?.lead_name && ` · with ${target.lead_name}`}
            </div>
          </div>
          <button onClick={onClose} title="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 6, borderRadius: 6, display: "flex" }}
            onMouseEnter={el => el.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={el => el.currentTarget.style.background = "none"}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>Share via</div>

          <button onClick={handleWhatsApp} disabled={generating}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 9,
              background: T.surface, border: `1.5px solid ${T.grnM}`,
              cursor: "pointer", marginBottom: 10, display: "flex",
              alignItems: "center", gap: 12, fontFamily: "inherit", textAlign: "left",
              transition: "all .12s",
            }}
            onMouseEnter={el => { el.currentTarget.style.background = T.grnL; el.currentTarget.style.borderColor = T.wa; }}
            onMouseLeave={el => { el.currentTarget.style.background = T.surface; el.currentTarget.style.borderColor = T.grnM; }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.wa, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>WhatsApp</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {target?.lead_phone ? `Send to ${target.lead_phone}` : "Open WhatsApp with link"}
              </div>
            </div>
          </button>

          <button onClick={handleCopyLink} disabled={generating}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 9,
              background: T.surface, border: `1.5px solid ${T.bluM}`,
              cursor: "pointer", marginBottom: 16, display: "flex",
              alignItems: "center", gap: 12, fontFamily: "inherit", textAlign: "left",
              transition: "all .12s",
            }}
            onMouseEnter={el => { el.currentTarget.style.background = T.bluL; }}
            onMouseLeave={el => { el.currentTarget.style.background = T.surface; }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.blu, display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>Copy public link</div>
              <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>Share via SMS, email, or any app</div>
            </div>
          </button>

          {/* Share history */}
          {shares.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
                Share history ({shares.length})
              </div>
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
                        {s.view_count > 0 ? `${s.view_count} view${s.view_count === 1 ? "" : "s"}` : "Not viewed"}
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: T.t4, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</div>
                    {(s.shared_by_name || s.shared_at) && (
                      <div style={{ marginTop: 5, paddingTop: 5, borderTop: `1px dashed ${T.b1}` }}>
                        {s.shared_by_name && <Credit label="Shared by" name={s.shared_by_name} time={s.shared_at} />}
                      </div>
                    )}
                    {s.first_viewed_at && (
                      <div style={{ marginTop: 4, fontSize: 10.5, color: T.grn }}>
                        First viewed {new Date(s.first_viewed_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
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
