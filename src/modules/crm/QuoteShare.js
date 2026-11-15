// ════════════════════════════════════════════════════════════════
// CRM Package Quote — client ko link (15 Nov 2026, Prafull)
//
// Sirf bheja gaya / accept hua quote (draft par server 409 SEND_FIRST).
// "Link banao" → bina-login page + PDF (filled rate schedule, TOTAL, payment
// schedule). URL sirf isi jawab me aata hai — turant WhatsApp (lead ke phone
// par, wa.me — system khud nahi bhejta) ya Copy. Neeche purane link: kitni
// baar khula, band karo (DELETE /sales-packages/links/:lid — wahi table).
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { T, btn, inp, chip, Field, Sheet, ErrBox, Loading, Spinner } from "./pkgUi";
import { BASE, fmtD, fmtDT } from "./pkgUtil";
import { ShareResult } from "./PackageShare";
import { QBASE, ask } from "./quoteUtil";

const stateChip = (s) => (s === "active" ? <span style={chip(T.grnL, T.grn, T.grnM)}>{t("sales_quote_ui.link_active")}</span>
  : s === "expired" ? <span style={chip(T.sltL, T.slt)}>{t("sales_quote_ui.link_expired")}</span>
  : <span style={chip(T.redL, T.red, T.redM)}>{t("sales_quote_ui.link_revoked")}</span>);

export default function QuoteShare({ quote, phone, onClose }) {
  const [links, setLinks] = useState(null);
  const [days, setDays] = useState(String((quote.content && quote.content.meta && quote.content.meta.validity_days) || 60));
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await api.get(`${QBASE}/${quote.id}/links`);
    setLinks(r && r.success ? r.data || [] : []);
  }, [quote.id]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true); setErr("");
    const r = await api.post(`${QBASE}/${quote.id}/links`, { days: parseInt(days, 10) || undefined });
    setBusy(false);
    if (r && r.success && r.data) { setMade(r.data); load(); }
    else setErr((r && r.message) || t("sales_quote_ui.share_failed"));
  };
  const revoke = async (l) => {
    if (!(await ask(t("sales_quote_ui.confirm_revoke")))) return;
    const r = await api.del(`${BASE}/links/${l.id}`);
    if (r && r.success) load(); else window.toast?.error?.((r && r.message) || t("sales_quote_ui.share_failed"));
  };
  const client = (quote.header && quote.header.client_name) || "";
  const msg = made ? t("sales_quote_ui.wa_msg", { name: client, no: quote.quote_no, url: made.url }) : "";

  return (
    <Sheet heading={t("sales_quote_ui.share_title")} subline={quote.quote_no + (client ? " · " + client : "")} onClose={onClose}>
      {made ? <ShareResult url={made.url} pkgName={quote.quote_no} phone={phone} message={msg} /> : null}
      <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{t("sales_quote_ui.share_intro")}</div>
      {phone ? <div style={{ fontSize: 12, color: T.t2, marginBottom: 8 }}>📱 {t("sales_quote_ui.share_to", { phone })}</div> : null}
      <Field label={t("sales_quote_ui.share_days")} style={{ maxWidth: 160 }}>
        <input style={inp} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 3))} />
      </Field>
      <ErrBox>{err}</ErrBox>
      <button type="button" onClick={create} disabled={busy} data-testid="qshare-create" style={{ ...btn("green", busy, true), width: "100%" }}>
        {busy ? <Spinner size={14} color="white" /> : "🔗"} {made ? t("sales_quote_ui.share_make_another") : t("sales_quote_ui.share_make")}
      </button>

      <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, margin: "18px 0 6px", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("sales_quote_ui.share_old")}</div>
      {links == null ? <Loading text={t("sales_quote_ui.loading")} /> : !links.length ? <div style={{ fontSize: 12.5, color: T.t4 }}>{t("sales_quote_ui.share_none")}</div> : (
        <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "hidden" }}>
          {links.map((l, i) => (
            <div key={l.id} data-link={l.id} style={{ padding: "10px 12px", borderTop: i ? "1px solid " + T.b1 : "none", display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontSize: 13, color: T.t1, overflowWrap: "anywhere" }}>{l.label || quote.quote_no}</b>
                  {stateChip(l.state)}
                </div>
                <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3, lineHeight: 1.5 }}>
                  {t("sales_quote_ui.link_opens", { n: l.open_count || 0 })}
                  {l.last_opened_at ? " · " + t("sales_quote_ui.link_last_opened", { at: fmtDT(l.last_opened_at) }) : ""}
                </div>
                <div style={{ fontSize: 11, color: T.t4, marginTop: 1 }}>{t("sales_quote_ui.link_meta", { by: l.created_by_name || "—", at: fmtD(l.created_at), till: fmtD(l.expires_at) })}</div>
              </div>
              {l.state === "active" ? <button type="button" onClick={() => revoke(l)} style={btn("danger")}>{t("sales_quote_ui.revoke")}</button> : null}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
