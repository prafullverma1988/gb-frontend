// ════════════════════════════════════════════════════════════════
// CRM → Packages (14 Nov 2026, Prafull)
//
// Client ko pehle package sheet jaati hai (Premium / Signature jaisi), bina
// estimate. Yahan: list (naam, rate / sq.ft., Structure only, version, Draft /
// Checked), ek package (document PDF jaisa, haath ka edit, PDF, Share link,
// Versions, AI), naya package (Template / Copy / AI / PDF), do ka Compare,
// PDF ka Letterhead.
//   Padhna, compare, share: CRM view.  Master package badalna: sirf Admin
//   (server can_edit bhejta hai — wahi maante hain).
// Server: gb-backend routes/sales-packages.js.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { T, FONT, btn, chip, card, ErrBox, Loading, StatusChip, sourceLabel } from "./pkgUi";
import { BASE, fmtD } from "./pkgUtil";
import PackageDetail, { RateLine } from "./PackageDetail";
import PackageCreate, { NewMenu } from "./PackageCreate";
import PackageCompare from "./PackageCompare";
import PackageLetterhead from "./PackageLetterhead";

function PackageCard({ p, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(p.id)} data-pkg={p.id}
      style={{ ...card, textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", gap: 4, width: "100%",
        borderTop: "3px solid " + (p.status === "checked" ? T.blu : T.amb) }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 15.5, fontWeight: 800, color: T.t1, overflowWrap: "anywhere" }}>{p.name}</div>
        <StatusChip status={p.status} />
      </div>
      {p.tagline ? <div style={{ fontSize: 12.5, color: T.t3, lineHeight: 1.4, overflowWrap: "anywhere" }}>{p.tagline}</div> : null}
      <div style={{ marginTop: 4 }}><RateLine pkg={p} /></div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
        <span style={chip(T.sltL, T.slt)}>v{p.version_no}</span>
        {p.source ? <span style={chip(T.surfaceB, T.t3, T.b1)}>{sourceLabel(p.source)}</span> : null}
        <span style={{ fontSize: 11, color: T.t4, marginLeft: "auto" }}>{fmtD(p.updated_at)}</span>
      </div>
    </button>
  );
}

export default function PackagesTab() {
  const [list, setList] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [lh, setLh] = useState(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState({ name: "list" });
  const [menu, setMenu] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get(BASE);
    if (r && r.success) { setList(r.data || []); setCanEdit(!!r.can_edit); setErr(""); }
    else { setList((p) => p || []); setErr((r && r.message) || t("sales_pkg_ui.load_failed")); }
  }, []);
  const loadLh = useCallback(async () => {
    const r = await api.get(`${BASE}/settings`);
    if (r && r.success && r.data) setLh(r.data.effective || null);
  }, []);
  useEffect(() => { load(); loadLh(); }, [load, loadLh]);

  const go = (v) => {
    setMenu(false);
    setView(v);
    try { const el = document.querySelector("[data-pkg-scroll]"); if (el) el.scrollTop = 0; } catch (_) { /* koi baat nahi */ }
  };
  const open = (id) => go({ name: "detail", id });
  const toList = () => go({ name: "list" });
  const packages = list || [];

  let body;
  if (view.name === "detail") {
    body = <PackageDetail key={view.id} id={view.id} letterhead={lh} onBack={toList} onChanged={load}
      onCopy={canEdit ? (p) => go({ name: "create", mode: "copy", fromId: p.id }) : null} />;
  } else if (view.name === "create") {
    body = <PackageCreate mode={view.mode} packages={packages} letterhead={lh} fromId={view.fromId}
      onDone={(id) => { load(); open(id); }} onBack={toList} />;
  } else if (view.name === "compare") {
    body = <PackageCompare packages={packages} initialA={view.a} initialB={view.b} onBack={toList} onOpen={open} />;
  } else if (view.name === "letterhead") {
    body = <PackageLetterhead onBack={toList} onSaved={(eff) => { if (eff) setLh(eff); toList(); }} />;
  } else {
    body = (
      <div data-testid="pkg-list">
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.t1 }}>{t("sales_pkg_ui.title")}</div>
            <div style={{ fontSize: 12, color: T.t3, marginTop: 2, lineHeight: 1.4 }}>{t("sales_pkg_ui.subtitle")}</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => go({ name: "compare" })} disabled={packages.length < 2} style={btn("plain", packages.length < 2)}>⇄ {t("sales_pkg_ui.compare")}</button>
            {canEdit ? <button type="button" onClick={() => go({ name: "letterhead" })} style={btn()}>🏢 {t("sales_pkg_ui.letterhead")}</button> : null}
            {canEdit ? <button type="button" onClick={() => setMenu((m) => !m)} data-testid="btn-new" style={btn("primary")}>+ {t("sales_pkg_ui.new_package")}</button> : null}
          </div>
        </div>
        {menu && canEdit ? <NewMenu onPick={(mode) => go({ name: "create", mode })} onClose={() => setMenu(false)} /> : null}
        <ErrBox>{err}</ErrBox>
        {list == null ? <Loading /> : !packages.length ? (
          <div style={{ ...card, textAlign: "center", padding: 28 }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.t2 }}>{t("sales_pkg_ui.empty")}</div>
            <div style={{ fontSize: 12.5, color: T.t3, marginTop: 4 }}>{canEdit ? t("sales_pkg_ui.empty_admin") : t("sales_pkg_ui.empty_user")}</div>
            {canEdit ? <button type="button" onClick={() => go({ name: "create", mode: "template" })} style={{ ...btn("primary", false, true), marginTop: 12 }}>📋 {t("sales_pkg_ui.new_template")}</button> : null}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 270px), 1fr))", gap: 10 }}>
            {packages.map((p) => <PackageCard key={p.id} p={p} onOpen={open} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-pkg-scroll="1" style={{ height: "100%", overflowY: "auto", overflowX: "hidden", background: T.bg, fontFamily: FONT, WebkitOverflowScrolling: "touch" }}>
      <div style={{ maxWidth: 940, margin: "0 auto", padding: "12px 12px 48px", boxSizing: "border-box" }}>{body}</div>
    </div>
  );
}
