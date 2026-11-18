// Estimate builder (From Library) — item ka poora edit, 14 Nov 2026.
// Naam / unit / rate is estimate me badlo → save payload me wahi; 🗑 wala item
// total aur payload dono se bahar; "Library me bhi" tick → boq_items + package rate.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../config/api";
import { loadFullPack, setLang } from "../i18n";
import EstimateBuilderModal from "./EstimateBuilderModal";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};   // jsdom me nahi hota (PickField)

const PCR = [
  { item_id: 501, category_id: 21, rate: "120.00", add_on_rate: "20.00", description: "", qty: "0.00", item_name: "Brick work", item_unit: "Sq.Ft" },
  { item_id: 502, category_id: 21, rate: "50.00", add_on_rate: "0.00", description: "", qty: "0.00", item_name: "Plaster", item_unit: "Sq.Ft" },
];
let root, box;
const mount = async (el) => {
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
  await act(async () => { root.render(el); }); await act(async () => {});
};
afterEach(() => { act(() => root.unmount()); box.remove(); });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
  api.get.mockImplementation(async (url) => {
    if (url === "/library/boq-items") return { success: true, data: [
      { id: 501, name: "Brick work", category: "Civil", unit: "Sq.Ft", base_rate: "100.00", description: "lib desc" },
      { id: 502, name: "Plaster", category: "Civil", unit: "Sq.Ft", base_rate: "50.00", description: "" }] };
    if (url === "/library/uom") return { success: true, data: [{ name: "Sq.Ft" }, { name: "Cum" }] };
    if (url === "/library/rate-packages") return { success: true, data: [{ id: 7, name: "Ghar package", construction_type_id: 3 }] };
    if (url === "/library/packages/7/structures") return { success: true, data: [{ id: 11, name: "GF", unit: "sqft", default_qty: 1000, per_item_qty: 0 }] };
    if (url === "/library/packages/7/categories") return { success: true, data: [{ id: 21, structure_id: 11, category_name: "Structure", qty: null }] };
    if (url.startsWith("/library/rate-matrix")) return { success: true, data: PCR };
    return { success: true, data: [] };
  });
  api.put.mockResolvedValue({ success: true, data: {} });
  api.post.mockResolvedValue({ success: true, data: { id: 99 } });
});

const btn = (re) => [...document.querySelectorAll("button")].find((b) => re.test(b.textContent) || re.test(b.getAttribute("aria-label") || ""));
const type = async (el, v) => {
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
  await act(async () => { el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); });
};
const dialog = () => document.querySelector("[role=dialog]");
const openBuilder = async () => {
  await mount(<EstimateBuilderModal project={{ id: 70, name: "Hemant ghar", city_id: 1, construction_type_id: 3, client_name: "Hemant Sahu" }}
                                    onClose={jest.fn()} onSaved={jest.fn()} />);
  const card = [...document.querySelectorAll("div")].filter((d) => d.textContent === "Ghar package").pop();
  await act(async () => { card.click(); });
  await act(async () => {});
  for (let i = 0; i < 5 && !btn(/Package edit karo/); i++) await act(async () => {});
  if (!btn(/Package edit karo/)) throw new Error(document.body.textContent.slice(0, 1500));
  await act(async () => { btn(/Package edit karo/).click(); });
};

test("naam + unit is estimate me badlo, 🗑 wala bahar — save payload", async () => {
  await openBuilder();
  const edits = [...document.querySelectorAll("button")].filter((b) => b.getAttribute("aria-label") === "Item edit karo (naam, unit, rate)");
  expect(edits.length).toBe(2);
  await act(async () => { edits[0].click(); });
  expect(dialog().textContent).toContain("Library me: Brick work");
  await type(dialog().querySelector("input"), "Eent ki deewar 9 inch");
  // Unit = PickSelect (apna picker, native select nahi)
  await act(async () => { dialog().querySelector("button[aria-haspopup=listbox]").click(); });
  const cum = [...document.querySelectorAll("[role=option]")].find((o) => o.textContent.trim() === "Cum");
  await act(async () => { cum.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); });
  expect(dialog().textContent).toContain("Library: Brick work");
  expect(dialog().textContent).toContain("Rate ₹120 × 1,000 = ₹1,20,000");
  await act(async () => { [...dialog().querySelectorAll("button")].find((b) => b.textContent === "Save karo").click(); });
  expect(dialog()).toBeNull();
  expect(document.body.textContent).toContain("Eent ki deewar 9 inch");
  expect(document.body.textContent).toContain("Cum");
  expect(api.put).not.toHaveBeenCalled();          // library nahi chhuyi

  // Plaster is estimate se hatao → "Hata diya", wapas lao ka button
  const rm = [...document.querySelectorAll("button")].filter((b) => b.getAttribute("aria-label") === "Is estimate se hatao");
  await act(async () => { rm[1].click(); });
  expect(document.body.textContent).toContain("Hata diya");
  expect(btn(/^Wapas lao$/)).toBeTruthy();

  await act(async () => { btn(/^Save Estimate$/).click(); });
  await act(async () => {});
  const call = api.post.mock.calls.find((c) => c[0] === "/customer-estimates");
  expect(call).toBeTruthy();
  const items = call[1].sections.flatMap((s) => s.items);
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ description: "[Structure] Eent ki deewar 9 inch", unit: "Cum", qty: 1000, rate: 120, library_item_id: 501 });
});

test("Library me bhi: naam boq_items me, rate package me (baaki line jaisi thi)", async () => {
  await openBuilder();
  await act(async () => { btn(/^Item edit karo \(naam, unit, rate\)$/).click(); });
  const ins = dialog().querySelectorAll("input");
  await type(ins[0], "Brick work 9 inch");
  await type(ins[1], "130");                       // base 100 → 130
  await act(async () => { dialog().querySelector("input[type=checkbox]").click(); });
  await act(async () => { [...dialog().querySelectorAll("button")].find((b) => b.textContent === "Save karo").click(); });
  await act(async () => {});
  expect(api.put).toHaveBeenCalledWith("/library/boq-items/501",
    { name: "Brick work 9 inch", category: "Civil", unit: "Sq.Ft", base_rate: 100, description: "lib desc" });
  const bulk = api.post.mock.calls.find((c) => c[0] === "/library/rate-matrix/bulk");
  expect(bulk[1]).toMatchObject({ package_id: 7, city_id: 1, structure_id: 11 });
  expect(bulk[1].items).toEqual([
    { item_id: 501, category_id: 21, base_rate: 130, add_on_rate: 20, description: "", qty: "0.00" },
    { item_id: 502, category_id: 21, base_rate: 50, add_on_rate: 0, description: "", qty: "0.00" },
  ]);
  expect(dialog()).toBeNull();
});

test("Naya item: sirf is estimate me — save me alag section, package / Library API nahi; adhoora item save rokta hai", async () => {
  await openBuilder();
  await act(async () => { document.querySelector('[data-testid="est-new-add"]').click(); });
  const f = (k) => document.querySelector('[data-new-item="n1"] [data-new-field="' + k + '"]');
  await type(f("description"), "Porch grill (MS)");
  const save = () => btn(/Estimate save|Save Estimate|Save estimate/i);
  await act(async () => { save().click(); });
  expect(window.alert).toHaveBeenCalled();
  expect(api.post.mock.calls.find((c) => c[0] === "/customer-estimates")).toBeUndefined();
  await type(f("qty"), "120");
  await type(f("rate"), "450");
  await act(async () => { save().click(); });
  await act(async () => {});
  const body = api.post.mock.calls.find((c) => c[0] === "/customer-estimates")[1];
  const sec = body.sections[body.sections.length - 1];
  expect(sec.items).toEqual([{ description: "[PORCH GRILL] Porch grill (MS)", unit: "Sq.Ft", qty: 120, rate: 450 }]);
  expect(sec.per_item_qty).toBe(1);
  expect(api.post.mock.calls.filter((c) => /rate-matrix|boq-items/.test(c[0]))).toEqual([]);
});
