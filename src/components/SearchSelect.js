// ── SEARCHSELECT — portal-based searchable combobox ─────────────
// Single input that doubles as the search field when open.
// Dropdown renders via React portal at document.body, so it never
// gets clipped by parent modals' overflow:hidden and z-index walls.
//
// Behavior:
// • Click / focus → opens dropdown, input becomes search box
// • Type to filter; Arrow keys navigate; Enter selects
// • Click anywhere outside (or Tab / Esc) → closes
// • onMouseDown selects (prevents blur from closing first)
// • Auto-repositions on scroll / resize while open
//
// Usage:
//   <SearchSelect
//     value={selectedKey}
//     options={["A","B","C"]}                       // strings → key=label
//     options={[{key:1,label:"One"},...]}            // or objects
//     options={[{value:1,label:"One"},...]}          // value/label also OK
//     options={[{id:1,name:"One"},...]}              // id/name also OK
//     onChange={(key) => setSelected(key)}
//     placeholder="Select a project..."
//     accent="#2563EB"      // optional border / highlight color
//     compact               // smaller height (28px) for tables
//     onAfterSelect={fn}    // optional callback after select (e.g. focus next field)
//     inputRef={ref}        // optional — caller controls focus
//     disabled
//     theme={{...}}         // optional color overrides
//   />

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// Default theme tokens — keep in sync with module-level T objects
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
  theme,
  accent,
  compact = false,
  onAfterSelect,
  inputRef,
}) {
  const T = theme || C;
  const ac = accent || T.blu;
  const ht = compact ? 28 : 34;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(-1);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });

  const wrapRef = useRef(null);
  const ownInputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options: strings | {key,label} | {value,label} | {id,name}
  const list = (Array.isArray(options) ? options : []).map((o) => {
    if (typeof o === "string" || typeof o === "number") {
      return { key: String(o), label: String(o) };
    }
    if (o.key !== undefined) return { key: String(o.key), label: String(o.label ?? o.key) };
    return {
      key: String(o.value ?? o.id ?? o.name ?? ""),
      label: String(o.label ?? o.name ?? o.value ?? o.id ?? ""),
    };
  });

  const filtered = q.trim()
    ? list.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : list;
  const selectedItem = list.find((o) => o.key === String(value ?? ""));

  // Close on outside click (covers BOTH the wrapper and the portal'd dropdown)
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inList = listRef.current && listRef.current.contains(e.target);
      if (!inWrap && !inList) {
        setOpen(false);
        setQ("");
        setHi(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Reposition portal dropdown on scroll / resize
  useEffect(() => {
    if (!open) return;
    const recalc = () => {
      const el = ownInputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 180) });
    };
    recalc();
    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (hi >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-opt]");
      if (items[hi]) items[hi].scrollIntoView({ block: "nearest" });
    }
  }, [hi]);

  const openDrop = () => {
    if (disabled) return;
    const el = ownInputRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 180) });
    }
    setQ("");
    setHi(-1);
    setOpen(true);
  };

  const handleSelect = (key) => {
    onChange && onChange(key);
    setQ("");
    setOpen(false);
    setHi(-1);
    if (onAfterSelect) setTimeout(() => onAfterSelect(), 30);
  };

  const assignRef = (el) => {
    ownInputRef.current = el;
    if (inputRef) {
      if (typeof inputRef === "function") inputRef(el);
      else inputRef.current = el;
    }
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        openDrop();
      }
      return;
    }
    if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      setQ("");
      setHi(-1);
      if (e.key === "Escape") e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((p) => (p < filtered.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((p) => (p > 0 ? p - 1 : filtered.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const idx = hi >= 0 ? hi : 0;
      if (filtered[idx]) handleSelect(filtered[idx].key);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", ...style }}>
      <input
        ref={assignRef}
        disabled={disabled}
        value={open ? q : selectedItem?.label || ""}
        onChange={(e) => {
          setQ(e.target.value);
          setHi(-1);
          if (!open) openDrop();
        }}
        onFocus={() => {
          if (!open) openDrop();
        }}
        onMouseDown={(e) => {
          // Click while open → close (toggle behavior)
          if (open) {
            e.preventDefault();
            setOpen(false);
            setQ("");
            setHi(-1);
          }
        }}
        onBlur={() => {
          // Delay close so option onMouseDown can fire first
          setTimeout(() => {
            if (
              document.activeElement &&
              listRef.current &&
              listRef.current.contains(document.activeElement)
            )
              return;
            setOpen(false);
            setQ("");
            setHi(-1);
          }, 150);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          height: ht,
          width: "100%",
          padding: "0 28px 0 11px",
          borderRadius: 7,
          border: `1.5px solid ${open ? ac : T.b1}`,
          fontSize: compact ? 11 : 13,
          color: T.t1,
          background: disabled ? T.surfaceB : T.surface,
          outline: "none",
          fontFamily: "inherit",
          boxSizing: "border-box",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          boxShadow: open ? `0 0 0 3px ${ac}26` : "none",
          transition: "border-color .12s, box-shadow .12s",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          pointerEvents: "none",
          display: "flex",
          color: open ? ac : T.t4,
          transition: "transform .18s, color .12s",
        }}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>

      {open &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              background: T.surface,
              borderRadius: 8,
              border: `1.5px solid ${ac}`,
              boxShadow: "0 10px 32px rgba(0,0,0,0.18)",
              zIndex: 99999,
              maxHeight: 260,
              overflowY: "auto",
              animation: "ssFadeIn .12s ease",
            }}
          >
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "12px 10px",
                  fontSize: 11.5,
                  color: T.t4,
                  textAlign: "center",
                }}
              >
                {list.length === 0 ? "No options yet" : "No match found"}
              </div>
            )}
            {filtered.map((opt, i) => {
              const isCur = opt.key === String(value ?? "");
              const isHi = i === hi;
              return (
                <div
                  key={opt.key + ":" + i}
                  data-opt={i}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.key);
                  }}
                  onMouseEnter={() => setHi(i)}
                  style={{
                    padding: "8px 12px",
                    fontSize: 12.5,
                    cursor: "pointer",
                    color: isCur ? ac : T.t1,
                    fontWeight: isCur ? 700 : 500,
                    background: isHi
                      ? isCur
                        ? ac + "28"
                        : T.bluL
                      : isCur
                      ? ac + "14"
                      : "transparent",
                    borderBottom:
                      i < filtered.length - 1 ? `1px solid ${T.b1}` : "none",
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
                  {isCur && (
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
            })}
          </div>,
          document.body
        )}

      <style>{`
        @keyframes ssFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
