// Stage Library (25 Nov 2026): har kaam ka stage set % me, ek baar bana kar har estimate me
// "Library se lagao" — naam se apne aap milta hai, har kaam ke apne rate par.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { LibApplyModal, StageLibraryManager, defaultItems, matchLibItem, sumPct } from "./StageLibrary";

jest.mock("../../config/api", () => {
  const api = jest.fn();
  api.get = jest.fn(); api.post = jest.fn(); api.put = jest.fn(); api.patch = jest.fn(); api.del = jest.fn();
  return { __esModule: true, default: api, API_BASE: "http://x", getToken: () => "tok" };
});
global.IS_REACT_ACT_ENVIRONMENT = true;

let root, box;
const flush = async () => { for (let i = 0; i < 5; i++) await act(async () => {}); };
const mount = async (el) => { box = document.createElement("div"); document.body.appendChild(box); root = createRoot(box); await act(async () => { root.render(el); }); await flush(); };
afterEach(() => { if (root) act(() => root.unmount()); if (box) box.remove(); root = null; box = null; });
beforeAll(async () => { setLang("hi-Latn"); await loadFullPack("hi-Latn"); });
const $ = (sel) => document.querySelector(sel);
const noKeys = () => expect(document.body.textContent).not.toMatch(/(stage_lib|schedule|stage_billing)\.[a-z_]+/);
const setVal = (el, v) => {
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
  el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
};

const LIB = { id: 3, name: "Ghar G+1", edit_seq: 2, items: [
  { key: "gf", label: "GF", also: "Ground Floor", parts: [{ name: "Plinth", pct: 15, group: "Structure" }, { name: "Slab casting", pct: 36, group: "Structure" }, { name: "Tile", pct: 49, group: "Finishing", together: true }] },
  { key: "ff", label: "FF", also: "First Floor", parts: [{ name: "Slab casting", pct: 51, group: "Structure" }, { name: "Tile", pct: 49, group: "Finishing", together: true }] },
  { key: "head_room", label: "Head Room", also: "", parts: [{ name: "Slab casting", pct: 60 }, { name: "Plaster", pct: 40 }] },
  { key: "septic_tank", label: "Septic tank", also: "", parts: [{ name: "Brick work", pct: 50 }, { name: "Slab casting", pct: 50 }] },
] };
const L = (id, cat, name, qty, rate, extra = {}) => ({ item_id: id, description: name, category: cat, unit: "Sqft", planned_qty: qty, rate,
  billed_qty: 0, opening_qty: 0, part_of: null, item_type: "boq", ...extra });

test("matchLibItem: category / naam / doosre naam / shabd se; na mile to null", () => {
  expect(matchLibItem(LIB.items, { category: "GF", name: "Ground Floor" }).key).toBe("gf");
  expect(matchLibItem(LIB.items, { category: "", name: "First Floor" }).key).toBe("ff");
  expect(matchLibItem(LIB.items, { category: "HEAD ROOM", name: "Head Room (Tower Room)" }).key).toBe("head_room");
  expect(matchLibItem(LIB.items, { category: "SEPTIC TANK", name: "Septic tank" }).key).toBe("septic_tank");
  expect(matchLibItem(LIB.items, { category: "EXTRA PLINTH HEIGHT ABOVE 3 FT", name: "Extra plinth height" })).toBeNull();
});

test("Nayi library ke shuru ke set: har kaam ka jod 100%, GF me Plinth, FF me nahi", () => {
  const d = defaultItems();
  expect(d.map((x) => x.label)).toEqual(["GF", "FF", "SF", "Head Room", "Septic tank", "Boundary wall"]);
  for (const it of d) expect(sumPct(it.parts)).toBe(100);
  expect(d[4].parts.map((p) => [p.name, p.pct])).toEqual([["Completion", "100"]]);   // Septic ek baar me
  expect(d[0].parts.some((p) => p.name === "Plinth")).toBe(true);
  expect(d[1].parts.some((p) => p.name === "Plinth")).toBe(false);
});

test("Library se lagao: naam se set, har kaam ke rate par ₹; na mila / bill wala chhoda; item_parts me apne set", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [LIB] } : { success: false }));
  api.post.mockResolvedValue({ success: true, data: { done: [{ item_id: 1 }, { item_id: 2 }, { item_id: 4 }], skipped: [] } });
  const onDone = jest.fn();
  const items = [L(1, "GF", "Ground Floor", 1000, 1800), L(2, "FF", "First Floor", 800, 1800), L(3, "EXTRA PLINTH", "Extra plinth height", 3000, 20),
    L(4, "SEPTIC TANK", "Septic tank", 80, 1000), L(5, "HEAD ROOM", "Head Room", 240, 1500, { billed_qty: 240 })];
  await mount(<LibApplyModal estimateId={74} items={items} onClose={() => {}} onDone={onDone} />);
  noKeys();
  expect($('[data-pick="GF¦#1"]').value).toBe("gf");
  expect($('[data-pick="FF¦#2"]').value).toBe("ff");
  expect($('[data-pick="EXTRA PLINTH¦#3"]').value).toBe("");
  expect($('[data-pick="HEAD ROOM¦#5"]')).toBeNull();                     // bill ban chuka
  expect($('[data-preview="GF¦#1"]').textContent).toContain("Plinth 15% ₹270");
  expect($('[data-preview="FF¦#2"]').textContent).toContain("Slab casting 51% ₹918");
  expect($('[data-testid="lib-apply-go"]').textContent).toBe("3 kaam par lagao");
  await act(async () => { $('[data-testid="lib-apply-go"]').click(); });
  await flush();
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/customer-estimates/74/schedule/replace");
  expect(body.item_ids).toEqual([1, 2, 4]);
  expect(body.item_parts[1].map((p) => p.name)).toEqual(["Plinth", "Slab casting", "Tile"]);
  expect(body.item_parts[2]).toEqual([{ name: "Slab casting", pct: 51, group: "Structure" }, { name: "Tile", pct: 49, group: "Finishing", together: true }]);
  expect(body.item_parts[4].length).toBe(2);
  expect(onDone.mock.calls[0][0]).toContain("\"Ghar G+1\" se 3 kaam ka schedule laga");
});

test("Ek hi stage: library me 1 stage 100% save hota hai; Library se lagao me 'ek baar me poora'", async () => {
  const ONE = { ...LIB, items: [{ key: "septic_tank", label: "Septic tank", also: "", parts: [{ name: "Kaam poora", pct: 100, group: "Structure" }] }] };
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [ONE] } : { success: false }));
  api.post.mockResolvedValue({ success: true, data: { done: [{ item_id: 4, whole: true }], skipped: [] } });
  await mount(<LibApplyModal estimateId={74} items={[L(4, "SEPTIC TANK", "Septic tank", 80, 1000)]} onClose={() => {}} onDone={() => {}} />);
  expect($('[data-preview="SEPTIC TANK¦#4"]').textContent).toBe("Ek hi stage — Kaam poora: poora ₹1,000 / unit, kaam poora hone par");
  await act(async () => { $('[data-testid="lib-apply-go"]').click(); });
  await flush();
  expect(api.post.mock.calls[0][1].item_parts[4]).toEqual([{ name: "Kaam poora", pct: 100, group: "Structure" }]);
});

test("Library editor: stage hata kar 1 rakho (100%) — Save chalu", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [] } : { success: false }));
  await mount(<StageLibraryManager onClose={() => {}} />);
  await act(async () => { $('[data-testid="lib-new"]').click(); });
  // Boundary wall (index 5): Brickwork 70 + Plaster 30 → Plaster hatao, Brickwork 100
  await act(async () => { $('[data-lib-del="5¦1"]').click(); });
  expect($('[data-lib-del="5¦0"]').disabled).toBe(true);
  expect($('[data-testid="lib-save"]').disabled).toBe(true);
  await act(async () => { setVal($('[data-lib-pct="5¦0"]'), "100"); });
  expect($('[data-lib-sum="5"]').textContent).toBe("Total 100%");
  expect($('[data-testid="lib-save"]').disabled).toBe(false);
});

test("Library banao: shuru ke 6 kaam, jod 100 na ho to Save band; theek karke POST", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [] } : { success: false }));
  api.post.mockImplementation(async (url, body) => ({ success: true, data: { id: 9, edit_seq: 1, ...body, items: body.items.map((it) => ({ ...it, key: it.label.toLowerCase() })) } }));
  window.confirmAsync = jest.fn(() => Promise.resolve(true));
  await mount(<StageLibraryManager onClose={() => {}} />);
  expect(document.body.textContent).toContain("Abhi koi library nahi");
  await act(async () => { $('[data-testid="lib-new"]').click(); });
  expect(document.querySelectorAll("[data-lib-item]").length).toBe(6);
  expect($('[data-testid="lib-save"]').disabled).toBe(false);
  await act(async () => { setVal($('[data-lib-pct="1¦0"]'), "20"); });     // FF: Lintel 10.2 → 20 → jod 109.8
  expect($('[data-lib-sum="1"]').textContent).toBe("Total 109.8%");
  expect($('[data-testid="lib-problems"]').textContent).toContain("FF");
  expect($('[data-testid="lib-save"]').disabled).toBe(true);
  await act(async () => { setVal($('[data-lib-pct="1¦0"]'), "10.2"); });
  await act(async () => { setVal($('[data-testid="lib-name"]'), "Ghar G+2"); });
  await act(async () => { $('[data-testid="lib-save"]').click(); });
  await flush();
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/stage-libraries");
  expect(body.name).toBe("Ghar G+2");
  expect(body.items.length).toBe(6);
  expect(body.items[0].parts[0]).toEqual({ name: "Plinth", pct: 15.3, group: "Structure" });
  expect(body.items[0].parts[9]).toEqual({ name: "Handover", pct: 4.9, group: "Finishing", together: true });
  noKeys();
});
