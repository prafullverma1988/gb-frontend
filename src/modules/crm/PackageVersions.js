// CRM Packages — versions (14 Nov 2026). Har save / AI badlaav / restore naya
// version; purana kabhi nahi mitta. "Dekho" = sirf padhne ke liye, Admin
// "Restore" = us version ki copy naya version ban jaati hai.
import { useEffect, useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { T, btn, chip, Sheet, Loading, ErrBox, sourceLabel } from "./pkgUi";
import { BASE, fmtDT } from "./pkgUtil";

export default function PackageVersions({ pkg, canEdit, onView, onRestored, onClose }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(0);
  useEffect(() => {
    let alive = true;
    api.get(`${BASE}/${pkg.id}/versions`).then((r) => {
      if (!alive) return;
      if (r && r.success) setRows(r.data || []); else { setRows([]); setErr((r && r.message) || t("sales_pkg_ui.load_failed")); }
    });
    return () => { alive = false; };
  }, [pkg.id]);

  const restore = async (v) => {
    const ask = typeof window.confirmAsync === "function" ? window.confirmAsync : (m) => Promise.resolve(window.confirm(m));
    if (!(await ask(t("sales_pkg_ui.confirm_restore", { v: v.version_no })))) return;
    setBusy(v.id);
    const r = await api.post(`${BASE}/${pkg.id}/restore/${v.id}`, {});
    setBusy(0);
    if (r && r.success) {
      window.toast?.success?.(t("sales_pkg_ui.restored", { v: v.version_no, n: (r.data && r.data.version_no) || "" }));
      onRestored && onRestored();
    } else setErr((r && r.message) || t("sales_pkg_ui.save_failed"));
  };

  return (
    <Sheet heading={t("sales_pkg_ui.versions_title")} subline={pkg.name} onClose={onClose}>
      <ErrBox>{err}</ErrBox>
      {rows == null ? <Loading /> : !rows.length ? <div style={{ fontSize: 12.5, color: T.t4 }}>{t("sales_pkg_ui.no_versions")}</div> : (
        <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "hidden" }}>
          {rows.map((v, i) => (
            <div key={v.id} data-version={v.id} style={{ padding: "10px 12px", borderTop: i ? "1px solid " + T.b1 : "none", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: v.is_current ? T.bluL : T.surface }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <b style={{ fontSize: 14, color: T.t1 }}>v{v.version_no}</b>
                  {v.is_current ? <span style={chip(T.blu, "white")}>{t("sales_pkg_ui.current")}</span> : null}
                  <span style={chip(T.sltL, T.slt)}>{sourceLabel(v.source)}</span>
                </div>
                {v.change_note ? <div style={{ fontSize: 12.5, color: T.t2, marginTop: 3, overflowWrap: "anywhere" }}>{v.change_note}</div> : null}
                <div style={{ fontSize: 11, color: T.t4, marginTop: 2 }}>{t("sales_pkg_ui.version_meta", { by: v.created_by_name || "—", at: fmtDT(v.created_at) })}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {!v.is_current ? <button type="button" onClick={() => onView(v)} style={btn()}>{t("sales_pkg_ui.view")}</button> : null}
                {canEdit && !v.is_current ? (
                  <button type="button" onClick={() => restore(v)} disabled={!!busy} style={btn("soft", !!busy)}>{busy === v.id ? "…" : "↺ " + t("sales_pkg_ui.restore")}</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
