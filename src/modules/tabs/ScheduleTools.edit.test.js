// Payment Schedule (24 Nov 2026, Prafull): package rate = Structure + Finishing (₹1,800 = 920 + 880).
// Structure floor-wise, Finishing sab floor ka ek saath → client schedule me ek hi card.
// "Schedule badlo": kaam ke stage badlo (replace route), baaki floor par bhi wahi.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { StageLinesPanel } from "./StageBilling";
import { sfParts, partsForTarget, skipOf, isGroundLine } from "./ScheduleTools";

// Task picker (PickSelect, khoj wala) ki jagah saada select — yahan task lagana dekhna hai, picker ka panel nahi
jest.mock("../../components/PickSelect", () => {
  const React = require("react");
  return { __esModule: true, default: ({ value, onChange, children, style, title, disabled, ...rest }) => React.createElement("select", { value, onChange, title, disabled, "aria-label": rest["aria-label"] }, children) };
});
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
  expect(row()).not.toContain("Bill bana");   // ek floor ka bill = poori stage nahi ("Pending" chip ab nahi dikhta)
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

// Sab floor ek saath (23 Nov 2026, Prafull): Line-wise me ek-saath wali stage ki EK row,
// ek task picker — chuna task GF aur FF dono line par; floor ke neeche ye line nahi.
test("Line-wise: ek-saath wali stage ki ek row, ek task sab floor par", async () => {
  for (const x of LEDGER.items) if (x.part_together) x.together_key = x.part_group + "¦" + x.description.replace(/^.* · /, "").replace(/ \(₹\d+\)$/, "").toLowerCase();
  const tasks = [{ id: 5, name: "Tile work", progress: 0 }, { id: 6, name: "GF Plinth", progress: 0 }];
  api.get.mockImplementation(async (url) => {
    if (url.includes("billing-ledger")) return { success: true, data: LEDGER };
    if (url.includes("task-suggest")) return { success: true, data: { lines: LEDGER.items.map(x => ({ item_id: x.item_id, suggestions: [], task_id: x.item_id === 23 ? 6 : null, trigger_pct: 100 })), tasks, measure_ready: true } };
    if (url.includes("stage-board")) return { success: true, data: BOARD };
    return { success: false };
  });
  api.put.mockResolvedValue({ success: true, data: { updated: 2, drafts: [] } });
  await panel();
  const btnT = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent));
  await act(async () => { btnT(/^Line-wise$/).click(); });
  const txt = noKeys();
  const tile = $('[data-together-row="Finishing¦tile"]');
  expect(tile).toBeTruthy();
  expect(tile.textContent).toContain("GF + FF");
  expect(tile.textContent).toContain("₹5,22,000");                 // 1800 × 290
  expect(tile.textContent).toContain("alag-alag task");            // FF par pehle se doosra task
  expect(txt).toContain("Finishing neeche — sab floor ek saath");
  // Floor ke neeche Tile ki line nahi (sirf block me)
  expect(document.querySelectorAll('[data-together-row]').length).toBe(2);   // Tile + Paint
  const sel = tile.querySelector("select");
  await act(async () => { sel.value = "5"; sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await act(async () => { btnT(/^Task Save karo$/).click(); });
  const links = api.put.mock.calls[0][1].links;
  expect(links.filter((l) => [13, 23].includes(l.item_id)).map((l) => l.task_id)).toEqual([5, 5]);
});

// ── Har stage kis floor par (25 Nov 2026): Plinth sirf GF, FF ka ₹ usi group me ──
const T2 = [{ key: 1, label: "GF" }, { key: 2, label: "FF" }, { key: 3, label: "HEAD ROOM" }];
const grpSum = (ps, g) => Math.round(ps.filter((p) => p.group === g).reduce((s, p) => s + Number(p.rate), 0) * 100) / 100;
test("partsForTarget: Plinth apne aap sirf GF; FF me Structure ₹920 baaki stage me, Finishing ₹580 wahi", () => {
  const ps = sfParts(920, 1500);
  expect(isGroundLine("GF")).toBe(true); expect(isGroundLine("Ground Floor")).toBe(true); expect(isGroundLine("FF")).toBe(false);
  expect(skipOf(ps[0], T2).map(String)).toEqual(["2", "3"]);           // Plinth: FF + Head Room par nahi
  const gf = partsForTarget("rate", ps, T2, 1), ff = partsForTarget("rate", ps, T2, 2);
  expect(gf.length).toBe(10);
  expect(ff.length).toBe(9);
  expect(ff.some((p) => p.name === "Plinth")).toBe(false);
  expect(grpSum(ff, "Structure")).toBe(920);
  expect(grpSum(ff, "Finishing")).toBe(580);
  // Poora group hi hata to baaki sab me anupaat se (line ka jod wahi)
  const only = ps.map((p) => (p.group === "Finishing" ? { ...p, skip: [2] } : p));
  const ff2 = partsForTarget("rate", only, T2, 2);
  expect(Math.round(ff2.reduce((s, p) => s + Number(p.rate), 0) * 100) / 100).toBe(1500);
  // % se bhi
  const pct = [{ name: "Plinth", pct: "30", group: "S" }, { name: "Slab", pct: "30", group: "S" }, { name: "Tile", pct: "40", group: "F" }];
  const ffp = partsForTarget("pct", pct, T2, 2);
  expect(ffp.map((p) => [p.name, p.pct])).toEqual([["Slab", "60"], ["Tile", "40"]]);
});

test("Hisse lagao: Plinth ke chip me FF band (apne aap); item_parts me FF ke 9 stage; chip dabao to wapas sab par", async () => {
  LEDGER = { mode: "manual", items: [L(1, "GF", "Ground Floor", 1000, 1500), L(2, "FF", "First Floor", 800, 1500)] };
  PKGS = [{ id: 5, name: "Signature", rate_full: 1800, rate_structure: 920 }];
  api.post.mockImplementation(async () => ({ success: true, data: { done: [{ item_id: 1 }, { item_id: 2 }], skipped: [] } }));
  await panel();
  const openParts = async () => { await act(async () => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Hisse lagao").click(); }); await flush(); return $("[role=dialog]"); };
  const dlg = await openParts();
  await act(async () => { dlg.querySelector('[data-testid="sf-fill"]').click(); });
  expect(dlg.querySelector('[data-where="0¦1"]').getAttribute("aria-pressed")).toBe("true");    // Plinth · GF
  expect(dlg.querySelector('[data-where="0¦2"]').getAttribute("aria-pressed")).toBe("false");   // Plinth · FF
  expect(dlg.querySelector('[data-where="1¦2"]').getAttribute("aria-pressed")).toBe("true");    // Lintel · FF
  expect(dlg.querySelector('[data-where-note="2"]').textContent).toContain("9 stage · nahi: Plinth");
  noKeys();
  await act(async () => { [...dlg.querySelectorAll("button")].find((b) => b.textContent === "2 line par lagao").click(); });
  await flush();
  const body = api.post.mock.calls.find((c) => c[0] === "/customer-estimates/7/schedule/apply")[1];
  expect(body.item_parts[1].length).toBe(10);
  expect(body.item_parts[2].length).toBe(9);
  expect(body.item_parts[2].some((p) => p.name === "Plinth")).toBe(false);
  expect(grpSum(body.item_parts[2], "Structure")).toBe(920);
  expect(body.parts.length).toBe(10);
  // Dobara kholo: Plinth ka FF chip dabao → sab par, item_parts nahi jaata
  api.post.mockClear();
  const d2 = await openParts();
  await act(async () => { d2.querySelector('[data-testid="sf-fill"]').click(); });
  await act(async () => { d2.querySelector('[data-where="0¦2"]').click(); });
  expect(d2.querySelector('[data-where="0¦2"]').getAttribute("aria-pressed")).toBe("true");
  expect(d2.querySelector('[data-testid="where-note"]')).toBeNull();
  await act(async () => { [...d2.querySelectorAll("button")].find((b) => b.textContent === "2 line par lagao").click(); });
  await flush();
  const b2 = api.post.mock.calls.find((c) => c[0] === "/customer-estimates/7/schedule/apply")[1];
  expect(b2.item_parts).toBeUndefined();
});

test("Schedule badlo + FF par bhi: FF me Plinth nahi, replace ko item_parts", async () => {
  LEDGER = { mode: "manual", items: [L(1, "GF", "Ground Floor", 1000, 1500), L(2, "FF", "First Floor", 800, 1500)] };
  PKGS = [{ id: 5, name: "Signature", rate_full: 1800, rate_structure: 920 }];
  api.post.mockImplementation(async () => ({ success: true, data: { done: [{ item_id: 1 }, { item_id: 2 }], skipped: [] } }));
  await panel();
  await act(async () => { $('[data-edit-work="GF¦#1"]').click(); });
  await flush();
  const dlg = $('[data-testid="sched-edit"]');
  await act(async () => { dlg.querySelector('[data-testid="sf-fill"]').click(); });
  await act(async () => { dlg.querySelector('[data-also="FF¦#2"]').click(); });
  expect(dlg.querySelector('[data-where="0¦2"]').getAttribute("aria-pressed")).toBe("false");
  await act(async () => { dlg.querySelector('[data-testid="sched-edit-save"]').click(); });
  await flush();
  const body = api.post.mock.calls.find((c) => c[0] === "/customer-estimates/7/schedule/replace")[1];
  expect(body.item_ids).toEqual([1, 2]);
  expect(body.item_parts[2].length).toBe(9);
  expect(body.item_parts[1].length).toBe(10);
});
