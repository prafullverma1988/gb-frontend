// ════════════════════════════════════════════════════════════════
// visiblePoll — jab tab saamne ho tabhi poll karo (PERF-08)
// ----------------------------------------------------------------
// Pehle App.js ka 60 s tick (/auth/permissions + tickets + Sahayak count) tab
// chhupa hone par bhi chalta rehta tha: raat bhar khula tab = 60 x 12 request
// bekaar. Ye helper wahi kaam karta hai par:
//   • tab chhupa (document.hidden) → timer band, ek bhi request nahi;
//   • wapas saamne aate hi (visibilitychange / focus) turant ek baar — agar
//     pichhla run minGap (10 s) se purana ho — phir wahi cadence;
//   • idleAfter di ho to: user itni der se kuch chhoo nahi raha (mouse/key/
//     touch/scroll nahi) to cadence idleMs par — jaise 60 s se 5 min. Kuch bhi
//     chhoote hi wapas normal + turant ek run agar der ho chuki ho. Yaani jo
//     aadmi kaam kar raha hai use wahi 60 s wali taazgi milti hai.
// Kuch bhi "silently hataya" nahi — sirf jab koi dekh hi nahi raha tab kam.
//
// fn ka error/reject nigal liya jaata hai (poll kabhi crash nahi karta).
// Lautata hai stop() — useEffect ke cleanup me do.
// Ye file gb-frontend aur sanchalan-app me (lagbhag) ek jaisi hai.
// ════════════════════════════════════════════════════════════════
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export function visiblePoll(fn, ms, opts = {}) {
  const { runNow = false, idleAfter = 0, idleMs = ms, minGap = 10000 } = opts;
  const hasDoc = typeof document !== "undefined";
  const hasWin = typeof window !== "undefined";
  let timer = null;
  let lastRun = 0;
  let lastActive = Date.now();
  let idleMode = false;
  let stopped = false;

  const visible = () => !hasDoc || document.visibilityState !== "hidden";
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const run = () => {
    lastRun = Date.now();
    try {
      const p = fn();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (_) { /* poll ki galti se app nahi girni chahiye */ }
  };
  const schedule = () => {
    clear();
    if (stopped || !visible()) return;
    idleMode = !!idleAfter && Date.now() - lastActive > idleAfter;
    timer = setTimeout(() => {
      timer = null;
      if (stopped || !visible()) return;
      run();
      schedule();
    }, idleMode ? idleMs : ms);
  };
  // Tab wapas saamne aaya / window focus mila.
  const wake = () => {
    if (stopped) return;
    if (!visible()) { clear(); return; }
    if (Date.now() - lastRun >= minGap) run();
    schedule();
  };
  const onActivity = () => {
    const now = Date.now();
    if (now - lastActive < 1000) return;   // mousemove har pixel par nahi
    lastActive = now;
    if (idleMode && !stopped && visible()) {
      idleMode = false;
      if (now - lastRun >= ms) run();
      schedule();
    }
  };

  if (hasDoc) document.addEventListener("visibilitychange", wake);
  if (hasWin) window.addEventListener("focus", wake);
  if (idleAfter && hasWin) ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

  if (runNow && visible()) run();
  schedule();

  return function stop() {
    stopped = true;
    clear();
    if (hasDoc) document.removeEventListener("visibilitychange", wake);
    if (hasWin) {
      window.removeEventListener("focus", wake);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    }
  };
}

export default visiblePoll;
