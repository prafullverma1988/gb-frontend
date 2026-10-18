// ════════════════════════════════════════════════════════════════
// DocViewer — PDF / photo app ke andar (19 Oct 2026)
// ----------------------------------------------------------------
// Pehle drawing / DPR ki PDF naye tab (ya phone ke Chrome) me khulti thi —
// mark lagana to door, wapas aana bhi jhanjhat. Ye ek hi viewer har module
// me (Design, DPR …) — "har module apna component" niyam ka jaan-boojh kar
// apvaad (Prafull, 19 Oct: "apko jo better lage"), kyunki zoom / page /
// rendering ka har sudhaar sab jagah ek saath lage.
//
// • PDF pdf.js (2.16, worker public/ me) se page-by-page, jo page dikhne
//   wala ho wahi banta hai. Photo = ek page.
// • Zoom: − / + / "Poori chaudai", Ctrl + scroll (cursor ke paas), do ungli.
//   Gesture ke beech CSS se, rukte hi canvas dobara saaf (dhundhla nahi).
// • overlay(pageNo) — har page ke upar parat (mark yahan), jagah 0–1 me.
// • mode ('pin' | 'box' | 'text') ho to page par click / kheench → onPlace;
//   mode na ho to kheenchne se khiskta hai.
// ════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { t } from "../i18n";

const WORKER = (process.env.PUBLIC_URL || "") + "/pdf.worker.2.16.105.min.js";
const MIN_Z = 0.5;
const MAX_Z = 6;
const MAX_CANVAS_PX = 4096;   // ek canvas ki lambi taraf — isse bada memory khata hai

let pdfjsP = null;
export function loadPdfjs() {
  if (!pdfjsP) {
    pdfjsP = import("pdfjs-dist/legacy/build/pdf").then((m) => {
      const lib = m && m.getDocument ? m : (m && m.default) || m;
      lib.GlobalWorkerOptions.workerSrc = WORKER;
      return lib;
    }).catch((e) => { pdfjsP = null; throw e; });
  }
  return pdfjsP;
}

export const isPdfUrl = (u) => /\.pdf(\?|#|$)/i.test(String(u || "")) || /\/raw\/upload\//.test(String(u || ""));

const clampZ = (z) => Math.min(MAX_Z, Math.max(MIN_Z, z));

function PdfPage({ doc, pageNo, width, ratio, onRatio, overlay, mode, onPlace, visibleRef }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const taskRef = useRef(null);
  const [near, setNear] = useState(pageNo <= 2);
  const [drag, setDrag] = useState(null);   // box kheenchte waqt

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return undefined; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) setNear(true);
        if (visibleRef) visibleRef.current[pageNo] = e.intersectionRatio;
      });
    }, { root: el.closest("[data-docviewer-scroll]"), rootMargin: "900px 0px", threshold: [0, 0.25, 0.5, 0.75, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [pageNo, visibleRef]);

  // Zoom rukne ke 160 ms baad hi asli render — gesture ke beech CSS khinchta hai.
  useEffect(() => {
    if (!near || !doc || !width) return undefined;
    let dead = false;
    const timer = setTimeout(async () => {
      try {
        const page = await doc.getPage(pageNo);
        if (dead) return;
        const base = page.getViewport({ scale: 1 });
        if (!ratio) onRatio(pageNo, base.height / base.width);
        const dpr = Math.min(3, window.devicePixelRatio || 1);
        let scale = (width / base.width) * dpr;
        const longPx = Math.max(base.width, base.height) * scale;
        if (longPx > MAX_CANVAS_PX) scale *= MAX_CANVAS_PX / longPx;
        const vp = page.getViewport({ scale });
        const off = document.createElement("canvas");
        off.width = Math.floor(vp.width); off.height = Math.floor(vp.height);
        if (taskRef.current) { try { taskRef.current.cancel(); } catch (_) {} }
        const task = page.render({ canvasContext: off.getContext("2d"), viewport: vp });
        taskRef.current = task;
        await task.promise;
        if (dead) return;
        // Taiyaar hone par hi badlo — purana tab tak dikhta rahe (jhapak nahi).
        const c = canvasRef.current;
        if (!c) return;
        c.width = off.width; c.height = off.height;
        c.getContext("2d").drawImage(off, 0, 0);
      } catch (e) {
        if (e && e.name === "RenderingCancelledException") return;
      }
    }, 160);
    return () => { dead = true; clearTimeout(timer); };
  }, [near, doc, pageNo, width, ratio, onRatio]);

  const toUnit = (e) => {
    const r = boxRef.current.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const onDown = (e) => {
    if (!mode || e.button > 0) return;
    e.stopPropagation();
    const p = toUnit(e);
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onMove = (e) => { if (drag) { const p = toUnit(e); setDrag((d) => (d ? { ...d, x1: p.x, y1: p.y } : d)); } };
  const onUp = () => {
    if (!drag) return;
    const d = drag; setDrag(null);
    const x = Math.min(d.x0, d.x1); const y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0); const h = Math.abs(d.y1 - d.y0);
    if (mode === "box") {
      if (w < 0.01 || h < 0.01) return;   // galti ka chhota tap
      onPlace({ kind: "box", page: pageNo, x, y, w, h });
    } else onPlace({ kind: mode, page: pageNo, x: d.x1, y: d.y1 });
  };

  const height = ratio ? width * ratio : width * 1.414;
  return (
    <div ref={boxRef} data-page={pageNo}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}
      style={{ position: "relative", width, height, margin: "0 auto 14px", background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,.18)", cursor: mode ? "crosshair" : "inherit", touchAction: mode ? "none" : "pan-x pan-y" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {overlay && <div style={{ position: "absolute", inset: 0 }}>{overlay(pageNo)}</div>}
      {drag && mode === "box" && (
        <div style={{ position: "absolute", left: Math.min(drag.x0, drag.x1) * 100 + "%", top: Math.min(drag.y0, drag.y1) * 100 + "%",
          width: Math.abs(drag.x1 - drag.x0) * 100 + "%", height: Math.abs(drag.y1 - drag.y0) * 100 + "%",
          border: "2px dashed #DC2626", background: "rgba(220,38,38,.08)", pointerEvents: "none" }} />
      )}
    </div>
  );
}

function ImagePage({ src, width, overlay, mode, onPlace }) {
  const [ratio, setRatio] = useState(0);
  const boxRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const toUnit = (e) => {
    const r = boxRef.current.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const onDown = (e) => { if (!mode) return; const p = toUnit(e); setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y }); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = (e) => { if (drag) { const p = toUnit(e); setDrag((d) => (d ? { ...d, x1: p.x, y1: p.y } : d)); } };
  const onUp = () => {
    if (!drag) return;
    const d = drag; setDrag(null);
    const x = Math.min(d.x0, d.x1); const y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0); const h = Math.abs(d.y1 - d.y0);
    if (mode === "box") { if (w >= 0.01 && h >= 0.01) onPlace({ kind: "box", page: 1, x, y, w, h }); }
    else onPlace({ kind: mode, page: 1, x: d.x1, y: d.y1 });
  };
  return (
    <div ref={boxRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      style={{ position: "relative", width, height: ratio ? width * ratio : "auto", margin: "0 auto", background: "#fff",
        cursor: mode ? "crosshair" : "inherit", touchAction: mode ? "none" : "pan-x pan-y" }}>
      <img src={src} alt="" draggable={false} onLoad={(e) => setRatio(e.target.naturalHeight / e.target.naturalWidth)}
        style={{ display: "block", width: "100%", height: ratio ? "100%" : "auto", userSelect: "none" }} />
      {overlay && ratio > 0 && <div style={{ position: "absolute", inset: 0 }}>{overlay(1)}</div>}
      {drag && mode === "box" && (
        <div style={{ position: "absolute", left: Math.min(drag.x0, drag.x1) * 100 + "%", top: Math.min(drag.y0, drag.y1) * 100 + "%",
          width: Math.abs(drag.x1 - drag.x0) * 100 + "%", height: Math.abs(drag.y1 - drag.y0) * 100 + "%",
          border: "2px dashed #DC2626", background: "rgba(220,38,38,.08)", pointerEvents: "none" }} />
      )}
    </div>
  );
}

export default function DocViewer({ src, kind, overlay, mode, onPlace, onPage, jumpTo, dark = true }) {
  const scrollRef = useRef(null);
  const [boxW, setBoxW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [doc, setDoc] = useState(null);
  const [pages, setPages] = useState(0);
  const [ratios, setRatios] = useState({});
  const [err, setErr] = useState("");
  const visibleRef = useRef({});
  const pan = useRef(null);
  const pinch = useRef(null);
  const isPdf = kind ? kind === "pdf" : isPdfUrl(src);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const fit = () => setBoxW(Math.max(200, el.clientWidth - 28));
    fit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : null;
    if (ro) ro.observe(el); else window.addEventListener("resize", fit);
    return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", fit); };
  }, []);

  useEffect(() => {
    if (!isPdf || !src) return undefined;
    let dead = false; let loaded = null;
    setDoc(null); setPages(0); setRatios({}); setErr("");
    loadPdfjs().then((lib) => {
      const task = lib.getDocument({ url: src, rangeChunkSize: 262144 });
      return task.promise;
    }).then((d) => {
      loaded = d;
      if (dead) { d.destroy(); return; }
      setDoc(d); setPages(d.numPages);
    }).catch(() => { if (!dead) setErr(t("docview.khul_nahi_payi")); });
    return () => { dead = true; if (loaded) { try { loaded.destroy(); } catch (_) {} } };
  }, [src, isPdf]);

  const onRatio = useCallback((p, r) => setRatios((o) => (o[p] ? o : { ...o, [p]: r })), []);

  // Kaunsa page dikh raha hai — upar "2 / 5".
  const [cur, setCur] = useState(1);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const v = visibleRef.current; let best = 1; let bv = -1;
      Object.keys(v).forEach((k) => { if (v[k] > bv) { bv = v[k]; best = Number(k); } });
      setCur(best); if (onPage) onPage(best);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onPage]);

  // Kisi mark par jaana (list se) — us page par scroll.
  useEffect(() => {
    if (!jumpTo || !scrollRef.current) return;
    const box = scrollRef.current.querySelector(`[data-page="${jumpTo.page}"]`);
    if (!box) return;
    const el = scrollRef.current;
    const top = box.offsetTop + (jumpTo.y || 0) * box.offsetHeight - el.clientHeight / 2;
    const left = box.offsetLeft + (jumpTo.x || 0) * box.offsetWidth - el.clientWidth / 2;
    el.scrollTo({ top: Math.max(0, top), left: Math.max(0, left), behavior: "smooth" });
  }, [jumpTo]);

  // Zoom ek bindu ke aas-paas — wo bindu apni jagah rahe.
  const zoomAt = useCallback((next, cx, cy) => {
    const el = scrollRef.current;
    setZoom((z) => {
      const nz = clampZ(next(z));
      if (el && nz !== z) {
        const r = el.getBoundingClientRect();
        const px = (cx == null ? r.width / 2 : cx - r.left) + el.scrollLeft;
        const py = (cy == null ? r.height / 2 : cy - r.top) + el.scrollTop;
        const f = nz / z;
        requestAnimationFrame(() => {
          el.scrollLeft = px * f - (cx == null ? r.width / 2 : cx - r.left);
          el.scrollTop = py * f - (cy == null ? r.height / 2 : cy - r.top);
        });
      }
      return nz;
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const f = Math.exp(-e.deltaY / 300);
      zoomAt((z) => z * f, e.clientX, e.clientY);
    };
    const d2 = (ts) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);
    const onTs = (e) => { if (e.touches.length === 2) pinch.current = { d: d2(e.touches), z: null }; };
    const onTm = (e) => {
      if (e.touches.length !== 2 || !pinch.current) return;
      e.preventDefault();
      const d = d2(e.touches);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const ratio = d / pinch.current.d;
      pinch.current.d = d;
      zoomAt((z) => z * ratio, cx, cy);
    };
    const onTe = (e) => { if (e.touches.length < 2) pinch.current = null; };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTs, { passive: true });
    el.addEventListener("touchmove", onTm, { passive: false });
    el.addEventListener("touchend", onTe, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel); el.removeEventListener("touchstart", onTs);
      el.removeEventListener("touchmove", onTm); el.removeEventListener("touchend", onTe);
    };
  }, [zoomAt]);

  // Mouse se kheench kar khiskao (mark ka tool na ho tab).
  const onDown = (e) => {
    if (mode || e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollRef.current;
    pan.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
  };
  const onMove = (e) => {
    if (!pan.current) return;
    const el = scrollRef.current;
    el.scrollLeft = pan.current.l - (e.clientX - pan.current.x);
    el.scrollTop = pan.current.t - (e.clientY - pan.current.y);
  };
  const onUp = () => { pan.current = null; };

  const width = Math.round(boxW * zoom);
  const bg = dark ? "#3A3F47" : "#E5E7EB";
  const btn = { border: "none", background: "rgba(255,255,255,.12)", color: "#fff", borderRadius: 8, height: 32, minWidth: 32,
    padding: "0 10px", fontSize: 13, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: bg }}>
      <div ref={scrollRef} data-docviewer-scroll="1"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        style={{ flex: 1, overflow: "auto", padding: "14px", cursor: mode ? "crosshair" : (pan.current ? "grabbing" : "grab"), overscrollBehavior: "contain" }}>
        {err && <div style={{ color: "#fff", textAlign: "center", padding: 40, fontSize: 13 }}>{err}</div>}
        {!err && isPdf && !doc && <div style={{ color: "rgba(255,255,255,.8)", textAlign: "center", padding: 40, fontSize: 13 }}>{t("docview.khul_rahi")}</div>}
        {!err && isPdf && doc && width > 0 && Array.from({ length: pages }, (_, i) => (
          <PdfPage key={i + 1} doc={doc} pageNo={i + 1} width={width} ratio={ratios[i + 1]} onRatio={onRatio}
            overlay={overlay} mode={mode} onPlace={onPlace} visibleRef={visibleRef} />
        ))}
        {!err && !isPdf && src && width > 0 && <ImagePage src={src} width={width} overlay={overlay} mode={mode} onPlace={onPlace} />}
      </div>
      <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", gap: 6, alignItems: "center",
        background: "rgba(17,24,39,.78)", borderRadius: 10, padding: 5 }}>
        {isPdf && pages > 1 && <span style={{ color: "#fff", fontSize: 12, padding: "0 6px" }}>{cur} / {pages}</span>}
        <button type="button" style={btn} onClick={() => zoomAt((z) => z / 1.25)} title={t("docview.chhota")}>−</button>
        <button type="button" style={{ ...btn, minWidth: 56 }} onClick={() => setZoom(1)} title={t("docview.poori_chaudai")}>{Math.round(zoom * 100)}%</button>
        <button type="button" style={btn} onClick={() => zoomAt((z) => z * 1.25)} title={t("docview.bada")}>+</button>
      </div>
    </div>
  );
}
