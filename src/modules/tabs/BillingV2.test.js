// Billing v2 (2 Nov 2026) — asli harness jaisa data render karke
// dekho ki components girte nahi aur key ka naam screen par nahi aata.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { StatementView, MeasureBillModal, MeasureQueue, StageKhaataView, ProjectStatementView, DraftLinesModal } from "./BillingV2";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

const STMT = { wo: { id: 1, subcon_name: "Shailendra", status: "Active" }, header: { contract_original: 1277650, amendments: [{ id: 1, delta: 16000 }], amend_unknown: 0,
  contract_now: 1293650, extra: 0, billed_gross: 310716.4, pending_gross: 0, sd: 15535.82, sd_released: 0, tds: 6214.33, material: 0, katauti: 0, net: 288966.25,
  paid: 0, payable: 288966.25, advance: 50000, to_bill: 982933.6 },
  lines: [{ wo_item_id: 3, description: "Brick work (40%)", category: "BOUNDARY WALL", unit: "RMT", item_type: "boq", measure_mode: "qty", orig_qty: 600, orig_rate: 800,
    qty: 620, rate: 800, amount: 496000, billed_qty: 198.947, pending_qty: 0, balance_qty: 421.053, pct: 32.1, task: { id: 9, name: "Brick Work", progress: 33 } }],
  bills: [{ id: 5, bill_no: "RA-1", bill_date: "2026-11-02", upto_date: "2026-11-02", status: "Approved", source: "measure", gross_amount: 310716.4,
    retention_amt: 15535.82, tds_amt: 6214.33, material_amt: 0, other_deduction_amt: 0, net_payable: 288966.25, paid: 0 }] };
const DRAFT = { wo: { id: 1, subcon_name: "Shailendra" }, upto: "2026-11-03", last_upto: "2026-11-02", can: { bill: true, reject: true },
  lines: [{ wo_item_id: 3, description: "Brick work (40%)", category: "BOUNDARY WALL", unit: "RMT", rate: 800, qty: 600, billed_qty: 198.947, remaining: 401.053,
    task: { id: 9, name: "Brick Work", unit: "MTR", scope_qty: 608, done_qty: 213.6 }, factor: 0.986842, factor_auto: true, alignment_id: null, alignment: null,
    entries: [{ entry_id: 77, date: "2026-10-31", qty: 12, remarks: "Bricks", by: "Mukesh Mane", alignment: "Mukti dham", wo_qty: 11.842, amount: 9473.6,
      flags: { late: true, no_photo: true, ai: false, ai_note: null, minus: false } }], pool_qty: 12, pool_wo_qty: 11.842, pool_amount: 9473.6 }],
  ambiguous: [{ entry_id: 88, date: "2026-11-01", qty: 300, task_name: "DI pipe laying", candidates: [{ wo_id: 2, subcon_name: "Dinesh" }, { wo_id: 3, subcon_name: "Raju" }] }] };
const QUEUE = { can: { bill: true }, items: [{ wo_id: 1, project_id: 201, project_name: "Sendh Village", subcon_name: "Shailendra", entries: 1, amount: 9473.6,
  last_date: "2026-10-31", last_upto: "2026-11-02", open_draft: null, flags: { late: 1, no_photo: 1, ai: 0, minus: 0 }, ambiguous: 0, over: 0 }] };
const SK = { project: { id: 201 }, can: { client: true, subcon: true, budget: true, profit: true },
  total: { client_contract: 1586000, client_billed: 0, client_draft: 0, subcon_value: 496000, subcon_billed: 159157.6, subcon_pending: 0, budget: 0, actual: 0, margin: -159157.6 },
  rows: [{ stage_task_id: 9, name: "Brick Work", parent_name: "Boundary wall", progress: 33, flags: ["subcon_ahead"],
    client: { contract: 1586000, extra: 0, billed: 0, draft: 0, lines: [] },
    subcon: { value: 496000, billed: 159157.6, pending: 0, wos: [{ wo_id: 1, subcon_name: "Shailendra", value: 496000, billed: 159157.6, pending: 0, measure: true }] },
    budget: 0, actual: 0, margin: -159157.6 },
    { stage_task_id: null, name: null, progress: null, flags: [], client: { contract: 0, extra: 0, billed: 0, draft: 0, lines: [{}] }, subcon: { value: 0, billed: 0, pending: 0, wos: [] }, budget: null, actual: null }] };
const PSTMT = { rows: [{ wo: STMT.wo, header: STMT.header }], total: { contract_now: 1293650, billed_gross: 310716.4, net: 288966.25, paid: 0, payable: 288966.25, to_bill: 982933.6 } };
const INV = { invoice_no: "AINV/26-27/001", items: [{ id: 1, estimate_item_id: 493, prev_cumulative: 0, this_invoice_qty: 1455, rate: 300, unit: "Sqft", description: "[GF] plinth" }] };

let root, box;
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await act(async () => {}); };
afterEach(() => { act(() => root.unmount()); box.remove(); });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  api.get.mockImplementation(async (url) => {
    if (url.includes("statement")) return { success: true, data: url.includes("project-statement") ? PSTMT : STMT };
    if (url.includes("measure-draft")) return { success: true, data: DRAFT };
    if (url.includes("measure-queue")) return { success: true, data: QUEUE };
    if (url.includes("stage-khaata")) return { success: true, data: SK };
    if (url.includes("/invoices/")) return { success: true, data: INV };
    return { success: false };
  });
});
const noKeys = () => { const txt = document.body.textContent; expect(txt).not.toMatch(/stage_billing\.[a-z_]+/); return txt; };

test("statement: tiles + orig/ab qty + RA-1 naap chip", async () => {
  await mount(<StatementView kind="wo" id={1} />);
  const txt = noKeys();
  expect(txt).toContain("Contract (shuru ka)");
  expect(txt).toContain("12,77,650");
  expect(txt).toContain("Advance (bina bill)");
  expect(txt).toContain("RA-1");
  expect(txt).toContain("620");
});
test("naap review: entry, chips, bina thekedar", async () => {
  await mount(<MeasureBillModal woId={1} onClose={() => {}} onDone={() => {}} />);
  const txt = noKeys();
  expect(txt).toContain("Mukesh Mane");
  expect(txt).toContain("pichhli tareekh");
  expect(txt).toContain("Dinesh ka");
  expect(txt).toContain("9,473.6");
});
test("queue + stage khaata + sab thekedar + draft edit", async () => {
  await mount(<MeasureQueue title="Q" />);
  expect(noKeys()).toContain("Sendh Village");
  act(() => root.unmount()); box.remove();
  await mount(<StageKhaataView projectId={201} />);
  const txt = noKeys();
  expect(txt).toContain("Brick Work");
  expect(txt).toContain("Bina stage");
  act(() => root.unmount()); box.remove();
  await mount(<ProjectStatementView kind="wo" projectId={201} />);
  expect(noKeys()).toContain("Shailendra");
  act(() => root.unmount()); box.remove();
  await mount(<DraftLinesModal invoiceId={116} onClose={() => {}} onDone={() => {}} />);
  expect(noKeys()).toContain("plinth");
});
