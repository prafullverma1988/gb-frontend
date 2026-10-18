// ════════════════════════════════════════════════════════════════
// PdfModal — server ki PDF app ke andar (19 Oct 2026)
// ----------------------------------------------------------------
// Pehle DPR / din-report / drawing report seedha download hoti thi (ya naye
// tab me). Ab yahin DocViewer me khulti hai — zoom, page — aur upar
// "Download" se file bhi. Token <a href> par nahi jaata, isliye fetch se blob.
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE, getToken } from "../config/api";
import { t, getLang } from "../i18n";
import DocViewer from "./DocViewer";
import { BackClose } from "../utils/backNav";

export async function fetchPdfBlob(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, "X-Lang": getLang() },
  });
  if (!res.ok) {
    let m = "";
    try { m = (await res.json()).message; } catch (_) { /* PDF route ka error HTML bhi ho sakta hai */ }
    throw new Error(m || t("docview.pdf_nahi_bani"));
  }
  return await res.blob();
}

export function saveBlobAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// path = server ka PDF route (fetch karke dikhata hai) ya blob (pehle se laaya).
export default function PdfModal({ title, path, blob: given, filename, onClose }) {
  const [blob, setBlob] = useState(given || null);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (given || !path) return undefined;
    let dead = false;
    setErr("");
    fetchPdfBlob(path).then((b) => { if (!dead) setBlob(b); }).catch((e) => { if (!dead) setErr(e.message); });
    return () => { dead = true; };
  }, [path, given]);

  useEffect(() => {
    if (!blob) return undefined;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return createPortal((
    <div style={{ position: "fixed", inset: 0, zIndex: 10070, display: "flex", flexDirection: "column", background: "#1F2329" }}>
      <BackClose onClose={onClose} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#111827", color: "#fff" }}>
        <button type="button" onClick={onClose} title={t("common.close")}
          style={{ border: "none", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 8, height: 34, width: 34, fontSize: 16, cursor: "pointer" }}>✕</button>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
        {blob && (
          <button type="button" onClick={() => saveBlobAs(blob, filename || "document.pdf")}
            style={{ border: "none", background: "#2563EB", color: "#fff", borderRadius: 8, height: 34, padding: "0 14px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            ⬇ {t("docview.download")}
          </button>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {err ? <div style={{ color: "#fff", padding: 40, textAlign: "center", fontSize: 13 }}>{err}</div>
          : url ? <DocViewer src={url} kind="pdf" />
          : <div style={{ color: "rgba(255,255,255,.8)", padding: 40, textAlign: "center", fontSize: 13 }}>{t("docview.ban_rahi")}</div>}
      </div>
    </div>
  ), document.body);
}
