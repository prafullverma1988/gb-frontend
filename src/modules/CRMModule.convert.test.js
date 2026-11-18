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

const LEAD = { id: 139, name: "ZZ Test Lead", phone: "9000000139", email: null, city: "Bhilai", proj_type: "Residential house", budget: "4000000.00", source: "Direct Call",
  assigned_to: 7, stage: "converted", priority: "Medium", contact_date: null, notes: null, tags: [], converted_value: null, converted_date: null, created_at: "2026-11-16T11:29:16.000Z",
  city_id: 84, construction_type_id: 75, converted_project_id: null, budget_label: null, assigned_to_name: "prafull verma", city_name: "Bhilai",
  construction_type_name: "Residential house", attachments: [], followupHistory: [] };

let root, box, onOpenProject, finalQuotes;
const DRAFT = { source: "package", id: 6, no: "QT/26-27/005", status: "draft", total: 2651750, label: "Signature", file_url: null };
const ACCEPTED = { ...DRAFT, id: 7, no: "QT/26-27/006", status: "accepted", total: 2800000 };
const QUOTE_DOC = { id: 6, computed: { rows: [{ key: "main.gf", kind: "package", description: "Ground Floor", unit: "per sqft", qty: 1000, rate: 1800, amount: 1800000,
  schedule: [{ name: "Plinth", pct: 40, amount: 720000 }, { name: "Slab", pct: 60, amount: 1080000 }] }] } };
const testid = (id) => document.querySelector('[data-testid="' + id + '"]');
const convertBody = () => api.post.mock.calls.find((c) => c[0] === "/crm/leads/139/convert-to-project")[1];
const flush = async () => { for (let i = 0; i < 6; i++) await act(async () => {}); };
const click = async (el) => { await act(async () => { el.click(); }); await flush(); };
const drawerOpen = () => document.body.textContent.includes("Follow Ups (");
const btnText = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent));
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(async () => {
  localStorage.setItem("gb_user", JSON.stringify({ id: 7, role: "admin", company_id: 1, name: "prafull verma" }));
  window.confirmAsync = jest.fn(() => Promise.resolve(true));
  onOpenProject = jest.fn();
  finalQuotes = { quotes: [], can_accept: true, can_estimate: true };
  api.get.mockImplementation(async (url) => {
    if (url === "/crm/leads") return { success: true, data: [{ ...LEAD }] };
    if (url === "/crm/leads/139") return { success: true, data: { ...LEAD } };
    if (url === "/projects") return { success: true, data: [{ id: 716, name: "Naveen & Prakash" }] };
    if (url === "/crm/leads/139/final-quotes") return { success: true, data: finalQuotes };
    if (/^\/sales-quotes\/\d+$/.test(url)) return { success: true, data: QUOTE_DOC };
    return { success: true, data: [] };
  });
  api.post.mockImplementation(async (url, body) => (url === "/crm/leads/139/convert-to-project"
    ? { success: true, data: { project: { id: 727, name: "ZZ Test Lead — Project" }, estimate: body.make_estimate ? { id: 51, no: "EST-1", total: 2651750 } : null }, message: "ok" } : { success: true, data: {} }));
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

test("Quote nahi: lead ka budget BOQ me nahi aata, project bina value ke banta hai", async () => {
  await click(btnText(/Project banao/));
  expect(testid("cv-next")).toBeNull();
  expect(document.querySelector('[data-cv="boq_value"]').value).toBe("");
  await click(testid("cv-go"));
  expect(convertBody().boq_value).toBe(0);
  expect(convertBody().final_quote).toBeUndefined();
});

test("Draft quote: preview dikhe, tick bina aage nahi, BOQ = quote total (budget nahi)", async () => {
  finalQuotes = { quotes: [DRAFT], can_accept: true, can_estimate: true };
  await click(btnText(/Project banao/));
  expect(testid("cv-fq-preview").textContent).toMatch(/Ground Floor/);
  expect(testid("cv-fq-preview").textContent).toMatch(/Payment schedule \(2 hisse\)/);
  expect(testid("cv-fq-total").textContent).toBe("₹26,51,750");
  expect(testid("cv-next").disabled).toBe(true);
  await click(testid("cv-fq-accept"));
  expect(testid("cv-next").disabled).toBe(false);
  await click(testid("cv-next"));
  expect(testid("cv-boq-locked").textContent).toMatch(/₹26,51,750/);
  expect(document.querySelector('[data-cv="boq_value"]')).toBeNull();
  await click(testid("cv-go"));
  expect(convertBody().final_quote).toEqual({ source: "package", id: 6, total: 2651750, accept: true });
  expect(convertBody().boq_value).toBeUndefined();
});

test("Accepted quote pehle se chuna, tick nahi maangta", async () => {
  finalQuotes = { quotes: [ACCEPTED, DRAFT], can_accept: true, can_estimate: true };
  await click(btnText(/Project banao/));
  expect(testid("cv-fq-accept")).toBeNull();
  await click(testid("cv-next"));
  await click(testid("cv-go"));
  expect(convertBody().final_quote).toEqual({ source: "package", id: 7, total: 2800000 });
});

test("Final Package Quote: estimate + schedule hamesha jaata hai (tick nahi), project Estimate tab par khulta hai", async () => {
  finalQuotes = { quotes: [ACCEPTED], can_accept: true, can_estimate: true };
  await click(btnText(/Project banao/));
  await click(testid("cv-next"));
  expect(testid("cv-est-goes").textContent).toMatch(/QT\/26-27\/006/);
  expect(document.querySelector('input[type="checkbox"][data-testid="cv-make-est"]')).toBeNull();
  await click(testid("cv-go"));
  expect(convertBody().make_estimate).toBe(true);
  expect(onOpenProject).toHaveBeenCalledWith(727, "estimate");
});

test.each([
  ["estimate pehle se bana", { ...ACCEPTED, used: true }, true, true],
  ["Estimate Create permission nahi", ACCEPTED, false, true],
  ["PDF quote", { ...ACCEPTED, source: "pdf", id: 9 }, true, false],
])("Estimate nahi jaata: %s", async (_name, quote, canEstimate, note) => {
  finalQuotes = { quotes: [quote], can_accept: true, can_estimate: canEstimate };
  await click(btnText(/Project banao/));
  await click(testid("cv-next"));
  expect(testid("cv-est-goes")).toBeNull();
  expect(!!testid("cv-est-note")).toBe(note);
  await click(testid("cv-go"));
  expect(convertBody().make_estimate).toBeUndefined();
});

test("Quote list na aaye: 'quote nahi' nahi maanta, project nahi ban sakta; Retry se list aati hai", async () => {
  const ok = api.get.getMockImplementation();
  api.get.mockImplementation(async (url) => (url === "/crm/leads/139/final-quotes" ? { success: false, message: "x" } : ok(url)));
  await click(btnText(/Project banao/));
  expect(testid("cv-fq-failed")).not.toBeNull();
  expect(testid("cv-go")).toBeNull();
  expect(testid("cv-next").disabled).toBe(true);
  finalQuotes = { quotes: [ACCEPTED], can_accept: true, can_estimate: true };
  api.get.mockImplementation(ok);
  await click(testid("cv-fq-retry"));
  expect(testid("cv-fq-failed")).toBeNull();
  expect(testid("cv-next").disabled).toBe(false);
});

test("Accept ki permission nahi: Draft par aage nahi; 'Abhi final quote nahi' se aage", async () => {
  finalQuotes = { quotes: [DRAFT], can_accept: false, can_estimate: true };
  await click(btnText(/Project banao/));
  expect(testid("cv-fq-accept")).toBeNull();
  expect(testid("cv-next").disabled).toBe(true);
  await click(testid("cv-fq-none"));
  expect(testid("cv-next").disabled).toBe(false);
  await click(testid("cv-next"));
  expect(document.querySelector('[data-cv="boq_value"]').value).toBe("");
  await click(testid("cv-back"));
  expect(testid("cv-fq-none")).not.toBeNull();
});
