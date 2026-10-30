// PC browser push (30 Oct 2026). BrowserPush: ijazat sirf button par, token
// /sw-push.js ke ACTIVE hone par, server ko platform 'web'; Settings me haalat.
// utils/push.js: notification se khula tab (URL) sahi item + URL saaf; khule tab
// ko SW ka message; logout par server se hatao + subscription khatam.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import BrowserPush from "./BrowserPush";
import api from "../config/api";
import { listenPush, stopPush } from "../utils/push";
import { loadFullPack } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 1, role: "admin" }) };
});
jest.mock("firebase/app", () => ({ initializeApp: jest.fn(), getApps: jest.fn() }));
jest.mock("firebase/messaging", () => ({ isSupported: jest.fn(), getMessaging: jest.fn(), getToken: jest.fn(), deleteToken: jest.fn() }));
const fm = require("firebase/messaging");
const fa = require("firebase/app");

// eslint-disable-next-line no-undef
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const REG = { pushManager: { getSubscription: jest.fn() } };
const INSTALLING = { installing: {}, pushManager: {} };
const SUB = { unsubscribe: jest.fn() };
let swListeners, root, box;
const text = () => box.textContent;
const byText = (s) => [...box.querySelectorAll("button")].find((e) => e.textContent.trim() === s);
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await act(async () => {}); };

function setBrowser(permission, ask = "granted") {
  window.Notification = { permission, requestPermission: jest.fn(() => Promise.resolve(ask)) };
  window.PushManager = function PushManager() {};
  swListeners = {};
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      register: jest.fn(() => Promise.resolve(INSTALLING)),
      ready: Promise.resolve(REG),
      getRegistration: jest.fn(() => Promise.resolve(REG)),
      addEventListener: jest.fn((ev, fn) => { swListeners[ev] = fn; }),
      removeEventListener: jest.fn(),
    },
  });
}
async function mount(variant) {
  box = document.createElement("div");
  document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<BrowserPush variant={variant}/>); });
}

beforeAll(() => loadFullPack());
beforeEach(() => {
  localStorage.clear();
  // CRA ka jest resetMocks har test se pehle jawab mita deta hai — yahin lagao.
  fa.getApps.mockReturnValue([]);
  fa.initializeApp.mockReturnValue({ name: "app" });
  fm.isSupported.mockResolvedValue(true);
  fm.getMessaging.mockReturnValue({ name: "messaging" });
  fm.getToken.mockResolvedValue("pc-tok-1");
  REG.pushManager.getSubscription.mockResolvedValue(SUB);
  SUB.unsubscribe.mockResolvedValue(true);
  api.post.mockResolvedValue({ success: true });
});
afterEach(() => { if (root) act(() => root.unmount()); if (box) box.remove(); root = null; box = null; });

test("ghanti: abhi poochha nahi → line; Chalu karo → ijazat, ACTIVE worker par token, server ko web", async () => {
  setBrowser("default", "granted");
  await mount("bell");
  expect(text()).toContain("Is computer par bhi notification chahiye");
  await click(byText("Chalu karo"));
  expect(window.Notification.requestPermission).toHaveBeenCalledTimes(1);
  expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw-push.js");
  expect(fm.getToken).toHaveBeenCalledWith({ name: "messaging" }, expect.objectContaining({
    vapidKey: expect.stringMatching(/^BHDvb01n/), serviceWorkerRegistration: REG }));
  expect(api.post).toHaveBeenCalledWith("/notifications/push-token", expect.objectContaining({ token: "pc-tok-1", platform: "web" }));
  expect(text()).toContain("Chalu ho gaya");
  expect(localStorage.getItem("gb_push_token")).toBe("pc-tok-1");
});

test("ghanti: Baad me → 7 din chup; pehle se granted / denied → line nahi", async () => {
  setBrowser("default");
  await mount("bell");
  await click(byText("Baad me"));
  expect(text()).toBe("");
  expect(Number(localStorage.getItem("gb_push_hint_snooze_until"))).toBeGreaterThan(Date.now() + 6 * 86400000);
  act(() => root.unmount()); box.remove();
  localStorage.clear();
  setBrowser("granted");
  await mount("bell");
  expect(text()).toBe("");
  act(() => root.unmount()); box.remove();
  setBrowser("denied");
  await mount("bell");
  expect(text()).toBe("");
});

test("settings: haalat — chalu hai / browser ne band / chalu karo → mana", async () => {
  setBrowser("granted");
  await mount("settings");
  expect(text()).toContain("Chalu hai");
  act(() => root.unmount()); box.remove();
  setBrowser("denied");
  await mount("settings");
  expect(text()).toContain("Browser ne band kar rakha hai");
  act(() => root.unmount()); box.remove();
  setBrowser("default", "denied");
  await mount("settings");
  await click(byText("Chalu karo"));
  expect(text()).toContain("Browser ne band kar rakha hai");
  expect(api.post).not.toHaveBeenCalled();
});

test("server ne token nahi rakha → chalu nahi ho paaya", async () => {
  setBrowser("default", "granted");
  api.post.mockResolvedValue({ success: false });
  await mount("bell");
  await click(byText("Chalu karo"));
  expect(text()).toContain("Chalu nahi ho paaya");
});

test("notification se khula tab: URL se item + URL saaf; khule tab ko SW message", async () => {
  setBrowser("granted");
  window.history.replaceState(null, "", "/?pushn=41&pusht=wallet_approved&pushl=%2Ffinance%3Fid%3D7&x=1");
  const onOpen = jest.fn();
  const onFg = jest.fn();
  const off = listenPush(onOpen, onFg);
  await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  expect(onOpen).toHaveBeenCalledWith({ id: 41, type: "wallet_approved", link: "/finance?id=7" });
  expect(window.location.search).toBe("?x=1");
  swListeners.message({ data: { type: "san-push-open", data: { notification_id: "9", type: "mr_issued", link: "/warehouse?id=3" } } });
  expect(onOpen).toHaveBeenLastCalledWith({ id: 9, type: "mr_issued", link: "/warehouse?id=3" });
  swListeners.message({ data: { type: "san-push", data: {} } });
  expect(onFg).toHaveBeenCalledTimes(1);
  off();
});

test("logout: server se token hatao + browser subscription khatam", async () => {
  setBrowser("granted");
  localStorage.setItem("gb_push_token", "pc-tok-1");
  await stopPush();
  expect(api.post).toHaveBeenCalledWith("/notifications/push-token/remove", { token: "pc-tok-1" });
  expect(SUB.unsubscribe).toHaveBeenCalled();
  expect(localStorage.getItem("gb_push_token")).toBeNull();
});
