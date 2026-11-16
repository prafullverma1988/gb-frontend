// ════════════════════════════════════════════════════════════════
// Project → Estimate → "📦 Pick from Package" (16 Nov 2026, Prafull)
//
// Do source, EK hi bharne ka form:
//   • "📦 Package se" — Checked package → scope → har line ka area → payment schedule
//   • "🧾 CRM Quote se" — SAB quote (khoj ke saath; use ho chuka / kisi aur client ka
//     bhi) → uski lines + schedule form me copy, area / rate / hisse badal sakte ho.
//     Sent / Accepted aur jiska estimate abhi nahi bana → "Is quote se jodo" (Accepted +
//     juda); baaki sirf copy (ek quote kai site par).
// Payment schedule: "copy karo" tick (package ki yaad / quote se), "↺ Copy wala wapas",
// "Sab hisse hatao" (khud naya banao). Phir client + % → "Check karo" (server ka pakka
// hisaab, kuch likha nahi jaata) → "EST-n banao": lines + hisse EK SAATH.
// Server: routes/sales-quotes.js (/project-packages, /project-estimate, GET / list + used).
// ════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { can } from "../../utils/perms";
import SearchSelect from "../../components/SearchSelect";
import { PROJ_CLIENT, customerOptions, pickCustomer } from "../EstimateBuilderModal";
import { T, btn, inp, chip, card, Sheet, Spinner, ErrBox, Loading, Field } from "./pkgUi";
import { inr } from "./pkgUtil";
import { QBASE, QStatusChip, normLines, normSchedule, previewCompute, rupee, scopeLabel } from "./quoteUtil";
import { QuoteLinesTable } from "./QuoteLines";
import QuoteSchedule from "./QuoteSchedule";

// Lead ka naam project ke naam se milta hai? ("Naveen & Prakash" ↔ lead "naveen")
const STOP = new Set(["sir", "shri", "ji", "new", "project", "the", "and", "ghar"]);
const words = (s) => String(s || "").toLowerCase().split(/[^a-z0-9ऀ-ॿ]+/).filter((w) => w.length >= 3 && !STOP.has(w));
export const nameHit = (a, b) => { const B = new Set(words(b)); return words(a).some((w) => B.has(w)); };

const pctNum = (v) => (v == null || String(v).trim() === "" ? 0 : Number(String(v).replace(/[%\s]/g, "")));
const pctBad = (v) => { const n = pctNum(v); return !Number.isFinite(n) || n < 0 || n > 100; };
const clone = (x) => JSON.parse(JSON.stringify(x == null ? {} : x));

function Tabs({ value, onChange, items }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {items.map((it) => (
        <button key={it.key} type="button" role="tab" aria-selected={value === it.key} data-src={it.key} onClick={() => onChange(it.key)}
          style={{ ...btn(value === it.key ? "primary" : "plain"), flex: "1 1 160px" }}>{it.label}</button>
      ))}
    </div>
  );
}

export default function PackageEstimateModal({ project, projectId, customers, onClose, onSaved }) {
  const crmOk = can("CRM", "view");
  const [src, setSrc] = useState("package");
  // ── Client + % ──
  const [cust, setCust] = useState(() => {
    const cn = project && project.client_name ? String(project.client_name).trim() : "";
    if (!cn) return { id: "", name: "" };
    const hit = pickCustomer(customers, cn);
    return { id: hit.id === PROJ_CLIENT ? "" : hit.id, name: hit.name };
  });
  const [pct, setPct] = useState({ retention_pct: "", tds_pct: "", tax_pct: "" });
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  // ── Package source ──
  const [pkgs, setPkgs] = useState(null);
  const [pkgId, setPkgId] = useState("");
  const [P, setP] = useState(null);           // { package, content, schedules }
  const [loadingSrc, setLoadingSrc] = useState(false);
  // ── Quote source ──
  const [quotes, setQuotes] = useState(null);
  const [qSearch, setQSearch] = useState("");
  const [qid, setQid] = useState("");
  const [Q, setQ] = useState(null);
  const [link, setLink] = useState(false);

  // ── Bharne ka form (dono source ka ek) ──
  const [scope, setScope] = useState("");
  const [lines, setLines] = useState({});
  const [schedule, setSchedule] = useState({});
  const [copySched, setCopySched] = useState(true);
  const [schedTouched, setSchedTouched] = useState(false);
  const [remember, setRemember] = useState(false);
  const [check, setCheck] = useState(null);   // dry_run ka jawab

  const active = src === "package" ? P : Q;
  const content = active ? active.content : null;
  const qRow = useMemo(() => (quotes || []).find((x) => String(x.id) === String(qid)) || null, [quotes, qid]);
  const canLink = !!(Q && qRow && !qRow.used && ["sent", "accepted"].includes(Q.status));
  // Source ka schedule (copy): package → us scope ki yaad; quote → quote ka apna
  const srcSched = (sc) => (src === "package" ? (P && P.schedules[sc]) || {} : (Q && Q.schedule) || {});

  useEffect(() => {
    let alive = true;
    api.get(`${QBASE}/project-packages`).then((r) => {
      if (!alive) return;
      if (r && r.success) setPkgs(r.data || []);
      else { setPkgs([]); setErr((r && r.message) || t("pkg_est.load_failed")); }
    });
    return () => { alive = false; };
  }, []);
  // Quote list pehli baar tab khulne par (sab quote — use ho chuke bhi)
  useEffect(() => {
    if (src !== "quote" || quotes || !crmOk) return undefined;
    let alive = true;
    api.get(QBASE).then((r) => { if (alive) setQuotes(r && r.success ? r.data || [] : []); });
    return () => { alive = false; };
  }, [src, quotes, crmOk]);

  const loadPkg = async (id, keep) => {
    setLoadingSrc(true); setErr("");
    const r = await api.get(`${QBASE}/project-packages/${id}`);
    setLoadingSrc(false);
    if (!(r && r.success && r.data)) { setP(null); setErr((r && r.message) || t("pkg_est.load_failed")); return; }
    const d = r.data;
    const scopes = d.content.scopes || [];
    const sc = keep && scopes.some((s) => s.key === scope) ? scope : ((scopes.find((s) => s.key === "full") || scopes[0] || { key: "full" }).key);
    setP(d); setScope(sc);
    if (!keep || !schedTouched) setSchedule(copySched ? clone(d.schedules[sc] || {}) : {});
  };
  // Area package badalne par bhi bana rehta hai (do package ki tulna aasaan)
  const pickPkg = (id) => { setPkgId(id); setSchedTouched(false); if (id) loadPkg(id, false); else setP(null); };
  const pickQuote = async (id) => {
    setQid(id); setQ(null); setErr("");
    if (!id) return;
    setLoadingSrc(true);
    const r = await api.get(`${QBASE}/${id}`);
    setLoadingSrc(false);
    if (!(r && r.success && r.data)) { setErr((r && r.message) || t("pkg_est.load_failed")); return; }
    const d = r.data;
    const row = (quotes || []).find((x) => String(x.id) === String(id));
    setQ(d);
    setScope(d.scope);
    setLines(clone(d.lines));
    setSchedule(copySched ? clone(d.schedule) : {});
    setSchedTouched(false);
    setLink(!!(row && !row.used && ["sent", "accepted"].includes(d.status)));
  };
  const pickScope = (k) => { setScope(k); if (src === "package" && copySched && !schedTouched) setSchedule(clone(srcSched(k))); };
  const switchSrc = (k) => {
    setSrc(k); setErr("");
    // Us tab ka chuna hua source form me wapas
    if (k === "package" && P) { setSchedTouched(false); setSchedule(copySched ? clone(P.schedules[scope] || {}) : {}); }
    if (k === "quote" && Q) { setScope(Q.scope); setLines(clone(Q.lines)); setSchedTouched(false); setSchedule(copySched ? clone(Q.schedule) : {}); }
  };
  const toggleCopy = (on) => {
    setCopySched(on);
    setSchedule(on ? clone(srcSched(scope)) : {});
    setSchedTouched(!on);
  };
  const resetSched = () => { setCopySched(true); setSchedule(clone(srcSched(scope))); setSchedTouched(false); };
  const clearSched = () => { setSchedule({}); setSchedTouched(true); };

  const qList = useMemo(() => {
    const pn = (project && (project.name || "")) + " " + ((project && project.client_name) || "");
    const s = qSearch.trim().toLowerCase();
    return (quotes || [])
      .filter((q) => !s || [q.quote_no, q.lead_name, q.package_name].some((v) => String(v || "").toLowerCase().includes(s)))
      .map((q) => ({ ...q, hit: nameHit(q.lead_name, pn) }))
      .sort((a, b) => (b.hit ? 1 : 0) - (a.hit ? 1 : 0) || b.id - a.id);
  }, [quotes, project, qSearch]);

  // Kuch bhi badla → purana "Check" bekaar
  useEffect(() => { setCheck(null); }, [lines, schedule, scope, pkgId, qid, link, cust, pct, desc, remember, src]);

  const C = useMemo(() => (content ? previewCompute(content, scope, lines, schedule) : null), [content, scope, lines, schedule]);
  const nl = useMemo(() => normLines(lines), [lines]);
  const ns = useMemo(() => normSchedule(schedule), [schedule]);
  const badKeys = useMemo(() => new Set([...nl.bad, ...ns.bad]), [nl, ns]);
  const baseDesc = useMemo(() => {
    const o = {};
    for (const g of (content && content.rate_schedule.groups) || []) for (const r of g.rows || []) o[g.key + "." + r.key] = r.description;
    return o;
  }, [content]);
  const badPct = ["retention_pct", "tds_pct", "tax_pct"].filter((k) => pctBad(pct[k]));
  const body = () => ({
    project_id: projectId, customer_id: cust.id || "", customer_name: cust.name || "", description: desc,
    retention_pct: pctNum(pct.retention_pct), tds_pct: pctNum(pct.tds_pct), tax_pct: pctNum(pct.tax_pct),
    scope, lines: nl.lines, schedule: ns.schedule, remember,
    ...(src === "package" ? { package_id: P.package.id, version_id: P.package.version_id }
                          : { quote_id: Q.id, quote_seq: Q.edit_seq, link_quote: canLink && link }),
  });

  const fail = (r) => {
    setErr((r && r.message) || t("pkg_est.save_failed"));
    if (r && r.code === "PACKAGE_CHANGED" && pkgId) loadPkg(pkgId, true);
  };
  const doCheck = async () => {
    if (badKeys.size) { setErr(t("pkg_est.fix_red")); return; }
    if (badPct.length) { setErr(t("pkg_est.pct_bad")); return; }
    setBusy("check"); setErr("");
    const r = await api.post(`${QBASE}/project-estimate`, { ...body(), dry_run: true }, { timeoutMs: 30000 });
    setBusy("");
    if (r && r.success) setCheck(r.data); else fail(r);
  };
  const doCreate = async () => {
    setBusy("save"); setErr("");
    const r = await api.post(`${QBASE}/project-estimate`, body(), { timeoutMs: 30000 });
    setBusy("");
    if (r && r.success && r.data) {
      window.toast?.success?.(t("pkg_est.made", { no: r.data.estimate_no || "", total: inr(Math.round(r.data.total_value || 0)) }));
      onSaved && onSaved(r.data.estimate_id);
    } else fail(r);
  };

  const h2 = (txt) => <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1 }}>{txt}</div>;
  const sub = (txt) => <div style={{ fontSize: 12, color: T.t3, margin: "2px 0 10px", lineHeight: 1.45 }}>{txt}</div>;

  // ── 1. Source chuno ──
  const scopes = (content && content.scopes) || [];
  const scopeChips = content && scopes.length > 1 ? (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: T.t2, marginBottom: 6 }}>{t("pkg_est.scope")}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {scopes.map((s) => (
          <button key={s.key} type="button" data-scope={s.key} onClick={() => pickScope(s.key)} aria-pressed={scope === s.key}
            style={{ ...btn(scope === s.key ? "primary" : "plain") }}>{scopeLabel(s.key, scopes)}{s.rate != null ? " · ₹" + inr(s.rate) : ""}</button>
        ))}
      </div>
    </div>
  ) : null;

  const packagePick = (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ marginBottom: 8 }}>{h2(t("pkg_est.step_pkg"))}</div>
      {pkgs == null ? <Loading text={t("pkg_est.loading")} /> : !pkgs.length ? (
        <div style={{ fontSize: 13, color: T.t3, lineHeight: 1.5 }} data-testid="pe-no-pkg">{t("pkg_est.no_packages")}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }} data-testid="pe-pkgs">
          {pkgs.map((p) => {
            const on = String(pkgId) === String(p.id);
            return (
              <button key={p.id} type="button" data-pkg={p.id} onClick={() => pickPkg(p.id)} aria-pressed={on}
                style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer", border: "2px solid " + (on ? T.blu : T.b1), background: on ? T.bluL : T.surface }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: T.t1, overflowWrap: "anywhere" }}>{p.name}</div>
                <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>
                  {p.rate_full != null ? t("sales_quote_ui.scope_full") + " ₹" + inr(p.rate_full) : ""}
                  {p.rate_structure != null ? " · " + t("sales_quote_ui.scope_structure") + " ₹" + inr(p.rate_structure) : ""}
                </div>
                <div style={{ fontSize: 10.5, color: T.t4, marginTop: 2 }}>v{p.version_no}</div>
              </button>
            );
          })}
        </div>
      )}
      {src === "package" ? scopeChips : null}
    </div>
  );

  const quotePick = !crmOk ? <ErrBox tone="amber">{t("pkg_est.no_crm_perm")}</ErrBox> : (
    <div style={{ ...card, marginBottom: 12 }}>
      {h2(t("pkg_est.quote_title"))}
      {sub(t("pkg_est.quote_hint"))}
      <input value={qSearch} onChange={(e) => setQSearch(e.target.value)} placeholder={t("pkg_est.quote_search_ph")} data-testid="pe-qsearch"
        aria-label={t("pkg_est.quote_search_ph")} style={{ ...inp, marginBottom: 8 }} />
      {quotes == null ? <Loading text={t("pkg_est.loading")} /> : !quotes.length ? (
        <div style={{ fontSize: 13, color: T.t3 }} data-testid="pe-no-quote">{t("pkg_est.no_quotes")}</div>
      ) : !qList.length ? (
        <div style={{ fontSize: 13, color: T.t3 }}>{t("pkg_est.no_search_match")}</div>
      ) : (
        <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "auto", maxHeight: 300 }} data-testid="pe-quotes">
          {qList.map((q, i) => {
            const on = String(qid) === String(q.id);
            return (
              <button key={q.id} type="button" data-quote={q.id} onClick={() => pickQuote(q.id)} aria-pressed={on}
                style={{ display: "flex", width: "100%", gap: 8, alignItems: "center", flexWrap: "wrap", textAlign: "left", padding: "10px 12px", border: "none",
                  borderTop: i ? "1px solid " + T.b1 : "none", background: on ? T.bluL : T.surface, cursor: "pointer" }}>
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <b style={{ fontSize: 13.5, color: T.t1 }}>{q.quote_no}</b>
                    <QStatusChip status={q.status} />
                    {q.used ? <span data-used={q.id} style={chip(T.sltL, T.slt)}>{t("pkg_est.used_chip")}</span> : null}
                    {q.hit ? <span style={chip(T.grnL, T.grn, T.grnM)}>{t("pkg_est.name_match")}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: T.t3, marginTop: 2, overflowWrap: "anywhere" }}>
                    {(q.lead_name || "—") + " · " + (q.package_name || "") + " · " + scopeLabel(q.scope)}
                  </div>
                </div>
                <b style={{ fontSize: 13.5, color: T.t1, whiteSpace: "nowrap" }}>{rupee(Math.round(q.total))}</b>
              </button>
            );
          })}
        </div>
      )}
      {Q ? (
        <div style={{ marginTop: 10 }} data-testid="pe-quote-mode">
          {canLink ? (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: T.t1, cursor: "pointer", padding: "8px 10px", background: T.bluL, border: "1px solid " + T.bluM, borderRadius: 10 }}>
              <input type="checkbox" checked={link} onChange={(e) => setLink(e.target.checked)} data-testid="chk-link" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
              <span><b>{t("pkg_est.link_label", { no: Q.quote_no })}</b><br /><span style={{ fontSize: 11.5, color: T.t3 }}>{t("pkg_est.link_hint")}</span></span>
            </label>
          ) : (
            <ErrBox tone="amber">{qRow && qRow.used ? t("pkg_est.copy_used") : t("pkg_est.copy_only")}</ErrBox>
          )}
        </div>
      ) : null}
      {src === "quote" ? scopeChips : null}
    </div>
  );

  // ── 2 + 3. Area aur payment schedule (dono source me editable) ──
  const fillBody = content && C ? (
    <>
      <div style={{ ...card, marginBottom: 12 }}>
        {h2(t("pkg_est.step_area"))}
        {sub(t("pkg_est.area_hint"))}
        <QuoteLinesTable rows={C.rows} lines={lines} editable onLines={setLines} badKeys={badKeys} total={C.total} preview baseDesc={baseDesc} />
      </div>
      <div style={{ ...card, marginBottom: 8, background: T.surfaceB }} data-testid="pe-sched-tools">
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: T.t1, cursor: "pointer" }}>
          <input type="checkbox" checked={copySched} onChange={(e) => toggleCopy(e.target.checked)} data-testid="chk-copy-sched" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
          <span><b>{src === "package" ? t("pkg_est.sched_copy_pkg") : t("pkg_est.sched_copy_quote")}</b><br />
            <span style={{ fontSize: 11.5, color: T.t3 }}>{t("pkg_est.sched_copy_hint")}</span></span>
        </label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" onClick={resetSched} data-testid="btn-sched-reset" style={btn("soft")}>↺ {t("pkg_est.sched_reset")}</button>
          <button type="button" onClick={clearSched} data-testid="btn-sched-clear" style={btn()}>{t("pkg_est.sched_clear")}</button>
        </div>
      </div>
      <QuoteSchedule rows={C.rows} schedule={schedule} editable preview noAi noSaved badKeys={badKeys} scopes={scopes}
        onSchedule={(s) => { setSchedule(s); setSchedTouched(true); }} remember={remember} onRemember={setRemember} />
    </>
  ) : null;

  // ── Client + % ──
  const clientBox = (
    <div style={{ ...card, marginBottom: 12 }} data-testid="pe-client">
      <div style={{ marginBottom: 8 }}>{h2(t("pkg_est.client_title"))}</div>
      <Field label={t("pkg_est.client")} hint={src === "quote" ? t("pkg_est.client_hint_quote") : t("pkg_est.client_hint")}>
        <SearchSelect
          value={cust.id || (cust.name ? PROJ_CLIENT : "")}
          options={customerOptions(customers, cust.name || (project && project.client_name))}
          onChange={(id) => {
            if (!id) { setCust({ id: "", name: "" }); return; }
            if (id === PROJ_CLIENT) { setCust((c) => ({ id: "", name: c.name || (project && project.client_name) || "" })); return; }
            const m = (customers || []).find((c) => String(c.id) === String(id));
            setCust({ id: m ? m.id : "", name: m ? m.name : "" });
          }}
          placeholder={t("pkg_est.client_ph")}
        />
      </Field>
      <Field label={t("pkg_est.desc")} hint={t("pkg_est.desc_hint")}>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} style={inp} data-testid="pe-desc" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
        {[["retention_pct", t("pkg_est.retention")], ["tds_pct", t("pkg_est.tds")], ["tax_pct", t("pkg_est.gst")]].map(([k, l]) => (
          <Field key={k} label={l} style={{ marginBottom: 0 }}>
            <input value={pct[k]} inputMode="decimal" placeholder="0" onChange={(e) => setPct((p) => ({ ...p, [k]: e.target.value }))} data-pct={k}
              style={{ ...inp, ...(badPct.includes(k) ? { borderColor: T.redM, background: T.redL } : {}) }} />
          </Field>
        ))}
      </div>
    </div>
  );

  const footer = (
    <>
      <div style={{ flex: "1 1 180px", alignSelf: "center", fontSize: 13, color: T.t2 }} data-testid="pe-total">
        {C ? <>{t("pkg_est.total")} <b style={{ color: T.t1, fontSize: 15 }}>≈ {rupee(C.total)}</b></> : null}
      </div>
      <button type="button" onClick={onClose} style={btn()}>{t("pkg_est.cancel")}</button>
      {check ? (
        <button type="button" onClick={doCreate} disabled={!!busy} data-testid="pe-create" style={btn("green", !!busy, true)}>
          {busy === "save" ? <Spinner size={13} color="white" /> : "✓"} {t("pkg_est.create", { no: check.estimate_no })}
        </button>
      ) : (
        <button type="button" onClick={doCheck} disabled={!!busy || !C || !(C.total > 0)} data-testid="pe-check" style={btn("primary", !!busy || !C || !(C.total > 0), true)}>
          {busy === "check" ? <Spinner size={13} color="white" /> : null} {t("pkg_est.check")}
        </button>
      )}
    </>
  );

  return (
    <Sheet heading={"📦 " + t("pkg_est.title")} subline={t("pkg_est.subline", { project: (project && project.name) || "" })} onClose={onClose} footer={footer} maxWidth={900}>
      <div data-testid="pkg-est">
        {crmOk ? <Tabs value={src} onChange={switchSrc} items={[{ key: "package", label: "📦 " + t("pkg_est.src_package") }, { key: "quote", label: "🧾 " + t("pkg_est.src_quote") }]} /> : null}
        {src === "package" ? packagePick : quotePick}
        {loadingSrc ? <Loading text={t("pkg_est.loading")} /> : null}
        {fillBody}
        {content ? clientBox : null}
        {check ? (
          <div data-testid="pe-check-box" style={{ background: T.grnL, border: "1px solid " + T.grnM, borderRadius: 12, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: T.t1, lineHeight: 1.55 }}>
            <b>✓ {t("pkg_est.check_ok", { no: check.estimate_no, total: inr(Math.round(check.total)) })}</b>
            <div>{t("pkg_est.check_detail", { lines: check.lines, items: check.items, sched: check.scheduled, client: check.customer_name })}</div>
            {check.linked && Q ? <div style={{ color: T.blu, marginTop: 4 }}>🔗 {t("pkg_est.check_linked", { no: Q.quote_no })}</div> : null}
            {check.existing ? <div style={{ color: "#92400E", marginTop: 4 }}>⚠ {t("pkg_est.check_existing", { n: check.existing })}</div> : null}
          </div>
        ) : null}
        <ErrBox>{err}</ErrBox>
      </div>
    </Sheet>
  );
}
