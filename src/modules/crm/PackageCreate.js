// ════════════════════════════════════════════════════════════════
// CRM Packages — naya package (14 Nov 2026, Prafull). Sirf Admin.
//
//   template — ready sheet (Premium / Signature …), naam + rate badal sakte ho
//   copy     — maujooda package ki copy (aksar naya isi se banta hai)
//   ai       — likho kaisa package chahiye (base: template / package) → AI job
//              (1-3 min, poll) → padh kar naam / rate → "Package banao"
//   pdf      — purani package sheet ki PDF (≤ 7 MB, text wali) → AI padhta hai
// AI / PDF wala package hamesha Draft aata hai — jaanch ke baad "Jaanch ho gayi".
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import PickSelect from "../../components/PickSelect";
import { T, btn, inp, chip, card, Field, ErrBox, Loading, Spinner } from "./pkgUi";
import { BASE, inr, readFileB64, useJobPoll } from "./pkgUtil";
import { JobProgress } from "./PackageAiPanel";
import PackageDocument from "./PackageDocument";

const MAX_PDF = 7 * 1024 * 1024;
const numOrUndef = (v) => {
  const s = String(v == null ? "" : v).replace(/[₹,\s]/g, "");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const tplName = (n) => String(n || "").replace(/\s*\(.*\)\s*$/, "").replace(/^Ghar — /, "");

function RateInputs({ full, setFull, struct, setStruct }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Field label={t("sales_pkg_ui.f_rate_full")} style={{ flex: "1 1 140px" }}>
        <input style={inp} inputMode="decimal" value={full} onChange={(e) => setFull(e.target.value)} name="rate_full" />
      </Field>
      <Field label={t("sales_pkg_ui.f_rate_structure")} style={{ flex: "1 1 140px" }}>
        <input style={inp} inputMode="decimal" value={struct} onChange={(e) => setStruct(e.target.value)} name="rate_structure" />
      </Field>
    </div>
  );
}

function Head({ title, sub, onBack }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <button type="button" onClick={onBack} style={btn()}>← {t("sales_pkg_ui.back_list")}</button>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, marginTop: 10 }}>{title}</div>
      {sub ? <div style={{ fontSize: 12.5, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{sub}</div> : null}
    </div>
  );
}

// ── Template se ──
function FromTemplate({ onDone, onBack }) {
  const [tpls, setTpls] = useState(null);
  const [pick, setPick] = useState(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [full, setFull] = useState("");
  const [struct, setStruct] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    api.get(`${BASE}/templates`).then((r) => { if (alive) { setTpls(r && r.success ? r.data || [] : []); if (!(r && r.success)) setErr((r && r.message) || t("sales_pkg_ui.load_failed")); } });
    return () => { alive = false; };
  }, []);
  const choose = (x) => {
    setPick(x); setName(tplName(x.name)); setTagline(x.tagline || "");
    setFull(x.rate_full != null ? String(x.rate_full) : ""); setStruct(x.rate_structure != null ? String(x.rate_structure) : "");
  };
  const create = async () => {
    const rf = numOrUndef(full), rs = numOrUndef(struct);
    if (Number.isNaN(rf) || Number.isNaN(rs)) { setErr(t("sales_pkg_ui.err_rate_number")); return; }
    if (!name.trim()) { setErr(t("sales_pkg_ui.err_name")); return; }
    setBusy(true); setErr("");
    const r = await api.post(BASE, { mode: "template", template_key: pick.key, name: name.trim(), tagline: tagline.trim() || undefined, rate_full: rf, rate_structure: rs });
    setBusy(false);
    if (r && r.success && r.data) onDone(r.data.id); else setErr((r && r.message) || t("sales_pkg_ui.save_failed"));
  };
  return (
    <div>
      <Head title={t("sales_pkg_ui.new_template")} sub={t("sales_pkg_ui.new_template_sub")} onBack={onBack} />
      {tpls == null ? <Loading /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))", gap: 10, marginBottom: 14 }}>
          {tpls.map((x) => (
            <button key={x.key} type="button" onClick={() => choose(x)} data-tpl={x.key}
              style={{ ...card, textAlign: "left", cursor: "pointer", fontFamily: "inherit", border: "2px solid " + (pick && pick.key === x.key ? T.blu : T.b1), background: pick && pick.key === x.key ? T.bluL : T.surface }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>{x.name}</div>
              {x.tagline ? <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{x.tagline}</div> : null}
              {x.rate_full != null ? <div style={{ fontSize: 15, fontWeight: 800, color: T.blu, marginTop: 6 }}>{t("sales_pkg_ui.rate_per_unit", { rate: inr(x.rate_full), unit: "sq.ft." })}</div> : null}
              {x.rate_structure != null ? <div style={{ fontSize: 12, color: T.t3 }}>{t("sales_pkg_ui.structure_only", { rate: inr(x.rate_structure) })}</div> : null}
              {x.summary ? <div style={{ fontSize: 11.5, color: T.t3, marginTop: 6, lineHeight: 1.45 }}>{x.summary}</div> : null}
            </button>
          ))}
        </div>
      )}
      {pick ? (
        <div style={card}>
          <Field label={t("sales_pkg_ui.f_pkg_name")}><input style={inp} value={name} onChange={(e) => setName(e.target.value)} name="name" /></Field>
          <Field label={t("sales_pkg_ui.f_tagline")}><input style={inp} value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field>
          <RateInputs full={full} setFull={setFull} struct={struct} setStruct={setStruct} />
          <ErrBox>{err}</ErrBox>
          <button type="button" onClick={create} disabled={busy} style={{ ...btn("primary", busy, true), width: "100%" }}>{busy ? <Spinner size={14} color="white" /> : null} {t("sales_pkg_ui.create_btn")}</button>
        </div>
      ) : <ErrBox>{err}</ErrBox>}
    </div>
  );
}

// ── Copy karke ──
function FromCopy({ packages, fromId, onDone, onBack }) {
  const [src, setSrc] = useState(String(fromId || (packages[0] && packages[0].id) || ""));
  const from = packages.find((p) => String(p.id) === src);
  const [name, setName] = useState("");
  const [full, setFull] = useState(from && from.rate_full != null ? String(from.rate_full) : "");
  const [struct, setStruct] = useState(from && from.rate_structure != null ? String(from.rate_structure) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const change = (v) => {
    setSrc(v);
    const p = packages.find((x) => String(x.id) === v);
    setFull(p && p.rate_full != null ? String(p.rate_full) : ""); setStruct(p && p.rate_structure != null ? String(p.rate_structure) : "");
  };
  const create = async () => {
    if (!from) return;
    const rf = numOrUndef(full), rs = numOrUndef(struct);
    if (Number.isNaN(rf) || Number.isNaN(rs)) { setErr(t("sales_pkg_ui.err_rate_number")); return; }
    setBusy(true); setErr("");
    const body = { mode: "copy", from_id: from.id, name: name.trim() || undefined };
    if (rf !== undefined && rf !== from.rate_full) body.rate_full = rf;
    if (rs !== undefined && rs !== from.rate_structure) body.rate_structure = rs;
    const r = await api.post(BASE, body);
    setBusy(false);
    if (r && r.success && r.data) onDone(r.data.id); else setErr((r && r.message) || t("sales_pkg_ui.save_failed"));
  };
  return (
    <div>
      <Head title={t("sales_pkg_ui.new_copy")} sub={t("sales_pkg_ui.new_copy_sub")} onBack={onBack} />
      {!packages.length ? <ErrBox tone="amber">{t("sales_pkg_ui.no_packages_to_copy")}</ErrBox> : (
        <div style={card}>
          <Field label={t("sales_pkg_ui.copy_from")}>
            <PickSelect value={src} onChange={(e) => change(e.target.value)} style={inp}>
              {packages.map((p) => <option key={p.id} value={String(p.id)}>{p.name}{p.rate_full != null ? " · ₹" + inr(p.rate_full) : ""}</option>)}
            </PickSelect>
          </Field>
          <Field label={t("sales_pkg_ui.f_new_name")} hint={t("sales_pkg_ui.copy_name_hint")}>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} name="name" placeholder={from ? t("sales_pkg_ui.copy_name_ph", { name: from.name }) : ""} />
          </Field>
          <RateInputs full={full} setFull={setFull} struct={struct} setStruct={setStruct} />
          {from && from.status !== "checked" ? <ErrBox tone="amber">{t("sales_pkg_ui.copy_of_draft")}</ErrBox> : null}
          <ErrBox>{err}</ErrBox>
          <button type="button" onClick={create} disabled={busy || !from} style={{ ...btn("primary", busy || !from, true), width: "100%" }}>{busy ? <Spinner size={14} color="white" /> : null} {t("sales_pkg_ui.create_copy_btn")}</button>
        </div>
      )}
    </div>
  );
}

// ── AI / PDF ka nateeja: preview + naam / rate → apply ──
function JobResult({ job, letterhead, onApplied, onReject }) {
  const [name, setName] = useState(job.name || "");
  const [tagline, setTagline] = useState(job.tagline || "");
  const [full, setFull] = useState(job.rate_full != null ? String(job.rate_full) : "");
  const [struct, setStruct] = useState(job.rate_structure != null ? String(job.rate_structure) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const apply = async () => {
    const rf = numOrUndef(full), rs = numOrUndef(struct);
    if (Number.isNaN(rf) || Number.isNaN(rs)) { setErr(t("sales_pkg_ui.err_rate_number")); return; }
    if (!name.trim()) { setErr(t("sales_pkg_ui.err_name")); return; }
    setBusy(true); setErr("");
    const r = await api.post(`${BASE}/ai/jobs/${job.id}/apply`, { name: name.trim(), tagline: tagline.trim() || undefined, rate_full: rf, rate_structure: rs }, { timeoutMs: 30000 });
    setBusy(false);
    if (r && r.success && r.data && r.data.package_id) onApplied(r.data.package_id);
    else setErr((r && r.message) || t("sales_pkg_ui.save_failed"));
  };
  const reject = async () => { setBusy(true); await api.post(`${BASE}/ai/jobs/${job.id}/reject`, {}); setBusy(false); onReject(); };
  return (
    <div data-testid="job-result">
      <ErrBox tone="amber">{t("sales_pkg_ui.ai_result_check")}</ErrBox>
      <div style={{ ...card, marginBottom: 12 }}>
        <Field label={t("sales_pkg_ui.f_pkg_name")}><input style={inp} value={name} onChange={(e) => setName(e.target.value)} name="name" /></Field>
        <Field label={t("sales_pkg_ui.f_tagline")}><input style={inp} value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field>
        <RateInputs full={full} setFull={setFull} struct={struct} setStruct={setStruct} />
        <ErrBox>{err}</ErrBox>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={reject} disabled={busy} style={{ ...btn("danger", busy, true), flex: "1 1 120px" }}>{t("sales_pkg_ui.reject_btn")}</button>
          <button type="button" onClick={apply} disabled={busy} style={{ ...btn("primary", busy, true), flex: "2 1 200px" }}>{busy ? <Spinner size={14} color="white" /> : null} {t("sales_pkg_ui.create_draft_btn")}</button>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, margin: "4px 0 6px", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("sales_pkg_ui.preview")}</div>
      <div style={{ background: "#fff", border: "1px solid " + T.b1, borderRadius: 12, overflow: "hidden" }}>
        <PackageDocument content={job.content} letterhead={letterhead} />
      </div>
    </div>
  );
}

function JobFlow({ jobId, hint, letterhead, onApplied, onReset }) {
  const { job, fail, elapsed } = useJobPoll(jobId);
  const cancel = async () => { await api.post(`${BASE}/ai/jobs/${jobId}/reject`, {}); onReset(); };
  if (fail) return <><ErrBox>{fail}</ErrBox><button type="button" onClick={onReset} style={btn()}>{t("sales_pkg_ui.try_again")}</button></>;
  if (!job || job.status === "running") return <JobProgress elapsed={elapsed} hint={hint} onCancel={cancel} />;
  if (job.status === "failed") return <><ErrBox>{job.error || t("sales_pkg_ui.ai_failed")}</ErrBox><button type="button" onClick={onReset} style={btn("ai")}>↻ {t("sales_pkg_ui.try_again")}</button></>;
  if (job.status === "done" && job.content) return <JobResult job={job} letterhead={letterhead} onApplied={onApplied} onReject={onReset} />;
  if (job.status === "applied" && job.package_id) return <button type="button" onClick={() => onApplied(job.package_id)} style={btn("primary")}>{t("sales_pkg_ui.open_pkg")}</button>;
  return <><ErrBox>{t("sales_pkg_ui.ai_failed")}</ErrBox><button type="button" onClick={onReset} style={btn()}>{t("sales_pkg_ui.try_again")}</button></>;
}

// ── AI se banao ──
function FromAi({ packages, letterhead, onDone, onBack }) {
  const [tpls, setTpls] = useState([]);
  const [desc, setDesc] = useState("");
  const [base, setBase] = useState("");
  const [jobId, setJobId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    api.get(`${BASE}/templates`).then((r) => { if (alive && r && r.success) setTpls(r.data || []); });
    return () => { alive = false; };
  }, []);
  const start = async () => {
    if (!desc.trim()) { setErr(t("sales_pkg_ui.err_desc")); return; }
    setBusy(true); setErr("");
    const body = { description: desc.trim() };
    if (base.startsWith("tpl:")) body.template_key = base.slice(4);
    if (base.startsWith("pkg:")) body.from_id = Number(base.slice(4));
    const r = await api.post(`${BASE}/ai/create`, body, { timeoutMs: 30000 });
    setBusy(false);
    if (r && r.success && r.data && r.data.job_id) setJobId(r.data.job_id); else setErr((r && r.message) || t("sales_pkg_ui.ai_failed"));
  };
  return (
    <div>
      <Head title={t("sales_pkg_ui.new_ai")} sub={t("sales_pkg_ui.new_ai_sub")} onBack={onBack} />
      {jobId ? <JobFlow jobId={jobId} hint={t("sales_pkg_ui.create_wait_hint")} letterhead={letterhead} onApplied={onDone} onReset={() => setJobId(null)} /> : (
        <div style={card}>
          <Field label={t("sales_pkg_ui.f_ai_desc")}>
            <textarea style={{ ...inp, minHeight: 130, resize: "vertical", lineHeight: 1.45 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("sales_pkg_ui.ai_desc_ph")} />
          </Field>
          <Field label={t("sales_pkg_ui.f_ai_base")} hint={t("sales_pkg_ui.ai_base_hint")}>
            <PickSelect value={base} onChange={(e) => setBase(e.target.value)} style={inp}>
              <option value="">{t("sales_pkg_ui.ai_base_none")}</option>
              {tpls.map((x) => <option key={"tpl:" + x.key} value={"tpl:" + x.key}>{t("sales_pkg_ui.ai_base_tpl", { name: x.name })}</option>)}
              {packages.map((p) => <option key={"pkg:" + p.id} value={"pkg:" + p.id}>{t("sales_pkg_ui.ai_base_pkg", { name: p.name })}</option>)}
            </PickSelect>
          </Field>
          <ErrBox>{err}</ErrBox>
          <button type="button" onClick={start} disabled={busy || !desc.trim()} style={{ ...btn("ai", busy || !desc.trim(), true), width: "100%" }}>{busy ? <Spinner size={14} color={T.pur} /> : "✨"} {t("sales_pkg_ui.ai_create_btn")}</button>
        </div>
      )}
    </div>
  );
}

// ── PDF upload karke ──
function FromPdf({ letterhead, onDone, onBack }) {
  const ref = useRef(null);
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    setErr("");
    if (!f) return;
    if (!(/\.pdf$/i.test(f.name) || f.type === "application/pdf")) { setErr(t("sales_pkg_ui.err_pdf_only")); return; }
    if (f.size > MAX_PDF) { setErr(t("sales_pkg_ui.err_pdf_big", { mb: (f.size / 1048576).toFixed(1) })); return; }
    setFile(f);
  };
  const start = async () => {
    if (!file) return;
    setBusy(true); setErr("");
    let b64 = "";
    try { b64 = await readFileB64(file); } catch (_) { setBusy(false); setErr(t("sales_pkg_ui.err_pdf_read")); return; }
    const r = await api.post(`${BASE}/ai/import`, { file_b64: b64, file_name: file.name }, { timeoutMs: 180000 });
    setBusy(false);
    if (r && r.success && r.data && r.data.job_id) setJobId(r.data.job_id); else setErr((r && r.message) || t("sales_pkg_ui.ai_failed"));
  };
  return (
    <div>
      <Head title={t("sales_pkg_ui.new_pdf")} sub={t("sales_pkg_ui.new_pdf_sub")} onBack={onBack} />
      {jobId ? <JobFlow jobId={jobId} hint={t("sales_pkg_ui.import_wait_hint")} letterhead={letterhead} onApplied={onDone} onReset={() => { setJobId(null); setFile(null); }} /> : (
        <div style={card}>
          <input ref={ref} type="file" accept="application/pdf,.pdf" style={{ display: "none" }} onChange={pick} data-testid="pdf-input" />
          <button type="button" onClick={() => ref.current && ref.current.click()}
            style={{ width: "100%", minHeight: 90, borderRadius: 10, border: "2px dashed " + T.b2, background: T.surfaceB, color: T.blu, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 14 }}>
            📄 {file ? file.name : t("sales_pkg_ui.pick_pdf")}
            {file ? <div style={{ fontSize: 11.5, color: T.t3, fontWeight: 500, marginTop: 4 }}>{t("sales_pkg_ui.pdf_size", { mb: (file.size / 1048576).toFixed(1) })}</div> : null}
          </button>
          <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6, lineHeight: 1.45 }}>{t("sales_pkg_ui.pdf_hint")}</div>
          <ErrBox>{err}</ErrBox>
          <button type="button" onClick={start} disabled={busy || !file} style={{ ...btn("ai", busy || !file, true), width: "100%", marginTop: 10 }}>
            {busy ? <Spinner size={14} color={T.pur} /> : "✨"} {busy ? t("sales_pkg_ui.uploading") : t("sales_pkg_ui.pdf_read_btn")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PackageCreate({ mode, packages, letterhead, fromId, onDone, onBack }) {
  if (mode === "template") return <FromTemplate onDone={onDone} onBack={onBack} />;
  if (mode === "copy") return <FromCopy packages={packages} fromId={fromId} onDone={onDone} onBack={onBack} />;
  if (mode === "ai") return <FromAi packages={packages} letterhead={letterhead} onDone={onDone} onBack={onBack} />;
  if (mode === "pdf") return <FromPdf letterhead={letterhead} onDone={onDone} onBack={onBack} />;
  return null;
}

// "+ New package" ke chaar raaste — list screen par menu
export function NewMenu({ onPick, onClose }) {
  const opts = [
    { id: "template", ic: "📋", lb: t("sales_pkg_ui.new_template"), sb: t("sales_pkg_ui.new_template_sub") },
    { id: "copy", ic: "⧉", lb: t("sales_pkg_ui.new_copy"), sb: t("sales_pkg_ui.new_copy_sub") },
    { id: "ai", ic: "✨", lb: t("sales_pkg_ui.new_ai"), sb: t("sales_pkg_ui.new_ai_sub") },
    { id: "pdf", ic: "📄", lb: t("sales_pkg_ui.new_pdf"), sb: t("sales_pkg_ui.new_pdf_sub") },
  ];
  return (
    <div style={{ ...card, padding: 6, marginBottom: 12 }} data-testid="new-menu">
      {opts.map((o) => (
        <button key={o.id} type="button" onClick={() => { onPick(o.id); onClose && onClose(); }}
          style={{ display: "flex", gap: 10, alignItems: "flex-start", width: "100%", textAlign: "left", padding: "10px 10px", border: "none", background: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" }}>
          <span style={{ fontSize: 18, width: 26, textAlign: "center", flexShrink: 0 }}>{o.ic}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: T.t1 }}>{o.lb}</span>
            <span style={{ display: "block", fontSize: 11.5, color: T.t3, marginTop: 1, lineHeight: 1.4 }}>{o.sb}</span>
          </span>
          {o.id === "ai" || o.id === "pdf" ? <span style={{ ...chip(T.ambL, "#92400E"), marginLeft: "auto" }}>{t("sales_pkg_ui.st_draft")}</span> : null}
        </button>
      ))}
    </div>
  );
}
