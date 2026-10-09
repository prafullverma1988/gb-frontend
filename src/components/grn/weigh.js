// Dharam kata (weighbridge) — web ke chhote helpers.
// Backend: routes/weighments.js, utils/grnReceive.js (kgPerUnit wahi niyam).
import api from "../../config/api";

// Order agar wazan me hai (kg / Ton / MT / quintal) to net hi aaya hua maal hai.
export function kgPerUnit(unit) {
  const u = String(unit || "").trim().toLowerCase().replace(/\./g, "");
  if (/^(kg|kgs|kilo|kilogram|kilograms)$/.test(u)) return 1;
  if (/^(t|ton|tons|tonne|tonnes|mt|mts|metric ton|metric tonne)$/.test(u)) return 1000;
  if (/^(q|qtl|qtls|quintal|quintals)$/.test(u)) return 100;
  return null;
}

// Challan ki unit order ki unit se alag ho sakti hai: order aksar "2 Nos"
// (= 2 gadi) ya cft me hota hai aur challan par wazan likha aata hai. Pehle
// challan ki qty hamesha order ki unit me hi bharni padti thi — ek gadi ka
// wazan kahin darj hi nahi hota tha. Wahi list app (src/weighShared.js) me.
export const WEIGH_UNITS = ["Ton", "kg", "Quintal"];
export function challanUnits(orderUnit) {
  const u = String(orderUnit || "").trim();
  const out = u ? [u] : [];
  for (const w of WEIGH_UNITS) if (!out.some((x) => x.toLowerCase() === w.toLowerCase())) out.push(w);
  return out;
}

// ── Library → Units ki list (9 Oct 2026, C — plan D.1 ka web hissa) ──
// GRN kit (components/grn) ki screens — abhi kaante ka bina order maal; D me
// GrnReceive / DualUnitToggle bhi. Chhota roop (symbol) save hota hai, dikhta
// "Kg — Kilogram". Case / ant ke "s" ka farak ek hi unit (kg/Kg, Bag/Bags) —
// list me ek baar, Library wali spelling. Jo unit list me nahi (material ki
// Library unit, purana data) wo sabse upar rehti hai — PickSelect me value na
// mile to pehla option dikhta aur save kuch aur hota.
export function unitKey(u) {
  let k = String(u || "").trim().toLowerCase().replace(/\./g, "");
  if (k.length > 3 && k.endsWith("s") && !k.endsWith("ss")) k = k.slice(0, -1);
  return k;
}
let uomCache = null, uomInFlight = null;
export function loadLibUnits() {
  if (uomCache) return Promise.resolve(uomCache);
  if (!uomInFlight) {
    uomInFlight = api.get("/library/uom")
      .then((r) => { if (r && r.success && Array.isArray(r.data)) uomCache = r.data; return uomCache || []; })
      .catch(() => [])
      .finally(() => { uomInFlight = null; });
  }
  return uomInFlight;
}
// uoms (Library) + extra (chuni hui unit, material ki Library unit — hamesha
// rahein, isi spelling me, taaki select ki value list me mile) → [{ value, label }]
export function unitOptions(uoms, extra) {
  const out = [];
  const has = (v) => out.some((o) => unitKey(o.value) === unitKey(v));
  for (const e of extra || []) { const v = String(e || "").trim(); if (v && !has(v)) out.push({ value: v, label: v }); }
  for (const u of uoms || []) {
    const sym = String(u.symbol || u.name || "").trim();
    const nm = String(u.name || "").trim();
    if (sym && !has(sym)) out.push({ value: sym, label: nm && nm.toLowerCase() !== sym.toLowerCase() ? sym + " — " + nm : sym });
  }
  return out;
}

export const fmtKg = (n) =>
  n == null || n === "" || isNaN(Number(n)) ? "—" : Math.round(Number(n)).toLocaleString("en-IN") + " kg";

// kg → order ki unit (sirf wazan wali unit par; warna Ton)
export function kgIn(kg, unit) {
  const k = kgPerUnit(unit);
  const v = Number(kg) / (k || 1000);
  return { qty: Math.round(v * 1000) / 1000, unit: k ? unit : "Ton" };
}

export const destParam = (dest) =>
  dest?.type === "warehouse"
    ? "warehouse_id=" + encodeURIComponent(dest.warehouseId || "")
    : "project_id=" + encodeURIComponent(dest?.projectId || "");

export async function loadWeighments(dest, status = "all") {
  try {
    const r = await api.get(`/weighments?status=${status}&${destParam(dest)}`);
    return r && r.success ? (r.data || []) : [];
  } catch (_) { return []; }
}

// GRN form ke liye: jo lines abhi kisi GRN se nahi judi, unka index —
// MR se, godown MR ke item se, ya (bina order ke maal ke liye) naam se.
// byMr/… = pehli (sabse purani) gadi; allBy… = us order ki SAB tuli gadiyan;
// trucks = har gadi jiska kuch maal abhi GRN me nahi utra — GRN "gadi-wise"
// karne ke liye (28 Sep 2026).
export function indexOpenLines(trips) {
  const byMr = {}, byWhItem = {}, byName = {}, byPoItem = {};
  const allByMr = {}, allByWhItem = {}, allByName = {}, allByPoItem = {};
  const trucks = [];
  for (const w of trips || []) {
    if (w.status === "Cancelled") continue;
    const open = (w.lines || []).filter((l) => !l.grn_item_id);
    if (open.length) trucks.push({ trip: w, lines: open });
    for (const l of open) {
      const hit = { line: l, trip: w };
      if (l.mr_id) { (allByMr[l.mr_id] ||= []).push(hit); if (!byMr[l.mr_id]) byMr[l.mr_id] = hit; }
      else if (l.po_item_id) { (allByPoItem[l.po_item_id] ||= []).push(hit); if (!byPoItem[l.po_item_id]) byPoItem[l.po_item_id] = hit; }
      else if (l.wh_mr_item_id) { (allByWhItem[l.wh_mr_item_id] ||= []).push(hit); if (!byWhItem[l.wh_mr_item_id]) byWhItem[l.wh_mr_item_id] = hit; }
      else {
        const k = String(l.material_name || "").trim().toLowerCase();
        if (k) { (allByName[k] ||= []).push(hit); if (!byName[k]) byName[k] = hit; }
      }
    }
  }
  // Purani gadi pehle — jo pehle tuli, uska GRN pehle.
  trucks.sort((a, b) => Number(a.trip.id) - Number(b.trip.id));
  return { byMr, byWhItem, byName, byPoItem, allByMr, allByWhItem, allByName, allByPoItem, trucks };
}

// Gadi ginne wali unit — order "10 Nos" = 10 gadi (29 Sep 2026).
export function isGadiUnit(unit) {
  return /^(nos|no|trip|trips|gadi|truck|trucks|load|loads|hywa|dumper|tipper)$/.test(
    String(unit || "").trim().toLowerCase().replace(/\./g, ""));
}

// GRN ki row me kitna bharna hai (29 Sep 2026 se — app src/weighShared.js me wahi):
//   order wazan me (Ton/kg/MT/quintal) → kaante ka net us unit me; net abhi nahi
//     (khali tolna baaki) → challan ka wazan us unit me — net aate hi server GRN
//     ki qty khud sudhar deta hai
//   challan ki unit order jaisi (CFT, ya bags Nos me gine) → challan ki qty
//   order gadi me (Nos) → 1 gadi
// Kuch na mile to null — aadmi khud bhare. Bhara hua hamesha badla ja sakta hai.
export function suggestedQty(hit, unit) {
  if (!hit) return null;
  const { line, trip } = hit;
  const k = kgPerUnit(unit);
  const cUnit = String(line.challan_unit || "").trim() || line.order_unit;
  const cQty = Number(line.challan_qty);
  if (k) {
    if (trip.status === "Closed" && Number(line.net_kg_share) > 0) return kgIn(line.net_kg_share, unit).qty;
    const ck = kgPerUnit(cUnit);
    return cQty > 0 && ck ? Math.round(((cQty * ck) / k) * 1000) / 1000 : null;
  }
  if (cQty > 0 && String(cUnit || "").toLowerCase() === String(unit || "").toLowerCase()) return cQty;
  if (isGadiUnit(unit)) return 1;
  return null;
}

// Ek PO ki tolai — PO wale GRN (Procurement) ke liye. Server line ko PO ki
// line se ya us MR se milata hai jisse PO ki line bani thi.
export async function loadWeighmentsForPo(poId) {
  try {
    const r = await api.get("/weighments?status=all&po_id=" + encodeURIComponent(poId));
    return r && r.success ? (r.data || []) : [];
  } catch (_) { return []; }
}
