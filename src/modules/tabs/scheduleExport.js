// ════════════════════════════════════════════════════════════════
// Payment Schedule (client) ka PDF + Excel (24 Nov 2026, Prafull: "payment
// schedule ka bhi pdf and excel download option"). Screen wala hi data
// (ScheduleTools.clientScheduleData) — har kaam: qty × rate = ₹, har stage %,
// ₹, yahan tak, haal; "sab floor ka ek saath" wale card; ab tak bill + kul.
// Excel = CSV (BOQ ke Excel jaisa, Excel seedha kholta hai). PDF = print window
// (BOQ ke PDF jaisa — "Save as PDF").
// ════════════════════════════════════════════════════════════════
import { t } from "../../i18n";
import { clientScheduleData } from "./ScheduleTools";

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(num(n) * 100) / 100;
const inr = (n) => "₹" + Math.round(num(n)).toLocaleString("en-IN");
const fname = (meta, ext) => "Payment_Schedule_" + String(meta.estimate_no || "estimate").replace(/[^\w.-]+/g, "-") + "." + ext;

// CSV ki rows (test bhi isi ko dekhta hai)
export function scheduleCsvRows(items) {
  const d = clientScheduleData(items);
  const rows = [[t("schedule.x_work"), t("schedule.x_qty"), t("schedule.x_unit"), t("schedule.x_rate"), t("schedule.x_stage"), t("schedule.x_where"),
    "%", t("schedule.x_amount"), t("schedule.x_cum"), t("schedule.x_status")]];
  for (const c of d.cards) {
    for (const r of c.rows) {
      rows.push([c.title, c.qty == null ? "" : c.qty, c.unit, c.rate == null ? "" : r2(c.rate), r.stage, r.where, r.pct, r2(r.amount), r2(r.cum), r.status]);
    }
    if (c.note) rows.push([c.title, "", "", "", c.note, "", "", "", "", ""]);
  }
  rows.push(["", "", "", "", "", "", "", "", t("schedule.cl_billed"), r2(d.billed)]);
  rows.push(["", "", "", "", "", "", "", "", t("schedule.cl_total"), r2(d.grand)]);
  return rows;
}

export function scheduleCsv(items, meta = {}) {
  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const lines = scheduleCsvRows(items).map((r) => r.map(esc).join(","));
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fname(meta, "csv");
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// PDF ka HTML (test isi ko dekhta hai)
export function scheduleHtml(items, meta = {}) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const d = clientScheduleData(items);
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  let body = "";
  for (const c of d.cards) {
    const head = c.together ? t("schedule.x_together_head", { amt: inr(c.amount) })
      : t("schedule.cl_item_head", { qty: num(c.qty).toLocaleString("en-IN", { maximumFractionDigits: 3 }), unit: c.unit, rate: inr(c.rate), amt: inr(c.amount) });
    body += `<tr class="${c.together ? "tg" : "sec"}"><td colspan="3">${esc(c.title)}</td><td colspan="3" class="r">${esc(head)}</td></tr>`;
    for (const r of c.rows) {
      body += `<tr><td class="it">${esc(r.stage)}${r.where ? `<div class="wh">${esc(r.where)}</div>` : ""}</td><td class="r">${r2(r.pct)}%</td>`
        + `<td class="r b">${inr(r.amount)}</td><td class="r m">${esc(t("schedule.cl_cum", { amt: inr(r.cum) }))}</td><td colspan="2" class="st">${esc(r.status)}</td></tr>`;
    }
    if (c.note) body += `<tr><td colspan="6" class="note">${esc(c.note)}</td></tr>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"/>
    <title>${esc(t("schedule.x_title"))} — ${esc(meta.estimate_no || "")}</title>
    <style>
      body{font-family:'Segoe UI',system-ui,sans-serif;color:#111827;margin:22px;font-size:12px}
      h1{font-size:18px;margin:0 0 2px}.sub{font-size:11px;color:#6B7280;margin-bottom:14px}
      .meta{display:flex;flex-wrap:wrap;gap:18px;margin:10px 0 16px;padding:10px 14px;background:#F8F9FB;border:1px solid #E5E7EB;border-radius:8px}
      .meta div{font-size:11px}.meta .l{color:#6B7280;text-transform:uppercase;letter-spacing:.3px;font-size:9.5px}
      .meta .v{font-weight:700;color:#111827;font-size:12.5px}
      table{width:100%;border-collapse:collapse}
      td{padding:6px 9px;border-bottom:1px solid #F3F4F6;vertical-align:top}
      td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
      td.b{font-weight:800}td.m{color:#6B7280;font-size:11px}td.st{text-align:right;color:#059669;font-weight:700;font-size:11px}
      tr.sec td{background:#EEF2FF;color:#3730A3;font-weight:800;border-top:8px solid #fff}
      tr.tg td{background:#ECFDF5;color:#047857;font-weight:800;border-top:8px solid #fff}
      td.it{padding-left:16px}.wh{font-size:10px;color:#9CA3AF;font-weight:400}
      td.note{font-size:10.5px;color:#6B7280;padding-left:16px}
      .totals{margin-top:16px;width:320px;margin-left:auto;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden}
      .totals .row{display:flex;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #F3F4F6;font-size:12px}
      .totals .row.net{background:#EEF2FF;color:#3730A3;font-weight:800;font-size:13px;border-bottom:none}
      .footer{margin-top:22px;font-size:10px;color:#9CA3AF;text-align:center}
      @media print{body{margin:12mm}tr{page-break-inside:avoid}}
    </style></head><body>
      <h1>${esc(t("schedule.x_title"))}</h1>
      <div class="sub">${esc(t("schedule.x_generated", { date: today }))}</div>
      <div class="meta">
        <div><div class="l">${esc(t("schedule.x_estimate"))}</div><div class="v">${esc(meta.estimate_no || "—")}</div></div>
        <div><div class="l">${esc(t("schedule.x_customer"))}</div><div class="v">${esc(meta.customer || "—")}</div></div>
        <div><div class="l">${esc(t("schedule.x_project"))}</div><div class="v">${esc(meta.project || "—")}</div></div>
      </div>
      <table>${body}</table>
      <div class="totals">
        <div class="row"><span>${esc(t("schedule.cl_billed"))}</span><span>${inr(d.billed)}</span></div>
        <div class="row net"><span>${esc(t("schedule.cl_total"))}</span><span>${inr(d.grand)}</span></div>
      </div>
      <div class="footer">${esc(meta.company || "")}${meta.company ? " · " : ""}${esc(meta.estimate_no || "")}</div>
    </body></html>`;
}

export function schedulePdf(items, meta = {}) {
  const w = window.open("", "_blank");
  if (!w) { window.alert(t("estimate.pop_up_blocked_allow_pop_ups")); return; }
  w.document.write(scheduleHtml(items, meta));
  w.document.close();
  setTimeout(() => w.print(), 400);
}
