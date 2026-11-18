// Company ke kharche — ghar (18 Nov 2026): tile, "salary nahi bani" ki laal patti,
// staff ka paisa (salary / petrol / aur head / diya / baaki + "Do"), naam dabane par
// mahine-wise bani / mili, har mahine ke kharche ("Bana do"), head-wise baaki kharche,
// mahina aur city badalne par dobara load.
import { act } from "react";
import { createRoot } from "react-dom/client";
import CompanyKharchaModal from "./CompanyKharchaModal";
import api from "../../config/api";
import { loadFullPack } from "../../i18n";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn();
  return { __esModule: true, default: api };
});
jest.mock("../../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style }) => <select value={value} onChange={onChange} style={style}>{children}</select> }));
jest.mock("../../utils/perms", () => ({ can: () => true }));
jest.mock("./CompanyExpenseModal", () => ({ __esModule: true, default: ({ preset }) => <div data-testid="cexp">{preset ? "preset:" + preset.name : "new"}</div> }));
jest.mock("./ExpenseChecklistModal", () => ({ __esModule: true, default: () => <div data-testid="ecl" /> }));
jest.mock("./SalarySheetModal", () => ({ __esModule: true, default: ({ month, year }) => <div data-testid="sheet">{month + "/" + year}</div> }));
jest.mock("./StaffPayModal", () => ({ __esModule: true, default: ({ staff, initialPurpose }) => <div data-testid="pay">{staff.id + ":" + staff.name + ":" + initialPurpose}</div> }));

window.IS_REACT_ACT_ENVIRONMENT = true;
// Aaj ke hisaab se — ghar "is mahine" se khulta hai, patti pichhle mahine ki hoti hai.
const pad = (n) => String(n).padStart(2, "0");
const D = new Date();
const CUR = D.getFullYear() + "-" + pad(D.getMonth() + 1);
const P = new Date(D.getFullYear(), D.getMonth() - 1, 1);
const PREV = P.getFullYear() + "-" + pad(P.getMonth() + 1);
const label = (p) => { const [y, m] = p.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); };
const my = (p) => { const [y, m] = p.split("-").map(Number); return m + "/" + y; };
const HOME = {
  period: "2026-10", current_period: "2026-11", city: null, cities: [{ id: 58, name: "Raipur" }, { id: 59, name: "Bhilai" }],
  tiles: { month_total: 132930, staff_total: 103500, other_total: 29430, open_total: 45700, staff_open: 41500, bills_open: 4200 },
  salary: { made: true, run_id: 9, estimate: null, pending: { period: PREV, made: false, staff_count: 6, estimate: 103500 } },
  staff: [
    { party_id: 71, name: "Harsh", city_id: 59, salary: 10000, extras: 0, petrol: 2000, leave_cut: 0, due: 12000, paid: 12000, remaining: 0, salary_remaining: 0, petrol_remaining: 0, hold: false },
    { party_id: 77, name: "Niranjan", city_id: 59, salary: 15000, extras: 1000, petrol: 2000, leave_cut: 500, due: 18000, paid: 10000, remaining: 8000, salary_remaining: 6000, petrol_remaining: 2000, hold: false },
  ],
  staff_totals: { salary: 25000, extras: 1000, petrol: 4000, due: 30000, paid: 22000, remaining: 8000 },
  checklist: [], others: [{ head_id: 99, head: "Chai-paani", amount: 2350, n: 6 }, { head_id: null, head: "", amount: 900, n: 2 }],
  can_pay: true, can_make: true,
};
const LIST = { rows: [
  { id: 1, name: "Office kiraya", state: "done", amount: 25000, amount_type: "fixed", t_amount: 25000, location_name: "Bhilai office", due_date: "2026-10-05" },
  { id: 2, name: "Bijli", state: "pending", amount: 4200, amount_type: "variable", location_name: "Bhilai office", due_date: "2026-10-20" },
] };
const SUMMARY = { months: [{ year: 2026, month: 10, due: 16000, settled: 10000, balance: 6000, leave_cut: 500,
  lines: [{ name: "Salary", amount: 15000 }, { name: "Bonus", amount: 1000 }],
  payments: [{ amount: 6000, date: "2026-11-05", method: "upi" }, { amount: 4000, date: "2026-11-09", method: "cash" }] }],
  petrol: { months: [{ year: 2026, month: 10, due: 2000, settled: 0, balance: 2000, payments: [] }] } };

let root, box, changed, home;
beforeAll(() => loadFullPack());
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });
const mount = async (h = HOME) => {
  home = h;
  api.get.mockReset();
  api.get.mockImplementation((url) => Promise.resolve(
    url.startsWith("/staff-pay/home") ? { success: true, data: home }
      : url.startsWith("/company-expenses/checklist") ? { success: true, data: LIST }
        : url.startsWith("/wallets/salary/summary") ? { success: true, data: SUMMARY }
          : { success: true, data: [] }));
  changed = jest.fn();
  box = document.createElement("div"); document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<CompanyKharchaModal accounts={[]} onClose={() => {}} onChanged={changed} />); });
  await flush();
};
afterEach(() => { act(() => root.unmount()); box.remove(); });
const btn = (re) => [...box.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const click = async (el) => { if (!el) throw new Error("button nahi mila"); await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const row = (name) => [...box.querySelectorAll("tbody tr")].find((r) => r.textContent.includes(name));

test("ghar: is mahine se shuru, tile, staff ka paisa, har mahine ke kharche, head-wise", async () => {
  await mount();
  expect(api.get).toHaveBeenCalledWith("/staff-pay/home?period=" + CUR);
  expect(box.textContent).toContain("Company ke kharche");
  for (const s of ["₹1,32,930", "₹1,03,500", "₹29,430", "₹45,700", "Staff ₹41,500 · bill ₹4,200"]) expect(box.textContent).toContain(s);
  const n = row("Niranjan").textContent;
  for (const s of ["₹15,000", "₹2,000", "₹1,000", "₹10,000", "₹8,000", "Chhutti katauti ₹500"]) expect(n).toContain(s);
  expect(row("Harsh").textContent).toContain("Poora diya");
  expect([...row("Harsh").querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Harsh"]);   // poora diya → "Do" nahi
  expect(row("Kul").textContent).toContain("₹8,000");
  expect(box.textContent).toContain("Office kiraya");
  expect(box.textContent).toContain("~₹4,200");
  expect(box.textContent).toContain("Chai-paani");
  expect(box.textContent).toContain("6 entry");
  expect(box.textContent).toContain("(head nahi)");
});

test("laal patti: pichhle mahine ki salary nahi bani → Salary banao us mahine ki sheet kholta hai", async () => {
  await mount();
  expect(box.textContent).toContain(label(PREV) + " ki salary abhi nahi bani");
  expect(box.textContent).toContain("6 staff, andaaz ₹1,03,500");
  await click(btn(/^Salary banao$/));
  expect(box.querySelector('[data-testid="sheet"]').textContent).toBe(my(PREV));
});

test("Do → paisa dene ki sheet (jo baaki hai wahi chuna); naam → mahine-wise bani / mili", async () => {
  await mount();
  await click([...row("Niranjan").querySelectorAll("button")].find((b) => b.textContent === "Do"));
  expect(box.querySelector('[data-testid="pay"]').textContent).toBe("77:Niranjan:salary");
  await click([...row("Niranjan").querySelectorAll("button")].find((b) => b.textContent === "Niranjan"));
  expect(api.get).toHaveBeenCalledWith("/wallets/salary/summary?staff_party_id=77");
  const t = box.textContent;
  for (const s of ["Bani ₹16,000", "Salary ₹15,000 + Bonus ₹1,000", "₹6,000 baaki", "05 Nov · ₹6,000 · upi", "09 Nov · ₹4,000 · cash", "Bani ₹2,000"]) expect(t).toContain(s);
});

test("mahina peeche / city badlo → usi ke saath dobara load; aage ka mahina band", async () => {
  await mount();
  expect(btn(/^›$/).disabled).toBe(true);
  await click(btn(/^‹$/));
  expect(api.get).toHaveBeenCalledWith("/staff-pay/home?period=" + PREV);
  expect(api.get).toHaveBeenCalledWith("/company-expenses/checklist?period=" + PREV);
  const sel = box.querySelector("select");
  expect([...sel.options].map((o) => o.textContent)).toEqual(["Sab city", "Raipur", "Bhilai", "Central (poori company)"]);
  const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
  await act(async () => { set.call(sel, "central"); sel.dispatchEvent(new Event("change", { bubbles: true })); });
  await flush();
  expect(api.get).toHaveBeenCalledWith("/staff-pay/home?period=" + PREV + "&city=central");
});

test("Bana do → Company Expense form us line se bhara; Expense add karo → naya", async () => {
  await mount();
  await click(btn(/^Bana do$/));
  expect(box.querySelector('[data-testid="cexp"]').textContent).toBe("preset:Bijli");
  act(() => root.unmount()); box.remove();
  await mount();
  await click(btn(/Expense add karo/));
  expect(box.querySelector('[data-testid="cexp"]').textContent).toBe("new");
});

test("salary bani hi nahi (is mahine): andaaz + Salary banao; staff ki table nahi", async () => {
  await mount({ ...HOME, staff: [], staff_totals: {}, salary: { made: false, estimate: { staff_count: 6, estimate: 98000 }, pending: null } });
  expect(box.textContent).toContain("Is mahine ki salary abhi nahi bani — 6 staff, andaaz ₹98,000.");
  expect(box.querySelectorAll("table").length).toBe(0);
  await click(btn(/^Salary banao$/));
  expect(box.querySelector('[data-testid="sheet"]').textContent).toBe(my(CUR));
});
