// ══════════════════════════════════════════════════════════════════════
// ROAD LEVELS — shared bits (API helpers, labels, formatters, gating).
//
// Poora section Design tab ke andar rehta hai:
//   road/RoadLevels.js          — design ki list + naya design
//   road/RoadSectionTemplate.js — library ka cross-section editor
//   road/RoadLevelsImport.js    — survey sheet ka staged import (BOQ wizard wala dhang)
//   road/RoadDesignDetail.js    — levels, mitti ke zone, aur nateeja
//
// API contract: gb-backend/routes/road-levels.js (mounted at /api/road),
// ganit gb-backend/utils/roadCalc.js. Yahan koi qty nahi banti — server jo
// bhejta hai wahi dikhta hai.
//
// ⚠ err/warn SIRF code hote hain ({"code":"ch_dup","ch":40}). Bhasha yahan
// banti hai — `road.imp_<code>` / `road.warn_<kind>`. Raw code kabhi screen
// par nahi jaata: DB me jama hua code English/Hindi user ko bhi Hinglish
// dikha deta (RMC me yahi galti ho chuki hai).
// ══════════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import api, { API_BASE, getToken } from "../../config/api";
import apiCache from "../../utils/apiCache";
import { can } from "../../utils/perms";
import { T } from "../shared/tokens";
import { t } from "../../i18n";

// Module ki do chaabi — SaaS entitlement aur Roles & Access ki row.
export const ROAD_MODULE_KEY = "road_levels";
export const ROAD_PERM = "Road Levels";

// ── API ───────────────────────────────────────────────────────────
export const qs = (params) => Object.entries(params || {})
  .filter(([, v]) => v !== "" && v != null)
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

export const rget    = (path, params) => { const q = qs(params); return api.get("/road" + path + (q ? "?" + q : "")); };
export const rpost   = (path, body) => api.post("/road" + path, body);
export const rpatch  = (path, body) => api.patch("/road" + path, body);
export const rput    = (path, body) => api.put("/road" + path, body);
export const rdelete = (path) => api.delete("/road" + path);
export const dataOf  = (r, fallback) => (r && r.success ? (r.data == null ? fallback : r.data) : fallback);

// ── NUMBERS ───────────────────────────────────────────────────────
// Khaali khaana 0 nahi hai. Number(null) aur Number("") dono 0 dete hain —
// us bhool se bina naape hue level 0.000 ban jaate hain aur screen jhooth
// bolti hai. Engine me bhi yahi guard hai (utils/roadCalc.js).
export const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
export const n2 = (v) => (num(v) == null ? "—"
  : Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const n3 = (v) => (num(v) == null ? "—"
  : Number(v).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
export const nInt = (v) => (num(v) == null ? "—" : Math.round(Number(v)).toLocaleString("en-IN"));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtD = (raw) => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.getDate() + " " + MONTHS[d.getMonth()] + " " + String(d.getFullYear()).slice(2);
};

// ── LABELS ────────────────────────────────────────────────────────
// Parat kitni door tak failti hai. Values backend ke GET /road/meta se
// aati hain — yahan sirf unka naam banta hai.
export const EXTENTS = ["carriageway", "paved", "formation", "median"];
export const extentLabel = (e) => ({
  carriageway: t("road.extent_carriageway"),
  paved:       t("road.extent_paved"),
  formation:   t("road.extent_formation"),
  median:      t("road.extent_median"),
}[e] || e || "—");

export const SOIL_CASES = ["A", "B", "C"];
export const caseLabel = (c) => ({
  A: t("road.case_a"), B: t("road.case_b"), C: t("road.case_c"),
}[c] || c || "—");
export const caseHint = (c) => ({
  A: t("road.case_a_hint"), B: t("road.case_b_hint"), C: t("road.case_c_hint"),
}[c] || "");

// ── CODE → BHASHA ─────────────────────────────────────────────────
// Server se `[{"code":"ch_dup","ch":40}]` aata hai. Poora vaakya yahan
// banta hai, placeholder wahi object bhar deta hai.
export const impMsg  = (x) => t("road.imp_"  + (x && x.code ? x.code : "unknown"), x || {});
export const warnMsg = (w) => t("road.warn_" + (w && w.kind ? w.kind : "unknown"), w || {});

// Calc rukne par server code hi bhejta hai ("too_few_chainages"), kyunki
// wo roadCalc ka nateeja hai — vaakya nahi. Usi ko yahan bhasha milti hai.
export const calcErrMsg = (msg) => {
  const s = String(msg || "");
  return /^[a-z][a-z0-9_]*$/.test(s) ? t("road.warn_" + s) : s;
};

// staged row ke err/warn kabhi string (JSON) bhi ho sakte hain — GET
// parse karke deta hai, PATCH ka jawab bhi, par bharosa na karke dono
// sambhaal lo.
export const codeList = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; }
};

// ── FILE DOWNLOAD ─────────────────────────────────────────────────
// Earthwork sheet fetch se aati hai — <a href> par token nahi jaata,
// isliye Authorization header khud lagana padta hai.
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};
export const fetchBlob = async (path) => {
  const res = await fetch(`${API_BASE}/road${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error("download failed");
  return await res.blob();
};

// ── GATING ────────────────────────────────────────────────────────
// Do alag rok hain aur dono lagti hain:
//   1. company ne module liya hai ya nahi (SaaS Admin → Modules)
//   2. is user ke role ke paas view ka bit hai ya nahi (Roles & Access)
// Sidebar bhi thik yahi kram maanta hai (src/App.js ka isVisible).
export function useRoadAccess() {
  const [modOn, setModOn] = useState(() => {
    const c = apiCache.get("road:modules");
    return c ? c[ROAD_MODULE_KEY] !== false : null;
  });
  useEffect(() => {
    if (modOn !== null) return;
    let alive = true;
    api.get("/settings/modules")
      .then((r) => {
        const map = {};
        (dataOf(r, []) || []).forEach((m) => { if (m && m.key != null) map[m.key] = !!Number(m.is_enabled); });
        apiCache.set("road:modules", map, 5 * 60 * 1000);
        // Key hi na ho to module KHULA hai — wahi niyam backend document karta hai.
        if (alive) setModOn(map[ROAD_MODULE_KEY] !== false);
      })
      // Network gir gaya to rok mat lagao; asli rok server par hai.
      .catch(() => { if (alive) setModOn(true); });
    return () => { alive = false; };
  }, [modOn]);
  return { ready: modOn !== null, show: modOn === true && can(ROAD_PERM, "view") };
}

export const canRoad = (action) => can(ROAD_PERM, action);

// ── STYLE ─────────────────────────────────────────────────────────
// Baaki module ki tarah inline styles. Indigo (#4B45C4 = T.ind) hi is
// section ka rang hai — gradient kahin nahi, dhaancha hairline aur
// khaali jagah se banta hai.
export const S = {
  inp: {
    width: "100%", padding: "7px 9px", border: `1px solid ${T.b1}`, borderRadius: 7,
    fontSize: 12.5, color: T.t1, background: T.surfaceB, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
  },
  td: { padding: "7px 10px", borderBottom: `1px solid ${T.b1}`, fontSize: 12.5, color: T.t2 },
  th: {
    padding: "7px 10px", borderBottom: `1px solid ${T.b1}`, background: T.surfaceB,
    fontSize: 10, fontWeight: 700, color: T.t4, textTransform: "uppercase",
    letterSpacing: ".6px", textAlign: "left", whiteSpace: "nowrap",
  },
  lbl: {
    fontSize: 10, fontWeight: 700, color: T.t3, textTransform: "uppercase",
    letterSpacing: ".4px", display: "block", marginBottom: 4,
  },
  card: { background: T.surface, border: `1px solid ${T.b1}`, borderRadius: 10 },
  num: { fontVariantNumeric: "tabular-nums" },
};

export const btn = (kind, extra) => ({
  height: 34, padding: "0 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
  fontFamily: "inherit", cursor: "pointer",
  border: kind === "primary" ? "none" : `1px solid ${kind === "danger" ? T.redM : T.b1}`,
  background: kind === "primary" ? T.ind : kind === "danger" ? T.surface : T.surface,
  color: kind === "primary" ? "#fff" : kind === "danger" ? T.red : T.t2,
  ...extra,
});

// Ek chhota chip — laal (rok) ya peela (sirf dekh lo).
export const Chip = ({ text, tone }) => (
  <span style={{
    display: "inline-block", fontSize: 10.5, fontWeight: 600, lineHeight: 1.45,
    padding: "2px 8px", borderRadius: 10, marginRight: 4, marginBottom: 3,
    color: tone === "err" ? T.red : T.amb,
    background: tone === "err" ? T.redL : T.ambL,
    border: `1px solid ${tone === "err" ? T.redM : T.ambM}`,
  }}>{text}</span>
);

export const Empty = ({ text }) => (
  <div style={{ padding: "26px 16px", textAlign: "center", fontSize: 12.5, color: T.t4 }}>{text}</div>
);
