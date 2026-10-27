// Material trail drawer (27 Oct 2026) — asli jaisa data, render karke:
// kram, highlight, IST time, photo bada + band, ₹ sirf jab server rakam de,
// koi key ka naam / English label nahi, Store khaate se (trail) GRN ke kaam nahi.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import MaterialFlowDrawer, { trailLines, trailWhen } from "./MaterialFlowDrawer";
import api from "../config/api";
import { loadFullPack, setLang } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api };
});
jest.mock("./ActivityLog", () => ({ __esModule: true, default: () => null }));
jest.mock("./LibrarySelect", () => ({ __esModule: true, default: () => null }));
jest.mock("../utils/perms", () => ({ can: () => true, canAny: () => true, canEntry: () => true }));

global.IS_REACT_ACT_ENVIRONMENT = true;

const STEPS = [
  { key: "mr:40", type: "mr", at: "2026-10-10T04:00:00.000Z", by_name: "Suresh", title: "MR-0040",
    details: { items: [{ name: "Cement", qty: 100, unit: "Bag" }], project: "Bhilai Road", note: "jaldi" }, photos: [{ url: "https://x/mr.jpg", kind: "mr" }] },
  { key: "appr:mr:40", type: "approval", at: "2026-10-11T06:00:00.000Z", by_name: "Admin A", title: "MR-0040", details: { status: "approved", qty: 100, unit: "Bag" }, photos: [] },
  { key: "order:po:12", type: "order", at: "2026-10-12T05:00:00.000Z", by_name: "Admin A", title: "PO-0012", details: { vendor: "ACC", po_no: "PO-0012", expected: "2026-10-19" }, photos: [] },
  { key: "weigh:5", type: "weigh", at: "2026-10-15T03:00:00.000Z", by_name: "Suresh", title: "RST-9",
    details: { vehicle_no: "CG04AB1234", gross_kg: 25000, tare_kg: 15000, net_kg: 10000 }, photos: [{ url: "https://x/g.jpg", kind: "weigh_slip" }] },
  { key: "grn:300", type: "grn", at: "2026-10-15T03:30:00.000Z", date: "2026-10-15", by_name: "Suresh", title: "GRN-300", highlight: true,
    details: { items: [{ name: "Cement", qty: 100, unit: "Bag" }], vendor: "ACC", challan: "CH-1", rec_slip: "R-77", project: "Bhilai Road" },
    photos: [{ url: "https://x/c.jpg", kind: "challan" }, { url: "https://x/r.jpg", kind: "rec_slip" }] },
  { key: "use:1000", type: "use", at: null, date: "2026-10-16", by_name: "Suresh", title: "T-01", approx: true,
    details: { items: [{ name: "Cement", qty: 20, unit: "Bag" }], task: "Base course" }, photos: [] },
];
const DATA = (extra = {}) => ({ kind: "grn", id: 300, material: null, finance: false, hidden: 0, approx: false, steps: STEPS,
  doc: { grn: { id: 300, grn_number: "GRN-300", project_id: 116, grn_type: "Full" }, items: [{ id: 700, description: "Cement", received_qty: "100.000", unit: "Bag" }],
    mr: null, issues: [{ id: 1, issue_type: "WrongItem", note: "galat grade", status: "Open", created_at: "2026-10-15T04:00:00.000Z" }] }, ...extra });

let root, box;
const mount = async (props) => {
  box = document.createElement("div");
  document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<MaterialFlowDrawer onClose={() => {}} {...props}/>); });
  await act(async () => {});
};
const text = () => document.body.textContent;
beforeAll(() => loadFullPack());
beforeEach(() => {
  api.get.mockImplementation((url) => Promise.resolve(/cancel-info/.test(url) ? { success: true, data: { cancellable: false } } : { success: true, data: DATA() }));
});
afterEach(() => { act(() => root.unmount()); box.remove(); jest.clearAllMocks(); });

test("naya endpoint, kram, highlight, IST time", async () => {
  await mount({ grnId: 300 });
  expect(api.get.mock.calls[0][0]).toBe("/procurement/material-trail?kind=grn&id=300");
  const types = [...document.querySelectorAll("[data-testid^='trail-step-']")].map(e => e.getAttribute("data-testid").replace("trail-step-", ""));
  expect(types).toEqual(["mr", "approval", "order", "weigh", "grn", "use"]);
  // 03:30 UTC = 9:00 AM IST
  expect(text()).toContain("15 Oct 2026, 9:00 AM · Suresh");
  // sirf date wala use — din jaisa ka waisa
  expect(text()).toContain("16 Oct 2026 · Suresh");
  expect(text()).toContain("Yahan se khola");
  expect(text()).toContain("Gross: 25,000 kg · Tare: 15,000 kg · Net: 10,000 kg");
  expect(text()).toContain("6 step");
  // koi key ka naam / English data label nahi
  expect(text()).not.toMatch(/mtrail\.|material_flow\.|Requested By|Expected Delivery|events?\b/);
  // issue type bhasha me (pehle "WrongItem" seedha dikhta tha)
  expect(text()).toContain("Galat item");
  expect(text()).not.toContain("WrongItem");
  // server ne rakam nahi di → ₹ kahin nahi
  expect(text()).not.toContain("₹");
});

test("purani GRN: MR ka andaaza (mr_guess) dikhta hai", async () => {
  api.get.mockImplementation((url) => Promise.resolve(/cancel-info/.test(url) ? { success: true, data: {} }
    : { success: true, data: DATA({ steps: STEPS.slice(4), doc: { ...DATA().doc, mr_guess: { id: 2, mr_number: "MR-2", item_name: "test 1", quantity: "12.00", unit: "Nos", created_at: "2026-04-13T05:00:00.000Z" } } }) }));
  await mount({ grnId: 300 });
  expect(text()).toContain("Shayad MR-2 (test 1 · 12 Nos, 13 Apr 2026)");
});

test("photo bada khulta hai aur × se band hota hai", async () => {
  await mount({ grnId: 300 });
  const thumb = document.querySelector("[data-testid='trail-step-grn'] img");
  await act(async () => { thumb.click(); });
  expect(document.querySelector("[data-testid='trail-zoom']")).not.toBeNull();
  await act(async () => { document.querySelector("[data-testid='trail-zoom'] button").click(); });
  expect(document.querySelector("[data-testid='trail-zoom']")).toBeNull();
});

test("Finance wale ko server rakam deta hai to ₹ dikhta hai", async () => {
  api.get.mockImplementation((url) => Promise.resolve(/cancel-info/.test(url) ? { success: true, data: {} }
    : { success: true, data: DATA({ finance: true, steps: [...STEPS, { key: "bill:900", type: "bill", at: "2026-10-16T06:00:00.000Z", title: "B-12", details: { vendor: "ACC", amount: 30000 }, photos: [] }] }) }));
  await mount({ grnId: 300 });
  expect(text()).toContain("Rakam: ₹30,000");
});

test("Store khaate se (trail): GRN ke kaam / footer nahi, hidden note", async () => {
  api.get.mockResolvedValue({ success: true, data: { kind: "wh_issue", id: 20, material: "sariya", finance: false, hidden: 1, approx: false,
    steps: [{ key: "issue:20", type: "issue", at: "2026-10-18T04:00:00.000Z", by_name: "Ramesh", title: "ISS-0007", highlight: true,
      details: { items: [{ name: "Sariya", qty: 50, unit: "Kg" }], store: "Main Store", project: "Bhilai Road", custodian: "Zimmedar Z", issued_to: "Suresh" }, photos: [] }] } });
  await mount({ trail: { kind: "wh_issue", id: 20, material: "Sariya" } });
  expect(api.get.mock.calls[0][0]).toBe("/procurement/material-trail?kind=wh_issue&id=20&material=Sariya");
  expect(text()).toContain("Store se diya");
  expect(text()).toContain("Zimmedar: Zimmedar Z");
  expect(text()).toContain("1 step aapke access me nahi");
  expect(text()).not.toContain("Edit GRN");
  expect(api.get.mock.calls.some(c => /cancel-info/.test(c[0]))).toBe(false);
});

test("trailLines / trailWhen — English pack", async () => {
  await setLang("en", { reload: false });
  const L = trailLines({ type: "receive", details: { items: [{ name: "Sand", qty: 5, unit: "Cum" }], from: "Main Store", project: "Bhilai Road", status: "received" } });
  expect(L.items).toBe("Sand 5 Cum");
  expect(L.rest).toBe("Received · From: Main Store · Project: Bhilai Road");
  expect(trailWhen({ at: "2026-10-21T05:00:00.000Z" })).toBe("21 Oct 2026, 10:30 AM");
  await setLang("hi-Latn", { reload: false });
});
