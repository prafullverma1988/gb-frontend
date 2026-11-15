// ════════════════════════════════════════════════════════════════
// CRM Package Quote — web ke chhote helper (15 Nov 2026, Prafull)
//
// Server: gb-backend routes/sales-quotes.js + utils/salesQuote.js (compute).
// Number hamesha server ke `computed` se dikhte hain. previewCompute sirf tab
// ke liye hai jab user ne kuch badla aur abhi Save nahi kiya (≈ ke saath) —
// formula wahi (override > package rate (scope) > line rate; Math.round), aur
// Save ke turant baad server ka jawab use badal deta hai.
// ════════════════════════════════════════════════════════════════
import { t } from "../../i18n";
import { T, chip } from "./pkgUi";

export const QBASE = "/sales-quotes";
const MAX_QTY = 10000000;
const MAX_RATE = 9999999999;

// "1,278.34" / "₹ 920" → number; "" → null; galat → NaN
export function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  const s = String(v).replace(/[₹,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
const r2 = (n) => Math.round(n * 100) / 100;

export const scopeLabel = (key, scopes) => {
  const s = (scopes || []).find((x) => x.key === key);
  if (key === "structure") return t("sales_quote_ui.scope_structure");
  if (key === "full") return t("sales_quote_ui.scope_full");
  return (s && s.label) || key || "";
};

export function QStatusChip({ status }) {
  const m = {
    draft: [T.ambL, "#92400E", T.ambM, t("sales_quote_ui.st_draft")],
    sent: [T.bluL, T.blu, T.bluM, t("sales_quote_ui.st_sent")],
    accepted: [T.grnL, T.grn, T.grnM, "✓ " + t("sales_quote_ui.st_accepted")],
    lost: [T.redL, T.red, T.redM, t("sales_quote_ui.st_lost")],
    // Revision banne par purana bheja hua quote (client ka link band)
    superseded: [T.sltL, T.slt, null, t("sales_quote_ui.st_superseded")],
  }[status] || [T.sltL, T.slt, null, status];
  return <span data-status={status} style={chip(m[0], m[1], m[2])}>{m[3]}</span>;
}
export const revLabel = (q) => (q && Number(q.rev_no) > 0 ? "R" + q.rev_no : "");

// ── Lines: save ke liye saaf karo (qty > 0, rate ≥ 0) ──
// raw: { key: { qty, rate, description } } (input ki string bhi chalegi)
export function normLines(raw) {
  const out = {}, bad = [];
  for (const [k, v] of Object.entries(raw || {})) {
    if (!v || typeof v !== "object") continue;
    let qty = toNum(v.qty);
    const rate = toNum(v.rate);
    const description = v.description != null && String(v.description).trim() ? String(v.description).trim().slice(0, 300) : null;
    if (Number.isNaN(qty) || (qty != null && (qty < 0 || qty > MAX_QTY))) { bad.push(k); continue; }
    if (Number.isNaN(rate) || (rate != null && (rate < 0 || rate > MAX_RATE))) { bad.push(k); continue; }
    if (qty === 0) qty = null;
    if (qty == null && rate == null && !description) continue;
    out[k] = { qty: qty == null ? null : r2(qty), rate: rate == null ? null : r2(rate), description };
  }
  return { lines: out, bad };
}

// ── Schedule: har line ke hisse [{name, pct, group}] — khaali = kaam poora hone par ──
export function normParts(parts) {
  return (Array.isArray(parts) ? parts : []).map((p) => ({
    name: String((p && p.name) || "").trim(),
    pct: (() => { const n = toNum(p && p.pct); return n == null || Number.isNaN(n) ? null : r2(n); })(),
    group: p && p.group && String(p.group).trim() ? String(p.group).trim() : null,
  }));
}
export const partsSum = (parts) => r2(normParts(parts).reduce((s, p) => s + (Number(p.pct) || 0), 0));
// null = theek; warna galti ka code: min2 | fill | sum
export function partsProblem(parts) {
  const P = normParts(parts);
  if (!P.length) return null;
  if (P.length < 2) return "min2";
  if (P.some((p) => !p.name || !(p.pct > 0))) return "fill";
  if (Math.abs(partsSum(P) - 100) > 0.01) return "sum";
  return null;
}
export function normSchedule(raw) {
  const out = {}, bad = [];
  for (const [k, v] of Object.entries(raw || {})) {
    if (!Array.isArray(v) || !v.length) continue;
    if (partsProblem(v)) { bad.push(k); continue; }
    out[k] = normParts(v);
  }
  return { schedule: out, bad };
}

export const HEADER_KEYS = ["client_name", "contact", "site_address", "plot_area", "builtup_area", "date"];
export const normHeader = (h) => Object.fromEntries(HEADER_KEYS.map((k) => [k, String((h && h[k]) == null ? "" : h[k]).trim()]));

// Badla ya nahi — key ki tarteeb se farq na pade; adhoora / galat input bhi "badla" gina jaaye
const stable = (o) => JSON.stringify(Object.keys(o || {}).sort().map((k) => [k, o[k]]));
const cmpNum = (v) => { const n = toNum(v); return Number.isNaN(n) ? "bad:" + String(v) : n === 0 ? null : n; };
const linesSig = (L) => stable(Object.fromEntries(Object.entries(L || {}).map(([k, v]) => [k, [cmpNum(v && v.qty), cmpNum(v && v.rate),
  v && v.description != null && String(v.description).trim() ? String(v.description).trim() : null]])
  .filter(([, x]) => x[0] != null || x[1] != null || x[2] != null)));
const schedSig = (S) => stable(Object.fromEntries(Object.entries(S || {}).filter(([, v]) => Array.isArray(v) && v.length)
  .map(([k, v]) => [k, v.map((p) => [String((p && p.name) || "").trim(), cmpNum(p && p.pct), p && p.group && String(p.group).trim() ? String(p.group).trim() : null])])));
export const sameLines = (a, b) => linesSig(a) === linesSig(b);
export const sameSchedule = (a, b) => schedSig(a) === schedSig(b);

// ── Local preview (Save se pehle) — server ke compute jaisa ──
export function previewCompute(content, scope, lines, schedule) {
  const sc = (content && content.scopes) || [];
  const s = sc.find((x) => x.key === scope) || sc.find((x) => x.key === "full") || sc[0];
  const pkgRate = s ? s.rate : null;
  const L = normLines(lines).lines;
  const S = schedule || {};
  const rows = [];
  let total = 0;
  for (const g of (content && content.rate_schedule && content.rate_schedule.groups) || []) {
    for (const r of g.rows || []) {
      const k = g.key + "." + r.key;
      const f = L[k] || {};
      const baseRate = r.kind === "package" ? pkgRate : r.rate;
      const rate = f.rate != null ? f.rate : baseRate;
      const qty = f.qty != null ? f.qty : null;
      let amount = null;
      if (r.kind === "lump_sum") amount = qty && rate != null ? Math.round(rate) : null;
      else if (qty != null && rate != null) amount = Math.round(qty * rate);
      if (amount != null) total += amount;
      const parts = Array.isArray(S[k]) && S[k].length && !partsProblem(S[k]) ? normParts(S[k]) : null;
      let used = 0;
      const sched = parts && amount != null ? parts.map((p, i) => {
        const amt = i === parts.length - 1 ? amount - used : Math.round(amount * p.pct / 100);
        used += amt;
        return { ...p, amount: amt };
      }) : null;
      rows.push({ key: k, group_key: g.key, group_title: g.title, row_key: r.key, kind: r.kind, description: f.description || r.description, unit: r.unit,
        base_rate: baseRate, rate, rate_overridden: f.rate != null, qty, amount, schedule: sched, parts });
    }
  }
  return { scope_rate: pkgRate, rows, total: Math.round(total), preview: true };
}

// ₹ — lakh wala comma
export const rupee = (n) => (n == null || n === "" || !Number.isFinite(Number(n)) ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
export const ask = (m) => (typeof window.confirmAsync === "function" ? window.confirmAsync(m) : Promise.resolve(window.confirm(m)));
