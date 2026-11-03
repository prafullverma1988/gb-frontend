// ════════════════════════════════════════════════════════════════
// Chalu Bill (4 Nov 2026, Prafull) — client ka Excel jaisa running bill ek
// page par (Aakashdeep / Hemant Sahu wali sheet):
//   • upar estimate (floor × area × ₹/sqft, parapet, septic …), har line ka
//     kaam hua ₹, pichhle bill ke baad ₹, site ki sthiti
//   • bagal me Excel ka hisaab — Grand total · Kaam hua (= Bill till date) ·
//     Aaya · Net baaki (kaam hua − aaya) · Grand baaki (grand − aaya)
//   • neeche floor ka stage card (₹/sqft breakup, Civil / Finishing, rang:
//     hua / chal raha / baaki) — bina task wali stage par "Ho gaya"
//   • bill (invoice), payment (Finance receipt, bina-bill advance bhi), extra
//   • "Save karo" (RB-n) → agle bill me pichhla bill + uske baad ka kaam; PDF;
//     WhatsApp (wa.me khulta hai — system khud nahi bhejta)
//   ProjectChaluView — housing / kai client: har client ki ek row.
// Server: routes/customer-estimates.js (running-bill*), utils/runningBill.js.
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from "react";
import api, { API_BASE, getToken } from "../../config/api";
import { T } from "../shared/tokens";
import { t, getLang } from "../../i18n";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const fmtC = (v) => (num(v) < 0 ? "−₹" : "₹") + Math.round(Math.abs(num(v))).toLocaleString("en-IN");
const fmtR = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtQ = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const fmtD = (d) => (d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—");
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const inpS = { padding: "5px 8px", borderRadius: 6, border: "1.5px solid " + T.b1, fontSize: 12, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", background: T.surface, color: T.t1 };
const btnS = (kind = "plain", disabled = false) => ({
  padding: "5px 11px", borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
  fontFamily: "inherit", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
  ...(kind === "primary" ? { background: T.ind, color: "white", border: "1px solid " + T.ind }
    : kind === "danger" ? { background: T.redL, color: T.red, border: "1px solid " + T.redM }
    : kind === "soft" ? { background: T.indL, color: T.ind, border: "1px solid " + T.indL }
    : { background: T.surface, color: T.t2, border: "1px solid " + T.b1 }),
});
const chip = (bg, fg) => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap" });
const thS = { textAlign: "left", padding: "6px 8px", fontSize: 9.5, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", whiteSpace: "nowrap", background: T.surfaceB };
const tdS = { padding: "6px 8px", borderTop: "1px solid " + T.b1, verticalAlign: "top" };
const tdN = { ...tdS, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
const stBg = (st) => (st === "done" ? T.grnL : st === "prog" ? T.ambL : "transparent");
const stBar = (st) => (st === "done" ? T.grn : st === "prog" ? T.amb : "transparent");
const H3 = ({ children }) => <div style={{ fontSize: 11, fontWeight: 800, color: T.t2, margin: "2px 0 6px", textTransform: "uppercase", letterSpacing: ".4px" }}>{children}</div>;

// PDF — route ko JWT chahiye, isliye fetch + blob (invoice PDF jaisa).
async function openPdf(estimateId, name) {
  const res = await fetch(`${API_BASE}/customer-estimates/${estimateId}/running-bill/pdf`, {
    headers: { ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}), "X-Lang": getLang() },
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || String(res.status));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = String(name || "chalu-bill").replace(/[/\\~]/g, "-") + ".pdf";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ── Haath se "Ho gaya" — ek line ka chhota box ──
function TickBox({ line, estimateId, onDone, onCancel }) {
  const [pct, setPct] = useState(line.manual ? String(line.manual.pct) : "100");
  const [date, setDate] = useState((line.manual && line.manual.at) || todayIST());
  const [note, setNote] = useState((line.manual && line.manual.note) || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (clear) => {
    setBusy(true); setErr("");
    const r = await api.put(`/customer-estimates/${estimateId}/items/${line.item_id}/done`, clear ? { pct: null } : { pct: num(pct), date, note })
      .catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (!r?.success) { setErr(r?.message || t("chalu_bill.save_failed")); return; }
    onDone();
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: 8, background: T.surfaceB, borderRadius: 6, marginTop: 4 }}>
      <label style={{ fontSize: 10.5, color: T.t3, fontWeight: 700 }} htmlFor={"tk-p-" + line.item_id}>{t("chalu_bill.tick_pct")}</label>
      <input id={"tk-p-" + line.item_id} type="number" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} style={{ ...inpS, width: 70 }} />
      <input type="date" value={date} max={todayIST()} onChange={(e) => setDate(e.target.value)} style={{ ...inpS, width: 140 }} aria-label={t("chalu_bill.tick_date")} />
      <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} style={{ ...inpS, flex: "1 1 160px", minWidth: 120 }}
        placeholder={line.task ? t("chalu_bill.tick_note_task") : t("chalu_bill.tick_note")} />
      <button type="button" disabled={busy} onClick={() => save(false)} style={btnS("primary", busy)}>{t("common.save")}</button>
      {line.manual && <button type="button" disabled={busy} onClick={() => save(true)} style={btnS("danger", busy)}>{t("chalu_bill.tick_clear")}</button>}
      <button type="button" onClick={onCancel} style={btnS()}>{t("common.cancel")}</button>
      {err && <div style={{ flexBasis: "100%", fontSize: 11, color: T.red }}>{err}</div>}
    </div>
  );
}

function WorkChip({ line }) {
  const w = line.work || {};
  if (w.source === "manual") {
    const m = line.manual || {};
    return <span style={chip(T.purL, T.pur)} title={[m.by, fmtD(m.at), m.note].filter(Boolean).join(" · ")}>{t("chalu_bill.chip_manual", { pct: w.pct })}</span>;
  }
  if (w.source === "task") {
    if (w.status === "done") return null;
    return <span style={chip(T.ambL, T.amb)} title={line.task ? line.task.name : ""}>{t("chalu_bill.chip_task", { pct: w.task_pct, trigger: w.trigger_pct })}</span>;
  }
  return <span style={chip(T.sltL, T.slt)}>{t("chalu_bill.chip_no_task")}</span>;
}

// ── 1. Ek client ka Chalu Bill ──
export function ChaluBillView({ estimateId, onChanged }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(null);         // item_id jis par "Ho gaya" box khula
  const load = useCallback(async () => {
    const r = await api.get(`/customer-estimates/${estimateId}/running-bill`).catch((e) => ({ success: false, message: e.message }));
    if (r?.success) { setD(r.data); setErr(""); } else setErr(r?.message || t("chalu_bill.load_failed"));
  }, [estimateId]);
  useEffect(() => { setD(null); load(); }, [load]);
  if (err) return <div style={{ padding: 16, color: T.red, fontSize: 12.5 }}>{err}</div>;
  if (!d) return <div style={{ padding: 16, color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>;
  const TT = d.totals, I = d.invoice || {}, can = d.can || {};
  const canTick = !!(can.tick && d.ready && d.ready.tick);

  const act = async (fn, okMsg) => {
    setBusy(true); setMsg("");
    const r = await fn().catch((e) => ({ success: false, message: e.message }));
    setBusy(false);
    if (r && r.success === false) { setMsg(r.message || t("chalu_bill.save_failed")); return null; }
    if (okMsg) setMsg(okMsg(r));
    await load();
    if (onChanged) onChanged();
    return r;
  };
  const save = () => act(() => api.post(`/customer-estimates/${estimateId}/running-bill/save`, {}),
    (r) => t(r.data.updated ? "chalu_bill.saved_again" : "chalu_bill.saved", { n: r.data.rb_no }));
  const draft = () => act(() => api.post(`/customer-estimates/${estimateId}/running-bill/draft`, {}),
    (r) => t("chalu_bill.draft_done", { no: r.data.invoice_no, n: r.data.lines.length }));
  const delSaved = (id) => act(() => api.del(`/customer-estimates/${estimateId}/running-bill/saved/${id}`), () => t("chalu_bill.saved_removed"));
  const pdf = async () => {
    setBusy(true); setMsg("");
    try { await openPdf(estimateId, "Chalu-Bill-" + (d.estimate.estimate_no || estimateId) + "-RB" + d.rb_no); }
    catch (e) { setMsg(t("chalu_bill.pdf_failed", { msg: e.message })); }
    setBusy(false);
  };
  const waText = t("chalu_bill.wa_text", { name: d.estimate.customer_name || "", n: d.rb_no, date: fmtD(d.bill_date),
    grand: fmtC(TT.grand), done: fmtC(TT.done), received: fmtC(TT.received), due: fmtC(TT.net_due) });

  const tickCell = (line) => canTick && (
    <button type="button" onClick={() => setTick(tick === line.item_id ? null : line.item_id)} title={t("chalu_bill.tick_title")}
      style={{ ...btnS(line.manual ? "soft" : "plain"), padding: "0 6px", fontSize: 10.5 }}>{t("chalu_bill.tick_btn")}</button>
  );
  const ledger = [
    ["hd", t("chalu_bill.h_contract")],
    ["", t("chalu_bill.l_estimate"), TT.estimate],
    ...(TT.extra ? [["", t("chalu_bill.l_extra"), TT.extra]] : []),
    ["big", t("chalu_bill.l_grand"), TT.grand],
    ["hd", t("chalu_bill.h_work")],
    ["big", t("chalu_bill.l_done"), TT.done, t("chalu_bill.l_done_sub", { pct: TT.done_pct })],
    ...(d.prev ? [["", t("chalu_bill.l_since"), TT.since_prev, t("chalu_bill.l_since_sub", { n: d.prev.rb_no, date: fmtD(d.prev.bill_date) })]] : []),
    ["hd", t("chalu_bill.h_money")],
    ["", t("chalu_bill.l_received"), TT.received, TT.advance ? t("chalu_bill.l_received_sub", { amt: fmtC(TT.advance) }) : null],
    ["due", t("chalu_bill.l_net_due"), TT.net_due, t("chalu_bill.l_net_due_sub")],
    ["", t("chalu_bill.l_grand_due"), TT.grand_due, t("chalu_bill.l_grand_due_sub")],
    ["", t("chalu_bill.l_remaining"), TT.remaining],
  ];
  const splitRows = (d.rows || []).filter((r) => r.split);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, alignItems: "flex-start", borderBottom: "2px solid " + T.t1, paddingBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.t1 }}>
            {t("chalu_bill.title", { n: d.rb_no })}{" "}
            <span style={d.saved_today ? chip(T.grnL, T.grn) : chip(T.sltL, T.slt)}>{d.saved_today ? t("chalu_bill.saved_chip") : t("chalu_bill.not_saved_chip")}</span>
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
            {d.estimate.customer_name} · {d.project_name} · {d.estimate.estimate_no} · {t("chalu_bill.bill_date", { date: fmtD(d.bill_date) })} ·{" "}
            {d.prev ? t("chalu_bill.prev_bill", { n: d.prev.rb_no, date: fmtD(d.prev.bill_date) }) : t("chalu_bill.no_prev")}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {can.bill && d.ready && d.ready.tick && (
            <button type="button" disabled={busy} onClick={save} style={btnS("primary", busy)}>{t(d.saved_today ? "chalu_bill.save_again_btn" : "chalu_bill.save_btn", { n: d.rb_no })}</button>
          )}
          <button type="button" disabled={busy} onClick={pdf} style={btnS("soft", busy)}>{t("chalu_bill.pdf_btn")}</button>
          <a href={"https://wa.me/?text=" + encodeURIComponent(waText)} target="_blank" rel="noopener noreferrer" style={{ ...btnS(), textDecoration: "none" }}>{t("chalu_bill.wa_btn")}</a>
        </div>
      </div>
      {msg && <div style={{ padding: "7px 10px", borderRadius: 7, background: T.surfaceB, color: T.t2, fontSize: 12 }}>{msg}</div>}
      {!d.ready?.tick && <div style={{ fontSize: 11.5, color: T.amb }}>{t("chalu_bill.not_ready_note")}</div>}

      {/* Estimate + hisaab */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14, alignItems: "start" }}>
        <div style={{ minWidth: 0, gridColumn: "span 2" }}>
          <H3>{t("chalu_bill.h_estimate")}</H3>
          <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
              <thead><tr>
                <th style={thS}>#</th><th style={thS}>{t("chalu_bill.col_work")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_area")}</th>
                <th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_rate")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_est")}</th>
                <th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_done")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_since")}</th>
                <th style={thS}>{t("chalu_bill.col_sthiti")}</th>
              </tr></thead>
              <tbody>
                {(d.rows || []).map((r, i) => {
                  const one = !r.split ? r.parts[0] : null;
                  return (
                    <React.Fragment key={r.key}>
                      <tr style={{ background: stBg(r.status) }}>
                        <td style={{ ...tdS, boxShadow: "inset 3px 0 0 " + stBar(r.status), color: T.t3 }}>{i + 1}</td>
                        <td style={tdS}><span style={{ color: T.t3 }}>{r.category ? r.category + " · " : ""}</span><b style={{ color: T.t1 }}>{r.name}</b></td>
                        <td style={tdN}>{r.qty != null ? fmtQ(r.qty) + " " + r.unit : "—"}</td>
                        <td style={tdN}>{r.rate != null ? "₹" + fmtR(r.rate) : "—"}</td>
                        <td style={tdN}>{fmtC(r.amount)}</td>
                        <td style={{ ...tdN, fontWeight: 700 }}>
                          {fmtC(r.done_amt)}
                          <div style={{ height: 5, borderRadius: 3, background: T.b1, marginTop: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: Math.min(100, r.amount > 0 ? r.done_amt / r.amount * 100 : 0) + "%", background: T.grn }} />
                          </div>
                        </td>
                        <td style={tdN}>{r.since_prev > 0 ? <span style={chip(T.redL, T.red)}>{fmtC(r.since_prev)}</span> : "—"}</td>
                        <td style={{ ...tdS, fontSize: 11, color: T.t2 }}>
                          {r.sthiti} {one && <WorkChip line={one} />} {one && tickCell(one)}
                        </td>
                      </tr>
                      {one && tick === one.item_id && (
                        <tr><td colSpan={8} style={{ ...tdS, borderTop: "none" }}>
                          <TickBox line={one} estimateId={estimateId} onCancel={() => setTick(null)} onDone={async () => { setTick(null); await load(); }} />
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
                <tr style={{ background: T.surfaceB, fontWeight: 800 }}>
                  <td style={tdS} /><td style={tdS}>{t("chalu_bill.total")}</td><td style={tdS} /><td style={tdS} />
                  <td style={tdN}>{fmtC(TT.estimate)}</td>
                  <td style={tdN}>{fmtC((d.rows || []).reduce((s, r) => s + r.done_amt, 0))}</td>
                  <td style={tdN}>{fmtC((d.rows || []).reduce((s, r) => s + Math.max(0, r.since_prev), 0))}</td><td style={tdS} />
                </tr>
              </tbody>
            </table>
          </div>
          {d.hidden_zero > 0 && <div style={{ fontSize: 11, color: T.t4, marginTop: 4 }}>{t("chalu_bill.hidden_zero", { n: d.hidden_zero })}</div>}
        </div>
        <div style={{ minWidth: 0 }}>
          <H3>{t("chalu_bill.h_summary")}</H3>
          <div style={{ border: "1px solid " + T.b1, borderRadius: 8, overflow: "hidden" }}>
            {ledger.map((l, i) => l[0] === "hd" ? (
              <div key={i} style={{ padding: "5px 10px", background: T.surfaceB, fontSize: 9.5, fontWeight: 800, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", borderTop: i ? "1px solid " + T.b1 : "none" }}>{l[1]}</div>
            ) : (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 10px", borderTop: "1px solid " + T.b1,
                background: l[0] === "big" ? T.indL : l[0] === "due" ? T.redL : "transparent" }}>
                <span style={{ fontSize: 12, fontWeight: l[0] ? 800 : 500, color: l[0] === "big" ? T.ind : l[0] === "due" ? T.red : T.t2 }}>
                  {l[1]}{l[3] && <span style={{ display: "block", fontSize: 10, fontWeight: 400, color: T.t4 }}>{l[3]}</span>}
                </span>
                <span style={{ fontSize: l[0] ? 14 : 12.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: l[0] === "big" ? T.ind : l[0] === "due" ? T.red : T.t1, whiteSpace: "nowrap" }}>{fmtC(l[2])}</span>
              </div>
            ))}
          </div>
          {TT.advance_shared > 0 && <div style={{ fontSize: 10.5, color: T.amb, marginTop: 6 }}>{t("chalu_bill.advance_shared", { amt: fmtC(TT.advance_shared) })}</div>}
        </div>
      </div>

      {/* Floor ka stage card */}
      {splitRows.length > 0 && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
            <H3>{t("chalu_bill.h_floors")}</H3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 10.5, color: T.t3 }}>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: T.grn, marginRight: 4 }} />{t("chalu_bill.lg_done")}</span>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: T.amb, marginRight: 4 }} />{t("chalu_bill.lg_prog")}</span>
              <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: T.b1, marginRight: 4 }} />{t("chalu_bill.lg_pend")}</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
            {splitRows.map((r) => {
              const pct = r.rate ? Math.round(r.done_rate / r.rate * 1000) / 10 : 0;
              return (
                <div key={r.key} style={{ border: "1px solid " + T.b1, borderRadius: 8, overflow: "hidden", minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 10px", background: T.indL, color: T.ind, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 12 }}>{r.category ? r.category + " · " : ""}{r.name}{r.qty != null ? " · " + fmtQ(r.qty) + " " + r.unit : ""}</b>
                    <span style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>{t("chalu_bill.floor_head", { rate: "₹" + fmtR(r.rate), done: "₹" + fmtR(r.done_rate), pct })}</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
                      <thead><tr>
                        <th style={thS}>{t("chalu_bill.stage")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.per_unit", { unit: r.unit })}</th>
                        <th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.done")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.done_amt")}</th>
                        <th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.rem_amt")}</th>
                      </tr></thead>
                      <tbody>
                        {(r.groups.length ? r.groups : [{ name: null }]).map((g) => (
                          <React.Fragment key={g.name || "_"}>
                            {r.parts.filter((p) => (p.part_group || "") === (g.name || "")).map((p) => (
                              <React.Fragment key={p.item_id}>
                                <tr style={{ background: stBg(p.work.status), color: p.work.status === "pend" ? T.t3 : T.t1 }}>
                                  <td style={{ ...tdS, boxShadow: "inset 3px 0 0 " + stBar(p.work.status) }}>
                                    {p.part_name}{" "}
                                    {p.since_prev > 0 && <span style={chip(T.redL, T.red)}>{t("chalu_bill.new_chip")}</span>}{" "}
                                    {p.work.status !== "done" && <WorkChip line={p} />}{" "}
                                    {p.work.source === "manual" && p.work.status === "done" && <WorkChip line={p} />}{" "}
                                    {tickCell(p)}
                                  </td>
                                  <td style={tdN}>{fmtR(p.rate)}</td>
                                  <td style={tdN}>{fmtR(p.rate * p.work.frac)}</td>
                                  <td style={tdN}>{fmtC(p.done_amt)}</td>
                                  <td style={tdN}>{fmtC(p.amount - p.done_amt)}</td>
                                </tr>
                                {tick === p.item_id && (
                                  <tr><td colSpan={5} style={{ ...tdS, borderTop: "none" }}>
                                    <TickBox line={p} estimateId={estimateId} onCancel={() => setTick(null)} onDone={async () => { setTick(null); await load(); }} />
                                  </td></tr>
                                )}
                              </React.Fragment>
                            ))}
                            {g.name && r.groups.length > 1 && (
                              <tr style={{ background: T.surfaceB, fontWeight: 800 }}>
                                <td style={tdS}>{t("chalu_bill.group_total", { group: g.name })}</td>
                                <td style={tdN}>{fmtR(g.rate)}</td><td style={tdN}>{fmtR(g.done_rate)}</td>
                                <td style={tdN}>{fmtC(g.done_amt)}</td><td style={tdN}>{fmtC(g.rem_amt)}</td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bill, payment, extra */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <H3>{t("chalu_bill.h_payments")}</H3>
          <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead><tr><th style={thS}>{t("chalu_bill.date")}</th><th style={thS}>{t("chalu_bill.mode")}</th><th style={{ ...thS, textAlign: "right" }}>₹</th></tr></thead>
              <tbody>
                {(d.payments || []).map((p, i) => (
                  <tr key={i}>
                    <td style={tdS}>{fmtD(p.date)}</td>
                    <td style={tdS}>{p.mode}{p.ref ? " · " + p.ref : ""}{" "}
                      {p.kind === "advance" ? <span style={chip(T.ambL, T.amb)} title={p.no_project ? t("chalu_bill.no_project_title") : ""}>{t("chalu_bill.advance_chip")}</span>
                        : p.invoice_no ? <span style={chip(T.sltL, T.slt)}>{p.invoice_no}</span> : null}</td>
                    <td style={tdN}>{fmtC(p.amount)}</td>
                  </tr>
                ))}
                {!(d.payments || []).length && <tr><td colSpan={3} style={{ ...tdS, color: T.t4 }}>{t("chalu_bill.no_payments")}</td></tr>}
                <tr style={{ background: T.surfaceB, fontWeight: 800 }}><td style={tdS}>{t("chalu_bill.total")}</td><td style={tdS} /><td style={tdN}>{fmtC(TT.received)}</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10.5, color: T.t4, marginTop: 4 }}>{t("chalu_bill.payments_hint")}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <H3>{t("chalu_bill.h_invoice")}</H3>
          <div style={{ border: "1px solid " + T.b1, borderRadius: 8, padding: "8px 10px", display: "grid", gap: 6, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.t2 }}>{t("chalu_bill.inv_billed", { n: I.count })}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{fmtC(I.billed)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.t2 }}>{t("chalu_bill.inv_left")}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{fmtC(I.to_invoice)}</b></div>
            {I.draft > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: T.pur }}>{t("chalu_bill.inv_draft")}</span><b style={{ color: T.pur, fontVariantNumeric: "tabular-nums" }}>{fmtC(I.draft)}</b></div>}
            {can.bill && (
              <button type="button" disabled={busy || !(I.to_draft > 0)} onClick={draft} style={btnS("soft", busy || !(I.to_draft > 0))}>
                {t("chalu_bill.draft_btn", { amt: fmtC(I.to_draft) })}
              </button>
            )}
            <div style={{ fontSize: 10.5, color: T.t4 }}>{t("chalu_bill.inv_hint")}</div>
            {(d.invoices || []).filter((x) => x.status !== "Draft").map((x) => (
              <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 11, borderTop: "1px solid " + T.b1, paddingTop: 4 }}>
                <span>{x.invoice_no} · {fmtD(x.invoice_date)} · <span style={{ color: T.t3 }}>{x.first_item}{x.n_items > 1 ? " +" + (x.n_items - 1) : ""}</span></span>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{fmtC(x.gross)}</b>
              </div>
            ))}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <H3>{t("chalu_bill.h_extras")}</H3>
          <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead><tr><th style={thS}>{t("chalu_bill.col_work")}</th><th style={thS}>{t("chalu_bill.ref")}</th><th style={{ ...thS, textAlign: "right" }}>₹</th></tr></thead>
              <tbody>
                {(d.extras || []).map((x) => (
                  <tr key={x.item_id}><td style={tdS}>{x.name}</td><td style={{ ...tdS, fontSize: 10.5, color: T.t3 }}>{x.ref || "—"}</td><td style={tdN}>{fmtC(x.amount)}</td></tr>
                ))}
                {!(d.extras || []).length && <tr><td colSpan={3} style={{ ...tdS, color: T.t4 }}>{t("chalu_bill.no_extras")}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Save kiye bill */}
      {(d.history || []).length > 0 && (
        <div>
          <H3>{t("chalu_bill.h_history")}</H3>
          <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, minWidth: 520 }}>
              <thead><tr>
                <th style={thS}>{t("chalu_bill.rb_col")}</th><th style={thS}>{t("chalu_bill.date")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_done")}</th>
                <th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.l_received")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.l_net_due")}</th><th style={thS} />
              </tr></thead>
              <tbody>
                {d.history.map((h, i) => (
                  <tr key={h.id}>
                    <td style={tdS}><b>{t("chalu_bill.rb_no", { n: h.rb_no })}</b></td><td style={tdS}>{fmtD(h.bill_date)}</td>
                    <td style={tdN}>{fmtC(h.done)}</td><td style={tdN}>{fmtC(h.received)}</td><td style={tdN}>{fmtC(h.net_due)}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{i === 0 && can.tick && <button type="button" disabled={busy} onClick={() => delSaved(h.id)} style={{ ...btnS("danger", busy), padding: "1px 8px", fontSize: 10.5 }}>{t("chalu_bill.saved_remove")}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div style={{ fontSize: 10.5, color: T.t4 }}>{t("chalu_bill.foot_note")}</div>
    </div>
  );
}

// ── 2. Project ke sab client (housing / kai ghar) ──
export function ProjectChaluView({ projectId, onOpen }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    setD(null); setErr("");
    api.get(`/customer-estimates/project-running/${projectId}`)
      .then((r) => { if (!alive) return; if (r?.success) setD(r.data); else setErr(r?.message || t("chalu_bill.load_failed")); })
      .catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [projectId]);
  if (err) return <div style={{ padding: 16, color: T.red, fontSize: 12.5 }}>{err}</div>;
  if (!d) return <div style={{ padding: 16, color: T.t4, fontSize: 12 }}>{t("common.loading")}</div>;
  const cols = [["grand", "chalu_bill.l_grand"], ["done", "chalu_bill.col_done"], ["received", "chalu_bill.l_received"], ["net_due", "chalu_bill.l_net_due"], ["grand_due", "chalu_bill.l_grand_due"]];
  return (
    <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
        <thead><tr>
          <th style={thS}>{t("chalu_bill.client")}</th>
          {cols.map(([k, l]) => <th key={k} style={{ ...thS, textAlign: "right" }}>{t(l)}</th>)}
          <th style={thS}>{t("chalu_bill.prev_short")}</th>
        </tr></thead>
        <tbody>
          {d.rows.map((r) => (
            <tr key={r.estimate.id} onClick={() => onOpen && onOpen(r.estimate.id)} style={{ cursor: onOpen ? "pointer" : "default" }}>
              <td style={tdS}><b style={{ color: T.ind }}>{r.estimate.customer_name}</b> <span style={{ color: T.t4, fontSize: 10.5 }}>{r.estimate.estimate_no}</span></td>
              {cols.map(([k]) => <td key={k} style={{ ...tdN, color: k === "net_due" && r.totals[k] > 0 ? T.red : T.t1, fontWeight: k === "net_due" ? 800 : 400 }}>{fmtC(r.totals[k])}</td>)}
              <td style={{ ...tdS, fontSize: 11, color: T.t3 }}>{r.prev ? t("chalu_bill.prev_cell", { n: r.prev.rb_no, date: fmtD(r.prev.bill_date) }) : "—"}</td>
            </tr>
          ))}
          {!d.rows.length && <tr><td colSpan={7} style={{ ...tdS, color: T.t4 }}>{t("chalu_bill.no_clients")}</td></tr>}
          <tr style={{ background: T.surfaceB, fontWeight: 800 }}>
            <td style={tdS}>{t("chalu_bill.total")}</td>
            {cols.map(([k]) => <td key={k} style={tdN}>{fmtC(d.total[k])}</td>)}<td style={tdS} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default ChaluBillView;
