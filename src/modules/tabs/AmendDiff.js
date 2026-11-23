// ════════════════════════════════════════════════════════════════
// Amendment me "kya badla" (24 Nov 2026, Prafull: "amendment me thoda clear
// dikhao — initial rate, amendment ke baad kya amount aaya, kya amend hua,
// kis rate pe").
//
// Approve ho chuka: server ka applied_diff (approve ke waqt line-wise pehle /
// baad, total_before / total_after, project_boq). Pending: abhi ka estimate vs
// proposal — wahi jo approve karne par hoga (id se milaan, Extra line bahar).
// Line ko kaam (floor ke andar kaam, hisse ek saath) me jod kar dikhate hain:
// pehle qty × rate = ₹, ab qty × rate = ₹, kitna badla. Jin kaam me sirf stage
// (hisse) badle aur ₹ wahi, wo neeche ek line me.
// ════════════════════════════════════════════════════════════════
import React, { useState } from "react";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const fmtC = (v) => "₹" + Math.round(num(v)).toLocaleString("en-IN");
const fmtQ = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const signed = (v) => (num(v) > 0 ? "+" : num(v) < 0 ? "−" : "") + fmtC(Math.abs(num(v)));

// "[GF] Ground Floor · Plinth (₹276)" → { cat: "GF", work: "Ground Floor", part: "Plinth (₹276)" }
export function splitLine(desc) {
  const m = /^\[([^\]]+)\]\s*(.*)$/.exec(String(desc || ""));
  const cat = m ? m[1].trim() : "", rest = m ? m[2] : String(desc || "");
  const i = rest.indexOf(" · ");
  return { cat, work: (i >= 0 ? rest.slice(0, i) : rest).trim(), part: i >= 0 ? rest.slice(i + 3).trim() : "" };
}
const side = (qty, rate) => ({ qty: num(qty), rate: num(rate), amount: r2(num(qty) * num(rate)) });
const ZERO = { qty: 0, rate: 0, amount: 0 };

// Approve ke waqt server ne jo likha (customer_estimate_amendments.applied_diff)
export function diffFromApplied(ad) {
  const d = typeof ad === "string" ? (() => { try { return JSON.parse(ad); } catch (_) { return null; } })() : ad;
  if (!d || !Array.isArray(d.lines)) return null;
  return {
    before: num(d.total_before), after: num(d.total_after), project_boq: d.project_boq || null, stale: 0,
    lines: d.lines.map(l => ({ kind: l.kind, description: l.description || "", before: l.before || ZERO, after: l.after || ZERO })),
  };
}

// Pending: abhi ke estimate (sections → items) vs proposal — approve par yahi hoga.
// Proposal ki jo line id ab estimate me nahi (beech me BOQ / hisse badle), wo nayi ban
// jaayegi aur abhi wali line hat jaayegi — `stale` me ginti, upar chetavni.
export function diffFromProposal(sections, proposedSections) {
  const cur = new Map();
  let before = 0;
  for (const s of sections || []) for (const it of s.items || []) {
    if ((it.item_type || "boq") === "extra") continue;
    cur.set(Number(it.id), it);
    before += num(it.amount);
  }
  const lines = [], seen = new Set();
  let after = 0, stale = 0;
  for (const s of proposedSections || []) for (const it of s.items || []) {
    const id = Number(it.id) || 0;
    const now = side(it.qty, it.rate);
    if (id && cur.has(id)) {
      if (seen.has(id)) continue;
      seen.add(id);
      const o = cur.get(id);
      if ((o.item_type || "boq") === "extra") continue;
      after += now.amount;
      const was = side(o.qty, o.rate);
      if (Math.abs(was.qty - now.qty) > 0.0005 || Math.abs(was.rate - now.rate) > 0.005) {
        lines.push({ kind: "changed", description: it.description || o.description || "", before: was, after: now });
      }
    } else {
      if (id) stale++;
      after += now.amount;
      lines.push({ kind: "added", description: it.description || "", before: ZERO, after: now });
    }
  }
  for (const [id, o] of cur) {
    if (!seen.has(id)) lines.push({ kind: "removed", description: o.description || "", before: side(o.qty, o.rate), after: ZERO });
  }
  return { before: r2(before), after: r2(after), project_boq: null, stale, lines };
}

// Line → kaam ki row. Ek kaam ke saare hisse badle (hata kar naye / ek line) to ek row
// (qty × hisson ka jod rate); kaam ka sirf koi hissa badla to us hisse ki apni row.
export function workRows(lines) {
  const groups = [], idx = {};
  for (const l of lines || []) {
    const s = splitLine(l.description);
    const k = s.cat.toLowerCase() + "¦" + s.work.toLowerCase();
    if (idx[k] === undefined) { idx[k] = groups.length; groups.push({ key: k, cat: s.cat, work: s.work, lines: [] }); }
    groups[idx[k]].lines.push({ ...l, part: s.part });
  }
  const rows = [];
  const agg = (ls, which) => {
    const on = ls.filter(l => num(l[which].amount) !== 0 || num(l[which].qty) !== 0);
    if (!on.length) return ZERO;
    const qty = Math.max(...on.map(l => num(l[which].qty)));
    const sameQty = on.every(l => Math.abs(num(l[which].qty) - qty) < 0.0005);
    const amount = r2(on.reduce((s, l) => s + num(l[which].amount), 0));
    return { qty, rate: sameQty ? r2(on.reduce((s, l) => s + num(l[which].rate), 0)) : (qty > 0 ? r2(amount / qty) : 0), amount };
  };
  for (const g of groups) {
    const onlyParts = g.lines.every(l => l.kind === "changed" && l.part);
    const make = (key, name, ls) => {
      const b = agg(ls, "before"), a = agg(ls, "after"), delta = r2(a.amount - b.amount);
      const same = Math.abs(b.qty - a.qty) < 0.0005 && Math.abs(b.rate - a.rate) < 0.005;
      const kind = !b.amount && a.amount ? "added" : b.amount && !a.amount ? "removed"
        : Math.abs(delta) < 0.5 ? (same ? "stages" : "swap") : "changed";
      // Sirf stage: hisse hate (wapas poori line), lage, ya badle
      const pb = ls.some(l => l.part && num(l.before.amount)), pa = ls.some(l => l.part && num(l.after.amount));
      const stage = kind !== "stages" ? null : pb && !pa ? "removed" : !pb && pa ? "added" : "changed";
      rows.push({ key, cat: g.cat, name, kind, stage, before: b, after: a, delta, parts: ls.filter(l => l.part).length });
    };
    if (onlyParts) for (const l of g.lines) make(g.key + "¦" + l.part, g.work + " · " + l.part.replace(/\s*\((?:₹[\d.,]+|[\d.]+%)\)\s*$/, ""), [l]);
    else make(g.key, g.work, g.lines);
  }
  const rank = { added: 0, changed: 1, removed: 2, swap: 3, stages: 4 };
  return rows.sort((x, y) => rank[x.kind] - rank[y.kind]);
}

const CHIP = {
  added: [T.grnL, T.grn, "estimate.ad_k_added"], removed: [T.redL, T.red, "estimate.ad_k_removed"],
  changed: [T.ambL, T.amb, "estimate.ad_k_changed"], swap: [T.bluL, T.blu, "estimate.ad_k_swap"], stages: [T.sltL, T.slt, "estimate.ad_k_stages"],
};
const chipS = (bg, fg) => ({ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap" });
const cell = { padding: "6px 8px", fontSize: 12, borderTop: "1px solid " + T.b1, verticalAlign: "top" };
const numC = { ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

// Card ke upar: pehle → ab, aur kitna badla
export function AmendTotals({ diff, pending }) {
  const delta = r2(diff.after - diff.before);
  return (
    <div data-testid="ad-totals" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 6, fontVariantNumeric: "tabular-nums" }}>
      <span style={{ fontSize: 11.5, color: T.t3 }}>{fmtC(diff.before)}</span>
      <span style={{ fontSize: 11.5, color: T.t4 }}>→</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: T.t1 }}>{fmtC(diff.after)}</span>
      <span style={chipS(delta > 0 ? T.grnL : delta < 0 ? T.redL : T.sltL, delta > 0 ? T.grn : delta < 0 ? T.red : T.slt)}>
        {Math.abs(delta) < 0.5 ? t("estimate.ad_no_money") : signed(delta)}
      </span>
      {pending && <span style={{ fontSize: 10, color: T.t4, width: "100%", textAlign: "right" }}>{t("estimate.ad_if_approved")}</span>}
    </div>
  );
}

export default function AmendDiffView({ diff, pending }) {
  const [showStages, setShowStages] = useState(false);
  const rows = workRows(diff.lines);
  const money = rows.filter(r => r.kind !== "stages");
  const stages = rows.filter(r => r.kind === "stages");
  const delta = r2(diff.after - diff.before);
  const qr = (s) => (s.amount || s.qty ? fmtQ(s.qty) + " × " + fmtC(s.rate) : "—");
  const row = (r) => {
    const [bg, fg, key0] = CHIP[r.kind];
    const key = r.stage === "removed" ? "estimate.ad_k_stages_removed" : r.stage === "added" ? "estimate.ad_k_stages_added" : key0;
    return (
      <tr key={r.key} data-ad-row={r.kind}>
        <td style={cell}>
          <b style={{ color: T.t1 }}>{r.cat ? r.cat + " · " : ""}{r.name}</b>{" "}<span style={chipS(bg, fg)}>{t(key)}</span>
          {r.parts > 1 && r.kind !== "added" && r.kind !== "removed" && <div style={{ fontSize: 10.5, color: T.t4, marginTop: 1 }}>{t("estimate.ad_parts", { n: r.parts })}</div>}
        </td>
        <td style={{ ...numC, color: T.t3 }}>{qr(r.before)}<div style={{ fontSize: 11, color: T.t2 }}>{r.before.amount ? fmtC(r.before.amount) : ""}</div></td>
        <td style={{ ...numC, color: T.t1 }}>{qr(r.after)}<div style={{ fontSize: 11.5, fontWeight: 700 }}>{r.after.amount ? fmtC(r.after.amount) : ""}</div></td>
        <td style={{ ...numC, fontWeight: 800, color: r.delta > 0 ? T.grn : r.delta < 0 ? T.red : T.t4 }}>{Math.abs(r.delta) < 0.5 ? "—" : signed(r.delta)}</td>
      </tr>
    );
  };
  return (
    <div data-testid="ad-view" style={{ background: T.surface, border: "1px solid " + T.b1, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: T.t1, marginBottom: 6 }}>{t("estimate.ad_title")}</div>
      <div data-testid="ad-summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 8 }}>
        {[[pending ? "estimate.ad_now" : "estimate.ad_before", diff.before, T.t1], ["estimate.ad_change", null, delta > 0 ? T.grn : delta < 0 ? T.red : T.t3],
          [pending ? "estimate.ad_after_pending" : "estimate.ad_after", diff.after, T.ind]].map(([k, v, c]) => (
          <div key={k} style={{ background: T.surfaceB, borderRadius: 6, padding: "6px 10px" }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>{t(k)}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v == null ? (Math.abs(delta) < 0.5 ? t("estimate.ad_no_money") : signed(delta)) : fmtC(v)}</div>
          </div>
        ))}
      </div>
      {diff.project_boq && Math.abs(num(diff.project_boq.after) - num(diff.project_boq.before)) >= 0.5 && (
        <div style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>{t("estimate.ad_project_boq", { before: fmtC(diff.project_boq.before), after: fmtC(diff.project_boq.after) })}</div>
      )}
      {pending && diff.stale > 0 && (
        <div role="alert" data-testid="ad-stale" style={{ padding: "7px 10px", borderRadius: 6, background: T.ambL, color: T.amb, fontSize: 11.5, marginBottom: 8, lineHeight: 1.45 }}>
          {t("estimate.ad_stale", { n: diff.stale })}
        </div>
      )}
      {money.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead><tr style={{ fontSize: 9.5, color: T.t4, textTransform: "uppercase", letterSpacing: ".4px" }}>
              <th style={{ textAlign: "left", padding: "4px 8px" }}>{t("estimate.ad_col_work")}</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>{t("estimate.ad_col_before")}</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>{t("estimate.ad_col_after")}</th>
              <th style={{ textAlign: "right", padding: "4px 8px" }}>{t("estimate.ad_col_change")}</th>
            </tr></thead>
            <tbody>{money.map(row)}</tbody>
          </table>
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: T.t3 }}>{t("estimate.ad_none")}</div>
      )}
      {stages.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button type="button" data-testid="ad-stages" onClick={() => setShowStages(s => !s)}
            style={{ border: "none", background: "none", padding: 0, color: T.blu, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {showStages ? "▾ " : "▸ "}{t("estimate.ad_stages_only", { n: stages.length })}
          </button>
          {showStages && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}><tbody>{stages.map(row)}</tbody></table>
          )}
        </div>
      )}
    </div>
  );
}

// BOQ / Items ke neeche: kul BOQ / Estimate (Extra kaam alag, GST ho to saath)
export function boqTotals(sections, unsectioned, taxPct) {
  let boq = 0, extra = 0;
  for (const it of [...(sections || []).flatMap(s => s.items || []), ...(unsectioned || [])]) {
    if ((it.item_type || "boq") === "extra") extra += num(it.amount); else boq += num(it.amount);
  }
  boq = r2(boq); extra = r2(extra);
  const tax = num(taxPct) > 0 ? r2((boq + extra) * num(taxPct) / 100) : 0;
  return { boq, extra, tax, total: r2(boq + extra), withTax: r2(boq + extra + tax) };
}
export function BoqTotalBar({ sections, unsectioned, taxPct }) {
  const x = boqTotals(sections, unsectioned, taxPct);
  return (
    <div data-testid="boq-total" style={{ marginTop: 10, padding: "12px 16px", background: "#0F172A", color: "white", borderRadius: 8, display: "grid", gap: 4 }}>
      {x.extra > 0 && (<>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.75)" }}><span>{t("estimate.boq_total_contract")}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtC(x.boq)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.75)" }}><span>{t("estimate.boq_total_extra")}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtC(x.extra)}</span></div>
      </>)}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", color: "rgba(255,255,255,0.8)" }}>{t("estimate.boq_total_label")}</span>
        <span data-testid="boq-total-amt" style={{ fontSize: 19, fontWeight: 800, color: "#5EEAD4", fontVariantNumeric: "tabular-nums" }}>{fmtC(x.total)}</span>
      </div>
      {x.tax > 0 && (<>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.75)" }}><span>{t("estimate.boq_total_gst", { pct: num(taxPct) })}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtC(x.tax)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}><span>{t("estimate.boq_total_with_gst")}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtC(x.withTax)}</span></div>
      </>)}
    </div>
  );
}
