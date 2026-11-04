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
