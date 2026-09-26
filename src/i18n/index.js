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
// PERF-04 — entry chunk (main.js) me poora pack NAHI jaata. Pehle default
// (Hinglish) pack ~600 KB static tha: login dikhne se pehle har user ko, aur
// Hindi/English wale ko uske upar apna pack bhi (2 MB raw). Ab:
//   • core/*.js — sirf wo ~250 key jo entry-chunk ka code (shell, dashboard,
//     login) maangta hai. hi-Latn ka core static hai, hi/en ka core dynamic.
//     GENERATED hai: node scripts/i18n/core.js --write (gb-backend), gate check karta hai.
//   • poora pack (hi-Latn.js / hi.js / en.js) alag chunk hai. loadFullPack()
//     usse laata hai — index.js first render ke baad idle me bulata hai, aur
//     App.js har lazy module ko import karne se PEHLE isi ka intezaar karta hai
//     (module-level t() bhi poori pack dekhe). Isliye lazy module me kabhi
//     key ka naam nahi dikhta.
// Ye file gb-frontend ke liye hai — sanchalan-app ki i18n/index.js ye badlav
// nahi lehti (app ka entry chunk local/OTA hai, network ka sawaal nahi).
//
// Missing key kabhi crash nahi karti: hi-Latn par girti hai, phir key khud
// dikh jaati hai. Adhoora translation blank screen se behtar hai.
// ════════════════════════════════════════════════════════════════
import { useSyncExternalStore, createElement, Fragment } from "react";
import hiLatnCore from "./core/hi-Latn";

export const LANGS = [
  { code: "hi-Latn", label: "Hinglish" },
  { code: "hi",      label: "हिंदी"    },
  { code: "en",      label: "English"  },
];
export const DEFAULT_LANG = "hi-Latn";
const STORE_KEY = "gb_lang";

// t() yahin dekhta hai: pehle core, poora pack aate hi uski jagah poora.
const PACKS = { "hi-Latn": hiLatnCore };
const CORE_LOADERS = {
  "hi": () => import("./core/hi"),
  "en": () => import("./core/en"),
};
const FULL_LOADERS = {
  "hi-Latn": () => import("./hi-Latn"),
  "hi": () => import("./hi"),
  "en": () => import("./en"),
};
const FULL = {};     // code → true jab poora pack PACKS me aa gaya
const FULL_P = {};   // code → Promise (ek bhi pack do baar nahi khinchta)

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

  const fallback = PACKS[DEFAULT_LANG] && PACKS[DEFAULT_LANG][key];
  if (fallback != null) return interpolate(fallback, params);

  // Hindi/English user ki key uske pack me na mile (teeno pack ka parity gate
  // rokta hai, phir bhi) → Hinglish poora pack peeche se bula lo; aane par
  // components dobara ban jaate hain. Tab tak key hi dikhegi.
  if (current !== DEFAULT_LANG && FULL[current] && !FULL_P[DEFAULT_LANG]) loadFull(DEFAULT_LANG).catch(() => {});

  if (process.env.NODE_ENV !== "production" && FULL[current]) {
    console.warn(`[i18n] missing key: ${key} (lang=${current})`);
  }
  return key;
}

// Sirf core (hi/en ke liye) — initI18n render se pehle isi ka intezaar karta hai.
async function loadCore(code) {
  if (PACKS[code]) return;
  const loader = CORE_LOADERS[code];
  if (!loader) return;
  try {
    const mod = await loader();
    if (!PACKS[code]) PACKS[code] = mod.default || mod;
  } catch (err) {
    // Pack load fail (offline, stale chunk) → chupchaap default par raho.
    // User ko Hinglish dikhega, jo blank screen se behtar hai.
    console.warn("[i18n] pack load failed:", code, err && err.message);
  }
}

// Poora pack (ek baar). Fail ho to REJECT — lazy module ka load bhi fail ho
// (retry ho sake), warna module adhoore pack ke saath key ke naam dikhata.
function loadFull(code) {
  if (FULL_P[code]) return FULL_P[code];
  const loader = FULL_LOADERS[code];
  if (!loader) return Promise.resolve();
  FULL_P[code] = loader().then((mod) => {
    PACKS[code] = mod.default || mod;
    FULL[code] = true;
    if (code === current) listeners.forEach((fn) => fn());
  }).catch((err) => {
    delete FULL_P[code];
    console.warn("[i18n] full pack load failed:", code, err && err.message);
    throw err;
  });
  return FULL_P[code];
}

// Abhi ki bhasha ka poora pack. index.js first render ke baad bulata hai;
// App.js lazy module import karne se pehle await karta hai.
export function loadFullPack() { return loadFull(current); }
export function isFullPackLoaded() { return !!FULL[current]; }

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
  // reload par naya page apna core khud laayega; bina reload ke poora pack chahiye.
  if (reload) await loadCore(next); else await loadFull(next).catch(() => {});
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
  if (want !== DEFAULT_LANG) await loadCore(want);
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
