// Browser ka Back = app ke andar EK kadam peeche.
//
// Poori web app ek hi browser-history entry par chalti thi — module badlo,
// project kholo, kuch bhi karo, history me kuch nahi judta tha. Isliye upar-
// left ka Back seedha app se bahar (pichhli website / khaali tab) le jaata tha.
//
// Tarika: har kadam (module badalna, project kholna) par ek history entry +
// hamare stack me uska "ulta kaam" (onBack). Browser Back → popstate → stack
// ka sabse upar wala kadam ulta. URL nahi badalte — sirf entry judti hai.
//
// Jo screen app ke APNE button se band hui (jaise project page ka "← Back"),
// uski history entry wahi padi reh jaati hai. Use "mara hua" maan lete hain:
// agla browser Back us par pahunch kar chup-chaap ek aur peeche chala jaata
// hai — taaki ek dabane par hamesha ek hi asli kadam ulte.
import { useEffect, useRef } from "react";
import { t } from "../i18n";

const stack = [];            // [{ onBack, dead }]
let wired = false;

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener("popstate", (e) => {
    const top = stack.pop();
    if (!top) {
      // Page refresh ke baad pichhli zindagi ki entries bachi reh jaati hain,
      // par unka koi kaam hamare paas nahi — unhe paar kar jao.
      if (e.state && e.state.sanchalanBack) window.history.back();
      return;
    }
    if (top.dead) { window.history.back(); return; }
    top.onBack();
  });
}

/** Ek kadam jodo. Lautata hai release() — screen bina Back ke band ho to bulao. */
export function pushBackStep(onBack) {
  if (typeof window === "undefined") return () => {};
  wire();
  const entry = { onBack, dead: false };
  stack.push(entry);
  window.history.pushState({ sanchalanBack: true }, "");
  return () => { entry.dead = true; };
}

/** Logout / company badalne par purane kadam bekaar — sab mare hue. */
export function resetBackSteps() {
  stack.forEach((e) => { e.dead = true; });
}

// ── Modal / drawer bhi Back se band ─────────────────────────────────────
// Khula modal = ek kadam; Back use band karta hai (sabse upar wala pehle —
// drawer ke andar se khula modal pehle band, phir drawer).
//
// Par FORM par savdhaani: pehle bahar-click se form band hone par bhara data
// chala jaata tha, isliye wo band kiya gaya tha. Back par wahi khatra hai. To:
//   • modal me kuch type/badla NAHI gaya → Back seedha band kare
//   • kuch bhara hai → pehle poochhe; "nahi" kaho to form khula hi rahe
async function askDiscard() {
  const msg = t("common.back_discard_form");
  try {
    if (typeof window.confirmAsync === "function") return await window.confirmAsync(msg);
  } catch (_) {}
  return window.confirm(msg);
}

export function useBackClose(onClose, open = true) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    let dirty = false;
    const mark = () => { dirty = true; };
    // Modal khula ho to peeche ki screen tak haath nahi pahunchta — is dauran
    // koi bhi input/change event isi modal (ya uske andar khule) ka hai.
    document.addEventListener("input", mark, true);
    document.addEventListener("change", mark, true);
    let release = null;
    const arm = () => {
      release = pushBackStep(async () => {
        if (!dirty) { if (cb.current) cb.current(); return; }
        // Poochhne se PEHLE kadam wapas lagao — dialog khula ho aur Back phir
        // dabe to wo isi form par ruke, peeche ki screen par na chala jaye.
        arm();
        if (await askDiscard()) {
          if (release) release();
          if (cb.current) cb.current();
        }
      });
    };
    arm();
    return () => {
      document.removeEventListener("input", mark, true);
      document.removeEventListener("change", mark, true);
      if (release) release();
    };
  }, [open]);
}

/** JSX me rakho: <BackClose onClose={onClose}/> — kuch dikhata nahi. Jin shells
 *  ka body `=> (` hai unme hook seedha nahi daal sakte, ye wahan ka raasta hai. */
export function BackClose({ onClose, open = true }) {
  useBackClose(onClose, open);
  return null;
}
