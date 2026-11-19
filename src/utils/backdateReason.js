// Back-Date Control — "wajah" ka box (19 Nov 2026).
//
// Server purani tareekh ki entry par code BACKDATE_REASON_REQUIRED deta hai
// (gb-backend utils/backDate.js). config/api.js wahi pakad kar ye box kholta
// hai aur wajah ke saath request dobara bhejta hai — isliye kisi module ke
// form ko badalna nahi pada. Saada DOM, React nahi: api.js kisi bhi screen
// se, kisi bhi modal ke upar se bula sakta hai.
import { t } from "../i18n";

export const REASON_MAX = 300;

let open = null;   // ek samay me ek hi box — saath ki doosri request usi ka jawab le

export function askBackdateReason(info) {
  if (typeof document === "undefined") return Promise.resolve(null);
  if (open) return open;
  open = new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit";
    const card = document.createElement("div");
    card.style.cssText = "background:#fff;border-radius:12px;width:100%;max-width:440px;padding:22px;box-shadow:0 20px 50px rgba(15,23,42,.25)";
    const h = document.createElement("div");
    h.textContent = t("backdate.ask_title");
    h.style.cssText = "font-size:16px;font-weight:700;color:#0F172A";
    const p = document.createElement("div");
    p.textContent = info && info.can_override ? t("backdate.ask_hint_override") : t("backdate.ask_hint");
    p.style.cssText = "font-size:13px;color:#64748B;margin:6px 0 14px;line-height:1.5";
    const ta = document.createElement("textarea");
    ta.maxLength = REASON_MAX;
    ta.rows = 3;
    ta.placeholder = t("backdate.ask_placeholder");
    ta.style.cssText = "width:100%;box-sizing:border-box;border:1.5px solid #CBD5E1;border-radius:8px;padding:10px 12px;font-size:14px;font-family:inherit;color:#0F172A;resize:vertical;outline:none";
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:flex-end;gap:10px;margin-top:16px";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = t("backdate.ask_cancel");
    cancel.style.cssText = "padding:9px 18px;border-radius:8px;border:1.5px solid #CBD5E1;background:#fff;color:#334155;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.textContent = t("backdate.ask_ok");
    okBtn.disabled = true;
    const paint = () => {
      const on = ta.value.trim().length > 0;
      okBtn.disabled = !on;
      okBtn.style.cssText = `padding:9px 18px;border-radius:8px;border:none;background:#1D4ED8;color:#fff;font-size:13px;font-weight:600;font-family:inherit;cursor:${on ? "pointer" : "not-allowed"};opacity:${on ? 1 : 0.5}`;
    };
    paint();

    const done = (val) => {
      document.removeEventListener("keydown", onKey, true);
      wrap.remove();
      open = null;
      resolve(val);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); done(null); } };
    ta.addEventListener("input", paint);
    cancel.addEventListener("click", () => done(null));
    okBtn.addEventListener("click", () => { const v = ta.value.replace(/\s+/g, " ").trim(); if (v) done(v); });
    document.addEventListener("keydown", onKey, true);

    row.append(cancel, okBtn);
    card.append(h, p, ta, row);
    wrap.append(card);
    document.body.append(wrap);
    ta.focus();
  });
  return open;
}

// Header me sirf ASCII ja sakta hai — Hindi wajah isiliye encode hoti hai.
export const reasonHeader = (reason) => ({ "X-Backdate-Reason": encodeURIComponent(String(reason).slice(0, REASON_MAX)) });
