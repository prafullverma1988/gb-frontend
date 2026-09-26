// utils/sheetRows.js — import ki file (CSV ya Excel) padhna aur template ke
// column ko NAAM se pehchanna. Sab import (Library, aage Machinery, Tasks, CRM)
// yahi use karte hain, taaki "kaunsi line header hai" ka niyam ek hi jagah rahe.
//
// Header row wo hai jisme sabse zyada pehchane column mile — pehli line nahi.
// Template ki upar wali instructions line me comma ho to purana parser use hi
// header maan leta tha, aur Materials/Parties/Workers ka template 0 row import
// karta tha. Comma wale value ("cement, putty") bhi ab poore aate hain.
// xlsx (~400 KB) sirf file padhte waqt (readSheet) — import hote hi nahi (PERF-05):
// CRM / Library module khulte hi ye chunk kheenchna bekaar tha.

const hnorm = (s) => String(s ?? "")
  .replace(/^﻿/, "")
  .toLowerCase()
  .replace(/\*/g, " ")
  .replace(/[^a-z0-9%₹]+/g, " ")
  .trim();

// File → { matrix: [[cell text…]…], firstRow } — firstRow = sheet ki pehli row
// ka Excel number, taaki screen par wahi row number dikhe jo file me hai.
// CSV raw padhi jaati hai: "007" jaisa code "7" na ban jaaye.
export async function readSheet(file) {
  const XLSX = await import("xlsx");
  const name = String((file && file.name) || "").toLowerCase();
  const csv = /\.(csv|txt)$/.test(name);
  const wb = csv
    ? XLSX.read((await file.text()).replace(/^﻿/, ""), { type: "string", raw: true })
    : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellNF: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws["!ref"]) return { matrix: [], firstRow: 1 };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: true });
  if (!csv) excelDatesToIso(XLSX, ws, range, matrix);
  return { matrix, firstRow: range.s.r + 1 };
}

// LIB-08: Excel ki ASLI date cell (jaise 04-03-2026 type karke) ka text SheetJS
// apne default short-date format (m/d/yy) me deta hai — "3/4/26" — aur server
// Bharat ka d/m/yy padhta hai: 4 Mar 2026 chupchaap 3 Apr 2026 ban jaata tha
// (13+ tareekh wali row 'samajh nahi aayi' deti thi). Isliye date cell ki tareekh
// seedha uske Excel serial se yyyy-mm-dd (SSF.parse_date_code — timezone ka koi
// khel nahi). Text me likhi tareekh jaisi thi waisi rehti hai. Wahi tareeka jo
// bank statement import me hai (FIN-28).
function excelDatesToIso(XLSX, ws, rg, matrix) {
  for (let r = rg.s.r; r <= rg.e.r; r++) {
    const row = matrix[r - rg.s.r];
    if (!row) continue;
    for (let c = rg.s.c; c <= rg.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.t !== "n" || !cell.z || !XLSX.SSF.is_date(cell.z)) continue;
      const d = XLSX.SSF.parse_date_code(cell.v);
      if (d && d.y) row[c - rg.s.c] = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
  }
}

// fields: [{ key, col, aliases?, required? }] — col = template ka column naam.
// Pehli 20 row me jis row me sabse zyada column mile, wahi header.
export function findColumns(matrix, fields) {
  const byName = new Map();
  for (const f of fields) {
    for (const h of [f.col, ...(f.aliases || [])]) byName.set(hnorm(h), f.key);
  }
  let best = { row: -1, cols: {}, hits: 0 };
  for (let i = 0; i < Math.min(matrix.length, 20); i++) {
    const cols = {};
    const taken = new Set();
    (matrix[i] || []).forEach((cell, c) => {
      const key = byName.get(hnorm(cell));
      if (key && !taken.has(key)) { cols[c] = key; taken.add(key); }
    });
    if (taken.size > best.hits) best = { row: i, cols, hits: taken.size };
  }
  return best;
}

// Header ke neeche ki har bhari row → { row: Excel row number, raw: { key: text } }.
// found = kaunse column mile; missing = zaroori column jo file me hain hi nahi.
export function sheetToRows({ matrix, firstRow }, fields) {
  const { row: headerAt, cols, hits } = findColumns(matrix, fields);
  const required = fields.filter((f) => f.required);
  if (headerAt < 0 || !hits) return { rows: [], found: [], missing: required.map((f) => f.col) };
  const found = Object.values(cols);
  const rows = [];
  for (let i = headerAt + 1; i < matrix.length; i++) {
    const raw = {};
    let any = false;
    (matrix[i] || []).forEach((cell, c) => {
      const key = cols[c];
      if (!key) return;
      const v = String(cell ?? "").trim();
      raw[key] = v;
      if (v) any = true;
    });
    if (any) rows.push({ row: firstRow + i, raw });
  }
  const missing = required.filter((f) => !found.includes(f.key)).map((f) => f.col);
  return { rows, found, missing };
}
