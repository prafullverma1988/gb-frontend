// ════════════════════════════════════════════════════════════════
// CRM lead drawer → "Package Quote" (15 Nov 2026, Prafull)
//
// Client ko package sheet ja chuki, ab deal band: is lead ke quote (quote no.,
// revision, Draft / Sent / Accepted / Lost, package, scope, ₹ total, tareekh).
// "+ Package se quote" → Checked package select karo + scope (Poora ₹1,800 /
// Structure only ₹920 per sq.ft.) → naya draft → editor (poori screen).
// Server: gb-backend routes/sales-quotes.js (GET ?lead_id=, POST /).
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../config/api";
import { t } from "../../i18n";
import { can } from "../../utils/perms";
import { T, btn, chip, card, Sheet, ErrBox, Loading, Spinner } from "./pkgUi";
import { BASE, fmtD, inr } from "./pkgUtil";
import { QBASE, QStatusChip, rupee, scopeLabel } from "./quoteUtil";
import QuoteEditor from "./QuoteEditor";

function NewQuoteSheet({ lead, onClose, onCreated }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [pkgId, setPkgId] = useState(null);
  const [scope, setScope] = useState("full");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    api.get(BASE).then((r) => {
      if (!alive) return;
      if (r && r.success) setList(r.data || []);
      else { setList([]); setErr((r && r.message) || t("sales_quote_ui.load_failed")); }
    }).catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, []);
  const checked = (list || []).filter((p) => p.status === "checked");
  const drafts = (list || []).length - checked.length;
  const pkg = checked.find((p) => p.id === pkgId) || null;
  const scopes = pkg ? [{ key: "full", rate: pkg.rate_full }, ...(pkg.rate_structure != null ? [{ key: "structure", rate: pkg.rate_structure }] : [])] : [];
  const create = async () => {
    if (!pkg) return;
    setBusy(true); setErr("");
    const r = await api.post(QBASE, { lead_id: lead.id, package_id: pkg.id, scope: scopes.some((s) => s.key === scope) ? scope : "full" });
    setBusy(false);
    if (r && r.success && r.data && r.data.id) onCreated(r.data.id);
    else setErr((r && r.message) || t("sales_quote_ui.create_failed"));
  };
  return (
    <Sheet heading={t("sales_quote_ui.new_title")} subline={lead.name} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={btn()}>{t("sales_quote_ui.cancel")}</button>
        <button type="button" onClick={create} disabled={!pkg || busy} data-testid="qt-create" style={btn("primary", !pkg || busy)}>
          {busy ? <Spinner size={13} color="white" /> : null} {t("sales_quote_ui.create_btn")}
        </button>
      </>}>
      <ErrBox>{err}</ErrBox>
      {list == null ? <Loading text={t("sales_quote_ui.loading")} /> : !checked.length ? (
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t2 }}>{t("sales_quote_ui.no_checked")}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{drafts ? t("sales_quote_ui.no_checked_drafts", { n: drafts }) : t("sales_quote_ui.no_checked_hint")}</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, marginBottom: 6 }}>1. {t("sales_quote_ui.pick_package")}</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {checked.map((p) => {
              const on = p.id === pkgId;
              return (
                <button key={p.id} type="button" data-pick-pkg={p.id} aria-pressed={on} onClick={() => { setPkgId(p.id); if (p.rate_structure == null) setScope("full"); }}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "2px solid " + (on ? T.blu : T.b1), background: on ? T.bluL : T.surface, cursor: "pointer", fontFamily: "inherit" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.t1, overflowWrap: "anywhere" }}>{on ? "● " : "○ "}{p.name}</div>
                  {p.tagline ? <div style={{ fontSize: 12, color: T.t3, marginTop: 2 }}>{p.tagline}</div> : null}
                  <div style={{ fontSize: 12, color: T.t2, marginTop: 3 }}>
                    {p.rate_full != null ? t("sales_quote_ui.rate_sqft", { rate: inr(p.rate_full) }) : "—"}
                    {p.rate_structure != null ? " · " + scopeLabel("structure") + " " + t("sales_quote_ui.rate_sqft", { rate: inr(p.rate_structure) }) : ""}
                    <span style={{ color: T.t4 }}> · v{p.version_no}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {pkg ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, marginBottom: 6 }}>2. {t("sales_quote_ui.pick_scope")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 8 }}>
                {scopes.map((s) => {
                  const on = s.key === scope;
                  return (
                    <button key={s.key} type="button" data-pick-scope={s.key} aria-pressed={on} onClick={() => setScope(s.key)}
                      style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "2px solid " + (on ? T.grn : T.b1), background: on ? T.grnL : T.surface, cursor: "pointer", fontFamily: "inherit" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: on ? T.grn : T.t1 }}>{on ? "● " : "○ "}{scopeLabel(s.key)}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: T.t1, marginTop: 2 }}>{s.rate != null ? t("sales_quote_ui.rate_sqft", { rate: inr(s.rate) }) : "—"}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11.5, color: T.t3, marginTop: 8, lineHeight: 1.45 }}>{t("sales_quote_ui.new_hint")}</div>
            </>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

export default function QuoteTab({ lead, onOpenProject, onLeadConverted }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const canEdit = can("CRM", "create") || can("CRM", "edit");

  const load = useCallback(async () => {
    const r = await api.get(`${QBASE}?lead_id=${lead.id}`);
    if (r && r.success) { setList(r.data || []); setErr(""); }
    else { setList((p) => p || []); setErr((r && r.message) || t("sales_quote_ui.load_failed")); }
  }, [lead.id]);
  useEffect(() => { load(); }, [load]);

  const quotes = list || [];
  return (
    <div data-testid="qt-tab">
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("sales_quote_ui.tab_title")}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 2, lineHeight: 1.45 }}>{t("sales_quote_ui.tab_sub")}</div>
        </div>
        {canEdit ? <button type="button" onClick={() => setCreating(true)} data-testid="btn-new-quote" style={btn("primary")}>+ {t("sales_quote_ui.new_btn")}</button> : null}
      </div>
      <ErrBox>{err}</ErrBox>
      {list == null ? <Loading text={t("sales_quote_ui.loading")} /> : !quotes.length ? (
        <div style={{ ...card, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🧾</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: T.t2 }}>{t("sales_quote_ui.empty")}</div>
          <div style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>{t("sales_quote_ui.empty_hint")}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {quotes.map((q) => (
            <button key={q.id} type="button" data-quote={q.id} onClick={() => setOpenId(q.id)}
              style={{ ...card, padding: "11px 12px", textAlign: "left", cursor: "pointer", fontFamily: "inherit", width: "100%",
                borderLeft: "4px solid " + ({ draft: T.amb, sent: T.blu, accepted: T.grn, lost: T.red }[q.status] || T.b2) }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13.5, color: T.t1, overflowWrap: "anywhere" }}>{q.quote_no}</b>
                    {Number(q.rev_no) > 0 ? <span style={chip(T.sltL, T.slt)}>{t("sales_quote_ui.rev_n", { n: q.rev_no })}</span> : null}
                    <QStatusChip status={q.status} />
                    {q.estimate_id ? <span style={chip(T.grnL, T.grn, T.grnM)}>🧾 {t("sales_quote_ui.chip_estimate")}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: T.t2, marginTop: 3, overflowWrap: "anywhere" }}>{(q.package_name || "—") + " · " + scopeLabel(q.scope)}</div>
                  <div style={{ fontSize: 11, color: T.t4, marginTop: 2 }}>{fmtD(q.accepted_at || q.sent_at || q.updated_at)}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: T.t1, whiteSpace: "nowrap" }}>{rupee(q.total)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {creating ? <NewQuoteSheet lead={lead} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); load(); setOpenId(id); }} /> : null}
      {openId ? createPortal(
        <QuoteEditor key={openId} quoteId={openId} lead={lead} onClose={() => { setOpenId(null); load(); }} onChanged={load}
          onOpenQuote={(id) => setOpenId(id)} onOpenProject={onOpenProject ? (pid, tab) => { setOpenId(null); onOpenProject(pid, tab); } : null}
          onLeadConverted={onLeadConverted} />,
        document.body
      ) : null}
    </div>
  );
}
