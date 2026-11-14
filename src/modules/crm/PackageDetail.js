// ════════════════════════════════════════════════════════════════
// CRM Packages — ek package (14 Nov 2026, Prafull)
//
// Upar naam / rate / version / status, buttons: PDF · Share · Versions · AI.
// Admin: "Edit karo" → document me tap karke badlo (draft page par hi), upar
// "Unsaved changes" jab tak "Save karo" (PUT base_version_id ke saath — beech
// me kisi ne save kiya to 409 STALE: sandesh + taaza). Draft (AI / PDF se
// bana) par peela banner: jaanch ke baad "Jaanch ho gayi"; tab tak Share band.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { T, btn, inp, chip, card, Field, Sheet, ErrBox, Loading, Spinner, StatusChip, sourceLabel } from "./pkgUi";
import { BASE, clone, fmtDT, inr, openPkgPdf } from "./pkgUtil";
import PackageDocument from "./PackageDocument";
import PackageEditModal from "./PackageEditModal";
import PackageAiPanel from "./PackageAiPanel";
import PackageShare from "./PackageShare";
import PackageVersions from "./PackageVersions";

const scrollTop = () => { try { const el = document.querySelector("[data-pkg-scroll]"); if (el) el.scrollTop = 0; } catch (_) { /* koi baat nahi */ } };
const ask = (m) => (typeof window.confirmAsync === "function" ? window.confirmAsync(m) : Promise.resolve(window.confirm(m)));

export function RateLine({ pkg, big }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
      {pkg.rate_full != null
        ? <span style={{ fontSize: big ? 20 : 17, fontWeight: 800, color: T.blu }}>{t("sales_pkg_ui.rate_per_unit", { rate: inr(pkg.rate_full), unit: pkg.unit || "sq.ft." })}</span>
        : <span style={{ fontSize: 13, color: T.t4 }}>{t("sales_pkg_ui.no_rate")}</span>}
      {pkg.rate_structure != null ? <span style={{ fontSize: 12.5, color: T.t3, fontWeight: 600 }}>{t("sales_pkg_ui.structure_only", { rate: inr(pkg.rate_structure) })}</span> : null}
    </div>
  );
}

function RenameSheet({ pkg, contentName, onClose, onDone }) {
  const [name, setName] = useState(pkg.name || "");
  const [tagline, setTagline] = useState(pkg.tagline || "");
  const [alsoDoc, setAlsoDoc] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!name.trim()) { setErr(t("sales_pkg_ui.err_name")); return; }
    setBusy(true); setErr("");
    const r = await api.patch(`${BASE}/${pkg.id}`, { name: name.trim(), tagline: tagline.trim() });
    setBusy(false);
    if (r && r.success) onDone(name.trim(), alsoDoc && name.trim() !== contentName);
    else setErr((r && r.message) || t("sales_pkg_ui.save_failed"));
  };
  return (
    <Sheet heading={t("sales_pkg_ui.rename_title")} onClose={onClose}
      footer={<><button type="button" onClick={onClose} style={btn()}>{t("sales_pkg_ui.cancel")}</button>
        <button type="button" onClick={save} disabled={busy} style={btn("primary", busy)}>{t("sales_pkg_ui.save")}</button></>}>
      <Field label={t("sales_pkg_ui.f_pkg_name")}><input style={inp} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={t("sales_pkg_ui.f_tagline")} hint={t("sales_pkg_ui.tagline_hint")}><input style={inp} value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field>
      {name.trim() && name.trim() !== contentName ? (
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: T.t2, cursor: "pointer" }}>
          <input type="checkbox" checked={alsoDoc} onChange={(e) => setAlsoDoc(e.target.checked)} style={{ width: 18, height: 18, flexShrink: 0 }} />
          <span>{t("sales_pkg_ui.rename_also_doc", { old: contentName || "—" })}</span>
        </label>
      ) : null}
      <ErrBox>{err}</ErrBox>
    </Sheet>
  );
}

export default function PackageDetail({ id, letterhead, onBack, onChanged, onCopy }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [target, setTarget] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState(null);       // share | versions | rename
  const [showAi, setShowAi] = useState(false);
  const [old, setOld] = useState(null);           // purana version (sirf padhna)
  const [pdfBusy, setPdfBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get(`${BASE}/${id}`);
    if (r && r.success && r.data) { setData({ ...r.data, can_edit: !!r.can_edit }); setErr(""); }
    else setErr((r && r.message) || t("sales_pkg_ui.load_failed"));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const saved = data && data.version ? data.version.content : null;
  const dirty = useMemo(() => !!(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved)), [draft, saved]);
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; return ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  if (err && !data) {
    return (
      <div>
        <button type="button" onClick={onBack} style={btn()}>← {t("sales_pkg_ui.back_list")}</button>
        <ErrBox>{err}</ErrBox>
        <button type="button" onClick={load} style={btn("soft")}>↻ {t("sales_pkg_ui.try_again")}</button>
      </div>
    );
  }
  if (!data) return <Loading />;

  const pkg = data.package;
  const canEdit = !!data.can_edit;
  const version = data.version || {};
  const content = old ? old.content : (draft || saved);
  const isDraft = pkg.status !== "checked";

  const back = async () => {
    if (dirty && !(await ask(t("sales_pkg_ui.confirm_discard")))) return;
    onBack();
  };
  const discard = async () => {
    if (!(await ask(t("sales_pkg_ui.confirm_discard")))) return;
    setDraft(null); setNote("");
  };
  const save = async () => {
    setSaving(true); setNotice("");
    const r = await api.put(`${BASE}/${id}`, { content: draft, base_version_id: version.id, change_note: note.trim() || undefined }, { timeoutMs: 30000 });
    setSaving(false);
    if (r && r.success) {
      const d = r.data || {};
      window.toast?.success?.(d.unchanged ? t("sales_pkg_ui.saved_unchanged") : t("sales_pkg_ui.saved_v", { v: d.version_no }));
      setDraft(null); setNote(""); setEditMode(false);
      await load();
      onChanged && onChanged();
    } else if (r && (r.code === "STALE" || r._status === 409)) {
      // Beech me kisi aur ne save kiya — apni copy chhod kar taaza
      setNotice(r.message || t("sales_pkg_ui.stale_fallback"));
      setDraft(null);
      await load();
    } else {
      window.toast?.error?.((r && r.message) || t("sales_pkg_ui.save_failed"));
    }
  };
  const markChecked = async () => {
    if (dirty) { window.toast?.warning?.(t("sales_pkg_ui.save_first")); return; }
    if (!(await ask(t("sales_pkg_ui.confirm_checked")))) return;
    setChecking(true);
    const r = await api.patch(`${BASE}/${id}`, { status: "checked" });
    setChecking(false);
    if (r && r.success) { window.toast?.success?.(t("sales_pkg_ui.checked_ok")); await load(); onChanged && onChanged(); }
    else window.toast?.error?.((r && r.message) || t("sales_pkg_ui.save_failed"));
  };
  const remove = async () => {
    if (!(await ask(t("sales_pkg_ui.confirm_delete", { name: pkg.name })))) return;
    const r = await api.del(`${BASE}/${id}`);
    if (r && r.success) { window.toast?.success?.(t("sales_pkg_ui.deleted")); onChanged && onChanged(); onBack(); }
    else window.toast?.error?.((r && r.message) || t("sales_pkg_ui.save_failed"));
  };
  const pdf = async () => {
    setPdfBusy(true);
    try { await openPkgPdf(id, old ? old.id : null); }
    catch (e) { window.toast?.error?.(t("sales_pkg_ui.pdf_failed"), e && e.message); }
    setPdfBusy(false);
  };
  const viewOld = async (v) => {
    const r = await api.get(`${BASE}/${id}/versions/${v.id}`);
    if (r && r.success && r.data) { setOld(r.data); setPanel(null); setEditMode(false); scrollTop(); }
    else window.toast?.error?.((r && r.message) || t("sales_pkg_ui.load_failed"));
  };
  const restoreOld = async () => {
    if (!old) return;
    if (dirty) { window.toast?.warning?.(t("sales_pkg_ui.save_first")); return; }
    if (!(await ask(t("sales_pkg_ui.confirm_restore", { v: old.version_no })))) return;
    const r = await api.post(`${BASE}/${id}/restore/${old.id}`, {});
    if (r && r.success) {
      window.toast?.success?.(t("sales_pkg_ui.restored", { v: old.version_no, n: (r.data && r.data.version_no) || "" }));
      setOld(null); await load(); onChanged && onChanged();
    } else window.toast?.error?.((r && r.message) || t("sales_pkg_ui.save_failed"));
  };
  const applyEdit = (c) => { setDraft(c); setTarget(null); };

  const pillBtn = (on) => ({ ...btn(on ? "soft" : "plain"), flex: "0 0 auto" });

  return (
    <div data-testid="pkg-detail">
      {/* ── Upar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={back} style={btn()}>← {t("sales_pkg_ui.back_list")}</button>
      </div>
      <div style={{ ...card, marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.t1, overflowWrap: "anywhere" }}>{pkg.name}</div>
            {pkg.tagline ? <div style={{ fontSize: 13, color: T.t3, marginTop: 2, overflowWrap: "anywhere" }}>{pkg.tagline}</div> : null}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <StatusChip status={pkg.status} />
            <span style={chip(T.sltL, T.slt)}>v{pkg.version_no}</span>
            {pkg.source ? <span style={chip(T.surfaceB, T.t3, T.b1)}>{sourceLabel(pkg.source)}</span> : null}
          </div>
        </div>
        <div style={{ marginTop: 8 }}><RateLine pkg={pkg} big /></div>
        <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>
          {t("sales_pkg_ui.version_meta", { by: version.created_by_name || "—", at: fmtDT(version.created_at) })}
          {version.change_note ? " · " + version.change_note : ""}
        </div>

        {/* ── Buttons ── */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" onClick={pdf} disabled={pdfBusy} style={btn("plain", pdfBusy)}>{pdfBusy ? <Spinner size={13} /> : "📄"} {t("sales_pkg_ui.pdf")}</button>
          <button type="button" onClick={() => setPanel("share")} disabled={isDraft} title={isDraft ? t("sales_pkg_ui.share_draft_hint") : undefined}
            data-testid="btn-share" style={btn("green", isDraft)}>🔗 {t("sales_pkg_ui.share")}</button>
          <button type="button" onClick={() => setPanel("versions")} style={btn()}>🕘 {t("sales_pkg_ui.versions")}</button>
          <button type="button" onClick={() => setShowAi((s) => !s)} style={btn(showAi ? "ai" : "plain")}>✨ {t("sales_pkg_ui.ai")}</button>
          {canEdit && !old ? (
            <button type="button" onClick={() => setEditMode((s) => !s)} data-testid="btn-edit" style={btn(editMode ? "primary" : "soft")}>
              ✎ {editMode ? t("sales_pkg_ui.edit_off") : t("sales_pkg_ui.edit_on")}
            </button>
          ) : null}
        </div>
        {isDraft ? <div style={{ fontSize: 11.5, color: T.t4, marginTop: 6 }}>{t("sales_pkg_ui.share_draft_hint")}</div> : null}
        {canEdit && !old ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: "1px dashed " + T.b1 }}>
            <button type="button" onClick={() => setPanel("rename")} style={pillBtn(false)}>✎ {t("sales_pkg_ui.rename")}</button>
            {onCopy ? <button type="button" onClick={() => onCopy(pkg)} style={pillBtn(false)}>⧉ {t("sales_pkg_ui.copy_pkg")}</button> : null}
            <button type="button" onClick={remove} style={{ ...btn("danger"), flex: "0 0 auto" }}>🗑 {t("sales_pkg_ui.delete")}</button>
          </div>
        ) : null}
      </div>

      {notice ? <ErrBox tone="amber">{notice}</ErrBox> : null}

      {/* ── Draft banner ── */}
      {isDraft ? (
        <div data-testid="draft-banner" style={{ background: T.ambL, border: "1px solid " + T.ambM, borderRadius: 12, padding: "11px 13px", marginBottom: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px", fontSize: 12.5, color: "#92400E", lineHeight: 1.5 }}>
            <b>⚠ {t("sales_pkg_ui.draft_title")}</b><br />{t("sales_pkg_ui.draft_body")}
          </div>
          {canEdit ? (
            <button type="button" onClick={markChecked} disabled={checking} style={btn("green", checking)}>{checking ? <Spinner size={13} color="white" /> : "✓"} {t("sales_pkg_ui.mark_checked")}</button>
          ) : null}
        </div>
      ) : null}

      {/* ── Purana version ── */}
      {old ? (
        <div style={{ background: T.sltL, border: "1px solid " + T.b2, borderRadius: 12, padding: "10px 13px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", fontSize: 12.5, color: T.t2 }}>{t("sales_pkg_ui.old_version_banner", { v: old.version_no, at: fmtDT(old.created_at) })}</div>
          {canEdit ? <button type="button" onClick={restoreOld} style={btn("soft")}>↺ {t("sales_pkg_ui.restore")}</button> : null}
          <button type="button" onClick={() => setOld(null)} style={btn()}>{t("sales_pkg_ui.back_current")}</button>
        </div>
      ) : null}

      {showAi ? (
        <PackageAiPanel pkg={pkg} version={version} content={saved} canEdit={canEdit} dirty={dirty} viewingOld={!!old}
          onApplied={async () => { await load(); onChanged && onChanged(); }} />
      ) : null}

      {/* ── Edit mode ki patti ── */}
      {editMode && !old ? (
        <div style={{ background: T.bluL, border: "1px solid " + T.bluM, borderRadius: 12, padding: "10px 13px", marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", fontSize: 12.5, color: T.blu, lineHeight: 1.45 }}>{t("sales_pkg_ui.edit_mode_hint")}</div>
          <button type="button" onClick={() => setTarget({ act: "edit", path: "scopes" })} style={btn("primary")}>₹ {t("sales_pkg_ui.edit_rates")}</button>
        </div>
      ) : null}

      {/* ── Unsaved ── */}
      {dirty && !old ? (
        <div data-testid="unsaved-bar" style={{ position: "sticky", top: 0, zIndex: 5, background: "#FFF7ED", border: "1px solid #FDBA74", borderRadius: 12, padding: "10px 12px", marginBottom: 10,
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}>
          <b style={{ fontSize: 13, color: "#C2410C", flex: "0 0 auto" }}>● {t("sales_pkg_ui.unsaved")}</b>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("sales_pkg_ui.change_note_ph")} style={{ ...inp, flex: "1 1 180px", minHeight: 34, fontSize: 13 }} />
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <button type="button" onClick={discard} disabled={saving} style={btn("plain", saving)}>{t("sales_pkg_ui.discard")}</button>
            <button type="button" onClick={save} disabled={saving} data-testid="btn-save" style={btn("primary", saving)}>{saving ? <Spinner size={13} color="white" /> : null} {t("sales_pkg_ui.save")}</button>
          </div>
        </div>
      ) : null}

      {/* ── Document ── */}
      <div style={{ background: "#fff", border: "1px solid " + T.b1, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
        <PackageDocument content={content} letterhead={letterhead} editable={editMode && canEdit && !old}
          onEdit={(path) => setTarget({ act: "edit", path })} onAdd={(container) => setTarget({ act: "add", container })} />
      </div>

      {target && content ? <PackageEditModal content={draft || saved} target={target} onApply={applyEdit} onClose={() => setTarget(null)} /> : null}
      {panel === "share" ? <PackageShare pkg={pkg} content={saved} onClose={() => setPanel(null)} /> : null}
      {panel === "versions" ? <PackageVersions pkg={pkg} canEdit={canEdit} onView={viewOld} onRestored={async () => { setPanel(null); await load(); onChanged && onChanged(); }} onClose={() => setPanel(null)} /> : null}
      {panel === "rename" ? (
        <RenameSheet pkg={pkg} contentName={(saved && saved.meta && saved.meta.package_name) || ""} onClose={() => setPanel(null)}
          onDone={async (name, alsoDoc) => {
            setPanel(null);
            if (alsoDoc) {
              const c = clone(draft || saved);
              c.meta.package_name = name;
              setDraft(c); setEditMode(true);
              window.toast?.info?.(t("sales_pkg_ui.rename_doc_pending"));
            } else window.toast?.success?.(t("sales_pkg_ui.saved_ok"));
            await load(); onChanged && onChanged();
          }} />
      ) : null}
    </div>
  );
}
