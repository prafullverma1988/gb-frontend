// ══════════════════════════════════════════════════════════════════════
// BOQ IMPORT — kai road / site wali file (matrix)
//
// Sarkari BOQ aksar aisa hota hai: har row ek item, aur har road/gaon ke
// apne column (Quantity, Amount). Purana wizard ek hi qty column samajhta
// tha — RATNA ke CG-08-272 me 10 me se 1 road aayi aur BOQ ₹2.08 Cr dikha,
// jabki file ₹18.45 Cr kehti hai.
//
// Yahan file SERVER padhta hai (gb-backend routes/tender-boq-matrix.js):
//   • naksha — header, item ki row, har road ke column (niyam se)
//   • ankde — har item × har road ki qty, cell se
//   • match — file ka APNA jod (har road ka Cost A + maintenance) se.
// Screen sirf NAKSHA badal sakti hai (column/row) — ek bhi ankda screen se
// nahi jaata. Import karte waqt server file dobara padh kar dobara milata hai.
//
// Props: tenderId, fileName, fileB64, initial (analyze ka jawab), boqFinal,
//        onClose, onImported(res), onFallback()  ← purane wizard par wapas
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const inr = (n) => (n == null ? "—" : "₹" + Math.round(Number(n)).toLocaleString("en-IN"));
const qtyf = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
const colLetter = (n) => { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const colNum = (s) => String(s || "").toUpperCase().split("").reduce((a, c) => a * 26 + (c.charCodeAt(0) - 64), 0);

// Har jaanch ka CODE server se aata hai — vaakya yahan, user ki bhasha me
const CHECK_TEXT = {
  row_split_sum: (p) => t("boq_matrix.chk_row_split_sum", p),
  row_amount: (p) => t("boq_matrix.chk_row_amount", p),
  site_cost_a: (p) => t("boq_matrix.chk_site_cost_a", p),
  site_cost_b: (p) => t("boq_matrix.chk_site_cost_b", p),
  grand_ab: (p) => t("boq_matrix.chk_grand_ab", p),
  negative_split: (p) => t("boq_matrix.chk_negative_split", p),
  code_as_desc: (p) => t("boq_matrix.chk_code_as_desc", p),
  empty_desc: (p) => t("boq_matrix.chk_empty_desc", p),
  file_total_nahi: (p) => t("boq_matrix.chk_file_total_nahi", p),
};
const checkText = (c) => (CHECK_TEXT[c.code] || ((p) => t("boq_matrix.chk_anya", p)))({
  row: c.row == null ? "" : c.row, site: c.site || "", expected: c.expected == null ? "—" : Number(c.expected).toLocaleString("en-IN"),
  got: c.got == null ? "—" : Number(c.got).toLocaleString("en-IN"), diff: c.diff == null ? "" : Number(c.diff).toLocaleString("en-IN"),
});

const box = { background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 9 };
const th = { fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px", padding: "6px 8px",
  textAlign: "left", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, whiteSpace: "nowrap" };
const td = { fontSize: 11.5, color: T.t2, padding: "6px 8px", borderBottom: `1px solid ${T.b1}`, verticalAlign: "top" };
const inp = { padding: "5px 7px", border: `1px solid ${T.b1}`, borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: T.surface, color: T.t1 };
const btn = (kind, extra) => ({
  height: 32, padding: "0 13px", borderRadius: 7, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  border: kind === "primary" ? "none" : `1px solid ${T.b1}`, background: kind === "primary" ? T.ind : T.surface,
  color: kind === "primary" ? "#fff" : T.t2, ...extra,
});

export default function BoqMatrixImport({ tenderId, fileName, fileB64, initial, boqFinal, onClose, onImported, onFallback }) {
  const [data, setData] = useState(initial);
  const [layout, setLayout] = useState(() => JSON.parse(JSON.stringify(initial.layout)));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState("");
  const [showItems, setShowItems] = useState(false);

  const recon = data.recon || {};
  const checks = recon.checks || [];
  const fails = checks.filter((c) => c.level === "fail");
  const warns = checks.filter((c) => c.level === "warn");
  const siteCheck = (name, code) => checks.find((c) => c.code === code && c.site === name);
  const work = (data.items || []).filter((i) => i.part === "work");
  const maint = (data.items || []).filter((i) => i.part === "maintenance");

  // column ke options — naksha me jitne column dikhe, uske thoda aage tak
  const maxCol = useMemo(() => {
    const all = [...Object.values(layout.cols || {}), ...(layout.sites || []).flatMap((s) => [s.qty, s.amount]),
      layout.total && layout.total.qty, layout.total && layout.total.amount].filter(Boolean).map(colNum);
    return Math.max(10, ...all) + 4;
  }, [layout]);
  const colOpts = useMemo(() => Array.from({ length: maxCol }, (_, i) => colLetter(i + 1)), [maxCol]);

  const edit = (fn) => { setLayout((l) => { const n = JSON.parse(JSON.stringify(l)); fn(n); return n; }); setDirty(true); };

  const recheck = async () => {
    setBusy("check"); setErr("");
    let r = null;
    try { r = await api.post(`/tenders/${tenderId}/boq/analyze`, { file_b64: fileB64, file_name: fileName, layout }); }
    catch (e) { r = { success: false, message: e && e.message }; }
    setBusy("");
    if (!r || !r.success) { setErr((r && r.message) || t("boq_matrix.check_fail")); return; }
    setData(r.data); setLayout(JSON.parse(JSON.stringify(r.data.layout))); setDirty(false);
  };

  const doImport = async () => {
    setBusy("import"); setErr("");
    let r = null;
    try {
      r = await api.post(`/tenders/${tenderId}/boq/import-matrix`, {
        file_b64: fileB64, file_name: fileName, layout,
        ...(boqFinal ? { reason: reason.trim() } : {}),
        ...(!recon.ok ? { override_reason: override.trim() } : {}),
      });
    } catch (e) { r = { success: false, message: e && e.message }; }
    setBusy("");
    if (!r || !r.success) {
      if (r && r.code === "reconcile_failed" && r.recon) setData((d) => ({ ...d, recon: r.recon }));
      setErr((r && r.message) || t("boq_matrix.import_fail"));
      return;
    }
    onImported(r);
  };

  const needReason = boqFinal && reason.trim().length < 10;
  const needOverride = !recon.ok && override.trim().length < 10;
  const canImport = !dirty && !busy && !needReason && !needOverride;
  const file = recon.file || {};

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 520, background: "rgba(17,24,39,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "24px 14px" }}>
      <div style={{ width: "100%", maxWidth: 1020, background: T.bg || T.surface, borderRadius: 12, border: `1px solid ${T.b1}`, boxShadow: "0 18px 48px rgba(0,0,0,.22)" }}>
        {/* ── sar ── */}
        <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.b1}`, background: T.surface, borderRadius: "12px 12px 0 0", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>{t("boq_matrix.title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginTop: 3 }}>{fileName} · {t("boq_matrix.sheet", { name: layout.sheet })}</div>
          </div>
          <button onClick={onClose} style={btn("ghost")}>{t("common.close")}</button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ fontSize: 12, color: T.t3, lineHeight: 1.6 }}>{t("boq_matrix.intro", { n: (data.sites || []).length })}</div>

          {/* ── match ka saar ── */}
          <div style={{ ...box, padding: "12px 14px", borderLeft: `4px solid ${recon.ok ? T.grn : T.red}` }}>
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "flex-end" }}>
              {[[t("boq_matrix.k_roads"), (data.sites || []).length],
                [t("boq_matrix.k_items"), t("boq_matrix.k_items_v", { w: work.length, m: maint.length })],
                [t("boq_matrix.k_boq"), inr(recon.boq_total)],
                [t("boq_matrix.k_file"), file.cost_a == null ? "—" : inr(file.cost_a + (file.cost_b || 0))]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{v}</div>
                  <div style={{ fontSize: 10.5, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>{l}</div>
                </div>
              ))}
              <div style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 800, color: recon.ok ? T.grn : T.red }}>
                {recon.ok ? t("boq_matrix.match_ok") : t("boq_matrix.match_fail", { n: fails.length })}
              </div>
            </div>
            {file.gst != null && (
              <div style={{ marginTop: 9, fontSize: 11.5, color: T.t3 }}>{t("boq_matrix.gst_note", { gst: inr(file.gst), grand: inr(file.grand) })}</div>
            )}
            {recon.rounding === "rupee" && <div style={{ marginTop: 4, fontSize: 11, color: T.t4 }}>{t("boq_matrix.rounding_note")}</div>}
          </div>

          {/* ── har road ── */}
          <div style={{ ...box, overflow: "hidden" }}>
            <div style={{ padding: "10px 13px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB, fontSize: 12.5, fontWeight: 700, color: T.t1 }}>{t("boq_matrix.roads_title")}</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
                <thead><tr>
                  {["#", t("boq_matrix.c_road"), t("boq_matrix.c_qty_col"), t("boq_matrix.c_amt_col"), t("boq_matrix.c_file_a"), t("boq_matrix.c_ours_a"), t("boq_matrix.c_maint"), ""].map((h, i) => (
                    <th key={i} style={{ ...th, textAlign: i >= 4 && i <= 6 ? "right" : "left" }}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {(layout.sites || []).map((s, k) => {
                    // Naksha badla (dirty) to purane ankde is road ke nahi rahe — "—" jab tak dobara na jaancho
                    const ds = !dirty ? (data.sites || [])[k] : null;
                    const ca = ds ? siteCheck(ds.name, "site_cost_a") : null;
                    const cb = ds ? siteCheck(ds.name, "site_cost_b") : null;
                    const good = !ca || ca.level === "ok";
                    return (
                      <tr key={k}>
                        <td style={td}>{k + 1}</td>
                        <td style={{ ...td, color: T.t1, fontWeight: 600, maxWidth: 320 }}>
                          {ds ? ds.name : s.name}
                          {ds && ds.length_km != null && <span style={{ fontWeight: 400, color: T.t4 }}> · {qtyf(ds.length_km)} km</span>}
                        </td>
                        <td style={td}>
                          <select value={s.qty || ""} onChange={(e) => edit((l) => { l.sites[k].qty = e.target.value; })} style={inp}>
                            {colOpts.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={td}>
                          <select value={s.amount || ""} onChange={(e) => edit((l) => { l.sites[k].amount = e.target.value || null; })} style={inp}>
                            <option value="">—</option>
                            {colOpts.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>{ca ? inr(ca.expected) : "—"}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: good ? T.grn : T.red }}>{ca ? inr(ca.got) : "—"}</td>
                        <td style={{ ...td, textAlign: "right", color: cb && cb.level !== "ok" ? T.red : T.t2 }}>{cb ? inr(cb.got) : "—"}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          <button onClick={() => edit((l) => { l.sites.splice(k, 1); })} title={t("boq_matrix.remove_road")}
                            style={{ border: "none", background: "none", color: T.t4, cursor: "pointer", fontSize: 14 }}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── naksha ── */}
          <div style={{ ...box, padding: "12px 14px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1, marginBottom: 4 }}>{t("boq_matrix.layout_title")}</div>
            <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10, lineHeight: 1.55 }}>
              {t("boq_matrix.layout_hint", { h: (layout.header_rows || []).join(" + "), skip: (layout.skip_rows || []).join(", ") || "—" })}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ fontSize: 11, color: T.t3 }}>{t("boq_matrix.rows_from")}<br />
                <input type="number" value={layout.data_rows[0]} onChange={(e) => edit((l) => { l.data_rows[0] = Number(e.target.value) || 1; })} style={{ ...inp, width: 80 }} /></label>
              <label style={{ fontSize: 11, color: T.t3 }}>{t("boq_matrix.rows_to")}<br />
                <input type="number" value={layout.data_rows[1]} onChange={(e) => edit((l) => { l.data_rows[1] = Number(e.target.value) || 1; })} style={{ ...inp, width: 80 }} /></label>
              {[["description", t("boq_matrix.f_desc")], ["item_code", t("boq_matrix.f_code")], ["sno", t("boq_matrix.f_sno")], ["unit", t("boq_matrix.f_unit")], ["rate", t("boq_matrix.f_rate")]].map(([k, l]) => (
                <label key={k} style={{ fontSize: 11, color: T.t3 }}>{l}<br />
                  <select value={(layout.cols || {})[k] || ""} onChange={(e) => edit((x) => { x.cols[k] = e.target.value || null; })} style={inp}>
                    <option value="">—</option>
                    {colOpts.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select></label>
              ))}
              <button onClick={recheck} disabled={!!busy} style={{ ...btn(dirty ? "primary" : "ghost"), opacity: busy ? .6 : 1 }}>
                {busy === "check" ? t("boq_matrix.checking") : t("boq_matrix.recheck")}
              </button>
            </div>
            {dirty && <div style={{ marginTop: 8, fontSize: 11.5, color: T.amb }}>{t("boq_matrix.dirty_note")}</div>}
          </div>

          {/* ── kya nahi mila ── */}
          {(fails.length > 0 || warns.length > 0) && (
            <div style={{ ...box, padding: "11px 14px", borderLeft: `4px solid ${fails.length ? T.red : T.amb}` }}>
              {fails.slice(0, 12).map((c, i) => <div key={"f" + i} style={{ fontSize: 12, color: T.red, lineHeight: 1.7 }}>✗ {checkText(c)}</div>)}
              {fails.length > 12 && <div style={{ fontSize: 11.5, color: T.t4 }}>{t("boq_matrix.more", { n: fails.length - 12 })}</div>}
              {warns.slice(0, 8).map((c, i) => <div key={"w" + i} style={{ fontSize: 12, color: T.amb, lineHeight: 1.7 }}>! {checkText(c)}</div>)}
            </div>
          )}

          {/* ── item ── */}
          <div style={{ ...box, overflow: "hidden" }}>
            <button onClick={() => setShowItems((v) => !v)}
              style={{ width: "100%", textAlign: "left", padding: "10px 13px", border: "none", background: T.surfaceB, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: T.t1 }}>
              {showItems ? "▾ " : "▸ "}{t("boq_matrix.items_title", { n: (data.items || []).length })}
            </button>
            {showItems && (
              <div style={{ overflowX: "auto", maxHeight: 380, overflowY: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
                  <thead><tr>{[t("boq_matrix.f_sno"), t("boq_matrix.f_code"), t("boq_matrix.f_desc"), t("boq_matrix.f_unit"), t("boq_matrix.f_rate"), t("boq_matrix.c_total_qty"), t("boq_matrix.c_amount")].map((h, i) => (
                    <th key={i} style={{ ...th, textAlign: i >= 4 ? "right" : "left", position: "sticky", top: 0 }}>{h}</th>))}</tr></thead>
                  <tbody>
                    {(data.items || []).map((it, i) => (
                      <tr key={i}>
                        <td style={td}>{it.item_no || "—"}</td>
                        <td style={td}>{it.item_code || "—"}</td>
                        <td style={{ ...td, color: T.t1, maxWidth: 360 }}>
                          {it.part === "maintenance" && <span style={{ fontSize: 10, fontWeight: 700, color: T.ind, marginRight: 6 }}>{t("boq_matrix.maint_tag")}</span>}
                          {String(it.description || "").slice(0, 110)}
                        </td>
                        <td style={td}>{it.unit || "—"}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qtyf(it.rate)}</td>
                        <td style={{ ...td, textAlign: "right", color: it.qty < 0 ? T.red : T.t2 }}>{qtyf(it.qty)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{inr(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── wajah ── */}
          {!recon.ok && (
            <label style={{ fontSize: 11.5, color: T.t2 }}>{t("boq_matrix.override_label")}
              <textarea value={override} onChange={(e) => setOverride(e.target.value)} rows={2} placeholder={t("boq_matrix.override_ph")}
                style={{ ...inp, width: "100%", marginTop: 4, resize: "vertical" }} /></label>
          )}
          {boqFinal && (
            <label style={{ fontSize: 11.5, color: T.t2 }}>{t("boq_matrix.final_reason")}
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                style={{ ...inp, width: "100%", marginTop: 4, resize: "vertical" }} /></label>
          )}
          {err && <div style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>{err}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={onFallback} style={{ border: "none", background: "none", padding: 0, color: T.t3, fontSize: 11.5, textDecoration: "underline", cursor: "pointer", fontFamily: "inherit" }}>
              {t("boq_matrix.fallback")}
            </button>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              {dirty && <span style={{ fontSize: 11.5, color: T.amb }}>{t("boq_matrix.recheck_first")}</span>}
              <button onClick={onClose} style={btn("ghost")}>{t("common.cancel")}</button>
              <button onClick={doImport} disabled={!canImport} style={{ ...btn("primary"), opacity: canImport ? 1 : .5, cursor: canImport ? "pointer" : "not-allowed" }}>
                {busy === "import" ? t("boq_matrix.importing") : t("boq_matrix.import_btn", { n: (data.items || []).length })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
