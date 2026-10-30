// Settings → Notifications (30 Oct 2026, Prafull: "permission matrix wise
// notification control — role ke hisaab se, kisi role me chalu karna ho to
// manually chalu kar sake"). Role-wise tab: module ka tick poora module badalta
// hai, apna kaam band karne par chetavni, Save par sirf badle box jaate hain.
// Meri settings: admin ne role ke liye band kiya ho to switch nahi chalta.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import SettingsModule from "./SettingsModule";
import api from "../config/api";
import { loadFullPack } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 1, role: "admin", name: "Admin" }) };
});
jest.mock("../components/PickSelect", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/MapPicker", () => ({ __esModule: true, default: () => null }));
jest.mock("./shared/RecycleBin", () => ({ __esModule: true, default: () => null }));
jest.mock("../utils/perms", () => ({ can: () => true, canAny: () => true, canEntry: () => true, currentUser: () => ({ id: 1, role: "admin" }) }));

// eslint-disable-next-line no-undef
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CATALOG = [
  { module: "wallets", label: "Wallet & Finance", route: "/finance", perm: ["Finance"], events: [
    { type: "wallet_approval_needed", label: "Expense needs approval", desc: "A staff expense is waiting", byRole: true },
    { type: "wallet_rejected", label: "Expense rejected", desc: "Your wallet expense was rejected" },
  ] },
  { module: "warehouse", label: "Store & Material Requests", route: "/warehouse", perm: ["Warehouse"], events: [
    { type: "mr_created", label: "Material request raised", desc: "A new MR", byRole: true },
  ] },
];
const ROLE_STATE = {
  success: true, catalog: CATALOG,
  roles: [{ id: 12, name: "Supervisor" }, { id: 13, name: "Site Engineer" }],
  defaultOff: { 12: [], 13: ["wallet_approval_needed"] },
  overrides: { 12: {}, 13: { mr_created: false } },
};

let root, box;
const text = () => box.textContent;
const byText = (sel, s) => [...box.querySelectorAll(sel)].find((e) => e.textContent.trim() === s);
const byTitle = (s) => [...box.querySelectorAll("button[title]")].find((e) => e.getAttribute("title").startsWith(s));
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await act(async () => {}); };

beforeAll(() => loadFullPack());
beforeEach(async () => {
  api.get.mockImplementation((url) => Promise.resolve(
    url === "/notifications/role-settings" ? ROLE_STATE
      : url === "/notifications/preferences" ? { success: true, catalog: CATALOG, locked: ["mr_created"],
        preferences: { wallet_approval_needed: true, wallet_rejected: true, mr_created: true } }
      : { success: true, data: [] }));
  api.put.mockImplementation(() => Promise.resolve({ ...ROLE_STATE, changed: 2 }));
  box = document.createElement("div");
  document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<SettingsModule initialSection="notifications" />); });
  await act(async () => {});
});
afterEach(() => { act(() => root.unmount()); box.remove(); });

test("Meri settings: role ke liye band type ka switch nahi chalta", async () => {
  await click(byText("div", "Store & Material Requests"));
  expect(text()).toContain("Admin ne aapke role ke liye band kiya hai");
  // module me sirf wahi ek type hai aur wo locked hai → module ka switch bhi band
  const disabled = [...box.querySelectorAll("button")].filter((b) => b.style.cursor === "not-allowed");
  expect(disabled.length).toBe(2);
});

test("Meri settings: neeche ek band karne par module ka switch ON rehta hai; module band = sab band", async () => {
  const head = byText("div", "Wallet & Finance").parentElement.parentElement;
  const modSwitch = () => head.querySelector("button");
  const row = (label) => byText("div", label).parentElement.parentElement.querySelector("button");
  const isOnBtn = (b) => /37, 99, 235|#2563eb/i.test(b.style.background);
  expect(isOnBtn(modSwitch())).toBe(true);
  await click(head);
  await click(row("Expense rejected"));
  expect(isOnBtn(row("Expense rejected"))).toBe(false);
  expect(text()).toContain("1 of 2 on");
  expect(isOnBtn(modSwitch())).toBe(true);
  await click(modSwitch());
  expect(isOnBtn(row("Expense needs approval"))).toBe(false);
  expect(text()).toContain("0 of 2 on");
  expect(isOnBtn(modSwitch())).toBe(false);
  await click(byText("button", "Save"));
  expect(api.put.mock.calls[0][1].preferences).toEqual(expect.objectContaining({ wallet_approval_needed: false, wallet_rejected: false }));
});

test("Meri settings: Test notification — pahuncha / koi phone nahi / server ki rok", async () => {
  api.post.mockResolvedValueOnce({ success: true, push_on: true, devices: 2, sent: 2 });
  await click(byText("button", "Test notification bhejo"));
  expect(api.post).toHaveBeenCalledWith("/notifications/test", {});
  expect(text()).toContain("Bhej diya — 2 phone / browser par");
  api.post.mockResolvedValueOnce({ success: true, push_on: true, devices: 0, sent: 0 });
  await click(byText("button", "Test notification bhejo"));
  expect(text()).toContain("koi phone juda nahi");
  api.post.mockResolvedValueOnce({ success: false, message: "Thoda ruko" });
  await click(byText("button", "Test notification bhejo"));
  expect(text()).toContain("Thoda ruko");
});

test("Role-wise: Supervisor ka poora Wallet & Finance band → Save par dono type jaate hain", async () => {
  await click(byText("button", "Role-wise"));
  expect(text()).toContain("Role-wise notification");
  // Site Engineer ka mr_created admin ne band kiya hai → 1 box default se alag
  expect(text()).toContain("1 box default se alag");
  await click(byTitle("Supervisor · Wallet & Finance: 2/2"));
  expect(text()).toContain("2 badlav abhi save nahi hue");
  // module kholo — apna kaam band hua to chetavni
  await click(byText("span", "Wallet & Finance"));
  expect(text()).toContain("Supervisor ko apne hi kaam ka jawab nahi milega");
  await click(byText("button", "Save karo"));
  expect(api.put).toHaveBeenCalledTimes(1);
  const [url, body] = api.put.mock.calls[0];
  expect(url).toBe("/notifications/role-settings");
  expect(body.changes).toEqual(expect.arrayContaining([
    { role_id: 12, type: "wallet_approval_needed", enabled: false },
    { role_id: 12, type: "wallet_rejected", enabled: false },
  ]));
  expect(body.changes).toHaveLength(2);
  expect(text()).toContain("Save ho gaya — 2 box badle");
});

test("Role-wise: Site Engineer ke liye default-OFF type haath se chalu, dobara dabaya to draft khaali", async () => {
  await click(byText("button", "Role-wise"));
  await click(byText("span", "Wallet & Finance"));
  const cell = () => byTitle("Site Engineer — Default: OFF");
  expect(cell().textContent).toBe("");
  await click(cell());
  expect(cell().textContent).toContain("✓");
  expect(text()).toContain("1 badlav abhi save nahi hue");
  await click(cell());
  expect(text()).not.toContain("badlav abhi save nahi hue");
  // "Sab default par lautao" → Site Engineer ka mr_created wapas ON (draft me)
  await click(byText("button", "Sab default par lautao"));
  await click(byText("button", "Save karo"));
  expect(api.put.mock.calls[0][1].changes).toEqual([{ role_id: 13, type: "mr_created", enabled: true }]);
});
