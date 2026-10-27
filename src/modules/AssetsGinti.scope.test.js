// Asset ginti — store ki ginti jaisa (28 Oct 2026, Prafull: "category, all material
// aur selected"). Nayi ginti me Saare / Ek category / Chune hue (list us jagah ke
// asset se), aur ginti ki sheet me khoj, "Sirf farak wale", gine / farak ka counter.
// (web me @testing-library nahi — seedha react-dom/client + act)
import { act } from "react";
import { createRoot } from "react-dom/client";
import AssetsModule from "./AssetsModule";
import api from "../config/api";
import { loadFullPack } from "../i18n";

jest.mock("../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "", getToken: () => "x", getUser: () => ({ id: 1, role: "admin", name: "Admin" }) };
});
jest.mock("../components/PickSelect", () => ({ __esModule: true,
  default: ({ value, onChange, children, style }) => <select value={value} onChange={onChange} style={style}>{children}</select> }));
jest.mock("../utils/perms", () => ({ can: () => true, canAny: () => true, canEntry: () => true, currentUser: () => ({ id: 1, role: "admin" }) }));
jest.mock("../components/Toast", () => ({ useToast: () => ({ success: () => {}, error: () => {} }) }));

// eslint-disable-next-line no-undef
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PLACE = [
  { asset_item_id: 71, code: "A-71", name: "Shuttering plate", spec: "2x3", unit: "Nos", category_id: 5, category: "Shuttering", qty_good: 10, qty_damaged: 2 },
  { asset_item_id: 72, code: "A-72", name: "Prop", spec: "", unit: "Nos", category_id: 5, category: "Shuttering", qty_good: 5, qty_damaged: 0 },
  { asset_item_id: 73, code: "A-73", name: "Scaffold pipe", spec: "6m", unit: "Nos", category_id: 6, category: "Scaffolding", qty_good: 0, qty_damaged: 3 },
];
const VER = {
  id: 9, verification_no: "AST-VER-009", status: "draft", date: "2026-10-28", warehouse_id: 3, warehouse_name: "Main Store",
  scope: "category", scope_value: "Shuttering", line_count: 3, pending_count: 1, diff_count: 1, net_qty: -2, can_count: true, created_by: 1,
  items: [
    { id: 1, asset_item_id: 71, code: "A-71", name: "Shuttering plate", spec: "2x3", unit: "Nos", tracking_mode: "bulk",
      system_good: 10, system_damaged: 2, counted_good: 8, counted_damaged: 2, current_good: 10, current_damaged: 2, remarks: "2 kam" },
    { id: 2, asset_item_id: 72, code: "A-72", name: "Prop", spec: "", unit: "Nos", tracking_mode: "bulk",
      system_good: 5, system_damaged: 0, counted_good: 5, counted_damaged: 0, current_good: 5, current_damaged: 0 },
    { id: 3, asset_item_id: 74, code: "A-74", name: "Jack", spec: "", unit: "Nos", tracking_mode: "bulk",
      system_good: 4, system_damaged: 0, counted_good: null, counted_damaged: null, current_good: 4, current_damaged: 0 },
  ],
  log: [],
};
const LIST = [
  { ...VER, items: undefined },
  { id: 8, verification_no: "AST-VER-008", status: "closed", date: "2026-10-20", warehouse_id: 3, warehouse_name: "Main Store", scope: "items", line_count: 2 },
  { id: 7, verification_no: "AST-VER-007", status: "closed", date: "2026-10-10", warehouse_id: 3, warehouse_name: "Main Store", scope: "all", line_count: 40 },
];

const ok = (data) => Promise.resolve({ success: true, data });
let root, box;
const text = () => box.textContent;
const byText = (sel, s) => [...box.querySelectorAll(sel)].find((e) => e.textContent.trim() === s);
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await act(async () => {}); };
const type = async (el, v) => {
  const set = Object.getOwnPropertyDescriptor(el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype, "value").set;
  await act(async () => { set.call(el, v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); });
  await act(async () => {});
};

beforeAll(() => loadFullPack());
beforeEach(async () => {
  api.get.mockImplementation((url) => {
    if (url === "/assets/meta") return ok({ categories: [{ id: 5, name: "Shuttering" }, { id: 6, name: "Scaffolding" }], warehouses: [{ id: 3, name: "Main Store" }], incharges: [], my_warehouse_ids: [3] });
    if (url.startsWith("/assets/verifications/scope-items")) return ok(PLACE);
    if (url === "/assets/verifications/9") return ok(VER);
    if (url.startsWith("/assets/verifications")) return ok(LIST);
    if (url === "/assets/dashboard") return ok({ kpis: {} });
    return ok([]);
  });
  api.post.mockResolvedValue({ success: true, data: { id: 10, verification_no: "AST-VER-010" }, message: "Ginti khul gayi" });
  box = document.createElement("div");
  document.body.appendChild(box);
  root = createRoot(box);
  await act(async () => { root.render(<AssetsModule />); });
  await act(async () => {});
  await click(byText("button", "Ginti") || [...box.querySelectorAll("button")].find((b) => b.textContent.startsWith("Ginti")));
});
afterEach(() => { act(() => root.unmount()); box.remove(); });

test("list me \"Kya gina\": Category: Shuttering · Chune hue (2) · Saare asset", () => {
  expect(text()).toContain("Kya gina");
  expect(text()).toContain("Category: Shuttering");
  expect(text()).toContain("Chune hue (2)");
  expect(text()).toContain("Saare asset");
});

test("Nayi ginti: teen tarah, category us jagah ki, Chune hue me khoj + tick → server ko scope", async () => {
  await click(byText("button", "Nayi ginti"));
  // Ek hi store → apne aap chuna → us jagah ke asset aaye
  expect(api.get).toHaveBeenCalledWith("/assets/verifications/scope-items?warehouse_id=3");
  expect(text()).toContain("Kya ginna hai");
  expect(text()).toContain("Is jagah ke saare 3 asset");

  await click(byText("label div", "Ek category").closest("label").querySelector("input"));
  const opts = [...box.querySelectorAll("select option")].map((o) => o.textContent);
  expect(opts).toContain("Shuttering (2)");
  expect(opts).toContain("Scaffolding (1)");

  await click(byText("label div", "Chune hue").closest("label").querySelector("input"));
  expect(text()).toContain("Shuttering plate");
  expect(text()).toContain("0 · 3 toota");      // 0 theek · 3 toota wala pipe
  await type(box.querySelector('input[placeholder="Asset ka naam, code ya size se search karo"]'), "pipe");
  expect(text()).not.toContain("Prop");
  const tick = [...box.querySelectorAll('label input[type="checkbox"]')].find((c) => c.closest("label").textContent.includes("Scaffold pipe"));
  await click(tick);
  expect(text()).toContain("1 chune");
  await click(byText("button", "Ginti kholo"));
  expect(api.post).toHaveBeenCalledWith("/assets/verifications", expect.objectContaining({ warehouse_id: 3, scope: "items", item_ids: [73] }));
});

test("Chune hue bina tick → server tak nahi, saaf sandesh", async () => {
  await click(byText("button", "Nayi ginti"));
  await click(byText("label div", "Chune hue").closest("label").querySelector("input"));
  await click(byText("button", "Ginti kholo"));
  expect(api.post).not.toHaveBeenCalled();
  expect(text()).toContain("Kam se kam ek asset select karo");
});

test("Ginti ki sheet: counter, Sirf farak wale, khoj, rangin patti", async () => {
  await click(byText("span", "AST-VER-009"));
  expect(text()).toContain("Gine gaye 2/3");
  expect(text()).toContain("Farak: 1");
  expect(text()).toContain("Theek mila");
  expect(text()).toContain("Toota mila");
  expect(text()).toContain("Category: Shuttering");   // KV "Kya gina"
  const rowOf = (name) => [...box.querySelectorAll("div")].find((d) => d.style.gridTemplateColumns && d.style.borderLeft && d.textContent.includes(name));
  expect(rowOf("Shuttering plate").style.borderLeft).toContain("3px solid");
  expect(rowOf("Jack").style.borderLeft).toContain("transparent");      // gina nahi

  await click([...box.querySelectorAll('label input[type="checkbox"]')].find((c) => c.closest("label").textContent.includes("Sirf farak wale")));
  expect(rowOf("Shuttering plate")).toBeTruthy();
  expect(rowOf("Prop")).toBeFalsy();
  expect(rowOf("Jack")).toBeFalsy();

  await click([...box.querySelectorAll('label input[type="checkbox"]')].find((c) => c.closest("label").textContent.includes("Sirf farak wale")));
  await type([...box.querySelectorAll('input[placeholder="Asset ka naam, code ya size se search karo"]')].pop(), "A-74");
  expect(rowOf("Jack")).toBeTruthy();
  expect(rowOf("Prop")).toBeFalsy();
});
