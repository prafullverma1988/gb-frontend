// Entry Edit Phase 2 (26 Nov 2026) — Finance entry drawer, Site MR drawer, Store transfer
// ki upar ki jaankari. Server ka mode button tay karta hai; banane wale ke liye sirf
// apne field jaate hain; manzoor ho chuki entry = "manzoori se".
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import TransactionDetailDrawer from "../components/TransactionDetailDrawer";
import MRDetailDrawer from "../components/MRDetailDrawer";
import { TransferDetailDrawer } from "./WarehouseModule";
import api from "../config/api";
import { t, loadFullPack, setLang } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 5, role: "site_engineer", name: "Ramesh" }),
    getWarehouseId: () => null, setWarehouseId: () => {} };
});
// Banane wala — kisi module ka Edit tick nahi
jest.mock("../utils/perms", () => ({ can: () => false, canAny: () => false, canEntry: () => true, currentUser: () => ({ id: 5, role: "site_engineer" }) }));
jest.mock("../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style, disabled }) => <select value={value} onChange={onChange} style={style} disabled={disabled}>{children}</select> }));
jest.mock("../components/ActivityLog", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/LibrarySelect", () => ({ __esModule: true, default: () => null }));

// eslint-disable-next-line no-undef
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root, box;
const flush = async () => { for (let i = 0; i < 6; i++) await act(async () => {}); };
const mount = async (el) => {
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
  await act(async () => { root.render(el); });
  await flush();
};
const btn = (txt) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === txt);
const click = async (el) => { await act(async () => { el.click(); }); await flush(); };
const type = async (el, v) => {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  await act(async () => { setter.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const modeOf = (mode) => (url) => (url.startsWith("/entry-edit/mode") ? { success: true, data: mode } : null);

beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
afterEach(() => { act(() => root.unmount()); box.remove(); delete window.toast; delete window.promptAsync; });

const TXN = { id: 501, txnType: "site_expense", amount: 1200, date_iso: "2026-11-20", status: "paid", note: "chai", party_name: "", project_name: "", items: [] };

test("Finance entry: manzoor ho chuki — 'manzoori se', status / tareekh na badle to nahi jaate, 428 par wajah", async () => {
  const m = modeOf({ mode: "request", why: "approved_entry", window: "2", window_label: "2 ghante", lock: null, pending: null });
  api.get.mockImplementation(async (url) => m(url) || { success: true, data: [] });
  api.put
    .mockResolvedValueOnce({ success: false, code: "EDIT_REASON_REQUIRED", why: "approved_entry", message: "Wajah likho" })
    .mockResolvedValueOnce({ success: true, data: { mode: "pending_approval" }, message: "Manzoori ke liye gaya" });
  window.promptAsync = jest.fn(() => Promise.resolve("rakam galat"));
  window.toast = { success: jest.fn() };
  const onChanged = jest.fn();
  await mount(<TransactionDetailDrawer txn={TXN} onClose={() => {}} onChanged={onChanged} />);
  expect(api.get.mock.calls.some((c) => c[0] === "/entry-edit/mode?entity=fin_txn&id=501")).toBe(true);
  expect(document.querySelector("[data-testid='txn-edit-note']").textContent).toBe("Ye entry manzoor ho chuki — badlav manzoori ke liye jaayega");
  await click(btn("Edit (manzoori se)"));
  // banane wala status nahi badal sakta
  expect([...document.querySelectorAll("select")].find((s) => s.value === "paid").disabled).toBe(true);
  const amt = [...document.querySelectorAll("input")].find((i) => i.value === "1200");
  await type(amt, "1500");
  await click(btn("Manzoori ke liye bhejo"));
  expect(api.put).toHaveBeenCalledTimes(2);
  const first = api.put.mock.calls[0][1];
  expect(first.amount).toBe(1500);
  expect("status" in first && first.status !== undefined).toBe(false);
  expect(first.date).toBeUndefined();
  expect(api.put.mock.calls[1][1]._edit_reason).toBe("rakam galat");
  expect(window.toast.success).toHaveBeenCalledWith("Manzoori ke liye gaya");
  expect(onChanged).not.toHaveBeenCalled();
});

test("Finance entry: manzoori chal rahi (mode none + rok) — Edit nahi, rok ki line", async () => {
  const m = modeOf({ mode: "none", why: "locked", lock: "Ye entry abhi manzoori me hai", pending: null });
  api.get.mockImplementation(async (url) => m(url) || { success: true, data: [] });
  await mount(<TransactionDetailDrawer txn={TXN} onClose={() => {}} onChanged={() => {}} />);
  expect(btn(t("common.edit"))).toBeUndefined();
  expect(document.querySelector("[data-testid='txn-edit-note']").textContent).toBe("Ye entry abhi manzoori me hai");
});

const MR = { id: 31, mr_number: "MR-31", item_name: "Cement", quantity: 10, unit: "Bag", required_date: "2026-11-28", approx_amount: 4000,
  notes: "", requested_by: "Ramesh", linked_vendor: "ACC", mr_status: "Pending", mat_status: "Pending", created_at: "2026-11-26T05:00:00.000Z" };

test("Site MR: apni MR samay ke andar — vendor / maangne wala nahi dikhte, na jaate", async () => {
  const m = modeOf({ mode: "direct", why: "own_fresh", window: "2", window_label: "2 ghante", lock: null, pending: null });
  api.get.mockImplementation(async (url) => m(url) || { success: true, data: [] });
  api.put.mockResolvedValue({ success: true, data: {} });
  const onChanged = jest.fn();
  await mount(<MRDetailDrawer mr={MR} onClose={() => {}} onChanged={onChanged} />);
  expect(api.get.mock.calls.some((c) => c[0] === "/entry-edit/mode?entity=site_mr&id=31")).toBe(true);
  await click(btn(t("common.edit")));
  expect(document.body.textContent).not.toContain(t("mrdetail.requested_by"));
  await type(document.querySelector("textarea"), "matra galat");
  const qty = [...document.querySelectorAll("input")].find((i) => i.value === "10");
  await type(qty, "12");
  await click(btn(t("mrdetail.save_changes")));
  const body = api.put.mock.calls[0][1];
  expect(api.put.mock.calls[0][0]).toBe("/procurement/mrs/31");
  expect(body.quantity).toBe(12);
  expect(Object.keys(body).filter((k) => ["requested_by", "linked_vendor", "expected_delivery", "challan_no", "_edit_reason"].includes(k))).toEqual([]);
  expect(onChanged).toHaveBeenCalled();
});

test("Site MR: order ho chuki (none + rok) — Edit nahi, rok ki line", async () => {
  const m = modeOf({ mode: "none", why: "locked", lock: "MR-31 ka order ho chuka", pending: null });
  api.get.mockImplementation(async (url) => m(url) || { success: true, data: [] });
  await mount(<MRDetailDrawer mr={MR} onClose={() => {}} onChanged={() => {}} />);
  expect(btn(t("common.edit"))).toBeUndefined();
  expect(document.querySelector("[data-testid='mr-edit-note']").textContent).toBe("MR-31 ka order ho chuka");
});

const TRF = { id: 7, transfer_no: "TRF-7", date: "2026-11-20", status: "Completed", items: [], driver_name: "Mohan", driver_phone: "", notes: "",
  from_warehouse_name: "Main Store", to_project_name: "Site A", created_at: "2026-11-20T05:00:00.000Z" };

test("Store transfer: upar ki jaankari — sirf badla field /info par, phir dobara laaye", async () => {
  const m = modeOf({ mode: "direct", why: "own_fresh", window: "2", window_label: "2 ghante", lock: null, pending: null });
  api.get.mockImplementation(async (url) => m(url) || (url === "/warehouse/transfers/7" ? { success: true, data: TRF } : { success: true, data: [] }));
  api.put.mockResolvedValue({ success: true, data: { ...TRF, driver_name: "Sohan" }, message: "Save ho gaya" });
  window.toast = { success: jest.fn() };
  const onReceived = jest.fn();
  await mount(<TransferDetailDrawer transfer={{ dbId: 7, id: "TRF-7" }} onClose={() => {}} onReceived={onReceived} />);
  expect(api.get.mock.calls.some((c) => c[0] === "/entry-edit/mode?entity=wh_transfer&id=7")).toBe(true);
  await click(btn("Edit karo"));
  const form = document.querySelector("[data-testid='store-info-form']");
  expect(form.textContent).toContain("Matra / jagah badalni ho to cancel karke dobara banao");
  const drv = [...form.querySelectorAll("input")].find((i) => i.value === "Mohan");
  await type(drv, "Sohan");
  await click(btn(t("common.save")));
  expect(api.put).toHaveBeenCalledWith("/warehouse/transfers/7/info", { driver_name: "Sohan" });
  expect(window.toast.success).toHaveBeenCalledWith("Save ho gaya");
  expect(onReceived).toHaveBeenCalled();
  expect(api.get.mock.calls.filter((c) => c[0] === "/warehouse/transfers/7").length).toBe(2);
});

test("Store transfer: cancel ho chuka — Edit nahi, mode bhi nahi poochha", async () => {
  api.get.mockImplementation(async (url) => (url === "/warehouse/transfers/7" ? { success: true, data: { ...TRF, status: "Cancelled", cancelled_at: "2026-11-21T05:00:00.000Z" } } : { success: true, data: [] }));
  await mount(<TransferDetailDrawer transfer={{ dbId: 7, id: "TRF-7" }} onClose={() => {}} />);
  expect(document.querySelector("[data-testid='store-info-bar']")).toBeNull();
  expect(api.get.mock.calls.some((c) => /entry-edit/.test(c[0]))).toBe(false);
});
