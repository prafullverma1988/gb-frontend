// ════════════════════════════════════════════════════════════════
// CRM Packages — PDF ka letterhead (14 Nov 2026, Prafull). Sirf Admin.
//
// Package PDF aur client link ke upar naam / pata / phone / GSTIN / logo /
// rang yahin se. Jo khaana empty chhoda wo companies record se aata hai —
// par greenbox bhilai jaisi company me address / GSTIN / logo hai hi nahi,
// isliye PDF ka letterhead bharne ka rasta yahi screen hai.
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import uploadManager from "../../utils/uploadManager";
import { T, btn, inp, card, Field, ErrBox, Loading, Spinner } from "./pkgUi";
import { BASE, DOC_EN } from "./pkgUtil";

const HEX = /^#[0-9a-f]{6}$/i;

export default function PackageLetterhead({ onBack, onSaved }) {
  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get(`${BASE}/settings`).then((r) => {
      if (!alive) return;
      if (!(r && r.success)) { setErr((r && r.message) || t("sales_pkg_ui.load_failed")); setForm({}); return; }
      const s = (r.data && r.data.saved) || null, e = (r.data && r.data.effective) || {};
      const src = s || e;
      setForm({
        display_name: src.display_name || "",
        address_lines: Array.isArray(src.address_lines) ? src.address_lines.join("\n") : String(src.address_lines || ""),
        phones: src.phones || "", email: src.email || "", gstin: src.gstin || "",
        logo_url: src.logo_url || "", accent: HEX.test(src.accent || "") ? src.accent : "#2B3175",
      });
    });
    return () => { alive = false; };
  }, []);

  if (!form) return <Loading />;
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickLogo = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!(f.type || "").startsWith("image/")) { setErr(t("sales_pkg_ui.err_logo_image")); return; }
    setUploading(true); setErr("");
    uploadManager.add({
      file: f, folder: "gb_buildcon/sales-packages", label: t("sales_pkg_ui.logo_upload_label", { name: f.name }),
      onDone: (url) => { set("logo_url", url); setUploading(false); },
      onError: () => { setUploading(false); setErr(t("sales_pkg_ui.err_logo_upload")); },
    });
  };
  const save = async () => {
    const logo = String(form.logo_url || "").trim();
    if (logo && !/^https:\/\//i.test(logo)) { setErr(t("sales_pkg_ui.err_logo_https")); return; }
    if (form.accent && !HEX.test(form.accent)) { setErr(t("sales_pkg_ui.err_accent")); return; }
    setBusy(true); setErr("");
    const r = await api.put(`${BASE}/settings`, { ...form, logo_url: logo });
    setBusy(false);
    if (r && r.success) { window.toast?.success?.(t("sales_pkg_ui.letterhead_saved")); onSaved && onSaved(r.data); }
    else setErr((r && r.message) || t("sales_pkg_ui.save_failed"));
  };

  const A = HEX.test(form.accent) ? form.accent : "#2B3175";
  const lines = String(form.address_lines || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const contact = [form.phones ? DOC_EN.mob + " " + form.phones : "", form.email, form.gstin ? DOC_EN.gstin + " " + form.gstin : ""].filter(Boolean).join("  |  ");

  return (
    <div data-testid="pkg-letterhead">
      <button type="button" onClick={onBack} style={btn()}>← {t("sales_pkg_ui.back_list")}</button>
      <div style={{ fontSize: 18, fontWeight: 800, color: T.t1, margin: "10px 0 4px" }}>{t("sales_pkg_ui.letterhead_title")}</div>
      <div style={{ fontSize: 12.5, color: T.t3, marginBottom: 12, lineHeight: 1.45 }}>{t("sales_pkg_ui.letterhead_sub")}</div>

      {/* Preview — PDF ke upar jaisa */}
      <div style={{ ...card, marginBottom: 12, fontFamily: "Georgia,serif" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.t4, fontFamily: "'Segoe UI',sans-serif", marginBottom: 6, textTransform: "uppercase" }}>{t("sales_pkg_ui.preview")}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 8, borderBottom: "3px double " + A }}>
          {form.logo_url ? <img src={form.logo_url} alt="" style={{ maxHeight: 56, maxWidth: "40%", objectFit: "contain" }} /> : <div />}
          <div style={{ textAlign: "right", flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: A }}>{form.display_name || "—"}</div>
            {lines.map((l, i) => <div key={i} style={{ fontSize: 12, color: "#4a4f63" }}>{l}</div>)}
            {contact ? <div style={{ fontSize: 12, color: "#4a4f63" }}>{contact}</div> : null}
          </div>
        </div>
      </div>

      <div style={card}>
        <Field label={t("sales_pkg_ui.lh_name")}><input style={inp} value={form.display_name} onChange={(e) => set("display_name", e.target.value)} name="display_name" /></Field>
        <Field label={t("sales_pkg_ui.lh_address")} hint={t("sales_pkg_ui.lh_address_hint")}>
          <textarea style={{ ...inp, minHeight: 80, resize: "vertical", lineHeight: 1.45 }} value={form.address_lines} onChange={(e) => set("address_lines", e.target.value)} name="address_lines" />
        </Field>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Field label={t("sales_pkg_ui.lh_phones")} style={{ flex: "1 1 180px" }}><input style={inp} value={form.phones} onChange={(e) => set("phones", e.target.value)} inputMode="tel" /></Field>
          <Field label={t("sales_pkg_ui.lh_email")} style={{ flex: "1 1 180px" }}><input style={inp} value={form.email} onChange={(e) => set("email", e.target.value)} inputMode="email" /></Field>
          <Field label={t("sales_pkg_ui.lh_gstin")} style={{ flex: "1 1 160px" }}><input style={inp} value={form.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase().slice(0, 20))} /></Field>
        </div>
        <Field label={t("sales_pkg_ui.lh_logo")} hint={t("sales_pkg_ui.lh_logo_hint")}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input style={{ ...inp, flex: "1 1 220px" }} value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://" />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickLogo} />
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading} style={btn("soft", uploading)}>
              {uploading ? <Spinner size={13} /> : "🖼"} {t("sales_pkg_ui.lh_upload")}
            </button>
            {form.logo_url ? <button type="button" onClick={() => set("logo_url", "")} style={btn("danger")}>{t("sales_pkg_ui.remove")}</button> : null}
          </div>
        </Field>
        <Field label={t("sales_pkg_ui.lh_accent")}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={A} onChange={(e) => set("accent", e.target.value)} style={{ width: 48, height: 38, border: "1px solid " + T.b1, borderRadius: 8, padding: 2, background: "white", cursor: "pointer" }} />
            <input style={{ ...inp, width: 120 }} value={form.accent} onChange={(e) => set("accent", e.target.value.trim().slice(0, 7))} />
          </div>
        </Field>
        <ErrBox>{err}</ErrBox>
        <button type="button" onClick={save} disabled={busy || uploading} style={{ ...btn("primary", busy || uploading, true), width: "100%" }}>{busy ? <Spinner size={14} color="white" /> : null} {t("sales_pkg_ui.save")}</button>
      </div>
    </div>
  );
}
