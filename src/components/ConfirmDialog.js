// ── CONFIRM DIALOG — promise-based confirmation modal ──────────────
// Replaces blocking window.confirm() with a polished async modal.
//
// Usage from React components:
//   import { useConfirm } from "../components/ConfirmDialog";
//   const confirm = useConfirm();
//   if (!await confirm("Delete this task?")) return;
//   if (!await confirm({ title: "Delete?", desc: "Cannot be undone", variant: "danger", confirmLabel: "Delete" })) return;
//
// Usage from non-React code:
//   if (!await window.confirmAsync("Delete this task?")) return;
//
// Replaces native confirm in old code by changing:
//   if (!window.confirm("...")) return;
// to:
//   if (!await window.confirmAsync("...")) return;
//
// Features:
//   • Promise-based — works with await
//   • Variants: danger (red Confirm) / primary (blue) — auto-detect from message
//   • Esc cancels · Enter confirms · backdrop click cancels
//   • Confirm button auto-focused (so Enter works immediately)
//   • Slide-up + fade-in animation
//   • Multiline message support (preserves \n)
//   • Falls back to native confirm if provider not mounted (defensive)

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const T = {
  surface: "#FFFFFF",
  surfaceB: "#F8F9FB",
  text: "#111827",
  textMid: "#374151",
  textLight: "#6B7280",
  border: "#E5E7EB",
  borderM: "#D1D5DB",
  blu: "#2563EB",
  bluHover: "#1D4ED8",
  red: "#DC2626",
  redHover: "#B91C1C",
  amb: "#D97706",
};

const ConfirmContext = createContext(null);

function detectVariant(text) {
  const t = String(text || "").toLowerCase();
  if (/delete|remove|cancel|reset|wipe|destroy|factory/.test(t)) return "danger";
  return "primary";
}

function detectConfirmLabel(text, variant) {
  const t = String(text || "").toLowerCase();
  if (/delete/.test(t)) return "Delete";
  if (/remove/.test(t)) return "Remove";
  if (/cancel.*payment|cancel.*po|cancel.*subscription/.test(t)) return "Yes, Cancel";
  if (/reset|factory/.test(t)) return "Reset";
  if (/wipe|destroy/.test(t)) return "Continue";
  return variant === "danger" ? "Confirm" : "OK";
}

export function ConfirmProvider({ children }) {
  const [pending, setPending] = useState(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);

  // Resolve helper
  const resolve = useCallback((value) => {
    if (pending?.resolve) pending.resolve(value);
    setPending(null);
  }, [pending]);

  // Build confirm function
  const confirm = useCallback((input) => {
    return new Promise((res) => {
      let opts;
      if (typeof input === "string") {
        opts = { message: input };
      } else if (input && typeof input === "object") {
        opts = { ...input };
      } else {
        opts = { message: String(input) };
      }
      const message = opts.message || opts.title || opts.desc || "Are you sure?";
      // Split first line as title, rest as desc — supports old confirm() multiline messages
      let title = opts.title;
      let desc = opts.desc;
      if (!title && !desc) {
        const lines = String(message).split(/\n+/).filter(s => s.trim());
        title = lines[0];
        desc = lines.slice(1).join("\n").trim();
      }
      const variant = opts.variant || detectVariant(title || message);
      const confirmLabel = opts.confirmLabel || detectConfirmLabel(title || message, variant);
      const cancelLabel = opts.cancelLabel || "Cancel";
      setPending({ title, desc, variant, confirmLabel, cancelLabel, resolve: res });
    });
  }, []);

  // Expose globally
  useEffect(() => {
    window.confirmAsync = confirm;
    return () => { if (window.confirmAsync === confirm) delete window.confirmAsync; };
  }, [confirm]);

  // Auto-focus Confirm button when dialog opens
  useEffect(() => {
    if (pending) setTimeout(() => confirmBtnRef.current?.focus(), 30);
  }, [pending]);

  // Keyboard: Esc cancels, Enter confirms (if focus is on confirm or backdrop)
  useEffect(() => {
    if (!pending) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); resolve(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, resolve]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && createPortal(
        <>
          <style>{`
            @keyframes gbConfirmFade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes gbConfirmSlide { from { transform: translate(-50%, -45%) scale(0.96); opacity: 0 } to { transform: translate(-50%, -50%) scale(1); opacity: 1 } }
          `}</style>
          {/* Backdrop */}
          <div
            onClick={() => resolve(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(2px)",
              zIndex: 99998,
              animation: "gbConfirmFade .15s ease-out",
            }}
          />
          {/* Dialog */}
          <div
            role="alertdialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              background: T.surface,
              borderRadius: 12,
              boxShadow: "0 24px 64px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.1)",
              zIndex: 99999,
              minWidth: 340,
              maxWidth: 480,
              width: "calc(100% - 32px)",
              animation: "gbConfirmSlide .18s cubic-bezier(.2,.9,.3,1.05)",
              fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
              overflow: "hidden",
            }}
          >
            {/* Body */}
            <div style={{ padding: "20px 22px 18px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Variant icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: pending.variant === "danger" ? "#FEF2F2" : "#EFF6FF",
                  border: `1px solid ${pending.variant === "danger" ? "#FECACA" : "#BFDBFE"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {pending.variant === "danger" ? (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  ) : (
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={T.blu} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {pending.title && (
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.35, marginBottom: pending.desc ? 6 : 0 }}>
                      {pending.title}
                    </div>
                  )}
                  {pending.desc && (
                    <div style={{ fontSize: 12.5, color: T.textMid, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {pending.desc}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div style={{
              padding: "12px 18px",
              background: T.surfaceB,
              borderTop: `1px solid ${T.border}`,
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}>
              <button
                ref={cancelBtnRef}
                onClick={() => resolve(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 7,
                  background: T.surface,
                  border: `1px solid ${T.borderM}`,
                  color: T.textMid,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all .12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceB; e.currentTarget.style.color = T.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.textMid; }}
              >
                {pending.cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => resolve(true)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resolve(true); } }}
                style={{
                  padding: "8px 18px",
                  borderRadius: 7,
                  background: pending.variant === "danger" ? T.red : T.blu,
                  border: "none",
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: pending.variant === "danger" ? `0 2px 8px ${T.red}40` : `0 2px 8px ${T.blu}40`,
                  transition: "background .12s",
                  outline: "none",
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = pending.variant === "danger" ? `0 0 0 3px ${T.red}26, 0 2px 8px ${T.red}40` : `0 0 0 3px ${T.blu}26, 0 2px 8px ${T.blu}40`; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = pending.variant === "danger" ? `0 2px 8px ${T.red}40` : `0 2px 8px ${T.blu}40`; }}
                onMouseEnter={(e) => { e.currentTarget.style.background = pending.variant === "danger" ? T.redHover : T.bluHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = pending.variant === "danger" ? T.red : T.blu; }}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback: native confirm
    return async (input) => {
      const msg = typeof input === "string" ? input : (input?.message || input?.title || "Are you sure?");
      // eslint-disable-next-line no-alert
      return window.confirm(msg);
    };
  }
  return ctx;
}

export default ConfirmProvider;
