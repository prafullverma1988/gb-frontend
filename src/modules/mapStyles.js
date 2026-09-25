// ══════════════════════════════════════════════════════════════════════
// MAP LIBRARY (web) — kaunsi line kis rang/style me, kaunsa structure kis
// shape/rang me. Company ki ek library, Tenders ka Pipeline Map aur Site
// Mapping dono isi se rangte hain. Rang SIRF type se aata hai (Prafull,
// 2026-09-24) — ek type = ek rang, naksha ek nazar me padha jaaye.
//
// Server: GET /tenders/alignments/feature-types (built-in + apne type, har
// ek ka style), PUT …/feature-types/style (Tenders ya Mapping ka Edit),
// POST …/feature-types (naya type — Tenders ka Create).
// ══════════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback } from "react";
import api from "../config/api";
import { t } from "../i18n";

// ── Library ka ek hi cache — poore page par ek fetch ──────────────
let _lib = null;           // { list, canEdit, canCreate }
let _p = null;
const _subs = new Set();
const notify = () => _subs.forEach((fn) => fn(_lib));
export function loadMapLibrary(force) {
  if (_p && !force) return _p;
  _p = api.get("/tenders/alignments/feature-types").then((r) => {
    if (r && r.success) {
      _lib = { list: Array.isArray(r.data) ? r.data : [], canEdit: !!r.can_edit, canCreate: !!r.can_create };
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
  b1: "#E5E7EB", ind: "#4B45C4", indL: "#EEF2FF", red: "#DC2626", redL: "#FEF2F2",
};
const WIDTHS = [[2, "map_style.width_patli"], [4, "map_style.width_beech"], [6, "map_style.width_moti"], [9, "map_style.width_bahut_moti"]];
const DASHES = [["solid", "map_style.dash_solid"], ["dashed", "map_style.dash_dashed"], ["dotted", "map_style.dash_dotted"]];
const FILLS = [[0.12, "map_style.fill_halka"], [0.22, "map_style.fill_beech"], [0.4, "map_style.fill_gehra"]];

export function MapLibraryDialog({ onClose }) {
  const { lib, reload } = useMapLibrary();
  const [tab, setTab] = useState("line");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);          // khula row: kind:code
  const [add, setAdd] = useState(null);            // { label, colour, shape }
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
  const create = async () => {
    const label = String(add.label || "").trim();
    if (!label) { setErr(t("map_style.naam_daalo")); return; }
    setBusy("new"); setErr("");
    const r = await api.post("/tenders/alignments/feature-types", { label, kind: tab, colour: add.colour, shape: add.shape }).catch(() => null);
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
    </div>
  );

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
            <button key={k} type="button" onClick={() => { setTab(k); setOpen(null); setAdd(null); }}
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
