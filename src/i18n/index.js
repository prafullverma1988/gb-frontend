// ════════════════════════════════════════════════════════════════
// src/i18n — app ka translation layer.
//
// Teen packs: hi-Latn (Hinglish, DEFAULT) · hi (हिंदी) · en (English).
// Likhne ke niyam gb-backend/docs/i18n-style-guide.md me hain.
//
// Yeh jaan-boojh kar ek chhota apna store hai, react-i18next nahi:
//
//   1. t() ko React ke BAHAR bhi chalna hai. config/api.js me network aur
//      session ke messages hain aur wo component nahi hai — Context wahan
//      pahunch hi nahi sakta. Isliye module-level store + subscribe.
//   2. Bundle. Mobile app OTA se update hota hai; ek 40KB library sirf
//      isliye kheenchna ki t() mil jaye, mehnga sauda hai.
//
// Sirf DEFAULT pack bundle me jaata hai. hi/en dynamic import() se aate
// hain — jo user Hinglish par hai (matlab zyadatar) wo unka code kabhi
// download hi nahi karta.
//
// Missing key kabhi crash nahi karti: hi-Latn par girti hai, phir key khud
// dikh jaati hai. Adhoora translation blank screen se behtar hai.
// ════════════════════════════════════════════════════════════════
import { useSyncExternalStore, createElement, Fragment } from "react";
import hiLatn from "./hi-Latn";

export const LANGS = [
  { code: "hi-Latn", label: "Hinglish" },
  { code: "hi",      label: "हिंदी"    },
  { code: "en",      label: "English"  },
];
export const DEFAULT_LANG = "hi-Latn";
const STORE_KEY = "gb_lang";

// Default pack static hai — baaki do lazy.
const PACKS = { "hi-Latn": hiLatn };
const LOADERS = {
  "hi": () => import("./hi"),
  "en": () => import("./en"),
};

let current = DEFAULT_LANG;
const listeners = new Set();

function normalizeLang(raw) {
  const s = String(raw || "").trim();
  if (!s) return DEFAULT_LANG;
  const hit = LANGS.find((l) => l.code.toLowerCase() === s.toLowerCase());
  if (hit) return hit.code;
  const base = s.split(/[-_]/)[0].toLowerCase();
  if (base === "en") return "en";
  if (base === "hi") return "hi";        // "hi-IN" → Devanagari
  return DEFAULT_LANG;
}

// "{item} ki request {user} ne approve kar di" + {item, user}
// Jo placeholder params me nahi mila wo waisa hi chhod diya jaata hai —
// galti aankh me chubhni chahiye, chupchaap "undefined" nahi chhapna chahiye.
function interpolate(str, params) {
  if (!params || typeof str !== "string") return str;
  return str.replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole);
}

// <html lang> set karta hai.
//
// Do kaam karta hai: (1) CSS bhasha ke hisaab se font aur line-height chun
// sakti hai — Devanagari ki matras upar-neeche jaati hain, isliye use zyada
// vertical jagah chahiye; (2) browser/screen-reader ko sahi bhasha pata
// chalti hai.
function applyHtmlLang(code) {
  if (typeof document === "undefined") return;
  // hi-Latn Hindi HAI, par Latin script me — isliye "hi-Latn" hi sahi tag hai.
  document.documentElement.lang = code;
}

// ── Public API ──────────────────────────────────────────────────

export function getLang() { return current; }

// React ke bahar bhi chalta hai — api.js, utils, event handlers, kahin bhi.
export function t(key, params) {
  const hit = PACKS[current] && PACKS[current][key];
  if (hit != null) return interpolate(hit, params);

  const fallback = hiLatn[key];
  if (fallback != null) return interpolate(fallback, params);

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[i18n] missing key: ${key} (lang=${current})`);
  }
  return key;
}

async function loadPack(code) {
  if (PACKS[code]) return;
  const loader = LOADERS[code];
  if (!loader) return;
  try {
    const mod = await loader();
    PACKS[code] = mod.default || mod;
  } catch (err) {
    // Pack load fail (offline, stale chunk) → chupchaap default par raho.
    // User ko Hinglish dikhega, jo blank screen se behtar hai.
    console.warn("[i18n] pack load failed:", code, err && err.message);
  }
}

// Language badlo.
//
// Default `reload: true` jaan-boojh kar hai. App me module-level constants
// (App.js ka NAV_GROUPS, kai TABS arrays), useMemo ke andar bane labels,
// aur apiCache me pade purane responses — ye sab ek baar ban kar baith
// jaate hain. Sirf listeners notify karne se in me se kuch bhi nahi
// badlega, aur user ko aadhi UI nayi bhasha me aur aadhi purani me
// dikhegi — jo bilkul toota hua lagta hai.
//
// Reload ek baar ka, jaan-boojh kar liya gaya action hai. Poori consistency
// ki guarantee iske alawa kisi tareeke se nahi milti.
export async function setLang(code, { reload = true } = {}) {
  const next = normalizeLang(code);
  if (next === current) return next;
  await loadPack(next);
  if (!PACKS[next]) return current;      // load fail — jahan the wahin raho
  current = next;
  applyHtmlLang(next);
  try { localStorage.setItem(STORE_KEY, next); } catch (_) {}
  listeners.forEach((fn) => fn());
  if (reload && typeof window !== "undefined") window.location.reload();
  return current;
}

// index.js me render se PEHLE await karo. Warna Hindi/English wala user
// pehle Hinglish dekhega aur ek frame baad UI badal jayega.
export async function initI18n(preferred) {
  let saved = null;
  try { saved = localStorage.getItem(STORE_KEY); } catch (_) {}
  const want = normalizeLang(preferred || saved);
  if (want !== DEFAULT_LANG) await loadPack(want);
  current = PACKS[want] ? want : DEFAULT_LANG;
  applyHtmlLang(current);
  return current;
}

// ── Bold ke saath ek hi vaakya ──────────────────────────────────
// Kabhi-kabhi ek paragraph ke beech me kuch shabd bold hote hain:
//     ...tracks your location — <strong>including in the background</strong> — so...
// Aisa markup vaakya ko tukdo me tod deta hai, aur har tukda alag translate
// karne par Hindi ka word order toot jaata hai (Hindi me bold hissa vaakya
// me kahin aur baithta hai).
//
// Isliye poora vaakya EK key me rehta hai aur bold `**...**` se markaayi
// jaati hai. Translator bold ko apni bhasha ke hisaab se jahan chahe rakh
// sakta hai:
//     <Rich k="attendance.loc_disclosure" />
//
// JSX jaan-boojh kar nahi — ye file dono repos me copy hoti hai aur baaki
// poori plain JS hai.
export function Rich({ k, params }) {
  const parts = t(k, params).split(/\*\*(.+?)\*\*/g);
  return createElement(Fragment, null,
    ...parts.map((p, i) => (i % 2 ? createElement("strong", { key: i }, p) : p)));
}

// ── React binding ───────────────────────────────────────────────
// const t = useT();  → component language change par re-render ho jaata hai.
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function useLang() {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

export function useT() {
  useSyncExternalStore(subscribe, getLang, getLang);
  return t;
}
