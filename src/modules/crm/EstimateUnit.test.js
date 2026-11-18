// Estimate line ka unit + Lump Sum (18 Nov 2026): default Sq.Ft, unit badle to rakam wahi,
// Lump Sum par qty 1; Package form, naya item aur Library builder teeno me.
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import EstimateBuilderModal from "../EstimateBuilderModal";
import EstimateNewItems, { validItems, cleanItem } from "./EstimateNewItems";
import { baseUnit, isLumpUnit, withUnit } from "./EstimateUnit";
import { QuoteLinesTable } from "./QuoteLines";
import { normLines, previewCompute } from "./quoteUtil";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
// Picker ki jagah saada select — yahan unit ka bartaav dekhna hai, picker ka panel nahi
jest.mock("../../components/PickSelect", () => {
  const React = require("react");
  return { __esModule: true, default: ({ value, onChange, children, style, title, ...rest }) => React.createElement("select", { value, onChange, title, ...rest }, children) };
});
global.IS_REACT_ACT_ENVIRONMENT = true;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};

let root, box;
const mount = async (el) => {
  box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box);
  await act(async () => { root.render(el); });
  for (let i = 0; i < 6; i++) await act(async () => {});
};
afterEach(() => { if (root) act(() => root.unmount()); if (box) box.remove(); root = null; box = null; });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
beforeEach(() => {
  jest.clearAllMocks();
  window.alert = jest.fn();
  api.get.mockImplementation(async (url) => (url === "/library/uom" ? { success: true, data: [{ name: "Square Feet" }, { name: "Nos" }, { name: "Lump Sum" }] } : { success: true, data: [] }));
});
const choose = async (el, value) => {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(el, value);
  await act(async () => { el.dispatchEvent(new Event("change", { bubbles: true })); });
  await act(async () => {});
};
const type = async (el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v);
  await act(async () => { el.dispatchEvent(new Event("input", { bubbles: true })); });
};

test("withUnit: Lump Sum par rakam wahi + qty 1; wapas aane par qty dobara", () => {
  expect(withUnit({ unit: "Sq.Ft", qty: "100", rate: "500" }, "Lump Sum")).toEqual({ unit: "Lump Sum", qty: 1, rate: 50000 });
  expect(withUnit({ unit: "Lump Sum", qty: 1, rate: 50000 }, "Sq.Ft")).toEqual({ unit: "Sq.Ft", qty: "", rate: 50000 });
  expect(withUnit({ unit: "Sq.Ft", qty: "100", rate: "500" }, "Nos")).toEqual({ unit: "Nos", qty: "100", rate: "500" });
  expect(baseUnit("per sq.ft.")).toBe("Sq.Ft");
  expect(["LS", "lump sum", "L.S."].every(isLumpUnit)).toBe(true);
  expect(isLumpUnit("Sq.Ft")).toBe(false);
});

test("Naya item: default Sq.Ft, list me Library ki unit, Lump Sum par qty band", async () => {
  let latest = [];
  const Box = () => { const [items, setItems] = useState([]); latest = items; return <EstimateNewItems items={items} onChange={setItems} />; };
  await mount(<Box />);
  await act(async () => { document.querySelector('[data-testid="est-new-add"]').click(); });
  for (let i = 0; i < 4; i++) await act(async () => {});
  const sel = document.querySelector('[data-unit="n1"]');
  expect(sel.value).toBe("Sq.Ft");
  const opts = [...sel.options].map((o) => o.value);
  expect(opts).toEqual(["Sq.Ft", "Nos", "Lump Sum"]);   // "Square Feet" dohra nahi
  await type(document.querySelector('[data-new-field="description"]'), "Main gate");
  await choose(sel, "Lump Sum");
  const qty = document.querySelector('[data-new-field="qty"]');
  expect(qty.disabled).toBe(true);
  expect(qty.value).toBe("1");
  await type(document.querySelector('[data-new-field="rate"]'), "75000");
  expect(document.querySelector('[data-new-amount="n1"]').textContent).toBe("₹75,000");
  expect(validItems(latest).map(cleanItem)).toEqual([{ key: "n1", description: "Main gate", unit: "Lump Sum", qty: 1, rate: 75000 }]);
});

const CONTENT = { scopes: [{ key: "full", rate: 1800 }], rate_schedule: { groups: [{ key: "main", title: "Main", rows: [{ key: "gf", description: "Ground Floor", unit: "per sq.ft.", rate: null, kind: "package" }] }] } };
test("Package form: unit badla, Lump Sum par rakam wahi, wapas par package rate", async () => {
  let latest = {};
  const Box = () => {
    const [lines, setLines] = useState({ "main.gf": { qty: "100" } });
    latest = lines;
    const C = previewCompute(CONTENT, "full", lines, {});
    return <QuoteLinesTable rows={C.rows} lines={lines} editable onLines={setLines} total={C.total} preview unitEdit />;
  };
  await mount(<Box />);
  const sel = () => document.querySelector('[data-unit="main.gf"]');
  const amount = () => document.querySelector('[data-amount="main.gf"]').textContent;
  expect(sel().value).toBe("Sq.Ft");
  expect(amount()).toContain("1,80,000");
  await choose(sel(), "Nos");
  expect(normLines(latest).lines["main.gf"]).toEqual({ qty: 100, rate: null, description: null, unit: "Nos" });
  await choose(sel(), "Lump Sum");
  expect(document.querySelector('[data-qty="main.gf"]').disabled).toBe(true);
  expect(amount()).toContain("1,80,000");
  expect(normLines(latest).lines["main.gf"]).toEqual({ qty: 1, rate: 180000, description: null, unit: "Lump Sum" });
  await choose(sel(), "Sq.Ft");
  expect(latest["main.gf"].unit).toBeNull();
  expect(latest["main.gf"].rate).toBeNull();
  expect(latest["main.gf"].qty).toBeNull();
});

test("Library builder: pick ke baad unit badlo; Lump Sum par qty 1, rakam wahi, Library API nahi", async () => {
  const PCR = [
    { item_id: 501, category_id: 21, rate: "120.00", add_on_rate: "20.00", description: "", qty: "0.00", item_name: "Brick work", item_unit: "Sq.Ft" },
    { item_id: 502, category_id: 21, rate: "50.00", add_on_rate: "0.00", description: "", qty: "0.00", item_name: "Plaster", item_unit: "Sq.Ft" },
  ];
  api.get.mockImplementation(async (url) => {
    if (url === "/library/boq-items") return { success: true, data: [{ id: 501, name: "Brick work", category: "Civil", unit: "Sq.Ft", base_rate: "100.00" }, { id: 502, name: "Plaster", category: "Civil", unit: "Sq.Ft", base_rate: "50.00" }] };
    if (url === "/library/uom") return { success: true, data: [{ name: "Sq.Ft" }, { name: "Nos" }] };
    if (url === "/library/rate-packages") return { success: true, data: [{ id: 7, name: "Ghar package", construction_type_id: 3 }] };
    if (url === "/library/packages/7/structures") return { success: true, data: [{ id: 11, name: "GF", unit: "sqft", default_qty: 1000, per_item_qty: 0 }] };
    if (url === "/library/packages/7/categories") return { success: true, data: [{ id: 21, structure_id: 11, category_name: "Structure", qty: null }] };
    if (url.startsWith("/library/rate-matrix")) return { success: true, data: PCR };
    return { success: true, data: [] };
  });
  api.post.mockResolvedValue({ success: true, data: { id: 99 } });
  await mount(<EstimateBuilderModal project={{ id: 70, name: "Hemant ghar", city_id: 1, construction_type_id: 3, client_name: "Hemant Sahu" }} onClose={jest.fn()} onSaved={jest.fn()} />);
  const card = [...document.querySelectorAll("div")].filter((d) => d.textContent === "Ghar package").pop();
  await act(async () => { card.click(); });
  for (let i = 0; i < 8; i++) await act(async () => {});
  await choose(document.querySelector('[data-unit="502"]'), "Nos");
  await choose(document.querySelector('[data-unit="501"]'), "Lump Sum");
  await act(async () => { [...document.querySelectorAll("button")].find((b) => /^Save Estimate$/.test(b.textContent)).click(); });
  for (let i = 0; i < 4; i++) await act(async () => {});
  const body = api.post.mock.calls.find((c) => c[0] === "/customer-estimates")[1];
  const items = body.sections[0].items;
  const brick = items.find((x) => /Brick work/.test(x.description)), plaster = items.find((x) => /Plaster/.test(x.description));
  expect(brick).toMatchObject({ unit: "Lump Sum", qty: 1, rate: 120000 });
  expect(plaster).toMatchObject({ unit: "Nos", qty: 1000, rate: 50 });
  expect(api.post.mock.calls.filter((c) => /rate-matrix|boq-items/.test(c[0]))).toEqual([]);
});
