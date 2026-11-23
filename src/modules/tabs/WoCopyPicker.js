// Subcon WO — "Doosre WO se copy" (23 Nov 2026, Prafull). Company ke kisi bhi project
// ka WO (koi bhi thekedar) chuno → uska format aur payment schedule naye WO me.
// Server: GET /subcon/wo-copy/list, GET /subcon/wo-copy/:id (gb-backend utils/subconCopy.js).
// onPick(detail) — detail = { wo, sections:[{ title, items:[…] }], schedule }.

import React, { useState, useEffect } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { BackClose } from "../../utils/backNav";

const num = (v) => Number(v) || 0;
const inr = (n) => "₹" + num(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const inp = { width: "100%", boxSizing: "border-box", padding: "7px 9px", borderRadius: 6, border: `1px solid ${T.b2}`, fontSize: 12.5, fontFamily: "inherit", background: T.surface, color: T.t1 };
const methodLabel = (m) => ({ milestone_rate: t("subcon.copy_m_rate"), milestone_percent: t("subcon.copy_m_pct") }[m] || t("subcon.copy_m_line"));

export default function WoCopyPicker({ currentProjectId, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);      // detail
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => {
      api.get(`/subcon/wo-copy/list?q=${encodeURIComponent(q)}`)
        .then((r) => (r.success ? setList(r.data) : setErr(r.message || t("subcon.pick_load_fail"))))
        .catch(() => setErr(t("subcon.pick_load_fail")));
    }, 250);
    return () => clearTimeout(h);
  }, [q]);
  const open = async (id) => {
    setBusy(true);
    const r = await api.get(`/subcon/wo-copy/${id}`).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (r.success) setSel(r.data); else setErr(r.message || t("subcon.pick_load_fail"));
  };
  const stages = sel ? (sel.schedule.billing_method === "milestone_percent" ? sel.schedule.percent.length
    : Object.values(sel.schedule.rate_items || {}).reduce((a, x) => Math.max(a, x.length), 0)) : 0;
  const partLines = sel ? sel.sections.reduce((a, s) => a + s.items.filter((i) => i.part_of).length, 0) : 0;
  const nLines = sel ? sel.sections.reduce((a, s) => a + s.items.length, 0) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 650, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <BackClose onClose={onClose} />
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t("subcon.way_copy")}
        style={{ background: T.surface, borderRadius: 10, width: "min(760px,94vw)", maxHeight: "84vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>
            {sel ? <button type="button" onClick={() => setSel(null)} style={{ background: "none", border: "none", color: T.ind, cursor: "pointer", fontSize: 13, padding: 0, marginRight: 8 }}>← {t("subcon.copy_back")}</button> : null}
            {t("subcon.way_copy")}
          </div>
          <button onClick={onClose} aria-label={t("common.close")} style={{ background: "none", border: "none", fontSize: 20, color: T.t3, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "12px 16px", overflowY: "auto", flex: 1 }}>
          {err && <div style={{ color: T.red, fontSize: 12.5, marginBottom: 8 }}>{err}</div>}
          {!sel ? (<>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("subcon.copy_search")} style={{ ...inp, marginBottom: 10 }} />
            {!list ? <div style={{ color: T.t4, fontSize: 12.5 }}>{t("common.loading")}</div> : !list.length ? (
              <div style={{ color: T.t3, fontSize: 12.5, padding: 8 }}>{t("subcon.copy_none")}</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {list.map((w) => (
                  <button key={w.id} type="button" disabled={busy} onClick={() => open(w.id)}
                    style={{ textAlign: "left", border: `1px solid ${T.b1}`, borderRadius: 8, background: T.surface, padding: "9px 11px", cursor: "pointer", fontFamily: "inherit", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {w.subcon_name || "—"}{w.subcon_category ? <span style={{ fontWeight: 400, color: T.t3 }}> · {w.subcon_category}</span> : null}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {w.project_name || "—"}{Number(w.project_id) === Number(currentProjectId) ? " · " + t("subcon.copy_this_project") : ""}
                        {" · "}{t("subcon.copy_lines", { n: w.lines })} · {methodLabel(w.billing_method)}
                        {w.part_lines > 0 ? " · " + t("subcon.copy_parts", { n: w.part_lines }) : ""}
                      </span>
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.t2, whiteSpace: "nowrap" }}>{inr(w.total_value)}</span>
                  </button>
                ))}
              </div>
            )}
          </>) : (<>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{sel.wo.subcon_name} · {sel.wo.project_name}</div>
            <div style={{ fontSize: 12, color: T.t3, margin: "3px 0 10px" }}>
              {t("subcon.copy_lines", { n: nLines })} · {inr(sel.wo.total_value)} · {methodLabel(sel.schedule.billing_method)}
              {stages > 0 ? " · " + t("subcon.copy_stages", { n: stages }) : ""}{partLines > 0 ? " · " + t("subcon.copy_parts", { n: partLines }) : ""}
            </div>
            <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
              {sel.sections.map((s, i) => (
                <div key={i} style={{ borderTop: i ? `1px solid ${T.b1}` : "none" }}>
                  <div style={{ padding: "6px 10px", background: T.surfaceB, fontSize: 11.5, fontWeight: 700, color: T.t2 }}>{s.title || "—"}</div>
                  {s.items.slice(0, 6).map((it) => (
                    <div key={it.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, padding: "5px 10px", fontSize: 12, borderTop: `1px solid ${T.b1}` }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: T.t1 }}>{it.description}</span>
                      <span style={{ color: T.t3, whiteSpace: "nowrap" }}>{num(it.qty).toLocaleString("en-IN")} {it.unit} × {inr(it.rate)}</span>
                    </div>
                  ))}
                  {s.items.length > 6 && <div style={{ padding: "4px 10px", fontSize: 11, color: T.t4 }}>{t("subcon.copy_more", { n: s.items.length - 6 })}</div>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: T.t2, lineHeight: 1.5, background: T.surfaceB, borderRadius: 8, padding: "8px 10px" }}>{t("subcon.copy_note")}</div>
          </>)}
        </div>
        {sel && (
          <div style={{ padding: "10px 16px 12px", borderTop: `1px solid ${T.b1}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setSel(null)} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${T.b2}`, background: T.surface, fontSize: 12.5, cursor: "pointer" }}>{t("subcon.copy_back")}</button>
            <button type="button" onClick={() => onPick(sel)} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: T.ind, color: "white", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>{t("subcon.copy_use")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
