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

// Task plan ka faisla — server SIRF code bhejta hai (create / update /
// unchanged / now_zero), vaakya yahan banta hai. Wahi niyam jo err/warn par.
export const actionLabel = (a) => ({
  create:    t("road.act_create"),
  update:    t("road.act_update"),
  unchanged: t("road.act_unchanged"),
  now_zero:  t("road.act_now_zero"),
}[a] || a || "—");

export const actionTone = (a) => ({
  create:    { c: T.grn, bg: T.grnL, b: T.grnM },
  update:    { c: T.ind, bg: T.indL, b: T.bluM },
  unchanged: { c: T.t4,  bg: T.sltL, b: T.b1 },
  now_zero:  { c: T.amb, bg: T.ambL, b: T.ambM },
}[a] || { c: T.t4, bg: T.sltL, b: T.b1 });

// note bhi code hai — abhi sirf ek: kaam_shuru_sirf_scope
const NOTE_CODES = ["kaam_shuru_sirf_scope"];
export const noteLabel = (n) => (n && NOTE_CODES.includes(n) ? t("road.note_" + n) : "");

// blocked[].reason do tarah ka aata hai aur dono sambhalne padte hain:
//   • roadTasks.js khud "task_nahi_mila" jaisa CODE bhejta hai — uska
//     vaakya yahan banta hai
//   • budgetNode.js (Budget module ke saath saanjha) abhi poora HINGLISH
//     vaakya bhejta hai ("is task par pehle se qty darj hai"). Usse code
//     me badalna backend ka kaam hai; tab tak wo jaisa hai waisa dikhta
//     hai — warna English/Hindi user ko kuch bhi nahi dikhega.
const BLOCK_CODES = ["task_nahi_mila", "kaam_shuru"];
export const blockReason = (r) => {
  const s = String(r || "").trim();
  if (!s) return t("road.block_unknown");
  return BLOCK_CODES.includes(s) ? t("road.block_" + s) : s;
};

export const rupee = (n) => (num(n) == null ? "—" : "₹" + Math.round(Number(n)).toLocaleString("en-IN"));

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
//
// Code ki list jaan-boojh kar yahan likhi hai: backend kal koi naya code
// jod de to `t("road.imp_<naya>")` par key hoti hi nahi, aur user ko
// screen par KEY KA NAAM dikhta (yahi wo bug hai jiske liye leaks.js
// banayi gayi thi — par computed key wo bhi nahi pakad sakti). Anjaan
// code par ek saaf line dikhti hai, key nahi.
const IMP_CODES = ["ch_missing", "ch_dup", "frl_missing", "no_level", "level_ajeeb", "outlier"];
const WARN_KINDS = ["no_levels", "frl_missing", "no_points", "narrow", "outlier", "gap", "too_few_chainages"];

export const impMsg = (x) => {
  const c = x && x.code;
  return t("road.imp_" + (IMP_CODES.includes(c) ? c : "unknown"), x || {});
};
export const warnMsg = (w) => {
  const k = w && w.kind;
  return t("road.warn_" + (WARN_KINDS.includes(k) ? k : "unknown"), w || {});
};

// POST/GET /calc rukne par server roadCalc ka CODE hi bhejta hai
// ("too_few_chainages") — wahan vaakya banta hi nahi. Naye task/review
// route usi code ko pehle hi localize kar dete hain, isliye dono soorat
// sambhalni hai: jaana-pehchana code ho to bhasha, warna jo aaya wahi.
export const calcErrMsg = (msg) => {
  const s = String(msg || "").trim();
  return WARN_KINDS.includes(s) ? t("road.warn_" + s) : s;
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

// ── FACTORS ───────────────────────────────────────────────────────
// Company ki setting, design-wise bhi badal sakti hai. Default
// GET /road/meta → default_factors se aate hain; yahan sirf naam aur
// samjhaane wali line hai.
//
// Ye paanchon ankde abhi SHURUAATI hain — KB me har ek par
// [BUSINESS-CHECK] laga hai, GB Buildcon ke asli anubhav se pakke hone
// baaki hain. Screen par wahi baat likhi jaati hai.
export const FACTOR_FIELDS = [
  { key: "bank_to_compacted", step: "0.01", label: () => t("road.fx_bank_to_compacted"), hint: () => t("road.fx_bank_to_compacted_hint") },
  { key: "compacted_to_loose", step: "0.01", label: () => t("road.fx_compacted_to_loose"), hint: () => t("road.fx_compacted_to_loose_hint") },
  { key: "stripping_mm", step: "1", label: () => t("road.fx_stripping_mm"), hint: () => t("road.fx_stripping_mm_hint") },
  { key: "side_slope_cut", step: "0.1", label: () => t("road.fx_side_slope_cut"), hint: () => t("road.fx_side_slope_cut_hint") },
  { key: "side_slope_fill", step: "0.1", label: () => t("road.fx_side_slope_fill"), hint: () => t("road.fx_side_slope_fill_hint") },
];

// ── AI ────────────────────────────────────────────────────────────
// Teen jagah, aur sirf teen. Har jawab SUJHAAV hai — `is_suggestion`
// hamesha true aata hai aur kuch bhi apne aap save nahi hota. Qty, area,
// volume aur paisa AI se KABHI nahi aate; wo poora ganit code karta hai.
//
// Key na lagi ho to server saaf mana karta hai (road.ai_abhi_uplabdh_nahi).
// Us soorat me button tootta nahi — uski jagah wahi line likh dete hain,
// taaki aadmi ko pata chale ki form haath se bharna hai.
export const aiUnavailable = (r) =>
  !!(r && !r.success && String(r.message || "") === t("road.ai_abhi_uplabdh_nahi"));

// Drawing ki photo Cloudinary par jaati hai (wahi unsigned preset jo
// Design tab ke drawings use karte hain) — server ko URL chahiye.
// Sirf IMAGE: backend use vision model ko bhejta hai, aur PDF `raw` par
// jaata hai jise model khol nahi paata.
const CLOUD_NAME = "dd632nqfm";
const UPLOAD_PRESET = "gb_buildcon_drawings";
export const uploadDrawingImage = (file) => new Promise((resolve, reject) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", "gb_buildcon/road_sections");
  const xhr = new XMLHttpRequest();
  xhr.onload = () => {
    try {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status === 200) resolve(data.secure_url);
      else reject(new Error((data.error && data.error.message) || "upload failed"));
    } catch (_) { reject(new Error("upload failed")); }
  };
  xhr.onerror = () => reject(new Error("network"));
  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
  xhr.send(fd);
});

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

// Har AI wali jagah par khadi rehne wali line. Teeno jagah ek hi vaakya
// rehna chahiye — isliye ek hi component, teen copy nahi.
export const AiNote = ({ style }) => (
  <div style={{
    display: "flex", gap: 7, alignItems: "flex-start", padding: "8px 11px",
    background: T.sltL, border: `1px solid ${T.b1}`, borderRadius: 7,
    fontSize: 11, color: T.t3, lineHeight: 1.5, ...style,
  }}>
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={T.t4} strokeWidth={2}
      style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01" /></svg>
    <span>{t("road.ai_sirf_sujhaav")}</span>
  </div>
);
