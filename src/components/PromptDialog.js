// ── PROMPT DIALOG — promise-based text-input modal ─────────────────
// Replaces blocking window.prompt() with a polished async modal that
// matches the app design (ConfirmDialog's sibling).
//
// Usage from non-React code (drop-in for window.prompt):
//   const val = await window.promptAsync("Reason?", "");
//   if (val === null) return;          // user cancelled
//
// Usage from React:
//   import { usePrompt } from "../components/PromptDialog";
//   const prompt = usePrompt();
//   const val = await prompt({ message: "Reason?", defaultValue: "", multiline: true });
//
// Returns the entered string on OK, or null on Cancel / Esc / backdrop.

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

const T = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB",
  text: "#111827", textMid: "#374151", textLight: "#6B7280",
  border: "#E5E7EB", borderM: "#D1D5DB",
  blu: "#2563EB", bluHover: "#1D4ED8",
};

const PromptContext = createContext(null);

export function PromptProvider({ children }) {
  const [pending, setPending] = useState(null);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const resolve = useCallback((result) => {
    if (pending?.resolve) pending.resolve(result);
    setPending(null);
    setValue("");
  }, [pending]);

  const prompt = useCallback((input, maybeDefault) => {
    return new Promise((res) => {
      let opts;
      if (typeof input === "string") opts = { message: input, defaultValue: maybeDefault || "" };
      else if (input && typeof input === "object") opts = { ...input };
      else opts = { message: String(input) };
      const o = {
        message: opts.message || opts.title || "Enter value",
        defaultValue: opts.defaultValue != null ? String(opts.defaultValue) : "",
        placeholder: opts.placeholder || "",
        multiline: !!opts.multiline,
        okLabel: opts.okLabel || "OK",
        cancelLabel: opts.cancelLabel || "Cancel",
        resolve: res,
      };
      setValue(o.defaultValue);
      setPending(o);
    });
  }, []);

  // Expose globally so non-React code can call window.promptAsync(...)
  useEffect(() => {
    window.promptAsync = prompt;
    return () => { if (window.promptAsync === prompt) delete window.promptAsync; };
  }, [prompt]);

  // Auto-focus the input when the dialog opens
  useEffect(() => {
    if (pending) setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select?.(); }, 30);
  }, [pending]);

  // Esc cancels
  useEffect(() => {
    if (!pending) return;
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); resolve(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, resolve]);

  return (
    <PromptContext.Provider value={prompt}>
      {children}
      {pending && createPortal(
        <>
          <style>{`
            @keyframes gbPromptFade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes gbPromptSlide { from { transform: translate(-50%, -45%) scale(0.96); opacity: 0 } to { transform: translate(-50%, -50%) scale(1); opacity: 1 } }
          `}</style>
          <div onClick={() => resolve(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(2px)", zIndex: 99998, animation: "gbPromptFade .15s ease-out" }} />
          <div role="dialog" aria-modal="true"
            style={{
              position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              background: T.surface, borderRadius: 12,
              boxShadow: "0 24px 64px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.1)",
              zIndex: 99999, minWidth: 340, maxWidth: 480, width: "calc(100% - 32px)",
              animation: "gbPromptSlide .18s cubic-bezier(.2,.9,.3,1.05)",
              fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", overflow: "hidden",
            }}>
            <div style={{ padding: "20px 22px 16px" }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text, lineHeight: 1.4, marginBottom: 12, whiteSpace: "pre-wrap" }}>
                {pending.message}
              </div>
              {pending.multiline ? (
                <textarea ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder={pending.placeholder} rows={3}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); resolve(value); } }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.borderM}`, fontSize: 13.5, color: T.text, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" }}
                  onFocus={(e) => e.target.style.borderColor = T.blu} onBlur={(e) => e.target.style.borderColor = T.borderM} />
              ) : (
                <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder={pending.placeholder}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resolve(value); } }}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.borderM}`, fontSize: 13.5, color: T.text, background: T.surface, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  onFocus={(e) => e.target.style.borderColor = T.blu} onBlur={(e) => e.target.style.borderColor = T.borderM} />
              )}
            </div>
            <div style={{ padding: "12px 18px", background: T.surfaceB, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => resolve(null)}
                style={{ padding: "8px 16px", borderRadius: 7, background: T.surface, border: `1px solid ${T.borderM}`, color: T.textMid, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {pending.cancelLabel}
              </button>
              <button onClick={() => resolve(value)}
                style={{ padding: "8px 18px", borderRadius: 7, background: T.blu, border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 2px 8px ${T.blu}40` }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.bluHover}
                onMouseLeave={(e) => e.currentTarget.style.background = T.blu}>
                {pending.okLabel}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  return ctx || ((msg, def) => Promise.resolve(window.prompt(msg, def)));
}

export default PromptProvider;
