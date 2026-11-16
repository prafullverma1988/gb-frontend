// CRM lead → project (16 Nov 2026, Prafull: "test" lead par "Server me problem hai" + khaali drawer).
// Wajah: Move Stage ka "Converted to Project" (solar ka stage "project") construction lead par PATCH
// hota tha → DB 500; phir band drawer {stage} ke saath dobara khul jaata (naam / city khaali).
// Ab: wo button = Project banao form (ya project kholo), koi PATCH nahi; fail PATCH band drawer nahi
// kholta; project bante hi onOpenProject.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../config/api";
import { loadFullPack, setLang } from "../i18n";
import CRMModule from "./CRMModule";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

const LEAD = { id: 139, name: "ZZ Test Lead", phone: "9000000139", email: null, city: "Bhilai", proj_type: "Residential house", budget: "0.00", source: "Direct Call",
  assigned_to: 7, stage: "converted", priority: "Medium", contact_date: null, notes: null, tags: [], converted_value: null, converted_date: null, created_at: "2026-11-16T11:29:16.000Z",
  city_id: 84, construction_type_id: 75, converted_project_id: null, budget_label: null, assigned_to_name: "prafull verma", city_name: "Bhilai",
  construction_type_name: "Residential house", attachments: [], followupHistory: [] };

let root, box, onOpenProject;
const flush = async () => { for (let i = 0; i < 6; i++) await act(async () => {}); };
const click = async (el) => { await act(async () => { el.click(); }); await flush(); };
const drawerOpen = () => document.body.textContent.includes("Follow Ups (");
const btnText = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent));
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(async () => {
  localStorage.setItem("gb_user", JSON.stringify({ id: 7, role: "admin", company_id: 1, name: "prafull verma" }));
  window.confirmAsync = jest.fn(() => Promise.resolve(true));
  onOpenProject = jest.fn();
  api.get.mockImplementation(async (url) => {
    if (url === "/crm/leads") return { success: true, data: [{ ...LEAD }] };
    if (url === "/crm/leads/139") return { success: true, data: { ...LEAD } };
    if (url === "/projects") return { success: true, data: [{ id: 716, name: "Naveen & Prakash" }] };
    return { success: true, data: [] };
  });
  api.post.mockImplementation(async (url) => (url === "/crm/leads/139/convert-to-project"
    ? { success: true, data: { project: { id: 727, name: "ZZ Test Lead — Project" } }, message: "ok" } : { success: true, data: {} }));
  api.patch.mockImplementation(async () => ({ success: false, message: "Server me problem hai — thodi der baad try karo" }));
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
  await act(async () => { root.render(<CRMModule onOpenProject={onOpenProject} />); });
  await flush();
  const card = [...document.querySelectorAll("div")].reverse().find((d) => /^ZZ Test Lead/.test(d.textContent.trim()) && d.textContent.length < 400);
  let el = card;
  for (let i = 0; i < 6 && el && !drawerOpen(); i++) { const node = el; await act(async () => { node.click(); }); el = node.parentElement; }
  await flush();
});
afterEach(() => { act(() => root.unmount()); box.remove(); });

test("Converted lead bina project: patti + 'Converted to Project' = Project banao form, koi PATCH nahi", async () => {
  expect(drawerOpen()).toBe(true);
  expect(document.querySelector('[data-testid="lead-no-project"]')).not.toBeNull();
  await click(btnText(/Move Stage/));
  await click(document.querySelector('[data-stage="project"]'));
  expect(api.patch).not.toHaveBeenCalled();
  expect(document.querySelector('[data-testid="cv-go"]')).not.toBeNull();
  expect(document.querySelector('[data-cv-mode="existing"]')).not.toBeNull();
  expect(document.body.textContent).not.toMatch(/crm\.[a-z_]+/);
});

test("PATCH fail: band drawer khaali hokar dobara nahi khulta", async () => {
  await click(btnText(/Move Stage/));
  await click(document.querySelector('[data-stage="lost"]'));
  expect(api.patch).toHaveBeenCalledWith("/crm/leads/139", { stage: "lost" });
  expect(drawerOpen()).toBe(false);
});

test("Project banao → convert (client / site address ke saath) → seedha project khule", async () => {
  await click(btnText(/Project banao/));
  const site = document.querySelector('[data-cv="site_address"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => { setter.call(site, "Plot 7, Smriti Nagar"); site.dispatchEvent(new Event("input", { bubbles: true })); });
  await click(document.querySelector('[data-testid="cv-go"]'));
  const call = api.post.mock.calls.find((c) => c[0] === "/crm/leads/139/convert-to-project");
  expect(call[1]).toMatchObject({ project_name: "ZZ Test Lead — Project", client_name: "ZZ Test Lead", client_phone: "9000000139", site_address: "Plot 7, Smriti Nagar" });
  expect(onOpenProject).toHaveBeenCalledWith(727);
});
