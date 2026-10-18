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
// GRN kit (components/grn) ki screens — kaante ka bina order maal, GrnReceive
// ka Direct aur DualUnitToggle ("Billing unit alag?") — 10 Oct 2026, D. Chhota roop (symbol) save hota hai, dikhta
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
  const lib = [];
  for (const u of uoms || []) {
    const sym = String(u.symbol || u.name || "").trim();
    const nm = String(u.name || "").trim();
    if (sym && !lib.some((o) => unitKey(o.value) === unitKey(sym))) lib.push({ value: sym, label: nm && nm.toLowerCase() !== sym.toLowerCase() ? sym + " — " + nm : sym });
  }
  const out = [];
  const has = (v) => out.some((o) => unitKey(o.value) === unitKey(v));
  // Extra upar; Library me bilkul yahi spelling ho to uska poora naam ("Kg — Kilogram") bhi.
  for (const e of extra || []) { const v = String(e || "").trim(); if (v && !has(v)) out.push(lib.find((o) => o.value === v) || { value: v, label: v }); }
  for (const o of lib) if (!has(o.value)) out.push(o);
  return out;
}

// ── Stock ki unit (10 Oct 2026, D.4) ──────────────────────────────
// Bina order receipt (Direct GRN) us jagah ke stock me NAAM se judti hai,
// unit dekhe bina — 100 Bag cement ke baad 500 Kg = "Cement 600". Isliye
// line ki unit stock wali se alag ho to form pehle hi poochhta hai
// "1 Kg = kitne Bag?" (stock_factor). "Same unit" server (utils/unitNorm.js)
// jaisa: case / bindu / khaali jagah / aakhri "s" (Bag = Bags) aur pakke
// hamnaam (No = Nos, M3 = Cum, MT = Ton). Wazan se wazan server khud badalta.
const UNIT_ALIAS = {
  kg: ["kg", "kgs", "kilo", "kilos", "kilogram", "kilograms"],
  ton: ["t", "ton", "tons", "tonne", "tonnes", "mt", "mts", "metricton", "metrictonne", "metrictons"],
  qtl: ["q", "qtl", "qtls", "quintal", "quintals"],
  nos: ["no", "nos", "number", "numbers"],
  cum: ["cum", "cumt", "cumtr", "cmtr", "m3", "cbm", "cubicmeter", "cubicmetre", "cubicmeters", "cubicmetres"],
  cft: ["cft", "cuft", "ft3", "cubicfeet", "cubicfoot"],
  sqft: ["sqft", "sft", "ft2", "squarefeet", "squarefoot"],
  sqm: ["sqm", "sqmt", "sqmtr", "m2", "squaremeter", "squaremetre", "squaremeters", "squaremetres"],
  ltr: ["l", "lt", "ltr", "ltrs", "litre", "litres", "liter", "liters"],
  box: ["box", "boxes"],
  // Server ke saath barabar (10 Oct 2026, D review): purani fix list ke naam. RMT ≠ Mtr abhi bhi alag.
  mtr: ["mtr", "mtrs", "meter", "meters", "metre", "metres"],
  rft: ["rft", "runningft", "runningfeet", "runningfoot"],
  pcs: ["pc", "pcs", "piece", "pieces"],
  // Gitti / GSB ki gadi — RATNA "GD" likhta hai (19 Oct 2026, unit card).
  gadi: ["gadi", "gaadi", "gaddi", "gd"],
};
const ALIAS_OF = {};
for (const [c, list] of Object.entries(UNIT_ALIAS)) for (const a of list) ALIAS_OF[a] = c;
export function canonUnit(u) {
  const k = String(u || "").trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
  if (!k) return "";
  if (ALIAS_OF[k]) return ALIAS_OF[k];
  return k.length > 3 && k.endsWith("s") && !k.endsWith("ss") ? k.slice(0, -1) : k;
}
export const sameStockUnit = (a, b) => { const x = canonUnit(a); return !!x && x === canonUnit(b); };
export const stockKey = (name) => String(name || "").trim().toLowerCase();

// Us jagah (site / store) kaun sa material kis unit me pada hai — sheet khulte
// hi EK baar: { "<naam lowercase>": { unit, units, material_name } }.
export async function loadStockUnits(dest) {
  const url = dest?.type === "warehouse"
    ? (dest.warehouseId ? "/warehouse/stock-units?warehouse_id=" + encodeURIComponent(dest.warehouseId) : null)
    : (dest?.projectId ? "/tasks/project/" + encodeURIComponent(dest.projectId) + "/stock-units" : null);
  if (!url) return {};
  try {
    const r = await api.get(url);
    return r && r.success && r.data && typeof r.data === "object" ? r.data : {};
  } catch (_) { return {}; }
}

// ── Material ka unit card (19 Oct 2026) — server utils/unitCard.js jaisa ──
// card.puls = [{ a, n, b, kind }] = "1 a = n b". pakka (Nos = 12 Mtr,
// Mtr = 0.889 kg) apne aap; lot (1 Bundle = __ Nos, 1 Gadi = __ CFT) ka
// number user deta hai — card / aakhri lot ka number sirf pehle se bhara.
function cardEdges(card, extra) {
  const edges = [];
  const puls = (card && card.puls) || [];
  for (const p of puls) {
    const a = canonUnit(p.a), b = canonUnit(p.b), n = Number(p.n) > 0 ? Number(p.n) : null;
    edges.push({ x: a, y: b, m: n, kind: p.kind }, { x: b, y: a, m: n ? 1 / n : null, kind: p.kind });
  }
  const w = {};
  for (const u of [...(extra || []), ...puls.flatMap((p) => [p.a, p.b])]) { const k = kgPerUnit(u); if (k) w[canonUnit(u)] = k; }
  for (const a of Object.keys(w)) for (const b of Object.keys(w)) if (a !== b) edges.push({ x: a, y: b, m: w[a] / w[b], kind: "pakka" });
  return edges;
}
function cardSearch(edges, from, to, allow) {
  const seen = new Map([[from, { m: 1, kind: "pakka" }]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift(), st = seen.get(cur);
    if (cur === to) return st;
    for (const e of edges) {
      if (e.x !== cur || seen.has(e.y) || !allow(e)) continue;
      seen.set(e.y, { m: st.m == null || e.m == null ? null : st.m * e.m, kind: st.kind === "lot" || e.kind === "lot" ? "lot" : "pakka" });
      queue.push(e.y);
    }
  }
  return null;
}
// { mult, kind } — mult null = raasta hai par number lot par tay hoga; null = raasta hi nahi.
export function pathFactor(card, from, to) {
  const a = canonUnit(from), b = canonUnit(to);
  if (!a || !b) return null;
  if (a === b) return { mult: 1, kind: "pakka" };
  const edges = cardEdges(card, [from, to]);
  const r6 = (n) => Math.round(n * 1e6) / 1e6;
  const pk = cardSearch(edges, a, b, (e) => e.kind === "pakka" && e.m != null);
  if (pk) return { mult: r6(pk.m), kind: "pakka" };
  const kn = cardSearch(edges, a, b, (e) => e.m != null);
  if (kn) return { mult: r6(kn.m), kind: "lot" };
  return cardSearch(edges, a, b, () => true) ? { mult: null, kind: "lot" } : null;
}
// Card ki saari unit — stock wali pehle (dropdown ke liye).
export function cardUnits(card, stockUnit) {
  const out = [];
  const add = (u) => { const v = String(u || "").trim(); if (v && !out.some((x) => sameStockUnit(x, v))) out.push(v); };
  add(stockUnit);
  for (const p of (card && card.puls) || []) { add(p.a); add(p.b); }
  return out;
}
// Library ka card (aur bina card wale naam ka sujhaav): { key: { card, suggested } }.
export async function loadUnitCards(names) {
  const list = [...new Set((names || []).map((n) => String(n || "").trim()).filter(Boolean))];
  if (!list.length) return {};
  try {
    const r = await api.get("/library/unit-cards?names=" + encodeURIComponent(list.join(",")));
    return r && r.success && r.data && typeof r.data === "object" ? r.data : {};
  } catch (_) { return {}; }
}

// Line (unit, qty, factor) vs stock — null = koi sawaal nahi (stock nahi, ya
// wahi unit). { weight } = apne aap badlegi; { card } = card ke pakka pul se
// apne aap; { factor } = user ka bhara; { need, suggest } = factor chahiye
// (suggest = card / aakhri lot ka number), warna save par rok.
export function stockConv(st, unit, qty, factor) {
  const stock = String((st && st.unit) || "").trim();
  const u = String(unit || "").trim();
  if (!stock || !u || sameStockUnit(u, stock)) return null;
  const q = Number(qty) || 0;
  const ka = kgPerUnit(u), kb = kgPerUnit(stock);
  const r3 = (n) => Math.round(n * 1000) / 1000;
  if (ka && kb) return { stock, weight: true, qty: r3((q * ka) / kb) };
  const f = parseFloat(factor);
  if (f > 0) return { stock, factor: f, qty: r3(q * f) };
  const pf = st && st.card ? pathFactor(st.card, u, stock) : null;
  if (pf && pf.kind === "pakka" && pf.mult > 0) return { stock, card: true, mult: pf.mult, qty: r3(q * pf.mult) };
  const lotKey = st && st.lots ? Object.keys(st.lots).find((k) => sameStockUnit(k, u)) : null;
  const suggest = lotKey ? Number(st.lots[lotKey]) : (pf && pf.mult > 0 ? pf.mult : null);
  return { stock, need: true, suggest: suggest > 0 ? suggest : null, lot: !!pf };
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
