// Chalu Bill (4 Nov 2026) — harness (scripts/diag_chalu_bill_test.js) jaisa data
// render karke dekho ki page girta nahi, Excel wale number dikhte hain aur key
// ka naam screen par nahi aata.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { ChaluBillView, ProjectChaluView } from "./ChaluBill";
import { StageLinesPanel } from "./StageBilling";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

const part = (id, name, rate, status, extra = {}) => ({
  item_id: id, category: "GF", name: "Building construction · " + name + " (₹" + rate + ")", part_of: "Building construction", part_name: name,
  part_group: "Civil", unit: "Sqft", qty: 825, rate, amount: 825 * rate, item_type: "boq", task: status === "manual" ? null : { id: id, name: "GF " + name, progress: status === "done" ? 100 : 40 },
  work: status === "done" ? { frac: 1, status: "done", source: "task", pct: 100, task_pct: 100, trigger_pct: 100, mode: "stage" }
    : status === "manual" ? { frac: 1, status: "done", source: "manual", pct: 100 }
    : status === "prog" ? { frac: 0, status: "prog", source: "task", pct: 40, task_pct: 40, trigger_pct: 100, mode: "stage" }
    : { frac: 0, status: "pend", source: "none", pct: 0 },
  done_amt: status === "done" || status === "manual" ? 825 * rate : 0, since_prev: 0,
  manual: status === "manual" ? { pct: 100, at: "2026-11-04", by: "Prafull", note: "Agreement par" } : null, ...extra,
});
const parts = [part(1, "Advance", 200, "manual"), part(2, "G Beam", 50, "done"), part(3, "P Beam", 100, "done"), part(4, "Lintel", 100, "done"),
  part(5, "Slab", 100, "done"), part(6, "Slab Casting", 200, "done", { since_prev: 165000 }), part(7, "GF Inner Plaster", 50, "prog"), part(8, "GF Outer Plaster", 50, "pend")];
const RB = {
  estimate: { id: 9, estimate_no: "EST-12", customer_name: "Hemant Sahu", project_id: 70, billing_method: "manual" },
  party: { id: 5, name: "Hemant Sahu" }, project_name: "Hemant Sahu ghar", bill_date: "2026-11-04", rb_no: 2, saved_today: false,
  prev: { rb_no: 1, bill_date: "2026-10-10", done: 525150, received: 198000, net_due: 327150 },
  history: [{ id: 3, rb_no: 1, bill_date: "2026-10-10", grand: 1521950, done: 525150, received: 198000, net_due: 327150 }],
  totals: { estimate: 1521950, extra: 0, grand: 1521950, done: 690150, received: 198000, advance: 198000, advance_shared: 0, net_due: 492150,
    grand_due: 1323950, remaining: 831800, since_prev: 165000, done_pct: 45.3 },
  invoice: { billed: 0, net: 0, to_invoice: 690150, draft: 0, to_draft: 690150, count: 0 },
  hidden_zero: 1, ready: { tick: true }, can: { tick: true, bill: true },
  rows: [
    { key: "GF¦Building construction", category: "GF", name: "Building construction", unit: "Sqft", qty: 825, rate: 850, amount: 701250, done_amt: 618750,
      done_rate: 750, this_bill: 618750, since_prev: 165000, split: true, status: "prog", sthiti: "Slab Casting ho gaya · GF Inner Plaster chal raha 40%",
      groups: [{ name: "Civil", rate: 850, done_rate: 750, done_amt: 618750, rem_amt: 82500 }], parts },
    { key: "OTHER¦#11", category: "OTHER", name: "Boundary wall", unit: "RnFt", qty: 100, rate: 340, amount: 34000, done_amt: 17000, done_rate: 170,
      since_prev: 0, split: false, status: "prog", sthiti: "Task 50%", groups: [],
      parts: [{ ...part(11, "Boundary wall", 340, "prog"), part_of: null, name: "Boundary wall", unit: "RnFt", qty: 100, done_amt: 17000,
        work: { frac: 0.5, status: "prog", source: "task", pct: 50, task_pct: 50, trigger_pct: 100, mode: "qty" } }] },
  ],
  extras: [],
  invoices: [],
  payments: [{ date: "2025-07-15", mode: "UPI", ref: "", amount: 99000, invoice_no: null, kind: "advance" },
             { date: "2025-08-01", mode: "UPI", ref: "", amount: 99000, invoice_no: null, kind: "advance", no_project: true }],
};
const PR = { rows: [{ estimate: RB.estimate, party: RB.party, totals: RB.totals, invoice: RB.invoice, prev: RB.prev }],
  total: { grand: 1521950, done: 690150, since_prev: 165000, received: 198000, net_due: 492150, grand_due: 1323950, remaining: 831800, advance_shared: 0, invoiced: 0 } };

let root, box;
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await act(async () => {}); };
afterEach(() => { act(() => root.unmount()); box.remove(); });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  api.get.mockImplementation(async (url) => {
    if (url.includes("/running-bill")) return { success: true, data: RB };
    if (url.includes("project-running")) return { success: true, data: PR };
    if (url.includes("billing-ledger")) return { success: true, data: { mode: "manual", items: [
      { item_id: 30, description: "Building construction", category: "GF", unit: "Sqft", planned_qty: 825, rate: 1800, billed_qty: 0 },
      { item_id: 31, description: "Building construction", category: "FF", unit: "Sqft", planned_qty: 825, rate: 1800, billed_qty: 0 }] } };
    if (url.includes("task-suggest")) return { success: true, data: { lines: [{ item_id: 30, suggestions: [] }, { item_id: 31, suggestions: [] }], tasks: [], measure_ready: true } };
    return { success: false };
  });
});
const noKeys = () => { const txt = document.body.textContent; expect(txt).not.toMatch(/(chalu_bill|stage_billing)\.[a-z_]+/); return txt; };
const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent));

test("Chalu Bill: Excel jaisa summary, floor card, sthiti, advance, RB", async () => {
  await mount(<ChaluBillView estimateId={9} />);
  const txt = noKeys();
  expect(txt).toContain("Chalu Bill · RB-2");
  expect(txt).toContain("Pichhla bill RB-1");
  expect(txt).toContain("Net baaki (abhi lena)");
  expect(txt).toContain("₹4,92,150");
  expect(txt).toContain("₹850 me ₹750 hua (88.2%)");
  expect(txt).toContain("Slab Casting ho gaya · GF Inner Plaster chal raha 40%");
  expect(txt).toContain("Bina-bill advance");
  expect(txt).toContain("Haath se 100%");
  expect(txt).toContain("Naya");
  expect(txt).toContain("1 line ki qty 0 hai");
  expect(btn(/^Save karo \(RB-2\)$/)).toBeTruthy();
  // 1st "Ho gaya" = Boundary wall (table), 2nd = Advance (floor card, haath se lagi)
  const ticks = [...document.querySelectorAll("button")].filter((b) => /^Ho gaya$/.test(b.textContent));
  await act(async () => { ticks[1].click(); });
  expect(document.body.textContent).toContain("Haath wala hatao");
  expect(document.querySelector("input[placeholder^='Note']").value).toBe("Agreement par");
});

test("Sab client: row + total", async () => {
  await mount(<ProjectChaluView projectId={70} />);
  const txt = noKeys();
  expect(txt).toContain("Hemant Sahu");
  expect(txt).toContain("₹15,21,950");
  expect(txt).toContain("RB-1");
});

test("% Schedule box: ₹ se par preset ₹ me badalta hai, baaki line ka tick", async () => {
  await mount(<StageLinesPanel kind="estimate" id={9} canEdit canApprove={false} />);
  await act(async () => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Line-wise").click(); });
  await act(async () => { btn(/^% Schedule$/).click(); });
  await act(async () => { btn(/^Ghar wala:/).click(); });
  await act(async () => { btn(/^₹ se$/).click(); });
  const vals = [...document.querySelectorAll("input[type=number]")].map((i) => i.value);
  expect(vals).toContain("540");
  expect(vals).toContain("360");
  const txt = noKeys();
  expect(txt).toContain("Total ₹1,800 / line ₹1,800/Sqft");
  expect(txt).toContain("Isi tarah baaki 1 line par bhi");
});
