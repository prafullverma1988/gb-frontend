// ════════════════════════════════════════════════════════════════
// DARJ KAB HUA — entry ka "save time" (server created_at), IST me.
//
// Business date (grn date / issue date / trip date) sirf din batati hai;
// entry asal me kab chadhi wo created_at batata hai. Phone ka timezone
// kuch bhi ho, hamesha Asia/Kolkata (UTC+5:30) dikhta hai — isliye Intl
// par nahi, seedha +330 min ka hisaab (jest / purane WebView me bhi wahi).
//
// created_at ka matlab: DB UTC me likhta hai (CONVERT_TZ '+00:00' wala
// rivaaj). JSON me Date "…Z" aata hai; "YYYY-MM-DD HH:MM:SS" bina zone
// ka ho to bhi UTC maana jaata hai. created_at na ho to kuch nahi dikhta
// (purana vyavhaar).
//
//   darjRowSuffix(created_at, bizDate)  → " · 3:45 PM"  /  " · darj 17 Oct 9:10 AM"  /  ""
//   darjDetailLine(created_at, byName)  → "Darj: 17 Oct 2026, 3:45 PM — Ramesh"  /  ""
// ════════════════════════════════════════════════════════════════
import { t as tDefault } from "../i18n";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const IST_MS = 330 * 60 * 1000;

// created_at → IST ke hisse {y, m(1-12), d, h, mi} ya null
export function istParts(v) {
  if (v == null || v === "") return null;
  let ms;
  if (v instanceof Date) ms = v.getTime();
  else if (typeof v === "number") ms = v;
  else {
    let s = String(v).trim();
    if (!s) return null;
    // "2026-10-17 15:45:00" / "2026-10-17T15:45:00" (zone nahi) → UTC
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s = s.replace(" ", "T") + "Z";
    // sirf din ("2026-10-17") me time hota hi nahi — save time nahi maana jayega
    else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    ms = new Date(s).getTime();
  }
  if (!Number.isFinite(ms)) return null;
  const x = new Date(ms + IST_MS);
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), h: x.getUTCHours(), mi: x.getUTCMinutes() };
}

const pad = (n) => String(n).padStart(2, "0");
const ymd = (p) => p.y + "-" + pad(p.m) + "-" + pad(p.d);

// "3:45 PM"
export function darjTime(v) {
  const p = istParts(v);
  if (!p) return "";
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return h12 + ":" + pad(p.mi) + " " + (p.h < 12 ? "AM" : "PM");
}
// "17 Oct" / withYear → "17 Oct 2026"
export function darjDay(v, withYear) {
  const p = istParts(v);
  if (!p) return "";
  return p.d + " " + MONTHS[p.m - 1] + (withYear ? " " + p.y : "");
}

// Business date ka IST din "YYYY-MM-DD": DATE string seedha, timestamp ho to IST din.
function bizDay(b) {
  if (b == null || b === "") return null;
  if (typeof b === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.trim())) return b.trim();
  const p = istParts(b);
  return p ? ymd(p) : null;
}

// Back-dated = business date aur created_at ka IST din alag.
export function darjIsBackdated(createdAt, bizDate) {
  const c = istParts(createdAt);
  const b = bizDay(bizDate);
  return !!(c && b && ymd(c) !== b);
}

export function darjRowSuffix(createdAt, bizDate, t = tDefault) {
  if (!istParts(createdAt)) return "";
  if (darjIsBackdated(createdAt, bizDate)) {
    return " · " + t("darj.tag") + " " + darjDay(createdAt) + " " + darjTime(createdAt);
  }
  return " · " + darjTime(createdAt);
}

// "17 Oct 2026, 3:45 PM" — detail line ke andar ka samay (label alag dikhane wali jagah ke liye)
export function darjWhen(createdAt) {
  return istParts(createdAt) ? darjDay(createdAt, true) + ", " + darjTime(createdAt) : "";
}

export function darjDetailLine(createdAt, byName, t = tDefault) {
  if (!istParts(createdAt)) return "";
  const when = darjWhen(createdAt);
  const name = byName == null ? "" : String(byName).trim();
  return name ? t("darj.detail_by", { when, name }) : t("darj.detail", { when });
}
