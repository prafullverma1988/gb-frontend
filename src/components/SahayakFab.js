// ════════════════════════════════════════════════════════════════
// SAHAYAK FAB — khiskane wala button.
//
// Pehle ye kone me jama hua tha aur neeche ka content dhak deta tha.
// Ab: pakad kar kahin bhi le jao. Chhodne par sabse paas wale kinare se
// chipak jaata hai aur jagah yaad rehti hai. Upar tak le jao to TOP BAR
// me pin ho jaata hai — chhota ho kar header me baith jaata hai aur
// screen ka koi hissa nahi dhakta. Wahan se dobara kheencho to phir se
// tairne lagta hai.
//
// Drag ke waqt style SEEDHE DOM par likhi jaati hai (setState nahi) —
// warna har pointermove par poora app dobara render hota.
//
// Rang App.js ke T se aate hain (props se), taaki ye file kisi theme
// module par nirbhar na rahe.
// ════════════════════════════════════════════════════════════════
import { useRef, useState } from "react";

const KEY = "san_sahayak_fab_web_v1";
const SIZE = 52;        // tairte waqt
const DOCK_SIZE = 34;   // top bar me pin hone par
const PAD = 12;
const DOCK_Y = 64;      // isse upar chhoda = header me pin
const TAP_SLOP = 6;

const load = () => {
  try { const v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === "object" ? v : null; }
  catch (_) { return null; }
};
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) {} };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function SahayakFab({ onOpen, title, colour, badge, surface, defaultBottom = 22, defaultRight = 22 }) {
  const [st, setSt] = useState(() => load() || { docked: false, x: null, y: null });
  const elRef = useRef(null);
  const dRef = useRef(null);

  const size = st.docked ? DOCK_SIZE : SIZE;

  const onDown = (e) => {
    const el = elRef.current; if (!el) return;
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    const r = el.getBoundingClientRect();
    // position:fixed hai — daayra hamesha viewport ka
    const pr = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    dRef.current = { grabX: e.clientX - r.left, grabY: e.clientY - r.top,
      sx: e.clientX, sy: e.clientY, moved: 0, pr, size: r.width, last: null };
    el.style.transition = "none";
  };

  const onMove = (e) => {
    const d = dRef.current, el = elRef.current;
    if (!d || !el) return;
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
    if (d.moved < TAP_SLOP) return;
    const x = clamp(e.clientX - d.grabX, PAD, Math.max(PAD, d.pr.width - d.size - PAD));
    const y = clamp(e.clientY - d.grabY, 4, Math.max(4, d.pr.height - d.size - PAD));
    d.last = { x, y };
    el.style.left = x + "px"; el.style.top = y + "px";
    el.style.right = "auto"; el.style.bottom = "auto";
  };

  const onUp = () => {
    const d = dRef.current; dRef.current = null;
    const el = elRef.current;
    if (el) el.style.transition = "left .16s ease-out, top .16s ease-out, width .13s, height .13s";
    if (!d) return;
    if (d.moved < TAP_SLOP) { onOpen && onOpen(); return; }
    const p = d.last; if (!p) return;
    if (p.y < DOCK_Y) {
      const next = { docked: true, x: clamp(p.x, PAD, Math.max(PAD, d.pr.width - DOCK_SIZE - PAD)), y: 8 };
      setSt(next); save(next);
    } else {
      const snapX = (p.x + d.size / 2) < d.pr.width / 2 ? PAD : d.pr.width - d.size - PAD;
      const next = { docked: false, x: snapX, y: p.y };
      setSt(next); save(next);
    }
  };

  const placed = st.x != null && st.y != null;
  const style = {
    position: "fixed", zIndex: 120,
    ...(placed ? { left: st.x, top: st.y } : { right: defaultRight, bottom: defaultBottom }),
    width: size, height: size, borderRadius: "50%", border: "none",
    cursor: "grab", touchAction: "none",
    background: colour, color: "#fff",
    boxShadow: st.docked ? "0 1px 4px rgba(0,0,0,.2)" : `0 4px 16px ${colour}61`,
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "left .16s ease-out, top .16s ease-out, width .13s, height .13s",
  };
  const ic = st.docked ? 17 : 23;

  return (
    <button ref={elRef} style={style} title={title} aria-label="Sahayak AI"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <svg width={ic} height={ic} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8M4 8h16v12H4zM2 14h2M20 14h2M9 13v2M15 13v2"/>
      </svg>
      {!st.docked && (
        <span style={{position:"absolute",right:-1,top:-1,width:15,height:15,borderRadius:"50%",background:badge,
          display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 0 2px ${surface}`}}>
          <svg width={9} height={9} viewBox="0 0 24 24" fill="#fff"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>
        </span>
      )}
    </button>
  );
}
