// New Material Transfer — Date ka khaana (28 Nov 2026, site: "transfer me date ka option nahi aa raha").
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import MaterialTransferTab from "./MaterialTransferTab";
import api from "../config/api";
import { loadFullPack } from "../i18n";
import { todayISO, daysAgoISO } from "../utils/today";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 1, role: "admin", name: "Admin" }) };
});
jest.mock("../utils/perms", () => ({ can: () => true, canAny: () => true, canEntry: () => true, currentUser: () => ({ id: 1, role: "admin" }) }));
// Picker ki jagah seedha <select> — yahan form ka data dekhna hai, picker nahi.
jest.mock("./PickSelect", () => {
  const React = require("react");
  return { __esModule: true, default: ({ children, ...p }) => React.createElement("select", p, children) };
});

// eslint-disable-next-line no-undef
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host, root;
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const click = async (el) => { if (!el) throw new Error("click: element nahi mila"); await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const btn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const setVal = async (el, v) => {
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
};
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

// Modal kholo, To project + ek line bharo
const openAndFill = async () => {
  await click(btn(/New Transfer/));
  const [toSel, matSel] = host.querySelectorAll("select");
  await setVal(toSel, "12");
  await setVal(matSel, "P Sand");
  await setVal(host.querySelector('input[type="number"]'), "200");
  return host.querySelector('input[type="date"]');
};

beforeAll(() => loadFullPack());
beforeEach(async () => {
  api.get.mockImplementation((url) => Promise.resolve(
    url.startsWith("/projects") ? { success: true, data: [{ id: 11, name: "Tikendra banchhor" }, { id: 12, name: "kishor mama" }] }
      : url.includes("/inventory") ? { success: true, data: [{ material_name: "P Sand", balance: 3300, unit: "sqft" }] }
      : { success: true, data: [] }));
  api.post.mockResolvedValue({ success: true, data: { id: 9 } });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(<MaterialTransferTab projectId={11} projectName="Tikendra banchhor" />); });
  await flush();
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
  jest.clearAllMocks();
});

test("Date ka khaana dikhta hai — aaj pehle se bhara, aage ki tareekh band (max = aaj)", async () => {
  const dateIn = await openAndFill();
  expect(dateIn).toBeTruthy();
  expect(dateIn.value).toBe(todayISO());
  expect(dateIn.getAttribute("max")).toBe(todayISO());
  expect(host.textContent).toContain("Date");
});

test("pichhli tareekh chuni → server ko wahi date jaati hai", async () => {
  const dateIn = await openAndFill();
  await setVal(dateIn, daysAgoISO(3));
  await click(btn(/^Create Transfer$/));
  expect(api.post).toHaveBeenCalledTimes(1);
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/warehouse/transfers");
  expect(body.date).toBe(daysAgoISO(3));
  expect(body.to_project_id).toBe(12);
  expect(body.items[0]).toMatchObject({ material_name: "P Sand", qty: 200, unit: "sqft" });
});

test("bina chhede Create → aaj ki date jaati hai", async () => {
  await openAndFill();
  await click(btn(/^Create Transfer$/));
  expect(api.post.mock.calls[0][1].date).toBe(todayISO());
});

test("aage ki tareekh (kal) → laal message, server ko kuch nahi", async () => {
  const dateIn = await openAndFill();
  await setVal(dateIn, tomorrow());
  await click(btn(/^Create Transfer$/));
  expect(api.post).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Date aaj ki ya pehle ki honi chahiye — aage ki date nahi chalegi.");
});
