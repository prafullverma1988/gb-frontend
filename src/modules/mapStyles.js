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
import { useEffect, useState, useCallback } from "react";
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
  if (f.type === "select") {
    const o = (f.options || []).find((x) => String(x.v) === String(v));
    return o ? o.l : String(v);
  }
  if (f.type === "number" && f.unit) return `${v} ${f.unit}`;
  return String(v);
}
// [naam, value] — sirf bhare hue, form ke kram me (card / detail ke liye).
export function propsRows(kind, code, props, hide) {
  const p = props || {};
  return formOf(kind, code)
    .filter((f) => !(hide || []).includes(f.key))
    .map((f) => [f.label || f.key, fieldValue(f, p[f.key])])
    .filter((r) => r[1] != null);
}

// Export / register ke liye: [key, kachchi value, label, dikhne wali] — GIS
// ka column key (har bhasha me ek jaisa), padhne ke liye label.
export function detailPairs(kind, code, props) {
  const p = props || {};
  const out = formOf(kind, code).filter((f) => !blank(p[f.key]))
    .map((f) => [f.key, String(p[f.key]), f.label || f.key, fieldValue(f, p[f.key])]);
  if (Array.isArray(p.poles)) out.push(["poles", String(p.poles.length), t("map_form.pole_ginti"), String(p.poles.length)]);
  return out;
}

// Form — type chunte hi uske field. Chhoti list chips me (dobara dabao to
// khaali), lambi list picker me. hide: jo field is jagah alag se poochhe
// jaate hain (jaise tender me "Chaudai").
export function TypeDetailFields({ fields, value, onChange, hide, idPrefix = "tdf" }) {
  const list = (fields || []).filter((f) => !(hide || []).includes(f.key));
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
          : f.type === "select" ? (f.options || []).map((o) => [o.v, o.l]) : null;
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
            ) : f.type === "number" ? (
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
export function drainPaths(code, props, pts, widthM) {
  const p = props || {};
  if (templateOf("line", code) !== "road" || !["left", "right", "both"].includes(p.drain_side)) return [];
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
// ── Electrical line ke pole. Phone par chal kar bani line me pole ki jagah
// alag likhi hoti hai (props.poles — "⚡ Pole yahan"), kyunki wahan har 2–5 m
// par point hai. Na ho to line ka har point ek pole (tap / draw). Pole
// "none" chuna ho to nahi.
export function polePoints(code, props, pts) {
  if (templateOf("line", code) !== "electrical" || !Array.isArray(pts) || pts.length < 2) return [];
  const p = props || {};
  if (p.pole === "none") return [];
  if (Array.isArray(p.poles)) {
    return p.poles.map((q) => ({ lat: Number(q[0]), lng: Number(q[1]) })).filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.lng));
  }
  return pts;
}
export function poleIcon(g, colour) {
  return { path: g.maps.SymbolPath.CIRCLE, scale: 3.6, fillColor: "#FFFFFF", fillOpacity: 1, strokeColor: colour, strokeWeight: 2 };
}

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
const fieldTypeText = (f) => (f.type === "select"
  ? `${t("map_form.ft_select")}: ${(f.options || []).slice(0, 4).map((o) => o.l).join(", ")}${(f.options || []).length > 4 ? "…" : ""}`
  : t((FIELD_TYPES.find((x) => x[0] === f.type) || FIELD_TYPES[3])[1]));
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
  const [nf, setNf] = useState(null);              // naya field: { label, type, unit, options, required }
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
    setDraft(null); setNf(null);
    await reload();
  };
  const addField = (row, fields) => {
    const label = String(nf.label || "").trim();
    if (!label) { setErr(t("map_form.field_naam_likho")); return; }
    let base = slug(label);
    if (!/^[a-z]/.test(base)) base = `f_${base || Date.now().toString(36)}`.slice(0, 26);
    const used = new Set(fields.map((f) => f.key));
    let key = base, n = 2;
    while (used.has(key)) key = `${base}_${n++}`;
    const f = { key, label, type: nf.type, required: !!nf.required };
    if (nf.type === "number" && String(nf.unit || "").trim()) f.unit = String(nf.unit).trim();
    if (nf.type === "select") {
      const opts = String(nf.options || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!opts.length) { setErr(t("map_form.options_likho")); return; }
      f.options = opts.map((l, i) => ({ v: slug(l) || `o${i + 1}`, l }));
    }
    setErr(""); setNf(null);
    setDraft({ key: `${row.kind}:${row.code}`, fields: [...fields, f] });
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
        {fields.length === 0 && <div style={{ fontSize: 11.5, color: C.t4, paddingLeft: 80 }}>{t("map_form.koi_field_nahi")}</div>}
        {fields.length > 0 && (
          <div style={{ border: `1px solid ${C.b1}`, borderRadius: 7, background: C.surface }}>
            {fields.map((f, i) => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderTop: i ? `1px solid ${C.b1}` : "none" }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.t1, fontWeight: 600 }}>
                  {f.label}{f.unit ? <span style={{ color: C.t4, fontWeight: 400 }}>{` (${f.unit})`}</span> : null}
                  <span style={{ display: "block", fontSize: 10.5, color: C.t4, fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fieldTypeText(f)}</span>
                </span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: C.t3, cursor: canEdit ? "pointer" : "default" }}>
                  <input type="checkbox" checked={!!f.required} disabled={!canEdit || !!busy}
                    onChange={(e) => edit(fields.map((x) => (x.key === f.key ? { ...x, required: e.target.checked } : x)))} />
                  {t("map_form.zaroori")}
                </label>
                {canEdit && (
                  <button type="button" title={t("map_form.field_hatao")} aria-label={t("map_form.field_hatao")} disabled={!!busy}
                    onClick={() => edit(fields.filter((x) => x.key !== f.key))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.t4, fontSize: 15, lineHeight: 1, padding: "0 2px" }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}
        {canEdit && !nf && (
          <div>
            <button type="button" onClick={() => setNf({ label: "", type: "number", unit: "", options: "", required: false })} disabled={!!busy}
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
              {nf.type === "number" && (
                <input value={nf.unit} maxLength={12} placeholder={t("map_form.unit_ph")}
                  onChange={(e) => setNf({ ...nf, unit: e.target.value })} style={{ ...inpS, flex: "0 1 100px" }} />
              )}
            </div>
            {nf.type === "select" && (
              <input value={nf.options} maxLength={600} placeholder={t("map_form.options_ph")}
                onChange={(e) => setNf({ ...nf, options: e.target.value })} style={inpS} />
            )}
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: C.t2, cursor: "pointer" }}>
              <input type="checkbox" checked={!!nf.required} onChange={(e) => setNf({ ...nf, required: e.target.checked })} />
              {t("map_form.zaroori_note")}
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setNf(null)} style={smallBtn(false)}>{t("common.cancel")}</button>
              <button type="button" onClick={() => addField(row, fields)} style={smallBtn(true)}>{t("map_style.jodo")}</button>
            </div>
          </div>
        )}
        {canEdit && (dirty || (row.fields_custom && row.template)) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {dirty && <button type="button" disabled={!!busy} onClick={() => saveForm(row, { fields: draft.fields })} style={smallBtn(true)}>{t("map_form.form_save")}</button>}
            {dirty && <button type="button" disabled={!!busy} onClick={() => { setDraft(null); setNf(null); }} style={smallBtn(false)}>{t("common.cancel")}</button>}
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
            <button key={k} type="button" onClick={() => { setTab(k); setOpen(null); setAdd(null); setDraft(null); setNf(null); }}
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
                  <div role="button" tabIndex={0} onClick={() => { setOpen(isOpen ? null : key); setNf(null); }} onKeyDown={(e) => { if (e.key === "Enter") { setOpen(isOpen ? null : key); setNf(null); } }}
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
