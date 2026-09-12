// ══════════════════════════════════════════════════════════════════════
// SITE MAPPING (web) — company ki Map library: folder → file → marking
//
// Mobile app ka "Site mapping" GPS se line / rakba / point napta hai aur
// server par /api/map-library me rakhta hai. Admin/PM zyadatar desktop par
// kaam karte hain — unke liye yahi screen: ped, map par dekhna, KML /
// GeoJSON / CSV nikalna, naam badalna, folder badalna, hatana aur "Hatayi
// hui" se wapas laana.
//
// Kaun kya kar sakta hai, ye faisla SERVER ka hai. Har folder / marking
// apne can_* flag ke saath aata hai, aur library ka `perms`. Flag nahi aaya
// (purana backend) = mana — button chhupta hai, screen kabhi girti nahi.
//
// Self-contained by design (module independence): apna theme, icon, modal,
// toast aur Google Maps loader. Sirf api client aur i18n bahar se.
//
// Hatana kabhi ek click me nahi: mobile par "Export KML" ke theek neeche
// laga ek-tap delete asli data kha chuka hai. Isliye export upar, hatana
// sabse neeche alag dabbe me, aur har baar naam ke saath confirm.
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../config/api";
import { t } from "../i18n";

// ── ICONS ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 16, color = "currentColor", sw = 1.8, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={d} /></svg>
);
const IcFolder  = (p) => <Ic {...p} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />;
const IcFile    = (p) => <Ic {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" />;
const IcLine    = (p) => <Ic {...p} d="M3 18l6-6 4 4 8-8" />;
const IcArea    = (p) => <Ic {...p} d="M4 8l8-5 8 5v8l-8 5-8-5z" />;
const IcPoint   = (p) => <Ic {...p} d="M12 21s-6-6.2-6-11a6 6 0 0112 0c0 4.8-6 11-6 11zM12 12a2 2 0 100-4 2 2 0 000 4z" />;
const IcChevR   = (p) => <Ic {...p} d="M9 6l6 6-6 6" />;
const IcChevD   = (p) => <Ic {...p} d="M6 9l6 6 6-6" />;
const IcRefresh = (p) => <Ic {...p} d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0020.5 15" />;
const IcDown    = (p) => <Ic {...p} d="M12 3v12M7 10l5 5 5-5M5 21h14" />;
const IcX       = (p) => <Ic {...p} d="M18 6L6 18M6 6l12 12" />;
const IcLock    = (p) => <Ic {...p} d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4" />;
const IcAlert   = (p) => <Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />;
const IcMap     = (p) => <Ic {...p} d="M9 20l-5.4-2.7A1 1 0 013 16.4V5.6a1 1 0 011.4-.9L9 7m0 13l6-3m-6 3V7m6 10l4.6 2.3a1 1 0 001.4-.9V7.6a1 1 0 00-.6-.9L15 4m0 13V4m0 0L9 7" />;
const IcTrash   = (p) => <Ic {...p} d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />;

// ── THEME ─────────────────────────────────────────────────────────
// Indigo accent, hairlines aur whitespace. Rang sirf ishara hai; laal sirf hatane par.
const T = {
  bg: "#F4F6F9", surface: "#FFFFFF", surfaceB: "#F8F9FB",
  t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", b2: "#D1D5DB",
  ind: "#4B45C4", indL: "#EEF2FF", indM: "#C7D2FE",
  red: "#DC2626", redL: "#FEF2F2", redM: "#FECACA",
  grn: "#059669",
};

// ── FORMAT ────────────────────────────────────────────────────────
const fmtLen = (m) => {
  const v = Number(m);
  if (m == null || !Number.isFinite(v) || v <= 0) return null;
  if (v < 1000) return `${Math.round(v).toLocaleString("en-IN")} m`;
  return `${Number((v / 1000).toFixed(1)).toLocaleString("en-IN")} km`;
};
const fmtArea = (sqm) => {
  const v = Number(sqm);
  if (sqm == null || !Number.isFinite(v) || v <= 0) return null;
  if (v < 10000) return `${Math.round(v).toLocaleString("en-IN")} m²`;
  return `${(v / 10000).toFixed(2)} ha`;
};
// Construction ki apni bhasha: 1,250 m = "1+250".
const fmtCh = (m) => {
  const v = Math.max(0, Math.round(Number(m) || 0));
  return `${Math.floor(v / 1000)}+${String(v % 1000).padStart(3, "0")}`;
};
const fmtDT = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) + ", " +
         dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// Server ka flag: sirf saaf "haan" maana jaata hai. Flag gayab / ajeeb = mana.
const yes = (v) => v === true || v === 1 || v === "1";

// ── GEOMETRY ──────────────────────────────────────────────────────
const cleanPts = (it) => (Array.isArray(it && it.pts) ? it.pts : [])
  .map((p) => ({ lat: Number(p && p.lat), lng: Number(p && p.lng) }))
  .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
// Kitne point hain us hisaab se asli shakl: 1 point ki "line" pin hai,
// 2 point ka "rakba" line hai. Map aur export dono isi se chalte hain.
const shapeOf = (kind, n) => {
  if (kind === "point" || n === 1) return "point";
  if (kind === "area" && n >= 3) return "area";
  return "line";
};

const kindLabel = (k) => (k === "area" ? t("map_library.kind_area") : k === "point" ? t("map_library.kind_point") : t("map_library.kind_line"));
const ATYPE = {
  inlet: () => t("map_library.atype_inlet"), outlet: () => t("map_library.atype_outlet"),
  rising: () => t("map_library.atype_rising"), gravity: () => t("map_library.atype_gravity"),
  drain: () => t("map_library.atype_drain"), road: () => t("map_library.atype_road"),
  other: () => t("map_library.atype_other"), ugr: () => t("map_library.atype_ugr"),
  pump_house: () => t("map_library.atype_pump_house"), hdd: () => t("map_library.atype_hdd"),
  valve: () => t("map_library.atype_valve"), culvert: () => t("map_library.atype_culvert"),
  chamber: () => t("map_library.atype_chamber"), plot: () => t("map_library.atype_plot"),
  building: () => t("map_library.atype_building"),
};
const atypeLabel = (a) => (a ? (ATYPE[a] ? ATYPE[a]() : String(a)) : null);

const KindIcon = ({ kind, size = 14, color }) => {
  if (kind === "area") return <IcArea size={size} color={color} />;
  if (kind === "point") return <IcPoint size={size} color={color} />;
  return <IcLine size={size} color={color} />;
};

// ── EXPORT (browser me banta hai, Blob se download) ───────────────
// File ke andar ka text data hai, UI nahi — isliye English, har bhasha me ek jaisa
// (GIS software aur consultant yahi padhte hain).
const xmlEsc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
  c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&apos;"));
const round2 = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100) / 100);

function kmlPlacemark(it, folderName) {
  const pts = cleanPts(it);
  if (!pts.length) return "";
  const cs = (arr) => arr.map((p) => `${p.lng},${p.lat},0`).join(" ");
  const shape = shapeOf(it.kind, pts.length);
  let geom;
  if (shape === "point") geom = `<Point><coordinates>${cs(pts.slice(0, 1))}</coordinates></Point>`;
  else if (shape === "area") {
    const ring = pts.slice();
    const a = ring[0], z = ring[ring.length - 1];
    if (a.lat !== z.lat || a.lng !== z.lng) ring.push(a);
    geom = `<Polygon><outerBoundaryIs><LinearRing><coordinates>${cs(ring)}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  } else geom = `<LineString><tessellate>1</tessellate><coordinates>${cs(pts)}</coordinates></LineString>`;
  const len = Number(it.lenM);
  const desc = [
    `Kind: ${it.kind || "line"}`,
    it.atype ? `Type: ${it.atype}` : "",
    len > 0 ? `Length: ${len.toFixed(1)} m` : "",
    Number(it.areaSqm) > 0 ? `Area: ${Number(it.areaSqm).toFixed(1)} sq m` : "",
    it.startCh != null && len > 0 ? `Chainage: ${fmtCh(it.startCh)} to ${fmtCh(Number(it.startCh) + len)}` : "",
    folderName ? `Folder: ${folderName}` : "",
    it.file ? `File: ${it.file}` : "",
    it.by ? `By: ${it.by}` : "",
  ].filter(Boolean).join(" | ");
  return `<Placemark><name>${xmlEsc(it.name)}</name><description>${xmlEsc(desc)}</description>${geom}</Placemark>`;
}

// groups: [{ name, items }] — folder export me har file ek KML <Folder>, file export me seedhi list.
function buildKml(docName, groups, folderName, nested) {
  const body = groups.map((g) => {
    const pm = g.items.map((it) => kmlPlacemark(it, folderName)).join("");
    return nested ? `<Folder><name>${xmlEsc(g.name)}</name>${pm}</Folder>` : pm;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc(docName)}</name>${body}</Document></kml>\n`;
}

function buildGeoJson(items, folderName) {
  return JSON.stringify({
    type: "FeatureCollection",
    features: items.map((it) => {
      const pts = cleanPts(it);
      const shape = shapeOf(it.kind, pts.length);
      const ll = (p) => [p.lng, p.lat];
      let geometry = null;
      if (pts.length && shape === "point") geometry = { type: "Point", coordinates: ll(pts[0]) };
      else if (shape === "area") {
        const ring = pts.map(ll);
        const a = ring[0], z = ring[ring.length - 1];
        if (a[0] !== z[0] || a[1] !== z[1]) ring.push(a);
        geometry = { type: "Polygon", coordinates: [ring] };
      } else if (pts.length >= 2) geometry = { type: "LineString", coordinates: pts.map(ll) };
      return {
        type: "Feature",
        properties: {
          name: it.name || "", kind: it.kind || "line",
          length_m: round2(it.lenM), area_sqm: round2(it.areaSqm),
          folder: folderName || null, file: it.file || null, by: it.by || null,
        },
        geometry,
      };
    }),
  }, null, 2);
}

function buildCsv(items, folderName) {
  const q = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["folder", "file", "name", "kind", "length_m", "area_sqm", "start_chainage_m", "points", "by", "created_at"];
  const rows = items.map((it) => [
    folderName || "", it.file || "", it.name || "", it.kind || "line",
    round2(it.lenM) ?? "", round2(it.areaSqm) ?? "", round2(it.startCh) ?? "",
    cleanPts(it).map((p) => `${p.lat.toFixed(7)} ${p.lng.toFixed(7)}`).join(";"),
    it.by || "", it.at || "",
  ]);
  // BOM: Excel UTF-8 pehchaan leta hai — Hindi naam ghich-pich nahi hote.
  return "\uFEFF" + [head, ...rows].map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
}

// Control character (0x00-0x1f) file ke naam se jaan-boojh kar hata rahe hain —
// Windows aise naam par save hi nahi karta.
// eslint-disable-next-line no-control-regex
const safeFileName = (s) => String(s || "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 80) || "site-mapping";
const saveText = (text, filename, mime) => {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};
const FORMATS = [
  { id: "kml", name: "KML", ext: "kml", mime: "application/vnd.google-earth.kml+xml" },
  { id: "geojson", name: "GeoJSON", ext: "geojson", mime: "application/geo+json" },
  { id: "csv", name: "CSV", ext: "csv", mime: "text/csv;charset=utf-8" },
];

// ── GOOGLE MAPS LOADER (is module ka apna, ek hi baar) ────────────
// Wahi REACT_APP_GOOGLE_MAPS_KEY jo Tenders / Machinery / Live location lete hain.
let _gmaps = null;
function loadGmaps(key) {
  if (window.google && window.google.maps) return Promise.resolve(window.google);
  if (_gmaps) return _gmaps;
  _gmaps = new Promise((resolve, reject) => {
    // Kisi aur module ne script pehle daal di ho to dobara nahi daalte (Google
    // "included multiple times" bolta hai) — uske taiyaar hone ka intezaar.
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      let n = 0;
      const iv = setInterval(() => {
        if (window.google && window.google.maps) { clearInterval(iv); resolve(window.google); }
        else if (++n > 75) { clearInterval(iv); _gmaps = null; reject(new Error("maps timeout")); }
      }, 200);
      return;
    }
    const cb = "__gmapsMapLib_" + Math.random().toString(36).slice(2);
    window[cb] = () => {
      try { delete window[cb]; } catch (_) { /* noop */ }
      if (window.google && window.google.maps) resolve(window.google);
      else { _gmaps = null; reject(new Error("maps missing")); }
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${cb}`;
    s.async = true; s.defer = true;
    s.onerror = () => { _gmaps = null; s.remove(); reject(new Error("maps load failed")); };
    document.head.appendChild(s);
  });
  return _gmaps;
}

// ── UI BITS ───────────────────────────────────────────────────────
// tone: ghost (default) · primary · danger (laal, sirf pakka hatane par) · danger-ghost
const Btn = ({ children, onClick, disabled, icon: Icon, tone = "ghost", size = "md", style = {}, title, autoFocus }) => {
  const solid = tone === "primary" || tone === "danger";
  const col = tone === "danger" ? T.red : T.ind;
  const edge = solid ? col : tone === "danger-ghost" ? T.redM : T.b1;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} autoFocus={autoFocus}
      style={{
        padding: size === "sm" ? "5px 10px" : "8px 14px", borderRadius: 7,
        border: `1px solid ${disabled ? T.b1 : edge}`,
        background: disabled ? T.surfaceB : solid ? col : T.surface,
        color: disabled ? T.t4 : solid ? "#FFFFFF" : tone === "danger-ghost" ? T.red : T.t2,
        fontSize: size === "sm" ? 11.5 : 12.5, fontWeight: 600, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center",
        gap: 6, whiteSpace: "nowrap", ...style,
      }}>
      {Icon && <Icon size={13} color="currentColor" />}{children}
    </button>
  );
};

function Modal({ title, onClose, children, footer, width = 460 }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)" }} />
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width, maxWidth: "100%", maxHeight: "90vh", background: T.surface, borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${T.b1}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{title}</div>
          <button type="button" onClick={onClose} aria-label={t("common.close")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: T.t3 }}>
            <IcX size={15} />
          </button>
        </div>
        <div style={{ padding: "16px 18px", overflowY: "auto" }}>{children}</div>
        {footer && <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.b1}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>{footer}</div>}
      </div>
    </div>
  );
}

// Loading / empty / adhikar nahi / error — chaaron alag dikhne chahiye.
// empty = dashed, shaant; error = laal kinara + retry; denied = taala.
const StateBox = ({ icon: Icon, tone, title, sub, action, spinner }) => (
  <div style={{
    background: tone === "empty" ? T.surfaceB : T.surface,
    border: tone === "error" ? `1px solid ${T.redM}` : tone === "empty" ? `1px dashed ${T.b2}` : `1px solid ${T.b1}`,
    borderRadius: 10, padding: "40px 24px", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  }}>
    {spinner && (
      <div style={{ width: 28, height: 28, border: `3px solid ${T.b1}`, borderTopColor: T.ind, borderRadius: "50%", animation: "mlibspin 0.7s linear infinite" }} />
    )}
    {Icon && (
      <div style={{ width: 44, height: 44, borderRadius: 22, background: tone === "error" ? T.redL : T.surfaceB, border: `1px solid ${tone === "error" ? T.redM : T.b1}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
        <Icon size={20} color={tone === "error" ? T.red : T.t3} />
      </div>
    )}
    <div style={{ fontSize: 14, fontWeight: 700, color: tone === "error" ? T.red : T.t1 }}>{title}</div>
    {sub && <div style={{ fontSize: 12.5, color: T.t3, maxWidth: 480, lineHeight: 1.5 }}>{sub}</div>}
    {action && <div style={{ marginTop: 8 }}>{action}</div>}
  </div>
);

const Toast = ({ toast }) => (toast ? (
  <div role="status"
    style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 24, zIndex: 10000, maxWidth: "min(460px, 92vw)", padding: "10px 16px", borderRadius: 8, background: toast.kind === "error" ? T.red : "#1F2937", color: "#FFFFFF", fontSize: 12.5, lineHeight: 1.45, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
    {toast.msg}
  </div>
) : null);

// ── MAP PREVIEW ───────────────────────────────────────────────────
// Line = polyline, rakba = polygon, point = marker; jo dikhaya usi par fit.
// Map na khule (key nahi / net / referrer) to chhota sa note — list aur export chalte rahein.
function MapPreview({ items, onPick, height = 380 }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef([]);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;
  const [status, setStatus] = useState(apiKey ? "loading" : "nokey");

  useEffect(() => {
    if (!apiKey) return undefined;
    let dead = false;
    loadGmaps(apiKey).then((g) => {
      if (dead || !boxRef.current) return;
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(boxRef.current, {
          center: { lat: 21.25, lng: 81.63 }, zoom: 6,
          mapTypeControl: true, streetViewControl: false, fullscreenControl: true,
        });
      }
      setStatus("ok");
    }).catch(() => { if (!dead) setStatus("err"); });
    return () => { dead = true; };
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ok" || !map || !window.google) return;
    const g = window.google;
    layersRef.current.forEach((l) => l.setMap(null));
    layersRef.current = [];
    const bounds = new g.maps.LatLngBounds();
    let n = 0;
    items.forEach((it) => {
      const pts = cleanPts(it);
      if (!pts.length) return;
      pts.forEach((p) => { bounds.extend(p); n++; });
      const shape = shapeOf(it.kind, pts.length);
      let ov;
      if (shape === "point") {
        ov = new g.maps.Marker({
          map, position: pts[0], title: it.name || "",
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 6, fillColor: T.ind, fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 2 },
        });
      } else if (shape === "area") {
        ov = new g.maps.Polygon({ map, paths: pts, strokeColor: T.ind, strokeOpacity: 0.9, strokeWeight: 2, fillColor: T.ind, fillOpacity: 0.15 });
      } else {
        ov = new g.maps.Polyline({ map, path: pts, strokeColor: T.ind, strokeOpacity: 0.9, strokeWeight: 4 });
      }
      ov.addListener("click", () => { if (pickRef.current) pickRef.current(it.id); });
      layersRef.current.push(ov);
    });
    if (n === 1) { map.setCenter(bounds.getCenter()); map.setZoom(17); }
    else if (n > 1) map.fitBounds(bounds, 48);
  }, [status, items]);

  useEffect(() => () => {
    layersRef.current.forEach((l) => l.setMap(null));
    layersRef.current = [];
  }, []);

  if (status === "nokey" || status === "err") {
    return (
      <div style={{ border: `1px dashed ${T.b2}`, borderRadius: 10, background: T.surfaceB, padding: "16px", display: "flex", alignItems: "center", gap: 10, color: T.t3, fontSize: 12.5 }}>
        <IcMap size={18} color={T.t4} />
        <span>{status === "nokey" ? t("map_library.map_key_nahi") : t("map_library.map_load_nahi")}</span>
      </div>
    );
  }
  const drawable = items.some((it) => cleanPts(it).length > 0);
  const note = { position: "absolute", left: 12, top: 12, padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.92)", border: `1px solid ${T.b1}`, fontSize: 12, color: T.t3, pointerEvents: "none" };
  return (
    <div style={{ position: "relative", height, borderRadius: 10, overflow: "hidden", border: `1px solid ${T.b1}`, background: "#EEF1F5" }}>
      <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />
      {status === "loading" && <div style={note}>{t("map_library.map_load_ho_raha")}</div>}
      {status === "ok" && !drawable && <div style={note}>{t("map_library.map_par_kuch_nahi")}</div>}
    </div>
  );
}

// ── TREE ──────────────────────────────────────────────────────────
// Folder hamesha ID se bante hain, NAAM se kabhi nahi. Do log ek hi naam ka
// folder bana sakte hain (server jaan-boojh kar alag rakhta hai) — naam par
// milane se ek aadmi ki marking doosre ke dabbe me dikhti, aur rename/delete
// galat folder par lagta. Naam dohraya ho to naam ke saath maalik dikhta hai.
const NONE = "none";
const fkOf = (fid) => (fid == null ? NONE : String(fid));
const nameKey = (s) => String(s || "").trim().toLowerCase();

function buildTree(data) {
  const groups = new Map();
  data.folders.forEach((f) => groups.set(String(f.id), { fk: String(f.id), id: f.id, folder: f, items: [], files: new Map() }));
  data.items.forEach((it) => {
    const fk = fkOf(it.folder_id);
    if (!groups.has(fk)) groups.set(fk, { fk, id: it.folder_id == null ? null : it.folder_id, folder: null, items: [], files: new Map() });
    const g = groups.get(fk);
    g.items.push(it);
    const file = String(it.file || "").trim();
    if (!g.files.has(file)) g.files.set(file, []);
    g.files.get(file).push(it);
  });
  const count = {};
  data.folders.forEach((f) => { const k = nameKey(f.name); count[k] = (count[k] || 0) + 1; });
  const list = [...groups.values()].map((g) => ({
    fk: g.fk, id: g.id, folder: g.folder, items: g.items,
    dup: !!(g.folder && count[nameKey(g.folder.name)] > 1),
    files: [...g.files.entries()]
      .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
      .map(([file, items]) => ({ file, items })),
  }));
  const nm = (g) => (g.folder ? String(g.folder.name || "") : "");
  list.sort((a, b) => {
    if (a.fk === NONE) return 1;
    if (b.fk === NONE) return -1;
    return nm(a).localeCompare(nm(b)) || (Number(a.id) - Number(b.id));
  });
  return list;
}

const folderTitle = (g) => (g.fk === NONE ? t("map_library.bina_folder")
  : (g.folder && g.folder.name) || t("map_library.folder_id", { id: g.id }));
// Naam dohraya ho to maalik; maalik ka naam na aaye (purana backend) to ID.
const folderOwner = (g) => (g.dup ? ((g.folder && g.folder.by) || `#${g.id}`) : null);
const fileTitle = (file) => file || t("map_library.bina_file");

function statsOf(items) {
  const s = { line: 0, area: 0, point: 0, len: 0, sqm: 0 };
  items.forEach((it) => {
    if (it.kind === "area") { s.area++; s.sqm += Number(it.areaSqm) || 0; }
    else if (it.kind === "point") s.point++;
    else { s.line++; s.len += Number(it.lenM) || 0; }
  });
  return s;
}
const statText = (s) => [
  s.line ? t("map_library.n_line", { n: s.line }) : null,
  s.area ? t("map_library.n_area", { n: s.area }) : null,
  s.point ? t("map_library.n_point", { n: s.point }) : null,
].filter(Boolean).join(" · ");

const inp = {
  width: "100%", padding: "9px 11px", borderRadius: 7, border: `1.5px solid ${T.b1}`,
  fontSize: 13, outline: "none", fontFamily: "inherit", color: T.t1, background: T.surface, boxSizing: "border-box",
};
const lbl = { display: "block", fontSize: 11, color: T.t3, fontWeight: 600, marginBottom: 5 };
const errBox = { marginTop: 10, padding: "8px 10px", borderRadius: 7, background: T.redL, border: `1px solid ${T.redM}`, color: T.red, fontSize: 12.5, lineHeight: 1.45 };
const meta = { fontSize: 11, color: T.t4, whiteSpace: "nowrap", flexShrink: 0 };
const nameStyle = (w) => ({ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, fontWeight: w, color: T.t1 });

function LibraryTree({ tree, sel, open, onToggle, onSelect, canSeeAll }) {
  const row = (active, depth) => ({
    display: "flex", alignItems: "center", gap: 7, cursor: "pointer", outline: "none",
    padding: `7px 10px 7px ${8 + depth * 18}px`,
    borderLeft: `3px solid ${active ? T.ind : "transparent"}`,
    background: active ? T.indL : "transparent",
  });
  const keys = (act) => ({
    role: "button", tabIndex: 0,
    onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } },
  });
  const chev = (key, isOpen) => (
    <button type="button" aria-expanded={isOpen} onClick={(e) => { e.stopPropagation(); onToggle(key); }}
      style={{ background: "none", border: "none", padding: 2, margin: 0, cursor: "pointer", display: "flex", color: T.t4 }}>
      {isOpen ? <IcChevD size={14} /> : <IcChevR size={14} />}
    </button>
  );
  return (
    <div>
      {tree.map((g) => {
        const gOpen = !!open[g.fk];
        const gActive = !!(sel && sel.type === "folder" && sel.fk === g.fk);
        const owner = folderOwner(g);
        const pickFolder = () => onSelect({ type: "folder", fk: g.fk });
        return (
          <div key={g.fk} style={{ borderBottom: `1px solid ${T.b1}` }}>
            <div {...keys(pickFolder)} onClick={pickFolder} style={row(gActive, 0)}>
              {chev(g.fk, gOpen)}
              <IcFolder size={15} color={gActive ? T.ind : T.t3} />
              <span style={nameStyle(700)}>
                {folderTitle(g)}
                {owner && <span style={{ fontWeight: 500, color: T.t4 }}>{" · "}{owner}</span>}
              </span>
              <span style={meta}>{t("map_library.n_files_n_marking", { files: g.files.length, n: g.items.length })}</span>
            </div>
            {gOpen && !g.files.length && (
              <div style={{ padding: "4px 10px 10px 49px", fontSize: 12, color: T.t4 }}>{t("map_library.folder_me_kuch_nahi")}</div>
            )}
            {gOpen && g.files.map((f) => {
              const k = `${g.fk}|${f.file}`;
              const fOpen = !!open[k];
              const fActive = !!(sel && sel.type === "file" && sel.fk === g.fk && sel.file === f.file);
              const len = fmtLen(statsOf(f.items).len);
              const pickFile = () => onSelect({ type: "file", fk: g.fk, file: f.file });
              return (
                <div key={k}>
                  <div {...keys(pickFile)} onClick={pickFile} style={row(fActive, 1)}>
                    {chev(k, fOpen)}
                    <IcFile size={14} color={fActive ? T.ind : T.t3} />
                    <span style={{ ...nameStyle(600), color: f.file ? T.t1 : T.t3 }}>{fileTitle(f.file)}</span>
                    <span style={meta}>{[t("map_library.n_marking", { n: f.items.length }), len].filter(Boolean).join(" · ")}</span>
                  </div>
                  {fOpen && f.items.map((it) => {
                    const active = !!(sel && sel.type === "item" && sel.id === it.id);
                    const size = it.kind === "area" ? fmtArea(it.areaSqm) : it.kind === "point" ? null : fmtLen(it.lenM);
                    const pickItem = () => onSelect({ type: "item", id: it.id, fk: g.fk, file: f.file });
                    return (
                      <div key={it.id} data-mlib-item={it.id} {...keys(pickItem)} onClick={pickItem} style={row(active, 2)}>
                        <span style={{ width: 18, flexShrink: 0 }} />
                        <KindIcon kind={it.kind} size={14} color={active ? T.ind : T.t3} />
                        <span style={nameStyle(500)}>{it.name}</span>
                        <span style={meta}>{[size, canSeeAll ? it.by : null].filter(Boolean).join(" · ")}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── DIALOGS ───────────────────────────────────────────────────────
// onSave / onConfirm: null = ho gaya (parent dialog band karta hai), string = server ka message.
function RenameDialog({ title, initial, onClose, onSave }) {
  const [v, setV] = useState(initial || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const clean = v.trim();
  const same = clean === String(initial || "").trim();
  const submit = async () => {
    if (!clean || same || busy) return;
    setBusy(true); setErr("");
    const msg = await onSave(clean);
    if (msg) { setErr(msg); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}
      footer={<>
        <Btn onClick={onClose} disabled={busy}>{t("common.cancel")}</Btn>
        <Btn tone="primary" onClick={submit} disabled={busy || !clean || same}>{t("common.save")}</Btn>
      </>}>
      <label style={lbl} htmlFor="mlib-rename">{t("map_library.naya_naam")}</label>
      <input id="mlib-rename" autoFocus value={v} maxLength={200} style={inp}
        onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
      {!clean && <div style={{ marginTop: 6, fontSize: 11.5, color: T.t4 }}>{t("map_library.naam_daalo")}</div>}
      {err && <div style={errBox}>{err}</div>}
    </Modal>
  );
}

function MoveDialog({ item, currentTitle, targets, onClose, onSave }) {
  const [pick, setPick] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async () => {
    const target = targets.find((o) => o.fk === pick);
    if (!target || busy) return;
    setBusy(true); setErr("");
    const msg = await onSave(target);
    if (msg) { setErr(msg); setBusy(false); }
  };
  return (
    <Modal title={t("map_library.folder_badlo")} onClose={busy ? () => {} : onClose}
      footer={<>
        <Btn onClick={onClose} disabled={busy}>{t("common.cancel")}</Btn>
        <Btn tone="primary" onClick={submit} disabled={busy || !pick}>{t("map_library.bhejo")}</Btn>
      </>}>
      <div style={{ fontSize: 13, color: T.t1, marginBottom: 4 }}>{t("map_library.kis_folder_me_bhejna", { name: item.name })}</div>
      <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 12 }}>{t("map_library.abhi_folder", { folder: currentTitle })}</div>
      {targets.length === 0 ? (
        <div style={{ fontSize: 12.5, color: T.t3, padding: "12px", border: `1px dashed ${T.b2}`, borderRadius: 8 }}>{t("map_library.koi_aur_folder_nahi")}</div>
      ) : (
        <div style={{ border: `1px solid ${T.b1}`, borderRadius: 8, maxHeight: 300, overflowY: "auto" }}>
          {targets.map((o) => (
            <label key={o.fk} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderBottom: `1px solid ${T.b1}`, cursor: "pointer", background: pick === o.fk ? T.indL : T.surface, fontSize: 12.5, color: T.t1 }}>
              <input type="radio" name="mlib-move" checked={pick === o.fk} onChange={() => setPick(o.fk)} />
              <IcFolder size={14} color={T.t3} />
              <span style={{ flex: 1, minWidth: 0 }}>
                {o.title}
                {o.owner && <span style={{ color: T.t4 }}>{" · "}{o.owner}</span>}
              </span>
            </label>
          ))}
        </div>
      )}
      {err && <div style={errBox}>{err}</div>}
    </Modal>
  );
}

// Hatane ka confirm: Cancel par focus (Enter dabane se kuch nahi hatega), laal
// button par naam ke saath saaf baat.
function ConfirmDialog({ title, message, confirmLabel, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    const msg = await onConfirm();
    if (msg) { setErr(msg); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}
      footer={<>
        <Btn onClick={onClose} disabled={busy} autoFocus>{t("common.cancel")}</Btn>
        <Btn tone="danger" icon={IcTrash} onClick={go} disabled={busy}>{confirmLabel}</Btn>
      </>}>
      <div style={{ fontSize: 13, color: T.t1, lineHeight: 1.6 }}>{message}</div>
      {err && <div style={errBox}>{err}</div>}
    </Modal>
  );
}

// ── HATAYI HUI ────────────────────────────────────────────────────
const deletedMeta = (row, isFolder) => {
  const by = row.deleted_by_name;
  const at = fmtDT(row.deleted_at);
  // Purani hatayi cheezon ka record nahi bana tha — jhootha naam nahi, saaf baat.
  if (!by && !at) return isFolder ? t("map_library.pehle_hataya_folder") : t("map_library.pehle_hatayi");
  return [by ? t("map_library.hatane_wala", { by }) : null, at].filter(Boolean).join(" · ");
};

function DeletedView({ state, onRetry, onRestore, busyKey }) {
  if (state.status === "error") {
    return (
      <StateBox icon={IcAlert} tone="error" title={t("map_library.deleted_load_nahi")} sub={state.error}
        action={<Btn icon={IcRefresh} onClick={onRetry}>{t("map_library.dobara_try_karo")}</Btn>} />
    );
  }
  if (state.status !== "ok") return <StateBox spinner title={t("map_library.deleted_load_ho_rahi")} />;
  const { folders, items } = state.data;
  if (!folders.length && !items.length) return <StateBox icon={IcTrash} tone="empty" title={t("map_library.kuch_hataya_nahi")} />;

  const rowStyle = { display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", borderBottom: `1px solid ${T.b1}` };
  const head = (txt, n) => (
    <div style={{ padding: "9px 14px", background: T.surfaceB, borderBottom: `1px solid ${T.b1}`, fontSize: 11, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px" }}>
      {txt} · {n}
    </div>
  );
  const restoreBtn = (key, fn) => (
    <Btn size="sm" icon={IcRefresh} onClick={fn} disabled={!!busyKey} style={{ color: T.ind, borderColor: T.indM }}>
      {busyKey === key ? "…" : t("map_library.wapas_lao")}
    </Btn>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {folders.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          {head(t("map_library.hataye_folder"), folders.length)}
          {folders.map((f) => (
            <div key={`f${f.id}`} style={rowStyle}>
              <IcFolder size={15} color={T.t3} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{f.name || t("map_library.folder_id", { id: f.id })}</div>
                <div style={{ fontSize: 11.5, color: T.t4, marginTop: 2 }}>
                  {[t("map_library.n_marking", { n: Number(f.count) || 0 }), deletedMeta(f, true)].join(" · ")}
                </div>
              </div>
              {restoreBtn(`f${f.id}`, () => onRestore("folder", f))}
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          {head(t("map_library.hatayi_marking"), items.length)}
          {items.map((it) => {
            const where = [it.folder || t("map_library.bina_folder"), it.file || null].filter(Boolean).join(" › ");
            const size = it.kind === "area" ? null : it.kind === "point" ? null : fmtLen(it.lenM);
            return (
              <div key={`i${it.id}`} style={rowStyle}>
                <KindIcon kind={it.kind} size={15} color={T.t3} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{it.name}</div>
                  <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>
                    {[where, size, it.by ? t("map_library.banayi_by", { by: it.by }) : null].filter(Boolean).join(" · ")}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.t4, marginTop: 2 }}>{deletedMeta(it, false)}</div>
                  {yes(it.folder_deleted) && (
                    <div style={{ fontSize: 11.5, color: T.t3, marginTop: 4 }}>{t("map_library.folder_bhi_hataya_hua", { folder: it.folder || "" })}</div>
                  )}
                </div>
                {restoreBtn(`i${it.id}`, () => onRestore("item", it))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MODULE
// ══════════════════════════════════════════════════════════════════
const EMPTY = [];
const failMsg = (r, fallback) => (!r || r._networkError ? t("map_library.net_error") : (r.message || fallback));
const normalizeLib = (d) => ({
  canSeeAll: !!(d && d.can_see_all),
  // perms / can_* naye field hain — purane backend par nahi aate, tab sab mana.
  perms: { export: yes(d && d.perms && d.perms.export), delete: yes(d && d.perms && d.perms.delete) },
  folders: (Array.isArray(d && d.folders) ? d.folders : []).filter((f) => f && f.id != null),
  items: (Array.isArray(d && d.items) ? d.items : []).filter((x) => x && x.id != null),
});
const sameSel = (a, b) => !!(a && b && a.type === b.type && a.fk === b.fk && a.file === b.file && a.id === b.id);

function MapLibraryModule() {
  const [view, setView] = useState("library");                                   // library | deleted
  const [lib, setLib] = useState({ status: "loading", data: null, error: "" });  // loading | ok | denied | error
  const [del, setDel] = useState({ status: "idle", data: null, error: "" });     // idle | loading | ok | error
  const [sel, setSel] = useState(null);
  const [open, setOpen] = useState({});
  const [dialog, setDialog] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const libRef = useRef(lib);
  libRef.current = lib;

  const flash = useCallback((msg, kind) => {
    setToast({ msg, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const loadLib = useCallback(async (mode) => {
    const r = await api.get("/map-library").catch(() => null);
    if (r && r.success) { setLib({ status: "ok", data: normalizeLib(r.data), error: "" }); return true; }
    if (r && r.code === "PERM_DENIED") { setLib({ status: "denied", data: null, error: "" }); return false; }
    const msg = failMsg(r, t("map_library.kuch_galat"));
    // Refresh fail ho to dikh raha data mat udao — sirf bata do.
    if (mode === "refresh" && libRef.current.status === "ok") flash(msg, "error");
    else setLib({ status: "error", data: null, error: msg });
    return false;
  }, [flash]);

  const loadDeleted = useCallback(async () => {
    setDel((cur) => (cur.status === "ok" ? cur : { status: "loading", data: null, error: "" }));
    const r = await api.get("/map-library/deleted").catch(() => null);
    if (r && r.success) {
      const d = r.data || {};
      setDel({ status: "ok", error: "", data: {
        folders: (Array.isArray(d.folders) ? d.folders : []).filter((f) => f && f.id != null),
        items: (Array.isArray(d.items) ? d.items : []).filter((x) => x && x.id != null),
      } });
    } else setDel({ status: "error", data: null, error: failMsg(r, t("map_library.kuch_galat")) });
  }, []);

  useEffect(() => { loadLib("first"); }, [loadLib]);
  useEffect(() => { if (view === "deleted") loadDeleted(); }, [view, loadDeleted]);

  const data = lib.data;
  const tree = useMemo(() => (data ? buildTree(data) : EMPTY), [data]);
  const canSeeAll = !!(data && data.canSeeAll);
  const perms = (data && data.perms) || { export: false, delete: false };

  // Delete ka adhikar chala gaya (refresh ke baad) to "Hatayi hui" par atke mat raho.
  useEffect(() => {
    if (view === "deleted" && lib.status === "ok" && !perms.delete) setView("library");
  }, [view, lib.status, perms.delete]);

  const info = useMemo(() => {
    if (!data) return null;
    if (!sel) return { type: "all", items: data.items };
    if (sel.type === "item") {
      const it = data.items.find((x) => x.id === sel.id);
      if (!it) return null;
      return { type: "item", item: it, group: tree.find((g) => g.fk === fkOf(it.folder_id)), file: String(it.file || "").trim(), items: [it] };
    }
    const g = tree.find((x) => x.fk === sel.fk);
    if (!g) return null;
    if (sel.type === "folder") return { type: "folder", group: g, items: g.items };
    const f = g.files.find((x) => x.file === sel.file);
    return f ? { type: "file", group: g, file: f.file, items: f.items } : null;
  }, [data, tree, sel]);
  // Chuni hui cheez refresh ke baad nahi rahi (kisi ne hata di) to sab par laut aao.
  useEffect(() => { if (data && sel && !info) setSel(null); }, [data, sel, info]);

  const select = (next) => {
    const same = sameSel(sel, next);
    setSel(next);
    if (next.type === "folder") setOpen((o) => ({ ...o, [next.fk]: same ? !o[next.fk] : true }));
    else if (next.type === "file") {
      const k = `${next.fk}|${next.file}`;
      setOpen((o) => ({ ...o, [k]: same ? !o[k] : true }));
    }
  };
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  // Map par kisi line/pin par click → ped me wahi marking khol kar dikhao.
  const reveal = (id) => {
    const it = data && data.items.find((x) => x.id === id);
    if (!it) return;
    const fk = fkOf(it.folder_id);
    const file = String(it.file || "").trim();
    setOpen((o) => ({ ...o, [fk]: true, [`${fk}|${file}`]: true }));
    setSel({ type: "item", id: it.id, fk, file });
    setTimeout(() => {
      const el = document.querySelector(`[data-mlib-item="${it.id}"]`);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }, 60);
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    if (lib.status === "ok") await loadLib("refresh");
    else { setLib({ status: "loading", data: null, error: "" }); await loadLib("first"); }
    if (view === "deleted") await loadDeleted();
    setRefreshing(false);
  };
  const retry = async () => { setLib({ status: "loading", data: null, error: "" }); await loadLib("first"); };
  // Kuch hata to "Hatayi hui" ki purani list bekaar — tab khulte hi dobara aayegi.
  const staleDeleted = () => setDel({ status: "idle", data: null, error: "" });

  // ── Actions — har ek sirf tab dikhta hai jab server ka flag haan kahe ──
  const renameItem = async (it, name) => {
    const r = await api.patch(`/map-library/${it.id}`, { name }).catch(() => null);
    if (!r || !r.success) return failMsg(r, t("map_library.save_nahi_hua"));
    setDialog(null);
    await loadLib("refresh");
    flash(t("map_library.naam_badal_gaya"));
    return null;
  };
  const moveItem = async (it, target) => {
    const r = await api.patch(`/map-library/${it.id}`, { folder_id: target.fk === NONE ? null : Number(target.id) }).catch(() => null);
    if (!r || !r.success) return failMsg(r, t("map_library.save_nahi_hua"));
    setDialog(null);
    const file = String(it.file || "").trim();
    setOpen((o) => ({ ...o, [target.fk]: true, [`${target.fk}|${file}`]: true }));
    setSel({ type: "item", id: it.id, fk: target.fk, file });
    await loadLib("refresh");
    flash(t("map_library.bhej_di", { name: it.name, folder: target.title }));
    return null;
  };
  const deleteItem = async (it) => {
    const r = await api.del(`/map-library/${it.id}`).catch(() => null);
    if (!r || !r.success) return failMsg(r, t("map_library.hata_nahi_saka"));
    setDialog(null);
    // File me aur marking bachi ho to file par, warna folder par, warna sab par.
    const fk = fkOf(it.folder_id);
    const file = String(it.file || "").trim();
    const g = tree.find((x) => x.fk === fk);
    const f = g && g.files.find((x) => x.file === file);
    setSel(f && f.items.length > 1 ? { type: "file", fk, file }
      : g && (g.folder || g.items.length > 1) ? { type: "folder", fk } : null);
    staleDeleted();
    await loadLib("refresh");
    flash(t("map_library.hat_gayi", { name: it.name }));
    return null;
  };
  const renameFolder = async (g, name) => {
    const r = await api.patch(`/map-library/folders/${g.id}`, { name }).catch(() => null);
    if (!r || !r.success) return failMsg(r, t("map_library.save_nahi_hua"));
    setDialog(null);
    await loadLib("refresh");
    flash(t("map_library.naam_badal_gaya"));
    return null;
  };
  const deleteFolder = async (g) => {
    // Folder me doosron ki marking ho to server 403 + saaf message deta hai — wahi dikhta hai.
    const r = await api.del(`/map-library/folders/${g.id}`).catch(() => null);
    if (!r || !r.success) return failMsg(r, t("map_library.hata_nahi_saka"));
    setDialog(null);
    setSel(null);
    staleDeleted();
    await loadLib("refresh");
    flash(t("map_library.folder_hat_gaya", { name: folderTitle(g) }));
    return null;
  };
  const restore = async (type, row) => {
    const key = `${type === "folder" ? "f" : "i"}${row.id}`;
    setRestoring(key);
    const url = type === "folder" ? `/map-library/folders/${row.id}/restore` : `/map-library/${row.id}/restore`;
    const r = await api.post(url, {}).catch(() => null);
    setRestoring(null);
    if (!r || !r.success) { flash(failMsg(r, t("map_library.wapas_nahi_aaya")), "error"); return; }
    flash(type === "folder"
      ? t("map_library.folder_wapas_aa_gaya", { name: row.name || "" })
      : t("map_library.wapas_aa_gayi", { name: row.name || "" }));
    await Promise.all([loadDeleted(), loadLib("refresh")]);
  };

  const doExport = (fmtId, inf) => {
    try {
      const items = inf.items;
      if (!items.length) { flash(t("map_library.export_khaali"), "error"); return; }
      const g = inf.group;
      const folderName = g && g.fk !== NONE ? ((g.folder && g.folder.name) || "") : "";
      const base = inf.type === "file" ? [folderName, fileTitle(inf.file)].filter(Boolean).join(" - ") : folderTitle(g);
      const fmt = FORMATS.find((x) => x.id === fmtId);
      let text;
      if (fmtId === "kml") {
        const groups = inf.type === "folder"
          ? g.files.map((f) => ({ name: fileTitle(f.file), items: f.items }))
          : [{ name: fileTitle(inf.file), items }];
        text = buildKml(base, groups, folderName, inf.type === "folder");
      } else if (fmtId === "geojson") text = buildGeoJson(items, folderName);
      else text = buildCsv(items, folderName);
      const filename = `${safeFileName(base)}.${fmt.ext}`;
      saveText(text, filename, fmt.mime);
      flash(t("map_library.export_hua", { file: filename }));
    } catch (e) {
      flash(t("map_library.export_fail"), "error");
    }
  };

  // ── Detail (map ke neeche) ─────────────────────────────────────
  const section = { marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.b1}` };
  const secHead = { fontSize: 10.5, fontWeight: 700, color: T.t3, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 };

  const renderDetail = () => {
    if (!info) return null;
    const st = statsOf(info.items);
    const g = info.group;
    const it = info.item;
    const folderRec = info.type === "folder" && g && g.folder ? g.folder : null;
    let head, crumbs = null, owner = null;
    if (info.type === "all") head = t("map_library.sab_marking");
    else if (info.type === "folder") {
      head = folderTitle(g);
      owner = folderRec && folderRec.by && (canSeeAll || g.dup) ? folderRec.by : null;
    } else if (info.type === "file") { head = fileTitle(info.file); crumbs = folderTitle(g); }
    else { head = it.name; crumbs = [g ? folderTitle(g) : t("map_library.bina_folder"), fileTitle(info.file)].join(" › "); }

    const HeadIcon = info.type === "folder" ? IcFolder : info.type === "file" ? IcFile : info.type === "all" ? IcMap : null;
    const summary = info.type === "item" ? null : [
      statText(st),
      fmtLen(st.len) ? t("map_library.line_lambai", { len: fmtLen(st.len) }) : null,
      fmtArea(st.sqm) ? t("map_library.rakba_total", { area: fmtArea(st.sqm) }) : null,
    ].filter(Boolean).join(" · ");

    const canExport = perms.export && (info.type === "folder" || info.type === "file") && info.items.length > 0;
    const itemEdit = info.type === "item" && yes(it.can_edit);
    const itemDelete = info.type === "item" && yes(it.can_delete);
    const folderEdit = !!(folderRec && yes(folderRec.can_edit));
    const folderDelete = !!(folderRec && yes(folderRec.can_delete));

    const facts = [];
    if (it) {
      const pts = cleanPts(it).length;
      facts.push([t("map_library.type"), [kindLabel(it.kind), atypeLabel(it.atype)].filter(Boolean).join(" · ")]);
      if (it.kind === "area") facts.push([t("map_library.rakba"), fmtArea(it.areaSqm) || "—"]);
      else if (it.kind !== "point") facts.push([t("map_library.lambai"), fmtLen(it.lenM) || "—"]);
      if (it.kind !== "point" && it.kind !== "area" && it.startCh != null) {
        const len = Number(it.lenM) || 0;
        facts.push([t("map_library.chainage"), len > 0 ? `${fmtCh(it.startCh)} – ${fmtCh(Number(it.startCh) + len)}` : fmtCh(it.startCh)]);
      }
      facts.push([t("map_library.gps_point"), String(pts)]);
      facts.push([t("map_library.banayi"), [canSeeAll ? it.by : null, fmtDT(it.at)].filter(Boolean).join(" · ") || "—"]);
    }

    return (
      <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.indL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {HeadIcon ? <HeadIcon size={16} color={T.ind} /> : <KindIcon kind={it.kind} size={16} color={T.ind} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {crumbs && <div style={{ fontSize: 11, color: T.t4, marginBottom: 1 }}>{crumbs}</div>}
            <div style={{ fontSize: 15, fontWeight: 700, color: T.t1, wordBreak: "break-word" }}>{head}</div>
            {owner && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 1 }}>{t("map_library.folder_owner", { by: owner })}</div>}
            {summary && <div style={{ fontSize: 12, color: T.t3, marginTop: 3 }}>{summary}</div>}
            {info.type === "all" && <div style={{ fontSize: 12, color: T.t4, marginTop: 6 }}>{t("map_library.kuch_select_karo")}</div>}
          </div>
        </div>

        {facts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "10px 16px", marginTop: 14 }}>
            {facts.map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10.5, color: T.t4, fontWeight: 600 }}>{k}</div>
                <div style={{ fontSize: 12.5, color: T.t1, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {canExport && (
          <div style={section}>
            <div style={secHead}>{t("common.export")}</div>
            <div style={{ fontSize: 11.5, color: T.t4, marginBottom: 8 }}>
              {info.type === "folder" ? t("map_library.export_note_folder", { n: info.items.length }) : t("map_library.export_note_file", { n: info.items.length })}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FORMATS.map((f) => <Btn key={f.id} icon={IcDown} onClick={() => doExport(f.id, info)}>{f.name}</Btn>)}
            </div>
          </div>
        )}

        {(itemEdit || folderEdit) && (
          <div style={section}>
            <div style={secHead}>{t("map_library.badlav")}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {itemEdit && <Btn onClick={() => setDialog({ kind: "rename-item", item: it })}>{t("map_library.naam_badlo")}</Btn>}
              {itemEdit && <Btn onClick={() => setDialog({ kind: "move-item", item: it })}>{t("map_library.folder_badlo")}</Btn>}
              {folderEdit && <Btn onClick={() => setDialog({ kind: "rename-folder", group: g })}>{t("map_library.naam_badlo")}</Btn>}
            </div>
          </div>
        )}

        {/* Hatana sabse neeche, apne laal kinare wale dabbe me — export ke paas kabhi nahi. */}
        {(itemDelete || folderDelete) && (
          <div style={{ marginTop: 26, padding: "12px 14px", border: `1px solid ${T.redM}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.red }}>{t("map_library.hatana")}</div>
              <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2, lineHeight: 1.5 }}>
                {itemDelete ? t("map_library.danger_note_item") : t("map_library.danger_note_folder")}
              </div>
            </div>
            {itemDelete && <Btn tone="danger-ghost" icon={IcTrash} onClick={() => setDialog({ kind: "delete-item", item: it })}>{t("map_library.hatao_ellipsis")}</Btn>}
            {folderDelete && <Btn tone="danger-ghost" icon={IcTrash} onClick={() => setDialog({ kind: "delete-folder", group: g })}>{t("map_library.folder_hatao_ellipsis")}</Btn>}
          </div>
        )}
      </div>
    );
  };

  const moveTargets = (it) => {
    const cur = fkOf(it.folder_id);
    const list = tree
      .filter((g) => g.folder && g.fk !== cur && yes(g.folder.can_put))
      .map((g) => ({ fk: g.fk, id: g.id, title: folderTitle(g), owner: folderOwner(g) }));
    return cur === NONE ? list : [{ fk: NONE, id: null, title: t("map_library.bina_folder"), owner: null }, ...list];
  };

  // ── Render ─────────────────────────────────────────────────────
  const delCount = del.status === "ok" ? del.data.folders.length + del.data.items.length : null;
  const tabs = lib.status === "ok" && perms.delete ? [
    { id: "library", label: t("map_library.tab_library") },
    { id: "deleted", label: delCount == null ? t("map_library.tab_deleted") : t("map_library.tab_deleted_n", { n: delCount }) },
  ] : EMPTY;
  const folderCount = tree.filter((g) => g.fk !== NONE).length;
  const fileCount = tree.reduce((a, g) => a + g.files.filter((f) => f.file).length, 0);

  let body;
  if (lib.status === "loading") body = <StateBox spinner title={t("map_library.load_ho_rahi")} />;
  else if (lib.status === "denied") {
    body = <StateBox icon={IcLock} title={t("map_library.adhikar_nahi")} sub={t("map_library.adhikar_nahi_sub")} />;
  } else if (lib.status === "error") {
    body = (
      <StateBox icon={IcAlert} tone="error" title={t("map_library.load_nahi_hui")} sub={lib.error}
        action={<Btn icon={IcRefresh} onClick={retry}>{t("map_library.dobara_try_karo")}</Btn>} />
    );
  } else if (view === "deleted") {
    body = <DeletedView state={del} onRetry={loadDeleted} onRestore={restore} busyKey={restoring} />;
  } else if (!data.folders.length && !data.items.length) {
    body = <StateBox icon={IcMap} tone="empty" title={t("map_library.library_empty")} sub={t("map_library.library_empty_sub")} />;
  } else {
    body = (
      <div className="mlib-grid">
        <div style={{ background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.t1 }}>
              {t("map_library.summary", { folders: folderCount, files: fileCount, n: data.items.length })}
            </div>
            {canSeeAll && <div style={{ fontSize: 11.5, color: T.t3, marginTop: 2 }}>{t("map_library.poori_company_ki_library")}</div>}
          </div>
          <div className="mlib-tree">
            <LibraryTree tree={tree} sel={sel} open={open} onToggle={toggle} onSelect={select} canSeeAll={canSeeAll} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <MapPreview items={info ? info.items : EMPTY} onPick={reveal} />
          {renderDetail()}
        </div>
      </div>
    );
  }

  const dItem = dialog && dialog.item;
  const dGroup = dialog && dialog.group;
  return (
    <div style={{ background: T.bg, minHeight: "100%", padding: "14px 18px 28px", fontFamily: "'Segoe UI',system-ui,sans-serif", color: T.t1, boxSizing: "border-box" }}>
      <style>{`.mlib-grid{display:grid;grid-template-columns:minmax(300px,400px) minmax(0,1fr);gap:14px;align-items:start}
.mlib-tree{max-height:calc(100vh - 200px);overflow-y:auto}
@media(max-width:900px){.mlib-grid{grid-template-columns:minmax(0,1fr)}.mlib-tree{max-height:none}}
@keyframes mlibspin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4, background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 8, padding: 3, visibility: tabs.length ? "visible" : "hidden" }}>
          {tabs.map((tb) => (
            <button key={tb.id} type="button" onClick={() => setView(tb.id)}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: view === tb.id ? 700 : 500, background: view === tb.id ? T.indL : "transparent", color: view === tb.id ? T.ind : T.t3 }}>
              {tb.label}
            </button>
          ))}
        </div>
        {lib.status !== "loading" && (
          <Btn icon={IcRefresh} onClick={refresh} disabled={refreshing}>{t("common.refresh")}</Btn>
        )}
      </div>

      {body}

      {dialog && dialog.kind === "rename-item" && (
        <RenameDialog title={t("map_library.marking_ka_naam_badlo")} initial={dItem.name}
          onClose={() => setDialog(null)} onSave={(name) => renameItem(dItem, name)} />
      )}
      {dialog && dialog.kind === "move-item" && (
        <MoveDialog item={dItem} targets={moveTargets(dItem)}
          currentTitle={dItem.folder_id == null ? t("map_library.bina_folder") : folderTitle(tree.find((g) => g.fk === fkOf(dItem.folder_id)) || { fk: fkOf(dItem.folder_id), id: dItem.folder_id })}
          onClose={() => setDialog(null)} onSave={(target) => moveItem(dItem, target)} />
      )}
      {dialog && dialog.kind === "delete-item" && (
        <ConfirmDialog title={t("map_library.marking_hatani_hai_title")}
          message={t("map_library.marking_hatani_hai", { name: dItem.name })}
          confirmLabel={t("map_library.haan_hatao")}
          onClose={() => setDialog(null)} onConfirm={() => deleteItem(dItem)} />
      )}
      {dialog && dialog.kind === "rename-folder" && (
        <RenameDialog title={t("map_library.folder_ka_naam_badlo")} initial={dGroup.folder ? dGroup.folder.name : ""}
          onClose={() => setDialog(null)} onSave={(name) => renameFolder(dGroup, name)} />
      )}
      {dialog && dialog.kind === "delete-folder" && (
        <ConfirmDialog title={t("map_library.folder_hatana_hai_title")}
          message={dGroup.items.length
            ? t("map_library.folder_hatana_hai_n", { name: folderTitle(dGroup), n: dGroup.items.length })
            : t("map_library.folder_hatana_hai_0", { name: folderTitle(dGroup) })}
          confirmLabel={t("map_library.haan_folder_hatao")}
          onClose={() => setDialog(null)} onConfirm={() => deleteFolder(dGroup)} />
      )}
      <Toast toast={toast} />
    </div>
  );
}

export default MapLibraryModule;
