// Entry Edit (26 Nov 2026) — ek niyam, chaar jagah (CRM lead, Site GRN, Fuel
// pump entry, Asset voucher). Server tay karta hai (gb-backend utils/entryEdit.js):
//   Admin hamesha · module ka Edit tick = seedha (rok ho to 409) · banane wala
//   company ke samay (entry_edit_hours) ke andar seedha, baad me wajah + "Entry
//   Edit" manzoori. Screen sirf poochhti hai (GET /entry-edit/mode) aur save ka
//   jawab sambhalti hai. Ye saade function hain — koi shared component nahi,
//   har module apna button / form khud banata hai.
import api from "../config/api";
import { t } from "../i18n";

const MODES = ["direct", "request", "none"];

// → { mode, why, until, window, window_label, lock, pending } | null
// null = server ne jawab nahi diya (purana server / network) — screen apna
// purana permission wala niyam chalaye.
export async function fetchEditMode(entity, id) {
  if (!entity || !id) return null;
  let r = null;
  try {
    r = await api.get(`/entry-edit/mode?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`);
  } catch (_) { return null; }
  const d = r && r.success ? r.data : null;
  return d && MODES.includes(d.mode) ? d : null;
}

// Button / hint ka faisla ek jagah — modules isi ko padhte hain.
//   show     Edit button dikhe
//   disabled dikhe par dab na sake (ek badlav pehle se manzoori me)
//   label    button ka text
//   hint     button ke paas ek line (samay nikal gaya / manzoori me)
//   warn     form ke andar chetavni (admin ko rok ka text)
//   note     Edit nahi — chhota muted text (rok kyon)
export function editUi(m, fallbackLabel) {
  const base = fallbackLabel || t("entry_edit.btn_edit");
  if (!m) return { show: false, disabled: false, label: base, hint: "", warn: "", note: "" };
  if (m.pending) {
    return { show: m.mode !== "none", disabled: true, label: base, hint: t("entry_edit.pending_hint"), warn: "", note: m.mode === "none" ? t("entry_edit.pending_hint") : "" };
  }
  if (m.mode === "direct") {
    return { show: true, disabled: false, label: base, hint: "", warn: m.why === "admin" && m.lock ? m.lock : "", note: "" };
  }
  if (m.mode === "request") {
    // approved_entry (Phase 2): entry manzoor ho chuki — samay ki baat nahi.
    return { show: true, disabled: false, label: t("entry_edit.btn_request"),
      hint: m.why === "approved_entry" ? t("entry_edit.request_hint_approved") : t("entry_edit.request_hint", { win: m.window_label || "" }),
      warn: "", note: "" };
  }
  return { show: false, disabled: false, label: base, hint: "", warn: "", note: m.lock || "" };
}

function askReason(message) {
  const msg = message || t("entry_edit.reason_ask");
  if (typeof window !== "undefined" && typeof window.promptAsync === "function") {
    return window.promptAsync({ message: msg, defaultValue: "", multiline: true,
      okLabel: t("entry_edit.send_approval"), cancelLabel: t("common.cancel") });
  }
  if (typeof window !== "undefined" && typeof window.prompt === "function") return Promise.resolve(window.prompt(msg, ""));
  return Promise.resolve(null);
}

// sendFn(body) → api ka jawab (api throw nahi karta). Server 428
// EDIT_REASON_REQUIRED de to wajah poochh kar WAHI body + _edit_reason dobara.
// Lautta: server ka jawab + { pending, cancelled }
//   pending   = manzoori ke liye gaya, entry abhi nahi badli
//   cancelled = user ne wajah nahi di (kuch nahi bheja)
export async function saveWithEditRule(sendFn, body) {
  let r = await sendFn(body);
  if (r && r.code === "EDIT_REASON_REQUIRED") {
    const reason = await askReason(r.message);
    const why = reason == null ? "" : String(reason).replace(/\s+/g, " ").trim();
    if (!why) return { ...r, success: false, cancelled: true, pending: false };
    r = await sendFn({ ...(body || {}), _edit_reason: why });
  }
  const out = r && typeof r === "object" ? r : { success: false };
  return { ...out, cancelled: false, pending: !!(out.success && out.data && out.data.mode === "pending_approval") };
}
