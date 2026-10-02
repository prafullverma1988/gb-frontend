// ── Party ledger ka download — Excel (yahin, browser me) aur PDF (server se) ──
// Finance → Parties ka ledger drawer aur Reports → Party Ledger dono isi ko
// bulaate hain, taaki dono jagah ki file ek jaisi ho.
//
// Statement ka niyam gb-backend utils/partyLedger.js partyStatement ki HOOBAHOO
// copy hai — PDF wahan banti hai, Excel yahan, aur dono ke opening / rows /
// closing ek hi hone chahiye. Wahan badlo to yahan bhi badlo:
//   opening = party ka opening + `from` se PEHLE ki har ginti wali row
//   rows    = from..to, purani se nayi, har row ke baad chalta balance
//   closing = opening + range ki rows (tareekh na ho to = party card ka balance)
// Jo row ginti me nahi (reject / pending / cancel) uska sign 0 — file me dikhti
// hai (Status column me wajah) par balance nahi hilati, screen jaisa.
// Screen ki baaki chhanni (search / project / type) file me nahi lagti — beech
// se row hatane par opening + rows = closing ka jod toot jaata.
import { API_BASE, getToken } from "../config/api";
import { t, getLang } from "../i18n";
import { LEDGER_PLUS, LEDGER_MINUS, balanceLabel } from "./moneyRules";

// GET /finance/parties/:id/ledger ki kachchi row → statement row.
// Sign server ka ledger_sign; customer_invoices / customer_payments wali rows
// (client party) me wo aata hi nahi — tab type se (sales_invoice +1, receipt −1).
export const fromApiRow = (r) => ({
  id: r.id,
  // Wallet-kharide bill ki "usi waqt chukaaya" line = bill id + 0.5 (server)
  sortId: r.sort_id != null ? Number(r.sort_id) : null,
  day: String(r.date || "").slice(0, 10),
  amount: parseFloat(r.amount) || 0,
  sign: (r.ledger_sign === 0 || r.ledger_sign) ? Number(r.ledger_sign)
    : (r.wallet_spend === 1 ? -1 : LEDGER_PLUS.has(r.type) ? 1 : LEDGER_MINUS.has(r.type) ? -1 : 0),
  counted: r.counted !== 0,
  reason: r.not_counted_reason || null,
  // Wallet ke "Material" tab ka kharida — "Material Purchase" (screen / PDF jaisa)
  type: r.display_type === "wallet_material" ? "material_purchase" : (r.type || ""),
  invoiceNo: r.invoice_no || null,
  project: r.project_name || "",
  particulars: String(r.note || r.description || "").trim(),
  paidBy: r.paid_by || "",
});

// FinanceModule ke getLedgerRows wali row (ledSign pehle se lagi hui) → statement row.
export const fromScreenRow = (r) => ({
  id: r.id,
  sortId: r.sortId != null ? Number(r.sortId) : null,
  day: String(r.dateRaw || "").slice(0, 10),
  amount: Number(r.amount) || 0,
  sign: r.ledSign || 0,
  counted: r.counted !== false,
  reason: r.notCountedReason || null,
  type: r.displayType === "wallet_material" ? "material_purchase" : (r.txnType || ""),
  invoiceNo: r.invoiceNo || null,
  project: r.project || "",
  particulars: String(r.note || r.sub || "").trim(),
  paidBy: r.paidBy || "",
});

const paise = (v) => Math.round((Number(v) || 0) * 100);

// rows = fromApiRow / fromScreenRow ki rows (kisi bhi kram me), opening = signed.
export function ledgerStatement(rows, openingBalance, { from = null, to = null } = {}) {
  // Kram backend ledgerRowOrder jaisa: din, phir sortId ?? id — "usi waqt
  // chukaaya" line apne bill ke theek baad (pehle din ke aakhir me jaati thi).
  const list = [...rows].sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    const ia = a.sortId != null ? a.sortId : a.id, ib = b.sortId != null ? b.sortId : b.id;
    const na = typeof ia === "number", nb = typeof ib === "number";
    if (na && nb) return ia - ib;
    if (na !== nb) return na ? -1 : 1;
    return String(ia).localeCompare(String(ib));
  });
  let bal = paise(openingBalance);
  for (const x of list) if (from && x.day < from) bal += x.sign * paise(x.amount);
  const opening = bal;
  let dr = 0, cr = 0;
  const shown = [];
  for (const x of list) {
    if ((from && x.day < from) || (to && x.day > to)) continue;
    const amt = paise(x.amount);
    bal += x.sign * amt;
    if (x.sign > 0) dr += amt;
    else if (x.sign < 0) cr += amt;
    shown.push({ ...x, amount: amt / 100, balance: bal / 100 });
  }
  return { opening: opening / 100, closing: bal / 100, dr: dr / 100, cr: cr / 100, rows: shown };
}

// ── Labels (backend ke finance.ledger_* jaise) ──
const TYPE_LABEL = {
  material_purchase: () => t("finance.ledger_dl_type_material_purchase"),
  payment:           () => t("finance.ledger_dl_type_payment"),
  party_payment:     () => t("finance.ledger_dl_type_payment"),
  receipt:           () => t("finance.ledger_dl_type_receipt"),
  subcon_expense:    () => t("finance.ledger_dl_type_subcon_expense"),
  site_expense:      () => t("finance.ledger_dl_type_site_expense"),
  sales_invoice:     () => t("finance.ledger_dl_type_sales_invoice"),
  ra_bill:           () => t("finance.ledger_dl_type_ra_bill"),
  emd_forfeit:       () => t("finance.ledger_dl_type_emd_forfeit"),
  bank_transfer:     () => t("finance.ledger_dl_type_bank_transfer"),
  settle_in:         () => t("finance.ledger_dl_type_settlement"),
  settle_out:        () => t("finance.ledger_dl_type_settlement"),
  material_return:   () => t("finance.ledger_dl_type_material_return"),
  contra:            () => t("finance.ledger_dl_type_contra"),
  wallet_payment:    () => t("finance.ledger_dl_type_wallet_payment"),
  wallet_topup:      () => t("finance.ledger_dl_type_wallet_topup"),
  unbilled_material: () => t("finance.ledger_dl_type_unbilled_material"),
};
const REASON_LABEL = {
  cancelled: () => t("finance.ledger_dl_reason_cancelled"),
  rejected:  () => t("finance.ledger_dl_reason_rejected"),
  pending:   () => t("finance.ledger_dl_reason_pending"),
};
const STATUS_LABEL = {
  "To Pay": () => t("finance.to_pay"), "To Receive": () => t("finance.to_receive"),
  "Advance Paid": () => t("finance.advance_paid"), "Advance Received": () => t("finance.advance_received"),
};
const typeText = (x) => (TYPE_LABEL[x.type] || (() => t("finance.ledger_dl_type_other")))() + (x.invoiceNo ? " · " + x.invoiceNo : "");
const drcr = (v) => (paise(v) > 0 ? t("finance.ledger_dl_dr") : paise(v) < 0 ? t("finance.ledger_dl_cr") : "");
const dmy = (day) => (/^\d{4}-\d{2}-\d{2}$/.test(day) ? day.split("-").reverse().join("-") : day || "");
export const statusText = (partyType, bal) => (paise(bal) === 0 ? t("finance.settled") : STATUS_LABEL[balanceLabel(partyType, bal)]());

// Kaunsi file ka naam — Downloads me teen "ledger.xlsx" padi hon to pata na chale.
const fileBase = (party, from, to) => [
  String(party.name || party.id).replace(/[^\wऀ-ॿ-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || String(party.id),
  from, to,
].filter(Boolean).join("_");

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

// Excel — xlsx sirf is button par aata hai (dynamic import, main chunk halka).
// Rakam number ki tarah jaati hai (Excel me jod lag sake), Balance ke saath alag
// Dr/Cr column.
export async function downloadLedgerExcel({ party, rows, from = null, to = null, company = "" }) {
  const st = ledgerStatement(rows, party.opening_balance, { from, to });
  const XLSX = await import("xlsx");
  const head = [
    t("finance.ledger_dl_col_date"), t("finance.ledger_dl_col_project"), t("finance.ledger_dl_col_particulars"),
    t("finance.ledger_dl_col_type"), t("finance.ledger_dl_col_paid_by"), t("finance.ledger_dl_col_cr"),
    t("finance.ledger_dl_col_dr"), t("finance.ledger_dl_col_balance"), t("finance.ledger_dl_col_drcr"),
    t("finance.ledger_dl_col_status"),
  ];
  const aoa = [
    [t("finance.ledger_dl_sheet_title", { name: party.name })],
    [company],
    [(from || to) ? t("finance.ledger_dl_period", {
      from: from ? dmy(from) : t("finance.ledger_dl_start"), to: to ? dmy(to) : t("finance.ledger_dl_today"),
    }) : ""],
    [],
    head,
    ["", "", t("finance.ledger_dl_opening"), "", "", "", "", Math.abs(st.opening), drcr(st.opening), ""],
    ...st.rows.map((x) => [
      dmy(x.day), x.project, x.particulars, typeText(x), x.paidBy,
      x.sign < 0 ? x.amount : "", x.sign > 0 ? x.amount : "",
      Math.abs(x.balance), drcr(x.balance),
      x.counted ? "" : (REASON_LABEL[x.reason] || REASON_LABEL.pending)(),
    ]),
    ["", "", t("finance.ledger_dl_closing"), "", "", st.cr, st.dr, Math.abs(st.closing), drcr(st.closing),
      statusText(party.type, st.closing)],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [12, 18, 40, 18, 22, 14, 14, 16, 7, 26].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t("finance.ledger_dl_sheet").slice(0, 31));
  XLSX.writeFile(wb, fileBase(party, from, to) + ".xlsx");
  return st;
}

// PDF — server banata hai (GET /finance/parties/:id/ledger.pdf), taaki WhatsApp
// par bhejne layak asli file ho. Auth header chahiye, isliye fetch + blob.
export async function downloadLedgerPdf({ party, from = null, to = null }) {
  const qs = [from && "from=" + from, to && "to=" + to].filter(Boolean).join("&");
  const res = await fetch(`${API_BASE}/finance/parties/${party.id}/ledger.pdf${qs ? "?" + qs : ""}`, {
    headers: { Authorization: `Bearer ${getToken()}`, "X-Lang": getLang() },
  });
  if (!res.ok) {
    let m = "";
    try { m = (await res.json()).message; } catch (_) { /* PDF ka error HTML bhi ho sakta hai */ }
    throw new Error(m || t("finance.ledger_dl_pdf_failed"));
  }
  saveBlob(await res.blob(), fileBase(party, from, to) + ".pdf");
}
