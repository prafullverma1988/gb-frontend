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
