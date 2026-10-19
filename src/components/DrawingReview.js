// ════════════════════════════════════════════════════════════════
// DrawingReview — drawing dekho, uspar mark lagao (19 Oct 2026)
// ----------------------------------------------------------------
// Prafull: "reviewer / approval authority ne dekha, kuch changes — pdf me pin
// ya mark ho kahan pe kya change karna hai; version-wise data bhi rahe".
// 📍 Pin · ▭ Box (hissa) · T Text — koi bhi laga sakta hai. Har mark ka
// chakra: Khula → designer "Theek kiya" / "Nahi kiya (wajah)" → "Pakka" ya
// "Dobara kholo". Version badlo to us version ke mark; abhi wale par purane
// khule mark bhi ("v1 se"). Itihaas = version, revise note, har mark ka kadam.
// Backend: routes/design.js "DRAWING MARKS".
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../config/api";
import { t } from "../i18n";
import DocViewer, { isPdfUrl } from "./DocViewer";
import PdfModal from "./PdfModal";
import DrawingCompare from "./DrawingCompare";
import { BackClose } from "../utils/backNav";

const C = {
  open: "#DC2626", fixed: "#D97706", declined: "#7C3AED", resolved: "#059669",
  ink: "#111827", sub: "#6B7280", line: "#E5E7EB", soft: "#F8FAFC", blu: "#2563EB",
};
const STATUS_LABEL = {
  open: () => t("dmark.khula"), fixed: () => t("dmark.theek_kiya"),
  declined: () => t("dmark.nahi_kiya"), resolved: () => t("dmark.pakka"),
};
const ACTION_LABEL = {
  created: () => t("dmark.ev_created"), edited: () => t("dmark.ev_edited"), fixed: () => t("dmark.ev_fixed"),
  declined: () => t("dmark.ev_declined"), resolved: () => t("dmark.ev_resolved"), reopened: () => t("dmark.ev_reopened"),
  deleted: () => t("dmark.ev_deleted"),
};
const fmtWhen = (s) => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
};
const vNum = (v) => parseInt(String(v || "").replace(/\D/g, ""), 10) || 0;

export function MarkShape({ m, selected, onClick, old }) {
  const col = C[m.status] || C.open;
  const tag = (
    <span style={{ position: "absolute", left: -2, top: -22, background: col, color: "#fff", fontSize: 11, fontWeight: 800,
      borderRadius: 10, padding: "1px 7px", whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,.25)" }}>
      #{m.seq}{old ? " · " + m.version : ""}
    </span>
  );
  const ring = selected ? "0 0 0 3px rgba(37,99,235,.55)" : "0 1px 3px rgba(0,0,0,.3)";
  const stop = (e) => { e.stopPropagation(); onClick(m); };
  if (m.kind === "pin") {
    return (
      <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={stop} title={m.note}
        style={{ position: "absolute", left: m.x * 100 + "%", top: m.y * 100 + "%", transform: "translate(-50%,-100%)",
          width: 30, height: 30, borderRadius: "50% 50% 50% 0", rotate: "-45deg", background: col, border: m.priority === "high" ? "2px solid #fff" : "none",
          boxShadow: ring, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, opacity: old ? 0.75 : 1 }}>
        <span style={{ rotate: "45deg", color: "#fff", fontSize: 12, fontWeight: 800 }}>{m.seq}</span>
      </button>
    );
  }
  if (m.kind === "box") {
    return (
      <div onPointerDown={(e) => e.stopPropagation()} onClick={stop} title={m.note}
        style={{ position: "absolute", left: m.x * 100 + "%", top: m.y * 100 + "%", width: m.w * 100 + "%", height: m.h * 100 + "%",
          border: "2.5px " + (m.status === "resolved" ? "solid" : "dashed") + " " + col, background: col + "14",
          boxShadow: selected ? ring : "none", cursor: "pointer", opacity: old ? 0.75 : 1 }}>
        {tag}
      </div>
    );
  }
  return (
    <div onPointerDown={(e) => e.stopPropagation()} onClick={stop}
      style={{ position: "absolute", left: m.x * 100 + "%", top: m.y * 100 + "%", transform: "translate(-4px,-50%)",
        maxWidth: 260, background: "#FFF8C5", border: "1.5px solid " + col, borderRadius: 6, padding: "4px 8px",
        fontSize: 12.5, fontWeight: 600, color: C.ink, boxShadow: ring, cursor: "pointer", opacity: old ? 0.8 : 1 }}>
      {tag}{m.note}
    </div>
  );
}

export function Composer({ draft, onSave, onCancel, busy, canIssue }) {
  const [note, setNote] = useState("");
  const boxRef = useRef(null);
  // autoFocus parent ko scroll kar deta (phone par review upar khisakta) — bina scroll ke focus.
  useEffect(() => { try { boxRef.current && boxRef.current.focus({ preventScroll: true }); } catch (_) {} }, []);
  const [high, setHigh] = useState(false);
  const [issue, setIssue] = useState(false);
  const label = draft.kind === "text" ? t("dmark.likho_text") : t("dmark.kya_badalna");
  return (
    <div onPointerDown={(e) => e.stopPropagation()}
      style={{ width: 300, maxWidth: "calc(100vw - 32px)", background: "#fff", borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,.35)", padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{label}</div>
      <textarea ref={boxRef} value={note} onChange={(e) => setNote(e.target.value)} rows={3}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && note.trim()) onSave(note.trim(), high, issue); if (e.key === "Escape") onCancel(); }}
        style={{ width: "100%", boxSizing: "border-box", border: "1px solid " + C.line, borderRadius: 8, padding: 8, fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
      {draft.kind !== "text" && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.sub, margin: "6px 0 2px", cursor: "pointer" }}>
          <input type="checkbox" checked={high} onChange={(e) => setHigh(e.target.checked)} /> {t("dmark.zaroori")}
        </label>
      )}
      {canIssue && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.sub, margin: "2px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={issue} onChange={(e) => setIssue(e.target.checked)} /> {t("dmark.issue_bhi")}
        </label>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ border: "1px solid " + C.line, background: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, cursor: "pointer" }}>{t("common.cancel")}</button>
        <button type="button" disabled={!note.trim() || busy} onClick={() => onSave(note.trim(), high, issue)}
          style={{ border: "none", background: C.blu, color: "#fff", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", opacity: !note.trim() || busy ? 0.5 : 1 }}>
          {t("dmark.lagao")}
        </button>
      </div>
    </div>
  );
}

function MarkCard({ m, events, me, selected, onSelect, onAct, onDelete, busy, old }) {
  const [need, setNeed] = useState(null);   // { action } — wajah maangni hai
  const [note, setNote] = useState("");
  const col = C[m.status] || C.open;
  const hist = events.filter((e) => e.mark_id === m.id);
  const answered = hist.some((e) => !["created", "edited"].includes(e.action));
  const mine = Number(m.created_by) === Number(me);
  const btn = (label, onClick, bg, fg) => (
    <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{ border: bg ? "none" : "1px solid " + C.line, background: bg || "#fff", color: fg || C.ink, borderRadius: 7,
        padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.5 : 1 }}>{label}</button>
  );
  const go = (action, needNote) => { if (needNote) { setNeed(action); setNote(""); } else onAct(m, action, ""); };
  return (
    <div onClick={() => onSelect(m)}
      style={{ border: "1px solid " + (selected ? C.blu : C.line), borderLeft: "4px solid " + col, borderRadius: 10, padding: 10,
        background: selected ? "#F5F9FF" : "#fff", cursor: "pointer", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: C.ink }}>#{m.seq}</span>
        <span style={{ fontSize: 11, color: C.sub }}>{m.kind === "pin" ? "📍" : m.kind === "box" ? "▭" : "T"} · {t("dmark.page_n", { n: m.page })}</span>
        {old && <span style={{ fontSize: 10.5, color: C.sub, background: C.soft, border: "1px solid " + C.line, borderRadius: 8, padding: "0 6px" }}>{t("dmark.version_se", { v: m.version })}</span>}
        {m.priority === "high" && <span style={{ fontSize: 10.5, fontWeight: 800, color: C.open }}>{t("dmark.zaroori")}</span>}
        {m.client_name && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#0E7490", background: "#ECFEFF", borderRadius: 8, padding: "0 6px" }}>{t("dmark.client")}</span>}
        {m.issue_id && <span style={{ fontSize: 10.5, fontWeight: 800, color: C.fixed, background: "#FFFBEB", borderRadius: 8, padding: "0 6px" }}>⚠ {t("dmark.issue_n", { n: m.issue_id })}</span>}
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: col }}>{STATUS_LABEL[m.status]()}</span>
      </div>
      <div style={{ fontSize: 13, color: C.ink, margin: "5px 0 4px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.note}</div>
      <div style={{ fontSize: 11, color: C.sub }}>{m.created_by_name || "—"} · {fmtWhen(m.created_at)}</div>
      {selected && (
        <>
          {hist.length > 1 && (
            <div style={{ margin: "8px 0 2px", borderTop: "1px dashed " + C.line, paddingTop: 6 }}>
              {hist.map((e) => (
                <div key={e.id} style={{ fontSize: 11.5, color: C.sub, padding: "2px 0" }}>
                  <b style={{ color: C.ink }}>{ACTION_LABEL[e.action] ? ACTION_LABEL[e.action]() : e.action}</b>
                  {" · "}{e.user_name || "—"}{" · "}{e.version}{" · "}{fmtWhen(e.created_at)}
                  {e.note && e.action !== "created" ? <div style={{ color: C.ink, whiteSpace: "pre-wrap" }}>“{e.note}”</div> : null}
                </div>
              ))}
            </div>
          )}
          {need ? (
            <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8 }}>
              <textarea autoFocus rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={need === "declined" ? t("dmark.kyon_nahi") : need === "reopened" ? t("dmark.kya_baaki") : t("dmark.kya_kiya")}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid " + C.line, borderRadius: 8, padding: 7, fontSize: 12.5, fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
                {btn(t("common.cancel"), () => setNeed(null))}
                {btn(t("dmark.bhejo"), () => { if (note.trim().length >= 3 || need === "fixed") { onAct(m, need, note.trim()); setNeed(null); } }, C.blu, "#fff")}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {m.status === "open" && btn("✓ " + t("dmark.theek_kiya"), () => go("fixed", true), C.fixed, "#fff")}
              {m.status === "open" && btn(t("dmark.nahi_kiya"), () => go("declined", true))}
              {(m.status === "fixed" || m.status === "declined") && btn("✓ " + t("dmark.pakka_karo"), () => go("resolved", false), C.resolved, "#fff")}
              {m.status !== "open" && btn(t("dmark.dobara_kholo"), () => go("reopened", true))}
              {mine && !answered && btn(t("common.delete"), () => onDelete(m))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DrawingReview({ drawing, me, canDecide, onClose, onChanged, onDecide }) {
  const [full, setFull] = useState(null);       // /design/drawings/:id (versions)
  const [data, setData] = useState({ marks: [], events: [] });
  const [version, setVersion] = useState(drawing.current_version || "v1");
  const [tool, setTool] = useState(null);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [filter, setFilter] = useState("open");
  const [tab, setTab] = useState("marks");
  const [timeline, setTimeline] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [jump, setJump] = useState(null);
  const [revise, setRevise] = useState(null);   // Revise ka note (bhejne se pehle)
  const [pdf, setPdf] = useState(null);         // { title, path, filename } — report / approved copy
  const [compare, setCompare] = useState(false);
  // Phone par: toolbar ek line me khiskane wala, mark ki list neeche "sheet".
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 760);
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 760);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      api.get("/design/drawings/" + drawing.id).catch(() => null),
      api.get("/design/drawings/" + drawing.id + "/marks").catch(() => null),
    ]);
    if (a && a.success) setFull(a.data);
    if (b && b.success) setData(b.data);
    else if (b && b.message) setMsg(b.message);
  }, [drawing.id]);
  useEffect(() => { load(); }, [load]);

  const current = (data.current_version || (full && full.current_version) || drawing.current_version || "v1");
  const isCurrent = version === current;
  const versions = useMemo(() => {
    const vs = ((full && full.versions) || []).map((v) => v.version_number);
    if (!vs.includes(current)) vs.push(current);
    return Array.from(new Set(vs)).sort((x, y) => vNum(y) - vNum(x));
  }, [full, current]);
  const vRow = ((full && full.versions) || []).find((v) => v.version_number === version);
  const src = isCurrent
    ? ((full && (full.pdf_url || full.file_url)) || drawing.pdf_url || drawing.file_url)
    : (vRow && (vRow.pdf_url || vRow.file_url));
  const kind = isPdfUrl(src) ? "pdf" : "image";

  // Abhi wale version par: is version ke + purane jo abhi band nahi hue.
  // Purane version par: sirf usi par lage (us din ki tasveer).
  const shown = useMemo(() => data.marks.filter((m) => (isCurrent
    ? (m.version === current || m.status !== "resolved")
    : m.version === version)), [data.marks, isCurrent, current, version]);
  const counts = useMemo(() => ({
    open: shown.filter((m) => m.status === "open" || m.status === "declined").length,
    fixed: shown.filter((m) => m.status === "fixed").length,
    resolved: shown.filter((m) => m.status === "resolved").length,
    all: shown.length,
  }), [shown]);
  const listed = shown.filter((m) => (filter === "all" ? true
    : filter === "open" ? (m.status === "open" || m.status === "declined") : m.status === filter));

  const place = (p) => { setSheet(false); setDraft({ ...p, kind: p.kind === "pin" || p.kind === "box" || p.kind === "text" ? p.kind : tool }); };
  const save = async (note, high, makeIssue) => {
    if (!draft) return;
    setBusy(true); setMsg("");
    const body = { kind: draft.kind, page: draft.page, x: draft.x, y: draft.y, note, priority: high ? "high" : "normal" };
    // Site par dikkat → project ka Issue bhi (Tasks → Issues me dikhega), mark se juda.
    if (makeIssue && drawing.project_id) {
      const ir = await api.post("/tasks/project/" + drawing.project_id + "/issues", {
        title: (drawing.title + ": " + note).slice(0, 200),
        description: t("dmark.issue_desc", { title: drawing.title, v: current, page: draft.page }) + "\n" + note,
        priority: high ? "High" : "Medium",
      }).catch((e) => ({ message: e.message }));
      if (ir && ir.success && ir.data && ir.data.id) body.issue_id = ir.data.id;
      else { setBusy(false); setMsg((ir && ir.message) || t("dmark.galti")); return; }
    }
    if (draft.kind === "box") { body.w = draft.w; body.h = draft.h; }
    if (draft.kind === "text") { body.w = 0.2; body.h = 0.04; }
    const r = await api.post("/design/drawings/" + drawing.id + "/marks", body).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) { setDraft(null); setFilter("open"); await load(); setSel(r.data && r.data.id); if (onChanged) onChanged(); }
    else setMsg((r && r.message) || t("dmark.galti"));
  };
  const act = async (m, action, note) => {
    setBusy(true); setMsg("");
    const r = await api.post("/design/marks/" + m.id + "/respond", { action, note }).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) { await load(); if (timeline) setTimeline(null); if (onChanged) onChanged(); }
    else { setMsg((r && r.message) || t("dmark.galti")); await load(); }
  };
  const del = async (m) => {
    if (!window.confirm(t("dmark.hatana_hai", { n: m.seq }))) return;
    setBusy(true);
    const r = await api.del("/design/marks/" + m.id).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success) { setSel(null); await load(); } else setMsg((r && r.message) || t("dmark.galti"));
  };
  const pick = (m) => { setSel(m.id); setSheet(true); setJump({ page: m.page, x: m.x + (m.w || 0) / 2, y: m.y + (m.h || 0) / 2, at: Date.now() }); };

  useEffect(() => {
    if (tab !== "history" || timeline) return;
    api.get("/design/drawings/" + drawing.id + "/timeline").then((r) => setTimeline(r && r.success ? r.data : [])).catch(() => setTimeline([]));
  }, [tab, timeline, drawing.id]);

  const status = (full && full.status) || drawing.status;
  const openNow = data.marks.filter((m) => m.status === "open" || m.status === "declined");
  const canApprove = canDecide && isCurrent && status !== "Approved";
  const canRevise = canDecide && isCurrent && status !== "Revision";
  const approveNow = () => { if (!openNow.length || window.confirm(t("dmark.khule_hain_phir_bhi", { n: openNow.length }))) decide("Approved"); };
  const startRevise = () => {
    const lines = openNow.map((m) => "#" + m.seq + " (" + t("dmark.page_n", { n: m.page }) + "): " + m.note);
    setRevise(lines.length ? t("dmark.revise_note_shuru", { n: lines.length }) + "\n" + lines.join("\n") : "");
  };
  // onDecide = Approvals screen se khula (wahi approval request, engine se) — parent band karta hai.
  const decide = async (st, note) => {
    setBusy(true); setMsg("");
    const r = onDecide
      ? await Promise.resolve(onDecide(st, note)).catch((e) => ({ message: e.message }))
      : await api.patch("/design/drawings/" + drawing.id + "/status", { status: st, note: note || null }).catch((e) => ({ message: e.message }));
    setBusy(false);
    if (r && r.success && onDecide) return;
    if (r && r.success) { setRevise(null); await load(); if (onChanged) onChanged(); }
    else setMsg((r && r.message) || t("dmark.galti"));
  };

  const overlay = (page) => (
    <>
      {shown.filter((m) => m.page === page).map((m) => (
        <MarkShape key={m.id} m={m} selected={sel === m.id} old={m.version !== version} onClick={pick} />
      ))}
      {draft && draft.page === page && (
        <>
          {draft.kind === "box"
            ? <div style={{ position: "absolute", left: draft.x * 100 + "%", top: draft.y * 100 + "%", width: draft.w * 100 + "%", height: draft.h * 100 + "%", border: "2.5px dashed " + C.blu, background: "rgba(37,99,235,.08)" }} />
            : <div style={{ position: "absolute", left: draft.x * 100 + "%", top: draft.y * 100 + "%", width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: "50%", background: C.blu, boxShadow: "0 0 0 4px rgba(37,99,235,.3)" }} />}
        </>
      )}
    </>
  );

  const toolBtn = (id, label, title) => (
    <button type="button" title={title} onClick={() => { setTool(id); setDraft(null); }}
      style={{ border: "none", borderRadius: 8, height: 34, padding: "0 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: "none", whiteSpace: "nowrap",
        background: tool === id ? "#fff" : "rgba(255,255,255,.12)", color: tool === id ? C.ink : "#fff" }}>{label}</button>
  );
  const chip = (id, label, n) => (
    <button type="button" onClick={() => setFilter(id)}
      style={{ border: "1px solid " + (filter === id ? C.blu : C.line), background: filter === id ? "#EFF6FF" : "#fff", color: filter === id ? C.blu : C.sub,
        borderRadius: 16, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label} {n}</button>
  );

  // Portal se seedha body me — kisi parent ka transform "fixed" ko us parent me
  // chipka deta hai (app ki screen), aur focus par poora review khisak jaata tha.
  return createPortal((
    <div style={{ position: "fixed", inset: 0, zIndex: 10050, display: "flex", flexDirection: "column", background: "#1F2329", overflow: "hidden" }}>
      <BackClose onClose={onClose} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#111827", color: "#fff" }}>
        <button type="button" onClick={onClose} title={t("common.close")}
          style={{ border: "none", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 8, height: 34, width: 34, fontSize: 16, cursor: "pointer" }}>✕</button>
        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
          <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{drawing.title}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.65)", display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{drawing.project_name || ""}</span>
            <span style={{ fontWeight: 800, borderRadius: 8, padding: "0 7px", whiteSpace: "nowrap", flex: "none",
              background: status === "Approved" ? "rgba(5,150,105,.3)" : status === "Revision" ? "rgba(217,119,6,.35)" : "rgba(255,255,255,.15)",
              color: status === "Approved" ? "#A7F3D0" : status === "Revision" ? "#FDE68A" : "#fff" }}>
              {status === "Approved" ? t("dmark.st_approved") : status === "Revision" ? t("dmark.st_revision") : status === "Rejected" ? t("dmark.st_rejected") : t("dmark.st_pending")}
            </span>
          </div>
        </div>
        <select value={version} onChange={(e) => { setVersion(e.target.value); setDraft(null); setTool(null); setSel(null); }}
          style={{ height: 34, borderRadius: 8, border: "none", padding: "0 8px", fontWeight: 700, fontSize: 13 }}>
          {versions.map((v) => <option key={v} value={v}>{v}{v === current ? " · " + t("dmark.abhi_wala") : ""}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px 8px", background: "#111827", color: "#fff",
        overflowX: "auto", flexWrap: narrow ? "nowrap" : "wrap", WebkitOverflowScrolling: "touch" }}>
        {isCurrent ? (
          <div style={{ display: "flex", gap: 6, flex: "none" }}>
            {toolBtn(null, "✋", t("dmark.hilao"))}
            {toolBtn("pin", "📍 " + t("dmark.pin"), t("dmark.pin_title"))}
            {toolBtn("box", "▭ " + t("dmark.box"), t("dmark.box_title"))}
            {toolBtn("text", "T " + t("dmark.text"), t("dmark.text_title"))}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "#FDE68A" }}>{t("dmark.purana_version_sirf_dekho")}</span>
        )}
        {src && <a href={src} target="_blank" rel="noreferrer" download style={{ color: "#fff", fontSize: 12.5, fontWeight: 700, textDecoration: "none", padding: "0 6px", flex: "none", whiteSpace: "nowrap" }}>{t("design.download")}</a>}
        {versions.length > 1 && (
          <button type="button" onClick={() => setCompare(true)} title={t("dmark.milao_title")}
            style={{ border: "none", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 8, height: 34, padding: "0 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: "none" }}>⇄ {t("dmark.milao")}</button>
        )}
        <button type="button" onClick={() => setPdf({ title: t("dmark.report_title", { v: version }), path: "/design/drawings/" + drawing.id + "/marks-report?version=" + encodeURIComponent(version), filename: drawing.title + " " + version + " marks.pdf" })}
          style={{ border: "none", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 8, height: 34, padding: "0 12px", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: "none" }}>📄 {t("dmark.report")}</button>
        {status === "Approved" && isCurrent && (
          <button type="button" onClick={() => setPdf({ title: t("dmark.approved_copy"), path: "/design/drawings/" + drawing.id + "/approved-pdf", filename: drawing.title + " " + current + " APPROVED.pdf" })}
            style={{ border: "none", background: "rgba(5,150,105,.25)", color: "#A7F3D0", borderRadius: 8, height: 34, padding: "0 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", flex: "none" }}>✅ {t("dmark.approved_copy")}</button>
        )}
        {!narrow && canApprove && (
          <button type="button" disabled={busy} onClick={approveNow}
            style={{ border: "none", background: C.resolved, color: "#fff", borderRadius: 8, height: 34, padding: "0 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", flex: "none" }}>{t("common.approve")}</button>
        )}
        {!narrow && canRevise && (
          <button type="button" disabled={busy} onClick={startRevise}
            style={{ border: "none", background: C.fixed, color: "#fff", borderRadius: 8, height: 34, padding: "0 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", flex: "none" }}>{t("dmark.revise_bhejo")}</button>
        )}
      </div>
      {tool && (
        <div style={{ background: "#2563EB", color: "#fff", fontSize: 12.5, padding: "6px 12px" }}>
          {tool === "box" ? t("dmark.hint_box") : tool === "text" ? t("dmark.hint_text") : t("dmark.hint_pin")}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: narrow ? "column" : "row" }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: "relative" }}>
          {/* Likhne ka dabba viewer ke kone me — point kahin bhi ho, dabba hamesha dikhe. */}
          {draft && (
            <div style={{ position: "absolute", left: narrow ? 8 : 14, right: narrow ? 8 : "auto", bottom: narrow ? 8 : 14, zIndex: 20 }}>
              <Composer draft={draft} busy={busy} onSave={save} onCancel={() => setDraft(null)} canIssue={!!drawing.project_id} />
            </div>
          )}
          {src ? (
            <DocViewer src={src} kind={kind} overlay={overlay} mode={tool && !draft ? tool : null} onPlace={place} jumpTo={jump} />
          ) : (
            <div style={{ color: "#fff", padding: 40, textAlign: "center" }}>{t("dmark.file_nahi")}</div>
          )}
        </div>
        <aside style={narrow
          ? { flex: "none", height: sheet ? "48vh" : 46, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column", borderTopLeftRadius: 12, borderTopRightRadius: 12, transition: "height .2s" }
          : { flex: "none", width: 360, height: "100%", background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", borderBottom: "1px solid " + C.line, alignItems: "center" }}>
            {narrow && (
              <button type="button" onClick={() => setSheet((x) => !x)} title={t("dmark.list_kholo")}
                style={{ border: "none", background: "none", width: 44, height: 44, fontSize: 16, color: C.sub, cursor: "pointer", flex: "none" }}>{sheet ? "▼" : "▲"}</button>
            )}
            {[["marks", t("dmark.mark_n", { n: counts.all })], ["history", t("dmark.itihaas")]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setTab(id); if (narrow) setSheet(true); }}
                style={{ flex: 1, border: "none", background: "none", padding: "11px 0", fontSize: 13, fontWeight: 800, cursor: "pointer",
                  color: tab === id ? C.blu : C.sub, borderBottom: "2px solid " + (tab === id ? C.blu : "transparent") }}>{label}</button>
            ))}
          </div>
          {msg && <div style={{ margin: 10, padding: "7px 10px", background: "#FEF2F2", color: C.open, borderRadius: 8, fontSize: 12.5 }}>{msg}</div>}
          {tab === "marks" ? (
            <>
              <div style={{ display: "flex", gap: 6, padding: "10px 10px 4px", flexWrap: "wrap" }}>
                {chip("open", t("dmark.khule"), counts.open)}
                {chip("fixed", t("dmark.theek_kiya"), counts.fixed)}
                {chip("resolved", t("dmark.pakka"), counts.resolved)}
                {chip("all", t("dmark.sab"), counts.all)}
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 10 }}>
                {!listed.length && (
                  <div style={{ fontSize: 12.5, color: C.sub, textAlign: "center", padding: "24px 8px", lineHeight: 1.5 }}>
                    {isCurrent ? t("dmark.koi_mark_nahi_kaise") : t("dmark.is_version_par_koi_nahi")}
                  </div>
                )}
                {listed.map((m) => (
                  <MarkCard key={m.id} m={m} events={data.events} me={me} selected={sel === m.id} old={m.version !== version}
                    onSelect={pick} onAct={act} onDelete={del} busy={busy} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
              {!timeline && <div style={{ fontSize: 12.5, color: C.sub }}>{t("common.loading")}</div>}
              {timeline && !timeline.length && <div style={{ fontSize: 12.5, color: C.sub }}>{t("dmark.itihaas_khaali")}</div>}
              {(timeline || []).map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 12 }}>
                  <div style={{ width: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", marginTop: 3,
                      background: it.type === "version" ? C.blu : it.type === "mark" ? (C[it.action === "resolved" ? "resolved" : it.action === "fixed" ? "fixed" : "open"]) : C.fixed }} />
                    <span style={{ flex: 1, width: 2, background: C.line }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: C.ink, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>
                      {it.type === "version" ? t("dmark.tl_version", { v: it.version })
                        : it.type === "mark" ? "#" + it.seq + " · " + (ACTION_LABEL[it.action] ? ACTION_LABEL[it.action]() : it.action)
                        : it.type === "client_note" ? t("dmark.tl_client") : t("dmark.tl_revise")}
                    </div>
                    <div style={{ color: C.sub, fontSize: 11.5 }}>{it.user_name || "—"}{it.version && it.type === "mark" ? " · " + it.version : ""} · {fmtWhen(it.created_at)}</div>
                    {it.note && <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 2 }}>{it.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      {narrow && (canApprove || canRevise) && (
        <div style={{ flex: "none", display: "flex", gap: 8, padding: "8px 10px calc(env(safe-area-inset-bottom, 0px) + 8px)", background: "#fff", borderTop: "1px solid " + C.line }}>
          {msg && !sheet && <div style={{ position: "absolute", left: 10, right: 10, bottom: 64, padding: "7px 10px", background: "#FEF2F2", color: C.open, borderRadius: 8, fontSize: 12.5 }}>{msg}</div>}
          {canRevise && (
            <button type="button" disabled={busy} onClick={startRevise}
              style={{ flex: 1, border: "1.5px solid " + C.fixed, background: "#fff", color: C.fixed, borderRadius: 10, height: 44, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{t("dmark.revise_bhejo")}</button>
          )}
          {canApprove && (
            <button type="button" disabled={busy} onClick={approveNow}
              style={{ flex: 1.4, border: "none", background: C.resolved, color: "#fff", borderRadius: 10, height: 44, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{t("common.approve")}</button>
          )}
        </div>
      )}

      {pdf && <PdfModal title={pdf.title} path={pdf.path} filename={pdf.filename} onClose={() => setPdf(null)} />}
      {compare && (() => {
        // Chuna hua version vs usse pichhla (sabse purana chuna ho to agla).
        const asc = [...versions].sort((x, y) => vNum(x) - vNum(y));
        const i = asc.indexOf(version);
        const [a, b] = i > 0 ? [asc[i - 1], asc[i]] : [asc[0], asc[1]];
        const fileOf = (v) => {
          if (v === current) return (full && (full.pdf_url || full.file_url)) || drawing.pdf_url || drawing.file_url;
          const r = ((full && full.versions) || []).find((x) => x.version_number === v);
          return r && (r.pdf_url || r.file_url);
        };
        return <DrawingCompare oldV={{ label: a, src: fileOf(a) }} newV={{ label: b, src: fileOf(b) }} onClose={() => setCompare(false)} />;
      })()}
      {revise != null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10060, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, width: 480, maxWidth: "100%", padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.ink, marginBottom: 4 }}>{t("dmark.revise_bhejo")}</div>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 8 }}>{openNow.length ? t("dmark.revise_mark_saath", { n: openNow.length }) : t("dmark.revise_bina_mark")}</div>
            <textarea autoFocus rows={7} value={revise} onChange={(e) => setRevise(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid " + C.line, borderRadius: 8, padding: 8, fontSize: 13, fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" onClick={() => setRevise(null)} style={{ border: "1px solid " + C.line, background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>{t("common.cancel")}</button>
              <button type="button" disabled={busy || !revise.trim()} onClick={() => decide("Revision", revise.trim())}
                style={{ border: "none", background: C.fixed, color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: busy || !revise.trim() ? 0.5 : 1 }}>{t("dmark.bhejo")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  ), document.body);
}
