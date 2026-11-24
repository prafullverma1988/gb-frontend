// Payment Schedule (client) ka PDF + Excel (24 Nov 2026) — screen jaisa hi data
import { loadFullPack, setLang } from "../../i18n";
import { scheduleCsvRows, scheduleHtml } from "./scheduleExport";

beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });

const L = (id, cat, part, rate, extra = {}) => ({ item_id: id, description: (part ? "Ground Floor · " + part : "Septic tank"), category: cat, unit: "sq.ft.",
  planned_qty: 1465, rate, billed_qty: 0, remaining_qty: 1465, opening_qty: 0, part_of: part ? "Ground Floor" : null, item_type: "boq", linked_task: null, ...extra });
const ITEMS = [
  L(1, "GF", "Plinth (40%)", 300, { billed_qty: 1465 }),
  L(2, "GF", "Lintel (20%)", 150, { linked_task: { task_id: 5, progress: 85, trigger_pct: 100, eligible: false } }),
  L(3, "GF", "Slab casting (40%)", 300, { manual_done: { pct: 100, at: "2026-11-24" }, ready: true }),
  L(4, "GF", "Tile (100%)", 750, { part_group: "Finishing", part_together: true }),
  { ...L(9, "SEPTIC TANK", null, 50000), planned_qty: 1, unit: "LS" },
  L(7, "EXTRA", null, 999, { item_type: "extra" }),
];

test("Excel rows: har stage ek row — kaam, qty, rate, stage, %, ₹, yahan tak, haal; ek-saath wala card; kul", () => {
  const rows = scheduleCsvRows(ITEMS);
  expect(rows[0]).toEqual(["Kaam", "Qty", "Unit", "Rate (₹)", "Stage", "Kahan", "%", "Rakam (₹)", "Yahan tak (₹)", "Status"]);
  const gf = rows.filter((r) => r[0] === "GF · Ground Floor");
  expect(gf.slice(0, 3).map((r) => [r[4], r[6], r[7], r[8], r[9]])).toEqual([
    ["1. Plinth poora hone par", 40, 439500, 439500, "Bill bana"],
    ["2. Lintel poora hone par", 20, 219750, 659250, "Chal raha 85%"],
    ["3. Slab casting poora hone par", 40, 439500, 1098750, "Kaam hua"]]);
  expect(gf[0].slice(1, 4)).toEqual([1465, "sq.ft.", 750]);
  expect(rows.some((r) => r[0] === "Septic tank" && r[6] === 100 && r[7] === 50000)).toBe(true);
  const tg = rows.find((r) => /Tile/.test(r[4]) && r[5] === "GF");
  expect(tg && tg[7]).toBe(1098750);
  expect(rows.some((r) => r[0] === "EXTRA" || /999/.test(String(r[7])))).toBe(false);   // extra kaam nahi
  expect(rows[rows.length - 1]).toEqual(["", "", "", "", "", "", "", "", "Kul contract", 1098750 + 50000 + 1098750]);
  expect(rows[rows.length - 2].slice(8)).toEqual(["Ab tak bill bana", 439500]);
});

test("PDF HTML: title, estimate / client / project, har kaam ka head, stage, kul; key ka naam nahi; HTML escape", () => {
  const html = scheduleHtml(ITEMS, { estimate_no: "EST-1", customer: "Tikendra <banchhor>", project: "Tikendra banchhor", company: "greenbox" });
  expect(html).toContain("<h1>Payment Schedule</h1>");
  expect(html).toContain("EST-1");
  expect(html).toContain("Tikendra &lt;banchhor&gt;");
  expect(html).toContain("1,465 sq.ft. × ₹750 = ₹10,98,750");
  expect(html).toContain("1. Plinth poora hone par");
  expect(html).toContain("Bill bana");
  expect(html).toContain("Kul contract");
  expect(html).toContain("₹22,47,500");
  expect(html).not.toMatch(/schedule\.[a-z_]+/);
});
