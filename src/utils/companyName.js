// ── Logged-in company ka naam — export / print / share message ke liye ──
// Pehle kai PDF, print aur WhatsApp message me "GB Buildcon" likha hua tha, to
// har company (RATNA KHANIJ, greenbox…) ke kagaz par doosri company ka naam
// chhapta tha (LIB-16). gb_user.company_name login par aata hai aur App.js use
// har 60s /auth/permissions se taaza rakhta hai (company rename bhi); company
// switch par naya login response wahi likhta hai. Naam na mile to product ka naam.
import { getUser } from "../config/api";
import { t } from "../i18n";

export function companyName() {
  try {
    const n = (getUser() || {}).company_name;
    if (n && String(n).trim()) return String(n).trim();
  } catch (_) {}
  return t("app.sanchalan");
}

// Print window ke HTML me seedha jodne ke liye (& < > " escape)
export function companyNameHtml() {
  return companyName().replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
}
