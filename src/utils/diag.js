// ── DIAGNOSTIC COLLECTOR ──────────────────────────────────────────
// Small ring buffers of what just went wrong in the app, so that when a user
// reports "kuch kaam nahi kar raha" in Sahayak they can send real evidence
// instead of a screenshot of a blank screen.
//
// PRIVACY — the whole point of this file:
//   - Nothing is ever transmitted from here. It only fills in-memory buffers.
//     The ONLY sender is the Sahayak consent card, after the user taps
//     "Haan, bhej do". No background upload exists anywhere.
//   - Buffers live in memory only; a refresh wipes them. Nothing is persisted.
//   - API failures record method, path and status ONLY. Query strings are
//     stripped and request/response BODIES are never touched, because those
//     carry salaries, party names and amounts.
//
// ROBUSTNESS: this runs on every console.error and every failed request in a
// live ERP, so every function here is wrapped and must never throw, never
// block, and never keep more than a few KB alive.

const MAX_ERRORS = 25;
const MAX_CALLS = 15;
const MAX_SCREENS = 10;
const MAX_LINE = 300;    // one long stack trace must not blow the 20KB cap

const errors = [];   // { t, msg }
const calls = [];    // { t, method, path, status }
const screens = [];  // { t, name }

let initialised = false;

const now = () => {
  try { return new Date().toISOString(); } catch (_) { return ""; }
};

const push = (arr, item, max) => {
  try {
    arr.push(item);
    if (arr.length > max) arr.splice(0, arr.length - max);
  } catch (_) {}
};

const clip = (s) => String(s == null ? "" : s).slice(0, MAX_LINE);

// Drop the query string — it routinely carries ids, dates and search terms.
const cleanPath = (p) => {
  try {
    const s = String(p || "");
    const q = s.indexOf("?");
    return (q === -1 ? s : s.slice(0, q)).slice(0, 200);
  } catch (_) { return ""; }
};

export function recordError(msg) {
  push(errors, { t: now(), msg: clip(msg) }, MAX_ERRORS);
}

// Called from config/api.js on any non-ok response or network failure.
export function recordFailedCall(method, path, status) {
  push(calls, { t: now(), method: String(method || "GET").toUpperCase(), path: cleanPath(path), status: status || 0 }, MAX_CALLS);
}

// Called from App.js when the active module changes.
export function recordScreen(name) {
  try {
    if (!name) return;
    if (screens.length && screens[screens.length - 1].name === name) return; // de-dup repeats
    push(screens, { t: now(), name: String(name).slice(0, 60) }, MAX_SCREENS);
  } catch (_) {}
}

// Install the global hooks. Safe to call more than once.
export function initDiag() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  try {
    const orig = window.console && window.console.error;
    if (orig) {
      window.console.error = function (...args) {
        try { recordError(args.map((a) => (a && a.message) ? a.message : String(a)).join(" ")); } catch (_) {}
        try { orig.apply(window.console, args); } catch (_) {}
      };
    }
    window.addEventListener("error", (e) => {
      recordError((e && (e.message || (e.error && e.error.message))) || "window error");
    });
    window.addEventListener("unhandledrejection", (e) => {
      const r = e && e.reason;
      recordError("unhandled: " + ((r && r.message) || r || "?"));
    });
  } catch (_) {}
}

// The payload the consent card sends. Counts are returned alongside so the
// success chip can tell the user exactly what was shared.
export function getDiagBundle() {
  try {
    return {
      app_version: process.env.REACT_APP_VERSION || "web",
      user_agent: typeof navigator !== "undefined" ? String(navigator.userAgent || "").slice(0, 300) : "",
      online: typeof navigator !== "undefined" ? navigator.onLine !== false : true,
      captured_at: now(),
      errors: errors.slice(),
      failed_calls: calls.slice(),
      screens: screens.slice(),
    };
  } catch (_) {
    return { app_version: "web", errors: [], failed_calls: [], screens: [] };
  }
}
