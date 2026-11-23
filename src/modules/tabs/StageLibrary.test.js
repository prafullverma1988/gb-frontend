// Stage Library (25 Nov 2026): har kaam ka stage set % me, ek baar bana kar har estimate me
// "Library se lagao" — naam se apne aap milta hai, har kaam ke apne rate par.
import { act } from "react";
import { createRoot } from "react-dom/client";
import api from "../../config/api";
import { loadFullPack, setLang } from "../../i18n";
import { LibApplyModal, StageLibraryManager, defaultItems, estimateLibItems, matchLibItem, sumPct, worksOf } from "./StageLibrary";

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

// 27 Nov 2026: library me nahi wala kaam — yahin naya set, library me yaad; haath se chuna = doosra naam
test("Library se lagao: '+ Naya stage set' → library me PUT (naya set), phir estimate par usi set se", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [LIB] } : { success: false }));
  api.put.mockImplementation(async (url, body) => ({ success: true, data: { ...LIB, edit_seq: 3, items: body.items.map((it, i) => ({ ...it, key: "k" + i })) } }));
  api.post.mockResolvedValue({ success: true, data: { done: [{ item_id: 1 }, { item_id: 3 }], skipped: [] } });
  const onDone = jest.fn();
  await mount(<LibApplyModal estimateId={74} items={[L(1, "GF", "Ground Floor", 1000, 1800), L(3, "PORCH", "Porch", 120, 900)]} onClose={() => {}} onDone={onDone} />);
  expect($('[data-pick="PORCH¦#3"]').value).toBe("");
  await act(async () => { setVal($('[data-pick="PORCH¦#3"]'), "__new__"); });
  expect($('[data-new-set="PORCH¦#3"]')).not.toBeNull();
  expect($('[data-lib-label="n3"]').value).toBe("PORCH");
  expect($('[data-preview="PORCH¦#3"]').textContent).toContain("Completion");
  noKeys();
  // naam library ke kisi set jaisa → rok
  await act(async () => { setVal($('[data-lib-label="n3"]'), "GF"); });
  expect($('[data-testid="lib-new-bad"]')).not.toBeNull();
  expect($('[data-testid="lib-apply-go"]').disabled).toBe(true);
  await act(async () => { setVal($('[data-lib-label="n3"]'), "Porch"); });
  expect($('[data-testid="lib-apply-go"]').disabled).toBe(false);
  await act(async () => { $('[data-testid="lib-apply-go"]').click(); });
  await flush();
  const [purl, pbody] = api.put.mock.calls[0];
  expect(purl).toBe("/stage-libraries/3");
  expect(pbody.edit_seq).toBe(2);
  expect(pbody.items.length).toBe(5);
  expect(pbody.items[4]).toEqual({ label: "Porch", also: "", parts: [{ name: "Completion", pct: 100, group: null }] });
  expect(pbody.items[0].also).toBe("Ground Floor");                         // purane set waise hi
  const body = api.post.mock.calls[0][1];
  expect(body.item_ids).toEqual([1, 3]);
  expect(body.item_parts[3]).toEqual([{ name: "Completion", pct: 100, group: null }]);
  expect(onDone.mock.calls[0][0]).toContain("1 naya set / naam library me yaad hua");
});

test("Library se lagao: haath se set chuna → tick se kaam ka naam us set ke doosre naam me; tick hatao to PUT nahi", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [LIB] } : { success: false }));
  api.put.mockImplementation(async (url, body) => ({ success: true, data: { ...LIB, edit_seq: 3, items: body.items.map((it, i) => ({ ...it, key: "k" + i })) } }));
  api.post.mockResolvedValue({ success: true, data: { done: [{ item_id: 6 }], skipped: [] } });
  await mount(<LibApplyModal estimateId={74} items={[L(6, "MUMTY", "Mumty room", 100, 1500)]} onClose={() => {}} onDone={() => {}} />);
  await act(async () => { setVal($('[data-pick="MUMTY¦#6"]'), "head_room"); });
  expect($('[data-remember="MUMTY¦#6"]').checked).toBe(true);
  expect(document.body.textContent).toContain("\"MUMTY\" ko \"Head Room\" ke doosre naam me likh do");
  await act(async () => { $('[data-testid="lib-apply-go"]').click(); });
  await flush();
  expect(api.put.mock.calls[0][1].items[2].also).toBe("MUMTY");
  expect(api.post.mock.calls[0][1].item_parts[6].map((p) => p.name)).toEqual(["Slab casting", "Plaster"]);

  // dobara, is baar tick hata kar → library nahi badli
  act(() => root.unmount()); box.remove(); root = null;
  api.put.mockClear(); api.post.mockClear();
  await mount(<LibApplyModal estimateId={74} items={[L(6, "MUMTY", "Mumty room", 100, 1500)]} onClose={() => {}} onDone={() => {}} />);
  await act(async () => { setVal($('[data-pick="MUMTY¦#6"]'), "head_room"); });
  await act(async () => { $('[data-remember="MUMTY¦#6"]').click(); });
  await act(async () => { $('[data-testid="lib-apply-go"]').click(); });
  await flush();
  expect(api.put).not.toHaveBeenCalled();
  expect(api.post).toHaveBeenCalledTimes(1);
});

test("Naam se mila kaam par na tick, na PUT (library jaisi thi)", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [LIB] } : { success: false }));
  api.put.mockClear(); api.post.mockClear();
  api.post.mockResolvedValue({ success: true, data: { done: [{ item_id: 1 }], skipped: [] } });
  await mount(<LibApplyModal estimateId={74} items={[L(1, "GF", "Ground Floor", 1000, 1800)]} onClose={() => {}} onDone={() => {}} />);
  expect($('[data-remember="GF¦#1"]')).toBeNull();
  await act(async () => { $('[data-testid="lib-apply-go"]').click(); });
  await flush();
  expect(api.put).not.toHaveBeenCalled();
});

// 27 Nov 2026: estimate se Stage Library kholo → estimate ke saare kaam dikhein
test("estimateLibItems: har floor / kaam ek set; shuru ke set se mile to wahi stage, warna Completion 100%", () => {
  const ws = worksOf([L(1, "GF", "Construction", 1000, 1800), L(2, "FF", "Construction", 800, 1800), L(3, "", "Septic tank", 1, 50000),
    L(4, "", "Porch", 120, 900), L(5, "GF", "Construction", 0, 0), L(7, "EXTRA", "Kuch", 5, 10, { item_type: "extra" })]);
  const it = estimateLibItems(ws);
  expect(it.map((x) => x.label)).toEqual(["GF", "FF", "Septic tank", "Porch"]);
  expect(it[0].parts.some((p) => p.name === "Plinth")).toBe(true);
  expect(it[1].parts.some((p) => p.name === "Plinth")).toBe(false);
  expect(it[0].also).not.toMatch(/Construction/);                          // warna FF ka kaam GF par
  expect(it[2].parts.map((p) => [p.name, p.pct])).toEqual([["Completion", "100"]]);
  expect(it[3].parts.map((p) => [p.name, p.pct])).toEqual([["Completion", "100"]]);
  // ek category me kai alag kaam → kaam ka naam
  const ws2 = worksOf([L(1, "CIVIL", "Septic tank", 1, 50000), L(2, "CIVIL", "Boundary wall", 100, 400)]);
  expect(estimateLibItems(ws2).map((x) => x.label)).toEqual(["Septic tank", "Boundary wall"]);
  for (const x of it) expect(sumPct(x.parts)).toBe(100);
});

test("Estimate se Stage Library: library nahi → seedhi nayi library me estimate ke saare kaam; POST", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [] } : { success: false }));
  api.post.mockClear();
  api.post.mockImplementation(async (url, body) => ({ success: true, data: { id: 9, edit_seq: 1, ...body, items: body.items.map((it) => ({ ...it, key: it.label.toLowerCase() })) } }));
  const ws = worksOf([L(1, "GF", "Ground Floor", 1000, 1800), L(2, "FF", "First Floor", 800, 1800), L(4, "PORCH", "Porch", 120, 900)]);
  await mount(<StageLibraryManager works={ws} onClose={() => {}} />);
  expect(document.querySelectorAll("[data-lib-item]").length).toBe(3);
  expect($('[data-testid="lib-est-works"]').textContent).toContain("Is estimate ke saare 3 kaam is library me hain");
  expect(document.querySelectorAll("[data-est-ok]").length).toBe(3);
  noKeys();
  await act(async () => { $('[data-testid="lib-save"]').click(); });
  await flush();
  const [url, body] = api.post.mock.calls[0];
  expect(url).toBe("/stage-libraries");
  expect(body.items.map((x) => x.label)).toEqual(["GF", "FF", "PORCH"]);
  expect(body.items[2].parts).toEqual([{ name: "Completion", pct: 100, group: null }]);
});

test("Estimate se Stage Library: purani library me jo kaam nahi — '+' aur 'Baaki sab' se set banta hai", async () => {
  api.get.mockImplementation(async (url) => (url === "/stage-libraries" ? { success: true, data: [LIB] } : { success: false }));
  const ws = worksOf([L(1, "GF", "Ground Floor", 1000, 1800), L(4, "PORCH", "Porch", 120, 900), L(5, "MUMTY", "Mumty", 100, 1500), L(6, "LIFT", "Lift pit", 1, 9000)]);
  await mount(<StageLibraryManager works={ws} onClose={() => {}} />);
  expect(document.querySelectorAll("[data-lib-item]").length).toBe(4);       // LIB ke 4
  expect($('[data-testid="lib-est-works"]').textContent).toContain("Is estimate ke 4 kaam — 3 is library me nahi");
  expect($('[data-est-ok="GF¦#1"]').textContent).toBe("✓ GF · Ground Floor → GF");
  await act(async () => { $('[data-est-add="PORCH¦#4"]').click(); });
  expect(document.querySelectorAll("[data-lib-item]").length).toBe(5);
  expect($('[data-est-ok="PORCH¦#4"]')).not.toBeNull();
  expect($('[data-testid="lib-est-add-all"]').textContent).toBe("+ Baaki 2 kaam ke set banao");
  await act(async () => { $('[data-testid="lib-est-add-all"]').click(); });
  expect(document.querySelectorAll("[data-lib-item]").length).toBe(7);
  expect($('[data-testid="lib-est-works"]').textContent).toContain("saare 4 kaam is library me hain");
  expect($('[data-testid="lib-est-add-all"]')).toBeNull();
  noKeys();
});
