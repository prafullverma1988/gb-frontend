// ════════════════════════════════════════════════════════════════
// CRM Package Quote — Rate schedule (Jacob Sir jaisa) + "AI se area bharo"
// (15 Nov 2026, Prafull)
//
// Har line: naam (is quote ke liye badal sakte), unit, rate (khaali = package /
// line ka rate, naya likho to sirf is quote me), area / qty, amount. Lump sum
// line = tick (shamil hai to qty 1). Neeche TOTAL. Number server ke computed
// se; Save se pehle ≈ (local andaza). Phone (375px) par table apne box me
// scroll hoti hai.
// AI: salesperson ka message → har line ka prastaav (purana → naya, wajah).
// Jo number message me nahi tha (AI ka andaza) wo chip ke saath BINA tick.
// "Lagao" sirf page par bharta hai — server par Save se jaata hai.
// ════════════════════════════════════════════════════════════════
import { useState } from "react";
import api from "../../config/api";
import { t } from "../../i18n";
import { T, btn, inp, chip, card, Spinner, ErrBox } from "./pkgUi";
import { AI_TIMEOUT, inr } from "./pkgUtil";
import { QBASE, rupee } from "./quoteUtil";

const cell = { padding: "7px 8px", borderBottom: "1px solid " + T.b1, verticalAlign: "middle", fontSize: 13, color: T.t1 };
const num = { ...cell, textAlign: "right", whiteSpace: "nowrap" };
const th = { ...cell, background: T.surfaceB, color: T.t3, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".3px", whiteSpace: "nowrap" };
const smallInp = { ...inp, minHeight: 34, padding: "5px 7px", fontSize: 13.5, textAlign: "right", width: 88 };
// Naam wala khaana chipka rahe (phone par rate / qty / amount ke liye table khiskao to bhi line dikhe)
const stick = (bg) => ({ position: "sticky", left: 0, zIndex: 1, background: bg, boxShadow: "inset -1px 0 0 " + T.b1, minWidth: 138, maxWidth: 230 });
const sv = (v) => (v == null ? "" : String(v));

function DescCell({ row, line, editable, onSet }) {
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState("");
  const renamed = !!(line && line.description && String(line.description).trim());
  if (open) {
    return (
      <div style={{ minWidth: 180 }}>
        <textarea value={txt} onChange={(e) => setTxt(e.target.value)} data-desc-input={row.key} autoFocus
          style={{ ...inp, minHeight: 56, fontSize: 13, resize: "vertical", lineHeight: 1.4 }} />
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          <button type="button" style={btn("primary")} onClick={() => { const v = txt.trim(); onSet({ description: v && v !== row.base_desc ? v : null }); setOpen(false); }}>{t("sales_quote_ui.done")}</button>
          <button type="button" style={btn()} onClick={() => setOpen(false)}>{t("sales_quote_ui.cancel")}</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <span style={{ color: T.t4, marginRight: 4 }}>{row.sn}.</span><span style={{ overflowWrap: "anywhere" }}>{row.description}</span>
      {row.kind === "package" ? <span style={{ ...chip(T.purL, T.pur), marginLeft: 6 }}>{t("sales_quote_ui.kind_package")}</span> : null}
      {renamed ? <span style={{ ...chip(T.ambL, "#92400E", T.ambM), marginLeft: 6 }}>{t("sales_quote_ui.renamed")}</span> : null}
      {editable ? (
        <span style={{ display: "inline-flex", gap: 4, marginLeft: 6, verticalAlign: "middle" }}>
          <button type="button" aria-label={t("sales_quote_ui.rename")} title={t("sales_quote_ui.rename")} data-rename={row.key}
            onClick={() => { setTxt(row.description || ""); setOpen(true); }}
            style={{ ...btn(), minHeight: 26, padding: "2px 7px", fontSize: 11.5 }}>✎</button>
          {renamed ? <button type="button" title={t("sales_quote_ui.rename_reset")} aria-label={t("sales_quote_ui.rename_reset")} onClick={() => onSet({ description: null })}
            style={{ ...btn(), minHeight: 26, padding: "2px 7px", fontSize: 11.5 }}>↺</button> : null}
        </span>
      ) : null}
      {row.unit ? <div style={{ fontSize: 11, color: T.t4, marginTop: 1 }}>{row.unit}</div> : null}
    </div>
  );
}

export function QuoteLinesTable({ rows, lines, editable, onLines, badKeys, total, preview, baseDesc }) {
  const bad = badKeys || new Set();
  const setLine = (k, patch) => {
    const cur = (lines && lines[k]) || { qty: null, rate: null, description: null };
    onLines({ ...(lines || {}), [k]: { ...cur, ...patch } });
  };
  let lastG = null, sn = 0;
  const body = [];
  for (const r of rows || []) {
    if (r.group_key !== lastG) {
      lastG = r.group_key;
      if (r.group_title) body.push(<tr key={"g_" + r.group_key}><td colSpan={4} style={{ ...cell, background: T.bluL, color: T.blu, fontWeight: 800, fontSize: 12.5 }}>{r.group_title}</td></tr>);
    }
    sn++;
    const line = (lines && lines[r.key]) || {};
    const lump = r.kind === "lump_sum";
    const over = line.rate != null && String(line.rate).trim() !== "";
    const isBad = bad.has(r.key);
    const bg = isBad ? T.redL : T.surface;
    body.push(
      <tr key={r.key} data-row={r.key} style={{ background: bg }}>
        <td style={{ ...cell, ...stick(bg) }}><DescCell row={{ ...r, sn, base_desc: (baseDesc || {})[r.key] }} line={line} editable={editable} onSet={(p) => setLine(r.key, p)} /></td>
        <td style={num}>
          {editable ? (
            <div>
              <input className="qt-num" data-rate={r.key} inputMode="decimal" value={sv(line.rate)} placeholder={r.base_rate != null ? inr(r.base_rate) : "—"}
                onChange={(e) => setLine(r.key, { rate: e.target.value })} aria-label={t("sales_quote_ui.col_rate")}
                style={{ ...smallInp, ...(over ? { background: T.ambL, borderColor: T.ambM, fontWeight: 700 } : {}) }} />
              {over ? (
                <div style={{ fontSize: 10.5, color: T.t3, marginTop: 2 }}>
                  {t("sales_quote_ui.base_rate", { rate: r.base_rate != null ? inr(r.base_rate) : "—" })}
                  <button type="button" onClick={() => setLine(r.key, { rate: null })} title={t("sales_quote_ui.rate_reset")}
                    style={{ borderWidth: 0, background: "none", color: T.blu, cursor: "pointer", fontWeight: 800, fontSize: 12, padding: "0 0 0 4px" }}>↺</button>
                </div>
              ) : null}
            </div>
          ) : (
            <span>{r.rate != null ? inr(r.rate) : "—"}{r.rate_overridden ? <span style={{ ...chip(T.ambL, "#92400E", T.ambM), marginLeft: 5 }}>{t("sales_quote_ui.rate_changed")}</span> : null}</span>
          )}
        </td>
        <td style={num}>
          {lump ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: editable ? "pointer" : "default", fontSize: 12.5 }}>
              <input type="checkbox" data-include={r.key} disabled={!editable} checked={!!(line.qty && Number(line.qty) > 0)}
                onChange={(e) => setLine(r.key, { qty: e.target.checked ? 1 : null })} style={{ width: 18, height: 18 }} />
              {t("sales_quote_ui.include")}
            </label>
          ) : editable ? (
            <input className="qt-num" data-qty={r.key} inputMode="decimal" value={sv(line.qty)} placeholder="0"
              onChange={(e) => setLine(r.key, { qty: e.target.value })} aria-label={t("sales_quote_ui.col_qty")} style={smallInp} />
          ) : (r.qty != null ? inr(r.qty) : "")}
        </td>
        <td style={{ ...num, fontWeight: r.amount ? 700 : 400, color: preview ? T.t2 : T.t1 }} data-amount={r.key}>
          {r.amount != null ? (preview ? "≈ " : "") + inr(r.amount) : ""}
        </td>
      </tr>
    );
  }
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%", border: "1px solid " + T.b1, borderRadius: 10 }} data-testid="qt-lines">
      <style>{".qt-num::placeholder{color:#475569;opacity:.85}"}</style>
      <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 470 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left", ...stick(T.surfaceB) }}>{t("sales_quote_ui.col_desc")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("sales_quote_ui.col_rate")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("sales_quote_ui.col_qty")}</th>
            <th style={{ ...th, textAlign: "right" }}>{t("sales_quote_ui.col_amount")}</th>
          </tr>
        </thead>
        <tbody>
          {body}
          <tr>
            <td style={{ ...cell, fontWeight: 800, ...stick(T.surfaceB) }}>{t("sales_quote_ui.total_row")}</td>
            <td colSpan={2} style={{ ...cell, background: T.surfaceB }} />
            <td style={{ ...num, background: T.surfaceB, fontWeight: 800, fontSize: 14.5 }} data-testid="qt-total-row">{(preview ? "≈ " : "") + rupee(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── AI se area bharo ──
export function AiFillBox({ quoteId, rows, lines, onLines }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  const [picked, setPicked] = useState(new Set());

  const useful = (l) => l.qty != null || l.rate != null || !!l.description;
  const run = async () => {
    const tx = text.trim();
    if (!tx || busy) return;
    setBusy(true); setErr(""); setRes(null);
    const r = await api.post(`${QBASE}/${quoteId}/ai/fill`, { text: tx }, { timeoutMs: AI_TIMEOUT });
    setBusy(false);
    if (r && r.success && r.data) {
      const L = (r.data.lines || []).map((l, i) => ({ ...l, i }));
      setRes({ ...r.data, lines: L });
      setPicked(new Set(L.filter((l) => useful(l) && !l.invented).map((l) => l.i)));
    } else setErr((r && r.message) || t("sales_quote_ui.ai_failed"));
  };
  const toggle = (i) => setPicked((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const apply = () => {
    const kinds = Object.fromEntries((rows || []).map((r) => [r.key, r.kind]));
    const next = { ...(lines || {}) };
    let n = 0;
    for (const l of res.lines) {
      if (!picked.has(l.i) || !useful(l)) continue;
      const cur = next[l.key] || { qty: null, rate: null, description: null };
      const p = {};
      if (l.qty != null) p.qty = kinds[l.key] === "lump_sum" ? 1 : l.qty;
      if (l.rate != null) p.rate = l.rate;
      if (l.description) p.description = l.description;
      next[l.key] = { ...cur, ...p };
      n++;
    }
    onLines(next);
    setRes(null); setText("");
    window.toast?.success?.(t("sales_quote_ui.ai_fill_applied", { n }));
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} data-testid="btn-ai-fill-open" style={{ ...btn("ai"), marginBottom: 10 }}>✨ {t("sales_quote_ui.ai_fill_title")}</button>
    );
  }
  const old = (v, money) => (v == null ? "—" : money ? "₹" + inr(v) : inr(v));
  return (
    <div style={{ background: T.purL, border: "1px solid #DDD6FE", borderRadius: 12, padding: 12, marginBottom: 12 }} data-testid="ai-fill">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <b style={{ flex: 1, fontSize: 13.5, color: T.pur }}>✨ {t("sales_quote_ui.ai_fill_title")}</b>
        <button type="button" onClick={() => { setOpen(false); setRes(null); }} style={btn()}>{t("sales_quote_ui.close")}</button>
      </div>
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 8, lineHeight: 1.45 }}>{t("sales_quote_ui.ai_fill_intro")}</div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("sales_quote_ui.ai_fill_ph")} data-testid="ai-fill-text"
        style={{ ...inp, minHeight: 80, resize: "vertical", lineHeight: 1.45, background: "white" }} />
      <ErrBox>{err}</ErrBox>
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={run} disabled={busy || !text.trim()} data-testid="btn-ai-fill" style={btn("ai", busy || !text.trim(), true)}>
          {busy ? <Spinner size={13} color={T.pur} /> : "✨"} {busy ? t("sales_quote_ui.ai_thinking") : t("sales_quote_ui.ai_fill_btn")}
        </button>
      </div>
      {res ? (
        <div style={{ marginTop: 12 }} data-testid="ai-fill-result">
          {res.reply ? <div style={{ background: "white", border: "1px solid #DDD6FE", borderRadius: 10, padding: "8px 10px", fontSize: 13, marginBottom: 8, whiteSpace: "pre-line" }}>🤖 {res.reply}</div> : null}
          {(res.questions || []).length ? (
            <div style={{ background: T.ambL, border: "1px solid " + T.ambM, borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "#92400E", marginBottom: 3 }}>{t("sales_quote_ui.ai_questions")}</div>
              <ul style={{ margin: "0 0 0 18px", padding: 0, fontSize: 13 }}>{res.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          ) : null}
          {!res.lines.length ? <div style={{ fontSize: 13, color: T.t3 }}>{t("sales_quote_ui.ai_fill_none")}</div> : (
            <div style={{ border: "1px solid " + T.b1, borderRadius: 10, overflow: "hidden", background: "white" }}>
              {res.lines.map((l, idx) => {
                const ok = useful(l);
                return (
                  <label key={l.i} data-fill={l.key} style={{ display: "flex", gap: 10, padding: "9px 10px", borderTop: idx ? "1px solid " + T.b1 : "none", alignItems: "flex-start",
                    background: l.invented ? T.redL : "white", opacity: ok ? 1 : 0.6, cursor: ok ? "pointer" : "default" }}>
                    <input type="checkbox" checked={picked.has(l.i)} disabled={!ok} onChange={() => toggle(l.i)} style={{ width: 20, height: 20, flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <b>{l.label || l.key}</b>
                        {l.invented ? <span data-invented="1" style={chip(T.red, "white")}>⚠ {t("sales_quote_ui.invented_chip")}</span> : null}
                      </div>
                      {l.qty != null ? <div>{t("sales_quote_ui.f_qty")}: <span style={{ color: T.t3, textDecoration: "line-through" }}>{old(l.old_qty)}</span> → <b>{inr(l.qty)}</b> {l.unit ? <span style={{ color: T.t4 }}>{String(l.unit).replace(/^per\s+/i, "")}</span> : null}</div> : null}
                      {l.rate != null ? <div>{t("sales_quote_ui.f_rate")}: <span style={{ color: T.t3, textDecoration: "line-through" }}>{old(l.old_rate, true)}</span> → <b style={{ color: "#92400E" }}>₹{inr(l.rate)}</b></div> : null}
                      {l.description ? <div>{t("sales_quote_ui.f_name")}: <b>{l.description}</b></div> : null}
                      {!ok ? <div style={{ color: T.t4 }}>{t("sales_quote_ui.ai_fill_nothing")}</div> : null}
                      {l.reason ? <div style={{ fontSize: 11.5, color: T.t3, fontStyle: "italic" }}>{l.reason}</div> : null}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {res.lines.some((l) => l.invented) ? <div style={{ fontSize: 11.5, color: T.t3, marginTop: 6 }}>{t("sales_quote_ui.invented_hint")}</div> : null}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setRes(null)} style={btn("danger")}>{t("sales_quote_ui.reject")}</button>
            {res.lines.length ? (
              <button type="button" onClick={apply} disabled={!picked.size} data-testid="btn-ai-fill-apply" style={btn("primary", !picked.size)}>
                {t("sales_quote_ui.apply_n", { n: picked.size })}
              </button>
            ) : null}
          </div>
          <div style={{ fontSize: 11.5, color: T.t3, marginTop: 6 }}>{t("sales_quote_ui.ai_fill_save_hint")}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function QuoteLines({ quoteId, rows, lines, editable, onLines, badKeys, total, preview, baseDesc }) {
  return (
    <div style={{ ...card, marginBottom: 12 }} data-testid="qt-rate-card">
      <div style={{ fontSize: 14.5, fontWeight: 800, color: T.t1, marginBottom: 2 }}>{t("sales_quote_ui.rate_title")}</div>
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 10, lineHeight: 1.45 }}>{editable ? t("sales_quote_ui.rate_hint") : t("sales_quote_ui.rate_hint_locked")}</div>
      {editable ? <AiFillBox quoteId={quoteId} rows={rows} lines={lines} onLines={onLines} /> : null}
      <QuoteLinesTable rows={rows} lines={lines} editable={editable} onLines={onLines} badKeys={badKeys} total={total} preview={preview} baseDesc={baseDesc} />
      {badKeys && badKeys.size ? <ErrBox>{t("sales_quote_ui.err_line_bad")}</ErrBox> : null}
    </div>
  );
}
