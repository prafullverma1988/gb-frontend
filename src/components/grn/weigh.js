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

// GRN ki row me kitna bharna hai — net aa gaya ho (aur order wazan me ho) to
// net, warna is gadi ke challan ki qty (jab uski unit order jaisi ho). Kuch
// na mile to null — aadmi khud bhare.
export function suggestedQty(hit, unit) {
  if (!hit) return null;
  const { line, trip } = hit;
  const closed = trip.status === "Closed" && Number(line.net_kg_share) > 0;
  if (closed && kgPerUnit(unit)) return kgIn(line.net_kg_share, unit).qty;
  const cUnit = String(line.challan_unit || "").trim() || line.order_unit;
  const cQty = Number(line.challan_qty);
  if (cQty > 0 && String(cUnit || "") === String(unit || "")) return cQty;
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
