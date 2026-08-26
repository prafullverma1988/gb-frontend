// ── FLOATING UPLOAD TOAST ──────────────────────────────────────────────
// Shows bottom-right floating panel with active/completed/failed uploads
// WhatsApp-style: small, non-blocking, auto-dismiss on success

import { useState, useEffect } from "react";
import uploadManager from "../utils/uploadManager";
import { t } from "../i18n";

const S = {
  blu: "#2563EB", grn: "#059669", red: "#DC2626", amb: "#D97706",
  t1: "#111827", t3: "#6B7280", t4: "#9CA3AF",
  bg: "#FFFFFF", b1: "#E5E7EB",
  grnL: "#ECFDF5", redL: "#FEF2F2", bluL: "#EFF6FF",
};

export default function UploadToast() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const unsub = uploadManager.subscribe(setQueue);
    return unsub;
  }, []);

  if (queue.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 6,
      maxWidth: 320, width: "100%",
    }}>
      {queue.map(item => (
        <div key={item.id} style={{
          background: S.bg, borderRadius: 10, padding: "10px 14px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
          animation: "slideUp 0.25s ease-out",
        }}>
          {/* File name + status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            {/* Icon */}
            <div style={{
              width: 28, height: 28, borderRadius: 7, display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
              background: item.status === "done" ? S.grnL
                : item.status === "error" ? S.redL : S.bluL,
            }}>
              {item.status === "done" ? "✅" : item.status === "error" ? "❌" : "📄"}
            </div>

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: S.t1,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {item.name}
              </div>
              <div style={{ fontSize: 10, color: S.t4, marginTop: 1 }}>
                {item.status === "uploading" ? `Uploading... ${item.pct}%`
                  : item.status === "done" ? t("upload_toast.upload_complete")
                  : item.status === "error" ? item.error
                  : t("upload_toast.queued")}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {item.status === "uploading" && (
                <button onClick={() => uploadManager.cancel(item.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: S.t4, padding: 2 }}
                  title={t("common.cancel")}>✕</button>
              )}
              {item.status === "error" && (
                <>
                  <button onClick={() => uploadManager.retry(item.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: S.blu, padding: "2px 4px", fontWeight: 600 }}>
                    {t("common.retry")}
                  </button>
                  <button onClick={() => uploadManager.dismiss(item.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: S.t4, padding: 2 }}>✕</button>
                </>
              )}
              {item.status === "done" && (
                <button onClick={() => uploadManager.dismiss(item.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: S.t4, padding: 2 }}>✕</button>
              )}
            </div>
          </div>

          {/* Progress bar — only during upload */}
          {(item.status === "uploading" || item.status === "queued") && (
            <div style={{ height: 3, background: S.b1, borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, transition: "width 0.3s ease",
                width: `${item.pct}%`,
                background: `linear-gradient(90deg, ${S.blu}, #3B82F6)`,
              }} />
            </div>
          )}
        </div>
      ))}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
