// Party Category — company ki apni list (Library → Party Category).
//
// Server: GET /library/party-categories (gb-backend utils/partyCategories.js).
// Har category ki `key`: default ke liye canonical role ("material_vendor"),
// company ki apni ke liye "c<id>". Apni category ka `base_role` batata hai ki
// wo kis tarah ki party hai — Sales Invoice, Sub-Con Bill, Material Bill ke
// picker party.roles se hi chalte hain, aur server category lagte hi uska
// base_role roles me daal deta hai. Isliye picker yahan kuch nahi badalte;
// ye file sirf NAAM aur CHUNAAV ke liye hai.
//
// Dikhane ka niyam (server jaisa): party ki apni category apne base role ki
// jagah dikhti hai — "Hardware Shop" wali party "Hardware Shop" dikhti hai,
// "Material Vendor / Hardware Shop" nahi.
import api from "../config/api";
import { t } from "../i18n";

export const PCAT_MAX = 12;
export const SYSTEM_KEYS = ["material_vendor", "equipment_vendor", "fuel_vendor", "client", "subcontractor",
  "labour_vendor", "transporter", "consultant", "staff"];
const LOCKED = ["staff"];   // Prafull, 2 Oct 2026: sirf Staff delete nahi hoti

// Server na mile (purana backend / network) to wahi purane 9 naam.
const DEFAULT_LABEL = {
  material_vendor:  () => t("material_flow.material_vendor"),
  equipment_vendor: () => t("master_library.equipment_vendor"),
  fuel_vendor:      () => t("master_library.fuel_vendor"),
  client:           () => t("master_library.client"),
  subcontractor:    () => t("common.subcontractor"),
  labour_vendor:    () => t("common.labour_vendor"),
  transporter:      () => t("master_library.transporter"),
  consultant:       () => t("master_library.consultant"),
  staff:            () => t("master_library.staff"),
};

// Purane / alag shabd → canonical role (backend utils/partyRoles.js ALIAS jaisa).
const ALIAS = {
  "material vendor": "material_vendor", "material supplier": "material_vendor", "material_supplier": "material_vendor",
  "supplier": "material_vendor", "vendor": "material_vendor", "other vendor": "material_vendor",
  "equipment": "equipment_vendor", "equipment vendor": "equipment_vendor", "machinery": "equipment_vendor",
  "equipment supplier": "equipment_vendor",
  "fuel": "fuel_vendor", "fuel vendor": "fuel_vendor", "diesel": "fuel_vendor", "petrol pump": "fuel_vendor",
  "client": "client", "customer": "client",
  "subcontractor": "subcontractor", "sub-contractor": "subcontractor", "subcon": "subcontractor", "sub-con": "subcontractor",
  "contractor": "subcontractor", "labour contractor": "subcontractor", "labor contractor": "subcontractor",
  "labour vendor": "labour_vendor", "labor vendor": "labour_vendor",
  "transporter": "transporter", "consultant": "consultant", "staff": "staff",
};
export const toRoleKey = (v) => {
  if (!v) return null;
  const k = String(v).toLowerCase().trim();
  return ALIAS[k] || (SYSTEM_KEYS.includes(k) ? k : null);
};

// Party ke role (roles comma/JSON, warna purana type). Staff akela.
export function partyRoleKeys(p) {
  if (!p) return [];
  if (Number(p.is_staff) === 1) return ["staff"];
  let list = [];
  const raw = p.roles;
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string" && raw.trim()) {
    const s = raw.trim();
    if (s.startsWith("[")) { try { const j = JSON.parse(s); if (Array.isArray(j)) list = j; } catch (e) { /* comma list hi sahi */ } }
    if (!list.length) list = s.split(",");
  }
  if (!list.length && p.type) list = [p.type];
  const out = [];
  for (const r of list) { const c = toRoleKey(r); if (c && !out.includes(c)) out.push(c); }
  return out;
}

export function parseCatIds(v) {
  let list = [];
  if (Array.isArray(v)) list = v;
  else if (typeof v === "number") list = [v];
  else if (typeof v === "string" && v.trim()) list = v.replace(/[[\]]/g, "").split(",");
  const out = [];
  for (const x of list) {
    const n = Number(String(x ?? "").trim().replace(/^c/i, ""));
    if (Number.isInteger(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

// Party kin category me dikhti hai (keys).
export function partyCategoryKeys(p, cats) {
  if (!p) return [];
  if (Number(p.is_staff) === 1) return ["staff"];
  const customs = parseCatIds(p.category_ids)
    .map((id) => (cats || []).find((c) => !c.is_system && c.is_active && Number(c.id) === id))
    .filter(Boolean);
  const out = [];
  const push = (k) => { if (!out.includes(k)) out.push(k); };
  // Apni category tabhi jab uska base role party par ho (server jaisa) —
  // role hat gaya to category bhi nahi dikhti.
  for (const role of partyRoleKeys(p)) {
    const mine = customs.filter((c) => c.base_role === role);
    if (mine.length) mine.forEach((c) => push(c.key));
    else push(role);
  }
  return out;
}

export function catLabel(key, cats) {
  const c = (cats || []).find((x) => x.key === key);
  if (c && c.label) return c.label;
  return DEFAULT_LABEL[key] ? DEFAULT_LABEL[key]() : key;
}
export const partyCategoryLabels = (p, cats) => partyCategoryKeys(p, cats).map((k) => catLabel(k, cats));

// Form ka chunaav (keys) → API: roles (apni category ka base bhi) + category_ids.
export function selectionToPayload(keys, cats) {
  const roles = [], category_ids = [];
  for (const k of keys || []) {
    const c = (cats || []).find((x) => x.key === k);
    if (c && !c.is_system) {
      category_ids.push(Number(c.id));
      if (!roles.includes(c.base_role)) roles.push(c.base_role);
    } else {
      const r = toRoleKey(k);
      if (r && !roles.includes(r)) roles.push(r);
    }
  }
  return { roles, category_ids };
}

export const defaultCategories = () => SYSTEM_KEYS.map((k, i) => ({
  id: null, key: k, label: DEFAULT_LABEL[k](), base_role: k, is_system: 1, is_active: 1,
  locked: LOCKED.includes(k) ? 1 : 0, sort_order: i,
}));

// Ek baar laao, 1 minute yaad rakho (Finance ke kai picker/form ek saath maangte hain).
// ok:false = server ne list nahi di — tab category_ids bhejna hi nahi
// (warna edit karte hi party ki apni category mit jaati).
let cache = null, cachedAt = 0, inflight = null;
export function loadPartyCategories(force) {
  if (!force && cache && Date.now() - cachedAt < 60000) return Promise.resolve(cache);
  if (!force && inflight) return inflight;
  inflight = api.get("/library/party-categories")
    .then((r) => {
      if (r && r.success && Array.isArray(r.data)) {
        cache = { list: r.data, max: r.max || PCAT_MAX, active: r.active, ok: true };
        cachedAt = Date.now();
        return cache;
      }
      return { list: defaultCategories(), max: PCAT_MAX, ok: false };
    })
    .catch(() => ({ list: defaultCategories(), max: PCAT_MAX, ok: false }))
    .finally(() => { inflight = null; });
  return inflight;
}
export const dropPartyCategoryCache = () => { cache = null; cachedAt = 0; };
