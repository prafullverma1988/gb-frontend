// CRM Packages (14 Nov 2026) — server ke asli jawab jaisa data render karke
// dekho: list, document (PDF jaisa, token bhare), haath ka edit → PUT, AI diff
// (khud ka number bina tick, Lagao sahi op_indexes), share ka wa.me link,
// compare table. Aur screen par kahin key ka naam (sales_pkg_ui.x) na dikhe.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import PackagesTab from "./PackagesTab";
import PackageDetail from "./PackageDetail";
import PackageCompare from "./PackageCompare";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

const CONTENT = {
  schema: 1,
  meta: { doc_title: "QUOTATION FOR RESIDENTIAL CONSTRUCTION", package_name: "Premium", validity_days: 60, greeting: "Dear Sir / Madam,",
    cover: [{ key: "c1", text: "Thank you for considering {company}. Valid for {validity_days} days." }], show_structure_rate: true },
  scopes: [{ key: "full", label: "Full package (structure + finishing)", rate: 1800 }, { key: "structure", label: "Structure only", rate: 920 }],
  glance: [{ key: "rcc", label: "RCC", value: "M25 grade" }, { key: "flooring", label: "Flooring", value: "Vitrified tiles ₹60/sq.ft." }],
  rate_schedule: {
    groups: [{ key: "main", title: "A. Main Construction (Package Rate)", rows: [
      { key: "gf", description: "Ground Floor", unit: "per sq.ft.", rate: null, kind: "package" },
      { key: "sump", description: "Sump 5000 L", unit: "lump sum", rate: 45000, kind: "lump_sum" }] }],
    notes: [{ key: "n1", text: "Rates inclusive of GST." }], basis_title: "Basis of Measurement", basis: [{ key: "b1", text: "Built-up area measured outside walls." }],
  },
  sections: [
    { key: "spec", title: "TECHNICAL SPECIFICATION", blocks: [
      { key: "foundation", type: "kv", heading: "Foundation", rows: [{ key: "footing", label: "Footing", value: "RCC isolated footing" }] },
      { key: "brands", type: "table", heading: "Material Brands", columns: [{ key: "item", label: "Item" }, { key: "brand", label: "Brand" }, { key: "allow", label: "Allowance", align: "right" }],
        rows: [{ key: "tiles", group: "Flooring", cells: { item: "Tiles", brand: "Kajaria", allow: "₹60/sq.ft." } }] },
      { key: "excl", type: "bullets", heading: "Works Not Included", items: [{ key: "bw", text: "Boundary wall" }] },
      { key: "nt", type: "note", text: "Prices valid for {validity_days} days." },
    ] },
    { key: "terms", title: "TERMS & CONDITIONS", blocks: [{ key: "t1", type: "kv", rows: [{ key: "pay", label: "Payment", value: "Stage-wise" }] }] },
  ],
  acceptance: { text: "I accept the above.", client_label: "Client Signature", company_label: "For {company}" },
};
const row = (id, name, extra) => ({ id, name, tagline: "Best seller", rate_full: 1800, rate_structure: 920, unit: "sq.ft.", version_no: 3, status: "checked",
  source: "template", copied_from_id: null, updated_at: "2026-11-14T10:00:00Z", created_at: "2026-11-10T10:00:00Z", ...(extra || {}) });
const LIST = [row(5, "Premium"), row(6, "Signature", { rate_full: 2200, rate_structure: null, version_no: 1, status: "draft", source: "ai", tagline: null })];
const LH = { display_name: "GB Buildcon", address_lines: ["Bhilai, Chhattisgarh"], phones: "98270 00000", email: "", gstin: "22ABCDE1234F1Z5", logo_url: "", accent: "#2B3175" };
const DETAIL = (pkg) => ({ success: true, can_edit: true, data: { package: pkg, version: { id: 41, version_no: pkg.version_no, source: "template", change_note: null,
  created_at: "2026-11-14T10:00:00Z", created_by_name: "Prafull", content: JSON.parse(JSON.stringify(CONTENT)) } } });
const JOB = { id: 77, kind: "edit", status: "done", reply: "Tiles allowance badha diya.", questions: ["Kya boundary wall bhi chahiye?"], stale: false, ops: [
  { i: 0, op: "set", path: "glance.flooring.value", ok: true, label: "Flooring", field: "value", old: "Vitrified tiles ₹60/sq.ft.", value: "Vitrified tiles ₹75/sq.ft.", reason: "Hukm me ₹75", is_price: true, invented: false },
  { i: 1, op: "set", path: "rate.main.sump.rate", ok: true, label: "Sump 5000 L", field: "rate", old: 45000, value: 52000, reason: "Naya rate", is_price: true, invented: true },
  { i: 2, op: "set", path: "sec.nope.x.y.value", ok: false, error: "PATH_NOT_FOUND", label: "", old: null, value: "x", reason: "", is_price: false, invented: false },
] };

let root, box;
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await act(async () => {}); };
afterEach(() => { act(() => root.unmount()); box.remove(); });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  window.confirmAsync = jest.fn(() => Promise.resolve(true));
  api.get.mockImplementation(async (url) => {
    if (url === "/sales-packages") return { success: true, data: LIST, can_edit: true };
    if (url === "/sales-packages/settings") return { success: true, data: { saved: null, effective: LH } };
    if (url === "/sales-packages/5") return DETAIL(LIST[0]);
    if (url === "/sales-packages/6") return DETAIL(LIST[1]);
    if (url === "/sales-packages/5/links") return { success: true, data: [{ id: 9, version_no: 2, lead_id: null, lead_name: null, label: "Sharma ji", expires_at: "2027-01-10T00:00:00Z",
      revoked_at: null, open_count: 4, last_opened_at: "2026-11-13T09:00:00Z", created_at: "2026-11-11T09:00:00Z", created_by_name: "Prafull", state: "active" }] };
    if (url === "/crm/leads") return { success: true, data: [] };
    if (url === "/sales-packages/ai/jobs/77") return { success: true, data: JOB };
    if (url.startsWith("/sales-packages/compare")) return { success: true, data: { a: LIST[0], b: LIST[1], rows: [
      { area: "Package rate", label: "Full package (structure + finishing)", path: "scopes.full.rate", a: 1800, b: 2200, change: "changed", is_price: true },
      { area: "Package at a Glance", label: "Flooring", path: "glance.flooring.value", a: "Vitrified tiles ₹60/sq.ft.", b: "Italian marble", change: "changed", is_price: true },
      { area: "TECHNICAL SPECIFICATION › Works Not Included", label: "Boundary wall", path: "sec.spec.excl.bw", a: "Boundary wall", b: null, change: "only_a", is_price: false },
      { area: "TECHNICAL SPECIFICATION › Works Not Included", label: "Solar", path: "sec.spec.excl.solar", a: null, b: "Solar water heater", change: "only_b", is_price: false },
    ] } };
    return { success: false, message: "unexpected " + url };
  });
  api.post.mockImplementation(async (url) => {
    if (url === "/sales-packages/ai/edit") return { success: true, data: { job_id: 77 } };
    if (url === "/sales-packages/ai/jobs/77/apply") return { success: true, data: { version_id: 42, version_no: 4, applied: [0, 1], failed: [] } };
    if (url === "/sales-packages/5/links") return { success: true, data: { id: 10, url: "https://api.x/api/p/tok123", expires_at: "2027-01-13T00:00:00Z", version_no: 3 } };
    if (url === "/sales-packages/ai/compare") return { success: true, data: { talking_points: ["Signature me Italian marble"], why_upgrade: "Behtar finish", whatsapp_text: "Namaste! Signature me marble flooring hai." } };
    return { success: false, message: "unexpected " + url };
  });
  api.put.mockImplementation(async () => ({ success: true, data: { id: 42, version_no: 4 } }));
  api.patch.mockImplementation(async () => ({ success: true, data: LIST[1] }));
});
const noKeys = () => { const txt = document.body.textContent; expect(txt).not.toMatch(/sales_pkg_ui\.[a-z_]+/); return txt; };
const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const flush = async () => { await act(async () => {}); await act(async () => {}); };
const typeIn = async (el, value) => {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  await act(async () => { setter.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); });
};

test("List: card par naam, rate / sq.ft., Structure only, version, Draft / Checked", async () => {
  await mount(<PackagesTab />);
  const txt = noKeys();
  expect(txt).toContain("CRM Packages");
  expect(txt).toContain("Premium");
  expect(txt).toContain("₹1,800 / sq.ft.");
  expect(txt).toContain("Structure only ₹920");
  expect(txt).toContain("₹2,200 / sq.ft.");
  expect(txt).toContain("v3");
  expect(txt).toContain("Checked");
  expect(txt).toContain("Draft");
  expect(btn(/New package$/)).toBeTruthy();
  expect(btn(/Letterhead$/)).toBeTruthy();
  await act(async () => { btn(/New package$/).click(); });
  const menu = document.querySelector("[data-testid='new-menu']").textContent;
  expect(menu).toContain("Template se");
  expect(menu).toContain("Copy karke");
  expect(menu).toContain("AI se banao");
  expect(menu).toContain("PDF upload karke");
  noKeys();
});

test("Package kholo: document PDF jaisa — glance, rate schedule (package row par scope rate), 2. / 2.1, token bhare", async () => {
  await mount(<PackagesTab />);
  await act(async () => { document.querySelector("[data-pkg='5']").click(); });
  await flush();
  noKeys();
  const doc = document.querySelector("[data-testid='pkg-doc']").textContent;
  expect(doc).toContain("GB Buildcon");
  expect(doc).toContain("Premium Package  |  ₹1,800 per sq.ft.");
  expect(doc).toContain("Structure only: ₹920 per sq.ft.");
  expect(doc).toContain("Thank you for considering GB Buildcon. Valid for 60 days.");
  expect(doc).not.toContain("{company}");
  expect(doc).toContain("Package at a Glance");
  expect(doc).toContain("M25 grade");
  expect(doc).toContain("1. RATE SCHEDULE");
  expect(doc).toContain("A. Main Construction (Package Rate)");
  const gf = [...document.querySelectorAll("[data-testid='pkg-doc'] tr")].find((tr) => tr.textContent.includes("Ground Floor"));
  expect(gf.textContent).toContain("1,800");
  expect(doc).toContain("45,000");
  expect(doc).toContain("2. TECHNICAL SPECIFICATION");
  expect(doc).toContain("2.1  Foundation");
  expect(doc).toContain("2.2  Material Brands");
  expect(doc).toContain("Kajaria");
  expect(doc).toContain("Prices valid for 60 days.");
  expect(doc).toContain("3. TERMS & CONDITIONS");
  expect(doc).toContain("4. ACCEPTANCE");
  expect(doc).toContain("For GB Buildcon");
  // Checked package — share khula, draft banner nahi
  expect(document.querySelector("[data-testid='draft-banner']")).toBeNull();
  expect(document.querySelector("[data-testid='btn-share']").disabled).toBe(false);
});

test("Draft package: banner + Jaanch ho gayi, Share band", async () => {
  await mount(<PackagesTab />);
  await act(async () => { document.querySelector("[data-pkg='6']").click(); });
  await flush();
  const txt = noKeys();
  expect(document.querySelector("[data-testid='draft-banner']")).toBeTruthy();
  expect(txt).toContain("Draft — abhi jaancha nahi gaya");
  expect(document.querySelector("[data-testid='btn-share']").disabled).toBe(true);
  await act(async () => { btn(/Jaanch ho gayi$/).click(); });
  await flush();
  expect(api.patch).toHaveBeenCalledWith("/sales-packages/6", { status: "checked" });
});

test("Haath ka edit: glance line tap → box → Unsaved changes → Save = PUT base_version_id ke saath", async () => {
  await mount(<PackageDetail id={5} letterhead={LH} onBack={() => {}} onChanged={() => {}} />);
  await act(async () => { document.querySelector("[data-testid='btn-edit']").click(); });
  await act(async () => { document.querySelector("[data-path='glance.flooring']").click(); });
  const ta = document.querySelector("textarea[name='value']");
  expect(ta.value).toBe("Vitrified tiles ₹60/sq.ft.");
  await typeIn(ta, "Vitrified tiles ₹70/sq.ft.");
  await act(async () => { btn(/^Theek hai$/).click(); });
  expect(document.querySelector("[data-testid='unsaved-bar']").textContent).toContain("Unsaved changes");
  expect(document.querySelector("[data-testid='pkg-doc']").textContent).toContain("Vitrified tiles ₹70/sq.ft.");
  await act(async () => { document.querySelector("[data-testid='btn-save']").click(); });
  await flush();
  expect(api.put).toHaveBeenCalled();
  const [url, body] = api.put.mock.calls[0];
  expect(url).toBe("/sales-packages/5");
  expect(body.base_version_id).toBe(41);
  expect(body.content.glance.find((g) => g.key === "flooring").value).toBe("Vitrified tiles ₹70/sq.ft.");
  noKeys();
});

test("AI se badlo: diff card — khud ka number bina tick, galat jagah band, Lagao sahi op_indexes", async () => {
  await mount(<PackageDetail id={5} letterhead={LH} onBack={() => {}} onChanged={() => {}} />);
  await act(async () => { btn(/AI$/).click(); });
  await act(async () => { btn(/^AI se badlo$/).click(); });
  await typeIn(document.querySelector("[data-testid='ai-panel'] textarea"), "Tiles allowance ₹75 karo");
  await act(async () => { btn(/AI se suggestion lo$/).click(); });
  await flush();
  expect(api.post).toHaveBeenCalledWith("/sales-packages/ai/edit", { id: 5, instruction: "Tiles allowance ₹75 karo" }, expect.anything());
  const diff = document.querySelector("[data-testid='ai-diff']");
  expect(diff).toBeTruthy();
  const txt = noKeys();
  expect(txt).toContain("Tiles allowance badha diya.");
  expect(txt).toContain("Kya boundary wall bhi chahiye?");
  expect(txt).toContain("AI ne khud number diya");
  expect(txt).toContain("₹45,000");
  expect(txt).toContain("₹52,000");
  const cb = (i) => document.querySelector(`[data-op='${i}'] input[type=checkbox]`);
  expect(cb(0).checked).toBe(true);
  expect(cb(1).checked).toBe(false);   // invented → bina tick
  expect(cb(2).disabled).toBe(true);   // ok=false
  expect(document.querySelector("[data-op='1'] [data-invented]")).toBeTruthy();
  expect(btn(/^Lagao \(1\)$/)).toBeTruthy();
  await act(async () => { cb(1).click(); });
  await act(async () => { btn(/^Lagao \(2\)$/).click(); });
  await flush();
  const call = api.post.mock.calls.find((c) => c[0] === "/sales-packages/ai/jobs/77/apply");
  expect(call[1]).toEqual({ op_indexes: [0, 1] });
});

test("Share: link banao → URL, WhatsApp wa.me link, purane link ki ginti", async () => {
  await mount(<PackageDetail id={5} letterhead={LH} onBack={() => {}} onChanged={() => {}} />);
  await act(async () => { document.querySelector("[data-testid='btn-share']").click(); });
  await flush();
  let txt = noKeys();
  expect(txt).toContain("Sharma ji");
  expect(txt).toContain("4 baar khula");
  await act(async () => { document.querySelector("[data-testid='share-create']").click(); });
  await flush();
  expect(api.post).toHaveBeenCalledWith("/sales-packages/5/links", expect.objectContaining({ days: 60 }));
  expect(document.querySelector("[data-testid='share-url']").value).toBe("https://api.x/api/p/tok123");
  const wa = document.querySelector("[data-testid='share-wa']").getAttribute("href");
  expect(wa).toBe("https://wa.me/?text=" + encodeURIComponent("Namaste, hamare Premium package ki poori details is link par dekhiye: https://api.x/api/p/tok123"));
  txt = noKeys();
  expect(txt).toContain("WhatsApp par bhejo");
});

test("Compare: area-wise table, price line rangeen, Sirf A / Sirf B, AI se samjhao → WhatsApp text", async () => {
  await mount(<PackageCompare packages={LIST} onBack={() => {}} onOpen={() => {}} />);
  await flush();
  expect(api.get).toHaveBeenCalledWith("/sales-packages/compare?a=5&b=6");
  const table = document.querySelector("[data-testid='cmp-table']");
  const txt = table.textContent;
  expect(txt).toContain("Package rate");
  expect(txt).toContain("₹1,800");
  expect(txt).toContain("₹2,200");
  expect(txt).toContain("Italian marble");
  expect(txt).toContain("Sirf A me");
  expect(txt).toContain("Sirf B me");
  expect(table.querySelectorAll("tr[data-price='1']").length).toBe(2);
  expect(table.querySelector("tr[data-change='only_b']").textContent).toContain("Solar water heater");
  noKeys();
  await act(async () => { btn(/AI se samjhao$/).click(); });
  await flush();
  expect(api.post).toHaveBeenCalledWith("/sales-packages/ai/compare", { a: 5, b: 6 }, expect.anything());
  expect(document.querySelector("[data-testid='cmp-ai']").textContent).toContain("Signature me Italian marble");
  expect(document.querySelector("[data-testid='cmp-wa-text']").value).toBe("Namaste! Signature me marble flooring hai.");
  noKeys();
});
