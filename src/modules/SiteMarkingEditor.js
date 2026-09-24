// ══════════════════════════════════════════════════════════════════════
// SITE MAPPING (web) — naksha par haath se marking banana
//
// Mobile app me marking do tarah banti hai: chal kar (GPS) ya satellite par
// tap karke. Web par chalna ho hi nahi sakta, isliye yahan sirf doosra
// raasta hai — naksha par click karke point. Baaki sab wahi jo mobile par
// hai, taaki office wala aur site wala ek hi cheez banayein:
//   • Freelance — company ki Map library me (folder → file → marking),
//     /api/map-library. Kisi project/tender se juda hona zaroori nahi.
//   • Kaam ke liye — project ke tender naksha par, kaam (task) se judi line,
//     /api/tenders/:id/alignments. Ek kaam ke kai tukde, chainage, naali,
//     "aage ka hissa" jodna, lambai sudhaar — sab mobile ke niyam.
//
// Is file ka Google Maps loader apna nahi hai — MapLibraryModule wala hi
// prop me aata hai, taaki page par script ek hi baar lage.
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import api, { API_BASE, getToken } from "../config/api";
import { t } from "../i18n";
import { useMapLibrary, styleOf, typesFor, StyleSwatch } from "./mapStyles";

// ── THEME (MapLibraryModule jaisa) ────────────────────────────────
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  ind: "#4B45C4", indL: "#EEF2FF", indM: "#C7D2FE",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  grn: "#059669", grnL: "#ECFDF5", grnM: "#A7F3D0",
  amb: "#B45309", ambL: "#FFFBEB", ambM: "#FDE68A",
};

// ── GEOMETRY (mobile ke geo.js ka aaina — naap wahi aana chahiye) ──
const rad = (d) => (d * Math.PI) / 180;
const segM = (a, b) => {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(s)));
};
const pathM = (pts) => { let m = 0; for (let i = 1; i < pts.length; i++) m += segM(pts[i - 1], pts[i]); return m; };
// Tooti hui line: gaps batata hai kis point se naya tukda shuru hota hai.
const partsOf = (pts, gaps) => {
  const arr = Array.isArray(pts) ? pts : [];
  const cuts = (Array.isArray(gaps) ? gaps : [])
    .map(Number).filter((i) => Number.isInteger(i) && i > 0 && i < arr.length)
    .filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  if (!cuts.length) return arr.length ? [arr] : [];
  const out = []; let from = 0;
  for (const c of cuts) { out.push(arr.slice(from, c)); from = c; }
  out.push(arr.slice(from));
  return out.filter((p) => p.length);
};
// Chhodi hui jagah (road crossing) kabhi lambai me nahi judti.
const lenOfParts = (pts, gaps) => partsOf(pts, gaps).reduce((m, p) => m + pathM(p), 0);
// Rakba lagbhag (shoelace, local metre) — asli rakba server geometry se likhta hai.
const areaOf = (pts) => {
  if (!pts || pts.length < 3) return 0;
  const lat0 = rad(pts[0].lat), mx = 111320 * Math.cos(lat0), my = 110540;
  let a2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    a2 += (a.lng * mx) * (b.lat * my) - (b.lng * mx) * (a.lat * my);
  }
  return Math.abs(a2) / 2;
};
const fmtCh = (m) => {
  const v = Math.max(0, Math.round(Number(m) || 0));
  return `${Math.floor(v / 1000)}+${String(v % 1000).padStart(3, "0")}`;
};
const fmtM = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
const numIN = (v) => Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const geoOf = (a) => (Array.isArray(a && a.geometry) ? a.geometry : Array.isArray(a && a.pts) ? a.pts : [])
  .map((p) => ({ lat: Number(p && p.lat), lng: Number(p && p.lng) }))
  .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

// Lambai sudhaar — GPS/haath ki naap aur lakshya me chhota farak ho to sire
// se utna kaat do ya badha do (mobile ka adjustLength).
const trimEnd = (pts, d) => {
  let rem = d; const out = pts.slice();
  while (out.length >= 2 && rem > 0) {
    const a = out[out.length - 2], b = out[out.length - 1];
    const L = segM(a, b);
    if (L <= rem) { out.pop(); rem -= L; } else {
      const f = (L - rem) / L;
      out[out.length - 1] = { ...b, lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
      rem = 0;
    }
  }
  return out;
};
const extendEnd = (pts, d) => {
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  const L = segM(a, b);
  if (!(L > 0)) return pts;
  const f = d / L;
  return [...pts.slice(0, -1), { ...b, lat: b.lat + (b.lat - a.lat) * f, lng: b.lng + (b.lng - a.lng) * f }];
};
const adjustLength = (pts, delta, where) => {
  if (!Array.isArray(pts) || pts.length < 2 || !Number.isFinite(delta) || Math.abs(delta) < 0.05) return pts;
  const rev = (p) => [...p].reverse();
  const one = (p, d) => (d < 0 ? trimEnd(p, -d) : extendEnd(p, d));
  if (where === "end") return one(pts, delta);
  if (where === "start") return rev(one(rev(pts), delta));
  const h = delta / 2;
  return rev(one(rev(one(pts, h)), h));
};
// Chainage ke nishan — har `every` metre par line ke upar ek label.
const chainageTicks = (pts, gaps, every, startCh) => {
  if (!(every > 0)) return [];
  const out = [];
  let acc = 0;
  const s0 = Number(startCh) || 0;
  partsOf(pts, gaps).forEach((part) => {
    for (let i = 1; i < part.length; i++) {
      const a = part[i - 1], b = part[i], L = segM(a, b);
      let next = Math.ceil((s0 + acc + 0.01) / every) * every;
      while (L > 0 && next <= s0 + acc + L && out.length < 400) {
        const f = (next - s0 - acc) / L;
        out.push({ lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f, ch: next });
        next += every;
      }
      acc += L;
    }
  });
  return out;
};

// ── TYPES (backend ke LINE/POINT/AREA_TYPES) ──────────────────────
const TYPES = {
  line: ["inlet", "outlet", "rising", "gravity", "drain", "road", "other"],
  point: ["ugr", "pump_house", "hdd", "valve", "culvert", "other"],
  area: ["ugr", "pump_house", "chamber", "plot", "building", "other"],
};
const kindLabel = (k) => (k === "area" ? t("map_library.kind_area") : k === "point" ? t("map_library.kind_point") : t("map_library.kind_line"));
const atypeName = (code) => {
  const key = `map_library.atype_${code}`;
  const s = t(key);
  return s && s !== key ? s : String(code || "");
};
// Kaam se kind/type ka andaza — mobile ka typeFromTask. Planning me likha
// ho (map_kind) to wahi; warna backend ka wtype family, naam se baareeki.
const typeFromTask = (x) => {
  if (x.map_kind) {
    const ap = x.map_kind === "area+pin";
    return { kind: ap ? "area" : x.map_kind, atype: x.map_atype || "other", pin: ap };
  }
  const k = x.bucket === "unmapped_point" ? "point"
    : (x.unit && /^(nos?|no|each|pcs)$/i.test(String(x.unit).trim())) ? "point" : "line";
  const n = String(x.name || "").toLowerCase();
  const w = String(x.wtype || "").toLowerCase();
  if (k === "point") {
    const a = /pump/.test(n) ? "pump_house" : /ugr|tank|reservoir/.test(n) ? "ugr"
      : /valve/.test(n) ? "valve" : /culvert|pulia/.test(n) ? "culvert"
      : /hdd|crossing/.test(n) ? "hdd" : w === "structure" ? "ugr" : "other";
    return { kind: "point", atype: a };
  }
  const byName = /outlet/.test(n) ? "outlet" : /inlet/.test(n) ? "inlet"
    : /rising/.test(n) ? "rising" : /gravity/.test(n) ? "gravity" : null;
  const byType = w === "road" ? "road" : w === "drain" ? "drain"
    : w === "sewer" ? "gravity" : w === "water" ? "rising"
    : w === "pipeline" ? "inlet" : null;
  return { kind: "line", atype: byName || byType || "other" };
};
const RUN_UNIT = /^(m|rm|rmt|mtr|metre|meter|km)$/i;
const SNAP_M = 8;      // pehla point purani line ke sire se itne paas ho to chipak jaaye
const JOIN_M = 30;     // nayi line purane tukde ke sire se itne paas shuru ho to "aage ka hissa"
const MAX_EDIT = 300;  // isse zyada point par ghaseetne wale nishan nahi (naksha dheema padta hai)

// ── File download (KML) ───────────────────────────────────────────
const xmlEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
  c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&apos;"));
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};
// eslint-disable-next-line no-control-regex
const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 80) || "site-mapping";
function kmlOne(it) {
  const pts = geoOf(it);
  const cs = (arr) => arr.map((p) => `${p.lng},${p.lat},0`).join(" ");
  let geom;
  if (it.kind === "point") geom = `<Point><coordinates>${cs(pts.slice(0, 1))}</coordinates></Point>`;
  else if (it.kind === "area") geom = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${cs([...pts, pts[0]])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  else {
    const parts = partsOf(pts, it.gaps);
    const ls = (p) => `<LineString><tessellate>1</tessellate><coordinates>${cs(p)}</coordinates></LineString>`;
    geom = parts.length > 1 ? `<MultiGeometry>${parts.map(ls).join("")}</MultiGeometry>` : ls(pts);
  }
  const len = Number(it.lenM) || 0;
  const desc = [`Kind: ${it.kind}`, len > 0 ? `Length: ${len.toFixed(1)} m` : "",
    Number(it.areaSqm) > 0 ? `Area: ${Number(it.areaSqm).toFixed(1)} sq m` : "",
    it.startCh != null && len > 0 ? `Chainage: ${fmtCh(it.startCh)} to ${fmtCh(Number(it.startCh) + len)}` : ""].filter(Boolean).join(" | ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc(it.name)}</name><Placemark><name>${xmlEsc(it.name)}</name><description>${xmlEsc(desc)}</description>${geom}</Placemark></Document></kml>\n`;
}
// Tender naksha ka KML server banata hai (wahi jo Tenders → Map aur mobile dete hain).
async function serverKml(tenderId, projectId, taskId, name) {
  const q = [`project_id=${projectId}`];
  if (taskId) q.push(`task_id=${taskId}`);
  const res = await fetch(`${API_BASE}/tenders/${tenderId}/alignments/export-kml?${q.join("&")}`,
    { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return false;
  const cd = res.headers.get("Content-Disposition") || "";
  const m = cd.match(/filename="?([^";]+)"?/i);
  saveBlob(await res.blob(), m ? m[1] : `${safeName(name)}.kml`);
  return true;
}

// ── UI bits ───────────────────────────────────────────────────────
const Btn = ({ children, onClick, disabled, tone = "ghost", size = "md", style = {}, title }) => {
  const solid = tone === "primary" || tone === "green" || tone === "amber";
  const col = tone === "green" ? T.grn : tone === "amber" ? T.amb : T.ind;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      style={{
        padding: size === "sm" ? "5px 10px" : "8px 14px", borderRadius: 7,
        border: `1px solid ${disabled ? T.b1 : solid ? col : T.b1}`,
        background: disabled ? T.surfaceB : solid ? col : T.surface,
        color: disabled ? T.t4 : solid ? "#FFFFFF" : T.t2,
        fontSize: size === "sm" ? 11.5 : 12.5, fontWeight: 600, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: 6, whiteSpace: "nowrap", ...style,
      }}>
      {children}
    </button>
  );
};
const Chip = ({ on, children, onClick, style = {} }) => (
  <button type="button" onClick={onClick}
    style={{ padding: "5px 11px", borderRadius: 999, border: `1px solid ${on ? T.ind : T.b1}`, background: on ? T.indL : T.surface, color: on ? T.ind : T.t2, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap", ...style }}>
    {children}
  </button>
);
const inp = {
  width: "100%", padding: "8px 10px", borderRadius: 7, borderWidth: 1.5, borderStyle: "solid", borderColor: T.b1,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box",
};
const lbl = { display: "block", fontSize: 11, color: T.t3, fontWeight: 600, marginBottom: 5 };
// border longhand me — kai card apna borderColor badalte hain, shorthand ke saath React chetavni deta hai.
const card = { background: T.surface, borderWidth: 1, borderStyle: "solid", borderColor: T.b1, borderRadius: 9, padding: "11px 12px", marginBottom: 10 };
const noteS = { fontSize: 11, color: T.t4, marginTop: 5, lineHeight: 1.45 };
const errS = { padding: "8px 10px", borderRadius: 7, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12.5, lineHeight: 1.45, marginBottom: 10 };

// ══════════════════════════════════════════════════════════════════
// NAKSHA — click = point, point ghaseeto = sarkao, beech ka gol = naya point
// ══════════════════════════════════════════════════════════════════
function DrawMap({ loadMaps, pts, gaps, kind, drawing, existing, showExist, onAdd, onDrag, onInsert, onCursor,
  rubber, chStart, chStep, fmtLen, ctlRef, focusKey }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const exLayers = useRef([]);
  const drLayers = useRef([]);
  const rubberRef = useRef(null);
  const cb = useRef({});
  cb.current = { onAdd, onDrag, onInsert, onCursor, drawing, rubber };
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;
  const [status, setStatus] = useState(apiKey ? "loading" : "nokey");

  useEffect(() => {
    if (!apiKey) return undefined;
    let dead = false;
    loadMaps(apiKey).then((g) => {
      if (dead || !boxRef.current) return;
      if (!mapRef.current) {
        const map = new g.maps.Map(boxRef.current, {
          center: { lat: 21.25, lng: 81.63 }, zoom: 7, mapTypeId: "hybrid",
          mapTypeControl: true, streetViewControl: false, fullscreenControl: false,
          clickableIcons: false, tilt: 0,
          mapTypeControlOptions: { position: g.maps.ControlPosition.TOP_RIGHT },
        });
        map.addListener("click", (e) => { if (cb.current.drawing && e.latLng) cb.current.onAdd({ lat: e.latLng.lat(), lng: e.latLng.lng() }); });
        map.addListener("mousemove", (e) => {
          if (!e.latLng) return;
          const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          cb.current.onCursor(p);
          const from = cb.current.drawing ? cb.current.rubber : null;
          if (rubberRef.current) {
            if (from) { rubberRef.current.setPath([from, p]); rubberRef.current.setVisible(true); }
            else rubberRef.current.setVisible(false);
          }
        });
        map.addListener("mouseout", () => { cb.current.onCursor(null); if (rubberRef.current) rubberRef.current.setVisible(false); });
        mapRef.current = map;
      }
      // Aakhri point se mouse tak ki dhaari (kitna aur judega). Alag se, taaki
      // unmount-remount (StrictMode) ke baad bhi dobara ban jaaye.
      if (!rubberRef.current) {
        rubberRef.current = new g.maps.Polyline({
          map: mapRef.current, clickable: false, strokeOpacity: 0, visible: false,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: "#FBBF24", scale: 3 }, offset: "0", repeat: "12px" }],
        });
      }
      setStatus("ok");
    }).catch(() => { if (!dead) setStatus("err"); });
    return () => { dead = true; };
  }, [apiKey, loadMaps]);

  // Bahar se chalne wale kaam: jagah par jao, kisi list par fit karo.
  useEffect(() => {
    ctlRef.current = {
      locate: (p, z) => { const m = mapRef.current; if (!m || !p) return; m.panTo(p); if (m.getZoom() < (z || 18)) m.setZoom(z || 18); },
      fit: (lists) => {
        const m = mapRef.current, g = window.google;
        if (!m || !g) return;
        const b = new g.maps.LatLngBounds(); let n = 0;
        lists.forEach((pp) => pp.forEach((p) => { b.extend(p); n++; }));
        if (n === 1) { m.setCenter(b.getCenter()); m.setZoom(18); } else if (n > 1) m.fitBounds(b, 60);
      },
    };
  });

  // Draw mode me cursor crosshair — kahan point girega, saaf dikhe.
  useEffect(() => {
    // Double-click zoom bhi band: Google do tez click ko double-click maan kar
    // beech wala click kha jaata tha — aur ek point chupchaap gayab.
    if (mapRef.current) mapRef.current.setOptions({ draggableCursor: drawing ? "crosshair" : null, disableDoubleClickZoom: !!drawing });
    if (!drawing && rubberRef.current) rubberRef.current.setVisible(false);
  }, [drawing, status]);

  // Pehle se bani cheezein — dhoosar. Chuna hua kaam ki lines hari.
  useEffect(() => {
    const map = mapRef.current, g = window.google;
    if (status !== "ok" || !map || !g) return;
    exLayers.current.forEach((l) => l.setMap(null));
    exLayers.current = [];
    if (!showExist) return;
    existing.forEach((a) => {
      const p = geoOf(a);
      if (!p.length) return;
      // Pehle se bani cheez apne type ke rang me (Map library); chuna hua kaam hara.
      const col = a.hl ? "#34D399" : styleOf(a.kind === "point" || a.kind === "area" ? a.kind : "line", a.atype || "other").colour;
      if (a.kind === "point" || p.length === 1) {
        exLayers.current.push(new g.maps.Marker({ map, position: p[0], clickable: false, title: a.name || "",
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 5, fillColor: col, fillOpacity: 1, strokeColor: "#1F2937", strokeWeight: 1 } }));
      } else if (a.kind === "area" && p.length >= 3) {
        exLayers.current.push(new g.maps.Polygon({ map, paths: p, clickable: false, strokeColor: col, strokeWeight: 2, strokeOpacity: 0.9, fillColor: col, fillOpacity: 0.12 }));
      } else {
        partsOf(p, a.gaps).forEach((part) => {
          exLayers.current.push(new g.maps.Polyline({ map, path: part, clickable: false, strokeColor: col, strokeOpacity: 0.85, strokeWeight: a.hl ? 4 : 3 }));
        });
      }
    });
  }, [status, existing, showExist]);

  // Pehli baar (ya project badalne par) jo bana hai us par naksha le jao.
  useEffect(() => {
    if (status !== "ok" || !ctlRef.current) return;
    const lists = existing.map(geoOf).filter((x) => x.length);
    if (lists.length) ctlRef.current.fit(lists);
    // Sirf focusKey badalne par — har nayi line par naksha uchhalna nahi chahiye.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, focusKey]);

  // Jo abhi ban raha hai.
  useEffect(() => {
    const map = mapRef.current, g = window.google;
    if (status !== "ok" || !map || !g) return;
    drLayers.current.forEach((l) => l.setMap(null));
    drLayers.current = [];
    if (!pts.length) return;
    const add = (o) => { drLayers.current.push(o); return o; };
    const live = pts.slice();
    let shapes = [];
    const repaint = () => {
      if (kind === "area") shapes[0] && shapes[0].setPath(live);
      else partsOf(live, gaps).forEach((part, i) => shapes[i] && shapes[i].setPath(part));
    };
    if (kind === "area" && pts.length >= 2) {
      shapes = [add(new g.maps.Polygon({ map, paths: live, clickable: false, strokeColor: "#FBBF24", strokeWeight: 3, fillColor: "#FBBF24", fillOpacity: 0.18 }))];
    } else if (kind !== "point") {
      shapes = partsOf(live, gaps).map((part) => add(new g.maps.Polyline({ map, path: part, clickable: false, strokeColor: "#FBBF24", strokeWeight: 4, strokeOpacity: 0.95 })));
    }
    const editable = drawing && pts.length <= MAX_EDIT;
    // Beech ke gol nishan + har bhuja ki lambai. Click = wahan naya point.
    if (editable && kind !== "point" && pts.length <= 150) {
      const cuts = new Set((gaps || []).map(Number));
      const edges = [];
      for (let i = 1; i < pts.length; i++) if (!cuts.has(i)) edges.push([i - 1, i]);
      if (kind === "area" && pts.length >= 3) edges.push([pts.length - 1, 0]);
      edges.forEach(([a, b]) => {
        const A = pts[a], B = pts[b];
        const mid = { lat: (A.lat + B.lat) / 2, lng: (A.lng + B.lng) / 2 };
        const mk = add(new g.maps.Marker({
          map, position: mid, zIndex: 5, cursor: "copy", title: t("map_draw.beech_me_point"),
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 5, fillColor: "#FFFFFF", fillOpacity: 0.35, strokeColor: "#FFFFFF", strokeWeight: 2, labelOrigin: new g.maps.Point(0, -3.2) },
          label: { text: fmtLen(segM(A, B)), color: "#FDE68A", fontSize: "11px", fontWeight: "700" },
        }));
        mk.addListener("click", () => cb.current.onInsert(b === 0 ? pts.length : b, mid));
      });
    }
    // Kone (vertex) — ghaseet kar sarkao.
    pts.forEach((p, i) => {
      const first = i === 0 || (gaps || []).map(Number).includes(i);
      const mk = add(new g.maps.Marker({
        map, position: p, draggable: editable, zIndex: 10, clickable: editable,
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: kind === "point" ? 8 : first ? 6 : 5, fillColor: kind === "point" ? "#F59E0B" : first ? "#10B981" : "#FFFFFF", fillOpacity: 1, strokeColor: "#1F2937", strokeWeight: 2 },
      }));
      if (editable) {
        mk.addListener("drag", (e) => { live[i] = { ...live[i], lat: e.latLng.lat(), lng: e.latLng.lng() }; repaint(); });
        mk.addListener("dragend", (e) => cb.current.onDrag(i, { lat: e.latLng.lat(), lng: e.latLng.lng() }));
      }
    });
    // Chainage ke nishan
    if (kind === "line" && chStep > 0) {
      chainageTicks(pts, gaps, chStep, chStart).forEach((tk) => {
        add(new g.maps.Marker({
          map, position: tk, clickable: false, zIndex: 3,
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 3, fillColor: "#7DD3FC", fillOpacity: 1, strokeColor: "#0F172A", strokeWeight: 1, labelOrigin: new g.maps.Point(0, 3.6) },
          label: { text: fmtCh(tk.ch), color: "#7DD3FC", fontSize: "10px", fontWeight: "700" },
        }));
      });
    }
  }, [status, pts, gaps, kind, drawing, chStep, chStart, fmtLen]);

  useEffect(() => () => {
    exLayers.current.forEach((l) => l.setMap(null));
    drLayers.current.forEach((l) => l.setMap(null));
    if (rubberRef.current) rubberRef.current.setMap(null);
    rubberRef.current = null;
  }, []);

  if (status === "nokey" || status === "err") {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: T.surfaceB, color: T.t3, fontSize: 13, padding: 20, textAlign: "center" }}>
        {status === "nokey" ? t("map_library.map_key_nahi") : t("map_library.map_load_nahi")}
      </div>
    );
  }
  return (
    <>
      <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />
      {status === "loading" && (
        <div style={{ position: "absolute", left: 12, top: 12, padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.92)", fontSize: 12, color: T.t3 }}>
          {t("map_library.map_load_ho_raha")}
        </div>
      )}
    </>
  );
}

// ── Jagah khojo — Google Places (ho to), warna OSM; lat,lng seedha ──
function PlaceSearch({ onGo, near }) {
  const [q, setQ] = useState("");
  const [sugg, setSugg] = useState([]);
  const [err, setErr] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const viaOSM = async (text) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(text)}`, { headers: { Accept: "application/json" } });
      const j = await r.json();
      return (Array.isArray(j) ? j : []).map((x) => ({ label: x.display_name, lat: Number(x.lat), lng: Number(x.lon) }));
    } catch (_) { return []; }
  };
  const go = async (txt) => {
    const v = String(txt != null ? txt : q).trim();
    if (!v) return;
    setSugg([]); setErr("");
    const nums = v.split(/[,\s]+/).map(Number).filter(Number.isFinite);
    if (nums.length >= 2 && Math.abs(nums[0]) <= 90 && Math.abs(nums[1]) <= 180) { onGo({ lat: nums[0], lng: nums[1] }); return; }
    const r = await api.get(`/projects/geocode?q=${encodeURIComponent(v)}`).catch(() => null);
    if (r && r.success && r.data && r.data.lat != null) { onGo({ lat: Number(r.data.lat), lng: Number(r.data.lng) }); return; }
    const o = await viaOSM(v);
    if (o.length) onGo(o[0]); else setErr(t("map_draw.jagah_nahi_mili"));
  };
  const fetchSugg = (text) => {
    clearTimeout(timer.current);
    const v = String(text || "").trim();
    if (v.length < 3 || /^[-\d.,\s]+$/.test(v)) { setSugg([]); return; }
    timer.current = setTimeout(() => {
      const g = window.google;
      let ac = null;
      try { ac = g && g.maps && g.maps.places ? new g.maps.places.AutocompleteService() : null; } catch (_) { ac = null; }
      if (ac) {
        const opts = { input: v, componentRestrictions: { country: "in" } };
        if (near) { opts.location = new g.maps.LatLng(near.lat, near.lng); opts.radius = 50000; }
        try {
          ac.getPlacePredictions(opts, (preds, st) => {
            if (st === "OK" && preds && preds.length) setSugg(preds.slice(0, 5).map((p) => ({ label: p.description, place_id: p.place_id })));
            else viaOSM(v).then(setSugg);
          });
          return;
        } catch (_) { /* neeche OSM */ }
      }
      viaOSM(v).then(setSugg);
    }, 400);
  };
  const pick = (s) => {
    setSugg([]); setQ(s.label);
    const g = window.google;
    if (s.place_id && g && g.maps && g.maps.places) {
      try {
        const svc = new g.maps.places.PlacesService(document.createElement("div"));
        svc.getDetails({ placeId: s.place_id, fields: ["geometry"] }, (res, st) => {
          if (st === "OK" && res && res.geometry && res.geometry.location) onGo({ lat: res.geometry.location.lat(), lng: res.geometry.location.lng() });
          else go(s.label);
        });
        return;
      } catch (_) { /* neeche */ }
    }
    if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) onGo(s); else go(s.label);
  };
  return (
    <div style={{ position: "relative", width: "min(360px, 100%)" }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setErr(""); fetchSugg(e.target.value); }}
          onKeyDown={(e) => { if (e.key === "Enter") go(); }}
          placeholder={t("map_draw.khoj_ph")}
          style={{ ...inp, borderWidth: 0, boxShadow: "0 2px 8px rgba(0,0,0,.25)" }} />
        <Btn onClick={() => go()} style={{ border: "none", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>{t("map_draw.khojo")}</Btn>
      </div>
      {err && <div style={{ marginTop: 4, padding: "4px 9px", borderRadius: 6, background: "rgba(153,27,27,.92)", color: "#fff", fontSize: 11.5 }}>{err}</div>}
      {sugg.length > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4, background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,.25)", zIndex: 3 }}>
          {sugg.map((s, i) => (
            <div key={i} onClick={() => pick(s)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") pick(s); }}
              style={{ padding: "8px 11px", fontSize: 12, color: T.t1, borderTop: i ? `1px solid ${T.b1}` : "none", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// EDITOR
// ══════════════════════════════════════════════════════════════════
// Server har row ko task_id kehta hai, screen id.
const normTasks = (list) => (list || []).map((x) => ({ ...x, id: x.task_id }));
const newKey = () => `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const failMsg = (r, fb) => (!r || r._networkError ? t("map_library.net_error") : (r.message || fb));

export default function SiteMarkingEditor({ lib, loadMaps, onClose, onSaved }) {
  const perms = (lib && lib.perms) || {};
  // ── mode: free (library) | task (project ka tender naksha) ──
  const [mode, setMode] = useState(perms.create ? "free" : "task");
  const [step, setStep] = useState("setup");      // setup | draw | save | done
  const [err, setErr] = useState("");
  const [ask, setAsk] = useState(null);           // { msg, yes, no, onYes, onNo }

  // Project / tender (sirf kaam wale mode me)
  const [projects, setProjects] = useState(null);
  const [pSearch, setPSearch] = useState("");
  const [proj, setProj] = useState(null);
  const [tenderId, setTenderId] = useState(null); // null = dekh rahe; 0 = tender se juda nahi
  const [existing, setExisting] = useState([]);
  const [customTypes, setCustomTypes] = useState([]);
  const [taskList, setTaskList] = useState(null);
  const [planCount, setPlanCount] = useState(null);
  const [selTask, setSelTask] = useState(null);
  const [fType, setFType] = useState("");
  const [tSearch, setTSearch] = useState("");
  const [showMapped, setShowMapped] = useState(false);
  const [allTasks, setAllTasks] = useState(false);
  const [splitBusy, setSplitBusy] = useState(false);
  const [splitDone, setSplitDone] = useState(null);

  // Kya ban raha hai
  const [kind, setKind] = useState("line");
  const [atype, setAtype] = useState("other");
  const [centerPin, setCenterPin] = useState(false);
  const [name, setName] = useState("");
  const [startCh, setStartCh] = useState("");
  const chAutoRef = useRef(false);
  const [widthM, setWidthM] = useState("");
  const [drainSide, setDrainSide] = useState("");
  const [drainOff, setDrainOff] = useState("");
  const [drainW, setDrainW] = useState("");
  const [userQty, setUserQty] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const origPtsRef = useRef(null);

  // Freelance save
  const [folderSel, setFolderSel] = useState("");  // "" = bina folder, "new", ya folder id
  const [newFolder, setNewFolder] = useState("");
  const [fileName, setFileName] = useState("");
  const [diaMm, setDiaMm] = useState("");          // freelance pipe ka diameter (mm)

  // Point aur tod
  const [pts, setPtsS] = useState([]);
  const ptsRef = useRef([]);
  const setPts = (arr) => { ptsRef.current = arr; setPtsS(arr); };
  const [breaks, setBrkS] = useState([]);
  const brkRef = useRef([]);
  const setBrk = (arr) => { brkRef.current = arr; setBrkS(arr); };
  const [redo, setRedo] = useState([]);
  const [snapNote, setSnapNote] = useState(false);
  const [showExist, setShowExist] = useState(true);
  const [cursor, setCursor] = useState(null);
  // Mouse har pixel par hilta hai — poora panel har baar na bane, frame me ek baar.
  const curRaf = useRef(0);
  const curNext = useRef(null);
  const onCursor = useCallback((p) => {
    curNext.current = p;
    if (curRaf.current) return;
    curRaf.current = requestAnimationFrame(() => { curRaf.current = 0; setCursor(curNext.current); });
  }, []);
  useEffect(() => () => cancelAnimationFrame(curRaf.current), []);
  const [copied, setCopied] = useState(false);
  const [typedOpen, setTypedOpen] = useState(false);
  const [typedV, setTypedV] = useState("");
  const [uLen, setULen] = useState("m");
  const [uArea, setUArea] = useState("sqm");
  const ctlRef = useRef(null);
  const kindRef = useRef(kind);
  kindRef.current = kind;

  // Save / done
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [linkTasks, setLinkTasks] = useState(null);
  const [linked, setLinked] = useState(null);

  // Esc = band (poochh kar), jab koi sawaal khula na ho.
  const closeAsk = useCallback(() => {
    if (ptsRef.current.length && step !== "done") {
      setAsk({ msg: t("map_draw.band_karein_puchho", { n: ptsRef.current.length }), yes: t("map_draw.haan_band_karo"), no: t("common.cancel"), onYes: onClose });
    } else onClose();
  }, [onClose, step]);

  // ── Projects (kaam wala mode) ──
  useEffect(() => {
    if (mode !== "task" || projects !== null) return;
    api.get("/projects").then((r) => {
      const list = r && r.success ? (Array.isArray(r.data) ? r.data : (r.data && r.data.projects) || []) : [];
      setProjects(list.filter((p) => p && p.id != null).map((p) => ({ id: p.id, name: p.name || `#${p.id}`, city: p.city || "" })));
    }).catch(() => setProjects([]));
  }, [mode, projects]);

  const loadTasks = useCallback(async (pid) => {
    const mt = await api.get(`/tenders/by-project/${pid}/map-tasks`).catch(() => null);
    if (!mt || !mt.success) return;
    setTaskList(normTasks(mt.data && mt.data.tasks));
    setPlanCount((mt.data && mt.data.plan_count) || null);
  }, []);

  // Project chuna → tender dhoondho, uska naksha + kaam laao.
  useEffect(() => {
    setExisting([]); setTaskList(null); setSelTask(null); setPlanCount(null); setTenderId(null);
    if (!proj) return undefined;
    let dead = false;
    (async () => {
      const r = await api.get(`/tenders/by-project/${proj.id}/alignments`).catch(() => null);
      if (dead) return;
      const tid = (r && r.data && r.data.tender_id) || 0;
      setTenderId(tid);
      if (!tid) return;
      const [al, ft] = await Promise.all([
        api.get(`/tenders/${tid}/alignments?project_id=${proj.id}`).catch(() => null),
        api.get("/tenders/alignments/feature-types").catch(() => null),
        loadTasks(proj.id),
      ]);
      if (dead) return;
      if (al && al.success) setExisting(al.data || []);
      if (ft && ft.success) setCustomTypes(ft.data || []);
    })();
    return () => { dead = true; };
  }, [proj, loadTasks]);

  const isTask = mode === "task";
  const tenderReady = isTask && proj && tenderId > 0;

  // Naksha par dhoosar: kaam wale mode me site ki lines; freelance me library.
  const shown = useMemo(() => {
    if (isTask) {
      return (existing || []).map((a) => ({ ...a, hl: !!(selTask && Number(a.task_id) === Number(selTask.id)) }));
    }
    return ((lib && lib.items) || []).map((x) => ({ id: x.id, name: x.name, kind: x.kind, atype: x.atype, pts: x.pts, gaps: x.gaps }));
  }, [isTask, existing, selTask, lib]);
  const focusKey = isTask ? `p${proj ? proj.id : 0}:${existing.length ? 1 : 0}` : "lib";

  // Type ki list company ki Map library se (built-in + apne) — dono raaste.
  const { lib: mapLib } = useMapLibrary();
  const typeOptions = useMemo(() => {
    const fromLib = typesFor(kind);
    const extra = customTypes.filter((c) => c.kind === kind && !fromLib.some(([v]) => v === c.code)).map((c) => [c.code, c.label]);
    return [...fromLib, ...extra];
    // mapLib badle to naye naam/type — isliye deps me
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, customTypes, mapLib]);

  // ── Kaam chunna — mobile ka pickTask ──
  const pickTask = (x) => {
    if (selTask && selTask.id === x.id) { setSelTask(null); return; }
    setSelTask(x);
    const g = typeFromTask(x);
    setKind(g.kind); setAtype(g.atype); setCenterPin(!!g.pin);
    // Shuruaati chainage is kaam ke pichhle tukde ke ant se.
    setStartCh((v) => {
      if (String(v || "").trim() !== "" && !chAutoRef.current) return v;
      const mine = (existing || []).filter((a) => a.kind === "line" && Number(a.task_id) === Number(x.id));
      if (!mine.length) { const was = chAutoRef.current; chAutoRef.current = false; return was ? "" : v; }
      const end = Math.max(...mine.map((a) => (Number(a.start_chainage_m) || 0) + (Number(a.length_m) || 0)));
      if (!(end > 0)) return v;
      chAutoRef.current = true;
      return String(Math.round(end));
    });
  };

  const doSplit = async (row) => {
    if (!row || splitBusy) return;
    setSplitBusy(true); setErr("");
    const r = await api.post(`/tasks/${row.id}/stretch-split`, {}).catch(() => null);
    setSplitBusy(false);
    if (!r || !r.success) { setErr(failMsg(r, t("map_draw.tukde_nahi_bane"))); return; }
    const tk = (r.data && r.data.tukde) || [];
    const bk = tk.find((x) => x.baaki);
    setSplitDone({ task_id: row.id, n: tk.length, baaki: bk ? Number(bk.length_m) || 0 : 0 });
    if (proj) loadTasks(proj.id);
  };
  const askSplit = (row) => setAsk({
    msg: t("map_draw.tukde_offer", { n: row.stretches }), yes: t("map_draw.tukde_banao"), no: t("common.cancel"),
    onYes: () => doSplit(row),
  });

  // ── Point daalna ──
  const minPts = kind === "line" ? 2 : kind === "area" ? 3 : 1;
  const snapTargets = useMemo(() => shown.filter((a) => a.kind === "line"), [shown]);
  const maybeSnap = (p) => {
    if (ptsRef.current.length) return p;
    let best = null, bestD = SNAP_M;
    snapTargets.forEach((a) => {
      const g = geoOf(a);
      [g[0], g[g.length - 1]].forEach((e) => {
        if (!e) return;
        const d = segM(p, e);
        if (d <= bestD) { bestD = d; best = e; }
      });
    });
    if (!best) return p;
    setSnapNote(true);
    return { lat: best.lat, lng: best.lng, src: "snap" };
  };
  const pushPoint = (p) => {
    setRedo([]);
    if (kindRef.current === "point") { setPts([p]); return; }
    setPts([...ptsRef.current, p]);
  };
  const addPoint = (p) => pushPoint(maybeSnap({ lat: p.lat, lng: p.lng, src: "tap" }));
  const undo = () => {
    const b = brkRef.current;
    if (b.length && b[b.length - 1] >= ptsRef.current.length) { setBrk(b.slice(0, -1)); return; }
    const last = ptsRef.current[ptsRef.current.length - 1];
    if (!last) return;
    setRedo((r) => [...r, last]);
    const next = ptsRef.current.slice(0, -1);
    setPts(next);
    if (brkRef.current.some((i) => i >= next.length)) setBrk(brkRef.current.filter((i) => i < next.length));
  };
  const redoPt = () => {
    setRedo((r) => {
      if (!r.length) return r;
      setPts([...ptsRef.current, r[r.length - 1]]);
      return r.slice(0, -1);
    });
  };
  const insertMid = (at, mid) => {
    setRedo([]);
    const arr = ptsRef.current.slice();
    arr.splice(at, 0, { lat: mid.lat, lng: mid.lng, src: "tap" });
    setPts(arr);
    // Naya point beech me ghusa to uske aage ke tod ek kadam aage.
    if (brkRef.current.some((i) => i > at)) setBrk(brkRef.current.map((i) => (i > at ? i + 1 : i)));
  };
  const dragVertex = (i, pos) => setPts(ptsRef.current.map((q, j) => (j === i ? { ...q, lat: pos.lat, lng: pos.lng, src: "drag" } : q)));

  const partStart = breaks.length ? breaks[breaks.length - 1] : 0;
  const curPartPts = pts.length - partStart;
  const breakHere = () => {
    const n = ptsRef.current.length;
    if (n < minPts || brkRef.current.includes(n)) return;
    if (n - (brkRef.current[brkRef.current.length - 1] || 0) < minPts) return;
    setBrk([...brkRef.current, n]); setRedo([]);
  };
  const joinBack = () => { const b = brkRef.current; if (b.length) setBrk(b.slice(0, -1)); };
  const addTyped = () => {
    const nums = typedV.split(/[,\s]+/).map(Number).filter(Number.isFinite);
    if (nums.length < 2 || Math.abs(nums[0]) > 90 || Math.abs(nums[1]) > 180) { setErr(t("map_draw.typed_galat")); return; }
    const p = maybeSnap({ lat: nums[0], lng: nums[1], src: "typed" });
    pushPoint(p);
    if (ctlRef.current) ctlRef.current.locate(p);
    setTypedV(""); setTypedOpen(false); setErr("");
  };
  const changeKind = (k, pin) => {
    setKind(k); setAtype(TYPES[k][0]); setCenterPin(!!pin);
    // Point par sirf aakhri point bachta hai.
    if (k === "point" && ptsRef.current.length > 1) { setPts([ptsRef.current[ptsRef.current.length - 1]]); setRedo([]); setBrk([]); }
    if (k !== "line" && brkRef.current.length) setBrk([]);
  };

  const beginDraw = () => {
    setErr(""); origPtsRef.current = null; setPickOpen(false);
    setSnapNote(false); setRedo([]);
    setStep("draw");
  };
  const finishDraw = () => {
    // Tod kar ruk gaye (naya tukda bana hi nahi) — wo nishan bekaar hai.
    let arr = ptsRef.current.slice();
    const brk = brkRef.current.slice();
    while (brk.length && arr.length - brk[brk.length - 1] < 2) arr = arr.slice(0, brk.pop());
    if (arr.length !== ptsRef.current.length) setPts(arr);
    if (brk.length !== brkRef.current.length) setBrk(brk);
    setErr(""); setStep("save");
  };

  // Keyboard: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo (sirf naksha wale step me)
  const keyRef = useRef(null);
  keyRef.current = (e) => {
    if (step !== "draw") return;
    const tag = String((e.target && e.target.tagName) || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redoPt(); }
  };
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape" && !ask) { closeAsk(); return; }
      if (keyRef.current) keyRef.current(e);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ask, closeAsk]);

  // ── Naap ──
  const closeM = kind === "area" && pts.length >= 3 ? segM(pts[pts.length - 1], pts[0]) : 0;
  const lenM = kind === "line" || kind === "area" ? Math.round((lenOfParts(pts, breaks) + closeM) * 10) / 10 : 0;
  const areaSqm = kind === "area" ? areaOf(pts) : 0;
  const startChNum = Number(startCh) > 0 ? Number(startCh) : 0;
  const chSuggest = kind === "line" ? `CH ${fmtCh(startChNum)} – ${fmtCh(startChNum + lenM)}` : "";
  const LEN_U = ["m", "ft", "km"], AREA_U = ["sqm", "sqft", "acre", "ha", "dec"];
  const fmtLen = useCallback((mm) => {
    if (uLen === "ft") return `${(mm * 3.28084).toFixed(mm * 3.28084 >= 100 ? 0 : 1)} ft`;
    if (uLen === "km") return `${(mm / 1000).toFixed(3)} km`;
    return mm >= 1000 ? `${(mm / 1000).toFixed(2)} km` : `${Math.round(mm * 10) / 10} m`;
  }, [uLen]);
  const fmtArea = (a) => {
    if (uArea === "sqft") return `${Math.round(a * 10.7639).toLocaleString("en-IN")} sqft`;
    if (uArea === "acre") return `${(a / 4046.856).toFixed(3)} acre`;
    if (uArea === "ha") return `${(a / 10000).toFixed(3)} ha`;
    if (uArea === "dec") return `${(a / 40.4686).toFixed(1)} decimal`;
    return `${Math.round(a).toLocaleString("en-IN")} sqm`;
  };
  const rubberFrom = step === "draw" && kind !== "point" && pts.length && curPartPts > 0 ? pts[pts.length - 1] : null;
  const liveSeg = rubberFrom && cursor ? segM(rubberFrom, cursor) : 0;
  const chStep = kind === "line" ? (lenM >= 2000 ? 500 : lenM >= 400 ? 100 : lenM >= 100 ? 50 : 0) : 0;

  // ── Save ──
  const folders = ((lib && lib.folders) || []).filter((f) => f.can_put === true || f.can_put === 1 || f.can_put === "1");
  const fileOptions = useMemo(() => {
    const fid = folderSel && folderSel !== "new" ? Number(folderSel) : null;
    return [...new Set(((lib && lib.items) || [])
      .filter((x) => (fid == null ? x.folder_id == null : Number(x.folder_id) === fid))
      .map((x) => String(x.file || "").trim()).filter(Boolean))];
  }, [lib, folderSel]);

  const saveFree = async () => {
    const nm = name.trim() || (kind === "line" ? t("map_library.kind_line") : kind === "area" ? t("map_library.kind_area") : t("map_library.kind_point"));
    if (folderSel === "new" && !newFolder.trim()) { setErr(t("map_draw.folder_naam_daalo")); return; }
    const kept = ptsRef.current;
    const body = {
      client_key: newKey(), name: nm, kind, atype: atype || "other",
      dia_mm: kind === "line" && Number(diaMm) > 0 ? Number(diaMm) : undefined,
      pts: kept.map((p) => ({ lat: p.lat, lng: p.lng })),
      lenM: kind === "point" ? 0 : lenM,
      areaSqm: kind === "area" ? Math.round(areaSqm * 100) / 100 : undefined,
      gaps: kind === "line" && brkRef.current.length ? brkRef.current.slice() : undefined,
      file: fileName.trim() || nm,
      startCh: kind === "line" && startChNum > 0 ? startChNum : null,
    };
    if (folderSel === "new") body.folder = newFolder.trim();
    else if (folderSel) body.folder_id = Number(folderSel);
    setSaving(true); setErr("");
    const r = await api.post("/map-library", body).catch(() => null);
    setSaving(false);
    if (!r || !r.success) { setErr(failMsg(r, t("map_library.save_nahi_hua"))); return; }
    const item = { ...body, id: r.data && r.data.id, name: nm };
    setSaved({ free: true, item, length_m: body.lenM });
    setStep("done");
    if (onSaved) onSaved(item.id);
  };

  // Kaam wale mode: pehle "aage ka hissa?" dekho (mobile jaisa, 30 m)
  const contOf = () => {
    const kept = ptsRef.current;
    if (kind !== "line" || !selTask || kept.length < 2) return null;
    let best = null;
    for (const a of (existing || [])) {
      if (a.kind !== "line" || Number(a.task_id) !== Number(selTask.id)) continue;
      const g = geoOf(a);
      if (g.length < 2) continue;
      const nf = kept[0], nl = kept[kept.length - 1], ef = g[0], el = g[g.length - 1];
      const rev = () => [...kept].reverse();
      const ga = Array.isArray(a.gaps) ? a.gaps.map(Number).filter((i) => i > 0) : [];
      const mb = brkRef.current.slice();
      const revB = (arr, n) => arr.map((i) => n - i).filter((i) => i > 0 && i < n).sort((x, y) => x - y);
      const c = [
        { d: segM(nf, el), merged: () => [...g, ...kept], gaps: () => [...ga, ...mb.map((i) => i + g.length)] },
        { d: segM(nl, ef), merged: () => [...kept, ...g], gaps: () => [...mb, ...ga.map((i) => i + kept.length)] },
        { d: segM(nl, el), merged: () => [...g, ...rev()], gaps: () => [...ga, ...revB(mb, kept.length).map((i) => i + g.length)] },
        { d: segM(nf, ef), merged: () => [...rev(), ...g], gaps: () => [...revB(mb, kept.length), ...ga.map((i) => i + kept.length)] },
      ];
      for (const x of c) if (Number.isFinite(x.d) && x.d <= JOIN_M && (!best || x.d < best.d)) best = { ...x, a };
    }
    return best;
  };
  const doJoin = async (cont) => {
    setSaving(true); setErr("");
    const r = await api.put(`/tenders/${tenderId}/alignments/${cont.a.id}`, {
      geometry: cont.merged().map((p) => ({ lat: p.lat, lng: p.lng })), gaps: cont.gaps(),
    }).catch(() => null);
    setSaving(false);
    if (!r || !r.success) { setErr(failMsg(r, t("map_library.save_nahi_hua"))); return; }
    setExisting((l) => (l || []).map((x) => (x.id === r.data.id ? r.data : x)));
    setSaved({ ...r.data, joined: true }); setStep("done");
    setLinked({ plan_qty: selTask.scope_qty == null ? null : Number(selTask.scope_qty) });
    loadTasks(proj.id);
  };
  const saveTask = async (skipJoin) => {
    if (!tenderReady) { setErr(t("map_draw.pehle_project_chuno")); return; }
    if (!skipJoin) {
      const cont = contOf();
      if (cont) {
        setAsk({
          msg: t("map_draw.jod_do_puchho", { name: cont.a.name, d: Math.round(cont.d) }),
          yes: t("map_draw.haan_jodo"), no: t("map_draw.nahi_naya_tukda"),
          onYes: () => doJoin(cont), onNo: () => saveTask(true),
        });
        return;
      }
    }
    if (!name.trim()) { setErr(t("map_draw.naam_zaroori")); return; }
    const kept = ptsRef.current;
    setSaving(true); setErr("");
    const body = {
      project_id: proj.id, name: name.trim(), kind, atype,
      geometry: kept.map((p) => ({ lat: p.lat, lng: p.lng })),
      gaps: kind === "line" && brkRef.current.length ? brkRef.current.slice() : undefined,
      width_m: Number(widthM) > 0 ? Number(widthM) : undefined,
      start_chainage_m: kind === "line" && startChNum > 0 ? startChNum : undefined,
      center_pin: kind === "area" && centerPin ? true : undefined,
      task_id: selTask ? selTask.id : undefined,
      drain_side: atype === "road" && drainSide ? drainSide : undefined,
      drain_offset_m: atype === "road" && drainSide && drainOff !== "" && Number(drainOff) >= 0 ? Number(drainOff) : undefined,
      props: atype === "road" && drainSide && Number(drainW) > 0 ? { drain_width_m: Number(drainW) } : undefined,
      source: "draw",
      capture_meta: { points_tapped: kept.length, user_qty_m: Number(userQty) > 0 ? Number(userQty) : undefined, via: "web" },
    };
    const r = await api.post(`/tenders/${tenderId}/alignments`, body).catch(() => null);
    setSaving(false);
    if (!r || !r.success) { setErr(failMsg(r, t("map_library.save_nahi_hua"))); return; }
    setSaved(r.data); setStep("done");
    const extra = [r.data, ...((r.extra) || []), ...(r.pin ? [r.pin] : [])].filter((x) => x && x.id);
    setExisting((l) => [...(l || []), ...extra]);
    if (selTask) {
      setLinked({ plan_qty: selTask.scope_qty == null ? null : Number(selTask.scope_qty) });
      loadTasks(proj.id);
      return;
    }
    if (kind !== "area") {
      const mt = await api.get(`/tenders/by-project/${proj.id}/map-tasks`).catch(() => null);
      if (mt && mt.success) {
        const want = kind === "line" ? "unmapped_line" : "unmapped_point";
        setLinkTasks(normTasks(mt.data && mt.data.tasks).filter((x) => x.bucket === want));
      }
    }
  };
  const doLink = async (taskId) => {
    setErr("");
    const r = await api.put(`/tenders/${tenderId}/alignments/${saved.id}`, { task_id: taskId }).catch(() => null);
    if (!r || !r.success) { setErr(failMsg(r, t("map_draw.link_nahi_hua"))); return; }
    const tk = (linkTasks || []).find((x) => x.id === taskId);
    setSelTask(tk || null);
    setExisting((l) => (l || []).map((x) => (x.id === r.data.id ? r.data : x)));
    setLinked({ plan_qty: tk && tk.scope_qty != null ? Number(tk.scope_qty) : null });
    loadTasks(proj.id);
  };

  const resetDrawing = () => {
    setPts([]); setBrk([]); setRedo([]); setSnapNote(false); origPtsRef.current = null;
    setUserQty(""); setName(""); setSaved(null); setLinked(null); setLinkTasks(null); setSplitDone(null); setErr("");
  };
  const continueSameTask = () => {
    const endCh = startChNum + lenM;
    resetDrawing();
    setStartCh(String(Math.round(endCh))); chAutoRef.current = true;
    beginDraw();
  };
  const oneMore = () => {
    resetDrawing();
    if (isTask) { setSelTask(null); setStartCh(""); chAutoRef.current = false; setDrainSide(""); setDrainOff(""); setDrainW(""); setWidthM(""); setCenterPin(false); }
    setStep("setup");
  };

  const downloadKml = async () => {
    setErr("");
    try {
      if (saved && saved.free) {
        saveBlob(new Blob([kmlOne({ ...saved.item, lenM: saved.item.lenM })], { type: "application/vnd.google-earth.kml+xml" }), `${safeName(saved.item.name)}.kml`);
        return;
      }
      const ok = await serverKml(tenderId, proj.id, selTask ? selTask.id : null, selTask ? selTask.name : proj.name);
      if (!ok) setErr(t("map_draw.kml_nahi_bana"));
    } catch (_) { setErr(t("map_draw.kml_nahi_bana")); }
  };

  // ── Milaan (teen-taraf): kaam ki qty · naksha ki naap · aapki likhi ──
  const milaan = () => {
    if (!saved || saved.free) return null;
    const mapLen = kind === "area" ? Number(saved.area_sqm_actual || saved.area_sqm || 0) : Number(saved.length_m || 0);
    const taskQty = linked ? Number(linked.plan_qty) : null;
    const uq = Number(userQty) > 0 ? Number(userQty) : null;
    const fmtQ = kind === "area" ? fmtArea : fmtM;
    const fr = selTask ? ((taskList || []).find((x) => x.id === selTask.id) || selTask) : null;
    const kul = fr ? Number(fr.mapped_m) || 0 : 0;
    const multi = kind === "line" && fr && Number(fr.stretches) >= 2 && kul > mapLen + 0.5;
    const rows = [];
    if (taskQty != null && Number.isFinite(taskQty)) rows.push([t("map_draw.task_qty"), fmtQ(taskQty)]);
    if (mapLen > 0) rows.push([multi ? t("map_draw.is_line_ki_napi") : t("map_draw.naksha_napi"), fmtQ(mapLen)]);
    if (multi) rows.push([t("map_draw.ab_tak_tukde", { n: fr.stretches }), fmtQ(kul)]);
    if (multi && taskQty > 0) rows.push([t("map_draw.baaki"), fmtQ(Math.max(0, taskQty - kul))]);
    if (uq) rows.push([t("map_draw.aapki_likhi"), fmtQ(uq)]);
    if (rows.length < 2) return null;
    const base = multi ? mapLen : (taskQty != null && taskQty > 0 ? taskQty : (uq || mapLen));
    const flags = [];
    const pct = (a, b) => Math.round((Math.abs(a - b) / b) * 100);
    if (multi) { if (taskQty > 0 && kul > taskQty * 1.02) flags.push(t("map_draw.kul_zyada", { d: fmtQ(kul - taskQty) })); }
    else if (taskQty > 0 && mapLen > 0 && pct(mapLen, taskQty) > 5) flags.push(t("map_draw.farak_task_map", { d: fmtQ(Math.abs(mapLen - taskQty)), p: pct(mapLen, taskQty) }));
    if (uq && base > 0 && base !== uq && pct(uq, base) > 5) flags.push(t("map_draw.farak_user", { d: fmtQ(Math.abs(uq - base)) }));
    return (
      <div style={{ ...card, borderColor: flags.length ? T.ambM : T.b1 }}>
        <div style={lbl}>{t("map_draw.milaan")}</div>
        {rows.map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12.5 }}>
            <span style={{ color: T.t3 }}>{l}</span><b style={{ color: T.t1 }}>{v}</b>
          </div>
        ))}
        {flags.map((f, i) => <div key={i} style={{ fontSize: 12, color: T.amb, marginTop: 6 }}>{f}</div>)}
      </div>
    );
  };

  // ════════════════════ PANELS ════════════════════
  const modeSwitch = (
    <div style={{ display: "flex", gap: 4, background: T.surfaceB, border: `1px solid ${T.b1}`, borderRadius: 8, padding: 3, marginBottom: 10 }}>
      {[["free", t("map_draw.mode_free")], ["task", t("map_draw.mode_task")]].map(([m, l]) => (
        <button key={m} type="button" disabled={m === "free" && !perms.create}
          onClick={() => { setMode(m); setErr(""); if (m === "free") { setSelTask(null); } }}
          style={{ flex: 1, padding: "7px 8px", borderRadius: 6, border: "none", cursor: m === "free" && !perms.create ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: mode === m ? 700 : 500, background: mode === m ? T.surface : "transparent", color: mode === m ? T.ind : T.t3, boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,.08)" : "none" }}>
          {l}
        </button>
      ))}
    </div>
  );

  const projectPicker = (
    <div style={card}>
      <div style={lbl}>{t("map_draw.kis_project_ki")}</div>
      {projects === null && <div style={{ fontSize: 12, color: T.t4 }}>{t("map_draw.load_ho_raha")}</div>}
      {projects !== null && (
        <>
          {projects.length > 8 && (
            <input value={pSearch} onChange={(e) => setPSearch(e.target.value)} placeholder={t("map_draw.project_khojo")} style={{ ...inp, marginBottom: 6 }} />
          )}
          <select value={proj ? String(proj.id) : ""} style={inp}
            onChange={(e) => { const p = projects.find((x) => String(x.id) === e.target.value); setProj(p || null); setErr(""); }}>
            <option value="">{t("map_draw.project_chuno")}</option>
            {projects.filter((p) => !pSearch || p.name.toLowerCase().includes(pSearch.toLowerCase()) || (proj && p.id === proj.id)).map((p) => (
              <option key={p.id} value={String(p.id)}>{p.name}{p.city ? ` · ${p.city}` : ""}</option>
            ))}
          </select>
          {!projects.length && <div style={noteS}>{t("map_draw.koi_project_nahi")}</div>}
        </>
      )}
      {proj && tenderId === null && <div style={noteS}>{t("map_draw.load_ho_raha")}</div>}
      {proj && tenderId === 0 && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 7, background: T.ambL, border: `1px solid ${T.ambM}`, fontSize: 12, color: T.t2, lineHeight: 1.45 }}>
          {t("map_draw.tender_nahi")}
        </div>
      )}
    </div>
  );

  const taskCard = () => {
    const fr = (taskList || []).find((x) => x.id === selTask.id) || selTask;
    const mapPool = (() => {
      const all = taskList || [];
      const plan = all.filter((x) => x.planned && !x.nested);
      const base = (plan.length && !allTasks) ? plan : all.filter((x) => x.bucket !== "mapped" || x.id === fr.id);
      return base.some((x) => x.id === fr.id) ? base : [fr, ...base];
    })();
    const baakiN = (taskList || []).filter((x) => x.bucket !== "mapped" || x.id === fr.id).length - mapPool.length;
    const running = RUN_UNIT.test(String(fr.unit || "").trim());
    const q = Number(fr.scope_qty) || 0;
    const lines = (existing || []).filter((a) => Number(a.task_id) === Number(fr.id))
      .sort((a, b) => ((Number(a.start_chainage_m) || 0) - (Number(b.start_chainage_m) || 0)) || (a.id - b.id));
    const doneM = Number(fr.mapped_m) || 0;
    const n = Number(fr.stretches) || lines.length;
    const left = running ? Math.max(0, q - doneM) : Math.max(0, q - n);
    return (
      <div style={{ ...card, background: T.grnL, borderColor: T.grnM }}>
        <select value={String(fr.id)} style={{ ...inp, fontWeight: 700, marginBottom: 4 }}
          onChange={(e) => {
            if (e.target.value === "__all__") { setAllTasks(true); return; }
            const nx = (taskList || []).find((x) => String(x.id) === e.target.value);
            if (nx) pickTask(nx);
          }}>
          {mapPool.map((x) => <option key={x.id} value={String(x.id)}>{x.name}{x.task_no ? ` · ${x.task_no}` : ""}</option>)}
          {!allTasks && baakiN > 0 && <option value="__all__">+ {t("map_draw.baaki_kaam_dikhao", { n: baakiN })}</option>}
        </select>
        <div style={{ fontSize: 11, color: T.t4 }}>{fr.item_no ? `BOQ ${fr.item_no} · ` : ""}{fr.task_no}{fr.work_name && fr.work_name !== fr.name ? ` · ${fr.work_name}` : ""}</div>
        {q > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[[t("map_draw.kul"), q, fr.unit || ""], [t("map_draw.ho_gaya"), running ? doneM : n, running ? "m" : (fr.unit || "")], [t("map_draw.baaki"), left, running ? "m" : (fr.unit || "")]].map(([l, v, u], i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: 7, background: T.surface, border: `1px solid ${T.b1}` }}>
                <div style={{ fontSize: 10, color: T.t4 }}>{l}</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: i === 2 ? (left > 0 ? T.amb : T.grn) : T.t1, whiteSpace: "nowrap" }}>
                  {numIN(v)} <span style={{ fontSize: 10, fontWeight: 500, color: T.t4 }}>{u}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {lines.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10.5, color: T.t3, fontWeight: 600, marginBottom: 3 }}>{t("map_draw.ho_chuke_tukde", { n: lines.length })}</div>
            {lines.map((a, i) => {
              const st = Number(a.start_chainage_m) || 0, len = Number(a.length_m) || 0;
              return (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, padding: "3px 0", borderTop: i ? "1px solid rgba(0,0,0,.06)" : "none" }}>
                  <span style={{ color: T.t1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}. {a.name}</span>
                  <span style={{ color: T.t3, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {a.kind === "line" ? `${fmtCh(st)} → ${fmtCh(st + len)} · ${fmtM(len)}` : a.kind === "area" ? fmtArea(Number(a.area_sqm_actual || a.area_sqm) || 0) : kindLabel("point")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {fr.stretches >= 2 && !fr.tukde && (
          <Btn size="sm" onClick={() => askSplit(fr)} disabled={splitBusy} style={{ marginTop: 8 }}>{t("map_draw.tukde_banao")}</Btn>
        )}
        {splitDone && splitDone.task_id === fr.id && (
          <div style={{ fontSize: 12, color: T.grn, marginTop: 6 }}>
            {t("map_draw.tukde_ban_gaye", { n: splitDone.n })}
            {splitDone.baaki > 0 ? ` · ${t("map_draw.baaki_tukda_bana", { len: fmtM(splitDone.baaki) })}` : ""}
          </div>
        )}
        {fr.layers > 1 && <div style={{ fontSize: 11, color: T.t3, marginTop: 6 }}>{t("map_draw.parat_note", { n: fr.layers })}</div>}
        <div style={{ marginTop: 8 }}>
          <Btn size="sm" onClick={() => setSelTask(null)}>{t("map_draw.doosra_kaam")}</Btn>
        </div>
      </div>
    );
  };

  const taskPicker = () => {
    const pool = (taskList || []).filter((x) => showMapped || x.bucket !== "mapped");
    const by = {};
    pool.forEach((x) => { const w = x.wtype || "other"; if (!by[w]) by[w] = 0; by[w] += 1; });
    const order = ["road", "drain", "sewer", "water", "pipeline", "electrical", "structure", "other"];
    const keys = order.filter((k) => by[k]);
    const list = pool
      .filter((x) => !fType || (x.wtype || "other") === fType)
      .filter((x) => !tSearch || String(x.name || "").toLowerCase().includes(tSearch.toLowerCase()) || String(x.task_no || "").includes(tSearch));
    const mappedN = (taskList || []).filter((x) => x.bucket === "mapped").length;
    return (
      <div style={card}>
        <div style={lbl}>{t("map_draw.kis_kaam_ke_liye")}</div>
        {planCount && planCount.total > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "7px 10px", borderRadius: 7, background: T.indL, border: `1px solid ${T.indM}` }}>
            <div style={{ flex: 1, fontSize: 12, color: T.t2 }}>{t("map_draw.plan_progress", { done: planCount.done, total: planCount.total })}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.ind, fontVariantNumeric: "tabular-nums" }}>{planCount.total - planCount.done}</div>
          </div>
        )}
        {taskList === null && <div style={{ fontSize: 12, color: T.t4 }}>{t("map_draw.load_ho_raha")}</div>}
        {taskList !== null && !taskList.length && <div style={{ fontSize: 12, color: T.t4 }}>{t("map_draw.koi_kaam_nahi")}</div>}
        {keys.length >= 2 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            <Chip on={!fType} onClick={() => setFType("")}>{t("map_draw.sab")} · {pool.length}</Chip>
            {keys.map((k) => <Chip key={k} on={fType === k} onClick={() => setFType(fType === k ? "" : k)}>{t(`map_draw.wt_${k}`)} · {by[k]}</Chip>)}
          </div>
        )}
        {(taskList || []).length > 8 && (
          <input value={tSearch} onChange={(e) => setTSearch(e.target.value)} placeholder={t("map_draw.kaam_khojo")} style={{ ...inp, marginBottom: 8 }} />
        )}
        {taskList !== null && taskList.length > 0 && !list.length && <div style={{ fontSize: 12, color: T.t4 }}>{t("map_draw.is_type_ka_kaam_nahi")}</div>}
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {list.slice(0, 60).map((x) => {
            const q = Number(x.scope_qty) || 0, done = Number(x.mapped_m) || 0;
            const left = Math.max(0, Math.round((q - done) * 100) / 100);
            const part = done > 0 && left > 0;
            return (
              <div key={x.id} role="button" tabIndex={0} onClick={() => pickTask(x)} onKeyDown={(e) => { if (e.key === "Enter") pickTask(x); }}
                style={{ padding: "8px 9px", borderRadius: 7, border: `1px solid ${T.b1}`, background: T.surface, marginBottom: 5, cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{x.planned ? <span style={{ color: T.ind }}>● </span> : null}{x.name}</div>
                  <div style={{ fontSize: 10.5, color: T.t4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {x.item_no ? `BOQ ${x.item_no} · ` : ""}{x.task_no}
                    {x.work_name && x.work_name !== x.name ? ` · ${x.work_name}` : ""}
                    {x.layers > 1 ? ` · ${t("map_draw.n_parat", { n: x.layers })}` : ""}
                    {x.nested ? ` · ${t("map_draw.andar_wala")}` : ""}
                    {x.stretches > 0 ? ` · ${t("map_draw.n_tukde", { n: x.stretches })}` : ""}
                    {x.bucket === "mapped" ? ` · ${t("map_draw.line_lag_chuki")}` : ""}
                  </div>
                </div>
                {x.scope_qty != null && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: part ? T.amb : T.t1 }}>{numIN(part ? left : q)}</div>
                    <div style={{ fontSize: 10, color: T.t4 }}>{part ? t("map_draw.baaki_unit", { u: x.unit || "" }) : (x.unit || "")}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {mappedN > 0 && (
          <button type="button" onClick={() => setShowMapped((v) => !v)} style={{ background: "none", border: "none", padding: 0, marginTop: 4, fontSize: 11.5, color: T.ind, cursor: "pointer", fontFamily: "inherit" }}>
            {showMapped ? t("map_draw.mapped_chhupao") : t("map_draw.mapped_dikhao", { n: mappedN })}
          </button>
        )}
        {(taskList || []).length > 0 && <div style={noteS}>{t("map_draw.jodna_optional_note")}</div>}
      </div>
    );
  };

  const kindPicker = (withType) => (
    <>
      <div style={lbl}>{t("map_draw.kya_mark_karna_hai")}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {[["line", kindLabel("line"), false], ["point", kindLabel("point"), false], ["area", kindLabel("area"), false], ["area", t("map_draw.k_area_pin"), true]]
          .filter(([, , pin]) => !pin || isTask)
          .map(([k, l, pin], i) => (
            <Chip key={k + i} on={kind === k && (k !== "area" || !isTask || centerPin === pin)} onClick={() => changeKind(k, pin)}>{l}</Chip>
          ))}
      </div>
      {withType && (
        <>
          {/* Freelance me bhi type (Prafull, 2026-09-24) — rang isi se aata hai. */}
          <div style={lbl}>{t("map_draw.type")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <StyleSwatch kind={kind} code={atype} size={18} />
            <select value={atype} onChange={(e) => setAtype(e.target.value)} style={inp}>
              {typeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {!isTask && kind === "line" && (
            <>
              <div style={lbl}>{t("map_draw.dia_mm")}</div>
              <input value={diaMm} inputMode="decimal" placeholder="—" style={{ ...inp, marginBottom: 10 }}
                onChange={(e) => setDiaMm(e.target.value.replace(/[^\d.]/g, ""))} />
            </>
          )}
        </>
      )}
    </>
  );

  const setupPanel = (
    <>
      {modeSwitch}
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 10, lineHeight: 1.5 }}>
        {isTask ? t("map_draw.mode_task_note") : t("map_draw.mode_free_note")}
      </div>
      {isTask && projectPicker}
      {tenderReady && selTask && taskCard()}
      {tenderReady && !selTask && taskPicker()}
      {(!isTask || tenderReady) && (
        <div style={card}>
          {kindPicker(true)}
          {kind === "line" && (
            <>
              <div style={lbl}>{t("map_draw.start_chainage")}</div>
              <input value={startCh} inputMode="decimal" placeholder="0" style={inp}
                onChange={(e) => { chAutoRef.current = false; setStartCh(e.target.value.replace(/[^\d.]/g, "")); }} />
              <div style={noteS}>
                {startChNum > 0 ? t("map_draw.start_ch_se", { ch: fmtCh(startChNum) }) + (chAutoRef.current ? ` · ${t("map_draw.ch_pichhle_se")}` : "") : t("map_draw.start_ch_note")}
              </div>
            </>
          )}
        </div>
      )}
      {(!isTask || tenderReady) && (
        <Btn tone="primary" onClick={beginDraw} style={{ width: "100%", padding: "10px 14px", fontSize: 13 }}>
          {pts.length ? t("map_draw.naksha_par_wapas") : t("map_draw.banana_shuru")}
        </Btn>
      )}
      {tenderReady && (existing || []).length > 0 && (
        <Btn onClick={async () => { setErr(""); const ok = await serverKml(tenderId, proj.id, selTask ? selTask.id : null, selTask ? selTask.name : proj.name).catch(() => false); if (!ok) setErr(t("map_draw.kml_nahi_bana")); }}
          style={{ width: "100%", marginTop: 8 }}>
          {selTask
            ? t("map_draw.kml_kaam_download", { n: (existing || []).filter((a) => Number(a.task_id) === Number(selTask.id)).length })
            : t("map_draw.kml_site_download", { n: existing.length })}
        </Btn>
      )}
    </>
  );

  const liveCard = (
    <div style={{ ...card, background: "#0F172A", borderColor: "#0F172A", color: "#fff" }}>
      {(selTask || name) && (
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {selTask ? selTask.name : name}
          {selTask && selTask.scope_qty != null ? <span style={{ opacity: 0.75, fontWeight: 500 }}> · {numIN(selTask.scope_qty)} {selTask.unit || ""}</span> : null}
        </div>
      )}
      {kind !== "point" && (
        <div role="button" tabIndex={0} onClick={() => setULen((u) => LEN_U[(LEN_U.indexOf(u) + 1) % LEN_U.length])} style={{ cursor: "pointer" }} title={t("map_draw.unit_badlo")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5 }}>
            <span style={{ opacity: 0.75 }}>
              {liveSeg >= 1 ? t("map_draw.yahan_tak") : t("map_draw.lambai")}{kind === "area" ? ` (${t("map_draw.ghera")})` : ""}
              {breaks.length > 0 ? ` · ${t("map_draw.tukda_n", { n: breaks.length + 1 })}` : ""}
            </span>
            <b style={{ fontVariantNumeric: "tabular-nums", fontSize: liveSeg >= 1 ? 16 : 13.5, color: liveSeg >= 1 ? "#FDE68A" : "#fff" }}>{fmtLen(liveSeg >= 1 ? lenM + liveSeg : lenM)} ▾</b>
          </div>
          {liveSeg >= 1 && <div style={{ textAlign: "right", fontSize: 10.5, opacity: 0.75, fontVariantNumeric: "tabular-nums" }}>{fmtLen(lenM)} + {fmtLen(liveSeg)}</div>}
        </div>
      )}
      {kind === "area" && (
        <div role="button" tabIndex={0} onClick={() => setUArea((u) => AREA_U[(AREA_U.indexOf(u) + 1) % AREA_U.length])} style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", fontSize: 12.5, marginTop: 3 }} title={t("map_draw.unit_badlo")}>
          <span style={{ opacity: 0.75 }}>{t("map_draw.rakba_lagbhag")}</span>
          <b style={{ fontVariantNumeric: "tabular-nums" }}>{areaSqm > 0 ? fmtArea(areaSqm) : "—"} ▾</b>
        </div>
      )}
      {kind === "line" && pts.length >= 2 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.15)" }}>
          <span style={{ opacity: 0.75 }}>{t("map_draw.chainage")}</span>
          <b style={{ fontVariantNumeric: "tabular-nums", color: "#7DD3FC" }}>
            {fmtCh(startChNum)} → {fmtCh(startChNum + lenM)}
            {selTask && Number(selTask.scope_qty) > 0 ? <span style={{ opacity: 0.75, fontWeight: 500 }}> · {t("map_draw.kul_me", { tot: fmtLen(Number(selTask.scope_qty)) })}</span> : null}
          </b>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginTop: 4, opacity: 0.8 }}>
        <span>{t("map_draw.points_n", { n: pts.length })}</span>
        {cursor && (
          <span role="button" tabIndex={0} style={{ cursor: "pointer", fontVariantNumeric: "tabular-nums" }} title={t("map_draw.copy_karo")}
            onClick={async () => { try { await navigator.clipboard.writeText(`${cursor.lat.toFixed(6)}, ${cursor.lng.toFixed(6)}`); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch (_) { /* clipboard band */ } }}>
            {copied ? t("map_draw.copy_ho_gaya") : `${cursor.lat.toFixed(6)}, ${cursor.lng.toFixed(6)}`}
          </span>
        )}
      </div>
    </div>
  );

  const drawPanel = (
    <>
      {liveCard}
      <div style={{ fontSize: 11.5, color: T.t3, lineHeight: 1.5, marginBottom: 10 }}>
        {kind === "point" ? t("map_draw.hint_point") : t("map_draw.hint_line")}
      </div>
      {snapNote && <div style={{ fontSize: 11.5, color: T.grn, marginBottom: 8 }}>{t("map_draw.snap_note")}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <Btn size="sm" onClick={undo} disabled={!pts.length && !breaks.length}>{t("map_draw.undo")}</Btn>
        <Btn size="sm" onClick={redoPt} disabled={!redo.length}>{t("map_draw.redo")}</Btn>
        {kind === "line" && (breaks.length > 0 || pts.length >= minPts) && (
          curPartPts === 0
            ? <Btn size="sm" tone="green" onClick={joinBack} title={t("map_draw.jod_do_hint")}>{t("map_draw.jod_do")}</Btn>
            : <Btn size="sm" tone="amber" onClick={breakHere} disabled={curPartPts < minPts} title={t("map_draw.tod_do_hint")}>{t("map_draw.tod_do")}</Btn>
        )}
        <Btn size="sm" onClick={() => setTypedOpen((v) => !v)}>{t("map_draw.lat_lng_se")}</Btn>
        {shown.length > 0 && <Btn size="sm" onClick={() => setShowExist((v) => !v)}>{showExist ? t("map_draw.purani_chhupao") : t("map_draw.purani_dikhao")}</Btn>}
      </div>
      {typedOpen && (
        <div style={{ ...card, display: "flex", gap: 6 }}>
          <input autoFocus value={typedV} onChange={(e) => setTypedV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTyped(); }}
            placeholder="21.1938, 81.3509" style={inp} />
          <Btn onClick={addTyped}>{t("map_draw.jodo")}</Btn>
        </div>
      )}
      <div style={card}>{kindPicker(true)}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => setStep("setup")} style={{ flex: "0 0 auto" }}>{t("map_draw.peechhe")}</Btn>
        <Btn tone="green" onClick={finishDraw} disabled={pts.length < minPts} style={{ flex: 1 }}>
          {pts.length < minPts ? t("map_draw.kam_se_kam_points", { n: minPts }) : kind === "point" ? t("map_draw.point_pakka") : t("map_draw.poora_hua")}
        </Btn>
      </div>
    </>
  );

  const lengthFix = () => {
    const isLine = kind === "line";
    const toM = (q, u) => (/km/i.test(String(u || "")) ? Number(q) * 1000 : Number(q));
    const typed = Number(userQty) > 0 ? Number(userQty) : null;
    const fromTask = isLine && selTask && Number(selTask.scope_qty) > 0 && !(Number(selTask.stretches) > 0) && RUN_UNIT.test(String(selTask.unit || "").trim())
      ? toM(selTask.scope_qty, selTask.unit) : null;
    const target = typed != null ? typed : fromTask;
    const delta = isLine && target != null ? Math.round((target - lenM) * 10) / 10 : 0;
    const canFix = isLine && target != null && Math.abs(delta) >= 0.5 && Math.abs(delta) <= Math.max(50, lenM * 0.2) && pts.length >= 2;
    const tooBig = isLine && target != null && Math.abs(delta) > Math.max(50, lenM * 0.2);
    const fix = (where) => {
      if (!origPtsRef.current) origPtsRef.current = ptsRef.current.slice();
      setPts(adjustLength(ptsRef.current, delta, where)); setRedo([]);
    };
    const restore = () => { if (!origPtsRef.current) return; setPts(origPtsRef.current); origPtsRef.current = null; };
    return (
      <div style={{ ...card, borderColor: canFix ? T.ambM : T.b1 }}>
        <div style={lbl}>{kind === "area" ? t("map_draw.aapke_hisaab_rakba") : t("map_draw.aapke_hisaab_lambai")}</div>
        <input value={userQty} onChange={(e) => setUserQty(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal"
          placeholder={fromTask != null ? String(Math.round(fromTask)) : "—"} style={inp} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 8 }}>
          <span style={{ color: T.t3 }}>{t("map_draw.naksha_napi")}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{kind === "area" ? fmtArea(areaSqm) : fmtM(lenM)}</b>
        </div>
        {isLine && target != null && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 3 }}>
            <span style={{ color: T.t3 }}>{t("map_draw.lakshya")}</span>
            <b style={{ fontVariantNumeric: "tabular-nums", color: Math.abs(delta) < 0.5 ? T.grn : T.amb }}>{fmtM(target)}{Math.abs(delta) >= 0.5 ? ` (${delta > 0 ? "+" : ""}${delta} m)` : " ✓"}</b>
          </div>
        )}
        {canFix && (
          <>
            <div style={{ fontSize: 11, color: T.t3, marginTop: 8, marginBottom: 5 }}>{t(delta > 0 ? "map_draw.badhao_kahan_se" : "map_draw.ghatao_kahan_se", { d: Math.abs(delta) })}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["start", t("map_draw.peechhe_se")], ["end", t("map_draw.aage_se")], ["both", t("map_draw.dono_sire_se")]].map(([w, l]) => (
                <Btn key={w} size="sm" onClick={() => fix(w)} style={{ flex: 1 }}>{l}</Btn>
              ))}
            </div>
          </>
        )}
        {tooBig && <div style={{ fontSize: 11, color: T.amb, marginTop: 8 }}>{t("map_draw.farak_bada", { d: fmtM(Math.abs(delta)) })}</div>}
        {origPtsRef.current && <Btn size="sm" onClick={restore} style={{ marginTop: 8 }}>{t("map_draw.pehli_line_wapas")}</Btn>}
        <div style={noteS}>{t("map_draw.milaan_ke_liye_note")}</div>
      </div>
    );
  };

  const summary = (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.t1, marginBottom: 3 }}>{name || kindLabel(kind)}</div>
      <div style={{ fontSize: 12.5, color: T.t3 }}>
        {kind !== "point" ? `${fmtM(lenM)} · ` : ""}{kind === "area" ? `${fmtArea(areaSqm)} · ` : ""}{t("map_draw.points_n", { n: pts.length })}
        {breaks.length > 0 ? ` · ${t("map_draw.n_tukde_gap", { n: breaks.length + 1 })}` : ""}
      </div>
    </div>
  );

  const saveFreePanel = (
    <>
      {summary}
      <div style={card}>
        <label style={lbl} htmlFor="smk-name">{t("map_draw.naam")}</label>
        <input id="smk-name" autoFocus value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder={t("map_draw.naam_ph")} style={{ ...inp, marginBottom: 10 }} />
        <label style={lbl} htmlFor="smk-folder">{t("map_draw.folder")}</label>
        <select id="smk-folder" value={folderSel} onChange={(e) => setFolderSel(e.target.value)} style={{ ...inp, marginBottom: folderSel === "new" ? 6 : 10 }}>
          <option value="">{t("map_library.bina_folder")}</option>
          {folders.map((f) => <option key={f.id} value={String(f.id)}>{f.name}{f.by && folders.filter((x) => x.name === f.name).length > 1 ? ` · ${f.by}` : ""}</option>)}
          <option value="new">+ {t("map_draw.naya_folder")}</option>
        </select>
        {folderSel === "new" && (
          <input value={newFolder} maxLength={160} onChange={(e) => setNewFolder(e.target.value)} placeholder={t("map_draw.naye_folder_ka_naam")} style={{ ...inp, marginBottom: 10 }} />
        )}
        <label style={lbl} htmlFor="smk-file">{t("map_draw.file")}</label>
        <input id="smk-file" list="smk-files" value={fileName} maxLength={160} onChange={(e) => setFileName(e.target.value)} placeholder={name || t("map_draw.file_ph")} style={inp} />
        <datalist id="smk-files">{fileOptions.map((f) => <option key={f} value={f} />)}</datalist>
        <div style={noteS}>{t("map_draw.file_note")}</div>
      </div>
      <div style={{ ...card, background: T.surfaceB }}>
        <div style={{ fontSize: 12, color: T.t2, marginBottom: 6 }}>{t("map_draw.project_me_rakhna")}</div>
        <Btn size="sm" onClick={() => { setMode("task"); setErr(""); }}>{t("map_draw.project_me_rakho")}</Btn>
      </div>
      <Btn tone="primary" onClick={saveFree} disabled={saving} style={{ width: "100%", padding: "10px 14px", fontSize: 13 }}>
        {saving ? t("map_draw.save_ho_raha") : t("map_draw.library_me_rakho")}
      </Btn>
      <Btn onClick={() => setStep("draw")} style={{ width: "100%", marginTop: 8 }}>{t("map_draw.naksha_par_wapas")}</Btn>
    </>
  );

  const saveTaskPanel = () => {
    const pool = (taskList || [])
      .filter((x) => x.bucket !== "mapped" || (selTask && x.id === selTask.id))
      .filter((x) => (kind === "point" ? x.bucket !== "unmapped_line" : x.bucket !== "unmapped_point"))
      .filter((x) => !x.nested).slice(0, 10);
    return (
      <>
        {summary}
        {!tenderReady && projectPicker}
        {!tenderReady && perms.create && (
          <Btn size="sm" onClick={() => { setMode("free"); setSelTask(null); setErr(""); }} style={{ marginBottom: 10 }}>{t("map_draw.library_me_hi_rakho")}</Btn>
        )}
        {tenderReady && (taskList || []).length > 0 && (
          <div style={card}>
            {selTask && !pickOpen ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={lbl}>{t("map_draw.kaam")}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selTask.name}</div>
                  <div style={{ fontSize: 11, color: T.t4 }}>{selTask.task_no}{selTask.scope_qty != null ? ` · ${numIN(selTask.scope_qty)} ${selTask.unit || ""}` : ""}</div>
                </div>
                <Btn size="sm" onClick={() => setPickOpen(true)}>{t("map_draw.kaam_badlo")}</Btn>
              </div>
            ) : (
              <>
                <div style={lbl}>{t("map_draw.kis_kaam_ke_liye")}</div>
                {pool.map((x) => (
                  <div key={x.id} role="button" tabIndex={0} onClick={() => { pickTask(x); setPickOpen(false); }} onKeyDown={(e) => { if (e.key === "Enter") { pickTask(x); setPickOpen(false); } }}
                    style={{ padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${selTask && selTask.id === x.id ? T.ind : T.b1}`, background: selTask && selTask.id === x.id ? T.indL : T.surface, marginBottom: 5, cursor: "pointer" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{x.name}</div>
                    <div style={{ fontSize: 11, color: T.t4 }}>{x.task_no}{x.scope_qty != null ? ` · ${numIN(x.scope_qty)} ${x.unit || ""}` : ""}</div>
                  </div>
                ))}
                <Chip on={!selTask} onClick={() => { setSelTask(null); setPickOpen(false); }}>{t("map_draw.bina_kaam_ke")}</Chip>
              </>
            )}
          </div>
        )}
        {tenderReady && (
          <>
            <div style={{ ...card, borderColor: name.trim() ? T.b1 : T.ambM, borderWidth: 1.5 }}>
              <label style={{ ...lbl, color: name.trim() ? T.t3 : T.amb }} htmlFor="smk-tname">{kind === "line" ? t("map_draw.tukda_naam") : t("map_draw.naam")}</label>
              <input id="smk-tname" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder={chSuggest || t("map_draw.naam_ph")}
                style={{ ...inp, fontWeight: 700, borderColor: name.trim() ? T.b1 : T.ambM }} />
              {!name.trim() && <div style={{ fontSize: 11.5, color: T.amb, fontWeight: 600, marginTop: 6 }}>{t("map_draw.naam_zaroori")}</div>}
              {kind === "line" && <Chip onClick={() => setName(chSuggest)} style={{ marginTop: 6 }}>{t("map_draw.naam_chip", { n: chSuggest })}</Chip>}
              {kind === "line" && (
                <>
                  <div style={{ ...lbl, marginTop: 10 }}>{t("map_draw.start_chainage")}</div>
                  <input value={startCh} inputMode="decimal" placeholder="0" style={inp}
                    onChange={(e) => { chAutoRef.current = false; setStartCh(e.target.value.replace(/[^\d.]/g, "")); }} />
                  <div style={{ fontSize: 12, color: T.ind, fontWeight: 700, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
                    {fmtCh(startChNum)} → {fmtCh(startChNum + lenM)}
                    {chAutoRef.current && startChNum > 0 ? <span style={{ fontSize: 10.5, color: T.t4, fontWeight: 500 }}> · {t("map_draw.ch_pichhle_se")}</span> : null}
                  </div>
                </>
              )}
            </div>
            <div style={card}>
              <div style={lbl}>{t("map_draw.type")}</div>
              <select value={atype} onChange={(e) => setAtype(e.target.value)} style={inp}>
                {typeOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {kind === "area" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10 }}>
                  <input type="checkbox" checked={centerPin} onChange={(e) => setCenterPin(e.target.checked)} />
                  <span style={{ fontSize: 12.5, color: T.t1, fontWeight: 600 }}>{t("map_draw.beech_me_pin")}</span>
                </label>
              )}
              {kind === "area" && <div style={noteS}>{t("map_draw.beech_me_pin_note")}</div>}
            </div>
            {kind === "line" && (
              <div style={card}>
                <div style={lbl}>{t("map_draw.chaudai_optional")}</div>
                <input value={widthM} inputMode="decimal" placeholder="—" style={inp} onChange={(e) => setWidthM(e.target.value.replace(/[^\d.]/g, ""))} />
                {atype === "road" && (
                  <>
                    <div style={{ ...lbl, marginTop: 10 }}>{t("map_draw.naali_kis_taraf")}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[["", t("map_draw.naali_nahi")], ["both", t("map_draw.naali_dono")], ["left", t("map_draw.naali_left")], ["right", t("map_draw.naali_right")]].map(([v, l]) => (
                        <Chip key={v || "no"} on={drainSide === v} onClick={() => setDrainSide(v)}>{l}</Chip>
                      ))}
                    </div>
                    {!!drainSide && (
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={lbl}>{t("map_draw.kinare_se")}</div>
                          <input value={drainOff} inputMode="decimal" placeholder="0.5" style={inp} onChange={(e) => setDrainOff(e.target.value.replace(/[^\d.]/g, ""))} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={lbl}>{t("map_draw.naali_chaudai")}</div>
                          <input value={drainW} inputMode="decimal" placeholder="0.6" style={inp} onChange={(e) => setDrainW(e.target.value.replace(/[^\d.]/g, ""))} />
                        </div>
                      </div>
                    )}
                    {!!drainSide && Number(widthM) > 0 && <div style={noteS}>{t("map_draw.naali_beech_se", { d: (Number(widthM) / 2 + (drainOff !== "" ? Number(drainOff) : 0.5)).toFixed(2) })}</div>}
                    {!!drainSide && !(Number(widthM) > 0) && <div style={{ ...noteS, color: T.amb }}>{t("map_draw.naali_ke_liye_chaudai")}</div>}
                  </>
                )}
              </div>
            )}
            {kind !== "point" && lengthFix()}
          </>
        )}
        <Btn tone="primary" onClick={() => saveTask(false)} disabled={saving || !tenderReady} style={{ width: "100%", padding: "10px 14px", fontSize: 13 }}>
          {saving ? t("map_draw.save_ho_raha") : t("map_draw.naksha_par_save")}
        </Btn>
        <Btn onClick={() => setStep("draw")} style={{ width: "100%", marginTop: 8 }}>{t("map_draw.naksha_par_wapas")}</Btn>
      </>
    );
  };

  const donePanel = () => {
    const fr = selTask ? ((taskList || []).find((x) => x.id === selTask.id) || selTask) : null;
    const offer = !!(linked && fr && fr.stretches >= 2 && !(fr.tukde > 0) && !(splitDone && splitDone.task_id === fr.id));
    return (
      <>
        <div style={{ ...card, background: T.grnL, borderColor: T.grnM }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.grn }}>
            {saved.free ? t("map_draw.library_me_aa_gayi") : saved.joined ? t("map_draw.jud_gaya_ab", { name: saved.name, len: fmtM(Number(saved.length_m) || 0) }) : t("map_draw.naksha_par_chadh_gaya")}
          </div>
          {!saved.free && Number(saved.length_m) > 0 && <div style={{ fontSize: 12, color: T.t2, marginTop: 3 }}>{t("map_draw.napi_lambai")}: <b>{fmtM(Number(saved.length_m))}</b></div>}
          {!saved.free && <div style={noteS}>{t("map_draw.tender_map_note")}</div>}
        </div>
        {!saved.free && !linked && linkTasks && linkTasks.length > 0 && (
          <div style={card}>
            <div style={lbl}>{t("map_draw.kis_kaam_ki_hai")}</div>
            {linkTasks.slice(0, 12).map((x) => (
              <div key={x.id} role="button" tabIndex={0} onClick={() => doLink(x.id)} onKeyDown={(e) => { if (e.key === "Enter") doLink(x.id); }}
                style={{ padding: "7px 9px", borderRadius: 7, border: `1px solid ${T.b1}`, marginBottom: 5, cursor: "pointer" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.t1 }}>{x.name}</div>
                <div style={{ fontSize: 11, color: T.t4 }}>{x.task_no}{x.scope_qty != null ? ` · ${numIN(x.scope_qty)} ${x.unit || ""}` : ""}</div>
              </div>
            ))}
            <div style={noteS}>{t("map_draw.jodna_optional_note")}</div>
          </div>
        )}
        {linked && <div style={{ ...card, borderColor: T.grnM, fontSize: 12.5, color: T.grn, fontWeight: 600 }}>{t("map_draw.kaam_se_jud_gaya")}</div>}
        {linked && fr && splitDone && splitDone.task_id === fr.id && (
          <div style={{ ...card, borderColor: T.grnM }}>
            <div style={{ fontSize: 12.5, color: T.grn, fontWeight: 600 }}>{t("map_draw.tukde_ban_gaye", { n: splitDone.n })}</div>
            {splitDone.baaki > 0 && <div style={{ fontSize: 12, color: T.amb, marginTop: 4 }}>{t("map_draw.baaki_tukda_bana", { len: fmtM(splitDone.baaki) })}</div>}
          </div>
        )}
        {offer && (
          <div style={{ ...card, borderColor: T.ambM }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.t1 }}>
              {t("map_draw.n_tukde", { n: fr.stretches })}{Number(fr.scope_qty) > 0 ? ` · ${fmtM(Number(fr.mapped_m) || 0)} / ${fmtM(Number(fr.scope_qty))}` : ""}
            </div>
            <div style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>{t("map_draw.tukde_offer", { n: fr.stretches })}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn tone="primary" onClick={() => doSplit(fr)} disabled={splitBusy} style={{ flex: 1 }}>{splitBusy ? "…" : t("map_draw.tukde_banao")}</Btn>
              <Btn onClick={oneMore} style={{ flex: 1 }}>{t("map_draw.agla_tukda")}</Btn>
            </div>
          </div>
        )}
        {milaan()}
        {(saved.free ? perms.export : true) && (
          <Btn onClick={downloadKml} style={{ width: "100%", marginBottom: 8 }}>{saved.free ? t("map_draw.is_marking_ki_kml") : selTask ? t("map_draw.kaam_ki_kml") : t("map_draw.site_ki_kml")}</Btn>
        )}
        {!saved.free && selTask && kind === "line" && (
          <Btn onClick={continueSameTask} style={{ width: "100%", marginBottom: 8 }}>{t("map_draw.aage_se_chalu", { ch: fmtCh(startChNum + lenM) })}</Btn>
        )}
        {!offer && <Btn tone="primary" onClick={oneMore} style={{ width: "100%", marginBottom: 8 }}>{t("map_draw.aur_ek_banao")}</Btn>}
        <Btn onClick={onClose} style={{ width: "100%" }}>{t("map_draw.library_par_wapas")}</Btn>
      </>
    );
  };

  let panel;
  if (step === "setup") panel = setupPanel;
  else if (step === "draw") panel = drawPanel;
  else if (step === "save") panel = isTask ? saveTaskPanel() : saveFreePanel;
  else panel = saved ? donePanel() : null;

  const stepTitle = step === "setup" ? t("map_draw.title_setup") : step === "draw" ? t("map_draw.title_draw") : step === "save" ? t("map_draw.title_save") : t("map_draw.title_done");

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, background: T.bg, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif", color: T.t1 }}>
      <style>{`.smk-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(320px,380px) minmax(0,1fr)}
.smk-panel{overflow-y:auto;padding:12px 14px 20px;border-right:1px solid ${T.b1};background:${T.bg}}
@media(max-width:860px){.smk-body{grid-template-columns:minmax(0,1fr);grid-template-rows:55vh auto}.smk-map{order:-1}.smk-panel{border-right:none;border-top:1px solid ${T.b1}}}`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: T.surface, borderBottom: `1px solid ${T.b1}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700 }}>{t("map_draw.nayi_marking")}</div>
          <div style={{ fontSize: 11.5, color: T.t3 }}>
            {stepTitle}
            {isTask && proj ? ` · ${proj.name}` : !isTask ? ` · ${t("map_draw.mode_free")}` : ""}
          </div>
        </div>
        <Btn onClick={closeAsk}>{t("common.close")}</Btn>
      </div>
      <div className="smk-body">
        <div className="smk-panel">
          {ask && (
            <div style={{ ...card, borderColor: T.indM, background: T.indL }}>
              <div style={{ fontSize: 12.5, color: T.t1, lineHeight: 1.5, marginBottom: 8 }}>{ask.msg}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn tone="primary" onClick={() => { const f = ask.onYes; setAsk(null); if (f) f(); }} style={{ flex: 1 }}>{ask.yes}</Btn>
                <Btn onClick={() => { const f = ask.onNo; setAsk(null); if (f) f(); }} style={{ flex: 1 }}>{ask.no}</Btn>
              </div>
            </div>
          )}
          {err && <div style={errS}>{err}</div>}
          {panel}
        </div>
        <div className="smk-map" style={{ position: "relative", minHeight: 320 }}>
          <DrawMap loadMaps={loadMaps} pts={pts} gaps={breaks} kind={kind} drawing={step === "draw"}
            existing={shown} showExist={showExist} onAdd={addPoint} onDrag={dragVertex} onInsert={insertMid}
            onCursor={onCursor} rubber={rubberFrom} chStart={startChNum} chStep={chStep} fmtLen={fmtLen}
            ctlRef={ctlRef} focusKey={focusKey} />
          <div style={{ position: "absolute", left: 12, top: 12, right: 150, display: "flex" }}>
            <PlaceSearch near={cursor} onGo={(p) => ctlRef.current && ctlRef.current.locate(p, 17)} />
          </div>
          {step === "draw" && (
            <div style={{ position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", padding: "6px 12px", borderRadius: 999, background: "rgba(15,23,42,.8)", color: "#fff", fontSize: 11.5, pointerEvents: "none", whiteSpace: "nowrap" }}>
              {kind === "point" ? t("map_draw.map_hint_point") : t("map_draw.map_hint_line")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
