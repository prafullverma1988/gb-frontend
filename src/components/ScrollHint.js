// ── SCROLL HINT WRAPPER ───────────────────────────────────────────────
// Wraps tables/content with a fade hint showing horizontal scroll exists
// Usage: <ScrollHint><table>...</table></ScrollHint>

import { useState, useRef, useEffect } from "react";

export default function ScrollHint({ children, style }) {
  const ref = useRef(null);
  const [canScroll, setCanScroll] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setCanScroll(el.scrollWidth > el.clientWidth + 4);
      setScrolled(el.scrollLeft > 10);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [children]);

  return (
    <div style={{ position: "relative", ...style }}>
      <div ref={ref} style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {children}
      </div>
      {/* Right fade hint — shows arrow when more content exists */}
      {canScroll && !scrolled && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 32,
          background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06))",
          pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "rgba(0,0,0,0.12)", borderRadius: 10, padding: "4px 3px",
            fontSize: 10, color: "#666", pointerEvents: "none",
          }}>→</div>
        </div>
      )}
    </div>
  );
}
