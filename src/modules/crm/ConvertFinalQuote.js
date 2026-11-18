// ════════════════════════════════════════════════════════════════
// Lead → Project: pehla kadam — Final Quote (18 Nov 2026, Prafull)
//
// Lead ka budget sirf andaza hai, CRM tak rehta hai. Project ki BOQ value
// wahi jo client ko quote hua: yahan quote chuno, uska preview dekho, phir
// aage. Draft / Sent quote ko yahin tick se final maan sakte ho. Quote na ho
// to "Abhi final quote nahi" — project bina value ke banta hai.
// Server: GET /crm/leads/:id/final-quotes, POST convert-to-project (final_quote).
// ════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { QStatusChip, QBASE } from "./quoteUtil";
import { T, chip } from "./pkgUi";

const rs = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
export const quoteKey = (q) => (q ? q.source + ":" + q.id : "");
const SRC = { package: "crm.fq_src_package", builder: "crm.fq_src_builder", pdf: "crm.fq_src_pdf" };

// Package Quote ka andar ka byora: har line + uska payment schedule
function PackagePreview({ id }) {
  const [state, setState] = useState({ busy: true, q: null });
  useEffect(() => {
    let on = true;
    setState({ busy: true, q: null });
    api.get(`${QBASE}/${id}`).then((r) => { if (on) setState({ busy: false, q: r && r.success ? r.data : null }); })
      .catch(() => { if (on) setState({ busy: false, q: null }); });
    return () => { on = false; };
  }, [id]);
  if (state.busy) return <div style={{ fontSize: 12, color: T.t3, padding: "8px 0" }}>{t("crm.fq_preview_loading")}</div>;
  if (!state.q) return <div style={{ fontSize: 12, color: T.t3, padding: "8px 0" }}>{t("crm.fq_preview_failed")}</div>;
  const rows = ((state.q.computed && state.q.computed.rows) || []).filter((r) => r.amount);
  return (
    <div data-testid="cv-fq-preview" style={{ marginTop: 8 }}>
      {rows.map((r) => (
        <div key={r.key} style={{ borderTop: `1px solid ${T.b1}`, padding: "7px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, color: T.t1 }}>
            <span style={{ fontWeight: 600, minWidth: 0 }}>{r.description}</span>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{rs(r.amount)}</span>
          </div>
          {r.kind !== "lump_sum" && r.qty != null && r.rate != null ? (
            <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>{Number(r.qty).toLocaleString("en-IN")} {String(r.unit || "").replace(/^per\s+/i, "")} × {rs(r.rate)}</div>
          ) : null}
          {r.schedule && r.schedule.length ? (
            <details style={{ marginTop: 3 }}>
              <summary style={{ fontSize: 11, color: T.blu, fontWeight: 700, cursor: "pointer" }}>{t("crm.fq_schedule_n", { n: r.schedule.length })}</summary>
              {r.schedule.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, color: T.t2, padding: "2px 0 2px 10px" }}>
                  <span>{p.name} · {p.pct}%</span><span>{rs(p.amount)}</span>
                </div>
              ))}
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function ConvertFinalQuote({ quotes, canAccept, selected, accept, budget, onSelect, onAccept }) {
  const q = selected;
  const needsAccept = !!q && q.status !== "accepted";
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#065F46", marginBottom: 3 }}>{t("crm.fq_title")}</div>
      <div style={{ fontSize: 11.5, color: "#047857", marginBottom: 10, lineHeight: 1.45 }}>{Number(budget) > 0 ? t("crm.fq_intro", { budget: rs(budget) }) : t("crm.fq_intro_nobudget")}</div>

      {quotes.map((x) => {
        const on = quoteKey(x) === quoteKey(q);
        return (
          <button key={quoteKey(x)} type="button" data-testid={"cv-fq-" + x.source + "-" + x.id} aria-pressed={on} onClick={() => onSelect(x)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 11px", marginBottom: 6, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                     border: `1.5px solid ${on ? "#10B981" : T.b1}`, background: on ? "#ECFDF5" : T.surface }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: T.t1 }}>{on ? "● " : "○ "}{x.no}</span>
              {x.source === "package" ? <QStatusChip status={x.status} /> : <span style={chip(T.bluL, T.blu, T.bluM)}>{t("crm.fq_st_" + x.status)}</span>}
              <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: T.t1 }}>{rs(x.total)}</span>
            </div>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 2 }}>{t(SRC[x.source])}{x.label ? " · " + x.label : ""}</div>
          </button>
        );
      })}

      <button type="button" data-testid="cv-fq-none" aria-pressed={!q} onClick={() => onSelect(null)}
        style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 11px", marginBottom: 10, borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                 border: `1.5px dashed ${!q ? "#10B981" : T.b1}`, background: !q ? "#ECFDF5" : T.surface, fontSize: 12.5, fontWeight: 700, color: T.t2 }}>
        {!q ? "● " : "○ "}{t("crm.fq_none")}
        <div style={{ fontSize: 11, fontWeight: 400, color: T.t3, marginTop: 2 }}>{t("crm.fq_none_hint")}</div>
      </button>

      {q ? (
        <div style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.b1}`, background: T.surface, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px" }}>{t("crm.fq_preview")}</span>
            {q.file_url ? <a href={q.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 700, color: T.blu }}>{t("crm.fq_open_file")}</a> : null}
          </div>
          {q.source === "package" ? <PackagePreview id={q.id} /> : null}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, borderTop: `2px solid ${T.b1}`, marginTop: 8, paddingTop: 8, fontSize: 14, fontWeight: 800, color: T.t1 }}>
            <span>{t("crm.fq_total")}</span><span data-testid="cv-fq-total">{rs(q.total)}</span>
          </div>
        </div>
      ) : null}

      {needsAccept ? (
        canAccept ? (
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 12, color: "#92400E", marginBottom: 10, cursor: "pointer", lineHeight: 1.4 }}>
            <input type="checkbox" data-testid="cv-fq-accept" checked={!!accept} onChange={(e) => onAccept(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0 }} />
            <span><strong>{t("crm.fq_accept_label")}</strong><br />{t("crm.fq_accept_hint", { status: t("crm.fq_st_" + q.status) })}</span>
          </label>
        ) : (
          <div role="alert" style={{ padding: "9px 11px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 12, color: "#B91C1C", marginBottom: 10, lineHeight: 1.4 }}>{t("crm.fq_accept_no_perm")}</div>
        )
      ) : null}
    </div>
  );
}
