// ── TOAST — non-blocking notifications ─────────────────────────────
// Replaces alert() popups with slide-in notifications.
//
// Usage from React components:
//   import { useToast } from "../components/Toast";
//   const toast = useToast();
//   toast.success("Saved successfully");
//   toast.error("Connection failed");
//   toast.warning("Mark all workers first");
//   toast.info("3 items pending review");
//   toast("Plain message");                          // info by default
//   toast({ title: "Saved", desc: "Project updated", variant: "success", duration: 4000 });
//
// Usage from non-React code (utilities, fetch handlers):
//   window.toast.success("Hello");
//
// Features:
//   • 4 variants: success / error / warning / info (each color-coded)
//   • Stacks multiple toasts (newest on top)
//   • Auto-dismiss (default 3.5s, errors 5s, configurable)
//   • Click X to dismiss · Esc dismisses topmost
//   • Slide-in from top-right with subtle scale
//   • Portal-rendered to document.body — escapes any overflow:hidden

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n";

// Design tokens — kept inline for portability
const T = {
  surface: "#FFFFFF",
  text: "#111827",
  textMid: "#374151",
  textLight: "#6B7280",
  border: "#E5E7EB",
  // Variants
  success: { c: "#059669", bg: "#ECFDF5", brd: "#A7F3D0" },
  error:   { c: "#DC2626", bg: "#FEF2F2", brd: "#FECACA" },
  warning: { c: "#D97706", bg: "#FFFBEB", brd: "#FDE68A" },
  info:    { c: "#2563EB", bg: "#EFF6FF", brd: "#BFDBFE" },
};

const ToastContext = createContext(null);

let nextId = 1;

function VariantIcon({ variant }) {
  const v = T[variant] || T.info;
  if (variant === "success") {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={v.c} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={v.c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={v.c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  // info default
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={v.c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function ToastItem({ toast, onDismiss }) {
  const v = T[toast.variant] || T.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: T.surface,
        border: `1px solid ${v.brd}`,
        borderLeft: `3px solid ${v.c}`,
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        padding: "11px 12px",
        minWidth: 280,
        maxWidth: 420,
        animation: "gbToastIn .22s cubic-bezier(.2,.9,.3,1.1)",
        pointerEvents: "auto",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <VariantIcon variant={toast.variant} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {toast.title && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: toast.desc ? 2 : 0, lineHeight: 1.3 }}>
            {toast.title}
          </div>
        )}
        {toast.desc && (
          <div style={{ fontSize: 11.5, color: T.textMid, lineHeight: 1.4 }}>
            {toast.desc}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        title={t("common.dismiss")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: T.textLight,
          padding: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 4,
          marginTop: -1,
          borderRadius: 4,
          transition: "background .12s, color .12s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F3F4F6";
          e.currentTarget.style.color = T.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = T.textLight;
        }}
      >
        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((input) => {
    let title, desc, variant, duration;
    if (typeof input === "string") {
      title = input;
      variant = "info";
    } else if (input && typeof input === "object") {
      title = input.title;
      desc = input.desc || input.description;
      variant = input.variant || "info";
      duration = input.duration;
    } else {
      title = String(input);
      variant = "info";
    }
    const id = nextId++;
    const dur = duration || (variant === "error" ? 5000 : 3500);
    setToasts((p) => [{ id, title, desc, variant }, ...p]);
    if (dur > 0) setTimeout(() => dismiss(id), dur);
    return id;
  }, [dismiss]);

  // Bind shorthand helpers + global accessor
  const toast = useCallback((input) => addToast(input), [addToast]);
  toast.success = (titleOrObj, desc) =>
    addToast(typeof titleOrObj === "string" ? { title: titleOrObj, desc, variant: "success" } : { ...titleOrObj, variant: "success" });
  toast.error = (titleOrObj, desc) =>
    addToast(typeof titleOrObj === "string" ? { title: titleOrObj, desc, variant: "error" } : { ...titleOrObj, variant: "error" });
  toast.warning = (titleOrObj, desc) =>
    addToast(typeof titleOrObj === "string" ? { title: titleOrObj, desc, variant: "warning" } : { ...titleOrObj, variant: "warning" });
  toast.info = (titleOrObj, desc) =>
    addToast(typeof titleOrObj === "string" ? { title: titleOrObj, desc, variant: "info" } : { ...titleOrObj, variant: "info" });
  toast.dismiss = dismiss;

  // Expose globally so non-component code can use it (e.g. fetch error handlers)
  // ALSO override window.alert to route through toast — all existing alert() calls
  // upgrade to non-blocking toast notifications automatically.
  useEffect(() => {
    window.toast = toast;
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const text = String(msg ?? "");
      // Heuristic variant detection from message content
      const lower = text.toLowerCase();
      const variant = /failed|error|invalid|cannot|denied|wrong|missing/.test(lower) ? "error"
                    : /saved|success|complete|added|updated|sent|approved/.test(lower) ? "success"
                    : "warning";
      addToast({ title: text, variant, duration: variant === "error" ? 5000 : 3500 });
    };
    return () => {
      if (window.toast === toast) delete window.toast;
      window.alert = originalAlert;
    };
  }, [toast, addToast]);

  // Esc dismisses topmost
  useEffect(() => {
    if (toasts.length === 0) return;
    const onKey = (e) => { if (e.key === "Escape") dismiss(toasts[0].id); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <>
          <style>{`@keyframes gbToastIn{from{transform:translateX(120%) scale(0.95);opacity:0}to{transform:translateX(0) scale(1);opacity:1}}`}</style>
          <div
            style={{
              position: "fixed",
              top: 16,
              right: 16,
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              pointerEvents: "none",
              maxHeight: "calc(100vh - 32px)",
              overflow: "hidden",
            }}
          >
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>
        </>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback when provider isn't mounted (e.g. tests). Falls back to alert.
    const fn = (input) => {
      const msg = typeof input === "string" ? input : (input?.title || input?.desc || "Notification");
      // eslint-disable-next-line no-alert
      alert(msg);
    };
    fn.success = fn; fn.error = fn; fn.warning = fn; fn.info = fn; fn.dismiss = () => {};
    return fn;
  }
  return ctx;
}

export default ToastProvider;
