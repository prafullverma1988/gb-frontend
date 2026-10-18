// ════════════════════════════════════════════════════════════════
// DrawingCompare — do version milao: "kya badla" (19 Oct 2026)
// ----------------------------------------------------------------
// Reviewer ko poori drawing dobara na dekhni pade: dono version ka page ek hi
// naap par banta hai, pixel milaye jaate hain, aur jahan farak hai wahan laal
// parat. Teen nazar: Badlaav (naya + laal) · Naya · Purana · Saath-saath.
// PDF ho ya photo, dono chalta hai (DocViewer ka hi pdf.js).
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../i18n";
import { loadPdfjs, isPdfUrl } from "./DocViewer";

const RENDER_W = 1600;   // milaane ke liye ek naap (kaafi detail, memory kam)

async function renderSrc(src, pageNo) {
  if (isPdfUrl(src)) {
    const lib = await loadPdfjs();
    const doc = await lib.getDocument({ url: src }).promise;
    const n = doc.numPages;
    const page = await doc.getPage(Math.min(pageNo, n));
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: RENDER_W / base.width });
    const c = document.createElement("canvas");
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    doc.destroy();
    return { canvas: c, pages: n };
  }
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const c = document.createElement("canvas");
  c.width = RENDER_W; c.height = Math.round(RENDER_W * img.naturalHeight / img.naturalWidth);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { canvas: c, pages: 1 };
}

// Kya badla — saaf box ke roop me.
//  1. Dono page chhote (800 px) grey me; pehle seedh milao — naya export 1–2 px
//     khisak jaata hai, warna poora page laal dikhta.
//  2. Syahi ke naqshe ±2 px phaila kar milao — 1–2 px khiskaav / line ki motai /
//     rang ka farak nazarandaaz; sirf judi ya hati cheez.
//  3. 8 px ke khaane → paas-paas ke badle khaane jodo → box (count = box).
const AN_W = 800;
function grey(c) {
  const h = Math.round(c.height * AN_W / c.width);
  const t = document.createElement("canvas"); t.width = AN_W; t.height = h;
  const g = t.getContext("2d", { willReadFrequently: true });
  g.fillStyle = "#fff"; g.fillRect(0, 0, AN_W, h); g.drawImage(c, 0, 0, AN_W, h);
  const d = g.getImageData(0, 0, AN_W, h).data;
  const out = new Uint8Array(AN_W * h);
  for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) | 0;
  return { px: out, w: AN_W, h };
}
function bestShift(A, B) {
  let best = { dx: 0, dy: 0, e: Infinity };
  const h = Math.min(A.h, B.h);
  for (let dy = -6; dy <= 6; dy += 1) {
    for (let dx = -6; dx <= 6; dx += 1) {
      let e = 0; let n = 0;
      for (let y = 10; y < h - 10; y += 7) {
        for (let x = 10; x < AN_W - 10; x += 7) {
          const yb = y + dy; const xb = x + dx;
          if (yb < 0 || yb >= B.h || xb < 0 || xb >= B.w) continue;
          e += Math.abs(A.px[y * A.w + x] - B.px[yb * B.w + xb]); n++;
        }
      }
      if (n && e / n < best.e) best = { dx, dy, e: e / n };
    }
  }
  return best;
}
function diffCanvas(a, b) {
  const A = grey(a); const B = grey(b);
  const { dx, dy } = bestShift(A, B);
  const CELLA = 8; const gw = Math.ceil(B.w / CELLA); const gh = Math.ceil(B.h / CELLA);
  const grid = new Uint8Array(gw * gh);
  // Syahi (ink) ke naqshe; ±2 px phailao — aadhe pixel ka khiskaav, line ki
  // motai, rang ka halka farak sab isme kho jaata hai. Badlaav = naye me syahi
  // jo purane ke phailaav me nahi (juda), ya purane ki jo naye me nahi (hata).
  const INK = 200; const R = 2;
  const ink = (G) => { const o = new Uint8Array(G.w * G.h); for (let i = 0; i < o.length; i++) o[i] = G.px[i] < INK ? 1 : 0; return o; };
  const dilate = (m, w, h) => {
    const t = new Uint8Array(w * h); const o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0; for (let k = -R; k <= R && !v; k++) { const xx = x + k; if (xx >= 0 && xx < w && m[y * w + xx]) v = 1; }
      t[y * w + x] = v;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = 0; for (let k = -R; k <= R && !v; k++) { const yy = y + k; if (yy >= 0 && yy < h && t[yy * w + x]) v = 1; }
      o[y * w + x] = v;
    }
    return o;
  };
  const iA = ink(A); const iB = ink(B);
  const dA = dilate(iA, A.w, A.h); const dB = dilate(iB, B.w, B.h);
  for (let y = 0; y < B.h; y++) {
    for (let x = 0; x < B.w; x++) {
      const ya = y - dy; const xa = x - dx;
      const inA = ya >= 0 && ya < A.h && xa >= 0 && xa < A.w;
      const added = iB[y * B.w + x] && !(inA && dA[ya * A.w + xa]);
      const removed = inA && iA[ya * A.w + xa] && !dB[y * B.w + x];
      if (added || removed) grid[((y / CELLA) | 0) * gw + ((x / CELLA) | 0)]++;
    }
  }
  // Khaana tabhi 'badla' jab usme 3+ pixel; ek khaane ka phailaav taaki paas ke judein.
  const on = new Uint8Array(gw * gh);
  for (let i = 0; i < on.length; i++) if (grid[i] >= 4) on[i] = 1;
  const grow = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (!on[y * gw + x]) continue;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const yy = y + oy; const xx = x + ox; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) grow[yy * gw + xx] = 1;
    }
  }
  const seen = new Uint8Array(gw * gh); const boxes = []; let cellsOn = 0;
  for (let i = 0; i < grow.length; i++) {
    if (!grow[i] || seen[i]) continue;
    let x0 = gw; let y0 = gh; let x1 = 0; let y1 = 0; let real = 0; const st = [i]; seen[i] = 1;
    while (st.length) {
      const k = st.pop(); const x = k % gw; const y = (k / gw) | 0;
      if (on[k]) { real++; cellsOn++; }
      if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      const nb = [k - 1, k + 1, k - gw, k + gw];
      for (const q of nb) {
        if (q < 0 || q >= grow.length || seen[q] || !grow[q]) continue;
        if ((q === k - 1 && x === 0) || (q === k + 1 && x === gw - 1)) continue;
        seen[q] = 1; st.push(q);
      }
    }
    if (real >= 2) boxes.push({ x0, y0, x1, y1 });
  }
  const out = document.createElement("canvas"); out.width = b.width; out.height = b.height;
  const o = out.getContext("2d");
  const k = (b.width / AN_W) * CELLA;
  const massive = cellsOn > on.length * 0.35;
  o.lineWidth = Math.max(3, b.width / 400);
  boxes.forEach((bx) => {
    const x = bx.x0 * k - 6; const y = bx.y0 * k - 6;
    const w = (bx.x1 - bx.x0 + 1) * k + 12; const h = (bx.y1 - bx.y0 + 1) * k + 12;
    o.fillStyle = "rgba(220,38,38,0.14)"; o.fillRect(x, y, w, h);
    o.strokeStyle = "#DC2626"; o.strokeRect(x, y, w, h);
  });
  return { overlay: out, changed: boxes.length, massive };
}

export default function DrawingCompare({ oldV, newV, onClose }) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [view, setView] = useState("diff");
  const [zoom, setZoom] = useState(1);
  const [state, setState] = useState({ busy: true, err: "", changed: 0 });
  const refs = { neu: useRef(null), old: useRef(null), ov: useRef(null) };
  const cache = useRef({});

  useEffect(() => {
    let dead = false;
    setState((s) => ({ ...s, busy: true, err: "" }));
    (async () => {
      try {
        const key = page;
        if (!cache.current[key]) {
          const [a, b] = await Promise.all([renderSrc(oldV.src, page), renderSrc(newV.src, page)]);
          cache.current[key] = { a, b, d: diffCanvas(a.canvas, b.canvas) };
        }
        if (dead) return;
        const { a, b, d } = cache.current[key];
        setPages(Math.max(a.pages, b.pages));
        const put = (ref, c) => {
          const el = ref.current; if (!el) return;
          el.width = c.width; el.height = c.height;
          el.getContext("2d").drawImage(c, 0, 0);
        };
        put(refs.neu, b.canvas); put(refs.old, a.canvas); put(refs.ov, d.overlay);
        setState({ busy: false, err: "", changed: d.changed, massive: d.massive });
      } catch (e) {
        if (!dead) setState({ busy: false, err: t("dcompare.nahi_bana"), changed: 0 });
      }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, oldV.src, newV.src]);

  const btn = (id, label) => (
    <button type="button" onClick={() => setView(id)}
      style={{ border: "none", borderRadius: 8, height: 32, padding: "0 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer",
        background: view === id ? "#fff" : "rgba(255,255,255,.12)", color: view === id ? "#111827" : "#fff" }}>{label}</button>
  );
  const w = (view === "side" ? 49 : 100) * zoom + "%";
  const tag = (label) => (
    <span style={{ position: "absolute", left: 8, top: 8, background: "rgba(17,24,39,.8)", color: "#fff", fontSize: 11.5, fontWeight: 800, borderRadius: 6, padding: "2px 8px" }}>{label}</span>
  );
  return createPortal((
    <div style={{ position: "fixed", inset: 0, zIndex: 10065, background: "#1F2329", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#111827", color: "#fff", flexWrap: "wrap" }}>
        <button type="button" onClick={onClose} title={t("common.close")}
          style={{ border: "none", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 8, height: 34, width: 34, fontSize: 16, cursor: "pointer" }}>✕</button>
        <div style={{ fontWeight: 800, fontSize: 14, flex: "1 1 160px" }}>{t("dcompare.title", { a: oldV.label, b: newV.label })}</div>
        {btn("diff", t("dcompare.badlaav"))}{btn("new", newV.label)}{btn("old", oldV.label)}{btn("side", t("dcompare.saath"))}
        {pages > 1 && (
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ height: 32, width: 32, borderRadius: 8, border: "none", cursor: "pointer" }}>‹</button>
            <span style={{ fontSize: 12.5 }}>{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={{ height: 32, width: 32, borderRadius: 8, border: "none", cursor: "pointer" }}>›</button>
          </span>
        )}
        <span style={{ display: "flex", gap: 4 }}>
          <button type="button" onClick={() => setZoom((z) => Math.max(1, z / 1.25))} style={{ height: 32, width: 32, borderRadius: 8, border: "none", cursor: "pointer" }}>−</button>
          <button type="button" onClick={() => setZoom((z) => Math.min(5, z * 1.25))} style={{ height: 32, width: 32, borderRadius: 8, border: "none", cursor: "pointer" }}>+</button>
        </span>
      </div>
      <div style={{ background: "#FEF3C7", color: "#92400E", fontSize: 12.5, padding: "6px 12px" }}>
        {state.busy ? t("dcompare.mila_rahe") : state.err ? state.err
          : state.massive ? t("dcompare.bahut_badla") : state.changed ? t("dcompare.badlaav_mile", { n: state.changed }) : t("dcompare.koi_badlaav_nahi")}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 14, display: "flex", gap: "2%", alignItems: "flex-start", justifyContent: zoom > 1 ? "flex-start" : "center" }}>
        {/* Teeno canvas hamesha maujood — nazar badalne par sirf dikhna/chhupna (dobara banana nahi). */}
        <div style={{ position: "relative", width: w, flex: "none", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)", display: view === "old" ? "none" : "block" }}>
          <canvas ref={refs.neu} style={{ width: "100%", display: "block" }} />
          <canvas ref={refs.ov} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "multiply", display: view === "diff" ? "block" : "none" }} />
          {tag(newV.label)}
        </div>
        <div style={{ position: "relative", width: w, flex: "none", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.25)", display: view === "old" || view === "side" ? "block" : "none" }}>
          <canvas ref={refs.old} style={{ width: "100%", display: "block" }} />
          {tag(oldV.label)}
        </div>
      </div>
    </div>
  ), document.body);
}
