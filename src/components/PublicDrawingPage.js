// ── PUBLIC DRAWING PAGE ─────────────────────────────────────────────
// Renders at /d/:token — no auth required. Client opens this link to view
// the drawing shared with them. View is tracked server-side.

import { useState, useEffect } from "react";
import { API_BASE } from "../config/api";

const T = {
  bg: "#0F172A",
  surface: "#FFFFFF",
  text: "#111827",
  textMid: "#374151",
  textLight: "#6B7280",
  blu: "#2563EB",
  grn: "#059669",
};

export default function PublicDrawingPage() {
  const token = window.location.pathname.replace(/^\/d\//, "").replace(/\/$/, "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError("Invalid link"); setLoading(false); return; }
    fetch(`${API_BASE}/design/public/drawings/${token}`)
      .then(r => r.json())
      .then(r => {
        if (r.success) setData(r.data);
        else setError(r.message || "Not found");
        setLoading(false);
      })
      .catch(e => { setError("Network error"); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#fff" }}>
        Loading...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: T.surface, borderRadius: 12, padding: "32px 28px", maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>😕</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>Link not available</div>
          <div style={{ fontSize: 13, color: T.textLight, lineHeight: 1.5 }}>{error || "This drawing link is invalid or has been deactivated. Please contact the sender."}</div>
        </div>
      </div>
    );
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(data.file_url || "");
  const isPdf = /\.pdf$/i.test(data.file_url || "");

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "system-ui, -apple-system, sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "rgba(15,23,42,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 18px", color: "#fff", flexShrink: 0 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.title}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
              {[data.category, data.drawing_type, data.version, data.file_size].filter(Boolean).join(" · ")}
            </div>
          </div>
          <a href={data.file_url} download
            style={{ padding: "7px 14px", borderRadius: 7, background: T.blu, color: "#fff", textDecoration: "none", fontSize: 12.5, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download
          </a>
        </div>
      </div>

      {/* Viewer */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        {isImage ? (
          <img src={data.file_url} alt={data.title} style={{ maxWidth: "100%", maxHeight: "calc(100vh - 160px)", borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} />
        ) : isPdf ? (
          <iframe src={data.file_url} title={data.title} style={{ width: "100%", maxWidth: 1000, height: "calc(100vh - 140px)", border: "none", borderRadius: 10, background: "#fff" }} />
        ) : (
          <div style={{ background: T.surface, borderRadius: 12, padding: "30px 28px", maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{data.title}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginBottom: 16 }}>Click below to download and view</div>
            <a href={data.file_url} download
              style={{ display: "inline-block", padding: "10px 18px", borderRadius: 7, background: T.blu, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
              Download File
            </a>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 18px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        Shared via GB Buildcon · Construction Manager
      </div>
    </div>
  );
}
