// Project → Estimate → "📦 Pick from Package" (16 Nov 2026): package chuno →
// scope badla to yaad wala schedule → area bharo → Check (dry_run) → EST banao
// (lines + schedule ek POST me). CRM Quote se: Sent quote → Accept + estimate.
// CRM permission nahi → sirf package raasta. Screen par key ka naam na dikhe.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { can } from "../../utils/perms";
import PackageEstimateModal, { nameHit } from "./PackageEstimateModal";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
jest.mock("../../utils/perms", () => ({ can: jest.fn(() => true) }));
global.IS_REACT_ACT_ENVIRONMENT = true;

const CONTENT = {
  meta: { package_name: "Signature", validity_days: 60 },
  scopes: [{ key: "full", label: "Full package", rate: 1800 }, { key: "structure", label: "Structure only", rate: 920 }],
  rate_schedule: { groups: [
    { key: "main", title: "A. Main Construction", rows: [
      { key: "gf", description: "Ground Floor", unit: "per sq.ft.", rate: null, kind: "package" },
      { key: "ff", description: "First Floor", unit: "per sq.ft.", rate: null, kind: "package" }] },
    { key: "additional", title: "B. Additional Items", rows: [
      { key: "septic_tank", description: "Septic tank", unit: "per sq.ft.", rate: 900, kind: "rate" }] },
  ], notes: [], basis: [] },
};
const GF = [{ name: "Plinth", pct: 30, group: "Structure" }, { name: "Lintel", pct: 20, group: "Structure" }, { name: "Slab level", pct: 10, group: "Structure" },
  { name: "Slab casting", pct: 30, group: "Structure" }, { name: "Plaster", pct: 10, group: "Structure" }];
const clone = (x) => JSON.parse(JSON.stringify(x));
const ROWS = [
  { key: "main.gf", group_key: "main", group_title: "A. Main Construction", row_key: "gf", kind: "package", description: "Ground Floor", unit: "per sq.ft.", base_rate: 920, rate: 920, qty: 1278.34, amount: 1176072.8, parts: GF, schedule: GF.map((p) => ({ ...p, amount: 1 })) },
  { key: "main.ff", group_key: "main", group_title: "A. Main Construction", row_key: "ff", kind: "package", description: "First Floor", unit: "per sq.ft.", base_rate: 920, rate: 920, qty: null, amount: null, parts: null, schedule: null },
];
const QUOTE = { id: 12, quote_no: "QT/26-27/001", status: "sent", scope: "structure", lines: { "main.gf": { qty: 1278.34 } }, schedule: { "main.gf": clone(GF) }, total: 1176072.8,
  computed: { scope_rate: 920, total: 1176072.8, rows: ROWS }, scopes: CONTENT.scopes };

let root, box, onSaved;
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await flush(); };
const flush = async () => { await act(async () => {}); await act(async () => {}); await act(async () => {}); };
afterEach(() => { act(() => root.unmount()); box.remove(); });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  can.mockImplementation(() => true);
  onSaved = jest.fn();
  window.confirmAsync = jest.fn(() => Promise.resolve(true));
  api.get.mockImplementation(async (url) => {
    if (url === "/sales-quotes/project-packages") return { success: true, data: [{ id: 5, name: "Signature", rate_full: 1800, rate_structure: 920, version_no: 3, current_version_id: 41 }] };
    if (url === "/sales-quotes/project-packages/5") return { success: true, data: { package: { id: 5, name: "Signature", version_no: 3, version_id: 41 }, content: clone(CONTENT),
      schedules: { full: {}, structure: { "main.gf": clone(GF) } } } };
    if (url === "/sales-quotes?open=1") return { success: true, data: [
      { id: 9, quote_no: "QT/26-27/002", status: "accepted", scope: "full", total: 500000, lead_name: "Ramesh", package_name: "Premium" },
      { id: 12, quote_no: "QT/26-27/001", status: "sent", scope: "structure", total: 1176072.8, lead_name: "naveen ji", package_name: "Signature" }] };
    if (url === "/sales-quotes/12") return { success: true, data: clone(QUOTE) };
    return { success: false, message: "unexpected " + url };
  });
  api.post.mockImplementation(async (url, body) => {
    if (url === "/sales-quotes/project-estimate" && body.dry_run) return { success: true, data: { dry_run: true, total: 1176072.8, lines: 1, items: 5, scheduled: 1, estimate_no: "EST-2", existing: 1, customer_name: "Naveen & Prakash" } };
    if (url === "/sales-quotes/project-estimate") return { success: true, data: { estimate_id: 901, estimate_no: "EST-2", total_value: 1176072.8, items: 5, remembered: 0 } };
    if (url === "/sales-quotes/12/accept") return { success: true, data: { ...clone(QUOTE), status: "accepted" } };
    if (url === "/sales-quotes/12/estimate") return { success: true, data: { estimate_id: 902, estimate_no: "EST-2", total_value: 1176072.8, project_id: 716 } };
    return { success: false, message: "unexpected " + url };
  });
});
const noKeys = () => { const txt = document.body.textContent; expect(txt).not.toMatch(/(pkg_est|sales_quote_ui|sales_pkg_ui|estimate)\.[a-z_]+/); return txt; };
const $ = (sel) => document.querySelector(sel);
const click = async (el) => { await act(async () => { el.click(); }); await flush(); };
const typeIn = async (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => { setter.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const PROJECT = { id: 716, name: "Naveen & Prakash", client_name: "" };
const modal = () => mount(<PackageEstimateModal project={PROJECT} projectId={716} customers={[]} onClose={() => {}} onSaved={onSaved} />);

test("Package: chuno → structure par yaad wala GF schedule → area → Check (dry_run) → EST-2 banao (lines + schedule ek POST)", async () => {
  await modal();
  let txt = noKeys();
  expect(txt).toContain("Package se estimate");
  expect(txt).toContain("Signature");
  await click($('[data-pkg="5"]'));
  // Full scope pehle — GF ka schedule khaali (yaad structure ki)
  expect(document.querySelectorAll('[data-sched="main.gf"] [data-part]').length).toBe(0);
  await click($('[data-scope="structure"]'));
  expect(document.querySelectorAll('[data-sched="main.gf"] [data-part]').length).toBe(5);
  // AI / Saved button yahan nahi
  expect($('[data-testid="btn-sched-match"]')).toBeNull();
  expect($('[data-testid="btn-saved-patterns"]')).toBeNull();
  await typeIn($('[data-qty="main.gf"]'), "1278.34");
  await flush();
  expect($('[data-testid="pe-total"]').textContent).toContain("11,76,073");
  await click($('[data-testid="pe-check"]'));
  const dry = api.post.mock.calls.find((c) => c[0] === "/sales-quotes/project-estimate")[1];
  expect(dry).toMatchObject({ project_id: 716, package_id: 5, version_id: 41, scope: "structure", dry_run: true, remember: false });
  expect(dry.lines["main.gf"].qty).toBe(1278.34);
  expect(dry.schedule["main.gf"].length).toBe(5);
  txt = noKeys();
  expect(txt).toContain("EST-2 banega");
  expect(txt).toContain("pehle se 1 estimate");
  await click($('[data-testid="pe-create"]'));
  const real = api.post.mock.calls.filter((c) => c[0] === "/sales-quotes/project-estimate")[1][1];
  expect(real.dry_run).toBeUndefined();
  expect(onSaved).toHaveBeenCalledWith(901);
});

test("Kuch badla to Check dobara; galat % par rok", async () => {
  await modal();
  await click($('[data-pkg="5"]'));
  await typeIn($('[data-qty="main.gf"]'), "1000");
  await click($('[data-testid="pe-check"]'));
  expect($('[data-testid="pe-create"]')).not.toBeNull();
  await typeIn($('[data-pct="tds_pct"]'), "150");
  await flush();
  expect($('[data-testid="pe-create"]')).toBeNull();
  await click($('[data-testid="pe-check"]'));
  expect(noKeys()).toContain("0 se 100");
  expect(api.post.mock.calls.filter((c) => c[0] === "/sales-quotes/project-estimate").length).toBe(1);
});

test("CRM Quote se: naam milta quote upar, Sent → Accept + estimate (project ke saath)", async () => {
  await modal();
  await click($('[data-src="quote"]'));
  let txt = noKeys();
  const items = [...document.querySelectorAll("[data-quote]")];
  expect(items[0].getAttribute("data-quote")).toBe("12");
  expect(txt).toContain("Naam milta hai");
  await click($('[data-quote="12"]'));
  txt = noKeys();
  expect(txt).toContain("Accepted");
  await click($('[data-testid="pe-quote-create"]'));
  expect(window.confirmAsync).toHaveBeenCalled();
  const urls = api.post.mock.calls.map((c) => c[0]);
  expect(urls).toEqual(["/sales-quotes/12/accept", "/sales-quotes/12/estimate"]);
  expect(api.post.mock.calls[1][1]).toMatchObject({ project_id: 716 });
  expect(onSaved).toHaveBeenCalledWith(902);
});

test("CRM permission nahi → tab nahi, sirf package", async () => {
  can.mockImplementation(() => false);
  await modal();
  expect($('[data-src="quote"]')).toBeNull();
  expect($('[data-pkg="5"]')).not.toBeNull();
  expect(api.get).not.toHaveBeenCalledWith("/sales-quotes?open=1");
});

test("nameHit: naam ka shabd mile (chhote / aam shabd nahi)", () => {
  expect(nameHit("naveen ji", "Naveen & Prakash")).toBe(true);
  expect(nameHit("Ramesh", "Naveen & Prakash")).toBe(false);
  expect(nameHit("ji sir", "Ji Sir project")).toBe(false);
});
