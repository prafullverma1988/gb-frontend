// ════════════════════════════════════════════════════════════════
// CRM Packages — client ko link (14 Nov 2026, Prafull)
//
// "Link banao" → bina-login link (phone par padhne layak page + PDF). URL
// sirf isi jawab me aata hai (DB me token ka sha256) — isliye turant Copy /
// WhatsApp. WhatsApp: wa.me khulta hai, system khud nahi bhejta. Neeche
// purane link: kitni baar khula, aakhri baar kab, band karo.
// Draft (AI / PDF se bana, jaancha nahi) package ka link server banata hi
// nahi (409 NOT_CHECKED) — button pehle hi band.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import SearchSelect from "../../components/SearchSelect";
import { T, btn, inp, chip, Field, Sheet, ErrBox, Loading, Spinner } from "./pkgUi";
import { BASE, copyText, fmtDT, fmtD, waUrl } from "./pkgUtil";

const stateChip = (s) => (s === "active" ? <span style={chip(T.grnL, T.grn, T.grnM)}>{t("sales_pkg_ui.link_active")}</span>
  : s === "expired" ? <span style={chip(T.sltL, T.slt)}>{t("sales_pkg_ui.link_expired")}</span>
  : <span style={chip(T.redL, T.red, T.redM)}>{t("sales_pkg_ui.link_revoked")}</span>);

// message: apna WhatsApp text (quote ka) — warna package wala
export function ShareResult({ url, pkgName, phone, message }) {
  const [copied, setCopied] = useState(false);
  const msg = message || t("sales_pkg_ui.wa_msg", { name: pkgName, url });
  const doCopy = async () => { const ok = await copyText(url); setCopied(ok); if (ok) setTimeout(() => setCopied(false), 2000); };
  return (
    <div data-testid="share-result" style={{ background: T.grnL, border: "1px solid " + T.grnM, borderRadius: 10, padding: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: T.grn, marginBottom: 6 }}>✓ {t("sales_pkg_ui.link_ready")}</div>
      <input readOnly value={url} onFocus={(e) => e.target.select()} data-testid="share-url"
        style={{ ...inp, fontSize: 12.5, background: "white", fontFamily: "ui-monospace,Consolas,monospace" }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <a href={waUrl(msg, phone)} target="_blank" rel="noopener noreferrer" data-testid="share-wa" style={{ ...btn("wa", false, true), textDecoration: "none", flex: "1 1 160px" }}>
          💬 {t("sales_pkg_ui.wa_send")}
        </a>
        <button type="button" onClick={doCopy} style={{ ...btn("plain", false, true), flex: "1 1 120px" }}>{copied ? "✓ " + t("sales_pkg_ui.copied") : "⧉ " + t("sales_pkg_ui.copy")}</button>
      </div>
    </div>
  );
}

export default function PackageShare({ pkg, content, onClose }) {
  const [links, setLinks] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadId, setLeadId] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(String((content && content.meta && content.meta.validity_days) || 60));
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const [err, setErr] = useState("");
  const draft = pkg.status !== "checked";

  const loadLinks = useCallback(async () => {
    const r = await api.get(`${BASE}/${pkg.id}/links`);
    setLinks(r && r.success ? r.data || [] : []);
  }, [pkg.id]);
  useEffect(() => { loadLinks(); }, [loadLinks]);
  useEffect(() => {
    let alive = true;
    api.get("/crm/leads").then((r) => { if (alive && r && r.success && Array.isArray(r.data)) setLeads(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const lead = leads.find((l) => String(l.id) === String(leadId));
  const create = async () => {
    setBusy(true); setErr("");
    const body = { label: label.trim() || (lead ? lead.name : undefined), days: parseInt(days, 10) || undefined };
    if (leadId) body.lead_id = Number(leadId);
    const r = await api.post(`${BASE}/${pkg.id}/links`, body);
    setBusy(false);
    if (r && r.success && r.data) { setMade(r.data); loadLinks(); }
    else setErr((r && r.message) || t("sales_pkg_ui.share_failed"));
  };
  const revoke = async (l) => {
    const ask = typeof window.confirmAsync === "function" ? window.confirmAsync : (m) => Promise.resolve(window.confirm(m));
    if (!(await ask(t("sales_pkg_ui.confirm_revoke")))) return;
    const r = await api.del(`${BASE}/links/${l.id}`);
    if (r && r.success) loadLinks(); else window.toast?.error?.((r && r.message) || t("sales_pkg_ui.share_failed"));
  };

  return (
    <Sheet heading={t("sales_pkg_ui.share_title")} subline={pkg.name} onClose={onClose}>
      {draft ? <ErrBox tone="amber">{t("sales_pkg_ui.share_draft_block")}</ErrBox> : (
        <>
          {made ? <ShareResult url={made.url} pkgName={pkg.name} phone={lead && lead.phone} /> : null}
          <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{t("sales_pkg_ui.share_intro")}</div>
          <Field label={t("sales_pkg_ui.share_lead")} hint={t("sales_pkg_ui.share_lead_hint")}>
            <SearchSelect value={leadId} onChange={(k) => setLeadId(k || "")} placeholder={t("sales_pkg_ui.share_lead_ph")}
              options={[{ key: "", label: t("sales_pkg_ui.share_no_lead") }, ...leads.map((l) => ({ key: String(l.id), label: l.name || "#" + l.id, sub: [l.phone, l.city].filter(Boolean).join(" · "), search: l.phone || "" }))]} />
          </Field>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Field label={t("sales_pkg_ui.share_label")} style={{ flex: "2 1 200px" }}>
              <input style={inp} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("sales_pkg_ui.share_label_ph")} />
            </Field>
            <Field label={t("sales_pkg_ui.share_days")} style={{ flex: "1 1 100px" }}>
              <input style={inp} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 3))} />
            </Field>
          </div>
          <ErrBox>{err}</ErrBox>
          <button type="button" onClick={create} disabled={busy} data-testid="share-create" style={{ ...btn("green", busy, true), width: "100%" }}>
            {busy ? <Spinner size={14} color="white" /> : "🔗"} {made ? t("sales_pkg_ui.share_make_another") : t("sales_pkg_ui.share_make")}
          </button>
        </>
      )}

      <div style={{ fontSize: 12, fontWeight: 800, color: T.t2, margin: "18px 0 6px", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("sales_pkg_ui.share_old_links")}</div>
      {links == null ? <Loading /> : !links.length ? <div style={{ fontSize: 12.5, color: T.t4 }}>{t("sales_pkg_ui.share_no_links")}</div> : (
        <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "hidden" }}>
          {links.map((l, i) => (
            <div key={l.id} data-link={l.id} style={{ padding: "10px 12px", borderTop: i ? "1px solid " + T.b1 : "none", display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontSize: 13, color: T.t1, overflowWrap: "anywhere" }}>{l.label || l.lead_name || t("sales_pkg_ui.link_n", { id: l.id })}</b>
                  {stateChip(l.state)}
                  {l.version_no ? <span style={chip(T.sltL, T.slt)}>v{l.version_no}</span> : null}
                </div>
                <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3, lineHeight: 1.5 }}>
                  {t("sales_pkg_ui.link_opens", { n: l.open_count || 0 })}
                  {l.last_opened_at ? " · " + t("sales_pkg_ui.link_last_opened", { at: fmtDT(l.last_opened_at) }) : ""}
                </div>
                <div style={{ fontSize: 11, color: T.t4, marginTop: 1 }}>
                  {t("sales_pkg_ui.link_meta", { by: l.created_by_name || "—", at: fmtD(l.created_at), till: fmtD(l.expires_at) })}
                </div>
              </div>
              {l.state === "active" ? <button type="button" onClick={() => revoke(l)} style={btn("danger")}>{t("sales_pkg_ui.revoke")}</button> : null}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
