// ════════════════════════════════════════════════════════════════
// CRM Packages — AI wala hissa (14 Nov 2026, Prafull)
//
//   • AI Brief — package ka saar (sales wale ke liye)
//   • AI se poochho — sawaal → jawab; document me na ho to saaf "nahi likha"
//   • AI se badlo (Admin) — hukm likho → AI sirf PRASTAAV deta hai (job, poll
//     har 2.5 s) → har badlaav ek line: purana → naya, wajah. Paisa wali line
//     rangeen; jo number AI ne khud diya (hukm / purane me nahi tha) wo chip ke
//     saath aur BINA tick; jo jagah mili hi nahi wo band. Admin tick karke
//     "Lagao" → naya version. Beech me package badla → "stale", dobara poochho.
// Server: routes/sales-packages.js (ai/brief, ai/ask, ai/edit, ai/jobs/*).
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { T, btn, inp, chip, card, Spinner, ErrBox } from "./pkgUi";
import { AI_TIMEOUT, BASE, areaOfPath, inr, showVal, useJobPoll } from "./pkgUtil";

const opErr = (code) => ({
  PATH_NOT_FOUND: t("sales_pkg_ui.op_err_path"), FIELD_NOT_FOUND: t("sales_pkg_ui.op_err_field"),
  BAD_OP: t("sales_pkg_ui.op_err_bad"), BAD_VALUE: t("sales_pkg_ui.op_err_bad"),
}[code] || t("sales_pkg_ui.op_err_bad"));
const opChip = (op) => (op === "add" ? <span style={chip(T.grnL, T.grn)}>+ {t("sales_pkg_ui.op_add")}</span>
  : op === "remove" ? <span style={chip(T.redL, T.red)}>− {t("sales_pkg_ui.op_remove")}</span>
  : <span style={chip(T.bluL, T.blu)}>✎ {t("sales_pkg_ui.op_set")}</span>);
const valTxt = (o, v) => (o.field === "rate" && v != null && v !== "" && Number.isFinite(Number(v)) ? "₹" + inr(v) : showVal(v));

// ── Diff card: har op ek line ──
export function AiDiffCard({ job, content, busy, onApply, onReject, onRetry, applyLabel }) {
  const ops = job.ops || [];
  const [picked, setPicked] = useState(() => new Set(ops.filter((o) => o.ok && !o.invented).map((o) => o.i)));
  const toggle = (i) => setPicked((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const okOps = ops.filter((o) => o.ok);
  const stale = !!job.stale;
  return (
    <div data-testid="ai-diff">
      {job.reply ? <div style={{ background: T.purL, border: "1px solid #DDD6FE", borderRadius: 10, padding: "9px 11px", fontSize: 13, color: T.t1, lineHeight: 1.5, marginBottom: 8, whiteSpace: "pre-line" }}>🤖 {job.reply}</div> : null}
      {(job.questions || []).length ? (
        <div style={{ background: T.ambL, border: "1px solid " + T.ambM, borderRadius: 10, padding: "9px 11px", marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>{t("sales_pkg_ui.ai_questions")}</div>
          <ul style={{ margin: "0 0 0 18px", padding: 0, fontSize: 13, color: T.t1 }}>{job.questions.map((q, i) => <li key={i} style={{ margin: "2px 0" }}>{q}</li>)}</ul>
        </div>
      ) : null}
      {stale ? (
        <ErrBox tone="amber">
          {t("sales_pkg_ui.ai_stale")}
          {onRetry ? <div style={{ marginTop: 8 }}><button type="button" onClick={onRetry} disabled={busy} style={btn("ai", busy)}>↻ {t("sales_pkg_ui.ai_ask_again")}</button></div> : null}
        </ErrBox>
      ) : null}
      {!ops.length ? <div style={{ fontSize: 13, color: T.t3, padding: "8px 0" }}>{t("sales_pkg_ui.ai_no_ops")}</div> : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "4px 0 6px" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, flex: 1 }}>{t("sales_pkg_ui.ai_ops_n", { n: ops.length, ok: okOps.length })}</div>
            {!stale ? <button type="button" onClick={() => setPicked(new Set(okOps.map((o) => o.i)))} style={btn()}>{t("sales_pkg_ui.tick_all")}</button> : null}
            {!stale ? <button type="button" onClick={() => setPicked(new Set())} style={btn()}>{t("sales_pkg_ui.untick_all")}</button> : null}
          </div>
          <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "hidden" }}>
            {ops.map((o) => {
              const area = areaOfPath(content, o.path);
              const bg = !o.ok ? T.surfaceB : o.is_price ? (o.invented ? T.redL : T.ambL) : T.surface;
              return (
                <label key={o.i} data-op={o.i} style={{ display: "flex", gap: 10, padding: "10px 11px", borderTop: o.i === ops[0].i ? "none" : "1px solid " + T.b1,
                  background: bg, opacity: o.ok ? 1 : 0.6, cursor: o.ok && !stale ? "pointer" : "default", alignItems: "flex-start" }}>
                  <input type="checkbox" checked={picked.has(o.i)} disabled={!o.ok || stale} onChange={() => toggle(o.i)}
                    style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.t1, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {opChip(o.op)}
                      <b>{o.label || o.path}</b>
                      {o.field && o.op === "set" ? <span style={{ fontSize: 11, color: T.t4 }}>· {o.field}</span> : null}
                      {o.is_price ? <span style={chip(T.amb, "white")}>₹ {t("sales_pkg_ui.price_chip")}</span> : null}
                      {o.invented ? <span data-invented="1" style={chip(T.red, "white")}>⚠ {t("sales_pkg_ui.invented_chip")}</span> : null}
                    </div>
                    {area ? <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>{area}</div> : null}
                    {o.op === "set" ? (
                      <div style={{ marginTop: 3 }}>
                        <span style={{ color: T.t3, textDecoration: "line-through" }}>{valTxt(o, o.old) || "—"}</span>
                        <span style={{ color: T.t4, margin: "0 6px" }}>→</span>
                        <b style={{ color: o.is_price ? "#92400E" : T.t1 }}>{valTxt(o, o.value) || "—"}</b>
                      </div>
                    ) : o.op === "add" ? (
                      <div style={{ marginTop: 3, color: T.grn }}>+ {showVal(o.value)}</div>
                    ) : o.op === "remove" ? (
                      <div style={{ marginTop: 3, color: T.red, textDecoration: "line-through" }}>{showVal(o.old)}</div>
                    ) : null}
                    {o.reason ? <div style={{ fontSize: 11.5, color: T.t3, fontStyle: "italic", marginTop: 3 }}>{o.reason}</div> : null}
                    {!o.ok ? <div style={{ fontSize: 11.5, color: T.red, marginTop: 3 }}>{opErr(o.error)}</div> : null}
                  </div>
                </label>
              );
            })}
          </div>
          {ops.some((o) => o.invented) ? <div style={{ fontSize: 11.5, color: T.t3, marginTop: 6, lineHeight: 1.45 }}>{t("sales_pkg_ui.invented_hint")}</div> : null}
        </>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onReject} disabled={busy} style={btn("danger", busy)}>{t("sales_pkg_ui.reject_btn")}</button>
        {ops.length && !stale ? (
          <button type="button" onClick={() => onApply([...picked].sort((a, b) => a - b))} disabled={busy || !picked.size} style={btn("primary", busy || !picked.size)}>
            {busy ? <Spinner size={13} color="white" /> : null} {applyLabel || t("sales_pkg_ui.apply_n", { n: picked.size })}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Job chal raha hai ──
export function JobProgress({ elapsed, hint, onCancel }) {
  return (
    <div data-testid="ai-running" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: T.purL, border: "1px solid #DDD6FE", borderRadius: 10 }}>
      <Spinner color={T.pur} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.pur }}>{t("sales_pkg_ui.ai_working", { s: elapsed || 0 })}</div>
        {hint ? <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{hint}</div> : null}
      </div>
      {onCancel ? <button type="button" onClick={onCancel} style={btn()}>{t("sales_pkg_ui.cancel")}</button> : null}
    </div>
  );
}

// ── AI Brief ──
function AiBrief({ pkgId, versionId }) {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { setData(null); setErr(""); }, [pkgId, versionId]);
  const run = async () => {
    setBusy(true); setErr("");
    const r = await api.post(`${BASE}/ai/brief/${pkgId}`, {}, { timeoutMs: AI_TIMEOUT });
    setBusy(false);
    if (r && r.success) setData(r.data); else setErr((r && r.message) || t("sales_pkg_ui.ai_failed"));
  };
  return (
    <div>
      {!data ? (
        <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{t("sales_pkg_ui.brief_intro")}</div>
      ) : (
        <div data-testid="ai-brief" style={{ fontSize: 13.5, color: T.t1, lineHeight: 1.55 }}>
          <div style={{ marginBottom: 8, whiteSpace: "pre-line" }}>{data.summary}</div>
          {(data.highlights || []).length ? (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: T.grn, margin: "8px 0 3px" }}>{t("sales_pkg_ui.brief_highlights")}</div>
              <ul style={{ margin: "0 0 0 18px", padding: 0 }}>{data.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </>
          ) : null}
          {data.best_for ? (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: T.blu, margin: "8px 0 3px" }}>{t("sales_pkg_ui.brief_best_for")}</div>
              <div>{data.best_for}</div>
            </>
          ) : null}
          {(data.watchouts || []).length ? (
            <>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: T.amb, margin: "8px 0 3px" }}>{t("sales_pkg_ui.brief_watchouts")}</div>
              <ul style={{ margin: "0 0 0 18px", padding: 0 }}>{data.watchouts.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </>
          ) : null}
        </div>
      )}
      <ErrBox>{err}</ErrBox>
      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={run} disabled={busy} style={btn("ai", busy)}>
          {busy ? <Spinner size={13} color={T.pur} /> : "✨"} {busy ? t("sales_pkg_ui.ai_thinking") : data ? t("sales_pkg_ui.brief_again") : t("sales_pkg_ui.brief_btn")}
        </button>
      </div>
    </div>
  );
}

// ── AI se poochho ──
function AiAsk({ pkgId }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState([]);
  const [err, setErr] = useState("");
  const ask = async () => {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true); setErr("");
    const r = await api.post(`${BASE}/ai/ask`, { id: pkgId, question }, { timeoutMs: AI_TIMEOUT });
    setBusy(false);
    if (r && r.success) { setList((p) => [{ question, ...r.data }, ...p].slice(0, 10)); setQ(""); }
    else setErr((r && r.message) || t("sales_pkg_ui.ai_failed"));
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder={t("sales_pkg_ui.ask_ph")} style={{ ...inp, flex: "1 1 220px" }} />
        <button type="button" onClick={ask} disabled={busy || !q.trim()} style={btn("ai", busy || !q.trim(), true)}>
          {busy ? <Spinner size={13} color={T.pur} /> : null} {t("sales_pkg_ui.ask_btn")}
        </button>
      </div>
      <ErrBox>{err}</ErrBox>
      {list.map((a, i) => (
        <div key={i} data-testid="ai-answer" style={{ marginTop: 10, borderTop: i ? "1px solid " + T.b1 : "none", paddingTop: i ? 10 : 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.t3 }}>❓ {a.question}</div>
          <div style={{ fontSize: 13.5, color: T.t1, marginTop: 3, lineHeight: 1.55, whiteSpace: "pre-line" }}>{a.answer}</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
            {a.found === false ? <span style={chip(T.ambL, "#92400E", T.ambM)}>⚠ {t("sales_pkg_ui.not_in_doc")}</span> : null}
            {(a.sections || []).map((s, j) => <span key={j} style={chip(T.sltL, T.slt)}>{String(s)}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AI se badlo (Admin) ──
function AiEdit({ pkgId, content, blockedReason, onApplied }) {
  const [instruction, setInstruction] = useState("");
  const [jobId, setJobId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const { job, fail, elapsed, setJob } = useJobPoll(jobId);

  const start = async (text) => {
    const ins = String(text || "").trim();
    if (!ins) return;
    setBusy(true); setErr("");
    const r = await api.post(`${BASE}/ai/edit`, { id: pkgId, instruction: ins }, { timeoutMs: 30000 });
    setBusy(false);
    if (r && r.success && r.data && r.data.job_id) setJobId(r.data.job_id);
    else setErr((r && r.message) || t("sales_pkg_ui.ai_failed"));
  };
  const reset = () => { setJobId(null); setErr(""); };
  const reject = async () => {
    if (!jobId) return;
    setBusy(true);
    await api.post(`${BASE}/ai/jobs/${jobId}/reject`, {});
    setBusy(false);
    reset();
  };
  const apply = async (idx) => {
    setBusy(true); setErr("");
    const r = await api.post(`${BASE}/ai/jobs/${jobId}/apply`, { op_indexes: idx }, { timeoutMs: 30000 });
    setBusy(false);
    if (r && r.success) {
      const d = r.data || {};
      window.toast?.success?.(t("sales_pkg_ui.ai_applied", { n: (d.applied || idx).length, v: d.version_no || "" }));
      setInstruction(""); reset();
      if (onApplied) onApplied();
    } else if (r && r.code === "STALE") {
      setJob((j) => (j ? { ...j, stale: true } : j));
      setErr(r.message || t("sales_pkg_ui.ai_stale"));
    } else setErr((r && r.message) || t("sales_pkg_ui.ai_failed"));
  };

  if (jobId) {
    if (fail) return <><ErrBox>{fail}</ErrBox><button type="button" onClick={reset} style={btn()}>{t("sales_pkg_ui.back")}</button></>;
    if (!job || job.status === "running") return <JobProgress elapsed={elapsed} hint={t("sales_pkg_ui.edit_wait_hint")} onCancel={reject} />;
    if (job.status === "failed") {
      return (
        <div>
          <ErrBox>{job.error || t("sales_pkg_ui.ai_failed")}</ErrBox>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => start(instruction)} disabled={busy} style={btn("ai", busy)}>↻ {t("sales_pkg_ui.try_again")}</button>
            <button type="button" onClick={reset} style={btn()}>{t("sales_pkg_ui.back")}</button>
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
    // applied / rejected (doosre tab se) — wapas shuru
    return <button type="button" onClick={reset} style={btn()}>{t("sales_pkg_ui.back")}</button>;
  }

  return (
    <div>
      <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 8, lineHeight: 1.45 }}>{t("sales_pkg_ui.edit_intro")}</div>
      <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={t("sales_pkg_ui.edit_ph")}
        style={{ ...inp, minHeight: 90, resize: "vertical", lineHeight: 1.45 }} disabled={!!blockedReason} />
      {blockedReason ? <ErrBox tone="amber">{blockedReason}</ErrBox> : null}
      <ErrBox>{err}</ErrBox>
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={() => start(instruction)} disabled={busy || !instruction.trim() || !!blockedReason} style={btn("ai", busy || !instruction.trim() || !!blockedReason, true)}>
          {busy ? <Spinner size={13} color={T.pur} /> : "✨"} {t("sales_pkg_ui.edit_btn")}
        </button>
      </div>
    </div>
  );
}

export default function PackageAiPanel({ pkg, version, content, canEdit, dirty, viewingOld, onApplied }) {
  const [tab, setTab] = useState("brief");
  const tabs = [
    { id: "brief", lb: t("sales_pkg_ui.ai_brief") },
    { id: "ask", lb: t("sales_pkg_ui.ai_ask") },
    ...(canEdit ? [{ id: "edit", lb: t("sales_pkg_ui.ai_edit") }] : []),
  ];
  const blocked = viewingOld ? t("sales_pkg_ui.ai_edit_old_version") : dirty ? t("sales_pkg_ui.ai_edit_dirty") : "";
  return (
    <div style={{ ...card, padding: 0, marginBottom: 12, overflow: "hidden" }} data-testid="ai-panel">
      <div style={{ display: "flex", overflowX: "auto", borderBottom: "1px solid " + T.b1, background: T.surfaceB }}>
        {tabs.map((x) => (
          <button key={x.id} type="button" onClick={() => setTab(x.id)}
            style={{ padding: "11px 14px", border: "none", background: "none", fontSize: 12.5, fontWeight: tab === x.id ? 800 : 600, whiteSpace: "nowrap", cursor: "pointer",
              color: tab === x.id ? T.pur : T.t3, borderBottom: tab === x.id ? "2.5px solid " + T.pur : "2.5px solid transparent", fontFamily: "inherit", minHeight: 42 }}>
            {x.lb}
          </button>
        ))}
      </div>
      <div style={{ padding: 14 }}>
        {tab === "brief" ? <AiBrief pkgId={pkg.id} versionId={version && version.id} /> : null}
        {tab === "ask" ? <AiAsk pkgId={pkg.id} /> : null}
        {tab === "edit" && canEdit ? <AiEdit pkgId={pkg.id} content={content} blockedReason={blocked} onApplied={onApplied} /> : null}
      </div>
    </div>
  );
}
