// Payment Schedule (24 Nov 2026, Prafull): package rate = Structure + Finishing (₹1,800 = 920 + 880).
// Structure floor-wise, Finishing sab floor ka ek saath → client schedule me ek hi card.
// "Schedule badlo": kaam ke stage badlo (replace route), baaki floor par bhi wahi.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { StageLinesPanel } from "./StageBilling";
import { sfParts } from "./ScheduleTools";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

const L = (id, cat, name, qty, rate, extra = {}) => ({ item_id: id, description: name, category: cat, unit: "Sqft", planned_qty: qty, rate,
  billed_qty: 0, remaining_qty: qty, opening_qty: 0, billed_amount: 0, part_of: null, part_group: null, part_together: false, item_type: "boq", linked_task: null, ...extra });
// GF + FF: Structure (Plinth 460 + Slab casting 460) + Finishing ek saath (Tile 290 + Paint 290) = ₹1,500; septic ek line
const split = () => {
  const mk = (base, cat, name, qty) => [
    L(base + 1, cat, name + " · Plinth (₹460)", qty, 460, { part_of: name, part_group: "Structure" }),
    L(base + 2, cat, name + " · Slab casting (₹460)", qty, 460, { part_of: name, part_group: "Structure" }),
    L(base + 3, cat, name + " · Tile (₹290)", qty, 290, { part_of: name, part_group: "Finishing", part_together: true }),
    L(base + 4, cat, name + " · Paint (₹290)", qty, 290, { part_of: name, part_group: "Finishing", part_together: true }),
  ];
  return { mode: "manual", items: [...mk(10, "GF", "Ground Floor", 1000), ...mk(20, "FF", "First Floor", 800), L(30, "SEPTIC TANK", "Septic tank", 100, 900)] };
};
const BOARD = { estimate: { estimate_no: "EST-1", project_id: 70, billing_method: "manual" },
  can: { estimate_create: true, subcon_create: true, subcon_view: true, estimate_edit: true }, tasks: {}, lines: [], wos: [] };
let LEDGER, PKGS;

let root, box;
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => {}); };
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await flush(); };
const unmount = () => { if (root) act(() => root.unmount()); if (box) box.remove(); root = null; box = null; };
afterEach(unmount);
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  LEDGER = split(); PKGS = null;
  api.get.mockImplementation(async (url) => {
    if (url.includes("billing-ledger")) return { success: true, data: LEDGER };
    if (url.includes("task-suggest")) return { success: true, data: { lines: LEDGER.items.map(x => ({ item_id: x.item_id, suggestions: [] })), tasks: [], measure_ready: true } };
    if (url.includes("stage-board")) return { success: true, data: BOARD };
    if (url === "/sales-quotes/project-packages") return PKGS ? { success: true, data: PKGS } : { success: false };
    return { success: false };
  });
  api.post.mockReset();
});
const noKeys = () => { const txt = document.body.textContent; expect(txt).not.toMatch(/(schedule|stage_billing)\.[a-z_]+/); return txt; };
const $ = (sel) => document.querySelector(sel);
const setVal = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
const panel = () => mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
const rates = () => [...$('[data-testid="sched-edit"]').querySelectorAll('input[placeholder="₹"]')];

test("sfParts: Structure ₹920 + Finishing ₹580 = ₹1,500; sirf Finishing 'ek saath'", () => {
  const ps = sfParts(920, 1500);
  const sum = (g) => Math.round(ps.filter((p) => p.group === g).reduce((s, p) => s + Number(p.rate), 0) * 100) / 100;
  expect(ps.length).toBe(10);
  expect(sum("Structure")).toBe(920);
  expect(sum("Finishing")).toBe(580);
  expect(ps.filter((p) => p.together).map((p) => p.group)).toEqual(["Finishing", "Finishing", "Finishing", "Finishing", "Finishing"]);
  expect(sfParts(1500, 1500)).toBeNull();
  expect(sfParts(0, 1500)).toBeNull();
});

test("Client schedule: floor ke card me sirf Structure, Finishing ka ek hi card (sab floor ka jod)", async () => {
  await panel();
  const txt = noKeys();
  const gf = $('[data-work="GF¦Ground Floor"]');
  expect(gf.textContent).toContain("1,000 Sqft × ₹920 = ₹9,20,000");
  expect(gf.textContent).toContain("1. Plinth poora hone par");
  expect(gf.textContent).not.toContain("Tile poora hone par");
  expect(gf.textContent).toContain("Finishing neeche");
  const tg = $('[data-together-card="Finishing"]');
  expect(tg.textContent).toContain("Finishing — sab floor ek saath");
  expect(tg.textContent).toContain("2 kaam ka jod ₹10,44,000");      // (1000 + 800) × 580
  expect(tg.textContent).toContain("1. Tile poora hone par");
  expect(tg.textContent).toContain("GF + FF");
  expect(tg.textContent).toContain("₹5,22,000");                      // 1800 × 290
  expect(txt).toContain("Kul contract ₹27,90,000");                   // 1800 × 1500 + 90,000
});

test("Ek saath wali stage: sab floor ka bill bana tabhi 'Bill bana'", async () => {
  LEDGER.items.find((x) => x.item_id === 13).billed_qty = 1000;        // sirf GF ka Tile
  await panel();
  const row = () => [...$('[data-together-card="Finishing"]').querySelectorAll("tr")][0].textContent;
  expect(row()).toContain("Baaki");
  unmount();
  LEDGER = split();
  for (const id of [13, 23]) { const x = LEDGER.items.find((y) => y.item_id === id); x.billed_qty = x.planned_qty; }
  await panel();
  expect(row()).toContain("Bill bana");
  // Bill wale kaam ka schedule nahi badalta
  expect($('[data-edit-work="GF¦Ground Floor"]').disabled).toBe(true);
  expect($('[data-edit-work="SEPTIC TANK¦#30"]').disabled).toBe(false);
});

test("Schedule badlo: purane stage bhare, FF par tick pehle se; ₹ ka jod galat ho to Save band; replace route", async () => {
  api.post.mockImplementation(async (url) => (url.includes("/schedule/replace") ? { success: true, data: { done: [{ item_id: 11 }, { item_id: 21 }], skipped: [] } } : { success: false }));
  await panel();
  await act(async () => { $('[data-edit-work="GF¦Ground Floor"]').click(); });
  await flush();
  const dlg = $('[data-testid="sched-edit"]');
  expect(dlg.textContent).toContain("GF · Ground Floor");
  expect(rates().map((i) => i.value)).toEqual(["460", "460", "290", "290"]);
  expect(dlg.querySelector('[data-also="FF¦First Floor"]').checked).toBe(true);
  expect(dlg.querySelector('[data-also="SEPTIC TANK¦#30"]').checked).toBe(false);
  expect(dlg.querySelector('[data-together="Finishing"]').checked).toBe(true);
  expect(dlg.querySelector('[data-together="Structure"]').checked).toBe(false);
  const save = dlg.querySelector('[data-testid="sched-edit-save"]');
  await act(async () => { setVal(rates()[0], "500"); });              // jod 1,540
  expect(save.disabled).toBe(true);
  expect(dlg.querySelector('[data-testid="sched-edit-sum"]').textContent).toContain("₹1,540");
  await act(async () => { setVal(rates()[1], "420"); });              // jod wapas 1,500
  expect(save.disabled).toBe(false);
  await act(async () => { save.click(); });
  await flush();
  const call = api.post.mock.calls.find((c) => c[0] === "/customer-estimates/7/schedule/replace");
  expect(call[1].item_ids).toEqual([11, 21]);
  expect(call[1].parts).toEqual([
    { name: "Plinth", rate: 500, group: "Structure" }, { name: "Slab casting", rate: 420, group: "Structure" },
    { name: "Tile", rate: 290, group: "Finishing", together: true }, { name: "Paint", rate: 290, group: "Finishing", together: true }]);
  expect($('[data-testid="sched-edit"]')).toBeNull();
  expect(noKeys()).toContain("2 kaam ka schedule badal gaya");
});

test("Structure + Finishing: package ka Structure ₹920 apne aap, 'Stage bhar do' → 10 stage, jod line ke barabar", async () => {
  LEDGER = { mode: "manual", items: [L(1, "GF", "Ground Floor", 1000, 1500), L(2, "FF", "First Floor", 800, 1500)] };
  PKGS = [{ id: 5, name: "Signature", rate_full: 1800, rate_structure: 920 }];
  api.post.mockImplementation(async () => ({ success: true, data: { done: [{ item_id: 1 }], skipped: [] } }));
  await panel();
  await act(async () => { $('[data-edit-work="GF¦#1"]').click(); });
  await flush();
  const dlg = $('[data-testid="sched-edit"]');
  expect(dlg.querySelector('[data-testid="sf-struct"]').value).toBe("920");
  expect(dlg.querySelector('[data-testid="sf-fin"]').textContent).toContain("₹580");
  await act(async () => { dlg.querySelector('[data-testid="sf-fill"]').click(); });
  expect(rates().length).toBe(10);
  expect(dlg.querySelector('[data-testid="parts-sum"]').textContent).toContain("Total ₹1,500 / line ₹1,500/Sqft");
  expect(dlg.querySelector('[data-testid="parts-groups"]').textContent).toContain("Structure ₹920");
  expect(dlg.querySelector('[data-testid="parts-groups"]').textContent).toContain("Finishing ₹580");
  expect(dlg.querySelector('[data-together="Finishing"]').checked).toBe(true);
  expect(dlg.querySelector('[data-also="FF¦#2"]').checked).toBe(false);   // bina hisse wala kaam: baaki par tick khud lagao
  await act(async () => { dlg.querySelector('[data-also="FF¦#2"]').click(); });
  await act(async () => { dlg.querySelector('[data-testid="sched-edit-save"]').click(); });
  await flush();
  const body = api.post.mock.calls.find((c) => c[0] === "/customer-estimates/7/schedule/replace")[1];
  expect(body.item_ids).toEqual([1, 2]);
  expect(body.parts.length).toBe(10);
  expect(body.parts.filter((p) => p.group === "Structure").reduce((s, p) => s + p.rate, 0)).toBe(920);
  expect(body.parts.filter((p) => p.together).reduce((s, p) => s + p.rate, 0)).toBe(580);
  noKeys();
});

test("'Hisse lagao' box me bhi Structure + Finishing; Finishing ka tick hataya to 'ek saath' nahi jaata", async () => {
  LEDGER = { mode: "manual", items: [L(1, "GF", "Ground Floor", 1000, 1500), L(2, "FF", "First Floor", 800, 1500)] };
  PKGS = [{ id: 5, name: "Signature", rate_full: 1800, rate_structure: 920 }];
  api.post.mockImplementation(async () => ({ success: true, data: { done: [{ item_id: 1 }, { item_id: 2 }], skipped: [] } }));
  await panel();
  await act(async () => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Hisse lagao").click(); });
  await flush();
  const dlg = $("[role=dialog]");
  await act(async () => { dlg.querySelector('[data-testid="sf-fill"]').click(); });
  await act(async () => { dlg.querySelector('[data-together="Finishing"]').click(); });
  await act(async () => { [...dlg.querySelectorAll("button")].find((b) => b.textContent === "2 line par lagao").click(); });
  await flush();
  const body = api.post.mock.calls.find((c) => c[0] === "/customer-estimates/7/schedule/apply")[1];
  expect(body.item_ids).toEqual([1, 2]);
  expect(body.parts.length).toBe(10);
  expect(body.parts.some((p) => p.together)).toBe(false);
  expect(body.parts[0]).toEqual({ name: "Plinth", rate: 276, group: "Structure" });
});
