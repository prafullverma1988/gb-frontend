// ════════════════════════════════════════════════════════════════
// CRM Package Quote — Document (client ki copy) (15 Nov 2026, Prafull)
//
// Quote banate waqt package ka poora document is quote me COPY hota hai.
// Yahan ke badlaav (haath se tap karke, ya "AI se badlo") SIRF is client ke
// quote me — master package waisa hi rehta hai. Sirf Draft me; bheje gaye
// quote me padhne ke liye. Document PDF jaisa: header bhara, rate line par
// qty / amount, TOTAL, PAYMENT SCHEDULE (PackageDocument ka `fill`).
// AI: POST /sales-quotes/:id/ai/edit → job (/sales-quotes/ai/jobs/:jid) →
// diff card (Round 1 wala AiDiffCard) → tick karke Lagao → server par seedha
// lagta hai (edit_seq badhta hai) → taaza quote. Unsaved badlaav ho to pehle
// Save (AI save hue quote par chalta hai, warna job "stale").
// ════════════════════════════════════════════════════════════════
import { useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { T, btn, inp, card, Spinner, ErrBox } from "./pkgUi";
import { useJobPoll } from "./pkgUtil";
import { QBASE } from "./quoteUtil";
import PackageDocument from "./PackageDocument";
import PackageEditModal from "./PackageEditModal";
import { AiDiffCard, JobProgress } from "./PackageAiPanel";

function QuoteAiEdit({ quoteId, content, blocked, onApplied }) {
  const [instruction, setInstruction] = useState("");
  const [jobId, setJobId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { job, fail, elapsed, setJob } = useJobPoll(jobId, 2500, QBASE);

  const start = async (text) => {
    const ins = String(text || "").trim();
    if (!ins) return;
    setBusy(true); setErr("");
    const r = await api.post(`${QBASE}/${quoteId}/ai/edit`, { instruction: ins }, { timeoutMs: 30000 });
    setBusy(false);
    if (r && r.success && r.data && r.data.job_id) setJobId(r.data.job_id);
    else setErr((r && r.message) || t("sales_quote_ui.ai_failed"));
  };
  const reset = () => { setJobId(null); setErr(""); };
  const reject = async () => {
    if (!jobId) return;
    setBusy(true);
    await api.post(`${QBASE}/ai/jobs/${jobId}/reject`, {});
    setBusy(false);
    reset();
  };
  const apply = async (idx) => {
    setBusy(true); setErr("");
    const r = await api.post(`${QBASE}/ai/jobs/${jobId}/apply`, { op_indexes: idx }, { timeoutMs: 30000 });
    setBusy(false);
    if (r && r.success) {
      window.toast?.success?.(t("sales_quote_ui.ai_edit_applied", { n: ((r.data && r.data.applied) || idx).length }));
      setInstruction(""); reset();
      if (onApplied) onApplied();
    } else if (r && r.code === "STALE") {
      setJob((j) => (j ? { ...j, stale: true } : j));
      setErr(r.message || t("sales_quote_ui.ai_stale"));
    } else setErr((r && r.message) || t("sales_quote_ui.ai_failed"));
  };

  if (jobId) {
    if (fail) return <><ErrBox>{fail}</ErrBox><button type="button" onClick={reset} style={btn()}>{t("sales_quote_ui.back")}</button></>;
    if (!job || job.status === "running") return <JobProgress elapsed={elapsed} hint={t("sales_quote_ui.ai_edit_wait")} onCancel={reject} />;
    if (job.status === "failed") {
      return (
        <div>
          <ErrBox>{job.error || t("sales_quote_ui.ai_failed")}</ErrBox>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => start(instruction)} disabled={busy} style={btn("ai", busy)}>↻ {t("sales_quote_ui.try_again")}</button>
            <button type="button" onClick={reset} style={btn()}>{t("sales_quote_ui.back")}</button>
          </div>
        </div>
      );
    }
    if (job.status === "done" || job.stale) {
      return (
        <div>
          <div style={{ fontSize: 12, color: T.t3, marginBottom: 6 }}>📝 {instruction}</div>
          <AiDiffCard job={job} content={content} busy={busy} onApply={apply} onReject={reject}
            onRetry={() => { setJobId(null); start(instruction); }} />
          <ErrBox>{err}</ErrBox>
        </div>
      );
    }
    return <button type="button" onClick={reset} style={btn()}>{t("sales_quote_ui.back")}</button>;
  }
  return (
    <div>
      <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 8, lineHeight: 1.45 }}>{t("sales_quote_ui.ai_edit_intro")}</div>
      <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={t("sales_quote_ui.ai_edit_ph")} disabled={!!blocked}
        data-testid="ai-edit-text" style={{ ...inp, minHeight: 80, resize: "vertical", lineHeight: 1.45 }} />
      {blocked ? <ErrBox tone="amber">{blocked}</ErrBox> : null}
      <ErrBox>{err}</ErrBox>
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={() => start(instruction)} disabled={busy || !instruction.trim() || !!blocked} data-testid="btn-ai-edit"
          style={btn("ai", busy || !instruction.trim() || !!blocked, true)}>
          {busy ? <Spinner size={13} color={T.pur} /> : "✨"} {t("sales_quote_ui.ai_edit_btn")}
        </button>
      </div>
    </div>
  );
}

export default function QuoteDocPanel({ quoteId, content, letterhead, fill, editable, dirty, onContent, onReload }) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [target, setTarget] = useState(null);
  const canEdit = !!editable;
  return (
    <div style={{ ...card, padding: 0, marginBottom: 12, overflow: "hidden" }} data-testid="qt-doc">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="btn-doc-toggle"
        style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, padding: "13px 14px", borderWidth: 0, background: T.surface, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: T.t1 }}>📄 {t("sales_quote_ui.doc_title")}</span>
          <span style={{ display: "block", fontSize: 12, color: T.t3, marginTop: 2, lineHeight: 1.4 }}>{t("sales_quote_ui.doc_sub")}</span>
        </span>
        <span style={{ fontSize: 16, color: T.t3 }}>{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div style={{ padding: "0 12px 12px" }}>
          <div style={{ background: T.bluL, border: "1px solid " + T.bluM, borderRadius: 10, padding: "8px 11px", fontSize: 12.5, color: T.blu, lineHeight: 1.45, marginBottom: 10 }}>
            ℹ {t("sales_quote_ui.doc_client_only")}
          </div>
          {canEdit ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <button type="button" onClick={() => setEditMode((s) => !s)} data-testid="btn-doc-edit" style={btn(editMode ? "primary" : "soft")}>
                ✎ {editMode ? t("sales_quote_ui.doc_edit_off") : t("sales_quote_ui.doc_edit_on")}
              </button>
              <button type="button" onClick={() => setShowAi((s) => !s)} data-testid="btn-doc-ai" style={btn(showAi ? "ai" : "plain")}>✨ {t("sales_quote_ui.ai_edit_title")}</button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: T.t4, marginBottom: 8 }}>{t("sales_quote_ui.doc_locked")}</div>
          )}
          {canEdit && editMode ? <div style={{ fontSize: 12, color: T.blu, marginBottom: 8 }}>{t("sales_quote_ui.doc_edit_hint")}</div> : null}
          {canEdit && showAi ? (
            <div style={{ border: "1px solid #DDD6FE", borderRadius: 12, padding: 12, marginBottom: 10, background: "#FBFAFF" }}>
              <QuoteAiEdit quoteId={quoteId} content={content} blocked={dirty ? t("sales_quote_ui.ai_edit_dirty") : ""} onApplied={onReload} />
            </div>
          ) : null}
          <div style={{ background: "#fff", border: "1px solid " + T.b1, borderRadius: 12, overflow: "hidden" }}>
            <PackageDocument content={content} letterhead={letterhead} fill={fill} editable={canEdit && editMode}
              onEdit={(path) => setTarget({ act: "edit", path })} onAdd={(container) => setTarget({ act: "add", container })} />
          </div>
        </div>
      ) : null}
      {target && content ? <PackageEditModal content={content} target={target} onApply={(c) => { onContent(c); setTarget(null); }} onClose={() => setTarget(null)} /> : null}
    </div>
  );
}
