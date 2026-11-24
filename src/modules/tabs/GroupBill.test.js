// Group-wise bill (24 Nov 2026) — sab invoice jod kar har kaam ka haal + kis invoice me; PDF / Excel
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import GroupBillModal, { groupBillCsvRows, gbQuery } from "./GroupBill";
import { chaluCsvRows } from "./ChaluBill";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;
let root, box;
const flush = async () => { for (let i = 0; i < 5; i++) await act(async () => {}); };
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await flush(); };
afterEach(() => { if (root) act(() => root.unmount()); if (box) box.remove(); root = null; box = null; });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
const $ = (s) => document.querySelector(s);
const noKeys = () => expect(document.body.textContent).not.toMatch(/(group_bill|chalu_bill)\.[a-z_]+/);

const INV = (id, no, date, gross, status = "Submitted", included = true) => ({ id, invoice_no: no, invoice_date: date, status, gross, net: gross, received: 0, included });
const GB = (incl) => ({
  estimate: { id: 74, estimate_no: "EST-1" }, bill_date: "2026-11-24",
  invoices: [INV(3, "INV/26-27/003", "2026-11-24", 659250, "Submitted", incl.includes(3)), INV(7, "AINV/26-27/007", "2026-11-24", 371505, "Submitted", incl.includes(7))],
  groups: [{ key: "GF¦Ground Floor", title: "GF · Ground Floor", qty: 1465, unit: "sq.ft.", rate: 1500, amount: 2197500, done_amt: 1098750, billed_amt: 659250,
    unbilled_done: 439500, remaining: 1098750, sthiti: "Slab level chal raha 85%",
    stages: [
      { item_id: 1, name: "Plinth", pct: 20, amount: 439500, done_amt: 439500, billed_amt: 439500, opening_amt: 0, status: "billed", status_label: "Bill bana",
        invoices: [{ invoice_id: 3, invoice_no: "INV/26-27/003", invoice_date: "2026-11-24", amount: 439500 }] },
      { item_id: 2, name: "Slab level", pct: 5, amount: 109875, done_amt: 0, billed_amt: 0, opening_amt: 0, status: "prog", status_label: "Chal raha 85%", invoices: [] }] }],
  extras: [],
  totals: { contract: 4956900, done: 1098750, billed: 659250, unbilled_done: 439500, received: 0, net_due: 1030755, remaining: 3858150, all_included: incl.length === 2, included_count: incl.length },
});

test("Group bill: har kaam ka card — area × rate, stage ka haal, kis invoice me; invoice tick hatao → dobara (sirf bachi invoice)", async () => {
  api.get.mockImplementation(async (url) => ({ success: true, data: /invoice_ids=7$/.test(url) ? GB([7]) : GB([3, 7]) }));
  await mount(<GroupBillModal estimateId={74} onClose={() => {}} />);
  expect(api.get.mock.calls[0][0]).toBe("/customer-estimates/74/group-bill");
  const g = $('[data-gb-group="GF¦Ground Floor"]');
  expect(g.textContent).toContain("1,465 sq.ft. × ₹1,500 = ₹21,97,500");
  expect($('[data-gb-stage="1"]').textContent).toContain("Bill bana");
  expect($('[data-gb-stage="1"]').textContent).toContain("INV/26-27/003");
  expect($('[data-gb-stage="2"]').textContent).toContain("Chal raha 85%");
  expect(g.textContent).toContain("Kaam hua, bill baaki ₹4,39,500");
  expect($('[data-testid="gb-summary"]').textContent).toContain("Baaki dena₹10,30,755");
  noKeys();
  await act(async () => { $('[data-gb-inv="3"] input').click(); });
  await flush();
  expect(api.get.mock.calls[api.get.mock.calls.length - 1][0]).toBe("/customer-estimates/74/group-bill?invoice_ids=7");
  expect($('[data-testid="gb-summary"]').textContent).not.toContain("Baaki dena₹");
  expect($('[data-testid="gb-summary"]').textContent).toContain("Aaya / Baaki dena tab dikhta hai");
});

test("Excel rows (group bill) + query; Chalu Bill Excel me Bill hua + invoice", () => {
  const rows = groupBillCsvRows(GB([3, 7]));
  expect(rows[0]).toEqual(["Kaam", "Area / Qty", "Unit", "Rate (₹)", "Stage", "%", "Rakam", "Haal", "Kaam hua ₹", "Bill hua ₹", "Kis invoice me"]);
  expect(rows[1]).toEqual(["GF · Ground Floor", 1465, "sq.ft.", 1500, "Plinth", 20, 439500, "Bill bana", 439500, 439500, "INV/26-27/003 (24 Nov 26) 439500"]);
  expect(rows.some((r) => r[9] === "Baaki dena" && r[10] === 1030755)).toBe(true);
  expect(gbQuery(null)).toBe("");
  expect(gbQuery({ ids: [] })).toBe("?invoice_ids=0");
  expect(gbQuery({ upto: "2026-11-20" })).toBe("?upto=2026-11-20");
  const cr = chaluCsvRows({ rows: [{ key: "k", section: "GF", category: "GF", name: "Ground Floor", qty: 1465, unit: "sq.ft.", rate: 1500, amount: 2197500, done_amt: 1098750,
    billed_amt: 659250, inv_nos: ["INV/26-27/003"], sthiti: "Slab level chal raha 85%", split: false, parts: [] }], extras: [], totals: { grand: 2197500, done: 1098750 } });
  expect(cr[0][8]).toBe("Bill hua ₹");
  expect(cr[1].slice(7, 10)).toEqual([1098750, 659250, "INV/26-27/003"]);
});
