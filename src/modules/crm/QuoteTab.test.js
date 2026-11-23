// CRM Package Quote (15 Nov 2026) — server ke asli jawab jaisa data (Jacob Sir
// wala final estimate: Structure only ₹920, GF/FF 1278.34, Head Room naam badla,
// Boundary wall ₹300, TOTAL ₹29,27,807) render karke dekho: list + naya quote,
// editor me server ke computed number, qty badal kar Save = PUT edit_seq + lines,
// AI se area bharo (AI ka andaza bina tick), payment schedule ka total 100 +
// Stage Library se bharo (24 Nov 2026 — "yaad" hata), Send confirm, bheja gaya quote sirf padhna,
// Estimate banao (lead ka project) — aur screen par key ka naam na dikhe.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import QuoteTab from "./QuoteTab";
import QuoteEditor from "./QuoteEditor";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

const CONTENT = {
  schema: 1,
  meta: { doc_title: "QUOTATION FOR RESIDENTIAL CONSTRUCTION", package_name: "Signature", validity_days: 60, greeting: "Dear Sir / Madam,", cover: [], show_structure_rate: true },
  scopes: [{ key: "full", label: "Full package (structure + finishing)", rate: 1800 }, { key: "structure", label: "Structure only", rate: 920 }],
  glance: [{ key: "rcc", label: "RCC", value: "M25 grade" }],
  rate_schedule: {
    groups: [
      { key: "main", title: "A. Main Construction (Package Rate)", rows: [
        { key: "gf", description: "Ground Floor", unit: "per sq.ft.", rate: null, kind: "package" },
        { key: "ff", description: "First Floor", unit: "per sq.ft.", rate: null, kind: "package" },
        { key: "head_room", description: "Head Room (Tower Room)", unit: "per sq.ft.", rate: null, kind: "package" }] },
      { key: "additional", title: "B. Additional Items", rows: [
        { key: "septic_tank", description: "Septic tank", unit: "per sq.ft.", rate: 900, kind: "rate" },
        { key: "boundary_wall", description: "Boundary wall", unit: "per sq.ft.", rate: 45, kind: "rate" },
        { key: "rainwater_pit", description: "Rainwater harvesting pit", unit: "Lump sum", rate: 20000, kind: "lump_sum" }] },
    ],
    notes: [], basis_title: "Basis of Measurement", basis: [],
  },
  sections: [{ key: "terms", title: "TERMS & CONDITIONS", blocks: [{ key: "t1", type: "kv", rows: [{ key: "pay", label: "Payment", value: "Stage-wise" }] }] }],
  acceptance: { text: "I accept the above.", client_label: "Client Signature", company_label: "For {company}" },
};
const GF = [{ name: "Plinth", pct: 30, group: "Structure" }, { name: "Lintel", pct: 20, group: "Structure" }, { name: "Slab level", pct: 10, group: "Structure" },
  { name: "Slab casting", pct: 30, group: "Structure" }, { name: "Plaster", pct: 10, group: "Structure" }];
const GF_AMT = [352822, 235215, 117607, 352822, 117607];
const LINES = {
  "main.gf": { qty: 1278.34, rate: null, description: null }, "main.ff": { qty: 1278.34, rate: null, description: null },
  "main.head_room": { qty: 257.24, rate: null, description: "Head Room (Tower Room)/Second floor" },
  "additional.septic_tank": { qty: 70, rate: null, description: null }, "additional.boundary_wall": { qty: 920, rate: 300, description: null },
};
const row = (key, g, gt, rk, kind, description, unit, base, rate, qty, amount, schedule) => ({ key, group_key: g, group_title: gt, row_key: rk, kind, description, unit,
  base_rate: base, rate, rate_overridden: rate !== base, qty, amount, parts: schedule ? GF : null, schedule });
const A = "A. Main Construction (Package Rate)", B = "B. Additional Items";
const COMPUTED = { scope_rate: 920, total: 2927807, rows: [
  row("main.gf", "main", A, "gf", "package", "Ground Floor", "per sq.ft.", 920, 920, 1278.34, 1176073, GF.map((p, i) => ({ ...p, amount: GF_AMT[i] }))),
  row("main.ff", "main", A, "ff", "package", "First Floor", "per sq.ft.", 920, 920, 1278.34, 1176073, null),
  row("main.head_room", "main", A, "head_room", "package", "Head Room (Tower Room)/Second floor", "per sq.ft.", 920, 920, 257.24, 236661, null),
  row("additional.septic_tank", "additional", B, "septic_tank", "rate", "Septic tank", "per sq.ft.", 900, 900, 70, 63000, null),
  row("additional.boundary_wall", "additional", B, "boundary_wall", "rate", "Boundary wall", "per sq.ft.", 45, 300, 920, 276000, null),
  row("additional.rainwater_pit", "additional", B, "rainwater_pit", "lump_sum", "Rainwater harvesting pit", "Lump sum", 20000, 20000, null, null, null),
] };
const clone = (x) => JSON.parse(JSON.stringify(x));
const QUOTE = (id, extra) => ({
  id, quote_no: "QT/26-27/001", rev_no: 0, revision_of: null, lead_id: 5, package_id: 5, base_version_id: 41, scope: "structure", status: "draft",
  header: { client_name: "Jacob Sir", contact: "9827000000", site_address: "Smriti Nagar, Bhilai", plot_area: "2400", builtup_area: "2813.92", date: "2026-11-15" },
  lines: clone(LINES), schedule: { "main.gf": clone(GF) }, total: 2927807, computed: clone(COMPUTED), edit_seq: 4, sent_at: null, accepted_at: null,
  project_id: null, estimate_id: null, created_at: "2026-11-15T05:00:00Z", updated_at: "2026-11-15T06:00:00Z", scopes: CONTENT.scopes, content: clone(CONTENT),
  package: { id: 5, name: "Signature", current_version_id: 41, version_no: 3 }, lead: { id: 5, name: "Jacob Sir", phone: "9827000000", converted_project_id: null },
  package_changed: false, ...(extra || {}),
});
const LEAD = { id: 5, name: "Jacob Sir", phone: "9827000000" };
const LIST = [
  { id: 11, quote_no: "QT/26-27/001", rev_no: 0, status: "draft", scope: "structure", total: 2927807, lead_id: 5, lead_name: "Jacob Sir", package_id: 5, package_name: "Signature",
    project_id: null, estimate_id: null, sent_at: null, accepted_at: null, updated_at: "2026-11-15T06:00:00Z" },
  { id: 12, quote_no: "QT/26-27/001/R1", rev_no: 1, status: "sent", scope: "full", total: 5065000, lead_id: 5, lead_name: "Jacob Sir", package_id: 5, package_name: "Signature",
    project_id: null, estimate_id: null, sent_at: "2026-11-15T07:00:00Z", accepted_at: null, updated_at: "2026-11-15T07:00:00Z" },
];
const PKGS = [
  { id: 5, name: "Signature", tagline: "Best seller", rate_full: 1800, rate_structure: 920, unit: "sq.ft.", version_no: 3, status: "checked", source: "template" },
  { id: 6, name: "Premium Draft", tagline: null, rate_full: 2200, rate_structure: null, unit: "sq.ft.", version_no: 1, status: "draft", source: "ai" },
];
const LH = { display_name: "GB Buildcon", address_lines: ["Bhilai"], phones: "98270 00000", email: "", gstin: "", logo_url: "", accent: "#2B3175" };

let root, box, quotes;
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await act(async () => {}); await act(async () => {}); };
afterEach(() => { act(() => root.unmount()); box.remove(); });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  window.confirmAsync = jest.fn(() => Promise.resolve(true));
  quotes = {
    11: QUOTE(11),
    12: QUOTE(12, { quote_no: "QT/26-27/001/R1", rev_no: 1, status: "sent", sent_at: "2026-11-15T07:00:00Z" }),
    13: QUOTE(13, { status: "accepted", sent_at: "2026-11-15T07:00:00Z", accepted_at: "2026-11-15T08:00:00Z", lead: { id: 5, name: "Jacob Sir", phone: "9827000000", converted_project_id: 77 } }),
  };
  api.get.mockImplementation(async (url) => {
    if (url === "/sales-quotes?lead_id=5") return { success: true, data: LIST };
    const m = /^\/sales-quotes\/(\d+)$/.exec(url);
    if (m && quotes[m[1]]) return { success: true, data: clone(quotes[m[1]]) };
    if (url === "/sales-packages") return { success: true, data: PKGS, can_edit: true };
    if (url === "/sales-packages/settings") return { success: true, data: { saved: null, effective: LH } };
    if (url === "/customer-estimates/501") return { success: true, data: { id: 501, estimate_no: "EST-2" } };
    if (url === "/stage-libraries") return { success: true, data: LIBS };
    return { success: false, message: "unexpected " + url };
  });
  api.post.mockImplementation(async (url) => {
    if (url === "/sales-quotes") return { success: true, data: { ...clone(quotes[11]), lead: undefined, package: undefined } };
    if (url === "/sales-quotes/11/ai/fill") return { success: true, data: { reply: "FF aur pit bhar diye.", questions: ["Septic ka size pakka hai?"], lines: [
      { key: "main.ff", label: "First Floor", unit: "per sq.ft.", qty: 1300, rate: null, description: null, old_qty: 1278.34, old_rate: 920, reason: "FF 1300 likha", invented: false },
      { key: "additional.septic_tank", label: "Septic tank", unit: "per sq.ft.", qty: 80, rate: null, description: null, old_qty: 70, old_rate: 900, reason: "andaza", invented: true },
      { key: "additional.rainwater_pit", label: "Rainwater harvesting pit", unit: "Lump sum", qty: 1, rate: null, description: null, old_qty: null, old_rate: 20000, reason: "pit shamil", invented: false },
    ] } };
    if (url === "/sales-quotes/11/send") return { success: true, data: { ...clone(quotes[11]), status: "sent", sent_at: "2026-11-15T09:00:00Z", edit_seq: 5, lead: undefined, package: undefined } };
    if (url === "/sales-quotes/13/estimate") return { success: true, data: { estimate_id: 501, project_id: 77 } };
    return { success: false, message: "unexpected " + url };
  });
  api.put.mockImplementation(async (url, body) => {
    const c = clone(COMPUTED);
    c.rows[0].qty = 1300; c.rows[0].amount = 1196000; c.total = 2947734;
    return { success: true, data: { ...clone(quotes[11]), lines: body.lines, schedule: body.schedule, header: body.header, edit_seq: 5, computed: c, total: 2947734, remembered: body.remember ? 1 : 0,
      lead: undefined, package: undefined, package_changed: undefined } };
  });
});
let LIBS = [];
const noKeys = () => { const txt = document.body.textContent; expect(txt).not.toMatch(/sales_quote_ui\.[a-z_]+/); expect(txt).not.toMatch(/sales_pkg_ui\.[a-z_]+/); return txt; };
const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent.trim()));
const $ = (sel) => document.querySelector(sel);
const flush = async () => { await act(async () => {}); await act(async () => {}); await act(async () => {}); };
const typeIn = async (el, value) => {
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  await act(async () => { setter.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); });
};
const click = async (el) => { await act(async () => { el.click(); }); await flush(); };
const editor = (id) => mount(<QuoteEditor quoteId={id} lead={LEAD} onClose={() => {}} onChanged={() => {}} onOpenProject={() => {}} />);

test("List: quote no, R1, Draft / Sent, package · scope, ₹ total; + Package se quote → sirf Checked package, scope → POST → editor", async () => {
  await mount(<QuoteTab lead={LEAD} />);
  let txt = noKeys();
  expect(api.get).toHaveBeenCalledWith("/sales-quotes?lead_id=5");
  expect(txt).toContain("Package Quote");
  expect(txt).toContain("QT/26-27/001");
  expect(txt).toContain("R1");
  expect($("[data-quote='11'] [data-status='draft']").textContent).toBe("Draft");
  expect($("[data-quote='12'] [data-status='sent']").textContent).toBe("Sent");
  expect($("[data-quote='11']").textContent).toContain("Signature · Structure only");
  expect($("[data-quote='12']").textContent).toContain("Signature · Poora package");
  expect($("[data-quote='11']").textContent).toContain("₹29,27,807");

  await click($("[data-testid='btn-new-quote']"));
  txt = noKeys();
  expect($("[data-pick-pkg='5']")).toBeTruthy();
  expect($("[data-pick-pkg='6']")).toBeNull();          // draft package nahi
  expect($("[data-testid='qt-create']").disabled).toBe(true);
  await click($("[data-pick-pkg='5']"));
  expect($("[data-pick-scope='full']").textContent).toContain("₹1,800 / sq.ft.");
  expect($("[data-pick-scope='structure']").textContent).toContain("₹920 / sq.ft.");
  await click($("[data-pick-scope='structure']"));
  await click($("[data-testid='qt-create']"));
  expect(api.post).toHaveBeenCalledWith("/sales-quotes", { lead_id: 5, package_id: 5, scope: "structure" });
  await flush();
  expect($("[data-testid='qt-editor']")).toBeTruthy();
  expect($("[data-testid='qt-no']").textContent).toBe("QT/26-27/001");
  noKeys();
});

test("Editor: Jacob jaisi lines + TOTAL server ke computed se, payment schedule ₹, document me bhare number", async () => {
  await editor(11);
  const txt = noKeys();
  expect($("[data-testid='qt-total']").textContent).toBe("₹29,27,807");
  expect($("[data-testid='qt-total-row']").textContent).toBe("₹29,27,807");
  const lines = $("[data-testid='qt-lines']").textContent;
  expect(lines).toContain("A. Main Construction (Package Rate)");
  expect(lines).toContain("Head Room (Tower Room)/Second floor");
  expect($("[data-amount='main.gf']").textContent).toBe("11,76,073");
  expect($("[data-amount='main.head_room']").textContent).toBe("2,36,661");
  expect($("[data-amount='additional.boundary_wall']").textContent).toBe("2,76,000");
  expect($("input[data-qty='main.gf']").value).toBe("1278.34");
  expect($("input[data-rate='additional.boundary_wall']").value).toBe("300");     // badla rate
  expect($("input[data-rate='main.gf']").placeholder).toBe("920");               // package rate (scope)
  expect($("input[data-include='additional.rainwater_pit']").checked).toBe(false);
  expect($("[data-scope='structure']").getAttribute("aria-pressed")).toBe("true");
  // Payment schedule: GF ke 5 stage, ₹ server se, total 100
  const gf = $("[data-sched='main.gf']");
  expect(gf.querySelectorAll("[data-part]").length).toBe(5);
  expect(gf.textContent).toContain("3,52,822");
  expect($("[data-sum='main.gf']").textContent).toContain("Total 100%");
  expect($("[data-sched='main.ff']").textContent).toContain("kaam poora hone par poora paisa");
  expect(txt).not.toContain("Isko default bana do");   // yaad 24 Nov 2026 se nahi — Stage Library
  // Document (client copy) — khol kar dekho: header bhara, amount, TOTAL, PAYMENT SCHEDULE
  await click($("[data-testid='btn-doc-toggle']"));
  const doc = $("[data-testid='pkg-doc']").textContent;
  expect(doc).toContain("Jacob Sir");
  expect(doc).toContain("QT/26-27/001");
  expect(doc).toContain("Scope: Structure only — ₹920 per sq.ft.");
  expect(doc).toContain("11,76,073");
  expect($("[data-doc-total]").textContent).toBe("29,27,807");
  expect(doc).toContain("2. PAYMENT SCHEDULE");
  expect(doc).toContain("On completion of this item");
  expect(document.body.textContent).toContain("master package me nahi jaate");
  noKeys();
});

test("Qty badlo → ≈ andaza + Unsaved → Save = PUT edit_seq + lines, phir server ka number", async () => {
  await editor(11);
  expect($("[data-testid='btn-save']").disabled).toBe(true);
  await typeIn($("input[data-qty='main.gf']"), "1300");
  expect($("[data-testid='qt-unsaved']")).toBeTruthy();
  expect($("[data-amount='main.gf']").textContent).toBe("≈ 11,96,000");
  expect($("[data-testid='qt-total']").textContent).toBe("≈ ₹29,47,734");
  await click($("[data-testid='btn-save']"));
  expect(api.put).toHaveBeenCalledTimes(1);
  const [url, body] = api.put.mock.calls[0];
  expect(url).toBe("/sales-quotes/11");
  expect(body.edit_seq).toBe(4);
  expect(body.scope).toBe("structure");
  expect(body.lines["main.gf"]).toEqual({ qty: 1300, rate: null, description: null });
  expect(body.lines["main.head_room"].description).toBe("Head Room (Tower Room)/Second floor");
  expect(body.lines["additional.boundary_wall"]).toEqual({ qty: 920, rate: 300, description: null });
  expect(body.remember).toBeUndefined();
  expect(body.content).toBeUndefined();
  expect(body.header.client_name).toBe("Jacob Sir");
  // Server ka jawab — ≈ hata, wahi number
  expect($("[data-testid='qt-total']").textContent).toBe("₹29,47,734");
  expect($("[data-amount='main.gf']").textContent).toBe("11,96,000");
  expect($("[data-testid='qt-unsaved']")).toBeNull();
  expect(document.body.textContent).toContain("Signature");   // package naam PUT ke baad bhi
  noKeys();
});

test("AI se area bharo: AI ka andaza bina tick; Lagao sirf tick wale → Save ke PUT me", async () => {
  await editor(11);
  await click($("[data-testid='btn-ai-fill-open']"));
  await typeIn($("[data-testid='ai-fill-text']"), "FF 1300, septic thoda bada, rainwater pit bhi");
  await click($("[data-testid='btn-ai-fill']"));
  expect(api.post).toHaveBeenCalledWith("/sales-quotes/11/ai/fill", { text: "FF 1300, septic thoda bada, rainwater pit bhi" }, expect.anything());
  const txt = noKeys();
  expect(txt).toContain("FF aur pit bhar diye.");
  expect(txt).toContain("Septic ka size pakka hai?");
  expect(txt).toContain("AI ne khud number diya");
  const cb = (k) => $(`[data-fill='${k}'] input[type=checkbox]`);
  expect(cb("main.ff").checked).toBe(true);
  expect(cb("additional.septic_tank").checked).toBe(false);   // invented
  expect($("[data-fill='additional.septic_tank'] [data-invented]")).toBeTruthy();
  expect(cb("additional.rainwater_pit").checked).toBe(true);
  expect(btn(/^Lagao \(2\)$/)).toBeTruthy();
  await click($("[data-testid='btn-ai-fill-apply']"));
  expect($("input[data-qty='main.ff']").value).toBe("1300");
  expect($("input[data-qty='additional.septic_tank']").value).toBe("70");
  expect($("input[data-include='additional.rainwater_pit']").checked).toBe(true);
  expect(api.put).not.toHaveBeenCalled();                       // Lagao = sirf page
  await click($("[data-testid='btn-save']"));
  const body = api.put.mock.calls[0][1];
  expect(body.lines["main.ff"].qty).toBe(1300);
  expect(body.lines["additional.septic_tank"].qty).toBe(70);
  expect(body.lines["additional.rainwater_pit"].qty).toBe(1);
  noKeys();
});

test("Payment schedule: total 100 nahi to Save ruka; theek karke Save (yaad ka tick nahi)", async () => {
  await editor(11);
  const pct = (i) => $(`[data-sched='main.gf'] input[data-part-pct='${i}']`);
  await typeIn(pct(0), "25");
  expect($("[data-sum='main.gf']").textContent).toContain("Total 95% hai — 100% hona chahiye.");
  await click($("[data-testid='btn-save']"));
  expect(api.put).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("Payment schedule adhoora hai");
  await typeIn(pct(4), "15");
  expect($("[data-sum='main.gf']").textContent).toContain("Total 100%");
  // Ek stage wala schedule bhi galat (kam se kam 2)
  await click($("[data-add-part='main.ff']"));
  expect($("[data-sum='main.ff']").textContent).toContain("Kam se kam 2 stage chahiye");
  await click($("[data-sched='main.ff'] button[aria-label='Stage hatao']"));
  expect($("[data-sum='main.ff']")).toBeNull();
  expect($("[data-testid='chk-remember']")).toBeNull();
  expect($("[data-testid='btn-saved-patterns']")).toBeNull();
  expect($("[data-testid='btn-sched-match']")).toBeNull();
  await click($("[data-testid='btn-save']"));
  expect(api.put).toHaveBeenCalledTimes(1);
  const body = api.put.mock.calls[0][1];
  expect(body.remember).toBeUndefined();
  expect(body.schedule["main.gf"].map((p) => p.pct)).toEqual([25, 20, 10, 30, 15]);
  expect(body.schedule["main.gf"][0]).toEqual({ name: "Plinth", pct: 25, group: "Structure" });
  expect(body.schedule["main.ff"]).toBeUndefined();
  noKeys();
});

// 24 Nov 2026 (Prafull): "package me quotation banate time client ko koi schedule bhejna hai to wo bhi stage library se"
test("Payment schedule: Stage Library se sab line bharo — Structure only quote par Finishing hata kar baaki 100% par; FF me 1 bacha / Septic ek stage = kaam poora hone par", async () => {
  LIBS = [{ id: 4, name: "Ghar G+1", edit_seq: 1, items: [
    { key: "gf", label: "GF", also: "Ground Floor", parts: [{ name: "Plinth", pct: 20, group: "Structure" }, { name: "Slab casting", pct: 31, group: "Structure" }, { name: "Tile", pct: 49, group: "Finishing", together: true }] },
    { key: "ff", label: "FF", also: "First Floor", parts: [{ name: "Slab casting", pct: 51, group: "Structure" }, { name: "Tile", pct: 49, group: "Finishing", together: true }] },
    { key: "septic_tank", label: "Septic tank", also: "", parts: [{ name: "Completion", pct: 100 }] }] }];
  await editor(11);
  for (let i = 0; i < 4; i++) await act(async () => {});
  expect($("[data-testid='qt-lib-bar']")).toBeTruthy();
  await click($("[data-testid='btn-lib-fill']"));
  expect($("[data-sum='main.gf']").textContent).toContain("Total 100%");
  await click($("[data-testid='btn-save']"));
  const body = api.put.mock.calls[0][1];
  expect(body.schedule["main.gf"]).toEqual([{ name: "Plinth", pct: 39.22, group: "Structure" }, { name: "Slab casting", pct: 60.78, group: "Structure" }]);
  expect(body.schedule["main.ff"]).toBeUndefined();
  expect(body.schedule["additional.septic_tank"]).toBeUndefined();
  noKeys();
  LIBS = [];
});

test("partsForScope / libParts: Full me sab stage (Tile 'ek saath' bhi), Structure only me Finishing nahi", () => {
  const { partsForScope } = require("./quoteUtil");
  const { libParts } = require("./QuoteSchedule");
  const it = { parts: [{ name: "Plinth", pct: 25.5, group: "Structure" }, { name: "Slab", pct: 25.5, group: "Structure" }, { name: "Tile", pct: 49, group: "Finishing", together: true }] };
  expect(libParts(it, "full").map((p) => [p.name, p.pct, !!p.together])).toEqual([["Plinth", "25.5", false], ["Slab", "25.5", false], ["Tile", "49", true]]);
  expect(libParts(it, "structure").map((p) => [p.name, p.pct])).toEqual([["Plinth", "50"], ["Slab", "50"]]);
  expect(partsForScope([{ name: "A", pct: 100, group: "Finishing" }], "structure")).toEqual([{ name: "A", pct: 100, group: "Finishing" }]);
  expect(libParts({ parts: [{ name: "Done", pct: 100 }] }, "full")).toEqual([]);
});

test("Payment schedule: koi Stage Library nahi to banane ka rasta likha aata hai", async () => {
  LIBS = [];
  await editor(11);
  for (let i = 0; i < 4; i++) await act(async () => {});
  expect($("[data-testid='qt-lib-none']").textContent).toContain("Stage Library");
  expect($("[data-testid='btn-lib-fill']")).toBeNull();
  noKeys();
});

test("Send: confirm (lock hone ki baat) → POST send → quote lock", async () => {
  await editor(11);
  await click($("[data-testid='qa-send']"));
  expect(window.confirmAsync).toHaveBeenCalled();
  expect(window.confirmAsync.mock.calls[0][0]).toContain("lock ho jaata hai");
  expect(api.post).toHaveBeenCalledWith("/sales-quotes/11/send", {});
  expect($("[data-testid='qt-locked']").textContent).toContain("quote lock hai");
  expect($("[data-status='sent']")).toBeTruthy();
  expect($("input[data-qty='main.gf']")).toBeNull();
  expect($("[data-testid='qa-share']")).toBeTruthy();
  expect($("[data-testid='qa-send']")).toBeNull();
  expect(document.body.textContent).toContain("Signature");
  noKeys();
});

test("Bheja gaya quote: sab sirf padhna — koi input / Save / Delete nahi; PDF, Share, Accept, Revision", async () => {
  await editor(12);
  const txt = noKeys();
  expect(txt).toContain("QT/26-27/001/R1");
  expect($("[data-testid='qt-locked']")).toBeTruthy();
  expect($("[data-testid='btn-save']")).toBeNull();
  expect($("[data-testid='qa-delete']")).toBeNull();
  expect($("[data-testid='qa-send']")).toBeNull();
  expect(document.querySelectorAll("[data-testid='qt-header'] input").length).toBe(0);
  expect(document.querySelectorAll("[data-testid='qt-lines'] input:not([type=checkbox])").length).toBe(0);
  expect($("input[data-include='additional.rainwater_pit']").disabled).toBe(true);
  expect(document.querySelectorAll("[data-testid='qt-schedule'] input").length).toBe(0);
  expect($("[data-testid='btn-ai-fill-open']")).toBeNull();
  expect($("[data-testid='btn-sched-match']")).toBeNull();
  expect($("[data-scope='full']").disabled).toBe(true);
  expect($("[data-testid='qa-pdf']")).toBeTruthy();
  expect($("[data-testid='qa-share']")).toBeTruthy();
  expect($("[data-testid='qa-accept']")).toBeTruthy();
  expect($("[data-testid='qa-revise']")).toBeTruthy();
  expect(txt).toContain("Jacob Sir");
  expect(txt).toContain("₹29,27,807");
  await click($("[data-testid='btn-doc-toggle']"));
  expect($("[data-testid='btn-doc-edit']")).toBeNull();
  expect(document.querySelectorAll("[data-testid='pkg-doc'] [data-path]").length).toBe(0);
  // Share sheet — WhatsApp lead ke phone par
  api.get.mockImplementationOnce(async () => ({ success: true, data: [] }));
  await click($("[data-testid='qa-share']"));
  api.post.mockImplementationOnce(async () => ({ success: true, data: { id: 3, url: "https://api.x/api/p/qtok", expires_at: "2027-01-14T00:00:00Z" } }));
  await click($("[data-testid='qshare-create']"));
  expect(api.post).toHaveBeenCalledWith("/sales-quotes/12/links", { days: 60 });
  expect($("[data-testid='share-wa']").getAttribute("href")).toBe("https://wa.me/919827000000?text="
    + encodeURIComponent("Namaste Jacob Sir, aapka quotation QT/26-27/001/R1 is link par dekhiye (PDF bhi): https://api.x/api/p/qtok"));
  noKeys();
});

test("Estimate banao: lead ka project pehle se → POST project_id → 'Estimate EST-2 bana' + Project kholo", async () => {
  const open = jest.fn();
  await mount(<QuoteEditor quoteId={13} lead={LEAD} onClose={() => {}} onChanged={() => {}} onOpenProject={open} />);
  expect($("[data-testid='qt-locked']").textContent).toContain("Client ne accept kiya");
  await click($("[data-testid='qa-estimate']"));
  expect(window.confirmAsync.mock.calls[0][0]).toContain("Project #77");
  expect(api.post).toHaveBeenCalledWith("/sales-quotes/13/estimate", { project_id: 77 }, expect.anything());
  await flush();
  expect(api.get).toHaveBeenCalledWith("/customer-estimates/501");
  expect($("[data-testid='qt-estimate']").textContent).toContain("Estimate EST-2 bana");
  expect($("[data-testid='qa-estimate']")).toBeNull();
  await click($("[data-testid='qa-project']"));
  expect(open).toHaveBeenCalledWith(77, "estimate");
  noKeys();
});
