// ── PUBLIC DRAWING PAGE ─────────────────────────────────────────────
// Renders at /d/:token — no auth required. Client opens this link to view
// the drawing shared with them. View is tracked server-side.
// 19 Oct 2026: PDF / photo DocViewer me (zoom), aur client khud drawing par
// 📍 / ▭ / T se "yahan badlaav chahiye" bata sakta hai (naam ek baar). Client
// ko sirf client ke mark dikhte hain — andar ki baatcheet nahi.

import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config/api";
import { t } from "../i18n";
import DocViewer, { isPdfUrl } from "./DocViewer";
import { MarkShape, Composer } from "./DrawingReview";

const NAME_KEY = "pd_client_name";
const readName = () => { try { return localStorage.getItem(NAME_KEY) || ""; } catch (_) { return ""; } };

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
  const [marks, setMarks] = useState([]);
  const [tool, setTool] = useState(null);
  const [draft, setDraft] = useState(null);
  const [name, setName] = useState(readName());
  const [askName, setAskName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [sel, setSel] = useState(null);

  const loadMarks = useCallback(() => {
    if (!token) return;
    fetch(`${API_BASE}/design/public/drawings/${token}/marks`).then((r) => r.json())
      .then((r) => { if (r && r.success) setMarks(r.data || []); }).catch(() => {});
  }, [token]);
  useEffect(() => { loadMarks(); }, [loadMarks]);

  const pickTool = (k) => {
    if (!name) { setAskName(k); return; }
    setTool(tool === k ? null : k); setDraft(null);
  };
  const save = async (text) => {
    if (!draft) return;
    setBusy(true); setNote("");
    const body = { client_name: name, kind: draft.kind, page: draft.page, x: draft.x, y: draft.y, note: text };
    if (draft.kind === "box") { body.w = draft.w; body.h = draft.h; }
    if (draft.kind === "text") { body.w = 0.2; body.h = 0.04; }
    try {
      const r = await fetch(`${API_BASE}/design/public/drawings/${token}/marks`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
      if (r && r.success) { setDraft(null); setTool(null); setNote(t("public_drawing.mark_bhej_diya")); loadMarks(); }
      else setNote((r && r.message) || t("common.network_error"));
    } catch (_) { setNote(t("common.network_error")); }
    setBusy(false);
  };

  useEffect(() => {
    if (!token) { setError(t("public_drawing.invalid_link")); setLoading(false); return; }
    fetch(`${API_BASE}/design/public/drawings/${token}`)
      .then(r => r.json())
      .then(r => {
        if (r.success) setData(r.data);
        else setError(r.message || "Not found");
        setLoading(false);
      })
      .catch(e => { setError(t("common.network_error")); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#fff" }}>
       {t("common.loading")}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: T.surface, borderRadius: 12, padding: "32px 28px", maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>😕</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 6 }}>{t("public_drawing.link_not_available")}</div>
          <div style={{ fontSize: 13, color: T.textLight, lineHeight: 1.5 }}>{error || t("public_drawing.this_drawing_link_is_invalid_or")}</div>
        </div>
      </div>
    );
  }

  const viewSrc = data.pdf_url || data.file_url || "";
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(viewSrc);
  const isPdf = isPdfUrl(viewSrc) && !/\.(dwg|dxf)(\?|$)/i.test(viewSrc);
  const overlay = (page) => (
    <>
      {marks.filter((m) => m.page === page).map((m) => (
        <MarkShape key={m.id} m={{ ...m, status: m.status || "open" }} selected={sel === m.id} onClick={(x) => setSel(x.id)} />
      ))}
      {draft && draft.page === page && (
        <>
          {draft.kind === "box"
            ? <div style={{ position: "absolute", left: draft.x * 100 + "%", top: draft.y * 100 + "%", width: draft.w * 100 + "%", height: draft.h * 100 + "%", border: "2.5px dashed #2563EB", background: "rgba(37,99,235,.08)" }} />
            : <div style={{ position: "absolute", left: draft.x * 100 + "%", top: draft.y * 100 + "%", width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: "50%", background: "#2563EB" }} />}
        </>
      )}
    </>
  );
  const toolBtn = (k, label) => (
    <button type="button" onClick={() => pickTool(k)}
      style={{ border: "none", borderRadius: 8, height: 34, padding: "0 12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
        background: tool === k ? "#fff" : "rgba(255,255,255,.12)", color: tool === k ? "#111827" : "#fff" }}>{label}</button>
  );

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
           {t("public_drawing.download")}
          </a>
        </div>
      </div>

      {(isImage || isPdf) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "8px 18px", background: "rgba(15,23,42,0.95)", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.75)" }}>{t("public_drawing.badlaav_batao")}</span>
          {toolBtn("pin", "📍 " + t("dmark.pin"))}{toolBtn("box", "▭ " + t("dmark.box"))}{toolBtn("text", "T " + t("dmark.text"))}
          {marks.length > 0 && <span style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>{t("public_drawing.mark_n", { n: marks.length })}</span>}
          {name && <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,.6)" }}>{name}</span>}
        </div>
      )}
      {tool && <div style={{ background: "#2563EB", color: "#fff", fontSize: 12.5, padding: "6px 18px" }}>{tool === "box" ? t("dmark.hint_box") : tool === "text" ? t("dmark.hint_text") : t("dmark.hint_pin")}</div>}
      {note && <div style={{ background: "#ECFDF5", color: "#065F46", fontSize: 12.5, padding: "6px 18px" }}>{note}</div>}
      {sel && (() => { const m = marks.find((x) => x.id === sel); return m ? (
        <div style={{ background: "#fff", color: "#111827", fontSize: 13, padding: "8px 18px", borderBottom: "1px solid #E5E7EB" }}>
          <b>#{m.seq}</b> · {m.client_name} · {m.note}
          <button type="button" onClick={() => setSel(null)} style={{ marginLeft: 10, border: "none", background: "none", color: "#6B7280", cursor: "pointer" }}>✕</button>
        </div>) : null; })()}
      {(isImage || isPdf) ? (
        <div style={{ flex: 1, minHeight: "60vh", height: "calc(100vh - 170px)" , position: "relative" }}>
          {draft && (
            <div style={{ position: "absolute", left: 14, bottom: 14, zIndex: 20 }}>
              <Composer draft={draft} busy={busy} onSave={(text) => save(text)} onCancel={() => setDraft(null)} />
            </div>
          )}
          <DocViewer src={viewSrc} kind={isPdf ? "pdf" : "image"} overlay={overlay} mode={tool && !draft ? tool : null} onPlace={(p) => setDraft(p)} />
        </div>
      ) : (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        {/* PDF / photo nahi (jaise sirf DWG) — download hi */}
          <div style={{ background: T.surface, borderRadius: 12, padding: "30px 28px", maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{data.title}</div>
            <div style={{ fontSize: 12, color: T.textLight, marginBottom: 16 }}>{t("public_drawing.click_below_to_download_and_view")}</div>
            <a href={data.file_url} download
              style={{ display: "inline-block", padding: "10px 18px", borderRadius: 7, background: T.blu, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
             {t("public_drawing.download_file")}
            </a>
          </div>
      </div>
      )}

      {askName && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 18, width: 340, maxWidth: "100%" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 4 }}>{t("public_drawing.aapka_naam")}</div>
            <div style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 10 }}>{t("public_drawing.naam_kyon")}</div>
            <input autoFocus defaultValue={name} id="pd-name" style={{ width: "100%", boxSizing: "border-box", padding: 9, border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14 }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.nextSibling.click(); }} />
            <button type="button" style={{ marginTop: 10, width: "100%", border: "none", background: "#2563EB", color: "#fff", borderRadius: 8, padding: 10, fontSize: 14, fontWeight: 800, cursor: "pointer" }}
              onClick={() => {
                const v = String(document.getElementById("pd-name").value || "").trim();
                if (v.length < 2) return;
                try { localStorage.setItem(NAME_KEY, v); } catch (_) {}
                setName(v); const k = askName; setAskName(false); setTool(k);
              }}>{t("public_drawing.aage")}</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "12px 18px", textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 11, borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
       {/* Link bhejne wali company ka naam (API company_name) — pehle har company ke link par "GB Buildcon" (LIB-16) */}
       {data.company_name
         ? t("public_drawing.shared_via_company", { company: data.company_name })
         : t("public_drawing.shared_via_sanchalan")}
      </div>
    </div>
  );
}
