// ════════════════════════════════════════════════════════════════
// PickField — web ka ek hi dropdown (6 Oct 2026, Prafull: "app wala picker
// search select se behtar hai — web par bhi sab jagah yahi").
//
// Field ek button hai jo chuna hua naam poora dikhata hai. Dabao → neeche
// (jagah na ho to upar) chhota panel: upar khoj (6 se zyada option hon
// tab), list me chuna hua rangeen + ✓, group ki heading, naam ke neeche
// chhota grey `sub`. App ke PickField jaisa hi, bas sheet ki jagah popover.
//
// Keyboard: field par koi akshar dabao → panel khulta hai aur wahi akshar
// khoj me; ↑ ↓ chalao, Enter chuno, Esc band, Tab = band + agla field.
//
// Ise seedha kam use karte hain — SearchSelect (options + onChange(key)) aur
// PickSelect (<select> ki jagah) dono isi par chalte hain.
//
// options: [{ key, label, sub?, group?, search? }] — key hamesha string.
// ════════════════════════════════════════════════════════════════
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n";

export const PICK_C = {
  surface: "#FFFFFF",
  surfaceB: "#F8F9FB",
  t1: "#111827",
  t3: "#6B7280",
  t4: "#9CA3AF",
  b1: "#E5E7EB",
  b2: "#D1D5DB",
  blu: "#2563EB",
  bluL: "#EFF6FF",
};

const PANEL_H = 300;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Panel body ke aakhir me hai, isliye browser ka Tab wahan se agla dhoondhta
// (pehle field par laut jaata) — field ke hisaab se agla / pichhla khud chuno.
const focusBeside = (el, back) => {
  const all = [...document.querySelectorAll(FOCUSABLE)].filter((n) => n === el || (n.offsetParent !== null && n.tabIndex >= 0));
  const i = all.indexOf(el);
  const next = i >= 0 ? all[i + (back ? -1 : 1)] : null;
  if (next) next.focus();
  else el.focus();
};

export default function PickField({
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  triggerStyle,
  wrapStyle,
  accent,
  theme,
  openOnFocus = false,
  onAfterSelect,
  triggerRef,
  buttonProps,
}) {
  const T = theme || PICK_C;
  const ac = accent || T.blu;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const quiet = useRef(false); // hamara apna focus() — focus par na khule
  const mouse = useRef(false);

  const list = options || [];
  const cur = list.find((o) => o.key === String(value ?? "")) || null;
  const many = list.length > 6;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length
    ? list.filter((o) => {
        const hay = `${o.label} ${o.sub || ""} ${o.search || ""} ${o.group || ""}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : list;

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(Math.max(r.width, 220), vw - 16);
    const left = Math.max(8, Math.min(r.left, vw - width - 8));
    const below = vh - r.bottom - 8;
    const extra = many ? 52 : 0; // khoj ka dabba
    const up = below < 220 + extra && r.top > below;
    const maxH = Math.max(120, Math.min(PANEL_H, (up ? r.top : below) - 8 - extra));
    // Panel body par hai — font field se lo (warna browser ka serif)
    const font = window.getComputedStyle(el).fontFamily;
    setPos(up ? { bottom: vh - r.top + 4, left, width, maxH, font } : { top: r.bottom + 4, left, width, maxH, font });
  };

  const openPanel = (seed) => {
    if (disabled) return;
    place();
    setQ(seed || "");
    setHi(-1);
    setOpen(true);
  };

  const close = (refocus) => {
    setOpen(false);
    setQ("");
    setHi(-1);
    if (refocus && btnRef.current) {
      quiet.current = true;
      btnRef.current.focus();
      setTimeout(() => { quiet.current = false; }, 0);
    }
  };

  const choose = (o) => {
    close(true);
    if (onChange) onChange(o.key);
    if (onAfterSelect) setTimeout(() => onAfterSelect(), 30);
  };

  // Bahar dabao = band
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Scroll / resize par panel field ke saath chale
  useEffect(() => {
    if (!open) return undefined;
    const onMove = (e) => {
      if (panelRef.current && e && e.target && panelRef.current.contains(e.target)) return;
      place();
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Khulte hi khoj par focus (akshar se khula ho to cursor aakhir me)
  useEffect(() => {
    if (open && many && searchRef.current) {
      const el = searchRef.current;
      el.focus();
      const n = el.value.length;
      try { el.setSelectionRange(n, n); } catch (e) { /* koi baat nahi */ }
    }
  }, [open, many]);

  // Khulne par chuna hua dikhe; ↑↓ par highlighted dikhe
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const sel = hi >= 0 ? `[data-opt="${hi}"]` : "[data-cur]";
    const el = panelRef.current.querySelector(sel);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [open, hi]);

  const onKey = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPanel("");
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openPanel(many ? e.key : "");
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") {
      e.preventDefault();
      close(false);
      if (btnRef.current) focusBeside(btnRef.current, e.shiftKey);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((p) => (p < shown.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((p) => (p > 0 ? p - 1 : shown.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const o = shown[hi >= 0 ? hi : 0];
      if (o) choose(o);
    }
  };

  const setBtn = (el) => {
    btnRef.current = el;
    if (triggerRef) {
      if (typeof triggerRef === "function") triggerRef(el);
      else triggerRef.current = el;
    }
  };

  const bp = buttonProps || {};
  const label = cur ? cur.label : (value != null && value !== "" ? String(value) : "");
  const dim = !label || (cur && cur.key === ""); // "— chuno —" jaisa khaali option grey

  return (
    <div style={{ position: "relative", minWidth: 0, ...(wrapStyle || {}) }}>
      <button
        type="button"
        {...bp}
        ref={setBtn}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseDown={(e) => { mouse.current = true; if (bp.onMouseDown) bp.onMouseDown(e); }}
        onClick={(e) => { mouse.current = false; if (open) close(false); else openPanel(""); if (bp.onClick) bp.onClick(e); }}
        onFocus={(e) => {
          if (openOnFocus && !open && !quiet.current && !mouse.current) openPanel("");
          if (bp.onFocus) bp.onFocus(e);
        }}
        onKeyDown={onKey}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          textAlign: "left",
          fontFamily: "inherit",
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          color: T.t1,
          background: T.surface,
          ...(triggerStyle || {}),
          ...(open ? { borderColor: ac, boxShadow: `0 0 0 3px ${ac}26`, outline: "none" } : null),
          ...(disabled ? { opacity: 0.6 } : null),
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: dim ? T.t4 : undefined, fontWeight: dim ? 400 : undefined }}>
          {label || placeholder || t("search_select.chuno")}
        </span>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ flexShrink: 0, opacity: open ? 1 : 0.5, color: open ? ac : undefined, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          onKeyDown={onKey}
          style={{
            position: "fixed",
            top: pos.top,
            bottom: pos.bottom,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxH + (many ? 52 : 0),
            display: "flex",
            flexDirection: "column",
            background: T.surface,
            borderRadius: 10,
            border: `1px solid ${T.b1}`,
            boxShadow: "0 12px 32px rgba(15,23,42,.18)",
            zIndex: 99999,
            overflow: "hidden",
            fontFamily: pos.font || "inherit",
            animation: "pfIn .12s ease",
          }}
        >
          {many && (
            <div style={{ padding: 8, borderBottom: `1px solid ${T.b1}` }}>
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setHi(-1); }}
                placeholder={t("common.search")}
                autoComplete="off"
                style={{ width: "100%", height: 34, padding: "0 11px", borderRadius: 8, border: `1.5px solid ${T.b2}`,
                  fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box" }}
              />
            </div>
          )}
          <div style={{ overflowY: "auto", padding: 4 }}>
            {shown.length === 0 && (
              <div style={{ padding: "14px 10px", fontSize: 12, color: T.t4, textAlign: "center" }}>
                {list.length === 0 ? t("search_select.no_options_yet") : t("search_select.no_match_found")}
              </div>
            )}
            {shown.map((o, i) => {
              const on = cur && cur.key === o.key;
              const isHi = i === hi || (hi < 0 && words.length > 0 && i === 0); // Enter yahi chunega
              const head = o.group && (i === 0 || shown[i - 1].group !== o.group);
              return (
                <Fragment key={o.key + ":" + i}>
                  {head && (
                    <div style={{ padding: "8px 10px 4px", fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase", letterSpacing: ".5px" }}>
                      {o.group}
                    </div>
                  )}
                  <div
                    data-opt={i}
                    data-cur={on ? "1" : undefined}
                    role="option"
                    aria-selected={!!on}
                    onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                    onMouseEnter={() => setHi(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 7,
                      cursor: "pointer",
                      background: on ? ac + "14" : isHi ? T.surfaceB : "transparent",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: on ? 700 : 500, color: on ? ac : T.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.label}
                      </span>
                      {o.sub && (
                        <span style={{ display: "block", fontSize: 11, color: T.t4, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {o.sub}
                        </span>
                      )}
                    </span>
                    {on && (
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={ac} strokeWidth={2.6}
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
          <style>{"@keyframes pfIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}"}</style>
        </div>,
        document.body
      )}
    </div>
  );
}
