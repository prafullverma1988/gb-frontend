// Flag Center — do tab (2 Nov 2026, Prafull: "ek AI flag aur ek actual logic flag — dono alag")
// aur naya source "Zimmedari ka material" (doosre task me bina manzoori laga).
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import FlagCenterModule from "./FlagCenterModule";
import api from "../config/api";
import { loadFullPack } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 1, role: "admin", name: "Admin" }) };
});
jest.mock("../utils/perms", () => ({ can: () => true, canAny: () => true, canEntry: () => true, currentUser: () => ({ id: 1, role: "admin" }) }));

// eslint-disable-next-line no-undef
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CUSTODY = {
  uid: "custody_task:41", source: "custody_task", ref_id: 41, severity: "amber", kinds: ["other_task"], groups: ["logic"], state: "open",
  verdict: null, project_id: 11, project_name: "Site A", who: "Juned", at: "2026-11-02T05:00:00.000Z", age_h: 2, seen: [], decided: null,
  data: { material: "MS Pipe", qty: 2, unit: "Mtr", issue_id: 195, issue_no: "ISS-138", line_task: "Sector 1 UGR", used_task: "Sector 4 UGR", zimmedar: "Aditya", mark_used: false },
};
const PAYLOAD = {
  items: [CUSTODY],
  counts: { all: 1, new: 1, seen: 0, done: 0, by_source: { custody_task: { new: 1, seen: 0, done: 0 } },
    by_group: { logic: { new: 1, seen: 0, done: 0 }, ai: { new: 3, seen: 0, done: 0 } } },
  sources: ["trip", "kaanta", "gps", "fuel", "attendance", "progress_drop", "ai_check", "custody_task"],
  projects: [{ id: 11, name: "Site A", n: 1 }], total_shown: 1, failed: [],
};

let host, root, nav;
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const click = async (el) => { if (!el) throw new Error("click: element nahi mila"); await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const btn = (re) => [...host.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const lastUrl = () => api.get.mock.calls[api.get.mock.calls.length - 1][0];

beforeAll(() => loadFullPack());
beforeEach(async () => {
  api.get.mockResolvedValue({ success: true, data: PAYLOAD });
  nav = jest.fn();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root.render(<FlagCenterModule onNavigate={nav} />); });
  await flush();
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
  jest.clearAllMocks();
});

test("Logic flag tab se shuru (group=logic); AI tab par group=ai, GPS / Zimmedari tile nahi, AI jaanch hai", async () => {
  expect(lastUrl()).toContain("group=logic");
  expect(host.textContent).toContain("Logic flag");
  expect(host.textContent).toContain("3 naye");                 // AI tab ki ginti
  expect(btn(/^GPS/)).toBeTruthy();
  expect(btn(/^Zimmedari ka material/)).toBeTruthy();
  await click(btn(/^AI flag/));
  expect(lastUrl()).toContain("group=ai");
  expect(btn(/^GPS/)).toBeFalsy();
  expect(btn(/^Zimmedari ka material/)).toBeFalsy();
  expect(btn(/^AI jaanch/)).toBeTruthy();
});

test("Logic tab me source chuna → AI tab par wo chhanni hat jaati", async () => {
  await click(btn(/^Zimmedari ka material/));
  expect(lastUrl()).toContain("source=custody_task");
  await click(btn(/^AI flag/));
  expect(lastUrl()).toContain("group=ai");
  expect(lastUrl()).not.toContain("source=");
});

test("Zimmedari ka material: byora + zimmedar; Kholo → project ka Material tab", async () => {
  const text = host.textContent;
  expect(text).toContain("Doosre task me laga");
  expect(text).toContain("MS Pipe 2 Mtr");
  expect(text).toContain("\"Sector 1 UGR\" ka → \"Sector 4 UGR\" me laga");
  expect(text).toContain("ISS-138");
  expect(text).toContain("Zimmedar: Aditya");
  await click(btn(/^Kholo$/));
  expect(nav).toHaveBeenCalledWith("projects", "/projects/11/material");
});
