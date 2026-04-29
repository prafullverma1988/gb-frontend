// ── SEARCHSELECT — searchable, keyboard-friendly combobox ────────
// Drop-in replacement for <select>:
// • Tab into → auto-opens dropdown + focuses search input
// • Type to filter, Arrow keys navigate, Enter selects
// • After select / Tab → closes, Tab continues to next form field
//   (button is skipped via manual focus-jump — no Tab loops)
// • Visible blue focus ring shows keyboard position clearly
//
// Usage:
//   <SearchSelect
//     value={selectedKey}
//     options={["A","B","C"]}                       // strings → key=label
//     options={[{key:1,label:"One"},...]}            // or objects
//     onChange={(key) => setSelected(key)}
//     placeholder="Select a project..."
//   />
//
// Options can be:
//   - array of strings (key = label)
//   - array of {key, label} objects
//   - array of {value/id/name, label/name} (auto-mapped)

import { useState, useEffect, useRef } from "react";

// Design tokens — keep in sync with module-level T objects
const C = {
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

export default function SearchSelect({
  value,
  options = [],
  onChange,
  placeholder = "Select...",
  style = {},
  disabled = false,
  // Optional: pass theme override if your module uses different colors
  theme,
}) {
  const T = theme || C;

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const btnRef = useRef(null);
  const skipReopenRef = useRef(false); // prevents auto-reopen after select/Tab

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Auto-focus search input on open; reset query on close
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    if (!open) {
      setQuery("");
      setHi(0);
    }
  }, [open]);

  // Normalize options into [{key, label}]
  const list = options.map((o) =>
    typeof o === "string"
      ? { key: o, label: o }
      : o.key !== undefined
      ? o
      : {
          key: o.value || o.id || o.name || String(o),
          label: o.label || o.name || String(o),
        }
  );
  const filtered = query.trim()
    ? list.filter((o) =>
        String(o.label).toLowerCase().includes(query.toLowerCase())
      )
    : list;
  const selectedItem = list.find((o) => String(o.key) === String(value));

  // After selection: close + return focus to button (so Tab continues forward)
  const selectAndClose = (key) => {
    skipReopenRef.current = true;
    onChange(key);
    setOpen(false);
    setTimeout(() => {
      btnRef.current?.focus();
      skipReopenRef.current = false;
    }, 10);
  };

  // Manually move focus to next/prev form field (skipping our own button)
  const moveTabFocus = (shift) => {
    const focusables = Array.from(
      document.querySelectorAll(
        'input:not([disabled]):not([type="hidden"]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (el) =>
        el.offsetParent !== null && el.getAttribute("tabindex") !== "-1"
    );
    const btnIdx = focusables.indexOf(btnRef.current);
    if (btnIdx < 0) return;
    const target = focusables[shift ? btnIdx - 1 : btnIdx + 1];
    if (target) target.focus();
    else btnRef.current?.focus();
  };

  const onSearchKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (filtered[hi]) {
        e.preventDefault();
        selectAndClose(filtered[hi].key);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setTimeout(() => btnRef.current?.focus(), 0);
    } else if (e.key === "Tab") {
      // Manual focus jump — skip our own button to avoid loops
      e.preventDefault();
      skipReopenRef.current = true;
      setOpen(false);
      setTimeout(() => {
        moveTabFocus(e.shiftKey);
        setTimeout(() => {
          skipReopenRef.current = false;
        }, 50);
      }, 0);
    }
  };

  const onBtnKey = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Auto-open dropdown when button receives focus (e.g. via Tab)
  const onBtnFocus = () => {
    setFocused(true);
    if (!disabled && !skipReopenRef.current) setOpen(true);
  };
  const onBtnBlur = (e) => {
    if (!wrapRef.current?.contains(e.relatedTarget)) setFocused(false);
  };

  const focusRing = (focused || open) && !disabled;

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onBtnKey}
        onFocus={onBtnFocus}
        onBlur={onBtnBlur}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: 7,
          border: `1.5px solid ${focusRing ? T.blu : T.b1}`,
          background: disabled ? T.surfaceB : T.surface,
          fontSize: 13,
          color: selectedItem ? T.t1 : T.t4,
          fontFamily: "inherit",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          outline: "none",
          transition: "border-color .12s, box-shadow .12s",
          boxSizing: "border-box",
          boxShadow: focusRing ? `0 0 0 3px ${T.blu}26` : "none",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke={focusRing ? T.blu : T.t4}
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s, stroke .12s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: T.surface,
            border: `1px solid ${T.b1}`,
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 1100,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "7px 9px",
              borderBottom: `1px solid ${T.b1}`,
              position: "relative",
            }}
          >
            <svg
              width={13}
              height={13}
              viewBox="0 0 24 24"
              fill="none"
              stroke={T.t4}
              strokeWidth={2}
              strokeLinecap="round"
              style={{
                position: "absolute",
                left: 18,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            >
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHi(0);
              }}
              onKeyDown={onSearchKey}
              placeholder="Type to search..."
              style={{
                width: "100%",
                padding: "5px 8px 5px 24px",
                border: `1px solid ${T.b1}`,
                borderRadius: 5,
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
                color: T.t1,
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.b2)}
              onBlur={(e) => (e.target.style.borderColor = T.b1)}
            />
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 0",
              maxHeight: 220,
            }}
          >
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: "14px 12px",
                  textAlign: "center",
                  color: T.t4,
                  fontSize: 11.5,
                }}
              >
                {options.length === 0 ? "No options yet" : "No matches"}
              </div>
            ) : (
              filtered.map((opt, i) => {
                const isHi = i === hi;
                const isSel = String(opt.key) === String(value);
                return (
                  <div
                    key={opt.key}
                    onMouseEnter={() => setHi(i)}
                    onClick={() => selectAndClose(opt.key)}
                    style={{
                      padding: "7px 12px",
                      cursor: "pointer",
                      background: isHi ? T.bluL : "transparent",
                      color: isSel ? T.blu : T.t1,
                      fontSize: 12.5,
                      fontWeight: isSel ? 700 : 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {opt.label}
                    </span>
                    {isSel && (
                      <svg
                        width={12}
                        height={12}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div
            style={{
              padding: "5px 9px",
              borderTop: `1px solid ${T.b1}`,
              fontSize: 9.5,
              color: T.t4,
              display: "flex",
              gap: 10,
              justifyContent: "space-between",
              background: T.surfaceB,
            }}
          >
            <span>↑↓ Navigate · Enter Select</span>
            <span>Tab Next · Esc Close</span>
          </div>
        </div>
      )}
    </div>
  );
}
