// Staff ko paisa do (18 Nov 2026): "Kis liye" se tay hota hai paisa kahan lage —
// Salary / Petrol ka baaki (POST /staff-pay/pay, account se ya mere wallet se) ya
// Wallet me kharche ke liye (POST /wallets/send-to-staff). Petrol ka baaki bana hi
// na ho to wallet me petrol ke naam se. Baaki se zyada / bina account nahi jaata.
// (server ka asli hisaab: gb-backend rollback E2E sp_e2e.js, 76 check)
import { act } from "react";
import { createRoot } from "react-dom/client";
import StaffPayModal from "./StaffPayModal";
import api from "../../config/api";
import { loadFullPack } from "../../i18n";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn();
  return { __esModule: true, default: api };
});
jest.mock("../../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style }) => <select value={value} onChange={onChange} style={style}>{children}</select> }));

window.IS_REACT_ACT_ENVIRONMENT = true;
const ACCTS = [{ id: 12, name: "HDFC Current", no: "", balance: 500000 }, { id: 13, name: "Cash on Hand", no: "", balance: 20000 }];
const DUES = { party_id: 77, name: "Niranjan", payable: 8000,
  salary: { payable: 6000, on_hold: 0, months: [{ month: 10, year: 2026, remaining: 6000 }] },
  petrol: { payable: 2000, on_hold: 0, months: [{ month: 10, year: 2026, remaining: 2000 }] } };
const NO_DUES = { party_id: 77, name: "Niranjan", payable: 0, salary: { payable: 0, months: [] }, petrol: { payable: 0, months: [] } };

let root, box, done;
beforeAll(() => loadFullPack());
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });
const mount = async (dues, props = {}) => {
  api.get.mockImplementation(() => Promise.resolve({ success: true, data: dues }));
  api.post.mockReset(); api.post.mockResolvedValue({ success: true, message: "ok" });
  window.alert = jest.fn(); done = jest.fn();
  box = document.createElement("div"); document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<StaffPayModal staff={{ id: 77, name: "Niranjan" }} accounts={ACCTS} onClose={() => {}} onDone={done} {...props} />); });
  await flush();
};
afterEach(() => { act(() => root.unmount()); box.remove(); });
const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const click = async (el) => { if (!el) throw new Error("button nahi mila"); await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const setVal = async (el, v, proto = window.HTMLInputElement, ev = "input") => {
  const set = Object.getOwnPropertyDescriptor(proto.prototype, "value").set;
  await act(async () => { set.call(el, v); el.dispatchEvent(new Event(ev, { bubbles: true })); });
};
const amountBox = () => document.querySelector('input[type="number"]');
const fromSel = () => document.querySelectorAll("select")[0];
const pickFrom = (v) => setVal(fromSel(), v, window.HTMLSelectElement, "change");

test("Salary: baaki bhara aata hai, mahine ki line, account se — /staff-pay/pay", async () => {
  await mount(DUES);
  expect(api.get).toHaveBeenCalledWith("/staff-pay/dues/77");
  expect(document.body.textContent).toContain("Niranjan ko paisa do");
  expect(document.body.textContent).toContain("Kis liye");
  expect(amountBox().value).toBe("6000");
  expect(document.body.textContent).toMatch(/Salary · October 2026/);
  await click(btn(/^₹6,000 do$/));
  expect(api.post).not.toHaveBeenCalled();                       // account nahi select kiya
  expect(document.body.textContent).toContain("Account select karo");
  await pickFrom("12");
  expect(document.body.textContent).toContain("HDFC Current se ₹6,000 ghatega");
  await setVal(document.querySelector('input[type="date"]'), "2026-11-10");
  await click(btn(/^₹6,000 do$/));
  const [url, body, opts] = api.post.mock.calls[0];
  expect(url).toBe("/staff-pay/pay");
  expect(body).toMatchObject({ staff_party_id: 77, amount: 6000, purpose: "salary", source: "account", account_id: 12, date: "2026-11-10", payment_method: "bank_transfer" });
  expect(opts.headers["Idempotency-Key"]).toMatch(/^sp-/);
  expect(done).toHaveBeenCalled();
});

test("Baaki se zyada nahi jaata", async () => {
  await mount(DUES);
  await pickFrom("12");
  await setVal(amountBox(), "9000");
  await click(btn(/^₹9,000 do$/));
  expect(api.post).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("Baaki sirf ₹6,000 hai");
});

test("Petrol + mere wallet se: source wallet, account / tareeka nahi jaata", async () => {
  await mount(DUES);
  await click(btn(/^Petrol/));
  expect(amountBox().value).toBe("2000");
  await pickFrom("my_wallet");
  expect(document.body.textContent).toContain("Aapke wallet se ₹2,000 ghatega");
  expect(document.querySelectorAll("select").length).toBe(1);     // tareeka chhup gaya
  await click(btn(/^₹2,000 do$/));
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/staff-pay/pay");
  expect(body).toMatchObject({ purpose: "petrol", source: "wallet", amount: 2000 });
  expect(body.account_id).toBeUndefined();
  expect(body.payment_method).toBeUndefined();
});

test("Wallet (kharche ke liye): send-to-staff imprest; mera wallet option nahi", async () => {
  await mount(DUES);
  await click(btn(/^Wallet/));
  expect(amountBox().value).toBe("");
  expect([...fromSel().options].map((o) => o.value)).toEqual(["", "12", "13"]);
  expect(document.querySelector('input[type="date"]')).toBeNull();
  await setVal(amountBox(), "1500");
  await pickFrom("13");
  expect(document.body.textContent).toContain("Cash on Hand se ₹1,500 Niranjan ke wallet me kharche ke liye jayega");
  await click(btn(/^₹1,500 do$/));
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/wallets/send-to-staff");
  expect(body).toMatchObject({ staff_party_id: 77, amount: 1500, bucket: "imprest", account_id: 13 });
});

test("Baaki nahi: Salary rukti hai; Petrol wallet me petrol ke naam se jaata hai", async () => {
  await mount(NO_DUES);
  await click(btn(/^Salary/));
  expect(document.body.textContent).toContain("Is staff ki koi salary baaki nahi");
  await setVal(amountBox(), "500");
  await pickFrom("12");
  await click(btn(/^₹500 do$/));
  expect(api.post).not.toHaveBeenCalled();
  await click(btn(/^Petrol/));
  expect(document.body.textContent).toContain("Petrol ka baaki nahi bana");
  await setVal(amountBox(), "700");
  await click(btn(/^₹700 do$/));
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/wallets/send-to-staff");
  expect(body).toMatchObject({ bucket: "petrol", amount: 700, account_id: 12 });
});

test("Server mana kare to wajah dikhti hai, sheet khuli rehti hai", async () => {
  await mount(DUES);
  api.post.mockResolvedValue({ success: false, message: "HDFC Current me sirf ₹100 available hai" });
  await pickFrom("12");
  await click(btn(/^₹6,000 do$/));
  expect(document.body.textContent).toContain("HDFC Current me sirf ₹100 available hai");
  expect(done).not.toHaveBeenCalled();
});
