// ════════════════════════════════════════════════════════════════
// GRN → "Ordered" ke 3 step ka hisaab (27 Oct 2026) — sirf pure functions.
// GrnReceive.js bulata hai; app me isi ka jodidaar sanchalan-app/src/grnOrdered.js.
//
//   1. vendor ke card — upar khoj + chip (Late · Aaj · Aane wala · Sab)
//   2. card khola → us vendor ki line, tick + qty
//   3. "Aage" → challan, photo, review → wahi purana receive
//
// Line (grnData.js loadOrderedLines): { key, vendor, material, label, day, … }.
// day = expected delivery (MR ki apni / uske PO ki / PO line ki) "YYYY-MM-DD".
// "Aaj" IST ka din. Ek GRN = ek vendor (ek challan).
// ════════════════════════════════════════════════════════════════

const IST_MS = 330 * 60000;
const DAY_MS = 86400000;

/** Abhi IST me kaunsa din — "YYYY-MM-DD" */
export const istDay = (nowMs = Date.now()) => new Date(nowMs + IST_MS).toISOString().slice(0, 10);

/** Server ki tareekh → "YYYY-MM-DD" (DATE string seedha; timestamp ho to IST ka din) */
export function dayOf(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);
}

const dayNum = (s) => Math.round(Date.parse(s + "T00:00:00Z") / DAY_MS);

/** 'late' | 'aaj' | 'aage' | 'none' */
export function dueOf(day, today) {
  if (!day) return "none";
  if (day < today) return "late";
  if (day === today) return "aaj";
  return "aage";
}

export const lateDays = (day, today) => (day ? Math.max(0, dayNum(today) - dayNum(day)) : 0);

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "29 Oct" */
export const shortDay = (day) => (day ? Number(day.slice(8, 10)) + " " + MON[Number(day.slice(5, 7)) - 1] : "");

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

/** Khoj: vendor, material, PO no, MR no (line.label) */
export function matchSearch(line, q) {
  const s = norm(q);
  if (!s) return true;
  return [line.vendor, line.material, line.label].some((x) => norm(x).includes(s));
}

/** Chip ki ginti line ke hisaab se — { late, aaj, aage, sab }; bina tareekh sirf Sab me */
export function countChips(lines, today, q = "") {
  const c = { late: 0, aaj: 0, aage: 0, sab: 0 };
  for (const l of lines) {
    if (!matchSearch(l, q)) continue;
    c.sab++;
    const d = dueOf(l.day, today);
    if (d !== "none") c[d]++;
  }
  return c;
}

/** Kholte hi: Late ho to Late, warna Aaj, warna Sab */
export const defaultChip = (c) => (c.late > 0 ? "late" : c.aaj > 0 ? "aaj" : "sab");

const RANK = { late: 0, aaj: 1, aage: 2, none: 3 };

/**
 * Vendor ke card. Card tab dikhta hai jab uski koi line chip + khoj se mile; andar
 * us vendor ki saari pending line. Card ki tareekh = sabse purani pending tareekh.
 * Kram: late (purana pehle), aaj, aane wala (paas pehle), bina tareekh aakhir.
 */
export function groupByVendor(lines, { today, chip = "sab", q = "" } = {}) {
  const by = new Map();
  for (const l of lines) {
    const v = l.vendor || "";
    if (!by.has(v)) by.set(v, []);
    by.get(v).push(l);
  }
  const cards = [];
  for (const [vendor, ls] of by) {
    if (!ls.some((l) => (chip === "sab" || dueOf(l.day, today) === chip) && matchSearch(l, q))) continue;
    const day = ls.map((l) => l.day).filter(Boolean).sort()[0] || null;
    const sorted = [...ls].sort((a, b) => (a.day || "9999").localeCompare(b.day || "9999") || norm(a.material).localeCompare(norm(b.material)));
    cards.push({ vendor, lines: sorted, day, due: dueOf(day, today), late: lateDays(day, today) });
  }
  cards.sort((a, b) => {
    if (RANK[a.due] !== RANK[b.due]) return RANK[a.due] - RANK[b.due];
    if (a.day && b.day && a.day !== b.day) return a.day < b.day ? -1 : 1;
    return norm(a.vendor).localeCompare(norm(b.vendor));
  });
  return cards;
}

/** Tick hui line kis vendor ki — null = koi tick nahi */
export function lockedVendor(lines, picked) {
  const l = lines.find((x) => picked && picked[x.key]);
  return l ? (l.vendor || "") : null;
}

/** Is GRN me jaane wali line: tick + usi (lock wale) vendor ki */
export function pickedLines(lines, picked) {
  const v = lockedVendor(lines, picked);
  if (v === null) return [];
  return lines.filter((l) => picked[l.key] && (l.vendor || "") === v);
}
