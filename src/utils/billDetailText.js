// ════════════════════════════════════════════════════════════════
// BILL KA BYORA — jab line items aur note dono nahi (20 Nov 2026, Prafull:
// "kisi bhi vendor ka bill show nahi kar raha hai").
//
// Purane import (idempotency "GBX2:…") ke material bill me item ka naam sirf
// `description` me hota hai ("Brick", "Cement", "Tmt 10mm, Transport, Tmt 12mm") —
// transaction_items me koi line nahi, aur Note khaali. Finance har jagah sirf
// user-typed Note dikhata tha (description ko "Type — Party — Project" jaisa
// auto-text maan kar), isliye greenbox bhilai ke ~1,190 bills me Note "—" aur
// kholne par sirf "Line items not recorded" — bill ka koi byora nahi dikhta tha.
//
// Yahan wahi plain description wapas milti hai — SIRF bill-type row par, jisme na
// line items hain na Note. Auto-text ("Type — Party", " — " wala) kabhi nahi: wo
// Type / Party / Project column dohrata hai. Baaki har row par "" (pehle jaisa).
// ════════════════════════════════════════════════════════════════
const BILL_TYPES = ["material_purchase", "site_expense", "subcon_expense", "Material Purchase", "Site Expense", "Sub-Con Expense"];

export function billDetailText(txn) {
  if (!txn || txn.tripBillId != null) return "";
  if (!BILL_TYPES.includes(txn.txnType || txn.type || "")) return "";
  const items = Array.isArray(txn.items) ? txn.items : (Array.isArray(txn.line_items) ? txn.line_items : []);
  if (items.length) return "";
  if (String(txn.note || "").trim()) return "";
  const d = String(txn.sub || txn.description || "").trim();
  return d && !d.includes(" — ") ? d : "";
}
