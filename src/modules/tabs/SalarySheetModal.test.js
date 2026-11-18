// Salary banao — ek sheet (18 Nov 2026): Team & HR ki tay salary + hazri se bhari
// aati hai; "Tay mahina" wale ki chhutti katauti haath se, "Hazri se" wale ki apne
// aap; head (Petrol / Bonus / naya) ki rakam; "Salary bana do" → POST
// /payroll/run/finalize { extras }. Ban chuki ho to sirf dikhti hai. Bahar-fence
// review baaki ho ya admin na ho to button band.
import { act } from "react";
import { createRoot } from "react-dom/client";
import SalarySheetModal from "./SalarySheetModal";
import api from "../../config/api";
import { loadFullPack } from "../../i18n";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn();
  return { __esModule: true, default: api };
});

window.IS_REACT_ACT_ENVIRONMENT = true;
const HEADS = [
  { id: 1, name: "Petrol", code: "petrol", bucket: "petrol" }, { id: 2, name: "Allowance", code: "allowance", bucket: "salary" },
  { id: 3, name: "Bonus", code: "bonus", bucket: "salary" }, { id: 4, name: "Other", code: "other", bucket: "salary" },
];
const item = (o) => ({ designation: "", city_id: null, days_half: 0, days_paid_leave: 0, days_unpaid_leave: 0, ot_amount: 0, deductions: 0,
  leave_cut: 0, heads: [], heads_amount: 0, petrol_amount: 0, run_item_id: null, pay_status: null, settled_salary: 0, settled_petrol: 0, ...o });
const OPEN = { month: 10, year: 2026, locked: false, wd: 26, heads: HEADS, can_make: true, pending_reviews: 0, run: null, totals: {},
  items: [
    item({ staff_id: 5, staff_name: "Harsh", payment_type: "fixed", full_gross: 10000, gross_earned: 10000, base_net: 10000, net_amount: 10000,
      payable_days: 26, days_present: 24, days_absent: 2, heads: [{ head_id: 1, name: "Petrol", bucket: "petrol", amount: 2000 }], petrol_amount: 2000 }),
    item({ staff_id: 6, staff_name: "Pushpendra", payment_type: "attendance", full_gross: 15000, gross_earned: 12692, base_net: 12692, net_amount: 12692,
      payable_days: 22, days_present: 22, days_absent: 0 }),
  ] };
const LOCKED = { ...OPEN, locked: true, run: { id: 9 },
  items: [item({ staff_id: 5, staff_name: "Harsh", payment_type: "fixed", full_gross: 10000, gross_earned: 10000, base_net: 10000, net_amount: 10230,
    leave_cut: 770, heads_amount: 1000, petrol_amount: 2000, payable_days: 26, days_present: 24, days_absent: 2, run_item_id: 31, pay_status: "partial",
    settled_salary: 5000, settled_petrol: 0,
    heads: [{ head_id: 1, name: "Petrol", bucket: "petrol", amount: 2000 }, { head_id: 3, name: "Bonus", bucket: "salary", amount: 1000 }] })] };

let root, box, done;
beforeAll(() => loadFullPack());
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });
const mount = async (sheet) => {
  api.get.mockReset(); api.get.mockImplementation(() => Promise.resolve({ success: true, data: sheet }));
  api.post.mockReset(); api.post.mockResolvedValue({ success: true, data: { run_id: 9 } });
  window.alert = jest.fn(); window.confirmAsync = jest.fn(async () => true); done = jest.fn();
  box = document.createElement("div"); document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<SalarySheetModal month={10} year={2026} onClose={() => {}} onDone={done} />); });
  await flush();
};
afterEach(() => { act(() => root.unmount()); box.remove(); });
const btn = (re) => [...box.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const click = async (el) => { if (!el) throw new Error("button nahi mila"); await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const setVal = async (el, v) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => { set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const input = (label) => box.querySelector(`input[aria-label="${label}"]`);
const rowText = (name) => [...box.querySelectorAll("tbody tr")].find((r) => r.textContent.includes(name)).textContent;

test("bhari aati hai: tay head, hazri wale ki katauti apne aap, tay mahine wale ki haath se", async () => {
  await mount(OPEN);
  expect(api.get).toHaveBeenCalledWith("/staff-pay/sheet?month=10&year=2026");
  expect(box.textContent).toContain("October 2026 ki salary");
  expect(input("Petrol — Harsh").value).toBe("2000");
  expect(input("Chhutti katauti — Harsh")).toBeTruthy();
  expect(input("Chhutti katauti — Pushpendra")).toBeNull();
  expect(rowText("Pushpendra")).toContain("₹2,308 apne aap");
  expect(rowText("Pushpendra")).toContain("22/26");
  expect(rowText("Harsh")).toContain("Absent 2");
  expect(rowText("Harsh")).toContain("12,000");                    // 10,000 + petrol 2,000
  expect(box.textContent).toContain("2 staff · kul ₹24,692");
  // 2 din ki salah → dabane par katauti bhar jaati hai
  await click(btn(/^2 din = ₹769\?$/));
  expect(input("Chhutti katauti — Harsh").value).toBe("769");
  expect(rowText("Harsh")).toContain("11,231");
});

test("head add (purana + naya), phir Salary bana do → finalize me extras", async () => {
  await mount(OPEN);
  await click(btn(/Head add karo/));
  await click(btn(/^Bonus$/));
  await setVal(input("Bonus — Harsh"), "1000");
  await setVal(input("Chhutti katauti — Harsh"), "500");
  await setVal(box.querySelector('input[placeholder="wajah (jaise 2 din)"]'), "1 din");
  api.post.mockResolvedValueOnce({ success: true, data: { id: 44, name: "Mobile recharge", bucket: "salary" } });
  await click(btn(/Head add karo/));
  await setVal(box.querySelector('input[placeholder^="Naya head"]'), "Mobile recharge");
  await click(btn(/^Banao$/));
  expect(api.post).toHaveBeenLastCalledWith("/staff-pay/heads", { name: "Mobile recharge" });
  await setVal(input("Mobile recharge — Pushpendra"), "300");
  expect(rowText("Harsh")).toContain("12,500");                    // 10,000 − 500 + 1,000 + petrol 2,000
  expect(rowText("Pushpendra")).toContain("12,992");
  await click(btn(/^Salary bana do$/));
  expect(window.confirmAsync).toHaveBeenCalledWith(expect.stringContaining("2 staff, kul ₹25,492"));
  const [url, body] = api.post.mock.calls[api.post.mock.calls.length - 1];
  expect(url).toBe("/payroll/run/finalize");
  expect(body.month).toBe(10); expect(body.year).toBe(2026);
  expect(body.extras).toEqual([
    { staff_id: 5, cut: 500, cut_note: "1 din", heads: [{ head_id: 1, amount: 2000 }, { head_id: 3, amount: 1000 }, { head_id: 44, amount: 0 }] },
    { staff_id: 6, cut: 0, cut_note: undefined, heads: [{ head_id: 1, amount: 0 }, { head_id: 3, amount: 0 }, { head_id: 44, amount: 300 }] },
  ]);
  expect(done).toHaveBeenCalled();
});

test("review baaki ho ya admin na ho → button band, wajah dikhti hai", async () => {
  await mount({ ...OPEN, pending_reviews: 3 });
  expect(box.textContent).toContain("3 bahar-fence punch ka review baaki hai");
  expect(btn(/^Salary bana do$/).disabled).toBe(true);
  act(() => root.unmount()); box.remove();
  await mount({ ...OPEN, can_make: false });
  expect(box.textContent).toContain("Salary sirf admin bana sakta hai");
  expect(btn(/^Salary bana do$/).disabled).toBe(true);
});

test("ban chuki: sirf dikhti hai — katauti, head, diya, baaki; koi input / button nahi", async () => {
  await mount(LOCKED);
  expect(box.textContent).toContain("Ye salary ban chuki hai");
  expect(box.querySelectorAll("tbody input").length).toBe(0);
  expect(btn(/^Salary bana do$/)).toBeUndefined();
  const r = rowText("Harsh");
  expect(r).toContain("770"); expect(r).toContain("1,000"); expect(r).toContain("12,230");   // 10,230 + petrol 2,000
  expect(r).toContain("5,000"); expect(r).toContain("7,230");                                   // diya, baaki
});

test("server mana kare (jaise review baaki) to wajah dikhti hai", async () => {
  await mount(OPEN);
  api.post.mockResolvedValue({ success: false, code: "PENDING_REVIEWS", message: "2 punch ka review baaki hai" });
  await click(btn(/^Salary bana do$/));
  expect(box.textContent).toContain("2 punch ka review baaki hai");
  expect(done).not.toHaveBeenCalled();
});
