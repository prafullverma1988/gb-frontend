// ── Paise ke niyam — backend ki EK copy, web ke liye ────────────────────
// Web ki screens (Finance Cash Book / Day Book, project ka Fin Activity aur
// Party tab) pehle har jagah apna alag niyam chalati thin — isliye Cash Book
// ka balance Accounts se alag, aur project Party tab ka "To Receive" Finance ke
// party card se ulta aata tha (audit 13-14 Sep 2026: FIN-10, FIN-11, FIN-21).
// Ab sab isi file se. Har function backend ke ek util ki HOOBAHOO copy hai —
// wahan badlo to yahan bhi badlo:
//   txnIsCleared   ← gb-backend utils/txnCleared.js (clearedSQL / notClearedReason)
//   cashMoveOf     ← gb-backend utils/accountBalance.js (movementCase)
//   partyRowSign   ← gb-backend routes/finance.js GET /parties/:id/ledger (ledger_sign)
//   balanceLabel   ← gb-backend utils/partyBalance.js (balanceLabel / isVendorType)

// Entry hisaab me ginti hai ya nahi: hata/cancel nahi, reject nahi, approval
// baaki nahi, receiver confirmation maangi thi to mil chuki.
export const txnIsCleared = (r) => {
  if (!r) return false;
  const ap = r.approval_status;
  return Number(r.is_active ?? 1) === 1
    && !["cancelled", "rejected"].includes(String(r.status || ""))
    && (ap == null || ap === "approved" || ap === "auto")
    && (Number(r.requires_receiver_confirmation || 0) === 0 || !!r.receiver_confirmed_at)
    && !r.receiver_rejected_at;
};

// Company ke bank/cash khaate par asli asar (GET /finance/transactions ki row):
//   +amount  receipt; bank_transfer ka IN leg (description "Bank Transfer IN…")
//   −amount  bank_transfer ka OUT leg; payment, party_payment, site_expense,
//            wallet_payment, wallet_topup, emd_forfeit
//   0        bills / invoices / settle_* / contra, bina khaate wali row, ya jo clear nahi
export const CASH_OUT_TYPES = new Set(["payment", "party_payment", "site_expense", "wallet_payment", "wallet_topup", "emd_forfeit"]);
export const isTransferIn = (r) => /^bank transfer in/i.test(String((r && r.description) || ""));
export const cashMoveOf = (r) => {
  if (!r || r.account_id == null || !txnIsCleared(r)) return 0;
  const amt = parseFloat(r.amount) || 0, ty = String(r.type || "");
  if (ty === "receipt") return amt;
  if (ty === "bank_transfer") return isTransferIn(r) ? amt : -amt;
  return CASH_OUT_TYPES.has(ty) ? -amt : 0;
};

// Party ledger me ek row ka sign (party ki nazar se):
//   +1 = party hum par aur udhaar hui (DR), −1 = hum party ke aur dene wale (CR), 0 = ginti nahi
// Staff party: uske wallet se gaya paisa (kisi ko bhi, khud ko bhi) −1; company ne
// staff ko diya (receipt / party_payment / payment / settle_out) +1; settle_in −1.
export const LEDGER_PLUS = new Set(["sales_invoice", "ra_bill", "payment", "party_payment", "settle_out", "material_return", "contra"]);
export const LEDGER_MINUS = new Set(["material_purchase", "subcon_expense", "site_expense", "receipt", "settle_in"]);
export const partyRowSign = (r, party) => {
  if (!txnIsCleared(r)) return 0;
  const ty = String(r.type || "");
  const isStaff = Number(party && party.is_staff) === 1;
  if (isStaff && Number(r.paid_via_staff_id) === Number(party.id)) return -1;
  // Staff ka receipt do ulti cheezein hoti hai, farak account se:
  //   account_id set  → paisa company ke khaate me pahuncha (bank me jama /
  //     Finance ka Payment Received) → uska bojh ghata → -1
  //   account_id NULL → paisa staff ke paas hi raha (wallet me aaya) → +1
  if (isStaff && ty === "receipt") return r.account_id != null ? -1 : 1;
  if (isStaff) return ["receipt", "party_payment", "payment", "settle_out"].includes(ty) ? 1 : ty === "settle_in" ? -1 : 0;
  return LEDGER_PLUS.has(ty) ? 1 : LEDGER_MINUS.has(ty) ? -1 : 0;
};

// Vendor (hum dete hain) ya client (wo dete hain) — label signed balance se:
// balance > 0 = party hume dene wali, < 0 = hum party ko dene wale.
export const isVendorType = (type) => {
  const t = String(type || "").trim().toLowerCase();
  if (!t) return false;
  if (t === "client" || t === "customer") return false;
  return t.includes("supplier") || t.includes("vendor") || t.includes("labour") ||
         t.includes("labor") || t.includes("contractor") || t.includes("sub-con") || t.includes("subcon");
};
// Party ka type ek BUCKET me — list ka type filter aur rang isi se. DB me type
// kai roop me pada hai (live 27 Sep: 'vendor', 'Material Supplier', 'client',
// 'Customer', 'Contractor', 'material_vendor', 'subcontractor', 'Labour
// Contractor', 'labour_vendor', 'equipment_vendor', 'fuel_vendor', 'staff' …).
// Pehle filter `p.type === "Vendor"` jaisa exact match tha — Vendor / Labour /
// Sub-Con / Material Supplier chunte hi 0 party aati thi. App me yahi FIN-14 me
// theek hua tha (typeBucket). Kram maayne rakhta hai: labour pehle, phir subcon.
export const PARTY_TYPE_BUCKETS = ["client", "vendor", "supplier", "labour", "subcon", "staff", "other"];
export const partyTypeBucket = (type, isStaff) => {
  const t = String(type || "").trim().toLowerCase();
  if (Number(isStaff) === 1 || t === "staff") return "staff";
  if (t.includes("client") || t.includes("customer")) return "client";
  if (t.includes("labour") || t.includes("labor")) return "labour";
  if (t.includes("subcon") || t.includes("sub-con") || t.includes("sub con") || t === "contractor") return "subcon";
  if (t.includes("material") || t === "supplier") return "supplier";
  if (t.includes("vendor") || t.includes("supplier") || t.includes("equipment") || t.includes("fuel") || t.includes("transport")) return "vendor";
  return "other";
};

export const balanceLabel = (type, bal) => (isVendorType(type)
  ? (bal <= 0 ? "To Pay" : "Advance Paid")
  : (bal >= 0 ? "To Receive" : "Advance Received"));

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
