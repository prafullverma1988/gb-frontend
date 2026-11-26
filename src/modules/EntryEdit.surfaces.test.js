// Entry Edit (26 Nov 2026) — Fuel pump entry + Asset voucher ka "badlo".
// Server ka mode button tay karta hai; sirf badle hue field jaate hain; admin ko
// rok ki chetavni; samay ke baad 428 → wajah → manzoori.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import { FuelEntryDrawer } from "./FuelModule";
import { VoucherDrawer } from "./AssetsModule";
import api from "../config/api";
import { loadFullPack, setLang } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 1, role: "admin", name: "Admin" }) };
});
jest.mock("../utils/perms", () => ({ can: () => false, canAny: () => false, canEntry: () => true, currentUser: () => ({ id: 1, role: "site_engineer" }) }));
jest.mock("../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style, disabled }) => <select value={value} onChange={onChange} style={style} disabled={disabled}>{children}</select> }));
const mockToast = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
jest.mock("../components/Toast", () => ({ useToast: () => mockToast }));

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
const text = () => document.body.textContent;

beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
afterEach(() => { act(() => root.unmount()); box.remove(); jest.clearAllMocks(); delete window.toast; delete window.promptAsync; });

const PUMP = { kind: "purchase", id: 5, route: "pump_machine", at: "2026-11-26T04:30:00.000Z", created_at: "2026-11-26T04:31:00.000Z",
  litres: 50, rate: 90, amount: 4500, fuel_type: "diesel", slip_no: "S-1", meter_reading: 1200, note: "", photos: [],
  vendor_name: "HP Pump", equipment_name: "JCB", payment_mode: "credit", payable_status: "unbilled", entered_by_name: "Ramesh" };

test("Fuel: admin ko rok ki chetavni, sirf litre jaata, amount = litre × rate, server chetavni dikhe", async () => {
  api.get.mockImplementation(async (url) => {
    if (url === "/fuel/entries/purchase/5") return { success: true, data: PUMP };
    if (url.startsWith("/entry-edit/mode")) return { success: true, data: { mode: "direct", why: "admin", window: "2", window_label: "2 ghante", lock: "Bill FB-3 me hai", pending: null } };
    return { success: true, data: [] };
  });
  api.put.mockResolvedValue({ success: true, data: { id: 5, edit_warning: "Bill ki rakam alag se theek karo" } });
  window.toast = { success: jest.fn(), warning: jest.fn() };
  const onChanged = jest.fn();
  await mount(<FuelEntryDrawer entry={{ kind: "purchase", id: 5 }} onClose={() => {}} onChanged={onChanged} />);
  expect(api.get.mock.calls.some((c) => c[0] === "/entry-edit/mode?entity=fuel_purchase&id=5")).toBe(true);
  await click(btn("Edit karo"));
  const form = document.querySelector("[data-testid='fuel-edit-form']");
  expect(form.textContent).toContain("Baaki ke liye band: Bill FB-3 me hai");
  const litres = [...form.querySelectorAll("input")].find((i) => i.value === "50");
  await type(litres, "60");
  expect(form.textContent).toContain("₹5,400");
  await click(btn("Save karo"));
  expect(api.put).toHaveBeenCalledTimes(1);
  expect(api.put.mock.calls[0][0]).toBe("/fuel/purchases/5");
  expect(api.put.mock.calls[0][1]).toEqual({ litres: 60 });   // filled_at na badla to nahi jaata
  expect(window.toast.warning).toHaveBeenCalledWith("Bill ki rakam alag se theek karo");
  expect(onChanged).toHaveBeenCalled();
  expect(document.querySelector("[data-testid='fuel-edit-form']")).toBeNull();
});

test("Fuel: drum se diya (issue) par Edit nahi; mode none par button nahi", async () => {
  api.get.mockImplementation(async (url) => {
    if (url === "/fuel/entries/issue/8") return { success: true, data: { ...PUMP, kind: "issue", id: 8, route: "store_machine" } };
    if (url === "/fuel/entries/purchase/5") return { success: true, data: PUMP };
    if (url.startsWith("/entry-edit/mode")) return { success: true, data: { mode: "none", why: "not_own", lock: null, pending: null } };
    return { success: true, data: [] };
  });
  await mount(<FuelEntryDrawer entry={{ kind: "issue", id: 8 }} onClose={() => {}} />);
  expect(api.get.mock.calls.some((c) => /entry-edit/.test(c[0]))).toBe(false);
  expect(document.querySelector("[data-testid='fuel-edit-bar']")).toBeNull();
  act(() => root.unmount()); box.remove();
  await mount(<FuelEntryDrawer entry={{ kind: "purchase", id: 5 }} onClose={() => {}} />);
  expect(btn("Edit karo")).toBeUndefined();
});

const VOUCHER = { id: 9, voucher_no: "AV-0009", type: "issue", status: "accepted", date: "2026-11-20", remarks: "", expected_return_date: null,
  items: [], created_by: 1, created_by_name: "Ramesh", created_at: "2026-11-20T05:00:00.000Z" };

test("Voucher: samay nikal gaya — 'manzoori se', 428 par wajah, manzoori me gaya", async () => {
  api.get.mockImplementation(async (url) => {
    if (url === "/assets/vouchers/9") return { success: true, data: VOUCHER };
    if (url.startsWith("/entry-edit/mode")) return { success: true, data: { mode: "request", why: "own_old", window: "2", window_label: "2 ghante", lock: null, pending: null } };
    return { success: true, data: {} };
  });
  api.put
    .mockResolvedValueOnce({ success: false, code: "EDIT_REASON_REQUIRED", message: "Wajah likho" })
    .mockResolvedValueOnce({ success: true, data: { mode: "pending_approval" }, message: "Manzoori ke liye gaya" });
  window.promptAsync = jest.fn(() => Promise.resolve("galat tareekh"));
  await mount(<VoucherDrawer id={9} me={{ id: 1 }} onClose={() => {}} onChanged={() => {}} />);
  expect(document.querySelector("[data-testid='voucher-edit-note']").textContent).toContain("Samay (2 ghante) nikal gaya");
  await click(btn("Edit (manzoori se)"));
  const form = document.querySelector("[data-testid='voucher-edit-form']");
  expect(form.textContent).toContain("Item, matra aur jagah yahan nahi badalte");
  const date = [...form.querySelectorAll("input[type='date']")].find((i) => i.value === "2026-11-20");
  await type(date, "2026-11-21");
  await click(btn("Manzoori ke liye bhejo"));
  expect(api.put.mock.calls.map((c) => c[1])).toEqual([{ date: "2026-11-21" }, { date: "2026-11-21", _edit_reason: "galat tareekh" }]);
  expect(api.put.mock.calls[0][0]).toBe("/assets/vouchers/9");
  expect(mockToast.success).toHaveBeenCalledWith("Manzoori ke liye gaya");
  expect(document.querySelector("[data-testid='voucher-edit-form']")).toBeNull();
});

test("Voucher: badlav manzoori me — button band + line; cancelled par Edit nahi", async () => {
  api.get.mockImplementation(async (url) => {
    if (url === "/assets/vouchers/9") return { success: true, data: VOUCHER };
    if (url.startsWith("/entry-edit/mode")) return { success: true, data: { mode: "request", window_label: "2 ghante", pending: { id: 3 } } };
    return { success: true, data: {} };
  });
  await mount(<VoucherDrawer id={9} me={{ id: 1 }} onClose={() => {}} onChanged={() => {}} />);
  expect(btn("Edit karo").disabled).toBe(true);
  expect(text()).toContain("Ek badlav manzoori me hai");
  act(() => root.unmount()); box.remove();
  api.get.mockImplementation(async (url) => {
    if (url === "/assets/vouchers/9") return { success: true, data: { ...VOUCHER, status: "cancelled" } };
    if (url.startsWith("/entry-edit/mode")) return { success: true, data: { mode: "direct", why: "own_fresh" } };
    return { success: true, data: {} };
  });
  await mount(<VoucherDrawer id={9} me={{ id: 1 }} onClose={() => {}} onChanged={() => {}} />);
  expect(btn("Edit karo")).toBeUndefined();
});
