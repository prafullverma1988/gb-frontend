// ════════════════════════════════════════════════════════════════
// CRM Package Quote — ek quote ka editor (15 Nov 2026, Prafull)
//
// Deal band ho rahi hai: package se is lead ka final estimate. Upar quote no.,
// status, TOTAL. Neeche: client details (header), scope (Poora / Structure
// only — package rate wali line ka rate), rate schedule (area / rate / naam,
// "AI se area bharo"), payment schedule (har line ke hisse, yaad), document
// (client ki copy — sirf is quote me badlaav). Neeche patti: Save (PUT
// edit_seq ke saath; 409 STALE = kisi aur ne badla → taaza; 409 LOCKED),
// PDF, Send (jam jaata hai), Share, Revision, Accept, Lost, Delete (draft),
// Estimate banao (accept ke baad — lead ka project, warna lead → project).
// Sent / Accepted = sirf padhna. Number server ke `computed` se.
// Server: gb-backend routes/sales-quotes.js, routes/sales-quotes-ai.js.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { can } from "../../utils/perms";
import { T, FONT, btn, inp, chip, card, Field, Sheet, ErrBox, Loading, Spinner } from "./pkgUi";
import { BASE, fmtD, fmtDT, inr, openPdfPath } from "./pkgUtil";
import {
  QBASE, QStatusChip, ask, normHeader, normLines, normSchedule, previewCompute, revLabel, rupee, sameLines, sameSchedule, scopeLabel,
} from "./quoteUtil";
import QuoteLines from "./QuoteLines";
import QuoteSchedule from "./QuoteSchedule";
import QuoteDocPanel from "./QuoteDocPanel";
import QuoteShare from "./QuoteShare";

const fromQ = (q) => ({ header: { ...(q.header || {}) }, scope: q.scope, lines: q.lines || {}, schedule: q.schedule || {}, content: q.content });
const sameHeader = (a, b) => JSON.stringify(normHeader(a)) === JSON.stringify(normHeader(b));

function HeaderCard({ header, editable, onHeader, builtupSum }) {
  const H = header || {};
  const set = (k, v) => onHeader({ ...H, [k]: v });
  const fields = [
    ["client_name", t("sales_quote_ui.h_client")], ["contact", t("sales_quote_ui.h_contact")], ["site_address", t("sales_quote_ui.h_site")],
    ["plot_area", t("sales_quote_ui.h_plot")], ["builtup_area", t("sales_quote_ui.h_builtup")], ["date", t("sales_quote_ui.h_date")],
  ];
  const showSum = editable && builtupSum > 0 && String(H.builtup_area || "").trim() !== String(builtupSum);
  return (
    <div style={{ ...card, marginBottom: 12 }} data-testid="qt-header">
      <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1, marginBottom: 10 }}>{t("sales_quote_ui.header_title")}</div>
      {editable ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", columnGap: 10 }}>
          {fields.map(([k, lb]) => (
            <Field key={k} label={lb}
              hint={k === "builtup_area" && showSum ? (
                <button type="button" onClick={() => set("builtup_area", String(builtupSum))} data-testid="btn-builtup-sum"
                  style={{ borderWidth: 0, background: "none", padding: 0, color: T.blu, fontWeight: 700, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  = {t("sales_quote_ui.builtup_from_lines", { sum: inr(builtupSum) })}
                </button>
              ) : null}>
              <input style={inp} name={"h_" + k} type={k === "date" ? "date" : "text"} inputMode={k === "plot_area" || k === "builtup_area" ? "decimal" : k === "contact" ? "tel" : undefined}
                value={H[k] == null ? "" : String(H[k])} onChange={(e) => set(k, e.target.value)} />
            </Field>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 8 }}>
          {fields.map(([k, lb]) => (
            <div key={k} style={{ padding: "7px 10px", background: T.surfaceB, borderRadius: 8, border: "1px solid " + T.b1 }}>
              <div style={{ fontSize: 10.5, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px" }}>{lb}</div>
              <div style={{ fontSize: 13, color: T.t1, overflowWrap: "anywhere" }}>{k === "date" && H[k] ? fmtD(H[k]) : H[k] || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScopeCard({ scopes, scope, editable, onScope }) {
  const list = scopes || [];
  if (!list.length) return null;
  return (
    <div style={{ ...card, marginBottom: 12 }} data-testid="qt-scope">
      <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1, marginBottom: 2 }}>{t("sales_quote_ui.scope_title")}</div>
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{t("sales_quote_ui.scope_hint")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 8 }}>
        {list.map((s) => {
          const on = s.key === scope;
          return (
            <button key={s.key} type="button" data-scope={s.key} aria-pressed={on} disabled={!editable && !on}
              onClick={() => editable && !on && onScope(s.key)}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: editable && !on ? "pointer" : "default", fontFamily: "inherit",
                border: "2px solid " + (on ? T.blu : T.b1), background: on ? T.bluL : T.surface, opacity: !editable && !on ? 0.55 : 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: on ? T.blu : T.t1 }}>{on ? "● " : "○ "}{scopeLabel(s.key, list)}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.t1, marginTop: 2 }}>{s.rate != null ? t("sales_quote_ui.rate_sqft", { rate: inr(s.rate) }) : "—"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Lead abhi project nahi bana — "Estimate banao" se pehle project
function ConvertSheet({ lead, total, onClose, onDone }) {
  const [name, setName] = useState(((lead && lead.name) || "") + " — Project");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (!name.trim()) { setErr(t("sales_quote_ui.err_project_name")); return; }
    setBusy(true); setErr("");
    const r = await api.post(`/crm/leads/${lead.id}/convert-to-project`, { project_name: name.trim(), boq_value: Number(total) || 0 });
    if (r && r.success && r.data && r.data.project && r.data.project.id) { await onDone(r.data.project.id); setBusy(false); return; }
    setBusy(false);
    setErr((r && r.message) || t("sales_quote_ui.convert_failed"));
  };
  return (
    <Sheet heading={t("sales_quote_ui.convert_title")} subline={lead && lead.name} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={btn()}>{t("sales_quote_ui.cancel")}</button>
        <button type="button" onClick={go} disabled={busy} data-testid="btn-convert-go" style={btn("green", busy)}>{busy ? <Spinner size={13} color="white" /> : null} {t("sales_quote_ui.convert_btn")}</button>
      </>}>
      <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{t("sales_quote_ui.convert_intro")}</div>
      <Field label={t("sales_quote_ui.f_project_name")}><input style={inp} value={name} onChange={(e) => setName(e.target.value)} name="project_name" /></Field>
      <ErrBox>{err}</ErrBox>
    </Sheet>
  );
}

export default function QuoteEditor({ quoteId, lead: leadProp, onClose, onChanged, onOpenQuote, onOpenProject, onLeadConverted }) {
  const [q, setQ] = useState(null);
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [act, setAct] = useState("");
  const [notice, setNotice] = useState("");
  const [badLines, setBadLines] = useState(() => new Set());
  const [badSched, setBadSched] = useState(() => new Set());
  const [lh, setLh] = useState(null);
  const [panel, setPanel] = useState(null);     // share | convert
  const [est, setEst] = useState(null);         // { id, no }

  const load = useCallback(async () => {
    const r = await api.get(`${QBASE}/${quoteId}`);
    if (r && r.success && r.data) { setQ(r.data); setD(fromQ(r.data)); setErr(""); setBadLines(new Set()); setBadSched(new Set()); }
    else setErr((r && r.message) || t("sales_quote_ui.load_failed"));
  }, [quoteId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let alive = true;
    api.get(`${BASE}/settings`).then((r) => { if (alive && r && r.success && r.data) setLh(r.data.effective || null); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  // Bana hua estimate — uska EST-n (server POST /estimate sirf id deta hai)
  const estimateId = q && q.estimate_id;
  useEffect(() => {
    if (!estimateId) return undefined;
    let alive = true;
    api.get(`/customer-estimates/${estimateId}`).then((r) => {
      if (alive && r && r.success && r.data) setEst({ id: estimateId, no: r.data.estimate_no || "" });
    }).catch(() => {});
    return () => { alive = false; };
  }, [estimateId]);

  const dirtyNums = !!(q && d) && (d.scope !== q.scope || d.content !== q.content || !sameLines(d.lines, q.lines) || !sameSchedule(d.schedule, q.schedule));
  const dirty = dirtyNums || (!!(q && d) && !sameHeader(d.header, q.header));
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; return ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const comp = useMemo(() => {
    if (!q || !d) return null;
    return dirtyNums ? previewCompute(d.content, d.scope, d.lines, d.schedule) : q.computed;
  }, [q, d, dirtyNums]);
  const baseDesc = useMemo(() => {
    const m = {};
    for (const g of (d && d.content && d.content.rate_schedule && d.content.rate_schedule.groups) || []) for (const r of g.rows || []) m[g.key + "." + r.key] = r.description;
    return m;
  }, [d]);

  if (err && !q) {
    return (
      <Shell onBack={onClose}>
        <ErrBox>{err}</ErrBox>
        <button type="button" onClick={load} style={btn("soft")}>↻ {t("sales_quote_ui.try_again")}</button>
      </Shell>
    );
  }
  if (!q || !d || !comp) return <Shell onBack={onClose}><Loading text={t("sales_quote_ui.loading")} /></Shell>;

  const canEdit = can("CRM", "create") || can("CRM", "edit");
  const canAccept = can("CRM", "approve") || can("CRM", "edit");
  const canEst = can("Estimate", "create");
  const isDraft = q.status === "draft";
  const editable = isDraft && canEdit;
  const lead = { ...(leadProp || {}), ...(q.lead || {}) };
  const phone = lead.phone || "";
  const builtupSum = Math.round((comp.rows || []).filter((r) => r.kind === "package" && r.qty).reduce((s, r) => s + Number(r.qty), 0) * 100) / 100;
  const set = (patch) => { setD((p) => ({ ...p, ...patch })); setNotice(""); };
  // PUT / send / accept ke jawab me lead / package / package_changed nahi aate — purane rakho
  const merge = (data) => {
    const clean = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => v !== undefined));
    setQ((p) => ({ ...p, ...clean })); setD(fromQ({ ...q, ...clean }));
  };

  const back = async () => {
    if (dirty && !(await ask(t("sales_quote_ui.confirm_discard")))) return;
    onClose();
  };
  const save = async () => {
    const nl = normLines(d.lines);
    const ns = normSchedule(d.schedule);
    setBadLines(new Set(nl.bad)); setBadSched(new Set(ns.bad));
    if (nl.bad.length || ns.bad.length) { setNotice(nl.bad.length ? t("sales_quote_ui.err_line_bad") : t("sales_quote_ui.err_sched_bad")); return false; }
    const body = { edit_seq: q.edit_seq, header: normHeader(d.header), scope: d.scope, lines: nl.lines, schedule: ns.schedule };
    if (d.content !== q.content) body.content = d.content;
    if (remember) body.remember = true;
    setSaving(true); setNotice("");
    const r = await api.put(`${QBASE}/${q.id}`, body, { timeoutMs: 30000 });
    setSaving(false);
    if (r && r.success && r.data) {
      merge(r.data);
      setRemember(false);
      window.toast?.success?.(r.data.remembered ? t("sales_quote_ui.saved_remembered", { n: r.data.remembered }) : t("sales_quote_ui.saved_ok"));
      onChanged && onChanged();
      return true;
    }
    const code = r && r.code;
    if (code === "STALE" || code === "LOCKED") { setNotice(r.message || t("sales_quote_ui.stale_fallback")); await load(); return false; }
    if (code === "LINE_INVALID") { setBadLines(new Set(r.keys || [])); setNotice(r.message || t("sales_quote_ui.err_line_bad")); return false; }
    if (code === "SCHEDULE_INVALID") { setBadSched(new Set(r.keys || [])); setNotice(r.message || t("sales_quote_ui.err_sched_bad")); return false; }
    window.toast?.error?.((r && r.message) || t("sales_quote_ui.save_failed"));
    setNotice((r && r.message) || t("sales_quote_ui.save_failed"));
    return false;
  };
  const status = async (what, confirmKey, okKey) => {
    if (confirmKey && !(await ask(t(confirmKey, { no: q.quote_no })))) return;
    if (what === "send" && dirty && !(await save())) return;
    setAct(what);
    const r = await api.post(`${QBASE}/${q.id}/${what}`, {});
    setAct("");
    if (r && r.success && r.data) { merge(r.data); window.toast?.success?.(t(okKey)); onChanged && onChanged(); }
    else { window.toast?.error?.((r && r.message) || t("sales_quote_ui.save_failed")); setNotice((r && r.message) || ""); }
  };
  const revise = async () => {
    if (!(await ask(t("sales_quote_ui.confirm_revise", { no: q.quote_no })))) return;
    setAct("revise");
    const r = await api.post(`${QBASE}/${q.id}/revise`, {});
    setAct("");
    if (r && r.success && r.data) { window.toast?.success?.(t("sales_quote_ui.revised", { no: r.data.quote_no })); onChanged && onChanged(); onOpenQuote && onOpenQuote(r.data.id); }
    else window.toast?.error?.((r && r.message) || t("sales_quote_ui.save_failed"));
  };
  const remove = async () => {
    if (!(await ask(t("sales_quote_ui.confirm_delete", { no: q.quote_no })))) return;
    const r = await api.del(`${QBASE}/${q.id}`);
    if (r && r.success) { window.toast?.success?.(t("sales_quote_ui.deleted")); onChanged && onChanged(); onClose(); }
    else window.toast?.error?.((r && r.message) || t("sales_quote_ui.save_failed"));
  };
  const pdf = async () => {
    if (dirty) { window.toast?.warning?.(t("sales_quote_ui.pdf_save_first")); setNotice(t("sales_quote_ui.pdf_save_first")); return; }
    setAct("pdf");
    try { await openPdfPath(`${QBASE}/${q.id}/pdf`); } catch (e) { window.toast?.error?.(t("sales_quote_ui.pdf_failed"), e && e.message); }
    setAct("");
  };
  const makeEstimate = async (projectId) => {
    setAct("estimate");
    const r = await api.post(`${QBASE}/${q.id}/estimate`, { project_id: projectId }, { timeoutMs: 30000 });
    setAct("");
    if (r && r.success && r.data) {
      setEst(null);
      setQ((p) => ({ ...p, estimate_id: r.data.estimate_id, project_id: r.data.project_id }));
      window.toast?.success?.(t("sales_quote_ui.est_made_toast"));
      onChanged && onChanged();
      return true;
    }
    if (r && r.code === "ESTIMATE_EXISTS") { setNotice(r.message || ""); await load(); return false; }
    window.toast?.error?.((r && r.message) || t("sales_quote_ui.est_failed"));
    setNotice((r && r.message) || t("sales_quote_ui.est_failed"));
    return false;
  };
  const estimate = async () => {
    const pid = lead.converted_project_id;
    if (pid) {
      if (!(await ask(t("sales_quote_ui.confirm_estimate", { id: pid })))) return;
      await makeEstimate(pid);
    } else setPanel("convert");
  };
  const afterConvert = async (pid) => {
    setQ((p) => ({ ...p, lead: { ...(p.lead || {}), converted_project_id: pid } }));
    onLeadConverted && onLeadConverted(pid);
    setPanel(null);
    await makeEstimate(pid);
  };

  const bar = [];
  const B = (key, label, kind, onClick, extra) => bar.push(
    <button key={key} type="button" onClick={onClick} disabled={!!act || saving} data-testid={"qa-" + key} style={btn(kind, !!act || saving)} {...(extra || {})}>
      {act === key ? <Spinner size={13} color={kind === "plain" || kind === "soft" || kind === "danger" ? T.blu : "white"} /> : null}{label}
    </button>
  );
  if (editable) bar.push(
    <button key="save" type="button" onClick={save} disabled={saving || !(dirty || remember)} data-testid="btn-save" style={btn("primary", saving || !(dirty || remember))}>
      {saving ? <Spinner size={13} color="white" /> : "💾"} {t("sales_quote_ui.save")}
    </button>
  );
  B("pdf", "📄 " + t("sales_quote_ui.pdf"), "plain", pdf);
  if (editable) B("send", "📤 " + t("sales_quote_ui.send"), "green", () => status("send", "sales_quote_ui.confirm_send", "sales_quote_ui.sent_ok"));
  if (["sent", "accepted"].includes(q.status)) B("share", "🔗 " + t("sales_quote_ui.share"), "wa", () => setPanel("share"));
  if (q.status === "sent" && canAccept) B("accept", "✓ " + t("sales_quote_ui.accept"), "green", () => status("accept", "sales_quote_ui.confirm_accept", "sales_quote_ui.accepted_ok"));
  if (q.status === "accepted" && !q.estimate_id && canEst) B("estimate", "🧾 " + t("sales_quote_ui.make_estimate"), "primary", estimate);
  if (q.status === "accepted" && q.estimate_id && q.project_id && onOpenProject) B("project", "↗ " + t("sales_quote_ui.open_project"), "soft", () => onOpenProject(q.project_id, "estimate"));
  if (!isDraft && canEdit) B("revise", "↻ " + t("sales_quote_ui.revise"), "soft", revise);
  if ((isDraft || q.status === "sent") && canEdit) B("lost", t("sales_quote_ui.mark_lost"), "plain", () => status("lost", "sales_quote_ui.confirm_lost", "sales_quote_ui.lost_ok"));
  if (editable) B("delete", "🗑 " + t("sales_quote_ui.delete"), "danger", remove);

  const lockMsg = q.status === "sent" ? t("sales_quote_ui.locked_sent", { at: fmtDT(q.sent_at) })
    : q.status === "accepted" ? t("sales_quote_ui.locked_accepted", { at: fmtDT(q.accepted_at) })
    : q.status === "lost" ? t("sales_quote_ui.locked_lost") : !canEdit ? t("sales_quote_ui.no_edit_perm") : "";
  const pkg = q.package || {};

  return (
    <Shell onBack={back} bar={bar}
      top={(
        <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 150px", minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ fontSize: 15, color: T.t1, overflowWrap: "anywhere" }} data-testid="qt-no">{q.quote_no}</b>
              {revLabel(q) ? <span style={chip(T.sltL, T.slt)}>{t("sales_quote_ui.rev_n", { n: q.rev_no })}</span> : null}
              <QStatusChip status={q.status} />
              {dirty ? <span data-testid="qt-unsaved" style={chip("#FFF7ED", "#C2410C", "#FDBA74")}>● {t("sales_quote_ui.unsaved")}</span> : null}
            </div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2, overflowWrap: "anywhere" }}>
              {(pkg.name || q.package_name || "") + (pkg.version_no ? " · v" + pkg.version_no : "")} · {scopeLabel(d.scope, d.content && d.content.scopes)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10.5, color: T.t4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>{t("sales_quote_ui.total")}</div>
            <div data-testid="qt-total" style={{ fontSize: 20, fontWeight: 900, color: T.blu, whiteSpace: "nowrap" }}>{(dirtyNums ? "≈ " : "") + rupee(comp.total)}</div>
          </div>
        </div>
      )}>
      {notice ? <ErrBox tone="amber">{notice}</ErrBox> : null}
      {q.package_changed ? (
        <div data-testid="pkg-changed" style={{ background: T.ambL, border: "1px solid " + T.ambM, borderRadius: 12, padding: "9px 12px", marginBottom: 10, fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>
          ⚠ {t("sales_quote_ui.pkg_changed", { v: pkg.version_no || "" })}
        </div>
      ) : null}
      {lockMsg ? (
        <div data-testid="qt-locked" style={{ background: q.status === "accepted" ? T.grnL : T.sltL, border: "1px solid " + (q.status === "accepted" ? T.grnM : T.b2), borderRadius: 12, padding: "10px 12px", marginBottom: 10, fontSize: 12.5, color: T.t2, lineHeight: 1.5 }}>
          🔒 {lockMsg}
        </div>
      ) : null}
      {q.estimate_id ? (
        <div data-testid="qt-estimate" style={{ background: T.grnL, border: "1px solid " + T.grnM, borderRadius: 12, padding: "10px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 200px", fontSize: 13, color: T.grn, fontWeight: 700, lineHeight: 1.45 }}>
            ✓ {t("sales_quote_ui.est_made", { no: (est && est.id === q.estimate_id && est.no) || "#" + q.estimate_id })}
            <div style={{ fontSize: 11.5, color: T.t3, fontWeight: 400 }}>{t("sales_quote_ui.est_made_hint", { id: q.project_id || "—" })}</div>
          </div>
          {q.project_id && onOpenProject ? <button type="button" onClick={() => onOpenProject(q.project_id, "estimate")} style={btn("soft")}>↗ {t("sales_quote_ui.open_project")}</button> : null}
        </div>
      ) : null}

      <HeaderCard header={d.header} editable={editable} onHeader={(h) => set({ header: h })} builtupSum={builtupSum} />
      <ScopeCard scopes={d.content && d.content.scopes} scope={d.scope} editable={editable} onScope={(s) => set({ scope: s })} />
      <QuoteLines quoteId={q.id} rows={comp.rows} lines={d.lines} editable={editable} onLines={(l) => { set({ lines: l }); setBadLines(new Set()); }}
        badKeys={badLines} total={comp.total} preview={dirtyNums} baseDesc={baseDesc} />
      <QuoteSchedule quoteId={q.id} rows={comp.rows} schedule={d.schedule} onSchedule={(s) => { set({ schedule: s }); setBadSched(new Set()); }} editable={editable} canEdit={canEdit}
        badKeys={badSched} remember={remember} onRemember={setRemember} dirty={dirty} scopes={d.content && d.content.scopes} preview={dirtyNums} />
      <QuoteDocPanel quoteId={q.id} content={d.content} letterhead={lh} editable={editable} dirty={dirty}
        fill={{ header: { ...normHeader(d.header), quotation_no: q.quote_no }, scope: d.scope, computed: comp }}
        onContent={(c) => set({ content: c })} onReload={async () => { await load(); onChanged && onChanged(); }} />
      <div style={{ fontSize: 11, color: T.t4, textAlign: "center", margin: "6px 0 4px" }}>
        {t("sales_quote_ui.meta", { at: fmtDT(q.updated_at || q.created_at) })}
      </div>

      {panel === "share" ? <QuoteShare quote={q} phone={phone} onClose={() => setPanel(null)} /> : null}
      {panel === "convert" ? <ConvertSheet lead={lead} total={q.total} onClose={() => setPanel(null)} onDone={afterConvert} /> : null}
    </Shell>
  );
}

// Poori screen (drawer ke upar) — upar patti, beech me scroll, neeche buttons
function Shell({ onBack, top, bar, children }) {
  return (
    <div data-testid="qt-editor" style={{ position: "fixed", inset: 0, zIndex: 450, background: T.bg, display: "flex", flexDirection: "column", fontFamily: FONT }}>
      <div style={{ flexShrink: 0, background: T.surface, borderBottom: "1px solid " + T.b1, padding: "8px 12px", display: "flex", gap: 10, alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
        <button type="button" onClick={onBack} aria-label={t("sales_quote_ui.back")} data-testid="qt-back" style={{ ...btn(), flexShrink: 0 }}>←</button>
        {top || <div style={{ flex: 1 }} />}
      </div>
      <div data-pkg-scroll="1" style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 940, margin: "0 auto", padding: "12px 12px 24px", boxSizing: "border-box" }}>{children}</div>
      </div>
      {bar && bar.length ? (
        <div data-testid="qt-actions" style={{ flexShrink: 0, background: T.surface, borderTop: "1px solid " + T.b1, padding: "8px 12px calc(8px + env(safe-area-inset-bottom))",
          display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", boxShadow: "0 -2px 10px rgba(0,0,0,.06)" }}>
          {bar}
        </div>
      ) : null}
    </div>
  );
}
