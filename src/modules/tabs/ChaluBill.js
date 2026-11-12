// ════════════════════════════════════════════════════════════════
// Chalu Bill (4 Nov 2026, Prafull) — client ka Excel jaisa running bill ek
// page par (Aakashdeep / Hemant Sahu wali sheet):
//   • upar estimate BOQ jaisa (12 Nov 2026, Prafull: "clean, sober, foldable
//     section-wise — GF ka total ek jagah, FF alag, other alag"): section →
//     floor → kaam; har kaam ka kaam hua ₹, pichhle bill ke baad ₹, haal; ▸ se
//     us kaam ke stage (Plinth, Lintel …) wahin — "Ho gaya" bhi wahin
//   • bagal me Excel ka hisaab — Grand total · Kaam hua (= Bill till date) ·
//     Aaya · Net baaki (kaam hua − aaya) · Grand baaki (grand − aaya)
//   • bill (invoice), payment (Finance receipt, bina-bill advance bhi), extra
//   • "Save karo" (RB-n) → agle bill me pichhla bill + uske baad ka kaam; PDF;
//     WhatsApp (wa.me khulta hai — system khud nahi bhejta)
//   ProjectChaluView — housing / kai client: har client ki ek row.
// Server: routes/customer-estimates.js (running-bill*), utils/runningBill.js.
// ════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
const stDot = (st) => (st === "done" ? T.grn : st === "prog" ? T.amb : T.b1);
const Dot = ({ st }) => <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: stDot(st), marginRight: 6, verticalAlign: 1 }} />;
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
  if (w.source === "billed") return <span style={chip(T.bluL, T.blu)}>{t("chalu_bill.chip_billed", { pct: w.pct })}</span>;
  if (w.source === "task") {
    if (w.status === "done") return null;
    return <span style={chip(T.ambL, T.amb)} title={line.task ? line.task.name : ""}>{t("chalu_bill.chip_task", { pct: w.task_pct, trigger: w.trigger_pct })}</span>;
  }
  return <span style={chip(T.sltL, T.slt)}>{t("chalu_bill.chip_no_task")}</span>;
}

// ── Estimate BOQ jaisa: section → floor → kaam → (▸) stage ──
// Section = BOQ ka section (GF / FF / Other); uske andar floor (category) alag
// ho to chhota sub-header. Section ki line par us section ka kul (estimate, kaam
// hua, pichhle bill ke baad) — "GF ka total ek jagah". Saadha: rang sirf Haal
// ke dot me. Default: section khule, stage band.
function EstimateBoq({ rows, estimateId, canTick, onReload }) {
  const [closed, setClosed] = useState(() => new Set());   // band section
  const [open, setOpen] = useState(() => new Set());       // khule kaam (stage dikhe)
  const [tick, setTick] = useState(null);                  // "Ho gaya" box kis line par
  const secs = useMemo(() => {
    const out = [], si = {};
    for (const r of rows || []) {
      const sk = r.section || r.category || "";
      if (si[sk] === undefined) { si[sk] = out.length; out.push({ key: sk, cats: [], ci: {} }); }
      const sec = out[si[sk]];
      const ck = r.category || "";
      if (sec.ci[ck] === undefined) { sec.ci[ck] = sec.cats.length; sec.cats.push({ key: ck, rows: [] }); }
      sec.cats[sec.ci[ck]].rows.push(r);
    }
    return out;
  }, [rows]);
  const sum = (rs) => {
    const amount = rs.reduce((a, r) => a + num(r.amount), 0), done = rs.reduce((a, r) => a + num(r.done_amt), 0);
    const since = rs.reduce((a, r) => a + Math.max(0, num(r.since_prev)), 0);
    // Sab kaam ek area par (GF Structure + Finishing = 1820 sqft) to area + ₹/unit ka jod
    const units = new Set(rs.map(r => String(r.unit || "").toLowerCase())), qtys = new Set(rs.map(r => r.qty));
    const same = rs.length && units.size === 1 && qtys.size === 1 && rs[0].qty != null && rs.every(r => r.rate != null);
    return { amount, done, since, pct: amount > 0 ? Math.round(done / amount * 1000) / 10 : 0,
             qty: same ? rs[0].qty : null, unit: same ? rs[0].unit : "", rate: same ? rs.reduce((a, r) => a + num(r.rate), 0) : null };
  };
  const allRows = (rows || []);
  const toggle = (set, setter, k) => { const n = new Set(set); if (n.has(k)) n.delete(k); else n.add(k); setter(n); };
  // "Ho gaya" halka link (saadha table) — haath se laga ho to bainganii
  const tickBtn = (line) => canTick && (
    <button type="button" onClick={() => setTick(tick === line.item_id ? null : line.item_id)} title={t("chalu_bill.tick_title")}
      style={{ borderWidth: 0, background: "transparent", cursor: "pointer", padding: 0, marginLeft: 8, fontSize: 10.5, fontWeight: 700,
        fontFamily: "inherit", color: line.manual ? T.pur : T.ind }}>{t("chalu_bill.tick_btn")}</button>
  );
  // Chip sirf jab kuch batana ho: chal raha (task %), haath se, ya bill jitna
  const showChip = (l) => l.work.status === "prog" || l.work.source === "manual" || l.work.source === "billed";
  const tickRow = (line) => tick === line.item_id && (
    <tr key={"tk" + line.item_id}><td colSpan={7} style={{ ...tdS, borderTop: "none" }}>
      <TickBox line={line} estimateId={estimateId} onCancel={() => setTick(null)} onDone={async () => { setTick(null); await onReload(); }} />
    </td></tr>
  );
  const stLabel = (w) => w.status === "done" ? t("chalu_bill.lg_done") : w.status === "prog" ? t("chalu_bill.st_prog", { pct: w.pct }) : t("chalu_bill.lg_pend");
  const numCells = (x) => (<>
    <td style={tdN}>{x.qty != null ? fmtQ(x.qty) + " " + (x.unit || "") : "—"}</td>
    <td style={tdN}>{x.rate != null ? "₹" + fmtR(x.rate) : "—"}</td>
  </>);
  const total = sum(allRows);
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <H3>{t("chalu_bill.h_estimate")}</H3>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 10.5, color: T.t3 }}>
          <span><Dot st="done" />{t("chalu_bill.lg_done")}</span>
          <span><Dot st="prog" />{t("chalu_bill.lg_prog")}</span>
          <span><Dot st="pend" />{t("chalu_bill.lg_pend")}</span>
          <button type="button" onClick={() => { setClosed(new Set()); setOpen(new Set(allRows.filter(r => r.split).map(r => r.key))); }} style={{ ...btnS(), padding: "2px 9px" }}>{t("chalu_bill.open_all")}</button>
          <button type="button" onClick={() => { setOpen(new Set()); setClosed(new Set(secs.map(x => x.key))); }} style={{ ...btnS(), padding: "2px 9px" }}>{t("chalu_bill.close_all")}</button>
        </div>
      </div>
      <div style={{ overflowX: "auto", border: "1px solid " + T.b1, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
          <thead><tr>
            <th style={thS}>{t("chalu_bill.col_work")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_area")}</th>
            <th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_rate")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_est")}</th>
            <th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_done")}</th><th style={{ ...thS, textAlign: "right" }}>{t("chalu_bill.col_since")}</th>
            <th style={thS}>{t("chalu_bill.col_sthiti")}</th>
          </tr></thead>
          <tbody>
            {secs.map(sec => {
              const secRows = sec.cats.flatMap(c => c.rows);
              const ss = sum(secRows);
              const isClosed = closed.has(sec.key);
              return (
                <React.Fragment key={"s" + sec.key}>
                  <tr style={{ background: T.surfaceB, cursor: "pointer" }} onClick={() => toggle(closed, setClosed, sec.key)}>
                    <td style={{ ...tdS, fontWeight: 800, color: T.t1 }}>
                      <span style={{ display: "inline-block", width: 14, color: T.t3 }}>{isClosed ? "▸" : "▾"}</span>
                      {sec.key || t("chalu_bill.no_section")} <span style={{ fontWeight: 400, fontSize: 10.5, color: T.t4 }}>· {t("chalu_bill.sec_items", { n: secRows.length })}</span>
                    </td>
                    {numCells(ss)}
                    <td style={{ ...tdN, fontWeight: 800 }}>{fmtC(ss.amount)}</td>
                    <td style={{ ...tdN, fontWeight: 800 }}>{fmtC(ss.done)}</td>
                    <td style={{ ...tdN, fontWeight: 700, color: ss.since > 0 ? T.red : T.t4 }}>{ss.since > 0 ? fmtC(ss.since) : "—"}</td>
                    <td style={{ ...tdS, fontSize: 11, color: T.t2 }}>{t("chalu_bill.sec_done_pct", { pct: ss.pct })}</td>
                  </tr>
                  {!isClosed && sec.cats.map(cat => {
                    const sub = cat.key && (sec.cats.length > 1 || cat.key !== sec.key);
                    const cs = sum(cat.rows);
                    return (
                      <React.Fragment key={"c" + sec.key + "¦" + cat.key}>
                        {sub && (
                          <tr>
                            <td style={{ ...tdS, paddingLeft: 24, fontWeight: 700, color: T.t2, fontSize: 11.5 }}>{cat.key}</td>
                            {numCells(cs)}
                            <td style={{ ...tdN, color: T.t2 }}>{fmtC(cs.amount)}</td>
                            <td style={{ ...tdN, color: T.t2 }}>{fmtC(cs.done)}</td>
                            <td style={{ ...tdN, color: T.t4 }}>{cs.since > 0 ? fmtC(cs.since) : "—"}</td>
                            <td style={{ ...tdS, fontSize: 10.5, color: T.t3 }}>{t("chalu_bill.sec_done_pct", { pct: cs.pct })}</td>
                          </tr>
                        )}
                        {cat.rows.map(r => {
                          const one = !r.split ? r.parts[0] : null;
                          const isOpen = open.has(r.key);
                          const pct = r.rate ? Math.round(r.done_rate / r.rate * 1000) / 10 : 0;
                          return (
                            <React.Fragment key={r.key}>
                              <tr>
                                <td style={{ ...tdS, paddingLeft: sub ? 38 : 24 }}>
                                  {r.split
                                    ? <button type="button" aria-label={t("chalu_bill.toggle_stages")} onClick={() => toggle(open, setOpen, r.key)}
                                        style={{ borderWidth: 0, background: "transparent", cursor: "pointer", color: T.ind, padding: 0, width: 14, fontFamily: "inherit" }}>{isOpen ? "▾" : "▸"}</button>
                                    : <span style={{ display: "inline-block", width: 14 }} />}
                                  <span style={{ fontWeight: 600, color: T.t1 }}>{r.name}</span>
                                  {r.split && <span style={{ fontSize: 10.5, color: T.t4, whiteSpace: "nowrap" }}> · {t("chalu_bill.n_stages", { n: r.parts.length })}</span>}
                                </td>
                                {numCells(r)}
                                <td style={tdN}>{fmtC(r.amount)}</td>
                                <td style={{ ...tdN, fontWeight: 700 }}>
                                  {fmtC(r.done_amt)}
                                  <div style={{ height: 3, borderRadius: 2, background: T.b1, marginTop: 3, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: Math.min(100, r.amount > 0 ? r.done_amt / r.amount * 100 : 0) + "%", background: T.grn }} />
                                  </div>
                                </td>
                                <td style={{ ...tdN, color: r.since_prev > 0 ? T.red : T.t4 }}>{r.since_prev > 0 ? fmtC(r.since_prev) : "—"}</td>
                                <td style={{ ...tdS, fontSize: 11, color: T.t2 }}>
                                  <Dot st={r.status} />{r.sthiti}
                                  {r.split && r.rate != null && <div style={{ fontSize: 10, color: T.t4 }}>{t("chalu_bill.floor_head", { rate: "₹" + fmtR(r.rate), done: "₹" + fmtR(r.done_rate), pct })}</div>}
                                  {one && <>{showChip(one) && <> <WorkChip line={one} /></>}{tickBtn(one)}</>}
                                </td>
                              </tr>
                              {one && tickRow(one)}
                              {r.split && isOpen && (r.groups.length ? r.groups : [{ name: null }]).map(g => (
                                <React.Fragment key={"g" + r.key + (g.name || "_")}>
                                  {r.parts.filter(x => (x.part_group || "") === (g.name || "")).map(x => (
                                    <React.Fragment key={x.item_id}>
                                      <tr style={{ color: x.work.status === "pend" ? T.t3 : T.t1 }}>
                                        <td style={{ ...tdS, paddingLeft: sub ? 58 : 44, fontSize: 11.5 }}>
                                          {x.part_name} {x.since_prev > 0 && <span style={chip(T.redL, T.red)}>{t("chalu_bill.new_chip")}</span>}
                                        </td>
                                        <td style={tdN} />
                                        <td style={{ ...tdN, fontSize: 11.5 }}>₹{fmtR(x.rate)}</td>
                                        <td style={{ ...tdN, fontSize: 11.5 }}>{fmtC(x.amount)}</td>
                                        <td style={{ ...tdN, fontSize: 11.5 }}>{fmtC(x.done_amt)}</td>
                                        <td style={{ ...tdN, fontSize: 11.5, color: x.since_prev > 0 ? T.red : T.t4 }}>{x.since_prev > 0 ? fmtC(x.since_prev) : "—"}</td>
                                        <td style={{ ...tdS, fontSize: 11 }}>
                                          <Dot st={x.work.status} />{stLabel(x.work)}
                                          {showChip(x) && <> <WorkChip line={x} /></>}
                                          {tickBtn(x)}
                                        </td>
                                      </tr>
                                      {tickRow(x)}
                                    </React.Fragment>
                                  ))}
                                  {g.name && r.groups.length > 1 && (
                                    <tr style={{ background: T.surfaceB }}>
                                      <td style={{ ...tdS, paddingLeft: sub ? 58 : 44, fontWeight: 700, fontSize: 11 }}>{t("chalu_bill.group_total", { group: g.name })}</td>
                                      <td style={tdN} /><td style={{ ...tdN, fontSize: 11 }}>₹{fmtR(g.rate)}</td>
                                      <td style={{ ...tdN, fontSize: 11 }}>{fmtC(num(g.done_amt) + num(g.rem_amt))}</td>
                                      <td style={{ ...tdN, fontSize: 11 }}>{fmtC(g.done_amt)}</td><td style={tdN} /><td style={tdS} />
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            <tr style={{ borderTop: "2px solid " + T.b1, fontWeight: 800 }}>
              <td style={tdS}>{t("chalu_bill.total")}</td><td style={tdS} /><td style={tdS} />
              <td style={tdN}>{fmtC(total.amount)}</td>
              <td style={tdN}>{fmtC(total.done)}</td>
              <td style={tdN}>{total.since > 0 ? fmtC(total.since) : "—"}</td>
              <td style={{ ...tdS, fontSize: 11, color: T.t2 }}>{t("chalu_bill.sec_done_pct", { pct: total.pct })}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 1. Ek client ka Chalu Bill ──
export function ChaluBillView({ estimateId, onChanged }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
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
          <EstimateBoq rows={d.rows || []} estimateId={estimateId} canTick={canTick} onReload={load} />
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
          {TT.advance_shared > 0 && <div style={{ fontSize: 10.5, color: T.amb, marginTop: 6 }}>{t(TT.other_sales ? "chalu_bill.advance_sales" : "chalu_bill.advance_shared", { amt: fmtC(TT.advance_shared) })}</div>}
        </div>
      </div>

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
