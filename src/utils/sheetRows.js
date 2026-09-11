// utils/sheetRows.js — import ki file (CSV ya Excel) padhna aur template ke
// column ko NAAM se pehchanna. Sab import (Library, aage Machinery, Tasks, CRM)
// yahi use karte hain, taaki "kaunsi line header hai" ka niyam ek hi jagah rahe.
//
// Header row wo hai jisme sabse zyada pehchane column mile — pehli line nahi.
// Template ki upar wali instructions line me comma ho to purana parser use hi
// header maan leta tha, aur Materials/Parties/Workers ka template 0 row import
// karta tha. Comma wale value ("cement, putty") bhi ab poore aate hain.
import * as XLSX from "xlsx";

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
  const name = String((file && file.name) || "").toLowerCase();
  const csv = /\.(csv|txt)$/.test(name);
  const wb = csv
    ? XLSX.read((await file.text()).replace(/^﻿/, ""), { type: "string", raw: true })
    : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws || !ws["!ref"]) return { matrix: [], firstRow: 1 };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: true });
  return { matrix, firstRow: range.s.r + 1 };
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
