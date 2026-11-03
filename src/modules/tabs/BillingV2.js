// ════════════════════════════════════════════════════════════════
// Billing v2 (2 Nov 2026, Prafull) — client aur thekedar ka bill ALAG-alag,
// dono ka RA-standard khaata, aur thekedar ka doosra tareeka: NAAP se bill.
//
//   StatementView        — ek WO / estimate ka khaata: contract (original /
//                          amendment / ab), bill hua, SD / TDS / katauti, net,
//                          diya / aaya, baaki + line-wise orig qty / ab qty
//   ProjectStatementView — "Sab thekedar" / "Sab client" ek project me
//   MeasureBillModal     — Finance ka "Naap se bill": har entry (tareekh, qty,
//                          kisne, photo / AI chip) dekh kar RA Draft
//   MeasureQueue         — kis WO ka naap bill taiyaar (Finance + Subcon tab)
//   DraftLinesModal      — client ke line-wise Draft ki qty badalna
//   StageKhaataView      — project ka saajha view (sirf dekhna)
// Server: routes/subcon.js (statement, measure-*), routes/customer-estimates.js
// (statement), routes/stage-khaata.js.
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import { T } from "../shared/tokens";
import { t } from "../../i18n";
import { perUnitSummary, PerUnitNote } from "./StageBilling";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const r3 = (n) => Math.round(num(n) * 1000) / 1000;
const fmtC = (v) => (num(v) < 0 ? "−₹" : "₹") + Math.abs(num(v)).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtQ = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtD = (d) => (d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—");
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const inpS = { padding: "5px 8px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12, outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: T.surface, color: T.t1 };
const lblS = { fontSize: 9.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", display: "block", marginBottom: 3 };
const btnS = (kind = "plain", disabled = false) => ({
  padding: "5px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", opacity: disabled ? 0.55 : 1,
  ...(kind === "primary" ? { background: T.ind, color: "white", border: "1px solid " + T.ind }
    : kind === "danger" ? { background: T.redL, color: T.red, border: "1px solid " + T.redM }
    : kind === "soft" ? { background: T.indL, color: T.ind, border: "1px solid " + T.indL }
    : { background: T.surface, color: T.t2, border: "1px solid " + T.b1 }),
});
const chip = (bg, fg) => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap" });
const thS = { textAlign: "left", padding: "6px 8px", fontSize: 9.5, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", whiteSpace: "nowrap", background: T.surfaceB };
const tdS = { padding: "6px 8px", borderTop: "1px solid " + T.b1, verticalAlign: "top" };
const tdN = { ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

function Modal({ title, width = 820, onClose, children, footer }) {
  return (<>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300 }} onClick={onClose} />
    <div role="dialog" aria-label={title} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width, maxWidth: "96vw", maxHeight: "90vh",
      background: T.surface, borderRadius: 12, zIndex: 301, boxShadow: "0 24px 64px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid " + T.b1, fontSize: 15, fontWeight: 700, color: T.t1, display: "flex", justifyContent: "space-between", gap: 10 }}>
        <span>{title}</span>
        <button type="button" onClick={onClose} aria-label={t("common.cancel")} style={{ ...btnS(), padding: "2px 9px" }}>×</button>
      </div>
      <div style={{ padding: "14px 18px", overflowY: "auto", flex: 1 }}>{children}</div>
      {footer && <div style={{ padding: "12px 18px", borderTop: "1px solid " + T.b1, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>{footer}</div>}
    </div>
  </>);
}

function Tile({ label, value, color, sub }) {
  return (
    <div style={{ background: T.surfaceB, border: "1px solid " + T.b1, borderRadius: 8, padding: "7px 10px", minWidth: 0 }}>
      <div style={{ fontSize: 9, color: T.t4, textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: color || T.t1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.t3 }}>{sub}</div>}
    </div>
  );
}

// ── 1. Statement — ek WO (thekedar) ya estimate (client) ka khaata ──
export function StatementView({ kind, id }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    setData(null); setErr("");
    const url = kind === "wo" ? "/subcon/work-orders/" + id + "/statement" : "/customer-estimates/" + id + "/statement";
    api.get(url).then((r) => { if (!alive) return; if (r?.success) setData(r.data); else setErr(r?.message || t("stage_billing.load_failed")); })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [kind, id]);
  if (err) return <div style={{ padding: 16, color: T.red, fontSize: 12.5 }}>{err}</div>;
  if (!data) return <div style={{ padding: 16, color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>;
  const h = data.header;
  const isWo = kind === "wo";
  const amDelta = (h.amendments || []).reduce((s, a) => s + (a.delta == null ? 0 : a.delta), 0);
  const tiles = [
    { l: t("stage_billing.st_contract_orig"), v: fmtC(h.contract_original) },
    { l: t("stage_billing.st_amendment", { n: (h.amendments || []).length }), v: (amDelta >= 0 ? "+" : "") + fmtC(amDelta),
      c: amDelta ? T.amb : T.t3, s: h.amend_unknown ? t("stage_billing.st_amend_unknown", { n: h.amend_unknown }) : null },
    { l: t("stage_billing.st_contract_now"), v: fmtC(h.contract_now), c: T.ind },
    ...(h.extra ? [{ l: t("stage_billing.st_extra"), v: fmtC(h.extra), c: T.red }] : []),
    { l: t("stage_billing.st_billed"), v: fmtC(h.billed_gross), c: T.blu, s: h.pending_gross ? t("stage_billing.st_pending", { amt: fmtC(h.pending_gross) }) : null },
    ...(isWo ? [
      { l: t("stage_billing.st_sd"), v: fmtC(h.sd), c: T.amb, s: h.sd_released ? t("stage_billing.st_released", { amt: fmtC(h.sd_released) }) : null },
      { l: t("stage_billing.st_tds"), v: fmtC(h.tds), c: T.red },
      ...(h.material ? [{ l: t("stage_billing.st_material"), v: fmtC(h.material), c: T.red }] : []),
      ...(h.katauti ? [{ l: t("stage_billing.katauti_tile"), v: fmtC(h.katauti), c: T.red }] : []),
      { l: t("stage_billing.st_net"), v: fmtC(h.net), c: T.grn },
      { l: t("stage_billing.st_paid"), v: fmtC(h.paid), c: T.grn },
      { l: t("stage_billing.st_payable"), v: fmtC(h.payable), c: T.red },
      ...(h.advance > 0 ? [{ l: t("stage_billing.st_advance"), v: fmtC(h.advance), c: T.amb, s: t("stage_billing.st_advance_hint") }] : []),
    ] : [
      { l: t("stage_billing.st_retention"), v: fmtC(h.retention), c: T.amb },
      { l: t("stage_billing.st_tds"), v: fmtC(h.tds), c: T.red },
      ...(h.tax ? [{ l: t("stage_billing.st_tax"), v: fmtC(h.tax) }] : []),
      { l: t("stage_billing.st_net"), v: fmtC(h.net), c: T.grn },
      { l: t("stage_billing.st_received"), v: fmtC(h.received), c: T.grn },
      { l: t("stage_billing.st_balance"), v: fmtC(h.balance), c: T.red },
    ]),
    { l: t("stage_billing.st_to_bill"), v: fmtC(h.to_bill), c: T.t2 },
  ];
  const groups = [];
  const gi = {};
  for (const l of data.lines || []) {
    const k = l.category || "";
    if (gi[k] === undefined) { gi[k] = groups.length; groups.push({ key: k, rows: [] }); }
    groups[gi[k]].rows.push(l);
  }
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8, marginBottom: 14 }}>
        {tiles.map((x) => <Tile key={x.l} label={x.l} value={x.v} color={x.c} sub={x.s} />)}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.t2, margin: "4px 0 6px", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("stage_billing.st_lines")}</div>
      <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8, marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 820 }}>
          <thead><tr>
            <th style={thS}>{t("stage_billing.col_stage")}</th><th style={thS}>{t("stage_billing.st_unit")}</th>
            <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_orig_qty")}</th><th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_now_qty")}</th>
            <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_rate")}</th><th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_billed_qty")}</th>
            <th style={{ ...thS, textAlign: "right" }}>{isWo ? t("stage_billing.st_pipeline_wo") : t("stage_billing.st_pipeline_est")}</th>
            <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_balance_qty")}</th><th style={{ ...thS, textAlign: "right" }}>%</th>
            <th style={thS}>{t("stage_billing.col_task")}</th>
          </tr></thead>
          <tbody>
            {groups.map((g) => (
              <React.Fragment key={g.key || "_"}>
                {g.key && <tr><td colSpan={10} style={{ ...tdS, background: T.indL, color: T.ind, fontWeight: 800, fontSize: 10.5 }}>{g.key}</td></tr>}
                {perUnitSummary(g.rows.map((l) => ({ unit: l.unit, qty: l.qty, rate: l.rate, billed: l.billed_qty, task: l.task,
                  item_type: l.item_type, part_of: l.part_of }))).map((s, i) => (
                  <tr key={"pu" + i}><td colSpan={10} style={{ ...tdS, background: T.indL, color: T.ind, fontSize: 11 }}><PerUnitNote s={s} /></td></tr>
                ))}
                {g.rows.map((l) => {
                  const changed = Math.abs(num(l.orig_qty) - num(l.qty)) > 0.0005 || Math.abs(num(l.orig_rate) - num(l.rate)) > 0.005;
                  return (
                    <tr key={(l.wo_item_id || l.item_id)}>
                      <td style={tdS}>
                        <span style={{ fontWeight: 600, color: T.t1 }}>{l.description}</span>{" "}
                        {l.item_type === "extra" && <span style={chip(T.redL, T.red)}>{t("stage_billing.extra_chip")}</span>}{" "}
                        {l.measure_mode === "qty" && <span style={chip(T.bluL, T.blu)}>{t("stage_billing.naap_chip")}</span>}
                      </td>
                      <td style={tdS}>{l.unit}</td>
                      <td style={{ ...tdN, color: changed ? T.amb : T.t3 }}>{fmtQ(l.orig_qty)}</td>
                      <td style={{ ...tdN, fontWeight: changed ? 800 : 400 }}>{fmtQ(l.qty)}</td>
                      <td style={tdN}>{fmtC(l.rate)}</td>
                      <td style={tdN}>{fmtQ(l.billed_qty)}</td>
                      <td style={{ ...tdN, color: T.pur }}>{num(l.pending_qty) ? fmtQ(l.pending_qty) : "—"}</td>
                      <td style={{ ...tdN, color: l.balance_qty < 0 ? T.red : T.t1 }}>{fmtQ(l.balance_qty)}</td>
                      <td style={tdN}>{num(l.pct).toFixed(1)}</td>
                      <td style={{ ...tdS, fontSize: 10.5, color: T.t3 }}>{l.task ? `${l.task.name} · ${l.task.progress}%` : "—"}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: T.t2, margin: "4px 0 6px", textTransform: "uppercase", letterSpacing: ".4px" }}>{t("stage_billing.st_bills")}</div>
      {!(data.bills || []).length ? <div style={{ fontSize: 11.5, color: T.t4 }}>{t("stage_billing.st_no_bills")}</div> : (
        <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 760 }}>
            <thead><tr>
              <th style={thS}>{t("stage_billing.st_bill_no")}</th><th style={thS}>{t("stage_billing.st_date")}</th><th style={thS}>{t("stage_billing.st_status")}</th>
              <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_gross")}</th>
              <th style={{ ...thS, textAlign: "right" }}>{isWo ? t("stage_billing.st_sd") : t("stage_billing.st_retention")}</th>
              <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_tds")}</th>
              {isWo && <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_deductions")}</th>}
              <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.st_net")}</th>
              <th style={{ ...thS, textAlign: "right" }}>{isWo ? t("stage_billing.st_paid") : t("stage_billing.st_received")}</th>
            </tr></thead>
            <tbody>
              {data.bills.map((b) => (
                <tr key={b.id}>
                  <td style={tdS}><b>{b.bill_no || b.invoice_no}</b> {b.source === "measure" && <span style={chip(T.bluL, T.blu)}>{t("stage_billing.naap_chip")}</span>}
                    {b.upto_date && <div style={{ fontSize: 10, color: T.t4 }}>{t("stage_billing.st_upto", { d: fmtD(b.upto_date) })}</div>}</td>
                  <td style={tdS}>{fmtD(b.bill_date || b.invoice_date)}</td>
                  <td style={tdS}>{b.status}</td>
                  <td style={tdN}>{fmtC(b.gross_amount)}</td>
                  <td style={tdN}>{fmtC(b.retention_amt)}</td>
                  <td style={tdN}>{fmtC(b.tds_amt)}</td>
                  {isWo && <td style={tdN}>{fmtC(num(b.material_amt) + num(b.other_deduction_amt))}</td>}
                  <td style={{ ...tdN, fontWeight: 700 }}>{fmtC(isWo ? b.net_payable : b.net_receivable)}</td>
                  <td style={{ ...tdN, color: T.grn }}>{fmtC(isWo ? b.paid : b.received)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 2. Project ke sab thekedar / sab client ──
export function ProjectStatementView({ kind, projectId, onOpen }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    setData(null); setErr("");
    const url = kind === "wo" ? "/subcon/project-statement/" + projectId : "/customer-estimates/project-statement/" + projectId;
    api.get(url).then((r) => { if (!alive) return; if (r?.success) setData(r.data); else setErr(r?.message || t("stage_billing.load_failed")); })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [kind, projectId]);
  if (err) return <div style={{ padding: 16, color: T.red, fontSize: 12.5 }}>{err}</div>;
  if (!data) return <div style={{ padding: 16, color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>;
  const isWo = kind === "wo";
  const cols = isWo
    ? [["contract_now", "st_contract_now"], ["billed_gross", "st_billed"], ["net", "st_net"], ["paid", "st_paid"], ["payable", "st_payable"], ["to_bill", "st_to_bill"]]
    : [["contract_now", "st_contract_now"], ["billed_gross", "st_billed"], ["net", "st_net"], ["received", "st_received"], ["balance", "st_balance"], ["to_bill", "st_to_bill"]];
  return (
    <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 720 }}>
        <thead><tr>
          <th style={thS}>{isWo ? t("stage_billing.wo_subcon") : t("stage_billing.st_client")}</th>
          {cols.map(([, k]) => <th key={k} style={{ ...thS, textAlign: "right" }}>{t("stage_billing." + k)}</th>)}
        </tr></thead>
        <tbody>
          {data.rows.map((r) => {
            const head = isWo ? r.wo : r.estimate;
            return (
              <tr key={head.id} onClick={onOpen ? () => onOpen(head.id) : undefined} style={{ cursor: onOpen ? "pointer" : "default" }}>
                <td style={tdS}><b>{isWo ? head.subcon_name : (head.customer_name || "—")}</b>
                  <div style={{ fontSize: 10, color: T.t4 }}>{isWo ? (head.description || "") : head.estimate_no} {head.status && head.status !== "Active" ? "· " + head.status : ""}</div></td>
                {cols.map(([k]) => <td key={k} style={tdN}>{fmtC(r.header[k])}</td>)}
              </tr>
            );
          })}
          <tr style={{ background: T.surfaceB, fontWeight: 800 }}>
            <td style={tdS}>{t("stage_billing.st_total")}</td>
            {cols.map(([k]) => <td key={k} style={tdN}>{fmtC(data.total[k])}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── 3. Naap se bill — Finance review ──
export function MeasureBillModal({ woId, onClose, onDone }) {
  const [upto, setUpto] = useState(todayIST());
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [st, setSt] = useState({});   // "lineId:entryId" → { skip, cut, cutWhy, reject, rejWhy }
  const load = useCallback(async (d) => {
    setErr(""); setMsg("");
    const r = await api.get("/subcon/work-orders/" + woId + "/measure-draft?upto=" + encodeURIComponent(d)).catch((e) => ({ success: false, message: e.message }));
    if (r?.success) { setData(r.data); setSt({}); } else setErr(r?.message || t("stage_billing.load_failed"));
  }, [woId]);
  useEffect(() => { load(todayIST()); }, [load]);
  const k = (l, e) => l.wo_item_id + ":" + e.entry_id;
  const upd = (key, patch) => setSt((p) => ({ ...p, [key]: { ...(p[key] || {}), ...patch } }));
  const lineCalc = (l) => {
    let q = 0;
    for (const e of l.entries) {
      const s = st[k(l, e)] || {};
      if (s.skip || s.reject) continue;
      q += s.cut != null && s.cut !== "" && e.qty > 0 ? Math.min(num(s.cut), e.qty) : e.qty;
    }
    const woQty = r3(r3(q) * l.factor);
    return { woQty, amount: r2(woQty * l.rate), over: woQty > l.remaining + 0.0005 };
  };
  const total = data ? r2(data.lines.reduce((s, l) => { const c = lineCalc(l); return s + (c.woQty > 0 ? c.amount : 0); }, 0)) : 0;
  const anyOver = data ? data.lines.some((l) => lineCalc(l).over) : false;
  const assign = async (entryId, wo) => {
    setBusy(true);
    const r = await api.put("/subcon/measure-entries/" + entryId + "/wo", { wo_id: wo }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    await load(upto);
  };
  const submit = async () => {
    const skip = [], cut = [], reject = [];
    for (const l of data.lines) for (const e of l.entries) {
      const s = st[k(l, e)] || {};
      const ref = { wo_item_id: l.wo_item_id, entry_id: e.entry_id };
      if (s.reject) {
        if (String(s.rejWhy || "").trim().length < 3) { setMsg(t("stage_billing.naap_wajah_needed")); return; }
        reject.push({ ...ref, reason: String(s.rejWhy).trim() });
      } else if (s.skip) skip.push(ref);
      else if (s.cut != null && s.cut !== "" && num(s.cut) < e.qty) {
        if (String(s.cutWhy || "").trim().length < 3) { setMsg(t("stage_billing.naap_wajah_needed")); return; }
        cut.push({ ...ref, qty: num(s.cut), reason: String(s.cutWhy).trim() });
      }
    }
    setBusy(true); setMsg("");
    const r = await api.post("/subcon/work-orders/" + woId + "/measure-bill", { upto, skip, cut, reject }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    const b = r.data.bill;
    onDone && onDone(b ? t("stage_billing.naap_bill_made", { no: b.bill_no, amt: fmtC(b.gross) }) : t("stage_billing.naap_rejected_only", { n: r.data.rejected }));
  };
  const can = data?.can || {};
  return (
    <Modal title={t("stage_billing.naap_title", { name: data?.wo?.subcon_name || "" })} width={980} onClose={onClose}
      footer={data && (<>
        <span style={{ marginRight: "auto", fontSize: 12, color: T.t2, alignSelf: "center" }}>
          {t("stage_billing.naap_total", { amt: fmtC(total) })} <span style={{ color: T.t4 }}>· {t("stage_billing.naap_total_hint")}</span>
        </span>
        <button type="button" onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
        <button type="button" disabled={busy || !can.bill || anyOver} onClick={submit} style={btnS("primary", busy || !can.bill || anyOver)}>{busy ? t("common.saving_2") : t("stage_billing.naap_make_draft")}</button>
      </>)}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
        <div style={{ width: 170 }}>
          <label style={lblS} htmlFor="naap-upto">{t("stage_billing.naap_upto")}</label>
          <input id="naap-upto" type="date" value={upto} max={todayIST()} onChange={(e) => setUpto(e.target.value)} style={inpS} />
        </div>
        <button type="button" onClick={() => load(upto)} style={btnS("soft")}>{t("stage_billing.naap_refresh")}</button>
        {data?.last_upto && <span style={{ fontSize: 11, color: T.t3 }}>{t("stage_billing.naap_last_upto", { d: fmtD(data.last_upto) })}</span>}
        <span style={{ fontSize: 11, color: T.t3, flex: "1 1 260px" }}>{t("stage_billing.naap_hint")}</span>
      </div>
      {err && <div style={{ color: T.red, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      {msg && <div style={{ padding: "7px 10px", borderRadius: 7, background: T.ambL, color: T.amb, fontSize: 11.5, fontWeight: 600, marginBottom: 10 }}>{msg}</div>}
      {!data && !err && <div style={{ color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>}
      {data && !data.lines.length && <div style={{ color: T.t3, fontSize: 12.5 }}>{t("stage_billing.naap_no_lines")}</div>}
      {data && data.lines.map((l) => {
        const c = lineCalc(l);
        return (
          <div key={l.wo_item_id} style={{ border: "1px solid " + (c.over ? T.redM : T.b1), borderRadius: 8, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: T.indL }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: T.ind, fontSize: 12.5 }}>{l.category ? l.category + " · " : ""}{l.description}</div>
                <div style={{ fontSize: 10.5, color: T.t3 }}>
                  {l.task ? t("stage_billing.naap_task_line", { task: l.task.name, done: fmtQ(l.task.done_qty), scope: fmtQ(l.task.scope_qty), unit: l.task.unit || "" }) : t("stage_billing.no_task")}
                  {" · "}{l.factor_auto ? t("stage_billing.naap_factor_auto", { f: l.factor }) : t("stage_billing.naap_factor", { f: l.factor })}
                  {l.alignment && <> · {t("stage_billing.naap_stretch_is", { name: l.alignment })}</>}
                </div>
              </div>
              <div style={{ fontSize: 11, color: T.ind, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                {t("stage_billing.naap_line_sum", { qty: fmtQ(c.woQty), unit: l.unit, amt: fmtC(c.amount) })}
                <div style={{ fontSize: 10, color: c.over ? T.red : T.t3 }}>{t("stage_billing.naap_line_left", { billed: fmtQ(l.billed_qty), qty: fmtQ(l.qty), left: fmtQ(l.remaining), unit: l.unit })}</div>
              </div>
            </div>
            {c.over && <div style={{ padding: "6px 12px", background: T.redL, color: T.red, fontSize: 11.5 }}>{t("stage_billing.naap_over", { qty: fmtQ(c.woQty), left: fmtQ(l.remaining), unit: l.unit })}</div>}
            {!l.entries.length ? <div style={{ padding: "8px 12px", fontSize: 11.5, color: T.t4 }}>{t("stage_billing.naap_no_entries")}</div> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 800 }}>
                  <thead><tr>
                    <th style={{ ...thS, width: 28 }} /><th style={thS}>{t("stage_billing.st_date")}</th>
                    <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.naap_entry_qty")}</th>
                    <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.naap_wo_qty", { unit: l.unit })}</th>
                    <th style={{ ...thS, textAlign: "right" }}>₹</th><th style={thS}>{t("stage_billing.naap_by")}</th>
                    <th style={thS}>{t("stage_billing.naap_proof")}</th><th style={thS}>{t("stage_billing.naap_action")}</th>
                  </tr></thead>
                  <tbody>
                    {l.entries.map((e) => {
                      const key = k(l, e);
                      const s = st[key] || {};
                      const off = s.skip || s.reject;
                      return (
                        <tr key={e.entry_id} style={{ opacity: off ? 0.5 : 1 }}>
                          <td style={tdS}><input type="checkbox" aria-label={t("stage_billing.naap_include")} checked={!off} disabled={!!s.reject || e.qty < 0}
                            title={e.qty < 0 ? t("stage_billing.naap_minus_note") : undefined}
                            onChange={() => upd(key, { skip: !s.skip })} /></td>
                          <td style={tdS}>{fmtD(e.date)}{e.alignment && <div style={{ fontSize: 10, color: T.t4 }}>{e.alignment}</div>}</td>
                          <td style={{ ...tdN, color: e.qty < 0 ? T.red : T.t1 }}>{fmtQ(e.qty)}</td>
                          <td style={tdN}>{fmtQ(e.wo_qty)}</td>
                          <td style={tdN}>{fmtC(e.amount)}</td>
                          <td style={tdS}>{e.by || "—"}{e.remarks && <div style={{ fontSize: 10, color: T.t4, maxWidth: 220 }}>{e.remarks}</div>}</td>
                          <td style={tdS}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {e.flags.late && <span style={chip(T.ambL, T.amb)}>{t("stage_billing.naap_flag_late")}</span>}
                              {e.flags.no_photo && <span style={chip(T.ambL, T.amb)}>{t("stage_billing.naap_flag_no_photo")}</span>}
                              {e.flags.ai && <span title={e.flags.ai_note || ""} style={chip(T.redL, T.red)}>{t("stage_billing.naap_flag_ai")}</span>}
                              {e.flags.minus && <span style={chip(T.redL, T.red)}>{t("stage_billing.naap_flag_minus")}</span>}
                              {!e.flags.no_photo && !e.flags.ai && <span style={chip(T.grnL, T.grn)}>{t("stage_billing.naap_flag_ok")}</span>}
                            </div>
                          </td>
                          <td style={tdS}>
                            {!s.reject && e.qty > 0 && (s.cut == null
                              ? <button type="button" onClick={() => upd(key, { cut: String(e.qty), skip: false })} style={{ ...btnS(), padding: "2px 7px", fontSize: 10.5 }}>{t("stage_billing.naap_cut_btn")}</button>
                              : <div style={{ display: "grid", gridTemplateColumns: "70px minmax(0,1fr)", gap: 4, minWidth: 220 }}>
                                  <input type="number" min="0" max={e.qty} value={s.cut} aria-label={t("stage_billing.naap_cut_qty")} onChange={(ev) => upd(key, { cut: ev.target.value })} style={inpS} />
                                  <input value={s.cutWhy || ""} placeholder={t("stage_billing.naap_why_ph")} onChange={(ev) => upd(key, { cutWhy: ev.target.value })} style={inpS} />
                                </div>)}
                            {can.reject && (s.reject
                              ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 4, marginTop: 4, minWidth: 220 }}>
                                  <input value={s.rejWhy || ""} placeholder={t("stage_billing.naap_reject_why_ph")} onChange={(ev) => upd(key, { rejWhy: ev.target.value })} style={inpS} />
                                  <button type="button" onClick={() => upd(key, { reject: false })} style={{ ...btnS(), padding: "2px 7px" }}>×</button>
                                </div>
                              : <button type="button" onClick={() => upd(key, { reject: true, skip: false })} style={{ ...btnS("danger"), padding: "2px 7px", fontSize: 10.5, marginLeft: 4 }}>{t("stage_billing.naap_reject_btn")}</button>)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {data && data.ambiguous.length > 0 && (
        <div style={{ border: "1px solid " + T.ambL, borderRadius: 8, padding: "8px 12px", background: T.ambL }}>
          <div style={{ fontWeight: 800, color: T.amb, fontSize: 12, marginBottom: 6 }}>{t("stage_billing.naap_ambiguous", { n: data.ambiguous.length })}</div>
          {data.ambiguous.map((a) => (
            <div key={a.entry_id} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 11.5, padding: "4px 0", borderTop: "1px solid " + T.b1 }}>
              <span style={{ minWidth: 0, flex: "1 1 260px" }}>{fmtD(a.date)} · {a.task_name} · <b>{fmtQ(a.qty)}</b>{a.alignment ? " · " + a.alignment : ""}{a.by ? " · " + a.by : ""}</span>
              {can.bill && a.candidates.map((c) => (
                <button key={c.wo_id} type="button" disabled={busy} onClick={() => assign(a.entry_id, c.wo_id)} style={btnS("soft", busy)}>{t("stage_billing.naap_assign_to", { name: c.subcon_name })}</button>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// RA bill card ke andar — is bill me lagi naap entry (GET /ra-bills/:id → measures).
export function BillMeasuresInline({ billId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get("/subcon/ra-bills/" + billId).then((r) => { if (alive) setRows(r?.success ? (r.data.measures || []) : []); }).catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [billId]);
  if (!rows) return <div style={{ fontSize: 11, color: T.t4, marginBottom: 8 }}>{t("common.loading")}</div>;
  if (!rows.length) return <div style={{ fontSize: 11, color: T.t4, marginBottom: 8 }}>{t("stage_billing.naap_no_entries")}</div>;
  return (
    <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 6, marginBottom: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 620 }}>
        <thead><tr>
          <th style={thS}>{t("stage_billing.st_date")}</th><th style={thS}>{t("stage_billing.naap_work")}</th>
          <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.naap_entry_qty")}</th>
          <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.naap_wo_qty", { unit: "" })}</th>
          <th style={{ ...thS, textAlign: "right" }}>₹</th><th style={thS}>{t("stage_billing.naap_by")}</th>
        </tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.entry_id + ":" + m.wo_item_id}>
              <td style={tdS}>{fmtD(m.date)}</td>
              <td style={tdS}>{m.line}<div style={{ fontSize: 10, color: T.t4 }}>{m.task}{m.alignment ? " · " + m.alignment : ""}</div></td>
              <td style={tdN}>{fmtQ(m.used_qty)}{Math.abs(num(m.used_qty) - num(m.entry_qty)) > 0.0005 && <span style={{ color: T.amb }}> / {fmtQ(m.entry_qty)}</span>}</td>
              <td style={tdN}>{fmtQ(m.wo_qty)} {m.unit}</td>
              <td style={tdN}>{fmtC(m.amount)}</td>
              <td style={tdS}>{m.by || "—"}{m.reason && <div style={{ fontSize: 10, color: T.amb }}>{m.reason}</div>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 4. Finance queue — kis WO ka naap bill taiyaar ──
export function MeasureQueue({ projectId = null, title }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const r = await api.get("/subcon/measure-queue" + (projectId ? "?project_id=" + projectId : "")).catch((e) => ({ success: false, message: e.message }));
    if (r?.success) { setData(r.data); setErr(""); } else setErr(r?.message || t("stage_billing.load_failed"));
  }, [projectId]);
  useEffect(() => { load(); }, [load]);
  if (err) return <div style={{ padding: 12, color: T.red, fontSize: 12.5 }}>{err}</div>;
  if (!data) return <div style={{ padding: 12, color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>;
  return (
    <div>
      {title && <div style={{ fontSize: 13, fontWeight: 800, color: T.t1, marginBottom: 4 }}>{title}</div>}
      <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 8 }}>{t("stage_billing.queue_hint")}</div>
      {msg && <div style={{ padding: "7px 10px", borderRadius: 7, background: T.indL, color: T.ind, fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>{msg}</div>}
      {!data.items.length ? <div style={{ fontSize: 12, color: T.t4, padding: "10px 0" }}>{t("stage_billing.queue_empty")}</div> : (
        <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 760 }}>
            <thead><tr>
              {!projectId && <th style={thS}>{t("stage_billing.queue_project")}</th>}
              <th style={thS}>{t("stage_billing.wo_subcon")}</th>
              <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.queue_entries")}</th>
              <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.queue_ready")}</th>
              <th style={thS}>{t("stage_billing.queue_last")}</th><th style={thS}>{t("stage_billing.naap_proof")}</th><th style={thS} />
            </tr></thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.wo_id}>
                  {!projectId && <td style={tdS}>{i.project_name}</td>}
                  <td style={tdS}><b>{i.subcon_name}</b><div style={{ fontSize: 10, color: T.t4 }}>{i.description || ""}{i.open_draft ? " · " + t("stage_billing.draft_chip", { no: i.open_draft }) : ""}</div></td>
                  <td style={tdN}>{i.entries}</td>
                  <td style={{ ...tdN, fontWeight: 800 }}>{fmtC(i.amount)}</td>
                  <td style={tdS}>{fmtD(i.last_date)}{i.last_upto && <div style={{ fontSize: 10, color: T.t4 }}>{t("stage_billing.naap_last_upto", { d: fmtD(i.last_upto) })}</div>}</td>
                  <td style={tdS}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {i.flags.no_photo > 0 && <span style={chip(T.ambL, T.amb)}>{t("stage_billing.queue_no_photo", { n: i.flags.no_photo })}</span>}
                      {i.flags.ai > 0 && <span style={chip(T.redL, T.red)}>{t("stage_billing.queue_ai", { n: i.flags.ai })}</span>}
                      {i.flags.late > 0 && <span style={chip(T.ambL, T.amb)}>{t("stage_billing.queue_late", { n: i.flags.late })}</span>}
                      {i.ambiguous > 0 && <span style={chip(T.ambL, T.amb)}>{t("stage_billing.queue_ambiguous", { n: i.ambiguous })}</span>}
                      {i.over > 0 && <span style={chip(T.redL, T.red)}>{t("stage_billing.queue_over")}</span>}
                    </div>
                  </td>
                  <td style={tdS}><button type="button" onClick={() => setOpen(i.wo_id)} style={btnS("primary")}>{t("stage_billing.queue_review")}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <MeasureBillModal woId={open} onClose={() => setOpen(null)} onDone={async (m) => { setOpen(null); setMsg(m); await load(); }} />}
    </div>
  );
}

// ── 5. Client ke line-wise Draft ki qty (auto Draft samet) ──
export function DraftLinesModal({ invoiceId, onClose, onDone }) {
  const [inv, setInv] = useState(null);
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.get("/customer-estimates/invoices/" + invoiceId).then((r) => {
      if (!r?.success) { setMsg(r?.message || t("stage_billing.load_failed")); return; }
      setInv(r.data);
      const v = {};
      for (const it of r.data.items || []) if (it.estimate_item_id && !it.milestone_kind) v[it.estimate_item_id] = String(r3(it.this_invoice_qty));
      setVals(v);
    }).catch((e) => setMsg(e.message));
  }, [invoiceId]);
  const lines = (inv?.items || []).filter((it) => it.estimate_item_id && !it.milestone_kind);
  const save = async () => {
    setBusy(true); setMsg("");
    const items = lines.map((it) => ({ estimate_item_id: it.estimate_item_id, cumulative_qty: r3(num(it.prev_cumulative) + num(vals[it.estimate_item_id])) }))
      .filter((x, i) => num(vals[lines[i].estimate_item_id]) > 0);
    if (!items.length) { setBusy(false); setMsg(t("stage_billing.draft_edit_none")); return; }
    const r = await api.put("/customer-estimates/invoices/" + invoiceId, { items }).catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setMsg(r?.message || t("stage_billing.save_failed")); return; }
    onDone && onDone();
  };
  return (
    <Modal title={t("stage_billing.draft_edit_title", { no: inv?.invoice_no || "" })} width={700} onClose={onClose}
      footer={<>
        <button type="button" onClick={onClose} style={btnS()}>{t("common.cancel")}</button>
        <button type="button" disabled={busy || !inv} onClick={save} style={btnS("primary", busy || !inv)}>{busy ? t("common.saving_2") : t("common.save")}</button>
      </>}>
      <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10 }}>{t("stage_billing.draft_edit_hint")}</div>
      {msg && <div style={{ padding: "7px 10px", borderRadius: 7, background: T.ambL, color: T.amb, fontSize: 11.5, fontWeight: 600, marginBottom: 10 }}>{msg}</div>}
      {lines.map((it) => (
        <div key={it.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px 90px", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid " + T.b1 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: T.t1, fontSize: 12 }}>{String(it.description || "").replace(/^\[[^\]]+\]\s*/, "")}</div>
            <div style={{ fontSize: 10.5, color: T.t3 }}>{t("stage_billing.draft_edit_prev", { prev: fmtQ(it.prev_cumulative), unit: it.unit || "", rate: fmtC(it.rate) })}</div>
          </div>
          <input type="number" min="0" value={vals[it.estimate_item_id] ?? ""} aria-label={t("stage_billing.draft_edit_qty")}
            onChange={(e) => setVals((p) => ({ ...p, [it.estimate_item_id]: e.target.value }))} style={inpS} />
          <span style={{ fontSize: 11.5, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtC(num(vals[it.estimate_item_id]) * num(it.rate))}</span>
        </div>
      ))}
    </Modal>
  );
}

// ── 6. Stage Khaata — project ka saajha view (sirf dekhna) ──
export function StageKhaataView({ projectId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    api.get("/stage-khaata/project/" + projectId).then((r) => { if (!alive) return; if (r?.success) setData(r.data); else setErr(r?.message || t("stage_billing.load_failed")); })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [projectId]);
  if (err) return <div style={{ padding: 16, color: T.red, fontSize: 12.5 }}>{err}</div>;
  if (!data) return <div style={{ padding: 16, color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>;
  const { can, total } = data;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: T.t3, marginBottom: 10, lineHeight: 1.5 }}>{t("stage_billing.sk_hint")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
        {can.client && <Tile label={t("stage_billing.sk_client_contract")} value={fmtC(total.client_contract)} />}
        {can.client && <Tile label={t("stage_billing.sk_client_billed")} value={fmtC(total.client_billed)} color={T.blu} sub={total.client_draft ? t("stage_billing.st_pending", { amt: fmtC(total.client_draft) }) : null} />}
        {can.subcon && <Tile label={t("stage_billing.sk_subcon_value")} value={fmtC(total.subcon_value)} />}
        {can.subcon && <Tile label={t("stage_billing.sk_subcon_billed")} value={fmtC(total.subcon_billed)} color={T.pur} sub={total.subcon_pending ? t("stage_billing.st_pending", { amt: fmtC(total.subcon_pending) }) : null} />}
        {can.budget && <Tile label={t("stage_billing.sk_budget")} value={fmtC(total.budget)} />}
        {can.budget && <Tile label={t("stage_billing.sk_actual")} value={fmtC(total.actual)} color={T.amb} sub={t("stage_billing.sk_actual_hint")} />}
        {total.margin != null && <Tile label={t("stage_billing.sk_margin")} value={fmtC(total.margin)} color={total.margin >= 0 ? T.grn : T.red} />}
      </div>
      <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 860 }}>
          <thead><tr>
            <th style={thS}>{t("stage_billing.col_stage")}</th>
            {can.client && <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.sk_col_client")}</th>}
            {can.subcon && <th style={thS}>{t("stage_billing.sk_col_subcon")}</th>}
            {can.budget && <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.sk_col_cost")}</th>}
            {total.margin != null && <th style={{ ...thS, textAlign: "right" }}>{t("stage_billing.sk_margin")}</th>}
          </tr></thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.stage_task_id || "none"} style={{ background: r.stage_task_id ? "transparent" : T.redL }}>
                <td style={tdS}>
                  {r.stage_task_id ? (<>
                    {r.parent_name && <div style={{ fontSize: 10, color: T.t4 }}>{r.parent_name}</div>}
                    <b>{r.name}</b> <span style={chip(r.progress >= 100 ? T.grnL : T.sltL, r.progress >= 100 ? T.grn : T.slt)}>{r.progress}%</span>
                  </>) : <b style={{ color: T.red }}>{t("stage_billing.sk_no_stage")}</b>}
                  {r.flags.includes("subcon_ahead") && <div><span style={chip(T.ambL, T.amb)}>{t("stage_billing.sk_flag_subcon_ahead")}</span></div>}
                </td>
                {can.client && (
                  <td style={tdN}>
                    <div style={{ fontWeight: 700 }}>{fmtC(r.client.billed)}</div>
                    <div style={{ fontSize: 10.5, color: T.t3 }}>{t("stage_billing.sk_of", { amt: fmtC(r.client.contract) })}{r.client.extra ? " · " + t("stage_billing.sk_extra", { amt: fmtC(r.client.extra) }) : ""}</div>
                    {r.client.draft > 0 && <span style={chip(T.purL, T.pur)}>{t("stage_billing.st_pending", { amt: fmtC(r.client.draft) })}</span>}
                  </td>
                )}
                {can.subcon && (
                  <td style={tdS}>
                    {!r.subcon.wos.length && <span style={{ fontSize: 10.5, color: T.t4 }}>—</span>}
                    {r.subcon.wos.map((w) => (
                      <div key={w.wo_id} style={{ marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, color: T.t2 }}>{w.subcon_name}</span>{" "}
                        {w.measure && <span style={chip(T.bluL, T.blu)}>{t("stage_billing.naap_chip")}</span>}
                        <span style={{ display: "block", fontSize: 10.5, color: T.t3, fontVariantNumeric: "tabular-nums" }}>
                          {t("stage_billing.sk_wo_line", { billed: fmtC(w.billed), value: fmtC(w.value) })}{w.pending ? " · " + t("stage_billing.st_pending", { amt: fmtC(w.pending) }) : ""}
                        </span>
                      </div>
                    ))}
                  </td>
                )}
                {can.budget && (
                  <td style={tdN}>
                    {r.budget || r.actual ? (<>
                      <div>{fmtC(r.actual)}</div>
                      <div style={{ fontSize: 10.5, color: T.t3 }}>{t("stage_billing.sk_of", { amt: fmtC(r.budget) })}</div>
                    </>) : <span style={{ color: T.t4 }}>—</span>}
                  </td>
                )}
                {total.margin != null && <td style={{ ...tdN, fontWeight: 700, color: (r.margin || 0) >= 0 ? T.grn : T.red }}>{r.margin == null ? "—" : fmtC(r.margin)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Project tab — lazy import (ProjectDetailPage).
export default function TabStageKhaata({ project }) {
  return (
    <div style={{ padding: "14px 16px" }}>
      <StageKhaataView projectId={project.id} />
    </div>
  );
}
