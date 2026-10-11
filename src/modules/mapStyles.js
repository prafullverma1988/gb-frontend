// ══════════════════════════════════════════════════════════════════════
// MAP LIBRARY (web) — kaunsi line kis rang/style me, kaunsa structure kis
// shape/rang me. Company ki ek library, Tenders ka Pipeline Map aur Site
// Mapping dono isi se rangte hain. Rang SIRF type se aata hai (Prafull,
// 2026-09-24) — ek type = ek rang, naksha ek nazar me padha jaaye.
//
// Server: GET /tenders/alignments/feature-types (built-in + apne type, har
// ek ka style aur detail form), PUT …/feature-types/style (Tenders ya
// Mapping ka Edit), POST …/feature-types (naya type — Tenders ya Mapping ka
// Create).
//
// DETAIL FORM (L, 10 Oct 2026): har type ka apna form — sadak ki chaudai,
// damar / PCC, side nali; pipe ka material, dia, inlet / outlet; electrical
// HT / LT, volt, pole… Template (parivaar) se aata hai, admin badal / jod
// sakta hai. Value ki asli jaanch server karta hai; save kabhi nahi rukta —
// "zaroori" khaali ho to sirf "Detail adhoori".
// ══════════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useRef } from "react";
import api from "../config/api";
import { t } from "../i18n";
import PickSelect from "../components/PickSelect";

// ── Library ka ek hi cache — poore page par ek fetch ──────────────
let _lib = null;           // { list, canEdit, canCreate, templates }
let _p = null;
const _subs = new Set();
const notify = () => _subs.forEach((fn) => fn(_lib));
export function loadMapLibrary(force) {
  if (_p && !force) return _p;
  _p = api.get("/tenders/alignments/feature-types").then((r) => {
    if (r && r.success) {
      _lib = { list: Array.isArray(r.data) ? r.data : [], canEdit: !!r.can_edit, canCreate: !!r.can_create,
        templates: Array.isArray(r.templates) ? r.templates : [] };
      notify();
    }
    return _lib;
  }).catch(() => _lib);
  return _p;
}
export function useMapLibrary() {
  const [lib, setLib] = useState(_lib);
  useEffect(() => {
    _subs.add(setLib);
    loadMapLibrary();
    return () => { _subs.delete(setLib); };
  }, []);
  const reload = useCallback(() => loadMapLibrary(true), []);
  return { lib, reload };
}

// Library na aayi ho (net/purana server) to bhi naksha rangin rahe — wahi
// default jo server ka utils/mapStyles.js deta hai.
const LINE_DEF = { rising: "#DC2626", gravity: "#2563EB", inlet: "#059669", outlet: "#D97706", drain: "#0E7490", road: "#92400E", other: "#6B7280" };
const POINT_DEF = { ugr: ["tank", "#4338CA"], pump_house: ["pump", "#7C3AED"], hdd: ["diamond", "#DB2777"], valve: ["valve", "#0891B2"], culvert: ["square", "#92400E"], other: ["circle", "#6B7280"] };
const AREA_DEF = { ugr: "#4338CA", pump_house: "#7C3AED", chamber: "#0E7490", building: "#92400E", plot: "#059669", other: "#6B7280" };
export function styleOf(kind, code) {
  const k = kind === "point" || kind === "area" ? kind : "line";
  const hit = _lib && _lib.list.find((x) => x.kind === k && x.code === code);
  if (hit) return hit;
  if (k === "point") { const d = POINT_DEF[code] || ["circle", "#7C3AED"]; return { kind: k, code, shape: d[0], colour: d[1] }; }
  if (k === "area") return { kind: k, code, colour: AREA_DEF[code] || "#7C3AED", fill_opacity: 0.22 };
  return { kind: k, code, colour: LINE_DEF[code] || "#7C3AED", width: 4, dash: "solid" };
}
// Type ka naam — built-in i18n se, apna type apne naam se.
export function typeName(kind, code) {
  const hit = _lib && _lib.list.find((x) => x.kind === kind && x.code === code);
  if (hit && !hit.builtin) return hit.label || code;
  const key = `map_library.atype_${code}`;
  const s = t(key);
  return s && s !== key ? s : String(code || "");
}
// Kisi kind ke saare type — dropdown ke liye [code, naam].
export function typesFor(kind) {
  const list = _lib ? _lib.list.filter((x) => x.kind === kind) : null;
  if (list && list.length) return list.map((x) => [x.code, typeName(kind, x.code)]);
  const base = kind === "point" ? Object.keys(POINT_DEF) : kind === "area" ? Object.keys(AREA_DEF) : Object.keys(LINE_DEF);
  return base.map((c) => [c, typeName(kind, c)]);
}

// ── Type ka detail form ──────────────────────────────────────────
export function typeRow(kind, code) {
  const k = kind === "point" || kind === "area" ? kind : "line";
  return (_lib && _lib.list.find((x) => x.kind === k && x.code === code)) || null;
}
export function formOf(kind, code) {
  const r = typeRow(kind, code);
  return r && Array.isArray(r.fields) ? r.fields : [];
}
export function templateOf(kind, code) {
  const r = typeRow(kind, code);
  return (r && r.template) || null;
}
export function templatesFor(kind) {
  return ((_lib && _lib.templates) || []).filter((x) => (x.kinds || []).includes(kind));
}
const tplLabel = (key) => {
  const hit = ((_lib && _lib.templates) || []).find((x) => x.key === key);
  return hit ? hit.label : key;
};
const blank = (v) => v === undefined || v === null || v === "";
// Zaroori field jo khaali hain — unke naam.
export function missingOf(fields, props) {
  const p = props || {};
  return (fields || []).filter((f) => f.required && blank(p[f.key])).map((f) => f.label || f.key);
}
// Form me number TYPED STRING rehta hai (".6" likhte waqt NaN na bane) —
// bhejte waqt yahin number banta hai; khaali khaana bheja hi nahi jaata.
export function cleanProps(props) {
  if (!props) return undefined;
  const out = {};
  for (const [k, v] of Object.entries(props)) {
    if (blank(v)) continue;
    if (typeof v === "string") {
      const s2 = v.trim();
      if (!s2) continue;
      out[k] = /^-?\d*\.?\d+$/.test(s2) ? Number(s2) : s2;
    } else out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}
export function fieldValue(f, v) {
  if (blank(v)) return null;
  if (f.type === "bool") return v === true || v === "true" || v === 1 ? t("map_form.haan") : t("map_form.nahi");
  if (f.type === "select" || f.type === "side") {
    const o = (f.options || []).find((x) => String(x.v) === String(v));
    return o ? o.l : String(v);
  }
  if (f.type === "number" && f.unit) return `${v} ${f.unit}`;
  return String(v);
}

// ── Line ke saath ki cheezein (M2, 11 Oct 2026) ──────────────────
// Form ke "child" (naksha par structure — valve / manhole / pole…) aur "side"
// (bagal me line — nali / electrical) field. Har cheez ek asli marking hai
// jiska parent_id = line (server: utils/mapChildren.js).
export function childFields(kind, code) {
  return formOf(kind, code).filter((f) => (f.type === "child" || f.type === "side") && f.child);
}
// Har field ka haal: child → { done, plan }, side → { sides: ["left"…] }.
export function kidsSummary(line, kids) {
  const p = (line && line.props) || {};
  return childFields(line.kind, line.atype || "other").map((f) => {
    const mine = (kids || []).filter((k) => String(k.child_key || "").split(":")[0] === f.key);
    if (f.type === "side") return { f, sides: mine.map((k) => String(k.child_key).split(":")[1]).filter(Boolean) };
    const plan = Number(p[f.key]);
    return { f, done: mine.length, plan: Number.isFinite(plan) && plan > 0 ? plan : null };
  });
}
// Plan se kam lage hon to "Valve 5/8" — "Detail adhoori" me judta hai.
export function kidsShort(line, kids) {
  return kidsSummary(line, kids).filter((x) => x.plan && x.done < x.plan)
    .map((x) => `${x.f.child.label || x.f.label} ${x.done}/${x.plan}`);
}
// [naam, value] — sirf bhare hue, form ke kram me (card / detail ke liye).
export function propsRows(kind, code, props, hide) { return rowsOf(formOf(kind, code), props, hide); }
// Wahi, seedhe form se (line ki cheez ka form = line ke field ki andar wali detail).
export function rowsOf(fields, props, hide) {
  const p = props || {};
  return (fields || [])
    .filter((f) => !(hide || []).includes(f.key))
    .map((f) => [f.label || f.key, fieldValue(f, p[f.key])])
    .filter((r) => r[1] != null);
}

// Export / register ke liye: [key, kachchi value, label, dikhne wali] — GIS
// ka column key (har bhasha me ek jaisa), padhne ke liye label.
export function detailPairs(kind, code, props) { return pairsOf(formOf(kind, code), props); }
export function pairsOf(fields, props) {
  const p = props || {};
  const out = (fields || []).filter((f) => !blank(p[f.key]))
    .map((f) => [f.key, String(p[f.key]), f.label || f.key, fieldValue(f, p[f.key])]);
  if (Array.isArray(p.poles)) out.push(["poles", String(p.poles.length), t("map_form.pole_ginti"), String(p.poles.length)]);
  return out;
}

// Form — type chunte hi uske field. Chhoti list chips me (dobara dabao to
// khaali), lambi list picker me. hide: jo field is jagah alag se poochhe
// jaate hain (jaise tender me "Chaudai").
// noMap: map wale field (nishaan / bagal ki line) yahan nahi — MapPlacePanel me.
export function TypeDetailFields({ fields, value, onChange, hide, idPrefix = "tdf", noMap }) {
  const list = (fields || []).filter((f) => !(hide || []).includes(f.key) && !(noMap && isMapField(f)));
  if (!list.length) return null;
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  const inpS = { width: "100%", boxSizing: "border-box", padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12.5, fontFamily: "inherit", background: C.surface, color: C.t1 };
  const chipS = (on) => ({ padding: "4px 10px", borderRadius: 20, fontSize: 11.5, fontFamily: "inherit", cursor: "pointer",
    border: `1px solid ${on ? C.ind : C.b1}`, background: on ? C.indL : C.surface, color: on ? C.ind : C.t2, fontWeight: on ? 700 : 500 });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "10px 12px" }}>
      {list.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const miss = f.required && blank(v[f.key]);
        const opts = f.type === "bool" ? [[true, t("map_form.haan")], [false, t("map_form.nahi")]]
          : f.type === "select" || f.type === "side" ? (f.options || []).map((o) => [o.v, o.l]) : null;
        const asChips = opts && opts.length <= 6;
        const label = (
          <label htmlFor={asChips ? undefined : id} style={{ display: "block", fontSize: 11, color: C.t3, fontWeight: 600, marginBottom: 4 }}>
            {f.label}{f.unit ? ` (${f.unit})` : ""}
            {f.required && <span style={{ color: miss ? C.amb : C.t4 }}>{" *"}</span>}
          </label>
        );
        if (asChips) {
          return (
            <div key={f.key} style={{ gridColumn: "1 / -1" }}>
              {label}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {opts.map(([ov, ol]) => {
                  const on = f.type === "bool" ? (v[f.key] === ov || String(v[f.key]) === String(ov)) : String(v[f.key]) === String(ov);
                  return <button key={String(ov)} type="button" onClick={() => set(f.key, on ? "" : ov)} style={chipS(on)}>{ol}</button>;
                })}
              </div>
            </div>
          );
        }
        return (
          <div key={f.key}>
            {label}
            {opts ? (
              <PickSelect id={id} value={blank(v[f.key]) ? "" : String(v[f.key])} onChange={(e) => set(f.key, e.target.value)} style={inpS}>
                <option value="">—</option>
                {opts.map(([ov, ol]) => <option key={String(ov)} value={String(ov)}>{ol}</option>)}
              </PickSelect>
            ) : f.type === "number" || f.type === "child" ? (
              <input id={id} value={blank(v[f.key]) ? "" : String(v[f.key])} inputMode="decimal" placeholder="—" style={inpS}
                onChange={(e) => set(f.key, e.target.value.replace(/[^\d.]/g, ""))} />
            ) : (
              <input id={id} value={blank(v[f.key]) ? "" : String(v[f.key])} maxLength={200} placeholder="—" style={inpS}
                onChange={(e) => set(f.key, e.target.value)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sadak ki side nali — naksha par sadak ke bagal me patli dashed line ──
// Sirf dikhawa, alag marking nahi (Prafull ka 4th faisla, 10 Oct 2026).
// Sadak ke beech se (aadhi chaudai + aadhi nali) hat kar; chaudai na bhari
// ho to aam 7 m maan kar.
const EARTH_R = 6378137;
function offsetPath(pts, d) {
  const lat0 = (pts[0].lat * Math.PI) / 180;
  const xy = pts.map((p) => [((p.lng * Math.PI) / 180) * EARTH_R * Math.cos(lat0), ((p.lat * Math.PI) / 180) * EARTH_R]);
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
  return xy.map((q, i) => {
    let nx = 0, ny = 0;
    if (i > 0) { const n = nrm(xy[i - 1], q); nx += n[0]; ny += n[1]; }
    if (i < xy.length - 1) { const n = nrm(q, xy[i + 1]); nx += n[0]; ny += n[1]; }
    const L = Math.hypot(nx, ny) || 1;
    // mod par doori wahi rahe (miter), par tikhe mod par 3x se zyada nahi
    let k = 1;
    if (i > 0 && i < xy.length - 1) { const n1 = nrm(xy[i - 1], q); k = Math.min(3, 1 / Math.max(0.34, (nx / L) * n1[0] + (ny / L) * n1[1])); }
    const x = q[0] + (nx / L) * d * k, y = q[1] + (ny / L) * d * k;
    return { lat: ((y / EARTH_R) * 180) / Math.PI, lng: ((x / (EARTH_R * Math.cos(lat0))) * 180) / Math.PI };
  });
}
// pts = ek tukda; widthM = sadak ki chaudai (tender me alag column, library me props).
// kids = line ki asli bagal-wali nali (M1 ke baad) — wo ho to ye dikhawa nahi.
export function drainPaths(code, props, pts, widthM, kids) {
  const p = props || {};
  if (templateOf("line", code) !== "road" || !["left", "right", "both"].includes(p.drain_side)) return [];
  if ((kids || []).some((k) => String(k.child_key || "").startsWith("drain_side:"))) return [];
  if (!Array.isArray(pts) || pts.length < 2) return [];
  const w = Number(widthM) > 0 ? Number(widthM) : Number(p.width_m) > 0 ? Number(p.width_m) : 7;
  const dw = Number(p.drain_width_m) > 0 ? Number(p.drain_width_m) : 0.6;
  const d = w / 2 + dw / 2;
  const out = [];
  if (p.drain_side !== "right") out.push(offsetPath(pts, d));
  if (p.drain_side !== "left") out.push(offsetPath(pts, -d));
  return out;
}
export function drainLineOpts(g) {
  const st = styleOf("line", "drain");
  return lineOpts(g, { colour: st.colour, width: 2, dash: "dashed" }, { clickable: false, zIndex: 1 });
}
// ── Electrical line ke purane pole (10 Oct ka "⚡ Pole yahan" — props.poles).
// 11 Oct se pole asli marking hain ("Saath ki cheezein"); ye sirf purani
// line ke liye. Line ka har point ab pole nahi maana jaata.
export function polePoints(code, props, pts) {
  if (templateOf("line", code) !== "electrical" || !Array.isArray(pts) || pts.length < 2) return [];
  const p = props || {};
  if (p.pole === "none" || !Array.isArray(p.poles)) return [];
  return p.poles.map((q) => ({ lat: Number(q[0]), lng: Number(q[1]) })).filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.lng));
}
export function poleIcon(g, colour) {
  return { path: g.maps.SymbolPath.CIRCLE, scale: 3.6, fillColor: "#FFFFFF", fillOpacity: 1, strokeColor: colour, strokeWeight: 2 };
}

// ══════════════════════════════════════════════════════════════════════
// NAKSHA KE NISHAAN (N, 11 Oct 2026) — Prafull: "field ko map me dikhana hai
// to tick; line me dots, chhota cross line ya square box; kitne, aur auto /
// fixed distance / manual". Sadak ek line, baaki sab uske field (nali,
// electrical, pipe — apni detail ke saath; uske andar light / chamber / valve).
// Ganit server (utils/mapChildren.js, utils/lineOffset.js) jaisa hi — form
// me jo dikhe wahi save ho.
// ══════════════════════════════════════════════════════════════════════
export const MARK_KEYS = ["dot", "box", "cross", "triangle", "diamond", "star", "valve", "pump", "chamber", "tank"];
export const MARK_COLOURS = ["#2563EB", "#059669", "#D97706", "#EA580C", "#DC2626", "#7C3AED", "#0891B2", "#475569"];
const MARK_SHAPE = { dot: "circle", box: "square" };
export const markLabel = (m) => t(`map_form.mark_${m}`);
// Naksha par chhota nishaan. Cross = line ke aar-paar chhoti lakeer (rot =
// line ki disha, uttar se ghadi ki sui ki taraf).
export function markIcon(g, mark, colour, rot) {
  if (mark === "dot") return { path: g.maps.SymbolPath.CIRCLE, scale: 4.5, fillColor: colour, fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 1.5 };
  if (mark === "cross") return { path: "M0 -8 L0 8", strokeColor: colour, strokeOpacity: 1, strokeWeight: 3.5, rotation: (Number(rot) || 0) + 90, scale: 1 };
  const d = SHAPES[MARK_SHAPE[mark] || mark] || SHAPES.square;
  return { path: d, anchor: new g.maps.Point(12, 12), scale: 0.62, fillColor: colour, fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 1.2 };
}
export function MarkIcon({ mark, colour, size = 16 }) {
  if (mark === "line") return <LineSample colour={colour} width={3} w={size + 8} />;
  if (mark === "cross") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12h20" stroke={C.t4} strokeWidth="1.5" />
        <path d="M12 3v18" stroke={colour} strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (mark === "dot") return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill={colour} /></svg>;
  return <ShapeIcon shape={MARK_SHAPE[mark] || mark} colour={colour} size={size} />;
}

// ── Line ka ganit (server jaisa) ──
const M_LAT = 111320;
export function offsetSide(coords, dist, side) {
  const clean = [];
  for (const p of coords || []) {
    const lat = Number(p && p.lat), lng = Number(p && p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const last = clean[clean.length - 1];
    if (last && Math.abs(last.lat - lat) < 1e-9 && Math.abs(last.lng - lng) < 1e-9) continue;
    clean.push({ lat, lng });
  }
  if (clean.length < 2 || !(Math.abs(dist) > 0)) return [];
  const lat0 = clean.reduce((m, p) => m + p.lat, 0) / clean.length;
  const kx = M_LAT * Math.cos((lat0 * Math.PI) / 180);
  const xy = clean.map((p) => ({ x: p.lng * kx, y: p.lat * M_LAT }));
  const d = Math.abs(dist) * (side === "right" ? -1 : 1);
  const nrm = (v) => { const L = Math.hypot(v.x, v.y); return L === 0 ? { x: 0, y: 0 } : { x: v.x / L, y: v.y / L }; };
  const segN = [];
  for (let i = 0; i + 1 < xy.length; i++) { const dir = nrm({ x: xy[i + 1].x - xy[i].x, y: xy[i + 1].y - xy[i].y }); segN.push({ x: -dir.y, y: dir.x }); }
  return xy.map((p, i) => {
    const a = segN[i - 1], b = segN[i];
    let n;
    if (!a) n = b; else if (!b) n = a;
    else { const s2 = nrm({ x: a.x + b.x, y: a.y + b.y }); const c = s2.x * a.x + s2.y * a.y; const k = c > 0.2 ? 1 / c : 5; n = { x: s2.x * k, y: s2.y * k }; }
    return { lat: (p.y + n.y * d) / M_LAT, lng: (p.x + n.x * d) / kx };
  });
}
// Asli chaudai ki patti (paas zoom par): bayan kinara + ulta daayan.
export function corridor(coords, w) {
  if (!(Number(w) > 0)) return [];
  const l = offsetSide(coords, w / 2, "left"), r = offsetSide(coords, w / 2, "right");
  return l.length > 1 && r.length > 1 ? [...l, ...r.slice().reverse()] : [];
}
const WIDTH_KEYS = ["width_m", "top_width_m", "chaudai", "chaudai_m", "width"];
export function widthOfProps(pp) {
  const q = pp || {};
  for (const k of WIDTH_KEYS) if (Number(q[k]) > 0) return Number(q[k]);
  return Number(q.dia_mm) > 0 ? Number(q.dia_mm) / 1000 : 0;
}
export const linePartsOf = (pts, gaps) => partsOfPts(pts, gaps).filter((p) => p.length >= 2);
export const lineLenOf = (parts) => lineLen(parts);
export function pointAtCh(parts, ch) {
  let cum = 0, last = null;
  for (const p of parts) {
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], m = hav(a, b);
      if (ch <= cum + m) { const f = m > 0 ? Math.max(0, Math.min(1, (ch - cum) / m)) : 0; return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }; }
      cum += m; last = b;
    }
  }
  return last;
}
// Point → line par sabse paas: { d (m), ch, pt, brg (disha) }.
export function projectOn(parts, q) {
  let best = null, cum = 0;
  for (const p of parts) {
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], m = hav(a, b);
      const kx = 111320 * Math.cos((a.lat * Math.PI) / 180), ky = 110540;
      const bx = (b.lng - a.lng) * kx, by = (b.lat - a.lat) * ky, px = (q.lng - a.lng) * kx, py = (q.lat - a.lat) * ky;
      const L2 = bx * bx + by * by;
      const f = L2 ? Math.max(0, Math.min(1, (px * bx + py * by) / L2)) : 0;
      const d = Math.hypot(px - f * bx, py - f * by);
      if (!best || d < best.d) best = { d, ch: cum + f * m, pt: { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f }, brg: (Math.atan2(bx, by) * 180) / Math.PI };
      cum += m;
    }
  }
  return best;
}
export function chainagesFor(mode, L, o) {
  const MAXN = 2000;
  if (mode === "auto") {
    const n = Math.min(MAXN, Math.round(Number(o.qty) || 0));
    if (n < 1) return [];
    if (n === 1) return [L / 2];
    return Array.from({ length: n }, (_, i) => (L * i) / (n - 1));
  }
  const e = Number(o.every_m);
  if (!(e >= 1)) return [];
  const s0 = Math.max(0, Math.min(L, Number(o.start_m) || 0));
  const most = Number(o.cap) >= 1 ? Math.min(MAXN, Math.round(Number(o.cap))) : MAXN;
  const out = [];
  for (let c = s0; c <= L + 1 && out.length < most; c += e) out.push(Math.min(c, L));
  return out;
}
// Bagal ki line: sadak ki aadhi chaudai + kinare se chhoot + line ki aadhi chaudai.
export function sideGeom(pts, gaps, W, gap, w, side) {
  const off = (Number(W) > 0 ? Number(W) : 7) / 2 + (Number(gap) >= 0 ? Number(gap) : 1) + (Number(w) > 0 ? Number(w) : 0) / 2;
  const out = [], gs = [];
  for (const part of linePartsOf(pts, gaps)) {
    const q = offsetSide(part, off, side);
    if (q.length < 2) continue;
    if (out.length) gs.push(out.length);
    out.push(...q);
  }
  return { pts: out, gaps: gs };
}

// ── Kis field ne banaya (line ki cheez) ──
// byId: id → item (library / tender list). Cheez ka form = line ke us field
// ki andar wali detail (sub); purana field (sub nahi) = cheez ke type ka form.
export function fieldOfItem(it, byId, depth = 0) {
  if (!it || it.parent_id == null || !byId || depth > 3) return null;
  const p = byId.get(it.parent_id);
  if (!p) return null;
  const key = String(it.child_key || "").split(":")[0];
  return (formOfItem(p, byId, depth + 1) || []).find((f) => f.key === key && f.child) || null;
}
export function formOfItem(it, byId, depth = 0) {
  const f = fieldOfItem(it, byId, depth);
  if (f && Array.isArray(f.sub) && f.sub.length) return f.sub;
  return formOf(it.kind, it.atype || "other");
}
// Naksha par kaisa: field ka nishaan / rang, warna type ka.
export function kidLook(it, byId) {
  const f = fieldOfItem(it, byId);
  const st = styleOf(it.kind, it.atype || "other");
  return { f, colour: (f && f.color) || st.colour, mark: f ? (f.type === "side" ? "line" : f.mark || "dot") : null, label: f ? f.label : null };
}
// Line ka form — andar ke field bhi (bagal ki line ke) — "Kitne / adhoore" ke liye.
export function mapFieldsOf(fields) { return (fields || []).filter((f) => (f.type === "child" || f.type === "side") && f.child); }
// Field ki andar wali detail; na ho / khaali ho to us cheez ke type ka form (server jaisa).
export const subOf = (f) => (Array.isArray(f.sub) && f.sub.length ? f.sub : formOf(f.child.kind, f.child.code));

// ── Taiyar shapes — 24×24 box, beech (12,12) par ─────────────────
export const SHAPES = {
  circle:   "M12 3a9 9 0 1 0 0.01 0z",
  square:   "M4 4h16v16H4z",
  triangle: "M12 3l10 18H2z",
  diamond:  "M12 2l10 10-10 10L2 12z",
  star:     "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z",
  hexagon:  "M12 2l8.7 5v10L12 22l-8.7-5V7z",
  // OHT/UGR — upar tanki, neeche do paaye
  tank:     "M5 3h14v9H5zM7 12l-2 9h2l2-9zM17 12l2 9h-2l-2-9z",
  // Pump — gol ke andar teer
  pump:     "M12 3a9 9 0 1 0 0.01 0zM9 8v8l7-4z",
  // Valve — do trikon aamne-saamne (⧓)
  valve:    "M3 5l9 7-9 7zM21 5l-9 7 9 7z",
  // Chamber — chaukor ke andar bindu
  chamber:  "M4 4h16v16H4zM12 9a3 3 0 1 0 0.01 0z",
  // Plus (Cross nishaan wala type) — 11 Oct 2026
  cross:    "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z",
};
export const SHAPE_KEYS = Object.keys(SHAPES);
const shapeLabel = (s) => t(`map_style.shape_${s}`);

// Google Marker ka icon.
export function markerIcon(g, st, px = 24) {
  return {
    path: SHAPES[st.shape] || SHAPES.circle, fillColor: st.colour, fillOpacity: 1,
    strokeColor: "#FFFFFF", strokeWeight: 1.5, scale: px / 24, anchor: new g.maps.Point(12, 12),
    labelOrigin: new g.maps.Point(12, 30),
  };
}
// Polyline ke options — seedhi / dashed / dotted.
export function lineOpts(g, st, extra) {
  const w = Number(st.width) || 4;
  const base = { strokeColor: st.colour, strokeWeight: w, strokeOpacity: 0.95, ...(extra || {}) };
  if (st.dash === "dashed") {
    return { ...base, strokeOpacity: 0,
      icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: st.colour, strokeWeight: w, scale: Math.max(2, w) }, offset: "0", repeat: `${w * 5}px` }] };
  }
  if (st.dash === "dotted") {
    return { ...base, strokeOpacity: 0,
      icons: [{ icon: { path: g.maps.SymbolPath.CIRCLE, fillColor: st.colour, fillOpacity: 1, strokeOpacity: 0, scale: Math.max(1.5, w / 2) }, offset: "0", repeat: `${w * 3}px` }] };
  }
  return base;
}

// ── Preview (library ki khidki, chips, legend) ───────────────────
export function ShapeIcon({ shape, colour, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, display: "block" }}>
      <path d={SHAPES[shape] || SHAPES.circle} fill={colour} stroke="#FFFFFF" strokeWidth="1.2" fillRule="evenodd" />
    </svg>
  );
}
export function LineSample({ colour, width = 4, dash = "solid", w = 44 }) {
  const da = dash === "dashed" ? `${width * 2.5},${width * 1.6}` : dash === "dotted" ? `0.1,${width * 1.8}` : undefined;
  return (
    <svg width={w} height={Math.max(12, width + 6)} style={{ flexShrink: 0, display: "block" }}>
      <line x1={width} x2={w - width} y1="50%" y2="50%" stroke={colour} strokeWidth={width} strokeLinecap="round" strokeDasharray={da} />
    </svg>
  );
}
export function StyleSwatch({ kind, code, size = 16 }) {
  const st = styleOf(kind, code);
  if (kind === "point") return <ShapeIcon shape={st.shape} colour={st.colour} size={size} />;
  if (kind === "area") return <span style={{ width: size, height: size - 4, borderRadius: 3, background: st.colour, opacity: 0.35 + (Number(st.fill_opacity) || 0.2), border: `1.5px solid ${st.colour}`, display: "inline-block", flexShrink: 0 }} />;
  return <LineSample colour={st.colour} width={Math.min(6, Number(st.width) || 4)} dash={st.dash} w={size + 12} />;
}

// ══════════════════════════════════════════════════════════════════
// LIBRARY KI KHIDKI — dono naksho se khulti hai
// ══════════════════════════════════════════════════════════════════
const C = {
  surface: "#FFFFFF", surfaceB: "#F8F9FB", t1: "#111827", t2: "#374151", t3: "#6B7280", t4: "#9CA3AF",
  b1: "#E5E7EB", ind: "#4B45C4", indL: "#EEF2FF", red: "#DC2626", redL: "#FEF2F2", amb: "#B45309",
};
const FIELD_TYPES = [["number", "map_form.ft_number"], ["select", "map_form.ft_select"], ["bool", "map_form.ft_bool"], ["text", "map_form.ft_text"]];
const MODES = [["auto", "map_form.mode_auto"], ["interval", "map_form.mode_interval"], ["manual", "map_form.mode_manual"]];
const isMapField = (f) => !!(f && (f.type === "child" || f.type === "side") && f.child);
// Field ki ek line ki pehchaan (editor me naam ke neeche).
const fieldTypeText = (f) => {
  if (f.type === "select") return `${t("map_form.ft_select")}: ${(f.options || []).slice(0, 4).map((o) => o.l).join(", ")}${(f.options || []).length > 4 ? "…" : ""}`;
  if (f.type === "side" && f.child) return [markLabel("line"), t("map_form.kinare_se_txt", { m: f.offset_m == null ? 1 : f.offset_m })].join(" · ");
  if (f.type === "child" && f.child) {
    const how = f.mode === "interval" && f.every_m ? t("map_form.har_m_shuru", { m: f.every_m, s: f.start_m || 0 })
      : t((MODES.find((x) => x[0] === f.mode) || MODES[2])[1]);
    return [markLabel(f.mark || "dot"), how, f.beside ? t("map_form.bagal_me_bhi_short") : null].filter(Boolean).join(" · ");
  }
  return t((FIELD_TYPES.find((x) => x[0] === f.type) || FIELD_TYPES[3])[1]);
};
// Admin ke naye field ki chaabi — naam se; Hindi naam ho to apni chaabi.
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
const WIDTHS = [[2, "map_style.width_patli"], [4, "map_style.width_beech"], [6, "map_style.width_moti"], [9, "map_style.width_bahut_moti"]];
const DASHES = [["solid", "map_style.dash_solid"], ["dashed", "map_style.dash_dashed"], ["dotted", "map_style.dash_dotted"]];
const FILLS = [[0.12, "map_style.fill_halka"], [0.22, "map_style.fill_beech"], [0.4, "map_style.fill_gehra"]];

export function MapLibraryDialog({ onClose }) {
  const { lib, reload } = useMapLibrary();
  const [tab, setTab] = useState("line");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);          // khula row: kind:code
  const [add, setAdd] = useState(null);            // { label, colour, shape, template }
  const [draft, setDraft] = useState(null);        // { key, fields } — form badla, abhi save nahi
  const canEdit = !!(lib && lib.canEdit);
  const canCreate = !!(lib && lib.canCreate);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const save = async (row, patch) => {
    const next = { kind: row.kind, code: row.code, colour: row.colour, shape: row.shape, width: row.width, dash: row.dash, fill_opacity: row.fill_opacity, ...patch };
    setBusy(`${row.kind}:${row.code}`); setErr("");
    const r = await api.put("/tenders/alignments/feature-types/style", next).catch(() => null);
    setBusy("");
    if (!r || !r.success) { setErr((r && r.message) || t("map_style.save_nahi_hua")); return; }
    await reload();
  };
  // Form (fields / template) — rang chhede bina. fields null = template wala form wapas.
  const saveForm = async (row, body) => {
    setBusy(`${row.kind}:${row.code}`); setErr("");
    const r = await api.put("/tenders/alignments/feature-types/style", { kind: row.kind, code: row.code, ...body }).catch(() => null);
    setBusy("");
    if (!r || !r.success) { setErr((r && r.message) || t("map_style.save_nahi_hua")); return; }
    setDraft(null);
    await reload();
  };
  const create = async () => {
    const label = String(add.label || "").trim();
    if (!label) { setErr(t("map_style.naam_daalo")); return; }
    setBusy("new"); setErr("");
    const r = await api.post("/tenders/alignments/feature-types", { label, kind: tab, colour: add.colour, shape: add.shape, template: add.template || undefined }).catch(() => null);
    setBusy("");
    if (!r || !r.success) { setErr((r && r.message) || t("map_style.save_nahi_hua")); return; }
    setAdd(null); await reload();
  };

  const rows = lib ? lib.list.filter((x) => x.kind === tab) : [];
  const chip = (on, label, onClick, key, extra) => (
    <button key={key} type="button" onClick={onClick} disabled={!canEdit || !!busy}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, fontSize: 11.5, fontFamily: "inherit",
        cursor: canEdit ? "pointer" : "default", border: `1px solid ${on ? C.ind : C.b1}`, background: on ? C.indL : C.surface,
        color: on ? C.ind : C.t2, fontWeight: on ? 700 : 500 }}>
      {extra}{label}
    </button>
  );
  const editor = (row) => (
    <div style={{ padding: "10px 14px 12px 50px", background: C.surfaceB, borderTop: `1px dashed ${C.b1}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: C.t3, width: 70 }}>{t("map_style.rang")}</span>
        <input type="color" value={row.colour} disabled={!canEdit || !!busy} onChange={(e) => save(row, { colour: e.target.value })}
          style={{ width: 40, height: 26, border: `1px solid ${C.b1}`, borderRadius: 6, padding: 0, background: "none", cursor: canEdit ? "pointer" : "default" }} />
        <span style={{ fontSize: 11.5, color: C.t4, fontFamily: "monospace" }}>{row.colour}</span>
      </div>
      {row.kind === "point" && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 11, color: C.t3, width: 70, paddingTop: 5 }}>{t("map_style.shape")}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SHAPE_KEYS.map((s) => chip(row.shape === s, shapeLabel(s), () => save(row, { shape: s }), s, <ShapeIcon shape={s} colour={row.colour} size={16} />))}
          </div>
        </div>
      )}
      {row.kind === "line" && (<>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: C.t3, width: 70 }}>{t("map_style.motai")}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {WIDTHS.map(([w, k]) => chip(Number(row.width) === w, t(k), () => save(row, { width: w }), String(w)))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: C.t3, width: 70 }}>{t("map_style.style")}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DASHES.map(([d, k]) => chip(row.dash === d, t(k), () => save(row, { dash: d }), d, <LineSample colour={row.colour} width={3} dash={d} w={26} />))}
          </div>
        </div>
      </>)}
      {row.kind === "area" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: C.t3, width: 70 }}>{t("map_style.bharaav")}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {FILLS.map(([f, k]) => chip(Math.abs(Number(row.fill_opacity) - f) < 0.03, t(k), () => save(row, { fill_opacity: f }), String(f)))}
          </div>
        </div>
      )}
      {formEditor(row)}
    </div>
  );
  const smallBtn = (primary) => ({ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: primary ? 700 : 500,
    border: primary ? "none" : `1px solid ${C.b1}`, background: primary ? C.ind : C.surface, color: primary ? "#fff" : C.t2 });
  const inpS = { padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box", background: C.surface };
  // Detail form — template ka, ya badla hua. Badlav pehle draft me, "Form save
  // karo" par ek saath (field jodna / hatana / zaroori kai kadam ka kaam hai).
  const formEditor = (row) => {
    const key = `${row.kind}:${row.code}`;
    const dirty = !!(draft && draft.key === key);
    const fields = dirty ? draft.fields : (Array.isArray(row.fields) ? row.fields : []);
    const edit = (next) => setDraft({ key, fields: next });
    const tpls = templatesFor(row.kind);
    return (
      <div style={{ borderTop: `1px solid ${C.b1}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: C.t3, width: 70 }}>{t("map_form.detail_form")}</span>
          {row.builtin || !canEdit ? (
            <span style={{ fontSize: 12, color: C.t2 }}>{row.template ? tplLabel(row.template) : t("map_form.koi_template_nahi")}</span>
          ) : (
            <PickSelect value={row.template || ""} onChange={(e) => saveForm(row, { template: e.target.value || null })} disabled={!!busy}
              style={{ ...inpS, minWidth: 200 }}>
              <option value="" disabled>{t("map_form.template_chuno")}</option>
              {tpls.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
            </PickSelect>
          )}
          {row.fields_custom && <span style={{ fontSize: 10.5, color: C.t4 }}>{t("map_form.form_badla_hua")}</span>}
        </div>
        <FieldsEditor key={key} fields={fields} onChange={edit} canEdit={canEdit} busy={!!busy} setErr={setErr} />
        {canEdit && (dirty || (row.fields_custom && row.template)) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dirty && <button type="button" disabled={!!busy} onClick={() => saveForm(row, { fields: draft.fields })} style={smallBtn(true)}>{t("map_form.form_save")}</button>}
            {dirty && <button type="button" disabled={!!busy} onClick={() => setDraft(null)} style={smallBtn(false)}>{t("common.cancel")}</button>}
            {!dirty && row.fields_custom && row.template && (
              <button type="button" disabled={!!busy} onClick={() => saveForm(row, { fields: null })} style={smallBtn(false)}>{t("map_form.template_wapas")}</button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9995, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{ width: 640, maxWidth: "100%", maxHeight: "88vh", background: C.surface, borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.b1}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.t1 }}>{t("map_style.title")}</div>
            <div style={{ fontSize: 11.5, color: C.t3, marginTop: 2, lineHeight: 1.45 }}>{t("map_style.sub")}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "10px 18px 0" }}>
          {[["line", "map_style.tab_line"], ["point", "map_style.tab_point"], ["area", "map_style.tab_area"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setTab(k); setOpen(null); setAdd(null); setDraft(null); }}
              style={{ padding: "7px 14px", border: "none", borderBottom: `2px solid ${tab === k ? C.ind : "transparent"}`, background: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: tab === k ? 700 : 500, color: tab === k ? C.ind : C.t3 }}>{t(l)}</button>
          ))}
        </div>
        {!canEdit && lib && (
          <div style={{ margin: "10px 18px 0", padding: "7px 10px", borderRadius: 7, background: C.surfaceB, border: `1px solid ${C.b1}`, fontSize: 11.5, color: C.t3 }}>{t("map_style.sirf_dekh_sakte")}</div>
        )}
        {err && <div style={{ margin: "10px 18px 0", padding: "7px 10px", borderRadius: 7, background: C.redL, color: C.red, fontSize: 12 }}>{err}</div>}
        <div style={{ overflowY: "auto", padding: "10px 18px 16px" }}>
          {!lib && <div style={{ fontSize: 12, color: C.t4, padding: 12 }}>{t("map_style.load_ho_rahi")}</div>}
          <div style={{ border: `1px solid ${C.b1}`, borderRadius: 8, overflow: "hidden" }}>
            {rows.map((row, i) => {
              const key = `${row.kind}:${row.code}`;
              const isOpen = open === key;
              return (
                <div key={key} style={{ borderTop: i ? `1px solid ${C.b1}` : "none" }}>
                  <div role="button" tabIndex={0} onClick={() => setOpen(isOpen ? null : key)} onKeyDown={(e) => { if (e.key === "Enter") setOpen(isOpen ? null : key); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", cursor: "pointer", background: isOpen ? C.indL : C.surface }}>
                    <span style={{ width: 26, display: "flex", justifyContent: "center" }}>
                      {row.kind === "point" ? <ShapeIcon shape={row.shape} colour={row.colour} size={20} />
                        : row.kind === "area" ? <StyleSwatch kind="area" code={row.code} size={20} />
                        : <LineSample colour={row.colour} width={Math.min(6, Number(row.width) || 4)} dash={row.dash} w={30} />}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.t1 }}>{typeName(row.kind, row.code)}</span>
                    {!row.builtin && <span style={{ fontSize: 10.5, color: C.t4 }}>{t("map_style.apna")}</span>}
                    {busy === key && <span style={{ fontSize: 11, color: C.t4 }}>…</span>}
                    <span style={{ fontSize: 11, color: C.ind }}>{isOpen ? "▾" : canEdit ? t("map_style.badlo") : "▸"}</span>
                  </div>
                  {isOpen && editor(row)}
                </div>
              );
            })}
          </div>
          {canCreate && !add && (
            <button type="button" onClick={() => setAdd({ label: "", colour: "#7C3AED", shape: "circle" })}
              style={{ marginTop: 10, padding: "7px 12px", borderRadius: 7, border: `1px dashed ${C.ind}`, background: C.surface, color: C.ind, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              + {tab === "point" ? t("map_style.naya_structure") : tab === "area" ? t("map_style.naya_rakba") : t("map_style.nayi_line")}
            </button>
          )}
          {add && (
            <div style={{ marginTop: 10, padding: 12, border: `1px solid ${C.b1}`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              <input autoFocus value={add.label} maxLength={80} onChange={(e) => setAdd({ ...add, label: e.target.value })}
                placeholder={tab === "point" ? t("map_style.naam_ph_point") : t("map_style.naam_ph_line")}
                style={{ padding: "8px 10px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 13, fontFamily: "inherit" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: C.t3, width: 70 }}>{t("map_style.rang")}</span>
                <input type="color" value={add.colour} onChange={(e) => setAdd({ ...add, colour: e.target.value })}
                  style={{ width: 40, height: 26, border: `1px solid ${C.b1}`, borderRadius: 6, padding: 0, background: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.t3, width: 70 }}>{t("map_form.detail_form")}</span>
                <PickSelect value={add.template || ""} onChange={(e) => setAdd({ ...add, template: e.target.value })}
                  style={{ padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12.5, fontFamily: "inherit", minWidth: 200 }}>
                  <option value="" disabled>{t("map_form.template_chuno")}</option>
                  {templatesFor(tab).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                </PickSelect>
              </div>
              {(() => {
                const tp = templatesFor(tab).find((x) => x.key === add.template);
                const names = tp ? (tp.fields || []).map((f) => f.label).join(", ") : "";
                return (
                  <div style={{ fontSize: 11, color: C.t4, lineHeight: 1.5 }}>
                    {names ? t("map_form.template_ke_field", { list: names }) : t("map_form.template_note")}
                  </div>
                );
              })()}
              {tab === "point" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SHAPE_KEYS.map((s) => (
                    <button key={s} type="button" onClick={() => setAdd({ ...add, shape: s })}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, fontSize: 11.5, fontFamily: "inherit", cursor: "pointer",
                        border: `1px solid ${add.shape === s ? C.ind : C.b1}`, background: add.shape === s ? C.indL : C.surface, color: add.shape === s ? C.ind : C.t2 }}>
                      <ShapeIcon shape={s} colour={add.colour} size={16} />{shapeLabel(s)}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setAdd(null)} style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${C.b1}`, background: C.surface, cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>{t("common.cancel")}</button>
                <button type="button" onClick={create} disabled={busy === "new"} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: C.ind, color: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>{busy === "new" ? "…" : t("map_style.jodo")}</button>
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, color: C.t4, marginTop: 12, lineHeight: 1.5 }}>{t("map_style.note")}</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// REGISTER KI KHIDKI (11 Oct 2026) — Tender ke naksha ki lines ka register.
// rows: [{ id, name, kind, code, props, poles, size, lenM, extra: [..] }],
// extraHead: tender ke apne column (Site, Chainage, Chaudai…). Type chuno to
// har field ka column; "Sab type" me ek "Detail" column. CSV wahi table.
// ══════════════════════════════════════════════════════════════════
// ── Form ke field (L 10 Oct + N 11 Oct 2026) — ek hi editor har level par:
// line ka form; uske map wale field ki "andar ki detail" (nali ki chaudai,
// electrical par light / chamber); point ki detail (valve ka dia).
// under: null = line ka form, "side" = bagal ki line ke andar (point nishaan
// chalte hain, line nahi), "child" = point ke andar (sirf saade field).
const newKeyFor = (label, list) => {
  let base = slug(label);
  if (!/^[a-z]/.test(base)) base = `f_${base || Date.now().toString(36)}`.slice(0, 26);
  const used = new Set((list || []).map((f) => f.key));
  let key = base, n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  return key;
};
// Field ke naam se library ka type (pehle se ho to wahi — "Valve", "Nali"…);
// na ho to naam se naya (server bana deta hai).
function pickCode(kind, label) {
  const want = String(label || "").trim().toLowerCase();
  const hit = _lib && _lib.list.find((x) => x.kind === kind
    && (String(x.label || "").toLowerCase() === want || String(typeName(kind, x.code)).toLowerCase() === want || x.code === slug(label)));
  return hit ? hit.code : (slug(label) || "item").slice(0, 30);
}
const mapDraftOf = (f) => ({ mark: f.type === "side" ? "line" : (f.mark || "dot"), color: f.color || "", mode: f.mode || "auto",
  every: f.every_m == null ? "" : String(f.every_m), start: f.start_m == null ? "" : String(f.start_m), beside: !!f.beside,
  offset: f.offset_m == null ? "" : String(f.offset_m) });
const MAP_DRAFT0 = { mark: "dot", color: "", mode: "auto", every: "", start: "", beside: false, offset: "" };
function applyMapDraft(f, d) {
  const line = d.mark === "line";
  const kind = line ? "line" : "point";
  const same = f.child && f.child.kind === kind;
  const code = same ? f.child.code : pickCode(kind, f.label);
  const tr = typeRow(kind, code);
  const out = { ...f, type: line ? "side" : "child",
    child: { kind, code, template: (tr && tr.template) || (same && f.child.template) || null, label: (same && f.child.label) || null },
    sub: Array.isArray(f.sub) ? f.sub : [] };
  if (d.color) out.color = d.color; else delete out.color;
  delete out.unit; delete out.min; delete out.max;
  if (line) {
    out.offset_m = d.offset === "" || d.offset == null ? 1 : Number(d.offset);
    out.options = ["none", "left", "right", "both"].map((v) => ({ v, l: v }));
    ["mark", "mode", "every_m", "start_m", "beside"].forEach((k) => delete out[k]);
    out.sub = out.sub.filter((x) => x.type !== "side");
  } else {
    out.mark = d.mark || "dot"; out.mode = d.mode || "auto";
    out.every_m = Number(d.every) > 0 ? Number(d.every) : null;
    out.start_m = d.start === "" || d.start == null ? null : Number(d.start);
    if (d.beside) out.beside = true; else delete out.beside;
    delete out.offset_m; delete out.options;
    out.sub = out.sub.filter((x) => !isMapField(x));
  }
  return out;
}
// lookOnly: sirf nishaan + rang (marking ke dialog se); colourOnly: bagal ki line ka rang.
function MapSettings({ d, set, allowLine, lookOnly, colourOnly }) {
  const colour = d.color || (d.mark === "line" ? "#2563EB" : "#475569");
  const inp = { padding: "5px 8px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12, fontFamily: "inherit", width: 76, boxSizing: "border-box" };
  const chip = (on) => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontFamily: "inherit", cursor: "pointer",
    border: `1px solid ${on ? C.ind : C.b1}`, background: on ? C.indL : C.surface, color: on ? C.ind : C.t2, fontWeight: on ? 700 : 500 });
  const row = (label, body) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, color: C.t3, width: 84, flexShrink: 0, paddingTop: 4 }}>{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minWidth: 0 }}>{body}</div>
    </div>
  );
  const marks = allowLine ? [...MARK_KEYS, "line"] : MARK_KEYS;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", border: `1px solid ${C.b1}`, borderRadius: 7, background: C.surfaceB }}>
      {!colourOnly && row(t("map_form.nishaan"), marks.map((m) => (
        <button key={m} type="button" onClick={() => set({ ...d, mark: m })} style={chip(d.mark === m)}>
          <MarkIcon mark={m} colour={colour} size={14} />{markLabel(m)}
        </button>
      )))}
      {row(t("map_style.rang"), MARK_COLOURS.map((c) => (
        <button key={c} type="button" aria-label={c} onClick={() => set({ ...d, color: d.color === c ? "" : c })}
          style={{ width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer", padding: 0,
            border: d.color === c ? `2px solid ${C.t1}` : "2px solid #FFFFFF", boxShadow: `0 0 0 1px ${C.b1}` }} />
      )))}
      {lookOnly || colourOnly ? null : d.mark === "line" ? row(t("map_form.kinare_se_m"), (<>
        <input value={d.offset} inputMode="decimal" maxLength={5} placeholder="1" onChange={(e) => set({ ...d, offset: e.target.value.replace(/[^\d.]/g, "") })} style={inp} />
        <span style={{ fontSize: 11, color: C.t4 }}>{t("map_form.kinare_note")}</span>
      </>)) : (<>
        {row(t("map_form.kaise_lagega"), (<>
          {MODES.map(([v, k]) => <button key={v} type="button" onClick={() => set({ ...d, mode: v })} style={chip(d.mode === v)}>{t(k)}</button>)}
          {d.mode === "interval" && (<>
            <span style={{ fontSize: 11.5, color: C.t3 }}>{t("map_form.har")}</span>
            <input value={d.every} inputMode="decimal" maxLength={6} placeholder="100" onChange={(e) => set({ ...d, every: e.target.value.replace(/[^\d.]/g, "") })} style={inp} />
            <span style={{ fontSize: 11.5, color: C.t3 }}>{t("map_form.m_shuru")}</span>
            <input value={d.start} inputMode="decimal" maxLength={6} placeholder="0" onChange={(e) => set({ ...d, start: e.target.value.replace(/[^\d.]/g, "") })} style={inp} />
            <span style={{ fontSize: 11.5, color: C.t3 }}>m</span>
          </>)}
        </>))}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.t2, cursor: "pointer", paddingLeft: 94 }}>
          <input type="checkbox" checked={!!d.beside} onChange={(e) => set({ ...d, beside: e.target.checked })} />
          {t("map_form.bagal_me_bhi")}
        </label>
      </>)}
    </div>
  );
}
export function FieldsEditor({ fields, onChange, canEdit, busy, setErr, under = null, depth = 0 }) {
  const [nf, setNf] = useState(null);            // naya field: { label, type, unit, options, required, map, md }
  const [ren, setRen] = useState(null);          // naam badal rahe: { key, label }
  const [mapEdit, setMapEdit] = useState(null);  // nishaan badal rahe: { key, d }
  const [openSub, setOpenSub] = useState(() => new Set());
  const allowMap = under !== "child";
  const allowLine = under == null;
  const edit = onChange;
  const inpS = { padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box", background: C.surface };
  const btn = (primary) => ({ padding: "5px 11px", borderRadius: 7, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: primary ? 700 : 500,
    border: primary ? "none" : `1px solid ${C.b1}`, background: primary ? C.ind : C.surface, color: primary ? "#fff" : C.t2 });
  const icon = { background: "none", border: "none", cursor: "pointer", color: C.t4, fontSize: 12, padding: "0 4px", fontFamily: "inherit" };
  const add = () => {
    const label = String(nf.label || "").trim();
    if (!label) { setErr(t("map_form.field_naam_likho")); return; }
    let f = { key: newKeyFor(label, fields), label, type: nf.type, required: !!nf.required };
    if (nf.type === "number" && !nf.map && String(nf.unit || "").trim()) f.unit = String(nf.unit).trim();
    if (nf.type === "select") {
      const opts = String(nf.options || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!opts.length) { setErr(t("map_form.options_likho")); return; }
      f.options = opts.map((l, i) => ({ v: slug(l) || `o${i + 1}`, l }));
    }
    if (nf.type === "number" && nf.map && allowMap) f = applyMapDraft(f, nf.md);
    setErr(""); setNf(null);
    edit([...fields, f]);
    if (isMapField(f)) setOpenSub((o) => new Set([...o, f.key]));
  };
  // Bagal ki line ki aam detail — ek click me.
  const quick = [["chaudai", "map_form.q_chaudai", { type: "number", unit: "m" }], ["gehrai", "map_form.q_gehrai", { type: "number", unit: "m" }],
    ["kism", "map_form.q_kism", { type: "select", options: [{ v: "khuli", l: t("map_form.o_khuli") }, { v: "dhaki", l: t("map_form.o_dhaki") }] }]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {fields.length === 0 && <div style={{ fontSize: 11.5, color: C.t4, paddingLeft: depth ? 0 : 80 }}>{t("map_form.koi_field_nahi")}</div>}
      {fields.length > 0 && (
        <div style={{ border: `1px solid ${C.b1}`, borderRadius: 7, background: C.surface }}>
          {fields.map((f, i) => {
            const mf = isMapField(f);
            const subOpen = openSub.has(f.key);
            const col = f.color || (mf ? styleOf(f.child.kind, f.child.code).colour : C.t4);
            return (
              <div key={f.key} style={{ borderTop: i ? `1px solid ${C.b1}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px" }}>
                  {mf && <MarkIcon mark={f.type === "side" ? "line" : f.mark || "dot"} colour={col} size={15} />}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.t1, fontWeight: 600 }}>
                    {ren && ren.key === f.key ? (
                      // Naam badalna — template ka field badla to apna naam ban jaata hai.
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <input autoFocus value={ren.label} maxLength={60} onChange={(e) => setRen({ ...ren, label: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Escape") setRen(null); }} style={{ ...inpS, padding: "4px 7px", width: 180 }} />
                        <button type="button" style={btn(true)} onClick={() => {
                          const l = String(ren.label || "").trim();
                          if (!l) { setErr(t("map_form.field_naam_likho")); return; }
                          edit(fields.map((x) => (x.key === f.key ? { ...x, label: l, tpl: false } : x))); setRen(null); setErr("");
                        }}>{t("map_form.theek")}</button>
                      </span>
                    ) : (<>
                      {f.label}{f.unit ? <span style={{ color: C.t4, fontWeight: 400 }}>{` (${f.unit})`}</span> : null}
                      {canEdit && (
                        <button type="button" title={t("map_form.naam_badlo")} aria-label={t("map_form.naam_badlo")} disabled={busy}
                          onClick={() => setRen({ key: f.key, label: f.label })} style={icon}>✎</button>
                      )}
                    </>)}
                    <span style={{ display: "block", fontSize: 10.5, color: C.t4, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fieldTypeText(f)}</span>
                  </span>
                  {canEdit && allowMap && f.type === "number" && (
                    <button type="button" disabled={busy} onClick={() => setMapEdit({ key: f.key, d: { ...MAP_DRAFT0 } })} style={{ ...icon, color: C.ind, fontSize: 11.5 }}>
                      {t("map_form.map_par_dikhao")}
                    </button>
                  )}
                  {canEdit && mf && (
                    <button type="button" disabled={busy} onClick={() => setMapEdit(mapEdit && mapEdit.key === f.key ? null : { key: f.key, d: mapDraftOf(f) })} style={{ ...icon, color: C.ind, fontSize: 11.5 }}>
                      {t("map_form.nishaan_badlo")}
                    </button>
                  )}
                  {mf && (
                    <button type="button" onClick={() => setOpenSub((o) => { const n = new Set(o); if (n.has(f.key)) n.delete(f.key); else n.add(f.key); return n; })}
                      style={{ ...icon, color: C.t2, fontSize: 11.5 }}>
                      {t("map_form.andar_detail_n", { n: (f.sub || []).length })} {subOpen ? "▾" : "▸"}
                    </button>
                  )}
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.t3, cursor: canEdit ? "pointer" : "default" }}>
                    <input type="checkbox" checked={!!f.required} disabled={!canEdit || busy}
                      onChange={(e) => edit(fields.map((x) => (x.key === f.key ? { ...x, required: e.target.checked } : x)))} />
                    {t("map_form.zaroori")}
                  </label>
                  {canEdit && (
                    <button type="button" title={t("map_form.field_hatao")} aria-label={t("map_form.field_hatao")} disabled={busy}
                      onClick={() => edit(fields.filter((x) => x.key !== f.key))}
                      style={{ ...icon, fontSize: 15, lineHeight: 1, padding: "0 2px" }}>×</button>
                  )}
                </div>
                {mapEdit && mapEdit.key === f.key && (
                  <div style={{ padding: "0 10px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <MapSettings d={mapEdit.d} set={(d) => setMapEdit({ key: f.key, d })} allowLine={allowLine} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => setMapEdit(null)} style={btn(false)}>{t("common.cancel")}</button>
                      <button type="button" onClick={() => {
                        edit(fields.map((x) => (x.key === f.key ? applyMapDraft(x, mapEdit.d) : x)));
                        setMapEdit(null); setOpenSub((o) => new Set([...o, f.key]));
                      }} style={btn(true)}>{t("map_form.theek")}</button>
                    </div>
                  </div>
                )}
                {mf && subOpen && (
                  <div style={{ padding: "2px 10px 10px 28px", display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 10.5, color: C.t3 }}>{t(f.type === "side" ? "map_form.andar_note_line" : "map_form.andar_note_point", { name: f.label })}</span>
                    <FieldsEditor fields={Array.isArray(f.sub) ? f.sub : []} canEdit={canEdit} busy={busy} setErr={setErr} under={f.type} depth={depth + 1}
                      onChange={(sub) => edit(fields.map((x) => (x.key === f.key ? { ...x, sub } : x)))} />
                    {canEdit && f.type === "side" && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {quick.filter(([k]) => !(f.sub || []).some((x) => x.key === k || (k === "chaudai" && x.key === "width_m") || (k === "gehrai" && x.key === "depth_m"))).map(([k, lk, extra]) => (
                          <button key={k} type="button" disabled={busy} onClick={() => edit(fields.map((x) => (x.key === f.key ? { ...x, sub: [...(x.sub || []), { key: k, label: t(lk), required: false, ...extra }] } : x)))}
                            style={{ padding: "3px 9px", borderRadius: 20, border: `1px dashed ${C.b1}`, background: C.surface, color: C.t2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                            + {t(lk)}{extra.unit ? ` (${extra.unit})` : ""}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {canEdit && !nf && (
        <div>
          <button type="button" onClick={() => setNf({ label: "", type: "number", unit: "", options: "", required: false, map: false, md: { ...MAP_DRAFT0 } })} disabled={busy}
            style={{ padding: "5px 10px", borderRadius: 7, border: `1px dashed ${C.ind}`, background: C.surface, color: C.ind, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            + {t("map_form.field_jodo")}
          </button>
        </div>
      )}
      {canEdit && nf && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, border: `1px dashed ${C.b1}`, borderRadius: 7, background: C.surface }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input autoFocus value={nf.label} maxLength={60} placeholder={t("map_form.field_naam_ph")}
              onChange={(e) => setNf({ ...nf, label: e.target.value })} style={{ ...inpS, flex: "2 1 160px" }} />
            <PickSelect value={nf.type} onChange={(e) => setNf({ ...nf, type: e.target.value })} style={{ ...inpS, flex: "1 1 130px" }}>
              {FIELD_TYPES.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
            </PickSelect>
            {nf.type === "number" && !nf.map && (
              <input value={nf.unit} maxLength={12} placeholder={t("map_form.unit_ph")}
                onChange={(e) => setNf({ ...nf, unit: e.target.value })} style={{ ...inpS, flex: "0 1 100px" }} />
            )}
          </div>
          {nf.type === "select" && (
            <input value={nf.options} maxLength={600} placeholder={t("map_form.options_ph")}
              onChange={(e) => setNf({ ...nf, options: e.target.value })} style={inpS} />
          )}
          {nf.type === "number" && allowMap && (
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.t1, fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={!!nf.map} onChange={(e) => setNf({ ...nf, map: e.target.checked })} />
              {t("map_form.map_par_dikhana")}
            </label>
          )}
          {nf.type === "number" && nf.map && allowMap && <MapSettings d={nf.md} set={(md) => setNf({ ...nf, md })} allowLine={allowLine} />}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.t2, cursor: "pointer" }}>
            <input type="checkbox" checked={!!nf.required} onChange={(e) => setNf({ ...nf, required: e.target.checked })} />
            {t("map_form.zaroori_note")}
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setNf(null)} style={btn(false)}>{t("common.cancel")}</button>
            <button type="button" onClick={add} style={btn(true)}>{t("map_style.jodo")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RegisterDialog({ title, rows, extraHead, canExport, onClose }) {
  const [pick, setPick] = useState("");
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  const types = [];
  rows.forEach((r) => {
    const k = `${r.kind}:${r.code}`;
    const hit = types.find((x) => x.k === k);
    if (hit) hit.n++; else types.push({ k, kind: r.kind, code: r.code, n: 1 });
  });
  types.sort((a, b) => typeName(a.kind, a.code).localeCompare(typeName(b.kind, b.code)));
  const [pKind, pCode] = pick ? pick.split(":") : [null, null];
  const list = pick ? rows.filter((r) => r.kind === pKind && r.code === pCode) : rows;
  const fields = pick ? formOf(pKind, pCode) : [];
  const poleCol = pick && list.some((r) => r.poles > 0);
  const head = [t("map_form.reg_naam"), ...(pick ? [] : [t("map_form.reg_type")]), ...(extraHead || []), t("map_form.reg_size"),
    ...(pick ? fields.map((f) => f.label + (f.unit ? ` (${f.unit})` : "")) : [t("map_form.detail")]),
    ...(poleCol ? [t("map_form.pole_ginti")] : []), t("map_form.detail_adhoori")];
  const cells = (r) => {
    const det = detailPairs(r.kind, r.code, r.props);
    return [r.name || "", ...(pick ? [] : [typeName(r.kind, r.code)]), ...(r.extra || []), r.size || "",
      ...(pick ? fields.map((f) => {
        if (f.type === "child" || f.type === "side") {
          const x = kidsSummary({ kind: r.kind, atype: r.code, props: r.props }, r.kids || []).find((y) => y.f.key === f.key);
          if (!x) return "";
          if (f.type === "side") return x.sides.map((sd) => t("map_form.side_" + sd)).join(", ");
          return x.plan ? `${x.done}/${x.plan}` : x.done ? String(x.done) : "";
        }
        const d = det.find((x) => x[0] === f.key); return d ? d[3] : "";
      }) : [det.map(([, , l, v]) => `${l}: ${v}`).join(" · ")]),
      ...(poleCol ? [r.poles ? String(r.poles) : ""] : []),
      [...missingOf(formOf(r.kind, r.code), r.props), ...(r.kind === "line" ? kidsShort({ kind: r.kind, atype: r.code, props: r.props }, r.kids || []) : [])].join(", ")];
  };
  const lenSum = list.reduce((m, r) => m + (r.kind === "line" ? Number(r.lenM) || 0 : 0), 0);
  const lenTxt = lenSum >= 1000 ? `${(lenSum / 1000).toFixed(2)} km` : `${Math.round(lenSum)} m`;
  const csv = () => {
    const q = (v) => { const x = String(v == null ? "" : v); return /[",\r\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
    const text = "\uFEFF" + [head, ...list.map(cells)].map((r) => r.map(q).join(",")).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${String(title || "register").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60)}-register.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, color: C.t3, fontWeight: 700, borderBottom: `1px solid ${C.b1}`, whiteSpace: "nowrap", background: C.surfaceB, position: "sticky", top: 0 };
  const td = { padding: "7px 10px", fontSize: 12, borderBottom: `1px solid ${C.b1}`, verticalAlign: "top", fontVariantNumeric: "tabular-nums" };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9995, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{ width: 1100, maxWidth: "100%", maxHeight: "90vh", background: C.surface, borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.b1}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{t("map_form.reg_title")}{title ? ` — ${title}` : ""}</div>
          <PickSelect value={pick} onChange={(e) => setPick(e.target.value)}
            style={{ padding: "6px 9px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12.5, fontFamily: "inherit", minWidth: 200 }}>
            <option value="">{t("map_form.reg_sab_type", { n: rows.length })}</option>
            {types.map((x) => <option key={x.k} value={x.k}>{`${typeName(x.kind, x.code)} (${x.n})`}</option>)}
          </PickSelect>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: C.t3 }}>{t("map_form.reg_total", { n: list.length, len: lenTxt })}</span>
          {canExport && list.length > 0 && (
            <button type="button" onClick={csv} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.b1}`, background: C.surface, cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: C.t2 }}>
              ⬇ {t("map_form.reg_csv")}
            </button>
          )}
          <button type="button" onClick={onClose} aria-label={t("common.close")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.t3, lineHeight: 1 }}>×</button>
        </div>
        {list.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12.5, color: C.t4 }}>{t("map_form.reg_khaali")}</div>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
              <thead><tr>{head.map((h, i) => <th key={i} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {list.map((r) => {
                  const c = cells(r);
                  return (
                    <tr key={r.id}>
                      {c.map((v, i) => (
                        <td key={i} style={{ ...td, color: i === c.length - 1 ? C.amb : C.t1, fontWeight: i === 0 ? 600 : 400 }}>{v || (i === c.length - 1 ? "" : "—")}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SAATH KI CHEEZEIN (M2, 11 Oct 2026) — line kholo → valve / manhole / pole
// lagao, khiskao, hatao; nali / electrical bagal me. Office (web) ka mukhya
// raasta: supervisor ne phone se sirf line khinchi, baaki yahan.
//
//   Auto      — "kitne" do → dono sire + beech barabar
//   Doori se  — "har kitne m" + "shuru kahan se" → utni doori par
//   Manual    — naksha par line ke paas click (line par chipak jaata hai)
// Lage hue point ko pakad kar khiskao (line par hi rehta hai); click → hatao.
// Auto / Doori dobara chalao to us field ke purane hat kar naye (dohre nahi).
//
// line: { id, name, kind, atype, pts, gaps, props, startCh }
// kids: is line ki cheezein (parent_id = line.id) — { id, name, kind, atype, pts, child_key, chainage_m }
// api:  { place(body), move(id, lat, lng), remove(id), saveProps(props) } → { success, message, data }
// loadMaps: () => Promise<google>
// ══════════════════════════════════════════════════════════════════
const R_M = 6371000;
const hav = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const s = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R_M * Math.asin(Math.min(1, Math.sqrt(s)));
};
const partsOfPts = (pts, gaps) => {
  const cut = (Array.isArray(gaps) ? gaps : []).map(Number).filter((i) => i > 0 && i < pts.length).sort((a, b) => a - b);
  const out = []; let from = 0;
  for (const c of cut) { out.push(pts.slice(from, c)); from = c; }
  out.push(pts.slice(from));
  return out.filter((p) => p.length >= 2);
};
const lineLen = (parts) => parts.reduce((m, p) => m + p.slice(1).reduce((n, q, i) => n + hav(p[i], q), 0), 0);
const fmtChain = (m) => `${Math.floor(m / 1000)}+${String(Math.round(m % 1000)).padStart(3, "0")}`;

// ══════════════════════════════════════════════════════════════════════
// FORM KE SAATH NISHAAN LAGAO (N, 11 Oct 2026) — alag "Line items" dialog
// nahi: number / Left-Right bharte hi isi form ke naksha par dikhta hai,
// Manual me usi naksha par click, kisi bhi nishaan ko pakad kar khiskao.
// Save par ek hi request me (place) — server wahi ganit chalata hai.
//
// place (form ki state):
//   point field → { mode, qty, every, start, cap, points: [{ id?, lat, lng }], props, propsDirty }
//   line field  → { gap, same, left: { props, place }, right: { props, place } }
// ══════════════════════════════════════════════════════════════════════
const numOr = (v, d = null) => (v === "" || v == null || !Number.isFinite(Number(v)) ? d : Number(v));
const stripPlace = (p) => { const o = { ...(p || {}) }; delete o._place; return o; };
const numProps = (p) => cleanProps(stripPlace(p)) || {};
const sameProps = (a, b) => JSON.stringify(numProps(a)) === JSON.stringify(numProps(b));
// Dono taraf ke nishaan ek jaise tareeke se (Manual kabhi "ek jaisa" nahi).
const samePlace = (a, b) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const x = (a || {})[k], y = (b || {})[k];
    if (!x || !y || x.mode === "manual" || y.mode === "manual") return false;
    if (["mode", "qty", "every", "start", "cap"].some((q) => String(x[q] ?? "") !== String(y[q] ?? ""))) return false;
  }
  return true;
};
// kidsAt(parentId, key) → [{ id, pts, props }] — line ki maujooda cheezein
// (library / tender list se). parentId null = nayi line.
export function initPlace(fields, props, parentId, kidsAt) {
  const p = props || {}, meta = p._place || {};
  const out = {};
  const at = (key) => (parentId == null || !kidsAt ? [] : kidsAt(parentId, key) || []);
  for (const f of mapFieldsOf(fields)) {
    const m = meta[f.key] || {};
    if (f.type === "child") {
      const have = at(f.key).filter((k) => Array.isArray(k.pts) && k.pts[0]);
      // Tareeka yaad na ho (purane / haath se lage) aur nishaan lage hon = Manual —
      // warna save par wo default ke hisaab se dobara bichh jaate.
      out[f.key] = { mode: m.mode || (have.length ? "manual" : f.mode || "auto"), qty: blank(p[f.key]) ? "" : String(p[f.key]),
        every: m.every_m != null ? String(m.every_m) : f.every_m != null ? String(f.every_m) : "",
        start: m.start_m != null ? String(m.start_m) : f.start_m != null ? String(f.start_m) : "0",
        cap: m.cap != null ? String(m.cap) : "",
        points: have.map((k) => ({ id: k.id, lat: Number(k.pts[0].lat), lng: Number(k.pts[0].lng) })),
        props: have.length ? stripPlace(have[0].props) : {}, propsDirty: false };
    } else {
      const side = (sd) => {
        const row = at(`${f.key}:${sd}`)[0] || null;
        return { id: row ? row.id : null, props: row ? stripPlace(row.props) : {},
          place: initPlace(subOf(f), row ? row.props : null, row ? row.id : null, kidsAt) };
      };
      const left = side("left"), right = side("right");
      out[f.key] = { gap: m.gap_m != null ? String(m.gap_m) : f.offset_m != null ? String(f.offset_m) : "1",
        same: typeof m.same === "boolean" ? m.same : sameProps(left.props, right.props) && samePlace(left.place, right.place), left, right };
    }
  }
  return out;
}
// "Dono taraf ek jaisi": Right ki setting Left wali, par uski apni purani row (id).
const mergeSame = (lp, rp) => {
  const o = {};
  for (const k of Object.keys(lp || {})) o[k] = { ...lp[k], points: (rp && rp[k] && rp[k].points) || [] };
  return o;
};
function spotsOf(parts, L, st) {
  let list;
  if (st.mode === "manual") list = (st.points || []).map((q) => ({ id: q.id || null, pt: { lat: q.lat, lng: q.lng } }));
  else {
    const chs = st.mode === "auto" ? chainagesFor("auto", L, { qty: numOr(st.qty, 0) })
      : chainagesFor("interval", L, { every_m: numOr(st.every, 0), start_m: numOr(st.start, 0), cap: numOr(st.cap, null) });
    // Purani row isi kram me khiskti hai (server bhi yahi karta hai) — khiskane par id bachi rahe.
    const old = (st.points || []).map((q) => ({ ...q, ch: (projectOn(parts, q) || {}).ch || 0 })).sort((a, b) => a.ch - b.ch);
    list = chs.map((ch, i) => ({ id: old[i] ? old[i].id : null, pt: pointAtCh(parts, ch) })).filter((x) => x.pt);
  }
  return list.map((x) => { const h = projectOn(parts, x.pt); return { ...x, brg: h ? h.brg : 0, ch: h ? h.ch : 0, d: h ? h.d : 0 }; });
}
export function buildPreview(line, fields, detail, place, W) {
  const out = { marks: [], lines: [], counts: {}, parts: {}, fields: {} };
  const walk = (pts, gaps, flds, det, pl, path, width, lock) => {
    const parts = linePartsOf(pts, gaps);
    if (!parts.length) return;
    out.parts[path] = parts;
    const L = lineLenOf(parts);
    for (const f of mapFieldsOf(flds)) {
      const st = pl && pl[f.key];
      if (!st) continue;
      const colour = f.color || styleOf(f.child.kind, f.child.code).colour;
      const fk = path + f.key;
      if (f.type === "child") {
        const sp = spotsOf(parts, L, st);
        out.counts[fk] = sp.length;
        out.fields[fk] = f;
        sp.forEach((x, i) => out.marks.push({ fk, f, i, id: x.id, pt: x.pt, brg: x.brg, ch: x.ch, mark: f.mark || "dot", colour, lock }));
      } else {
        const v = (det || {})[f.key];
        const want = v === "both" ? ["left", "right"] : v === "left" || v === "right" ? [v] : [];
        const same = st.same && v === "both";
        for (const sd of want) {
          const src = same ? st.left : st[sd];
          const w = widthOfProps(numProps(src.props)) || (f.key === "drain_side" ? Number((det || {}).drain_width_m) || 0 : 0);
          const g = sideGeom(pts, gaps, width, numOr(st.gap, 1), w, sd);
          if (g.pts.length < 2) continue;
          const lk = `${fk}:${sd}`;
          out.lines.push({ fk: lk, f, colour, pts: g.pts, gaps: g.gaps, w });
          const subPl = same && sd === "right" ? mergeSame(st.left.place, st.right.place) : src.place;
          walk(g.pts, g.gaps, subOf(f), numProps(src.props), subPl, lk + "/", 0, same && sd === "right");
        }
      }
    }
  };
  walk((line && line.pts) || [], line && line.gaps, fields, detail || {}, place || {}, "", W);
  return out;
}
// Server ko: { valve_n: { mode, qty | every_m, start_m, cap | points }, nali: { gap_m, left: { props, place }, … } }
export function placePayload(fields, detail, place) {
  const out = {};
  for (const f of mapFieldsOf(fields)) {
    const st = place && place[f.key];
    if (!st) continue;
    if (f.type === "child") {
      const o = { mode: st.mode };
      if (st.mode === "auto") o.qty = numOr(st.qty, 0);
      else if (st.mode === "interval") { o.every_m = numOr(st.every, null); o.start_m = numOr(st.start, 0); o.cap = numOr(st.cap, null); }
      else { o.qty = numOr(st.qty, (st.points || []).length); o.points = (st.points || []).map((q) => ({ id: q.id || undefined, lat: q.lat, lng: q.lng })); }
      if (st.propsDirty) o.props = cleanProps(st.props) || {};
      out[f.key] = o;
    } else {
      const v = (detail || {})[f.key];
      const same = st.same && v === "both";
      const o = { gap_m: numOr(st.gap, null), same: !!st.same };
      for (const sd of ["left", "right"]) {
        if (!(v === "both" || v === sd)) continue;
        const src = same ? st.left : st[sd];
        const subPl = same && sd === "right" ? mergeSame(st.left.place, st.right.place) : src.place;
        o[sd] = { props: cleanProps(src.props) || {}, place: placePayload(subOf(f), numProps(src.props), subPl || {}) };
      }
      out[f.key] = o;
    }
  }
  return out;
}
// fk = "valve_n" ya "electrical:left/streetlight_n" — us field ki state badlo.
const updAt = (pl, fk, fn) => {
  const segs = fk.split("/");
  if (segs.length === 1) return { ...pl, [fk]: fn(pl[fk]) };
  const [sk, sd] = segs[0].split(":");
  const st = pl[sk];
  const side = st[sd];
  return { ...pl, [sk]: { ...st, [sd]: { ...side, place: updAt(side.place || {}, segs.slice(1).join("/"), fn) } } };
};
const getAt = (pl, fk) => {
  const segs = fk.split("/");
  if (segs.length === 1) return pl[fk];
  const [sk, sd] = segs[0].split(":");
  const side = pl[sk] && pl[sk][sd];
  return side ? getAt(side.place || {}, segs.slice(1).join("/")) : null;
};
const prefixOf = (fk) => { const i = fk.lastIndexOf("/"); return i < 0 ? "" : fk.slice(0, i + 1); };

// typeKind / typeCode: marking ka type — "Nishaan / rang" usi type ke field me
// save hota hai (library ka Edit ho to), us type ki sab marking par.
export function MapPlacePanel({ fields, detail, setDetail, place, setPlace, line, widthM, loadMaps, canEdit = true, mapHeight = 300, lineType, typeKind, typeCode }) {
  const [clickKey, setClickKey] = useState(null);
  const { lib, reload } = useMapLibrary();
  const [lookEdit, setLookEdit] = useState(null);    // { fk, d }
  const [lookBusy, setLookBusy] = useState(false);
  const canLook = !!(lib && lib.canEdit && typeCode);
  // fk ("valve_n" / "electrical:left/streetlight_n") → us field ki definition badlo (type ka form).
  const saveLook = async () => {
    if (!lookEdit || lookBusy) return;
    const keys = lookEdit.fk.split("/").map((x) => x.split(":")[0]);
    const tr = typeRow(typeKind || "line", typeCode);
    const base = tr && Array.isArray(tr.fields) ? tr.fields : [];
    const walk = (list, i) => (list || []).map((f) => {
      if (f.key !== keys[i]) return f;
      if (i < keys.length - 1) return { ...f, sub: walk(subOf(f), i + 1) };
      const n = { ...f };
      if (f.type === "child") n.mark = lookEdit.d.mark || f.mark || "dot";
      if (lookEdit.d.color) n.color = lookEdit.d.color; else delete n.color;
      return n;
    });
    setLookBusy(true); setMsg("");
    const r = await api.put("/tenders/alignments/feature-types/style", { kind: typeKind || "line", code: typeCode, fields: walk(base, 0) }).catch(() => null);
    setLookBusy(false);
    if (!r || !r.success) { setMsg((r && r.message) || t("map_style.save_nahi_hua")); return; }
    setLookEdit(null);
    await reload();
  };
  // Naye field jaisa hi: Dot / Box / Cross… aur rang — field ke naam ke saath.
  const lookLink = (f, fk) => (canLook ? (
    <button type="button" onClick={() => setLookEdit(lookEdit && lookEdit.fk === fk ? null : { fk, d: { mark: f.type === "side" ? "line" : f.mark || "dot", color: f.color || "" } })}
      style={{ padding: "3px 9px", borderRadius: 20, border: `1px dashed ${lookEdit && lookEdit.fk === fk ? C.ind : C.b1}`, background: C.surface, cursor: "pointer",
        fontFamily: "inherit", fontSize: 11, color: lookEdit && lookEdit.fk === fk ? C.ind : C.t2 }}>
      {t("map_form.nishaan_rang")} {lookEdit && lookEdit.fk === fk ? "▾" : "▸"}
    </button>
  ) : null);
  const lookBox = (f, fk) => (lookEdit && lookEdit.fk === fk ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 23 }}>
      <MapSettings d={lookEdit.d} set={(d) => setLookEdit({ fk, d })} allowLine={false} lookOnly colourOnly={f.type === "side"} />
      <div style={{ fontSize: 11, color: C.t3 }}>{t("map_form.nishaan_sab_par", { type: typeName(typeKind || "line", typeCode) })}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setLookEdit(null)} disabled={lookBusy} style={smallBtnS(false)}>{t("common.cancel")}</button>
        <button type="button" onClick={saveLook} disabled={lookBusy} style={smallBtnS(true)}>{t("map_form.theek")}</button>
      </div>
    </div>
  ) : null);
  const [msg, setMsg] = useState("");
  const [openD, setOpenD] = useState(() => new Set());
  const W = Number(widthM) > 0 ? Number(widthM) : widthOfProps(numProps(detail)) || 7;
  const pv = buildPreview(line, fields, numProps(detail), place, W);
  const boxRef = useRef(null), mapRef = useRef(null), layers = useRef([]), fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const live = useRef({});
  live.current = { clickKey, pv, canEdit, place };

  const addAt = (q) => {
    const { clickKey: fk, pv: p } = live.current;
    if (!fk) return;
    const f = p.fields[fk], parts = p.parts[prefixOf(fk)];
    const hit = parts && projectOn(parts, q);
    if (!f || !hit || hit.d > (f.beside ? 200 : 50)) { setMsg(t("map_form.line_se_door")); return; }
    const st = getAt(live.current.place, fk);
    const qty = numOr(st && st.qty, 0);
    if (qty > 0 && (st.points || []).length >= qty) { setMsg(t("map_form.poore_lag_gaye", { n: qty })); return; }
    const pt = f.beside ? { lat: q.lat, lng: q.lng } : hit.pt;
    setMsg("");
    setPlace((pl) => updAt(pl, fk, (s0) => {
      const pts2 = [...(s0.points || []), { lat: pt.lat, lng: pt.lng }];
      return { ...s0, mode: "manual", points: pts2, qty: String(Math.max(numOr(s0.qty, 0), pts2.length)) };
    }));
  };
  // Khiskaya / hataya → us field ke nishaan ab haath ke (Manual) — baad me apne aap na badlein.
  const asManual = (fk, change) => setPlace((pl) => updAt(pl, fk, (s0) => {
    const cur = live.current.pv.marks.filter((m) => m.fk === fk).sort((a, b) => a.i - b.i)
      .map((m) => ({ id: m.id || undefined, lat: m.pt.lat, lng: m.pt.lng }));
    const next = change(cur);
    const keepPlan = s0.mode === "manual" ? numOr(s0.qty, 0) : 0;
    return { ...s0, mode: "manual", points: next, qty: String(Math.max(keepPlan, next.length)) };
  }));
  const moveTo = (m, q) => {
    const parts = live.current.pv.parts[prefixOf(m.fk)];
    const hit = parts && projectOn(parts, q);
    if (!hit || hit.d > (m.f.beside ? 200 : 50)) { setMsg(t("map_form.line_se_door")); setPlace((pl) => ({ ...pl })); return; }
    const pt = m.f.beside ? q : hit.pt;
    asManual(m.fk, (cur) => cur.map((x, i) => (i === m.i ? { ...x, lat: pt.lat, lng: pt.lng } : x)));
  };
  const handlers = useRef({});
  handlers.current = { addAt, moveTo, remove: (m) => asManual(m.fk, (cur) => cur.filter((_, i) => i !== m.i)) };

  useEffect(() => {
    let dead = false;
    if (!loadMaps) return undefined;
    loadMaps().then((g) => {
      if (dead || !boxRef.current) return;
      mapRef.current = new g.maps.Map(boxRef.current, {
        center: ((line && line.pts) || [])[0] || { lat: 21.25, lng: 81.63 }, zoom: 16, mapTypeId: "hybrid",
        streetViewControl: false, fullscreenControl: true, clickableIcons: false,
      });
      mapRef.current.addListener("click", (e) => handlers.current.addAt({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
      setReady(true);
    }).catch(() => setMsg(t("map_form.naksha_nahi_khula")));
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !window.google) return;
    const g = window.google;
    layers.current.forEach((l) => l.setMap(null));
    layers.current = [];
    const b = new g.maps.LatLngBounds();
    const click = (e) => handlers.current.addAt({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    linePartsOf((line && line.pts) || [], line && line.gaps).forEach((part) => {
      const pl = new g.maps.Polyline({ map, path: part, ...lineOpts(g, styleOf("line", lineType || "other")) });
      pl.addListener("click", click);
      layers.current.push(pl);
      part.forEach((q) => b.extend(q));
    });
    pv.lines.forEach((ln) => linePartsOf(ln.pts, ln.gaps).forEach((part) => {
      const pl = new g.maps.Polyline({ map, path: part, ...lineOpts(g, { colour: ln.colour, width: 3, dash: "dashed" }) });
      pl.addListener("click", click);
      layers.current.push(pl);
    }));
    pv.marks.forEach((m) => {
      const mk = new g.maps.Marker({ map, position: m.pt, zIndex: 5, draggable: !!(canEdit && !m.lock),
        title: `${m.f.label} ${m.i + 1}`, icon: markIcon(g, m.mark, m.colour, m.brg) });
      mk.addListener("dragend", (e) => handlers.current.moveTo(m, { lat: e.latLng.lat(), lng: e.latLng.lng() }));
      mk.addListener("click", () => { if (canEdit && !m.lock && live.current.clickKey === m.fk) handlers.current.remove(m); });
      layers.current.push(mk);
    });
    if (!fitted.current && !b.isEmpty()) { map.fitBounds(b, 40); fitted.current = true; }
  }); // har badlav par dobara (preview chhota hai)

  useEffect(() => {
    if (mapRef.current) mapRef.current.setOptions({ draggableCursor: clickKey ? "crosshair" : null });
  }, [clickKey, ready]);
  useEffect(() => () => layers.current.forEach((l) => l.setMap(null)), []);

  const inpS = { padding: "5px 8px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12.5, fontFamily: "inherit", width: 70, boxSizing: "border-box", background: C.surface };
  const chip = (on, dis) => ({ padding: "3px 9px", borderRadius: 20, fontSize: 11.5, fontFamily: "inherit", cursor: dis ? "default" : "pointer",
    border: `1px solid ${on ? C.ind : C.b1}`, background: on ? C.indL : C.surface, color: on ? C.ind : C.t2, fontWeight: on ? 700 : 500, opacity: dis && !on ? 0.6 : 1 });
  const small = { fontSize: 11.5, color: C.t3 };
  const toggleD = (k) => setOpenD((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const childRow = (f, st, fk, lock) => {
    if (!st) return null;
    const dis = !canEdit || lock;
    const set = (patch) => setPlace((pl) => updAt(pl, fk, (s0) => ({ ...s0, ...patch })));
    const n = pv.counts[fk] || 0;
    const plan = numOr(st.qty, 0);
    const colour = f.color || styleOf("point", f.child.code).colour;
    const plain = subOf(f).filter((x) => !isMapField(x));
    return (
      <div key={fk} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0", borderTop: `1px solid ${C.b1}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <MarkIcon mark={f.mark || "dot"} colour={colour} size={15} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{f.label}</span>
          {lookLink(f, fk)}
          {st.mode !== "interval" && (
            <input value={st.qty} inputMode="numeric" placeholder="0" disabled={dis} aria-label={t("map_form.kitne")}
              onChange={(e) => set({ qty: e.target.value.replace(/[^\d]/g, "").slice(0, 4) })} style={inpS} />
          )}
          {MODES.map(([v, k]) => (
            <button key={v} type="button" disabled={dis} onClick={() => { set({ mode: v }); if (v !== "manual" && clickKey === fk) setClickKey(null); }} style={chip(st.mode === v, dis)}>{t(k)}</button>
          ))}
        </div>
        {lookBox(f, fk)}
        {st.mode === "interval" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingLeft: 23 }}>
            <span style={small}>{t("map_form.har")}</span>
            <input value={st.every} inputMode="decimal" placeholder="100" disabled={dis} onChange={(e) => set({ every: e.target.value.replace(/[^\d.]/g, "") })} style={inpS} />
            <span style={small}>{t("map_form.m_shuru")}</span>
            <input value={st.start} inputMode="decimal" placeholder="0" disabled={dis} onChange={(e) => set({ start: e.target.value.replace(/[^\d.]/g, "") })} style={inpS} />
            <span style={small}>m · {t("map_form.kitne")}</span>
            <input value={st.cap} inputMode="numeric" placeholder={t("map_form.end_tak")} disabled={dis} onChange={(e) => set({ cap: e.target.value.replace(/[^\d]/g, "") })} style={{ ...inpS, width: 84 }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingLeft: 23 }}>
          <span style={{ fontSize: 11.5, color: st.mode === "manual" && n < plan ? C.amb : C.t3, fontWeight: 600 }}>
            {st.mode === "manual" ? (plan > n ? t("map_form.lage_x_y", { n, q: plan }) + " — " + t("map_form.jagah_baaki_n", { n: plan - n }) : t("map_form.lage_n", { n }))
              : t("map_form.n_lagenge", { n })}
          </span>
          {st.mode === "manual" && !dis && (
            <button type="button" onClick={() => { setClickKey(clickKey === fk ? null : fk); setMsg(""); }} style={chip(clickKey === fk, false)}>
              {clickKey === fk ? t("map_form.click_band") : t("map_form.map_par_lagao")}
            </button>
          )}
          {clickKey === fk && (st.points || []).length > 0 && (
            <button type="button" onClick={() => set({ points: st.points.slice(0, -1) })} style={chip(false, false)}>↶ {t("map_form.pichhla_hatao")}</button>
          )}
          {lock && <span style={{ fontSize: 11, color: C.t4 }}>{t("map_form.left_jaisa")}</span>}
        </div>
        {clickKey === fk && <div style={{ fontSize: 11, color: C.t3, paddingLeft: 23 }}>{f.beside ? t("map_form.click_note_bagal") : t("map_form.click_note")}</div>}
        {plain.length > 0 && !lock && (
          <div style={{ paddingLeft: 23 }}>
            <button type="button" onClick={() => toggleD(fk)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11.5, color: C.ind, fontFamily: "inherit" }}>
              {openD.has(fk) ? "▾" : "▸"} {t("map_form.sab_par_detail", { name: f.label })}
            </button>
            {openD.has(fk) && (
              <div style={{ marginTop: 6 }}>
                <TypeDetailFields fields={plain} value={st.props} onChange={(v) => set({ props: v, propsDirty: true })} idPrefix={`pl-${fk.replace(/[^a-z0-9]/gi, "-")}`} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  const sideBlock = (f, st, fk, sd, title, lock) => {
    const src = st[sd];
    const setSrc = (patch) => setPlace((pl) => updAt(pl, prefixOf(fk) + f.key, (s0) => ({ ...s0, [sd]: { ...s0[sd], ...patch } })));
    const plain = subOf(f).filter((x) => !isMapField(x));
    const marks = mapFieldsOf(subOf(f)).filter((x) => x.type === "child");
    return (
      <div key={sd} style={{ border: `1px solid ${C.b1}`, borderRadius: 7, padding: "8px 10px", background: C.surfaceB, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.t3 }}>{title}</span>
        {plain.length > 0 && <TypeDetailFields fields={plain} value={src.props} onChange={(v) => setSrc({ props: v })} idPrefix={`pl-${fk.replace(/[^a-z0-9]/gi, "-")}-${sd}`} />}
        {marks.map((mf) => childRow(mf, (src.place || {})[mf.key], `${fk}:${sd}/${mf.key}`, lock))}
      </div>
    );
  };
  const sideRow = (f, st, fk, det, setDet) => {
    if (!st) return null;
    const v = det[f.key] || "none";
    const set = (patch) => setPlace((pl) => updAt(pl, fk, (s0) => ({ ...s0, ...patch })));
    const colour = f.color || styleOf("line", f.child.code).colour;
    return (
      <div key={fk} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 0", borderTop: `1px solid ${C.b1}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <MarkIcon mark="line" colour={colour} size={15} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.t1 }}>{f.label}</span>
          {lookLink(f, fk)}
          {["none", "left", "right", "both"].map((x) => (
            <button key={x} type="button" disabled={!canEdit} onClick={() => setDet({ ...det, [f.key]: x })} style={chip(v === x, !canEdit)}>{t(`map_form.side_${x}`)}</button>
          ))}
          {v !== "none" && (<>
            <span style={small}>{t("map_form.kinare_se_m")}</span>
            <input value={st.gap} inputMode="decimal" disabled={!canEdit} onChange={(e) => set({ gap: e.target.value.replace(/[^\d.]/g, "") })} style={inpS} />
          </>)}
        </div>
        {lookBox(f, fk)}
        {v === "both" && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.t2, cursor: "pointer", paddingLeft: 23 }}>
            <input type="checkbox" checked={!!st.same} disabled={!canEdit} onChange={(e) => set({ same: e.target.checked })} />
            {t("map_form.dono_ek_jaisi")}
          </label>
        )}
        {v !== "none" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 23 }}>
            {v === "both" && st.same ? sideBlock(f, st, fk, "left", t("map_form.dono_taraf"), false)
              : (v === "both" ? ["left", "right"] : [v]).map((sd) => sideBlock(f, st, fk, sd, t(`map_form.side_${sd}`), false))}
          </div>
        )}
      </div>
    );
  };
  const top = mapFieldsOf(fields);
  if (!top.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        {top.map((f) => (f.type === "child" ? childRow(f, place[f.key], f.key, false) : sideRow(f, place[f.key], f.key, detail || {}, setDetail)))}
      </div>
      {msg && <div style={{ fontSize: 11.5, color: C.amb }}>{msg}</div>}
      {loadMaps && (
        <div style={{ position: "relative", height: mapHeight, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.b1}`, background: "#EEF1F5" }}>
          <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />
          {clickKey && (
            <div style={{ position: "absolute", left: 8, top: 8, padding: "5px 9px", borderRadius: 6, background: "rgba(255,255,255,0.95)", border: `1px solid ${C.b1}`, fontSize: 11.5, color: C.t1, fontWeight: 600 }}>
              {(pv.fields[clickKey] || {}).label}: {t("map_form.line_par_click")}
            </div>
          )}
        </div>
      )}
      {loadMaps && <div style={{ fontSize: 11, color: C.t4 }}>{t("map_form.preview_note")}</div>}
    </div>
  );
}

const smallBtnS = (primary) => ({ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: primary ? 700 : 500,
  border: primary ? "none" : `1px solid ${C.b1}`, background: primary ? C.ind : C.surface, color: primary ? "#fff" : C.t2 });

// ══════════════════════════════════════════════════════════════════
// LINE → RAKBA (11 Oct 2026) — khinchi line ke point band karke rakba.
// Rakba ka type alag chuno (Plot / Boundary…). Default: line bhi rahe
// (sadak ke saath zameen ka hissa); "Line ki jagah rakba" par line hat'ti hai.
// onSave(atype, keepLine) → string (galti) ya null.
// ══════════════════════════════════════════════════════════════════
export function ToAreaDialog({ name, onClose, onSave }) {
  const opts = typesFor("area");
  const [code, setCode] = useState((opts.find(([c]) => c === "plot") || opts[0] || ["other"])[0]);
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    const m = await onSave(code, keep);
    if (m) { setErr(m); setBusy(false); }
  };
  const radio = (v, label, note) => (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", padding: "8px 10px", borderRadius: 8,
      border: `1px solid ${keep === v ? C.ind : C.b1}`, background: keep === v ? C.indL : C.surface }}>
      <input type="radio" checked={keep === v} onChange={() => setKeep(v)} style={{ marginTop: 2 }} />
      <span><span style={{ fontSize: 12.5, fontWeight: 600, color: C.t1 }}>{label}</span>
        <span style={{ display: "block", fontSize: 11, color: C.t4, marginTop: 2 }}>{note}</span></span>
    </label>
  );
  return (
    <div onClick={busy ? undefined : onClose} style={{ position: "fixed", inset: 0, zIndex: 9996, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{ width: 440, maxWidth: "100%", background: C.surface, borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.2)", padding: 16, fontFamily: "'Segoe UI',system-ui,sans-serif", display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{t("map_form.rakba_banao")}</div>
          <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{name}</div>
        </div>
        <div style={{ fontSize: 11.5, color: C.t3, lineHeight: 1.5 }}>{t("map_form.rakba_note")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StyleSwatch kind="area" code={code} size={18} />
          <PickSelect value={code} onChange={(e) => setCode(e.target.value)}
            style={{ flex: 1, padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${C.b1}`, fontSize: 12.5, fontFamily: "inherit" }}>
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </PickSelect>
        </div>
        {radio(true, t("map_form.line_bhi_rahe"), t("map_form.line_bhi_rahe_note"))}
        {radio(false, t("map_form.line_ki_jagah"), t("map_form.line_ki_jagah_note"))}
        {err && <div style={{ padding: "7px 10px", borderRadius: 7, background: C.redL, color: C.red, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} disabled={busy} style={smallBtnS(false)}>{t("common.cancel")}</button>
          <button type="button" onClick={go} disabled={busy} style={smallBtnS(true)}>{busy ? "…" : t("map_form.rakba_banao")}</button>
        </div>
      </div>
    </div>
  );
}
