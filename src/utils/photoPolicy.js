// ── Company ki photo policy — web ka ek hi source ───────────────────
// Backend: utils/photoPolicy.js + GET /settings/photo
// Settings screen: Settings → Photo Settings
//
// Har jagah ki ek key hoti hai (grn, attendance, material_issue, …) aur
// uske teen jawab:
//   mode   "off" | "optional" | "required"
//   source "camera" (sirf live camera) | "both" (gallery bhi)
//   geo    true = photo ke saath GPS bhejo
//
// Ek hi baar fetch hoti hai aur module-level par cache rehti hai. Ek
// screen par kai jagah photo ho sakti hai (Material tab me GRN, issue
// aur transfer teeno), har ek ka apna /settings/company call lagana
// bekaar tha — pehle wahi ho raha tha.

import api from "../config/api";

const FALLBACK = { mode: "optional", source: "both", geo: true };

let cache = null;      // { settings, locations }
let inFlight = null;

export function loadPhotoPolicy() {
  if (cache) return Promise.resolve(cache);
  if (inFlight) return inFlight;
  inFlight = api.get("/settings/photo")
    .then(r => {
      cache = (r && r.success && r.data) ? r.data : { settings: {}, locations: [] };
      return cache;
    })
    .catch(() => ({ settings: {}, locations: [] }))
    .finally(() => { inFlight = null; });
  return inFlight;
}

// Settings save hone ke baad taaza karne ke liye.
export function clearPhotoPolicyCache() { cache = null; }

export function policyFor(data, key) {
  const s = data && data.settings && data.settings[key];
  return s ? { ...FALLBACK, ...s } : { ...FALLBACK };
}

// <input type="file"> par seedha lagane ke liye. source "camera" hone par
// `capture` lagta hai — mobile browser tab sirf camera kholta hai. Desktop
// par `capture` ka koi asar nahi hota, isliye wahan gallery band karne ka
// koi bharosemand tareeka nahi; policy ka asli daant server-side check aur
// mobile app par hai.
export function fileInputProps(pol, { multiple = false } = {}) {
  const p = { type: "file", accept: "image/*" };
  if (multiple) p.multiple = true;
  if (pol && pol.source === "camera") p.capture = "environment";
  return p;
}
