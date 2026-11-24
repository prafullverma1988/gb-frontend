// ════════════════════════════════════════════════════════════════
// Group-wise bill (24 Nov 2026, Prafull: "customer ko alag alag invoice nahi
// chahiye … running bill type form — GF kitna sq ft, ab tak kitne ka kaam hua
// aur uska total bill, same FF, septic … kis group me kitne ka bill hua, usme
// kya kaam chal raha, kaun sa kaam kitna hua — pura detail client ke liye").
//
// Invoices tab → "📄 Group-wise bill": sab invoice jod kar har kaam (GF / FF /
// Septic …) ka card — area × rate = contract, har stage %, ₹, haal, kaam hua,
// bill hua aur kis invoice me; jod; neeche kul (contract / kaam hua / bill hua /
// aaya / baaki). Kaunsi invoice: tick, ya "is tareekh tak". ⬇ PDF (server,
// letterhead) · ⬇ Excel (CSV). Invoice khud alag hi rehti hain.
// Server: GET /customer-estimates/:id/group-bill(/pdf) — utils/groupBill.js.
// ════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useState } from "react";
import api, { API_BASE, getToken } from "../../config/api";
import { T } from "../shared/tokens";
import { t, getLang } from "../../i18n";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const fmtC = (v) => (num(v) < 0 ? "−₹" : "₹") + Math.round(Math.abs(num(v))).toLocaleString("en-IN");
const fmtR = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtQ = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtD = (d) => (d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—");
const btnS = (kind = "plain", disabled = false) => ({
  padding: "5px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
  ...(kind === "primary" ? { background: T.ind, color: "white", border: "1px solid " + T.ind }
    : kind === "soft" ? { background: T.indL, color: T.ind, border: "1px solid " + T.indL }
    : { background: T.surface, color: T.t2, border: "1px solid " + T.b1 }),
});
const chip = (bg, fg) => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap" });
const ST = { billed: [T.grnL, T.grn], done: [T.bluL || T.indL, T.blu || T.ind], prog: [T.ambL, T.amb], pend: [T.surfaceB, T.t3] };
const thS = { textAlign: "left", padding: "5px 8px", fontSize: 9.5, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", whiteSpace: "nowrap", background: T.surfaceB };
const tdS = { padding: "5px 8px", borderTop: "1px solid " + T.b1, verticalAlign: "top", fontSize: 12 };
const tdN = { ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

// Kaunsi invoice: tick (ids) ya tareekh — query string
export const gbQuery = (sel) => {
  const p = [];
  if (sel && sel.ids) p.push("invoice_ids=" + encodeURIComponent(sel.ids.join(",") || "0"));
  else if (sel && sel.upto) p.push("upto=" + encodeURIComponent(sel.upto));
  return p.length ? "?" + p.join("&") : "";
};

// Excel (CSV) ki rows — screen jaisa hi
export function groupBillCsvRows(d) {
  const rows = [[t("group_bill.x_work"), t("group_bill.x_area"), t("group_bill.x_unit"), t("group_bill.x_rate"), t("group_bill.col_stage"), "%",
    t("group_bill.col_amount"), t("group_bill.col_status"), t("group_bill.col_done"), t("group_bill.col_billed"), t("group_bill.col_invoice")]];
  const inv = (list) => (list || []).map((x) => x.invoice_no + " (" + fmtD(x.invoice_date) + ") " + Math.round(num(x.amount))).join("; ");
  for (const g of d.groups || []) {
    for (const s of g.stages) rows.push([g.title, g.qty == null ? "" : g.qty, g.unit, g.rate == null ? "" : g.rate, s.name, g.stages.length > 1 ? s.pct : 100,
      Math.round(num(s.amount)), s.status_label, Math.round(num(s.done_amt)), Math.round(num(s.billed_amt)), inv(s.invoices)]);
    rows.push([g.title, "", "", "", t("group_bill.group_total"), "", Math.round(num(g.amount)), g.sthiti || "", Math.round(num(g.done_amt)), Math.round(num(g.billed_amt)), ""]);
  }
  for (const x of d.extras || []) rows.push([t("group_bill.extras"), x.qty, x.unit, x.rate, x.name, "", Math.round(num(x.amount)), x.ref, Math.round(num(x.done_amt)), Math.round(num(x.billed_amt)), inv(x.invoices)]);
  const T2 = d.totals || {};
  const tot = (label, v) => rows.push(["", "", "", "", "", "", "", "", "", label, Math.round(num(v))]);
  tot(t("group_bill.l_contract"), T2.contract); tot(t("group_bill.l_done"), T2.done); tot(t("group_bill.l_billed"), T2.billed);
  if (T2.unbilled_done > 0) tot(t("group_bill.l_unbilled"), T2.unbilled_done);
  if (T2.all_included) { tot(t("group_bill.l_received"), T2.received); tot(t("group_bill.l_net_due"), T2.net_due); }
  tot(t("group_bill.l_remaining"), T2.remaining);
  return rows;
}
function downloadCsv(d) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob(["﻿" + groupBillCsvRows(d).map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = ("Group-Bill-" + ((d.estimate && d.estimate.estimate_no) || "estimate") + "-" + (d.bill_date || "")).replace(/[^\w.-]+/g, "-") + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
// PDF — route ko JWT chahiye: fetch + blob (Chalu Bill / invoice PDF jaisa)
async function downloadPdf(estimateId, sel, name) {
  const res = await fetch(`${API_BASE}/customer-estimates/${estimateId}/group-bill/pdf${gbQuery(sel)}`, {
    headers: { ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}), "X-Lang": getLang() },
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || String(res.status));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = String(name || "group-bill").replace(/[/\\~]/g, "-") + ".pdf";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function GroupBillModal({ estimateId, onClose }) {
  const [d, setD] = useState(null);
  const [sel, setSel] = useState(null);       // null = default (sab bheji hui) · { ids } · { upto }
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (s) => {
    setErr("");
    const r = await api.get(`/customer-estimates/${estimateId}/group-bill${gbQuery(s)}`).catch((e) => ({ success: false, message: e.message }));
    if (r?.success) setD(r.data); else setErr(r?.message || t("group_bill.load_failed"));
  }, [estimateId]);
  useEffect(() => { load(sel); }, [load, sel]);
  const toggleInv = (id) => {
    const cur = (d.invoices || []).filter((x) => x.included).map((x) => x.id);
    const ids = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setSel({ ids });
  };
  const pdf = async () => {
    setBusy(true);
    try { await downloadPdf(estimateId, sel, "Group-Bill-" + ((d.estimate && d.estimate.estimate_no) || "") + "-" + (d.bill_date || "")); }
    catch (e) { setErr(t("group_bill.pdf_failed", { msg: e.message })); }
    setBusy(false);
  };
  const T2 = (d && d.totals) || {};
  const ledger = d ? [
    [t("group_bill.l_contract"), T2.contract, true], [t("group_bill.l_done"), T2.done], [t("group_bill.l_billed"), T2.billed, true],
    ...(T2.unbilled_done > 0 ? [[t("group_bill.l_unbilled"), T2.unbilled_done, false, T.red]] : []),
    ...(T2.all_included ? [[t("group_bill.l_received"), T2.received], [t("group_bill.l_net_due"), T2.net_due, true, T.red]] : []),
    [t("group_bill.l_remaining"), T2.remaining],
  ] : [];
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={() => !busy && onClose()} />
    <div role="dialog" aria-label={t("group_bill.title")} data-testid="group-bill"
      style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 1040, maxWidth: "97vw", maxHeight: "94vh",
        background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid " + T.b1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>📄 {t("group_bill.title")}{d && d.estimate ? " — " + d.estimate.estimate_no : ""}</div>
        <div style={{ fontSize: 11, color: T.t3, marginTop: 3, lineHeight: 1.45 }}>{t("group_bill.hint")}</div>
        {d && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: T.t3 }}>{t("group_bill.which_invoices")}</span>
            {(d.invoices || []).map((x) => (
              <label key={x.id} data-gb-inv={x.id} style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 11, padding: "2px 8px", borderRadius: 999,
                border: "1px solid " + (x.included ? T.ind : T.b1), background: x.included ? T.indL : T.surface, cursor: "pointer" }}>
                <input type="checkbox" checked={!!x.included} onChange={() => toggleInv(x.id)} />
                <b>{x.invoice_no}</b> {fmtD(x.invoice_date)} · {fmtC(x.gross)}{x.status === "Draft" ? " · " + t("group_bill.draft") : ""}
              </label>
            ))}
            {!(d.invoices || []).length && <span style={{ fontSize: 11, color: T.t4 }}>{t("group_bill.no_invoices")}</span>}
            <span style={{ fontSize: 10.5, color: T.t3, marginLeft: 6 }}>{t("group_bill.upto")}</span>
            <input type="date" data-testid="gb-upto" value={(sel && sel.upto) || ""} onChange={(e) => setSel(e.target.value ? { upto: e.target.value } : null)}
              style={{ padding: "3px 6px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 11.5, fontFamily: "inherit" }} />
            {sel && <button type="button" data-testid="gb-reset" onClick={() => setSel(null)} style={{ ...btnS(), padding: "2px 9px" }}>{t("group_bill.reset")}</button>}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 18px", overflowY: "auto", flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1fr) 250px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {!d && !err && <div style={{ fontSize: 12, color: T.t3 }}>{t("group_bill.loading")}</div>}
          {d && (d.groups || []).map((g) => (
            <div key={g.key} data-gb-group={g.key} style={{ border: "1px solid " + T.b1, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, padding: "7px 10px", background: T.indL }}>
                <b style={{ fontSize: 12.5, color: T.ind }}>{g.title}</b>
                <span style={{ fontSize: 12, color: T.ind, fontVariantNumeric: "tabular-nums" }}>
                  {g.qty != null && g.rate != null ? fmtQ(g.qty) + " " + g.unit + " × ₹" + fmtR(g.rate) + " = " : ""}{fmtC(g.amount)}
                </span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                  <thead><tr>
                    <th style={thS}>{t("group_bill.col_stage")}</th><th style={{ ...thS, textAlign: "right" }}>%</th><th style={{ ...thS, textAlign: "right" }}>{t("group_bill.col_amount")}</th>
                    <th style={thS}>{t("group_bill.col_status")}</th><th style={{ ...thS, textAlign: "right" }}>{t("group_bill.col_done")}</th>
                    <th style={{ ...thS, textAlign: "right" }}>{t("group_bill.col_billed")}</th><th style={thS}>{t("group_bill.col_invoice")}</th>
                  </tr></thead>
                  <tbody>
                    {g.stages.map((s, i) => (
                      <tr key={s.item_id} data-gb-stage={s.item_id}>
                        <td style={tdS}>{i + 1}. {s.name}</td>
                        <td style={{ ...tdN, color: T.t3 }}>{g.stages.length > 1 ? fmtR(s.pct) + "%" : "100%"}</td>
                        <td style={tdN}>{fmtC(s.amount)}</td>
                        <td style={tdS}><span style={chip(...(ST[s.status] || ST.pend))}>{s.status_label}</span></td>
                        <td style={tdN}>{fmtC(s.done_amt)}</td>
                        <td style={{ ...tdN, fontWeight: 700 }}>
                          {fmtC(s.billed_amt)}
                          {s.opening_amt > 0 && <div style={{ fontSize: 10, color: T.t4, fontWeight: 400 }}>{t("group_bill.opening", { amt: fmtC(s.opening_amt) })}</div>}
                        </td>
                        <td style={{ ...tdS, fontSize: 11 }}>
                          {(s.invoices || []).length ? s.invoices.map((x) => (
                            <div key={x.invoice_id}><b>{x.invoice_no}</b> <span style={{ color: T.t4 }}>{fmtD(x.invoice_date)}</span> · {fmtC(x.amount)}</div>
                          )) : <span style={{ color: T.t4 }}>—</span>}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: T.surfaceB, fontWeight: 700 }}>
                      <td style={tdS} colSpan={2}>{t("group_bill.group_total")}</td>
                      <td style={tdN}>{fmtC(g.amount)}</td>
                      <td style={{ ...tdS, fontSize: 11, fontWeight: 400, color: T.t2 }}>{g.sthiti}</td>
                      <td style={tdN}>{fmtC(g.done_amt)}</td>
                      <td style={tdN}>{fmtC(g.billed_amt)}</td>
                      <td style={{ ...tdS, fontSize: 11 }}>
                        {g.unbilled_done > 0 && <span style={{ color: T.red }}>{t("group_bill.unbilled", { amt: fmtC(g.unbilled_done) })} </span>}
                        {g.remaining > 0 && <span style={{ color: T.t3, fontWeight: 400 }}>{t("group_bill.remaining_work", { amt: fmtC(g.remaining) })}</span>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {d && (d.extras || []).length > 0 && (
            <div data-gb-extras style={{ border: "1px solid " + T.b1, borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "7px 10px", background: T.redL, fontSize: 12.5, fontWeight: 700, color: T.red }}>{t("group_bill.extras")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>
                {d.extras.map((x) => (
                  <tr key={x.item_id}><td style={tdS}>{x.name}{x.ref ? <span style={{ color: T.t4 }}> · {x.ref}</span> : null}</td>
                    <td style={tdN}>{fmtC(x.amount)}</td><td style={tdN}>{fmtC(x.done_amt)}</td><td style={{ ...tdN, fontWeight: 700 }}>{fmtC(x.billed_amt)}</td>
                    <td style={{ ...tdS, fontSize: 11 }}>{(x.invoices || []).map((v) => v.invoice_no).join(", ") || "—"}</td></tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
        {d && (
          <div data-testid="gb-summary" style={{ border: "1px solid " + T.b1, borderRadius: 8, overflow: "hidden", position: "sticky", top: 0 }}>
            <div style={{ padding: "7px 10px", background: T.surfaceB, fontSize: 11, fontWeight: 800, color: T.t2, textTransform: "uppercase" }}>{t("group_bill.summary")}</div>
            {ledger.map(([l, v, big, col]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", borderTop: "1px solid " + T.b1,
                fontSize: big ? 12.5 : 12, fontWeight: big ? 800 : 500, color: col || T.t1, fontVariantNumeric: "tabular-nums" }}>
                <span>{l}</span><span>{fmtC(v)}</span>
              </div>
            ))}
            {!T2.all_included && <div style={{ padding: "6px 10px", fontSize: 10.5, color: T.t3, borderTop: "1px solid " + T.b1 }}>{t("group_bill.partial_note")}</div>}
          </div>
        )}
      </div>
      {err && <div role="alert" style={{ margin: "0 18px 8px", padding: "7px 10px", borderRadius: 6, background: T.redL, color: T.red, fontSize: 11.5 }}>{err}</div>}
      <div style={{ padding: "10px 18px", borderTop: "1px solid " + T.b1, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button type="button" onClick={onClose} disabled={busy} style={btnS("plain", busy)}>{t("common.close")}</button>
        <button type="button" data-testid="gb-xls" disabled={!d || busy} onClick={() => downloadCsv(d)} style={{ ...btnS("plain", !d || busy), color: T.grn, borderColor: T.grn }}>⬇ {t("group_bill.excel")}</button>
        <button type="button" data-testid="gb-pdf" disabled={!d || busy} onClick={pdf} style={btnS("primary", !d || busy)}>{busy ? t("group_bill.pdf_busy") : "⬇ " + t("group_bill.pdf")}</button>
      </div>
    </div>
  </>);
}
