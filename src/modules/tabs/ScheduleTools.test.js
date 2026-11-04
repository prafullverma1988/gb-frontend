// Payment Schedule (5 Nov 2026) — Stages + Stage Board ek tab, schedule ke
// tareeke (contract % / line ke hisse) aur Milestone-wise view. Mock data se
// render karke dekho ki kuch girta nahi aur key ka naam screen par nahi aata.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { StageLinesPanel } from "./StageBilling";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

const L = (id, cat, name, qty, rate, extra = {}) => ({ item_id: id, description: name, category: cat, unit: "Sqft", planned_qty: qty, rate,
  billed_qty: 0, remaining_qty: qty, opening_qty: 0, billed_amount: 0, part_of: null, item_type: "boq", linked_task: null, ...extra });
let LEDGER;
const BOARD = { estimate: { estimate_no: "EST-2", project_id: 70, billing_method: "manual" },
  can: { estimate_create: true, subcon_create: true, subcon_view: true, estimate_edit: true }, tasks: {},
  lines: [{ item_id: 1, description: "Structure", category: "GF", qty: 1000, unit: "Sqft", rate: 1000, billed_amount: 0, billed_qty: 0, task_id: null, item_type: "boq" },
          { item_id: 2, description: "Structure", category: "FF", qty: 800, unit: "Sqft", rate: 1000, billed_amount: 0, billed_qty: 0, task_id: null, item_type: "boq" }],
  wos: [{ wo_id: 9, subcon_name: "Ramesh Mistri", billable: true, status: "Active",
    lines: [{ wo_item_id: 91, estimate_item_id: 1, description: "Labour", qty: 1000, unit: "Sqft", rate: 220, billed_amount: 0, billed_qty: 0 }] }] };

let root, box;
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await act(async () => {}); };
afterEach(() => { act(() => root.unmount()); box.remove(); });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  LEDGER = { mode: "manual", items: [L(1, "GF", "Structure", 1000, 1000), L(2, "FF", "Structure", 800, 1000)] };
  api.get.mockImplementation(async (url) => {
    if (url.includes("billing-ledger")) return { success: true, data: LEDGER };
    if (url.includes("task-suggest")) return { success: true, data: { lines: LEDGER.items.map(x => ({ item_id: x.item_id, suggestions: [] })), tasks: [{ id: 5, name: "GF Plinth", progress: 0 }], measure_ready: true } };
    if (url.includes("stage-board")) return { success: true, data: BOARD };
    return { success: false };
  });
  api.post.mockReset();
});
const noKeys = () => { const txt = document.body.textContent; expect(txt).not.toMatch(/(schedule|stage_billing)\.[a-z_]+/); return txt; };
const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent));

test("ek tab: tareeke ke card + thekedar ki line + line tick karke Bill banao", async () => {
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  await act(async () => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Line-wise").click(); });
  const txt = noKeys();
  expect(txt).toContain("Schedule kaise banana hai (BOQ se)");
  expect(txt).toContain("Poore contract ka % (construction-linked)");
  expect(txt).toContain("Ramesh Mistri");
  expect(txt).toContain("Client aaj tak");
  expect(btn(/^Bill banao \(0\)$/).disabled).toBe(true);
  const tick = document.querySelector("input[aria-label='Bill / WO ke liye line']");
  await act(async () => { tick.click(); });
  expect(btn(/^Bill banao \(1\)$/).disabled).toBe(false);
});

test("Contract % lagao: CLP preset, 2 line ka total, strict ke saath apply", async () => {
  api.post.mockResolvedValue({ success: true, data: { done: [{ item_id: 1 }, { item_id: 2 }], skipped: [] } });
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  await act(async () => { btn(/^Contract % lagao$/).click(); });
  const txt = noKeys();
  expect(txt).toContain("Line (2) · ₹18,00,000");
  expect(txt).toContain("Total 100%");
  expect(txt).toContain("₹1,80,000 · yahan tak 10%");     // Booking 10%
  await act(async () => { btn(/^2 line par lagao$/).click(); });
  expect(api.post).toHaveBeenCalledWith("/customer-estimates/7/schedule/apply", expect.objectContaining({ item_ids: [1, 2], strict: true }));
  expect(api.post.mock.calls[0][1].parts).toHaveLength(9);
  expect(document.body.textContent).toContain("2 line par schedule laga; 0 ruki");
});

test("Milestone-wise: sab floor ka Plinth ek row, contract ka %", async () => {
  LEDGER = { mode: "manual", items: [
    L(11, "GF", "Structure · Plinth (15%)", 1000, 150, { part_of: "Structure" }), L(12, "GF", "Structure · Slab (85%)", 1000, 850, { part_of: "Structure" }),
    L(21, "FF", "Structure · Plinth (15%)", 800, 150, { part_of: "Structure" }), L(22, "FF", "Structure · Slab (85%)", 800, 850, { part_of: "Structure" }),
  ] };
  await mount(<StageLinesPanel kind="wo" id={3} canEdit canApprove={false} />);
  await act(async () => { btn(/^Milestone-wise$/).click(); });
  const txt = noKeys();
  expect(txt).toContain("Plinth");
  expect(txt).toContain("₹2,70,000");      // 1000×150 + 800×150
  expect(txt).toContain("15%");
  expect(txt).toContain("GF, FF");
  expect(txt).toContain("Naap (qty) se");   // thekedar ke card me naap
});

test("milestone estimate: sirf Stage Board wala hissa (thekedar line, WO banao)", async () => {
  LEDGER = { mode: "milestone_rate", milestones: [] };
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  const txt = noKeys();
  expect(txt).toContain("Ye estimate line-wise nahi hai");
  expect(txt).toContain("Ramesh Mistri");
  expect(txt).not.toContain("Schedule kaise banana hai");
  expect(btn(/^Subcon WO banao \(0\)$/)).toBeTruthy();
});

test("Subcon WO banao: WO line par client line ka task jaata hai", async () => {
  LEDGER.items[0].linked_task = { task_id: 5, task_name: "GF Plinth", progress: 0, trigger_pct: 100, eligible: false };
  const get0 = api.get.getMockImplementation();
  api.get.mockImplementation(async (url) => url.includes("/library/subcontractors")
    ? { success: true, data: [{ id: 1, name: "Ramesh Mistri" }] } : get0(url));
  api.post.mockResolvedValue({ success: true, data: { id: 99 } });
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  await act(async () => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Line-wise").click(); });
  await act(async () => { document.querySelector("input[aria-label='Bill / WO ke liye line']").click(); });
  await act(async () => { btn(/^Subcon WO banao \(1\)$/).click(); });
  await act(async () => {});
  const dlg = document.querySelector("[role=dialog]");
  const sel = dlg.querySelector("select");
  const setVal = (el, v) => { const proto = Object.getPrototypeOf(el); Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); };
  await act(async () => { setVal(sel, "Ramesh Mistri"); });
  const rate = [...dlg.querySelectorAll("input[type=number]")].pop();
  await act(async () => { setVal(rate, "220"); });
  await act(async () => { btn(/^WO banao$/).click(); });
  const call = api.post.mock.calls.find(c => c[0] === "/subcon/work-orders");
  expect(call).toBeTruthy();
  expect(call[1].sections[0].items[0]).toEqual(expect.objectContaining({ estimate_item_id: 1, task_id: 5, rate: 220 }));
});

// JAGVEER jaisa: GF Structure 1820 sqft × ₹900 = plinth 30 · lintel 20 · slab level 10 · slab casting 30 · plaster 10; septic ek line
const jag = () => {
  const S = [["Plinth", 270], ["Lintel", 180], ["Slab level", 90], ["Slab casting", 270], ["Plaster", 90]];
  return { mode: "manual", items: [
    ...S.map(([n, r], i) => L(40 + i, "GF", "Structure · " + n + " (" + Math.round(r / 9) + "%)", 1820, r, { part_of: "Structure" })),
    L(60, "OTHER", "Septic tank", 100, 900),
  ] };
};

test("Payment Schedule (client): kaam poora hone par kitna — ₹, %, kul", async () => {
  LEDGER = jag();
  LEDGER.items[0].billed_qty = 1820;   // plinth ka bill ban chuka
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  const txt = noKeys();
  expect(txt).toContain("GF · Structure");
  expect(txt).toContain("1,820 Sqft × ₹900 = ₹16,38,000");
  expect(txt).toContain("1. Plinth poora hone par");
  expect(txt).toContain("₹4,91,400");               // 1820 × 270
  expect(txt).toContain("Kul ₹8,19,000");           // plinth + lintel
  expect(txt).toContain("Bill bana");
  expect(txt).toContain("1. Kaam poora hone par");  // septic ek line
  expect(txt).toContain("Kul contract ₹17,28,000");
  expect(txt).toContain("Ab tak bill bana ₹4,91,400");
});

test("Hisse hatao: pakka poochh kar unsplit route", async () => {
  LEDGER = jag();
  api.post.mockResolvedValue({ success: true, data: { merged_item_id: 99, removed: 5, rate: 900 } });
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  await act(async () => { btn(/^Line-wise$/).click(); });
  await act(async () => { btn(/^Hisse hatao$/).click(); });
  expect(noKeys()).toContain("\"Structure\" ke 5 hisse hata kar wapas ek line (₹900/Sqft)?");
  await act(async () => { btn(/^Haan, ek line karo$/).click(); });
  expect(api.post).toHaveBeenCalledWith("/customer-estimates/7/items/40/unsplit", {});
});

test("stage jaisi line (ek floor, same area) ka tick hata, chetavni", async () => {
  LEDGER = { mode: "manual", items: [L(1, "GF", "plinth", 1600, 300), L(2, "GF", "gf lintel", 1600, 200), L(3, "GF", "gf slab", 1600, 200), L(4, "FF", "Structure", 1500, 900)] };
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  await act(async () => { btn(/^Contract % lagao$/).click(); });
  const txt = noKeys();
  expect(txt).toContain("Kuch line pehle se stage jaisi hain");
  expect(txt).toContain("Stage jaisi line");
  expect(txt).toContain("Line (1) · ₹13,50,000");   // sirf FF Structure tick
});

test("GF Structure + GF Finishing (same area) stage jaisi NAHI — dono tick", async () => {
  LEDGER = { mode: "manual", items: [L(1, "GF", "Structure", 1820, 900), L(2, "GF", "Finishing", 1820, 850)] };
  await mount(<StageLinesPanel kind="estimate" id={7} canEdit canApprove={false} projectId={70} />);
  await act(async () => { btn(/^Hisse lagao$/).click(); });
  const txt = noKeys();
  expect(txt).not.toContain("Stage jaisi line");
  expect(txt).toContain("Line (2) · ₹31,85,000");
});
